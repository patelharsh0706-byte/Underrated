import { describe, expect, it } from "vitest";

import { cleanLink, githubFromLink, githubUser, shortLink } from "./links";

describe("link chips — cleanLink", () => {
  it("GitHub takes a username, @username or a pasted link", () => {
    expect(cleanLink("github", "harsh-p")).toEqual({ url: "https://github.com/harsh-p" });
    expect(cleanLink("github", "@harsh")).toEqual({ url: "https://github.com/harsh" });
    expect(cleanLink("github", "https://github.com/harsh/repo")).toEqual({ url: "https://github.com/harsh" });
    expect(cleanLink("github", "")).toEqual({ url: "" });
    expect(cleanLink("github", "bad name!")).toHaveProperty("error");
    expect(cleanLink("github", "-x")).toHaveProperty("error");
  });

  it("other chips take a whole link from their own site", () => {
    expect(cleanLink("linkedin", "linkedin.com/in/harsh/")).toEqual({ url: "https://linkedin.com/in/harsh" });
    expect(cleanLink("linkedin", "https://www.linkedin.com/in/harsh?x=1")).toEqual({ url: "https://linkedin.com/in/harsh?x=1" });
    expect(cleanLink("youtube", "youtu.be/abc")).toEqual({ url: "https://youtu.be/abc" });
    expect(cleanLink("producthunt", "www.producthunt.com/@harsh")).toEqual({ url: "https://producthunt.com/@harsh" });
  });

  it("refuses another site, the bare site, lookalikes and private hosts", () => {
    expect(cleanLink("linkedin", "github.com/harsh")).toEqual({ error: "That isn’t a LinkedIn link — paste one from linkedin.com." });
    expect(cleanLink("linkedin", "linkedin.com")).toEqual({ error: "Paste your own LinkedIn page, not just linkedin.com." });
    expect(cleanLink("instagram", "instagram.com.evil.com/x")).toHaveProperty("error");
    expect(cleanLink("web", "localhost:3000")).toHaveProperty("error");
    expect(cleanLink("web", "not a link")).toHaveProperty("error");
  });

  it("Website takes any public site, and empty clears", () => {
    expect(cleanLink("web", "harsh.dev")).toEqual({ url: "https://harsh.dev" });
    expect(cleanLink("web", "  ")).toEqual({ url: "" });
  });

  it("helpers", () => {
    expect(shortLink("https://www.linkedin.com/in/harsh/")).toBe("linkedin.com/in/harsh");
    expect(githubFromLink("https://github.com/harsh")).toBe("harsh");
    expect(githubFromLink(undefined)).toBe("");
    expect(githubUser("github.com/a")).toBe("a");
  });
});
