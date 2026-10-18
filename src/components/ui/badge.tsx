import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium leading-none [&_svg]:size-3.5", {
  variants: {
    tone: {
      neutral: "bg-cream text-taupe",
      burgundy: "bg-burgundy/8 text-burgundy",
      gold: "bg-gold/20 text-burgundy-deep",
      success: "bg-success/12 text-success",
      outline: "border border-line text-taupe",
      dark: "bg-burgundy-deep/80 text-ivory backdrop-blur",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
