import { ChevronLeft } from "lucide-react";
import { motion } from "motion/react";
import * as React from "react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";

/** Standard-Seitencontainer mit sanftem Einblenden. */
export function Page({ children, className, withNav = true }: { children: React.ReactNode; className?: string; withNav?: boolean }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn("mx-auto w-full max-w-xl px-5 pt-safe", withNav ? "pb-[calc(96px+env(safe-area-inset-bottom))]" : "pb-[calc(32px+env(safe-area-inset-bottom))]", className)}
    >
      {children}
    </motion.main>
  );
}

/** Kopfzeile für Unterseiten mit Zurück-Button. */
export function TopBar({ title, back = true, right, onBack }: { title?: string; back?: boolean; right?: React.ReactNode; onBack?: () => void }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 -mx-5 mb-2 flex h-14 items-center justify-between gap-3 bg-ivory/80 px-3 backdrop-blur-lg pt-safe box-content">
      <div className="w-11">
        {back && (
          <button
            onClick={() => (onBack ? onBack() : window.history.length > 1 ? navigate(-1) : navigate("/"))}
            className="grid size-11 place-items-center rounded-full text-charcoal transition hover:bg-cream active:scale-95"
            aria-label="Zurück"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}
      </div>
      {title && <p className="truncate text-[15px] font-medium text-charcoal">{title}</p>}
      <div className="flex w-11 justify-end">{right}</div>
    </header>
  );
}

/** Große, editoriale Seitenüberschrift. */
export function PageHeading({ eyebrow, title, subtitle, className }: { eyebrow?: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("pt-6 pb-6", className)}>
      {eyebrow && <p className="mb-3 text-[12px] font-semibold tracking-[0.18em] text-gold uppercase">{eyebrow}</p>}
      <h1 className="text-balance font-serif text-[34px] leading-[1.08] text-charcoal sm:text-[40px]">{title}</h1>
      {subtitle && <p className="mt-3 text-pretty text-[16px] leading-relaxed text-taupe">{subtitle}</p>}
    </div>
  );
}
