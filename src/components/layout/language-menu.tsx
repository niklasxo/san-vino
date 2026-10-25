import { useRef } from "react";
import { useLanguageMenu } from "@/lib/translate";
import { cn } from "@/lib/utils";

/** Platz für den Sprach-Knopf (Widget von niklasschneider.me, siehe lib/translate.ts). */
export function LanguageMenu({ className }: { className?: string }) {
  const slot = useRef<HTMLSpanElement>(null);
  useLanguageMenu(slot);
  return <span ref={slot} className={cn("sv-lang inline-flex min-h-11", className)} />;
}
