import { Heart, RotateCcw, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, type PanInfo, useMotionValue, useTransform } from "motion/react";
import * as React from "react";
import { useNavigate } from "react-router";
import { Page, TopBar } from "@/components/layout/page";
import { ProfileTasteBars } from "@/components/profile/taste-bars";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSwipes, useSwipeSession, useTasteProfile } from "@/hooks/queries";
import { openSwipeQuestions, type SwipeAnswer, SWIPE_QUESTIONS, type SwipeQuestion } from "@/lib/taste-profile/swipes";

const SWIPE_DISTANCE = 110;

export default function TasteSwipePage() {
  const swipes = useSwipes();
  const navigate = useNavigate();
  const { profile } = useTasteProfile();
  const session = useSwipeSession();
  // Stapel einmal beim Laden festlegen: offene Fragen zuerst; sind alle beantwortet → Abschluss.
  const [deck, setDeck] = React.useState<SwipeQuestion[] | null>(null);
  const [index, setIndex] = React.useState(0);
  const [exit, setExit] = React.useState<SwipeAnswer>("unsure");

  React.useEffect(() => {
    if (swipes.data && deck === null) setDeck(openSwipeQuestions(swipes.data));
  }, [swipes.data, deck]);

  const answeredTotal = swipes.data ? Object.keys(swipes.data).length : 0;
  const current = deck?.[index];
  const done = deck !== null && !current;

  const answer = React.useCallback(
    (value: SwipeAnswer) => {
      if (!current) return;
      setExit(value);
      session.answer(current.key, value);
      setIndex((i) => i + 1);
    },
    [current, session],
  );

  // Auch per Pfeiltasten bedienbar (Desktop)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") answer("yes");
      else if (e.key === "ArrowLeft") answer("no");
      else if (e.key === "ArrowDown" || e.key === " ") answer("unsure");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer]);

  React.useEffect(() => {
    if (done) void session.flush();
  }, [done, session]);

  return (
    <Page className="flex min-h-dvh flex-col">
      <TopBar title="Geschmack verfeinern" />
      {deck === null ? (
        <Skeleton className="mt-6 h-[420px] w-full" />
      ) : done ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-6">
          <span className="grid size-14 place-items-center rounded-2xl bg-gold/20 text-burgundy">
            <Sparkles className="size-6" />
          </span>
          <h1 className="mt-5 font-serif text-[32px] leading-tight text-charcoal">Danke! Dein Profil ist jetzt genauer.</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-taupe">
            Du hast {answeredTotal} von {SWIPE_QUESTIONS.length} Fragen beantwortet. Deine Antworten fließen ab sofort in jede Empfehlung ein.
          </p>
          {profile && (
            <section className="mt-6 rounded-[1.75rem] border border-line/60 bg-white/60 p-5">
              <ProfileTasteBars profile={profile} delay={0.1} />
            </section>
          )}
          <div className="mt-6 space-y-3">
            <Button block onClick={() => navigate("/geschmack/mein-wein")}>
              <Sparkles /> Welcher Wein passt zu mir?
            </Button>
            <Button
              block
              variant="outline"
              onClick={() => {
                setDeck(SWIPE_QUESTIONS);
                setIndex(0);
              }}
            >
              <RotateCcw /> Alle Fragen noch einmal durchgehen
            </Button>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="pt-4">
            <h1 className="sr-only">Geschmack verfeinern</h1>
            <div className="flex items-baseline justify-between">
              <p className="text-[12px] font-semibold tracking-[0.18em] text-gold-ink uppercase">Frage {index + 1} von {deck.length}</p>
              <p className="text-[13px] text-taupe">{answeredTotal} / {SWIPE_QUESTIONS.length} beantwortet</p>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-cream-deep">
              <motion.div className="h-full rounded-full bg-burgundy" animate={{ width: `${(index / deck.length) * 100}%` }} transition={{ duration: 0.4 }} />
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-taupe">Wisch nach rechts für „Ja“, nach links für „Nein“. Jede Antwort macht deine Empfehlungen genauer.</p>
          </div>

          {/* Kartenhöhe passt sich dem Bildschirm an – auf kleinen iPhones (SE, mini) bleiben Ja/Nein über der Navigation */}
          <div className="relative mt-6 h-[clamp(280px,calc(100dvh-400px),400px)]">
            {deck[index + 1] && <CardFace question={deck[index + 1]} className="scale-[0.94] translate-y-3 opacity-70" />}
            <AnimatePresence custom={exit}>
              <SwipeCard key={current!.key} question={current!} onAnswer={answer} />
            </AnimatePresence>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={() => answer("no")}
              className="grid size-16 place-items-center rounded-full bg-white text-taupe shadow-[var(--shadow-soft)] ring-1 ring-line transition active:scale-90"
              aria-label="Nein"
            >
              <X className="size-7" />
            </button>
            <button onClick={() => answer("unsure")} className="h-12 rounded-full px-5 text-[14px] font-medium text-taupe transition hover:bg-cream active:scale-95">
              Weiß nicht
            </button>
            <button
              onClick={() => answer("yes")}
              className="grid size-16 place-items-center rounded-full bg-burgundy text-ivory shadow-[var(--shadow-glow)] transition active:scale-90"
              aria-label="Ja"
            >
              <Heart className="size-7" />
            </button>
          </div>
        </>
      )}
    </Page>
  );
}

const exitVariants = {
  exit: (a: SwipeAnswer) => ({
    x: a === "yes" ? 420 : a === "no" ? -420 : 0,
    y: a === "unsure" ? -40 : 0,
    opacity: 0,
    rotate: a === "yes" ? 18 : a === "no" ? -18 : 0,
    scale: a === "unsure" ? 0.9 : 1,
    transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] as const },
  }),
};

function SwipeCard({ question, onAnswer }: { question: SwipeQuestion; onAnswer: (a: SwipeAnswer) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-14, 14]);
  const yesOpacity = useTransform(x, [20, SWIPE_DISTANCE], [0, 1]);
  const noOpacity = useTransform(x, [-SWIPE_DISTANCE, -20], [1, 0]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > 600) onAnswer("yes");
    else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -600) onAnswer("no");
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.9}
      onDragEnd={onDragEnd}
      initial={{ scale: 0.94, y: 12, opacity: 0.7 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      variants={exitVariants}
      exit="exit"
    >
      <CardFace question={question}>
        <motion.span style={{ opacity: yesOpacity }} className="absolute top-6 left-6 rotate-[-10deg] rounded-xl border-2 border-success px-3 py-1 text-[18px] font-bold tracking-wider text-success">
          JA
        </motion.span>
        <motion.span style={{ opacity: noOpacity }} className="absolute top-6 right-6 rotate-[10deg] rounded-xl border-2 border-danger px-3 py-1 text-[18px] font-bold tracking-wider text-danger">
          NEIN
        </motion.span>
      </CardFace>
    </motion.div>
  );
}

function CardFace({ question, className, children }: { question: SwipeQuestion; className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-b from-white to-cream p-8 text-center shadow-[var(--shadow-lift)] ${className ?? ""}`}
    >
      <span className="text-[84px] leading-none select-none" aria-hidden>
        {question.emoji}
      </span>
      <p className="mt-8 text-balance font-serif text-[28px] leading-snug text-charcoal select-none">{question.text}</p>
      {children}
    </div>
  );
}
