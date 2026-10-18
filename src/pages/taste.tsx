import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, PencilLine, RefreshCcw, Shield, Star, Trash2, Undo2 } from "lucide-react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Page, PageHeading } from "@/components/layout/page";
import { ProfileTasteBars } from "@/components/profile/taste-bars";
import { TasteTypeCard } from "@/components/profile/taste-type-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteAllData, useProfileState, useResetProfile, useSavedWines } from "@/hooks/queries";
import { reloadAtStart } from "@/lib/config";
import { describeError } from "@/lib/errors";
import { describeProfile, PREFERABLE_TYPE_LABEL, profileCertainty } from "@/lib/taste-profile/describe";
import { determineTasteType } from "@/lib/taste-profile/taste-type";
import { isDemo } from "@/services";

export default function TastePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useProfileState();
  const saved = useSavedWines();
  const reset = useResetProfile();
  const deleteAll = useDeleteAllData();
  const profile = data!.taste!.learned;
  const type = determineTasteType(profile);
  const certainty = profileCertainty(profile);
  const ratedCount = (saved.data ?? []).filter((w) => w.rating).length;
  const learnedShift = data!.taste!.learned.ratings_count > 0;

  return (
    <Page>
      <PageHeading eyebrow="Mein Geschmack" title="So schmeckt deine Weinwelt." />

      <TasteTypeCard type={type}>
        <p className="mt-5 text-[15px] leading-relaxed text-ivory/90">{describeProfile(profile)}</p>
      </TasteTypeCard>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-[1.5rem] bg-cream/80 p-4">
          <p className="font-serif text-[30px] leading-none text-charcoal tabular-nums">{ratedCount}</p>
          <p className="mt-1.5 text-[13px] text-taupe">{ratedCount === 1 ? "bewerteter Wein" : "bewertete Weine"}</p>
        </div>
        <div className="rounded-[1.5rem] bg-cream/80 p-4">
          <p className="text-[15px] font-medium text-charcoal">{certainty.label}</p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-cream-deep">
            <motion.div className="h-full rounded-full bg-gold" initial={{ width: 0 }} animate={{ width: `${certainty.progress * 100}%` }} transition={{ duration: 1, delay: 0.3 }} />
          </div>
          <p className="mt-1.5 text-[13px] text-taupe">Profil-Sicherheit</p>
        </div>
      </motion.section>
      <p className="mt-3 px-1 text-[13px] leading-relaxed text-taupe">{certainty.description}</p>

      <section className="mt-6 rounded-[1.75rem] border border-line/60 bg-white/60 p-5">
        <h2 className="mb-5 font-serif text-[20px] text-charcoal">Deine wichtigsten Vorlieben</h2>
        <ProfileTasteBars profile={profile} delay={0.2} />
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-taupe">Bevorzugte Weinarten:</span>
          {profile.preferred_wine_types.length ? (
            profile.preferred_wine_types.map((t) => (
              <Badge key={t} tone="burgundy">
                {PREFERABLE_TYPE_LABEL[t]}
              </Badge>
            ))
          ) : (
            <Badge tone="outline">Offen für alles</Badge>
          )}
        </div>
        {learnedShift && <p className="mt-4 text-[12px] text-taupe">Enthält bereits, was du uns durch deine Bewertungen verraten hast.</p>}
      </section>

      <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-line/60 bg-white/60">
        <MenuRow icon={<RefreshCcw />} label="Geschmack neu einstellen" text="Alle zehn Fragen noch einmal von vorn" onClick={() => navigate("/onboarding?modus=neu")} />
        <MenuRow icon={<PencilLine />} label="Meine Antworten bearbeiten" text="Einzelne Antworten anpassen" onClick={() => navigate("/onboarding?modus=bearbeiten")} />
        <MenuRow icon={<Star />} label="Meine Bewertungen ansehen" text={`${ratedCount} ${ratedCount === 1 ? "Bewertung" : "Bewertungen"}`} to="/geschmack/bewertungen" />
        <ConfirmDialog
          trigger={<MenuRow icon={<Undo2 />} label="Profil zurücksetzen" text="Antworten und Geschmacksprofil löschen" />}
          title="Profil wirklich zurücksetzen?"
          description={
            <>
              <p>Deine zehn Antworten und dein berechnetes Geschmacksprofil werden gelöscht. Danach startest du wieder mit dem Fragebogen.</p>
              <p>Deine gespeicherten Weine und Bewertungen bleiben erhalten und fließen in dein neues Profil wieder ein.</p>
            </>
          }
          confirmLabel="Zurücksetzen"
          destructive
          onConfirm={async () => {
            try {
              await reset.mutateAsync();
              toast.success("Profil zurückgesetzt");
              navigate("/willkommen", { replace: true });
            } catch (err) {
              toast.error(describeError(err).title);
            }
          }}
        />
      </section>

      <section className="mt-8 rounded-[1.75rem] bg-cream/60 p-5">
        <h2 className="flex items-center gap-2 font-serif text-[18px] text-charcoal">
          <Shield className="size-4 text-gold" /> Deine Daten
        </h2>
        <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-taupe">
          <li>• Du nutzt SAN VINO ohne Konto. Dein Profil ist an diesen Browser gebunden – löschst du die Website-Daten, ist der Zugang weg.</li>
          <li>• Fotos werden ohne Standortdaten privat gespeichert und zur Analyse an unseren KI-Dienst (Google Gemini) übermittelt.</li>
          <li>• Dein Geschmacksprofil, Weine und Bewertungen liegen geschützt in unserer Datenbank (Supabase).</li>
        </ul>
        {!isDemo && (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="mt-4 -ml-2 text-danger">
                <Trash2 /> Alle meine Daten löschen
              </Button>
            }
            title="Alle Daten endgültig löschen?"
            description={
              <>
                <p>Profil, Antworten, Scans, Fotos, gespeicherte Weine und Bewertungen werden unwiderruflich gelöscht.</p>
                <p>Das kann nicht rückgängig gemacht werden.</p>
              </>
            }
            confirmLabel="Endgültig löschen"
            destructive
            onConfirm={async () => {
              try {
                await deleteAll.mutateAsync();
                qc.clear();
                reloadAtStart();
              } catch (err) {
                toast.error(describeError(err).title, { description: describeError(err).text });
              }
            }}
          />
        )}
      </section>
    </Page>
  );
}

function MenuRow({ icon, label, text, onClick, to, ...rest }: { icon: React.ReactNode; label: string; text: string; onClick?: () => void; to?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const inner = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cream text-burgundy [&_svg]:size-[18px]">{icon}</span>
      <span className="flex-1 text-left">
        <span className="block text-[15px] font-medium text-charcoal">{label}</span>
        <span className="block text-[13px] text-taupe">{text}</span>
      </span>
      <ChevronRight className="size-4 text-taupe" />
    </>
  );
  const cls = "flex w-full items-center gap-3.5 border-b border-line/60 px-4 py-3.5 transition last:border-b-0 hover:bg-white";
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return (
    <button type="button" onClick={onClick} className={cls} {...rest}>
      {inner}
    </button>
  );
}
