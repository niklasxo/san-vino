import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearQueryCache, hydrateQueryCache, persistQueryCache, storedUserId } from "@/lib/query-cache";

const login = (id: string) => localStorage.setItem("vino-session", JSON.stringify({ access_token: "x", user: { id } }));

describe("Sofortstart-Zwischenspeicher", () => {
  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("liest die Nutzer-ID der gespeicherten Sitzung", () => {
    expect(storedUserId()).toBeNull();
    login("u1");
    expect(storedUserId()).toBe("u1");
    localStorage.setItem("vino-session", "{kaputt");
    expect(storedUserId()).toBeNull();
  });

  it("speichert Profil & Listen und stellt sie für denselben Nutzer wieder her", () => {
    vi.useFakeTimers();
    login("u1");
    const a = new QueryClient();
    persistQueryCache(a);
    a.setQueryData(["profile"], { onboardingCompleted: true });
    a.setQueryData(["saved-wines"], [{ id: "w1" }]);
    a.setQueryData(["saved-wines", "w1"], { id: "w1" }); // Einzelabfrage – nicht speichern
    a.setQueryData(["scan", "s1"], { scan: {} }); // nicht speichern
    vi.advanceTimersByTime(500);

    const b = new QueryClient();
    hydrateQueryCache(b);
    expect(b.getQueryData(["profile"])).toEqual({ onboardingCompleted: true });
    expect(b.getQueryData(["saved-wines"])).toEqual([{ id: "w1" }]);
    expect(b.getQueryData(["saved-wines", "w1"])).toBeUndefined();
    expect(b.getQueryData(["scan", "s1"])).toBeUndefined();
  });

  it("zeigt nie die Daten eines anderen Nutzers (z. B. nach „Alle Daten löschen“)", () => {
    vi.useFakeTimers();
    login("u1");
    const a = new QueryClient();
    persistQueryCache(a);
    a.setQueryData(["profile"], { userId: "u1", onboardingCompleted: true });
    vi.advanceTimersByTime(500);

    const same = new QueryClient();
    hydrateQueryCache(same);
    expect(same.getQueryData(["profile"])).toEqual({ userId: "u1", onboardingCompleted: true });

    login("u2");
    const b = new QueryClient();
    hydrateQueryCache(b);
    expect(b.getQueryData(["profile"])).toBeUndefined();

    clearQueryCache();
    login("u1");
    const c = new QueryClient();
    hydrateQueryCache(c);
    expect(c.getQueryData(["profile"])).toBeUndefined();
  });

  it("übernimmt keinen Stand ohne fertiges Profil (sonst Umleitung zur Willkommensseite direkt nach dem Onboarding)", () => {
    vi.useFakeTimers();
    login("u1");
    const a = new QueryClient();
    persistQueryCache(a);
    a.setQueryData(["profile"], { onboardingCompleted: false });
    a.setQueryData(["saved-wines"], []);
    vi.advanceTimersByTime(500);

    const b = new QueryClient();
    hydrateQueryCache(b);
    expect(b.getQueryData(["profile"])).toBeUndefined();
    expect(b.getQueryData(["saved-wines"])).toBeUndefined();
  });
});
