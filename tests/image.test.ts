import { describe, expect, it } from "vitest";
import { ImageError, targetSize, validateImageFile } from "@/lib/image/prepare";

describe("Bildvorbereitung", () => {
  it("begrenzt die Kantenlänge und behält das Seitenverhältnis", () => {
    expect(targetSize(4032, 3024)).toEqual({ width: 2048, height: 1536 });
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it("lehnt falsche Dateitypen und zu große Dateien ab", () => {
    expect(() => validateImageFile(new File(["x"], "a.pdf", { type: "application/pdf" }))).toThrow(ImageError);
    const big = new File([new Uint8Array(1)], "a.jpg", { type: "image/jpeg" });
    Object.defineProperty(big, "size", { value: 40 * 1024 * 1024 });
    expect(() => validateImageFile(big)).toThrow(ImageError);
    expect(() => validateImageFile(new File(["x"], "a.jpg", { type: "image/jpeg" }))).not.toThrow();
  });
});
