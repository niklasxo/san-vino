import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | null | undefined, currency: string | null | undefined): string | null {
  if (price == null) return null;
  try {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: currency ?? "EUR" }).format(price);
  } catch {
    return `${price.toFixed(2).replace(".", ",")} ${currency ?? ""}`.trim();
  }
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays <= 0) return "Heute";
  if (diffDays === 1) return "Gestern";
  if (diffDays < 7) return `Vor ${diffDays} Tagen`;
  return date.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}
