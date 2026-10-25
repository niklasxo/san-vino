import { CloudOff, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import * as React from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { describeError } from "@/lib/errors";

export function SplashScreen({ label = "Einen Moment …" }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-ivory" role="status" aria-live="polite">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.35 }} className="flex flex-col items-center gap-5">
        <Logo className="text-[28px]" />
        <div className="h-[2px] w-24 overflow-hidden rounded-full bg-cream">
          <motion.div
            className="h-full w-1/2 rounded-full bg-gold"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <span className="sr-only">{label}</span>
      </motion.div>
    </div>
  );
}

export function FullScreenError({ error, onRetry, title, text, actionLabel }: { error?: unknown; onRetry?: () => void; title?: string; text?: string; actionLabel?: string }) {
  const d = describeError(error);
  return (
    // A page of its own (404, errors): its content is the main landmark.
    <main className="grid min-h-dvh place-items-center bg-ivory px-8 text-center">
      <div className="flex max-w-sm flex-col items-center">
        <span className="mb-6 grid size-16 place-items-center rounded-full bg-cream text-burgundy" aria-hidden="true">
          <CloudOff className="size-7" />
        </span>
        <h1 className="font-serif text-[26px] leading-tight text-charcoal">{title ?? d.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-taupe">{text ?? d.text}</p>
        {onRetry && (
          <Button className="mt-8" onClick={onRetry}>
            {actionLabel ?? <><RotateCcw /> Erneut versuchen</>}
          </Button>
        )}
      </div>
    </main>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center rounded-[1.75rem] border border-dashed border-line px-6 py-10 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-full bg-cream text-burgundy [&_svg]:size-6">{icon}</span>
      <h3 className="font-serif text-[20px] text-charcoal">{title}</h3>
      <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-taupe">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

export function InlineError({ error, onRetry, compact }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  const d = describeError(error);
  return (
    <div className="rounded-[1.5rem] bg-cream p-5 text-center" role="alert">
      <p className="font-medium text-charcoal">{d.title}</p>
      {!compact && <p className="mt-1 text-[14px] text-taupe">{d.text}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCcw /> Nochmal versuchen
        </Button>
      )}
    </div>
  );
}
