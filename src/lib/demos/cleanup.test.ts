import { describe, expect, it } from "vitest";

import { CLEANUP_GRACE_MS, videosToDelete, type StoredVideo } from "./cleanup";

const HOST = "https://abc.public.blob.vercel-storage.com/";
const NOW = new Date("2026-10-05T03:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const video = (pathname: string, age: number): StoredVideo => ({ url: HOST + pathname, pathname, uploadedAt: ago(age) });
const OLD = CLEANUP_GRACE_MS + 60_000;

describe("videosToDelete — DECISIONS.md § Unpaid demo videos are deleted daily", () => {
  it("deletes an old video that no demo row uses (never paid for)", () => {
    const unpaid = video("demos/demo-abc.mp4", OLD);
    expect(videosToDelete([unpaid], [], NOW)).toEqual([unpaid]);
  });

  it("keeps a video a demo row uses — paid or added by hand", () => {
    const used = video("demos/demo-abc.mp4", OLD);
    expect(videosToDelete([used], [HOST + "demos/demo-abc.mp4"], NOW)).toEqual([]);
  });

  it("keeps a video still inside the 48 h grace (checkout may be open)", () => {
    expect(videosToDelete([video("demos/demo-new.mp4", CLEANUP_GRACE_MS - 60_000)], [], NOW)).toEqual([]);
  });

  it("never touches demos/beta/, even when old and unreferenced", () => {
    expect(videosToDelete([video("demos/beta/loopkit.mp4", OLD * 10)], [], NOW)).toEqual([]);
  });

  it("ignores anything outside demos/ (creator photos)", () => {
    expect(videosToDelete([video("avatars/harsh.jpg", OLD)], [], NOW)).toEqual([]);
  });

  it("matches a referenced URL by its path, ignoring a query string", () => {
    const used = video("demos/demo-abc.mp4", OLD);
    expect(videosToDelete([used], [HOST + "demos/demo-abc.mp4?download=1"], NOW)).toEqual([]);
  });

  it("is idempotent: the survivors of one run give an empty second run", () => {
    const all = [video("demos/a.mp4", OLD), video("demos/b.mp4", OLD), video("demos/beta/c.mp4", OLD)];
    const doomed = videosToDelete(all, [HOST + "demos/b.mp4"], NOW);
    const left = all.filter((v) => !doomed.includes(v));
    expect(doomed.map((v) => v.pathname)).toEqual(["demos/a.mp4"]);
    expect(videosToDelete(left, [HOST + "demos/b.mp4"], NOW)).toEqual([]);
  });
});
