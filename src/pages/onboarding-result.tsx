import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Navigate, useNavigate } from "react-router";
import { ProfileTasteBars } from "@/components/profile/taste-bars";
import { TasteTypeCard } from "@/components/profile/taste-type-card";
import { SplashScreen } from "@/components/layout/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProfileState } from "@/hooks/queries";
import { describeProfile, PREFERABLE_TYPE_LABEL } from "@/lib/taste-profile/describe";
import { determineTasteType } from "@/lib/taste-profile/taste-type";

export default function OnboardingResultPage() {
  const navigate = useNavigate();
  const { data, isPending } = useProfileState();
  if (isPending) return <SplashScreen />;
  const profile = data?.taste?.learned;
  if (!profile) return <Navigate to="/willkommen" replace />;
  const type = determineTasteType(profile);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-safe pb-safe">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="pt-12 pb-7 text-center">
        <p className="text-[12px] font-semibold tracking-[0.2em] text-gold uppercase">Geschafft</p>
        <h1 className="mt-3 text-balance font-serif text-[32px] leading-[1.1] text-charcoal">Wir haben deinen Geschmack kennengelernt.</h1>
        <p className="mt-3 text-[16px] text-taupe">Das könnte deine Weinwelt sein.</p>
      </motion.div>

      <TasteTypeCard type={type}>
        <p className="mt-5 text-[15px] leading-relaxed text-ivory/90">{describeProfile(profile)}</p>
      </TasteTypeCard>

      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-6 rounded-[1.75rem] bg-cream/70 p-5">
        <h2 className="mb-5 font-serif text-[20px] text-charcoal">Deine Vorlieben</h2>
        <ProfileTasteBars profile={profile} delay={0.4} />
        {profile.preferred_wine_types.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-taupe">Besonders neugierig auf:</span>
            {profile.preferred_wine_types.map((t) => (
              <Badge key={t} tone="burgundy">
                {PREFERABLE_TYPE_LABEL[t]}
              </Badge>
            ))}
          </div>
        )}
      </motion.section>

      <p className="mt-4 px-2 text-center text-[13px] leading-relaxed text-taupe">
        Das ist ein erster Eindruck. Mit jedem Wein, den du bewertest, wird VINO genauer.
      </p>

      <div className="mt-auto pt-8 pb-6">
        <Button block onClick={() => navigate("/scannen", { replace: true })}>
          Jetzt meinen Wein finden <ArrowRight />
        </Button>
        <Button variant="ghost" block className="mt-2" onClick={() => navigate("/", { replace: true })}>
          Erst mal umsehen
        </Button>
      </div>
    </main>
  );
}
