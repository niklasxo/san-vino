/** Bottom Sheet (iOS-artig) auf Basis von vaul – Standard der shadcn "Drawer"-Komponente. */
import * as React from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Sheet({ open, onOpenChange, title, description, children, footer }: SheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-burgundy-deep/35 backdrop-blur-[2px]" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-xl flex-col rounded-t-[2rem] bg-ivory outline-none"
          aria-describedby={description ? undefined : undefined}
        >
          <div className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-line" />
          <div className="px-6 pt-5 pb-2">
            <Drawer.Title className="font-serif text-2xl text-charcoal">{title}</Drawer.Title>
            {description ? (
              <Drawer.Description className="mt-1.5 text-[15px] text-taupe">{description}</Drawer.Description>
            ) : (
              <Drawer.Description className="sr-only">{title}</Drawer.Description>
            )}
          </div>
          <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-4">{children}</div>
          {footer ? <div className={cn("border-t border-line/70 px-6 pt-4 pb-safe")}><div className="pb-4">{footer}</div></div> : <div className="pb-safe" />}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
