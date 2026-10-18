import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      offset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !border-line !bg-ivory !text-charcoal !shadow-[var(--shadow-lift)] !font-sans",
          description: "!text-taupe",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-danger",
        },
      }}
    />
  );
}
