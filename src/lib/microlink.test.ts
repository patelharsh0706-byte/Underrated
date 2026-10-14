import { describe, expect, it } from "vitest";

import { microlinkRequest, screenshotFromResponse } from "./microlink";

describe("Microlink screenshot fallback", () => {
  it("asks for a 1200×628 JPEG at 1× of the page", () => {
    const { url, headers } = microlinkRequest("https://example.com/");
    const u = new URL(url);
    expect(u.host).toBe("api.microlink.io");
    expect(u.searchParams.get("url")).toBe("https://example.com/");
    expect(u.searchParams.get("viewport.width")).toBe("1200");
    expect(u.searchParams.get("viewport.height")).toBe("628");
    expect(u.searchParams.get("screenshot.type")).toBe("jpeg");
    expect(headers).toEqual({});
  });

  it("uses the pro host and header when there's a key", () => {
    const { url, headers } = microlinkRequest("https://example.com/", "k123");
    expect(new URL(url).host).toBe("pro.microlink.io");
    expect(headers).toEqual({ "x-api-key": "k123" });
  });

  it("reads the screenshot URL only from a success answer", () => {
    expect(screenshotFromResponse({ status: "success", data: { screenshot: { url: "https://iad.microlink.io/abc" } } })).toBe("https://iad.microlink.io/abc");
    expect(screenshotFromResponse({ status: "fail", data: { screenshot: { url: "https://x" } } })).toBeNull();
    expect(screenshotFromResponse({ status: "success", data: {} })).toBeNull();
    expect(screenshotFromResponse({ status: "success", data: { screenshot: { url: "http://insecure" } } })).toBeNull();
    expect(screenshotFromResponse(null)).toBeNull();
  });
});
