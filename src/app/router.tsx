import type * as React from "react";
import { createBrowserRouter, createHashRouter } from "react-router";
import { usesHashRouter } from "@/lib/config";
import { AppShell } from "@/components/layout/app-shell";
import { SplashScreen } from "@/components/layout/states";
import { RootLayout } from "./root-layout";

// Seiten werden erst bei Bedarf geladen (kleineres Start-Bundle).
const page = (load: () => Promise<{ default: React.ComponentType }>) => () => load().then((m) => ({ Component: m.default }));

// Hash-Routing nur für die Einzeldatei-Demo (läuft ohne Server, z. B. als geteilter Link).
const createRouter = usesHashRouter ? createHashRouter : createBrowserRouter;

export const router = createRouter([
  {
    element: <RootLayout />,
    hydrateFallbackElement: <SplashScreen />,
    children: [
      { path: "/willkommen", lazy: page(() => import("@/pages/welcome")) },
      { path: "/onboarding", lazy: page(() => import("@/pages/onboarding")) },
      { path: "/onboarding/ergebnis", lazy: page(() => import("@/pages/onboarding-result")) },
      {
        element: <AppShell />,
        children: [
          { path: "/", lazy: page(() => import("@/pages/home")) },
          { path: "/scannen", lazy: page(() => import("@/pages/scan")) },
          { path: "/scan/:scanId", lazy: page(() => import("@/pages/scan-result")) },
          { path: "/scan/:scanId/wein/:itemId", lazy: page(() => import("@/pages/scan-item")) },
          { path: "/weine", lazy: page(() => import("@/pages/my-wines")) },
          { path: "/weine/:savedId", lazy: page(() => import("@/pages/saved-wine")) },
          { path: "/geschmack", lazy: page(() => import("@/pages/taste")) },
          { path: "/geschmack/bewertungen", lazy: page(() => import("@/pages/ratings")) },
        ],
      },
      { path: "*", lazy: page(() => import("@/pages/not-found")) },
    ],
  },
]);
