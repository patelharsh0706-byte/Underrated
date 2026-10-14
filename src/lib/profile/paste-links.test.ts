import { describe, expect, it } from "vitest";

import { pickLinks } from "./paste-links";

describe("pickLinks — the paste box's rules", () => {
  it("reads a whole list, one per line, normalized to https", () => {
    const r = pickLinks("flexclout.com\nhttp://promptdeck.app\n  https://indiestats.dev/  ", "past", [], 0);
    expect(r.links).toEqual(["https://flexclout.com/", "https://promptdeck.app/", "https://indiestats.dev/"]);
    expect(r.notes).toEqual([]);
  });

  it("notes bad links and duplicates (in the paste and already on the profile)", () => {
    const r = pickLinks("notalink\nlocalhost:3000\nflexclout.com\nwww.flexclout.com/\nindiestats.dev", "past", ["https://indiestats.dev"], 1);
    expect(r.links).toEqual(["https://flexclout.com/"]);
    expect(r.notes).toHaveLength(4);
    expect(r.notes.join(" ")).toContain("indiestats.dev is already on your profile.");
  });

  it("stops at 10 projects in all, counting ones without a link", () => {
    const list = Array.from({ length: 5 }, (_, i) => `p${i}.com`).join("\n");
    const r = pickLinks(list, "past", [], 8);
    expect(r.links).toHaveLength(2);
    expect(r.notes).toEqual(["Up to 10 projects — 3 not added."]);
    expect(pickLinks("a.com", "past", [], 10)).toEqual({ links: [], notes: ["You have 10 projects already — remove one first."] });
  });

  it("Currently cooking takes one link", () => {
    const r = pickLinks("a.com\nb.com", "current", [], 0);
    expect(r.links).toEqual(["https://a.com/"]);
    expect(r.notes).toEqual(["One link here — the first one was used."]);
  });
});
