import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "@/app/route-error";

describe("Update-Erkennung", () => {
  it("erkennt fehlende Dateien einer alten Version (Safari, Chrome, Firefox)", () => {
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://x/assets/a.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("error loading dynamically imported module"))).toBe(true);
  });
  it("behandelt andere Fehler nicht als Update", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});
