import { NextResponse } from "next/server";

import { getSignedInAccount } from "@/lib/account";
import { isMockMode } from "@/lib/db/mock-data";
import { projectTargetSchema, readProject, revalidateCreator, writeProject } from "@/lib/profile/project-target";
import { storeOwnPicture } from "@/lib/project-image-store";
import { MAX_IMAGE_BYTES } from "@/lib/safe-fetch";

// "↑ Use my own picture" in a project's ⋯ pop-up (DECISIONS.md § 2026-10-13,
// upload). Its own route with a 2 MB cap, rather than raising the 1 MB limit
// on every Server Action. Owner only, same site only; the picture is checked
// by its bytes (PNG, JPG or WebP) and stored in Blob under projects/custom/.

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: Request): Promise<NextResponse> {
  // Route handlers don't get the Server Action Origin check — do it here.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let sameSite = false;
  try {
    sameSite = !!origin && !!host && new URL(origin).host === host;
  } catch {}
  if (!sameSite) return fail("Not allowed.", 403);
  if (isMockMode()) return fail("Preview mode — pictures need the live database.", 403);

  // Refuse big bodies before reading them (the form adds a little to the file).
  if (Number(request.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES + 64 * 1024) return fail("That picture is over 2 MB — try a smaller one.", 413);

  const account = await getSignedInAccount();
  if (!account?.creatorId) return fail("Sign in with the X account that owns this profile.", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Something didn’t look right.", 400);
  }
  const file = form.get("file");
  let target: unknown = null;
  try {
    target = JSON.parse(String(form.get("target") ?? "null"));
  } catch {}
  const t = projectTargetSchema.safeParse(target);
  if (!t.success || !(file instanceof File)) return fail("Something didn’t look right.", 400);
  if (file.size > MAX_IMAGE_BYTES) return fail("That picture is over 2 MB — try a smaller one.", 413);

  const creatorId = account.creatorId;
  if (!(await readProject(creatorId, t.data))) return fail("That project isn’t on your profile any more — refresh the page.", 404);

  const url = await storeOwnPicture(Buffer.from(await file.arrayBuffer()));
  if (!url) return fail("PNG, JPG or WebP only, up to 2 MB.", 400);
  if (!(await writeProject(creatorId, t.data, { imageUrl: url }))) return fail("That project isn’t on your profile any more — refresh the page.", 404);
  await revalidateCreator(creatorId);
  return NextResponse.json({ imageUrl: url });
}
