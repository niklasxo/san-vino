import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ChevronLeft, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { OptionCard } from "@/components/onboarding/option-card";
import { OnboardingProgress } from "@/components/onboarding/progress";
import { SplashScreen } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { useCompleteOnboarding, useProfileState } from "@/hooks/queries";
import { describeError } from "@/lib/errors";
import { isAnswered, QUESTIONS } from "@/lib/taste-profile/questions";
import { tasteAnswersSchema, type TasteAnswersForm } from "@/lib/validation/answers";

export default function OnboardingPage() {
  const { data, isPending } = useProfileState();
  if (isPending) return <SplashScreen />;
  return <OnboardingFlow initial={data?.answers ?? {}} hasProfile={Boolean(data?.onboardingCompleted)} />;
}

function OnboardingFlow({ initial, hasProfile }: { initial: Partial<TasteAnswersForm>; hasProfile: boolean }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get("modus"); // "bearbeiten" | "neu" | null
  const editing = mode === "bearbeiten" && hasProfile;

  const form = useForm<TasteAnswersForm>({
    resolver: zodResolver(tasteAnswersSchema),
    defaultValues: editing ? initial : {},
    mode: "onChange",
  });
  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const complete = useCompleteOnboarding();

  const question = QUESTIONS[step];
  const value = form.watch(question.key);
  const answered = isAnswered(question, value);
  const isLast = step === QUESTIONS.length - 1;

  const submit = form.handleSubmit(
    async (answers) => {
      try {
        await complete.mutateAsync(answers);
        if (editing) {
          toast.success("Dein Geschmacksprofil wurde aktualisiert");
          navigate("/geschmack", { replace: true });
        } else {
          navigate("/onboarding/ergebnis", { replace: true });
        }
      } catch (err) {
        const d = describeError(err);
        toast.error(d.title, { description: d.text });
      }
    },
    () => {
      const first = QUESTIONS.findIndex((q) => !isAnswered(q, form.getValues(q.key)));
      if (first >= 0) {
        setDirection(-1);
        setStep(first);
      }
    },
  );

  const next = () => {
    if (!isAnswered(question, form.getValues(question.key))) return;
    if (isLast) return void submit();
    setDirection(1);
    setStep((s) => Math.min(QUESTIONS.length - 1, s + 1));
  };
  const back = () => {
    if (step === 0) return navigate(editing ? "/geschmack" : hasProfile ? "/geschmack" : "/willkommen");
    setDirection(-1);
    setStep((s) => s - 1);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-safe pb-safe">
      <header className="flex items-center gap-3 pt-4 pb-2">
        <button onClick={back} className="grid size-11 shrink-0 place-items-center rounded-full text-charcoal transition hover:bg-cream active:scale-95" aria-label={step === 0 ? "Abbrechen" : "Vorherige Frage"}>
          {step === 0 ? <X className="size-5" /> : <ChevronLeft className="size-6" />}
        </button>
        <OnboardingProgress current={step + 1} total={QUESTIONS.length} />
      </header>

      <form onSubmit={(e) => (e.preventDefault(), next())} className="flex flex-1 flex-col">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.section
            key={question.key}
            custom={direction}
            initial={{ opacity: 0, x: direction * 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -36 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col"
            aria-labelledby={`q-${question.key}`}
          >
            <div className="pt-7 pb-6">
              <h1 id={`q-${question.key}`} className="text-balance font-serif text-[29px] leading-[1.15] text-charcoal sm:text-[34px]">
                {question.title}
              </h1>
              {question.helper && <p className="mt-3 text-[15px] leading-relaxed text-taupe">{question.helper}</p>}
            </div>

            <Controller
              control={form.control}
              name={question.key}
              render={({ field }) => (
                <div role={question.kind === "multi" ? "group" : "radiogroup"} aria-labelledby={`q-${question.key}`} className="flex flex-col gap-2.5">
                  {question.options.map((option, i) => {
                    const current = field.value as string | string[] | undefined;
                    const selected = question.kind === "multi" ? Array.isArray(current) && current.includes(option.id) : current === option.id;
                    return (
                      <OptionCard
                        key={option.id}
                        index={i}
                        option={option}
                        multi={question.kind === "multi"}
                        selected={selected}
                        onSelect={() => {
                          if (question.kind === "multi") {
                            const list = Array.isArray(current) ? current : [];
                            field.onChange(selected ? list.filter((x) => x !== option.id) : [...list, option.id]);
                          } else {
                            // Weiter geht es immer erst über den Button – nie automatisch.
                            field.onChange(option.id);
                          }
                        }}
                      />
                    );
                  })}
                </div>
              )}
            />
          </motion.section>
        </AnimatePresence>

        <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-ivory via-ivory to-ivory/0 pt-6 pb-6">
          {isLast && complete.isError && (
            <p role="alert" className="mb-3 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] leading-snug text-danger">
              Speichern hat nicht geklappt. Deine Antworten sind noch da – tippe einfach noch einmal.
            </p>
          )}
          <Button type="submit" block disabled={!answered || complete.isPending}>
            {complete.isPending ? "Wir lernen deinen Geschmack kennen …" : isLast ? (editing ? "Änderungen speichern" : "Mein Profil erstellen") : "Weiter"}
            {!complete.isPending && <ArrowRight />}
          </Button>
        </div>
      </form>
    </main>
  );
}
