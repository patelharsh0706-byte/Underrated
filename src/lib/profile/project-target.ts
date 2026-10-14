import "server-only";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { creatorPastProjects, creators } from "@/lib/db/schema";

import type { PastStatus } from "./options";

// One project on the owner's profile — "Currently cooking" or one past project
// by its row id — read and written for the ⋯ pop-up and the picture upload.
// Every write is scoped to the signed-in owner's creator id.

export const projectTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("current") }),
  z.object({ kind: z.literal("past"), id: z.string().min(1).max(64) }),
]);
export type ProjectTarget = z.infer<typeof projectTargetSchema>;

export interface StoredProject {
  url: string;
  name: string;
  line: string;
  imageUrl: string | null;
  logoUrl: string | null;
  year: number | null;
  status: PastStatus | null;
}

const isUuid = (id: string) => z.uuid().safeParse(id).success;

export async function readProject(creatorId: string, t: ProjectTarget): Promise<StoredProject | null> {
  if (t.kind === "current") {
    const [c] = await db
      .select({ url: creators.workUrl, name: creators.projectName, line: creators.projectTagline, imageUrl: creators.projectImageUrl, logoUrl: creators.projectLogoUrl })
      .from(creators)
      .where(eq(creators.id, creatorId));
    if (!c?.url) return null;
    return { url: c.url, name: c.name ?? "", line: c.line ?? "", imageUrl: c.imageUrl, logoUrl: c.logoUrl, year: null, status: null };
  }
  if (!isUuid(t.id)) return null;
  const [r] = await db
    .select({ url: creatorPastProjects.url, name: creatorPastProjects.name, line: creatorPastProjects.line, imageUrl: creatorPastProjects.imageUrl, logoUrl: creatorPastProjects.logoUrl, year: creatorPastProjects.year, status: creatorPastProjects.status })
    .from(creatorPastProjects)
    .where(and(eq(creatorPastProjects.id, t.id), eq(creatorPastProjects.creatorId, creatorId)));
  if (!r) return null;
  return { url: r.url ?? "", name: r.name, line: r.line ?? "", imageUrl: r.imageUrl, logoUrl: r.logoUrl, year: r.year, status: r.status as PastStatus };
}

/** Writes only the fields given. Returns false when the project isn't this owner's. */
export async function writeProject(creatorId: string, t: ProjectTarget, patch: Partial<StoredProject>): Promise<boolean> {
  if (t.kind === "current") {
    const rows = await db
      .update(creators)
      .set({
        ...(patch.url !== undefined && { workUrl: patch.url || null }),
        ...(patch.name !== undefined && { projectName: patch.name || null }),
        ...(patch.line !== undefined && { projectTagline: patch.line || null }),
        ...(patch.imageUrl !== undefined && { projectImageUrl: patch.imageUrl }),
        ...(patch.logoUrl !== undefined && { projectLogoUrl: patch.logoUrl }),
      })
      .where(eq(creators.id, creatorId))
      .returning({ id: creators.id });
    return rows.length > 0;
  }
  if (!isUuid(t.id)) return false;
  const rows = await db
    .update(creatorPastProjects)
    .set({
      ...(patch.url !== undefined && { url: patch.url || null }),
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.line !== undefined && { line: patch.line || null }),
      ...(patch.imageUrl !== undefined && { imageUrl: patch.imageUrl }),
      ...(patch.logoUrl !== undefined && { logoUrl: patch.logoUrl }),
      ...(patch.year !== undefined && { year: patch.year }),
      ...(patch.status != null && { status: patch.status }),
    })
    .where(and(eq(creatorPastProjects.id, t.id), eq(creatorPastProjects.creatorId, creatorId)))
    .returning({ id: creatorPastProjects.id });
  return rows.length > 0;
}

/** Remove a past project, or clear "Currently cooking". */
export async function removeStoredProject(creatorId: string, t: ProjectTarget): Promise<boolean> {
  if (t.kind === "current") {
    return writeProject(creatorId, t, { url: "", name: "", line: "", imageUrl: null, logoUrl: null });
  }
  if (!isUuid(t.id)) return false;
  const rows = await db
    .delete(creatorPastProjects)
    .where(and(eq(creatorPastProjects.id, t.id), eq(creatorPastProjects.creatorId, creatorId)))
    .returning({ id: creatorPastProjects.id });
  return rows.length > 0;
}

/** The public profile page shows the change on its next view. */
export async function revalidateCreator(creatorId: string): Promise<void> {
  const [row] = await db.select({ username: creators.username }).from(creators).where(eq(creators.id, creatorId));
  if (row) revalidatePath(`/c/${row.username}`);
}
