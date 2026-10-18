import { AlertDialog } from "radix-ui";
import * as React from "react";
import { Button } from "./button";

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({ trigger, title, description, confirmLabel, cancelLabel = "Abbrechen", destructive, onConfirm }: ConfirmDialogProps) {
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-burgundy-deep/40 backdrop-blur-[2px] data-[state=open]:animate-in" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] bg-ivory p-6 shadow-[var(--shadow-lift)]">
          <AlertDialog.Title className="font-serif text-[22px] leading-snug text-charcoal">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-3 space-y-2 text-[15px] leading-relaxed text-taupe">{description}</div>
          </AlertDialog.Description>
          <div className="mt-6 flex flex-col gap-2.5">
            <Button
              variant={destructive ? "danger" : "primary"}
              size="md"
              block
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Einen Moment …" : confirmLabel}
            </Button>
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" size="md" block disabled={busy}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
