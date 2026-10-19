import { describe, expect, it } from "vitest";
import { createResilientStorage, type SimpleStorage } from "@/lib/supabase/resilient-storage";

const flaky = (mode: "throws" | "forgets"): SimpleStorage => ({
  getItem: () => {
    if (mode === "throws") throw new Error("SecurityError");
    return null; // Safari hat den Eintrag „vergessen“
  },
  setItem: () => {
    if (mode === "throws") throw new Error("QuotaExceededError");
  },
  removeItem: () => undefined,
});

describe("Sitzungsspeicher mit Sicherheitsnetz", () => {
  it("behält die Sitzung, wenn localStorage Fehler wirft", () => {
    const s = createResilientStorage(flaky("throws"));
    s.setItem("vino-session", "token");
    expect(s.getItem("vino-session")).toBe("token");
  });

  it("behält die Sitzung, wenn localStorage den Eintrag verliert", () => {
    const s = createResilientStorage(flaky("forgets"));
    s.setItem("vino-session", "token");
    expect(s.getItem("vino-session")).toBe("token");
  });

  it("nutzt den echten Speicher, wenn er funktioniert, und löscht in beiden", () => {
    const backing = new Map<string, string>();
    const real: SimpleStorage = { getItem: (k) => backing.get(k) ?? null, setItem: (k, v) => void backing.set(k, v), removeItem: (k) => void backing.delete(k) };
    const s = createResilientStorage(real);
    s.setItem("a", "1");
    expect(backing.get("a")).toBe("1");
    backing.set("a", "2"); // z. B. von einem anderen Tab aktualisiert
    expect(s.getItem("a")).toBe("2");
    s.removeItem("a");
    expect(s.getItem("a")).toBeNull();
  });

  it("funktioniert ganz ohne Browser-Speicher", () => {
    const s = createResilientStorage(null);
    s.setItem("k", "v");
    expect(s.getItem("k")).toBe("v");
  });
});
