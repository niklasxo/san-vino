import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[transform,background-color,box-shadow,opacity] duration-200 ease-[var(--ease-out-soft)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-burgundy text-ivory shadow-[var(--shadow-glow)] hover:bg-burgundy-deep",
        secondary: "bg-cream text-burgundy hover:bg-cream-deep",
        outline: "border border-line bg-transparent text-charcoal hover:bg-cream/70",
        ghost: "bg-transparent text-burgundy hover:bg-cream/70",
        gold: "bg-gold text-burgundy-deep hover:brightness-95",
        light: "bg-ivory text-burgundy shadow-[var(--shadow-soft)] hover:bg-white",
        danger: "bg-danger text-ivory hover:brightness-95",
      },
      size: {
        lg: "h-14 px-7 text-[15px] [&_svg]:size-5",
        md: "h-12 px-5 text-[15px] [&_svg]:size-[18px]",
        sm: "h-10 px-4 text-sm [&_svg]:size-4",
        icon: "size-11 [&_svg]:size-5",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, block, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
});
Button.displayName = "Button";

export { buttonVariants };
