import { Database, FlaskConical, KeyRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { enableDemoMode } from "@/lib/config";

/** Wird nur angezeigt, wenn keine Supabase-Zugangsdaten konfiguriert sind (Entwicklung). */
export default function SetupPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-6 pt-safe pb-safe">
      <div className="pt-10">
        <Logo />
      </div>
      <h1 className="mt-10 font-serif text-[32px] leading-tight text-charcoal">Fast geschafft – SAN VINO braucht noch ihre Datenbank.</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-taupe">
        Es sind noch keine Supabase-Zugangsdaten hinterlegt. So richtest du sie ein:
      </p>
      <ol className="mt-6 space-y-4 text-[15px] text-charcoal">
        <li className="flex gap-3">
          <Database className="mt-0.5 size-5 shrink-0 text-burgundy" />
          <span>
            Lege in <b>Supabase</b> ein Projekt an und spiele die Migrationen ein (<code className="rounded bg-cream px-1">npx supabase db push</code>).
          </span>
        </li>
        <li className="flex gap-3">
          <KeyRound className="mt-0.5 size-5 shrink-0 text-burgundy" />
          <span>
            Kopiere <code className="rounded bg-cream px-1">.env.example</code> nach <code className="rounded bg-cream px-1">.env.local</code> und trage
            Projekt-URL und anon-Key ein. Danach den Dev-Server neu starten.
          </span>
        </li>
      </ol>
      <p className="mt-6 text-[14px] text-taupe">Alle Schritte stehen ausführlich in der README.md.</p>

      <div className="mt-auto pt-10 pb-6">
        <div className="rounded-[1.5rem] bg-cream p-5">
          <p className="flex items-center gap-2 font-medium text-charcoal">
            <FlaskConical className="size-4 text-gold" /> Erst mal nur umschauen?
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-taupe">
            Der Demo-Modus zeigt alle Ansichten mit klar gekennzeichneten Beispielweinen. Es wird nichts gespeichert und keine KI aufgerufen.
          </p>
          <Button variant="secondary" size="md" className="mt-4" onClick={enableDemoMode}>
            Demo-Modus starten
          </Button>
        </div>
      </div>
    </main>
  );
}
