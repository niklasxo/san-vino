import { ArrowRight, Clock } from "lucide-react";
import { motion } from "motion/react";
import { Navigate, useNavigate } from "react-router";
import { HeroArt } from "@/components/brand/hero-art";
import { Logo } from "@/components/brand/logo";
import { SplashScreen } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "./legal-footer";
import { useProfileState } from "@/hooks/queries";

const fade = (delay: number) => ({
  initial: { opacity: 0.4, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
});

export default function WelcomePage() {
  const navigate = useNavigate();
  const { data, isPending } = useProfileState();
  if (isPending) return <SplashScreen />;
  if (data?.onboardingCompleted) return <Navigate to="/" replace />;

  return (
    <main className="grain mx-auto flex min-h-dvh w-full max-w-xl flex-col overflow-hidden px-6 pt-safe pb-safe">
      <motion.div {...fade(0)} className="flex justify-center pt-6">
        <Logo />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mt-6 w-full max-w-[300px] sm:max-w-[330px]"
      >
        <HeroArt />
      </motion.div>

      <div className="mt-8 text-center">
        <motion.h1 {...fade(0.15)} className="text-balance font-serif text-[36px] leading-[1.08] text-charcoal sm:text-[42px]">
          Wein finden, der wirklich zu dir passt.
        </motion.h1>
        <motion.p {...fade(0.25)} className="mx-auto mt-4 max-w-sm text-pretty text-[16px] leading-relaxed text-taupe">
          Kein Weinwissen nötig. Entdecke in wenigen Schritten deinen persönlichen Geschmack.
        </motion.p>
      </div>

      <motion.div {...fade(0.35)} className="mt-auto pt-8 pb-6">
        <Button block onClick={() => navigate("/onboarding")}>
          Meinen Geschmack entdecken <ArrowRight />
        </Button>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-taupe">
          <Clock className="size-3.5" /> Nur 6 kurze Fragen – dauert etwa 1 Minute
        </p>
        <LegalFooter className="mt-6" />
      </motion.div>
    </main>
  );
}
