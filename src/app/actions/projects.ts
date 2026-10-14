"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { getSignedInAccount } from "@/lib/account";
import { db } from "@/lib/db";
import { isMockMode } from "@/lib/db/mock-data";
import { creatorPastProjects, creators } from "@/lib/db/schema";
import { domainOf } from "@/lib/profile/draft";
import { LIMITS, PAST_STATUS, type PastStatus, type ProfileEdit } from "@/lib/profile/options";
import { getPreviewMe, PREVIEW_DRAFT_COOKIE } from "@/lib/profile/preview-me";
import { pickLinks } from "@/lib/profile/paste-links";
import { normalizeProjectLink } from "@/lib/profile/project-meta";
import { projectTargetSchema, readProject, removeStoredProject, revalidateCreator, writeProject, type ProjectTarget } from "@/lib/profile/project-target";
import { isOwnPicture, resolveProjectMedia, type ProjectMediaResult } from "@/lib/project-image-store";

// The owner's paste box on their profile — DECISIONS.md § 2026-10-13
// "Profile projects as cards" (paste box). Past projects: one link or a list
// (≤ 10), each added at the top as 🟢 Live, this year. Currently cooking: one
// link replaces the current project.

const input = z.object({
  kind: z.enum(["past", "current"]),
  text: z.string().max(5000),
});

export interface AddProjectsResult {
  added: number;
  /** Short notes for links that weren't added. */
  notes: string[];
  error?: string;
}

/** Reads up to 4 sites at a time — a list of 10 takes ~3 rounds, not 10. */
async function resolveAll(links: string[], store: boolean): Promise<ProjectMediaResult[]> {
  const out: ProjectMediaResult[] = new Array(links.length);
  let next = 0;
  const worker = async () => {
    while (next < links.length) {
      const i = next++;
      out[i] = await resolveProjectMedia(links[i], { store });
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, links.length) }, worker));
  return out;
}

export async function addProjects(raw: unknown): Promise<AddProjectsResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { added: 0, notes: [], error: "Paste a link, like yourproduct.com." };
  const { kind, text } = parsed.data;
  const year = new Date().getFullYear();

  if (isMockMode()) {
    // Preview: your own profile is drawn from the draft cookie — keep it there.
    const mine = await getPreviewMe();
    if (!mine) return { added: 0, notes: [], error: "Preview mode — sign in with X to try this." };
    const d = mine.draft;
    const existing = kind === "past" ? d.past.map((p) => p.url).filter(Boolean) : [];
    const { links, notes } = pickLinks(text, kind, existing, d.past.length);
    if (!links.length) return { added: 0, notes: notes.length ? notes : ["Paste a link, like yourproduct.com."] };
    const got = await resolveAll(links, false);
    const next: ProfileEdit =
      kind === "current"
        ? { ...d, projectUrl: got[0].url, projectName: got[0].name, projectTagline: got[0].description, projectImageUrl: null, projectLogoUrl: null }
        : { ...d, past: [...got.map((g) => ({ name: g.name, line: g.description, url: g.url, year, status: "live" as const, imageUrl: null, logoUrl: null })), ...d.past].slice(0, LIMITS.past) };
    (await cookies()).set(PREVIEW_DRAFT_COOKIE, JSON.stringify(next), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
    return { added: got.length, notes };
  }

  const account = await getSignedInAccount();
  if (!account?.creatorId) return { added: 0, notes: [], error: "Sign in with the X account that owns this profile." };
  const creatorId = account.creatorId;

  const current = await db.select({ url: creatorPastProjects.url }).from(creatorPastProjects).where(eq(creatorPastProjects.creatorId, creatorId));
  const existing = kind === "past" ? current.map((r) => r.url ?? "").filter(Boolean) : [];
  const { links, notes } = pickLinks(text, kind, existing, current.length);
  if (!links.length) return { added: 0, notes: notes.length ? notes : ["Paste a link, like yourproduct.com."] };

  // Read the sites before the transaction: up to ~8s each, never inside a lock.
  const got = await resolveAll(links, true);

  await db.transaction(async (tx) => {
    if (kind === "current") {
      const g = got[0];
      await tx
        .update(creators)
        .set({ workUrl: g.url, projectName: g.name || null, projectTagline: g.description || null, projectImageUrl: g.imageUrl, projectLogoUrl: g.logoUrl })
        .where(eq(creators.id, creatorId));
      return;
    }
    // New ones go on top: everything already there moves down by the number added.
    await tx
      .update(creatorPastProjects)
      .set({ position: sql`${creatorPastProjects.position} + ${got.length}` })
      .where(eq(creatorPastProjects.creatorId, creatorId));
    await tx.insert(creatorPastProjects).values(
      got.map((g, i) => ({ creatorId, name: g.name.slice(0, 40), line: g.description || null, url: g.url, year, status: "live", imageUrl: g.imageUrl, logoUrl: g.logoUrl, position: i })),
    );
  });

  const [row] = await db.select({ username: creators.username }).from(creators).where(eq(creators.id, creatorId));
  if (row) revalidatePath(`/c/${row.username}`);
  return { added: got.length, notes };
}

// ---- The ⋯ pop-up: one project at a time ---------------------------------

export interface ProjectActionResult {
  ok?: boolean;
  error?: string;
  /** Shown in the pop-up ("Updated", "Couldn't read…"). */
  note?: string;
}

const fieldsSchema = z.object({
  name: z.string().trim().max(40),
  line: z.string().trim().max(80),
  url: z.string().trim().max(300),
  year: z.number().int().min(1990).max(2100).nullable().optional(),
  status: z.enum(Object.keys(PAST_STATUS) as [PastStatus, ...PastStatus[]]).optional(),
});

async function ownerId(): Promise<string | null> {
  const account = await getSignedInAccount();
  return account?.creatorId ?? null;
}

const NOT_OWNER = "Sign in with the X account that owns this profile.";
const GONE = "That project isn’t on your profile any more — refresh the page.";

/** Preview mode: the owner's projects live in the draft cookie; past ids are "draft-N". */
async function editPreview(t: ProjectTarget, change: (d: ProfileEdit, i: number) => ProfileEdit | { error: string }): Promise<ProjectActionResult> {
  const mine = await getPreviewMe();
  if (!mine) return { error: "Preview mode — sign in with X to try this." };
  const i = t.kind === "past" ? Number(t.id.replace(/^draft-/, "")) : -1;
  if (t.kind === "past" && !(Number.isInteger(i) && i >= 0 && i < mine.draft.past.length)) return { error: GONE };
  const next = change(mine.draft, i);
  if ("error" in next) return { error: next.error };
  (await cookies()).set(PREVIEW_DRAFT_COOKIE, JSON.stringify(next), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  return { ok: true };
}

/** Saved when the pop-up closes. A new link re-reads the site's picture and logo (your own picture stays). */
export async function updateProject(raw: unknown): Promise<ProjectActionResult> {
  const parsed = z.object({ target: projectTargetSchema, fields: fieldsSchema }).safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Something didn’t look right." };
  const { target: t, fields: f } = parsed.data;
  const href = f.url ? normalizeProjectLink(f.url) : "";
  if (href === null) return { error: "That link looks off — check for a typo." };
  if (t.kind === "current" && !href) return { error: "Currently cooking needs a link — or Remove it." };
  const name = f.name || (href ? domainOf(href) : "");
  if (!name) return { error: "Give it a name." };

  if (isMockMode()) {
    return editPreview(t, (d, i) =>
      t.kind === "current"
        ? { ...d, projectUrl: href, projectName: name, projectTagline: f.line }
        : { ...d, past: d.past.map((x, j) => (j === i ? { ...x, name, line: f.line, url: href, year: f.year ?? null, status: f.status ?? x.status } : x)) },
    );
  }

  const creatorId = await ownerId();
  if (!creatorId) return { error: NOT_OWNER };
  const before = await readProject(creatorId, t);
  if (!before) return { error: GONE };
  const linkChanged = before.url !== href;
  const media = linkChanged && href ? await resolveProjectMedia(href) : null;
  const ok = await writeProject(creatorId, t, {
    name,
    line: f.line,
    url: href,
    ...(t.kind === "past" && { year: f.year ?? null, status: f.status ?? before.status }),
    ...(linkChanged && {
      imageUrl: isOwnPicture(before.imageUrl) ? before.imageUrl : (media?.imageUrl ?? null),
      logoUrl: media?.logoUrl ?? null,
    }),
  });
  if (!ok) return { error: GONE };
  await revalidateCreator(creatorId);
  return { ok: true };
}

/** "↻ Check again": name, one line, picture and logo re-read from the link. */
export async function refreshProject(raw: unknown): Promise<ProjectActionResult> {
  const parsed = projectTargetSchema.safeParse(raw);
  if (!parsed.success) return { error: "Something didn’t look right." };
  const t = parsed.data;

  if (isMockMode()) {
    const mine = await getPreviewMe();
    const url = t.kind === "current" ? mine?.draft.projectUrl : mine?.draft.past[Number(t.id.replace(/^draft-/, ""))]?.url;
    if (!url) return { error: "This project has no link to check." };
    const m = await resolveProjectMedia(url, { store: false });
    if (!m.read) return { note: `Couldn’t read ${domainOf(url)} — nothing changed.` };
    const res = await editPreview(t, (d, i) =>
      t.kind === "current"
        ? { ...d, projectName: m.name, projectTagline: m.description || d.projectTagline }
        : { ...d, past: d.past.map((x, j) => (j === i ? { ...x, name: m.name, line: m.description || x.line } : x)) },
    );
    return res.ok ? { ok: true, note: "Updated — name and description re-read (pictures need the live database)." } : res;
  }

  const creatorId = await ownerId();
  if (!creatorId) return { error: NOT_OWNER };
  const before = await readProject(creatorId, t);
  if (!before) return { error: GONE };
  if (!before.url) return { error: "This project has no link to check." };
  const m = await resolveProjectMedia(before.url);
  if (!m.read) return { note: `Couldn’t read ${domainOf(before.url)} — nothing changed.` };
  await writeProject(creatorId, t, {
    name: m.name,
    line: m.description || before.line,
    imageUrl: isOwnPicture(before.imageUrl) ? before.imageUrl : m.imageUrl,
    logoUrl: m.logoUrl ?? before.logoUrl,
  });
  await revalidateCreator(creatorId);
  return { ok: true, note: "Updated — name, icon and picture re-read from the link." };
}

/** "Use the site's picture": drops your own picture for the site's share picture. */
export async function restoreSitePicture(raw: unknown): Promise<ProjectActionResult> {
  const parsed = projectTargetSchema.safeParse(raw);
  if (!parsed.success) return { error: "Something didn’t look right." };
  if (isMockMode()) return { error: "Preview mode — pictures need the live database." };
  const creatorId = await ownerId();
  if (!creatorId) return { error: NOT_OWNER };
  const before = await readProject(creatorId, parsed.data);
  if (!before) return { error: GONE };
  const m = before.url ? await resolveProjectMedia(before.url) : null;
  await writeProject(creatorId, parsed.data, { imageUrl: m?.imageUrl ?? null });
  await revalidateCreator(creatorId);
  return { ok: true, note: m?.imageUrl ? "Back to the site’s picture." : "The site has no picture — showing the letter panel." };
}

/** "🗑 Remove" (after "Yes, remove"). Currently cooking is cleared, not deleted. */
export async function removeProject(raw: unknown): Promise<ProjectActionResult> {
  const parsed = projectTargetSchema.safeParse(raw);
  if (!parsed.success) return { error: "Something didn’t look right." };
  const t = parsed.data;
  if (isMockMode()) {
    return editPreview(t, (d, i) =>
      t.kind === "current" ? { ...d, projectUrl: "", projectName: "", projectTagline: "", projectImageUrl: null, projectLogoUrl: null } : { ...d, past: d.past.filter((_, j) => j !== i) },
    );
  }
  const creatorId = await ownerId();
  if (!creatorId) return { error: NOT_OWNER };
  if (!(await removeStoredProject(creatorId, t))) return { error: GONE };
  await revalidateCreator(creatorId);
  return { ok: true };
}
