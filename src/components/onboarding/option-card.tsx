import { Check } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { QuestionOption } from "@/lib/taste-profile/questions";

export function OptionCard({
  option,
  selected,
  multi,
  onSelect,
  index,
}: {
  option: QuestionOption;
  selected: boolean;
  multi: boolean;
  onSelect: () => void;
  index: number;
}) {
  return (
    <motion.button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onSelect}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 + index * 0.045, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group flex min-h-[68px] w-full items-center gap-4 rounded-[1.4rem] border px-4 py-3 text-left transition-[background-color,border-color,box-shadow] duration-200",
        selected
          ? "border-burgundy bg-burgundy/[0.045] shadow-[0_0_0_1px_var(--color-burgundy)]"
          : "border-line bg-white/55 hover:border-gold/60 hover:bg-white",
      )}
    >
      {option.emoji && (
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full text-[21px] transition-colors",
            selected ? "bg-ivory" : "bg-cream",
          )}
          aria-hidden
        >
          {option.emoji}
        </span>
      )}
      <span className={cn("flex-1 text-[16px] leading-snug", selected ? "font-medium text-burgundy-deep" : "text-charcoal", !option.emoji && "py-2 font-serif text-[18px]")}>
        {option.label}
      </span>
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center border transition-all duration-200",
          multi ? "rounded-lg" : "rounded-full",
          selected ? "scale-100 border-burgundy bg-burgundy text-ivory" : "scale-90 border-line bg-transparent text-transparent",
        )}
        aria-hidden
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    </motion.button>
  );
}
