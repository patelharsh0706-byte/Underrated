import { describe, expect, it } from "vitest";

import { sniffImage } from "./image-sniff";

const bytes = (...b: number[]) => new Uint8Array(b);
const ascii = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));

describe("sniffImage — by the bytes, not the label", () => {
  it("knows PNG, JPEG, GIF and WebP", () => {
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))?.ext).toBe("png");
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))?.ext).toBe("jpg");
    expect(sniffImage(ascii("GIF89a....."))?.ext).toBe("gif");
    expect(sniffImage(ascii("RIFF\0\0\0\0WEBPVP8 "))?.contentType).toBe("image/webp");
  });

  it("refuses SVG, HTML, ICO and empty input", () => {
    expect(sniffImage(ascii("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull();
    expect(sniffImage(ascii("<!doctype html>"))).toBeNull();
    expect(sniffImage(bytes(0, 0, 1, 0, 1, 0))).toBeNull();
    expect(sniffImage(bytes())).toBeNull();
  });
});
