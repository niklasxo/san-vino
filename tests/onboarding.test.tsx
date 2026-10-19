import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

// Onboarding gegen das In-Memory-Repository testen (kein Netzwerk, keine Supabase).
vi.mock("@/services", async () => {
  const demo = await import("@/services/demo");
  return { repository: new demo.DemoRepository(), ai: new demo.DemoAiService(), isDemo: true };
});

import OnboardingPage from "@/pages/onboarding";
import { repository } from "@/services";

function setup() {
  const router = createMemoryRouter(
    [
      { path: "/onboarding", element: <OnboardingPage /> },
      { path: "/onboarding/ergebnis", element: <p>Ergebnis-Seite</p> },
    ],
    { initialEntries: ["/onboarding"] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("Geschmacks-Onboarding (UI)", () => {
  it("führt durch sechs Fragen und speichert Antworten + Profil", async () => {
    const user = userEvent.setup();
    setup();
    const single = async (name: string, last = false) => {
      await user.click(await screen.findByRole("radio", { name }));
      // Die App geht nie automatisch weiter – immer der Button.
      if (!last) await user.click(screen.getByRole("button", { name: /^Weiter/ }));
    };
    const multi = async (names: string[]) => {
      for (const n of names) await user.click(await screen.findByRole("checkbox", { name: n }));
      await user.click(screen.getByRole("button", { name: /Weiter/ }));
    };

    expect(await screen.findByText("Frage 1 von 6")).toBeInTheDocument();
    // Ohne Auswahl ist „Weiter“ gesperrt, mit Auswahl bleibt man auf der Frage, bis man tippt.
    expect(screen.getByRole("button", { name: /^Weiter/ })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "Möglichst trocken und wenig süß" }));
    await new Promise((r) => setTimeout(r, 500));
    expect(screen.getByText("Frage 1 von 6")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Weiter/ }));
    await screen.findByText("Frage 2 von 6");
    await single("Ein bisschen Säure finde ich gut");
    await screen.findByText("Frage 3 von 6");
    // Mehrfachauswahl: Weiter erst nach Auswahl aktiv
    expect(screen.getByRole("button", { name: /Weiter/ })).toBeDisabled();
    await multi(["Brombeeren und dunkle Früchte"]);
    await single("Je kräftiger, desto besser");
    await single("Ich liebe bittere Aromen");
    await screen.findByText("Frage 6 von 6");
    await single("Rotwein", true);
    await user.click(screen.getByRole("button", { name: /Mein Profil erstellen/ }));

    expect(await screen.findByText("Ergebnis-Seite")).toBeInTheDocument();
    const state = await repository.getProfileState();
    expect(state.onboardingCompleted).toBe(true);
    expect(state.answers.q1_sweetness).toBe("dry");
    expect(state.answers.q3_fruits).toEqual(["blackberry_dark"]);
    expect(state.tasteType).toBe("bold");
    await waitFor(() => expect(state.taste?.initial.sweetness_preference).toBeLessThan(25));
  }, 20_000);
});
