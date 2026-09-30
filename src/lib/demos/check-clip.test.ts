import { describe, expect, it } from "vitest";

import { checkClipDuration, checkClipFile, checkClipShape, MAX_DEMO_BYTES } from "./check-clip";

const file = (name: string, type: string, size = 3 * 1024 * 1024) => ({ name, type, size });

describe("checkClipFile", () => {
  it("accepts MP4 and WebM", () => {
    expect(checkClipFile(file("demo.mp4", "video/mp4"))).toBeNull();
    expect(checkClipFile(file("demo.webm", "video/webm"))).toBeNull();
  });
  it("rejects iPhone .mov with a way out", () => {
    expect(checkClipFile(file("IMG_0001.MOV", "video/quicktime"))).toMatch(/Export as MP4/);
  });
  it("rejects files that aren't videos", () => {
    expect(checkClipFile(file("notes.txt", "text/plain"))).toMatch(/MP4 or WebM/);
  });
  it("caps size at 8 MB", () => {
    expect(checkClipFile(file("demo.mp4", "video/mp4", MAX_DEMO_BYTES))).toBeNull();
    expect(checkClipFile(file("demo.mp4", "video/mp4", MAX_DEMO_BYTES + 1))).toMatch(/under 8 MB/);
  });
});

describe("checkClipDuration", () => {
  it("allows up to 15 seconds, with half a second of encoder rounding", () => {
    expect(checkClipDuration(8)).toBeNull();
    expect(checkClipDuration(15.4)).toBeNull();
  });
  it("rejects longer clips and says how long they are", () => {
    expect(checkClipDuration(17.9)).toBe("That’s 17.9 seconds — trim it to 15 seconds or less. Show the thing, fast.");
  });
  it("rejects a length the browser couldn't read", () => {
    expect(checkClipDuration(Number.NaN)).toMatch(/Couldn’t read/);
  });
});

describe("checkClipShape", () => {
  it("accepts 16:9 landscape at any resolution", () => {
    expect(checkClipShape(1280, 720)).toBeNull();
    expect(checkClipShape(1920, 1080)).toBeNull();
    expect(checkClipShape(320, 180)).toBeNull();
  });
  it("warns about vertical and square videos, with their size", () => {
    expect(checkClipShape(720, 1280)).toMatch(/720×1280 \(vertical\).*black bars/);
    expect(checkClipShape(720, 720)).toMatch(/720×720 \(square\)/);
  });
  it("says nothing when the size couldn't be read", () => {
    expect(checkClipShape(0, 0)).toBeNull();
  });
});
