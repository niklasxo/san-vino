import type { ExtractedWine } from "@shared/wine-schema.ts";
import { formatPrice } from "@/lib/utils";

const UNIT: Record<string, string> = { glass: "pro Glas", bottle: "pro Flasche", carafe: "pro Karaffe" };

export function priceLabel(wine: ExtractedWine, price = wine.price, currency = wine.currency): { text: string; uncertain: boolean } | null {
  if (price == null || wine.price_assignment === "none") return null;
  const formatted = formatPrice(price, currency);
  if (!formatted) return null;
  const unit = wine.price_unit ? UNIT[wine.price_unit] : undefined;
  return { text: unit ? `${formatted} ${unit}` : formatted, uncertain: wine.price_assignment === "uncertain" };
}
