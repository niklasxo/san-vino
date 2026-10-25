import { Link } from "react-router";
import { LanguageMenu } from "@/components/layout/language-menu";

/** Kleine Zeile unter Willkommen, „Mein Geschmack“ und den Rechtsseiten: Impressum, Datenschutz, Sprache. */
export function LegalFooter({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Rechtliches und Sprache" className={`mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-taupe ${className}`}>
      <Link to="/impressum" className="underline-offset-4 hover:text-charcoal hover:underline">
        Impressum
      </Link>
      <Link to="/datenschutz" className="underline-offset-4 hover:text-charcoal hover:underline">
        Datenschutz
      </Link>
      <LanguageMenu />
    </nav>
  );
}
