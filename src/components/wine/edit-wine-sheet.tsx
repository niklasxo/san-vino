import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { WINE_TYPE_LABEL } from "@/lib/taste-profile/describe";
import { wineEditSchema, type WineEditForm } from "@/lib/validation/wine-edit";
import type { ExtractedWine } from "@/types/domain";

const TYPES = ["red", "white", "rose", "sparkling", "sweet", "unknown"] as const;

/** Erkannte Angaben korrigieren. Geänderte Felder gelten anschließend als vom Nutzer bestätigt. */
export function EditWineSheet({
  open,
  onOpenChange,
  wine,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  wine: ExtractedWine;
  onSave: (next: ExtractedWine, identityChanged: boolean) => Promise<void>;
  saving: boolean;
}) {
  const form = useForm<WineEditForm>({
    resolver: zodResolver(wineEditSchema),
    values: {
      name: wine.name ?? "",
      producer: wine.producer ?? "",
      vintage: wine.vintage ? String(wine.vintage) : "",
      grapes: wine.grape_varieties.join(", "),
      region: wine.region ?? "",
      country: wine.country ?? "",
      wine_type: wine.wine_type,
    },
  });
  const type = form.watch("wine_type");
  const { errors } = form.formState;

  const submit = form.handleSubmit(async (v) => {
    const grapes = v.grapes.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8);
    const next: ExtractedWine = {
      ...wine,
      name: v.name,
      producer: v.producer || null,
      vintage: v.vintage ? Number(v.vintage) : null,
      grape_varieties: grapes,
      region: v.region || null,
      country: v.country || null,
      wine_type: v.wine_type,
      identification_confidence: Math.max(wine.identification_confidence, 0.8),
      evidence: {
        name: "visible",
        producer: v.producer ? "visible" : "unknown",
        vintage: v.vintage ? "visible" : "unknown",
        country: v.country ? "visible" : "unknown",
        region: v.region ? "visible" : "unknown",
        grape_varieties: grapes.length ? "visible" : "unknown",
        wine_type: v.wine_type === "unknown" ? "unknown" : "visible",
      },
    };
    const identityChanged =
      v.name !== (wine.name ?? "") || grapes.join(",") !== wine.grape_varieties.join(",") || v.wine_type !== wine.wine_type || (v.region || null) !== wine.region;
    await onSave(next, identityChanged);
  });

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Angaben korrigieren"
      description="Je genauer die Angaben, desto besser unsere Einschätzung."
      footer={
        <Button block onClick={submit} disabled={saving}>
          {saving ? "Wird aktualisiert …" : "Speichern & neu einschätzen"}
        </Button>
      }
    >
      <form onSubmit={submit} className="space-y-4 pb-2">
        <div>
          <Label htmlFor="w-name">Name des Weins</Label>
          <Input id="w-name" {...form.register("name")} aria-invalid={Boolean(errors.name)} />
          {errors.name && <p className="mt-1 text-[13px] text-danger">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="w-producer">Weingut / Produzent</Label>
          <Input id="w-producer" {...form.register("producer")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="w-vintage">Jahrgang</Label>
            <Input id="w-vintage" inputMode="numeric" placeholder="z. B. 2021" {...form.register("vintage")} />
            {errors.vintage && <p className="mt-1 text-[13px] text-danger">{errors.vintage.message}</p>}
          </div>
          <div>
            <Label htmlFor="w-grapes">Rebsorte(n)</Label>
            <Input id="w-grapes" placeholder="z. B. Merlot" {...form.register("grapes")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="w-region">Region</Label>
            <Input id="w-region" {...form.register("region")} />
          </div>
          <div>
            <Label htmlFor="w-country">Land</Label>
            <Input id="w-country" {...form.register("country")} />
          </div>
        </div>
        <div>
          <Label>Weinart</Label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Chip key={t} selected={type === t} onClick={() => form.setValue("wine_type", t, { shouldDirty: true })}>
                {t === "unknown" ? "Weiß ich nicht" : WINE_TYPE_LABEL[t]}
              </Chip>
            ))}
          </div>
        </div>
      </form>
    </Sheet>
  );
}
