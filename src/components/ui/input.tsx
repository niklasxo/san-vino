import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-12 w-full rounded-2xl border border-line bg-white/70 px-4 text-[16px] text-charcoal placeholder:text-taupe/70 transition focus:border-gold focus:bg-white focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-gold/15",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-24 w-full resize-none rounded-2xl border border-line bg-white/70 px-4 py-3 text-[16px] text-charcoal placeholder:text-taupe/70 focus:border-gold focus:bg-white focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-gold/15",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-[13px] font-medium text-taupe", className)} {...props} />;
}
