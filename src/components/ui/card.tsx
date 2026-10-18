import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[1.75rem] bg-cream/80 p-5 shadow-[var(--shadow-soft)]", className)} {...props} />;
}

export function SectionTitle({ title, action, className }: { title: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-4", className)}>
      <h2 className="font-serif text-[22px] leading-tight text-charcoal">{title}</h2>
      {action}
    </div>
  );
}
