import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import * as React from "react";
import { DemoBanner, OfflineBanner } from "@/components/layout/banners";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "./session";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => count < 2 && !(err as { code?: string })?.code?.startsWith("not_"),
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Respektiert die Systemeinstellung „Bewegung reduzieren“ */}
      <MotionConfig reducedMotion="user">
        <SessionProvider>
          <OfflineBanner />
          <DemoBanner />
          {children}
          <Toaster />
        </SessionProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
