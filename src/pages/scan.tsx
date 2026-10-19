import { BookOpen, Camera, ImagePlus, Lightbulb, Plus, RotateCcw, ScanLine, Wine, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Page, PageHeading } from "@/components/layout/page";
import { AnalyzingView } from "@/components/scanner/analyzing";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/chip";
import { useScanWorkflow } from "@/hooks/use-scan-workflow";
import { describeError } from "@/lib/errors";
import { ACCEPTED_TYPES, ImageError, type PreparedImage, prepareImage } from "@/lib/image/prepare";
import { warmUpFunction } from "@/lib/supabase/warm-up";
import { cn } from "@/lib/utils";
import type { ScanType } from "@/types/domain";

const MAX_PAGES = 6;

const IMAGE_ERRORS: Record<ImageError["reason"], string> = {
  type: "Dieses Dateiformat können wir nicht lesen. Bitte nutze JPEG, PNG oder WebP.",
  too_large: "Das Foto ist zu groß (max. 30 MB).",
  decode: "Das Foto konnte nicht geöffnet werden. Versuch es mit einem anderen Bild.",
};

export default function ScanPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [type, setType] = React.useState<ScanType>(params.get("typ") === "karte" ? "menu" : "bottle");
  const [images, setImages] = React.useState<PreparedImage[]>([]);
  const [preparing, setPreparing] = React.useState(false);
  const [emptyResult, setEmptyResult] = React.useState<{ status: string; note?: string | null } | null>(null);
  const cameraInput = React.useRef<HTMLInputElement>(null);
  const galleryInput = React.useRef<HTMLInputElement>(null);
  const flow = useScanWorkflow();

  React.useEffect(() => () => images.forEach((i) => URL.revokeObjectURL(i.previewUrl)), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fotos schon während der Vorschau hochladen → nach „Analysieren“ startet sofort die KI.
  const { preload, discard } = flow;
  React.useEffect(() => preload(images.map((i) => i.blob)), [images, preload]);
  // Analyse-Function schon beim Öffnen und bei jedem neuen Foto aufwecken (Kaltstart vermeiden).
  React.useEffect(() => warmUpFunction("analyze-wine-image"), [images]);
  // Während die Analyse läuft, schon die Erklärungs-Function wecken – die wird direkt danach gebraucht.
  React.useEffect(() => {
    if (flow.phase === "analyzing") warmUpFunction("generate-wine-explanation");
  }, [flow.phase]);
  React.useEffect(() => discard, [discard]);

  const openCamera = (t: ScanType) => {
    setType(t);
    cameraInput.current?.click();
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setPreparing(true);
    setEmptyResult(null);
    flow.reset();
    try {
      const room = type === "menu" ? MAX_PAGES - images.length : 1;
      const prepared: PreparedImage[] = [];
      for (const file of Array.from(files).slice(0, Math.max(1, room))) prepared.push(await prepareImage(file));
      setImages((prev) => {
        if (type === "bottle") {
          prev.forEach((i) => URL.revokeObjectURL(i.previewUrl));
          return prepared;
        }
        return [...prev, ...prepared].slice(0, MAX_PAGES);
      });
    } catch (err) {
      toast.error("Foto konnte nicht verwendet werden", { description: err instanceof ImageError ? IMAGE_ERRORS[err.reason] : undefined });
    } finally {
      setPreparing(false);
      if (cameraInput.current) cameraInput.current.value = "";
      if (galleryInput.current) galleryInput.current.value = "";
    }
  };

  const removeImage = (idx: number) =>
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      flow.reset();
      return prev.filter((_, i) => i !== idx);
    });

  const startOver = () => {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    flow.discard();
    setImages([]);
    setEmptyResult(null);
    flow.reset();
  };

  const analyze = async () => {
    const signature = `${type}:${images.map((i) => i.previewUrl).join("|")}`;
    const result = await flow.run(type, images.map((i) => i.blob), signature);
    if (!result) return;
    if (result.scan.status !== "analyzed" || result.items.length === 0) {
      setEmptyResult({ status: result.scan.status, note: result.scan.analysis_meta?.notes_for_user });
      return;
    }
    if (result.scan.scan_type === "bottle" && result.items.length === 1) {
      navigate(`/scan/${result.scan.id}/wein/${result.items[0].id}`, { replace: false });
    } else {
      navigate(`/scan/${result.scan.id}`);
    }
  };

  const busy = flow.phase === "uploading" || flow.phase === "analyzing" || flow.phase === "matching";

  return (
    <Page>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFiles(e.target.files)} aria-hidden tabIndex={-1} />
      <input
        ref={galleryInput}
        type="file"
        accept={[...ACCEPTED_TYPES, "image/*"].join(",")}
        multiple={type === "menu"}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
        aria-hidden
        tabIndex={-1}
      />

      <AnimatePresence mode="wait">
        {busy ? (
          <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnalyzingView previews={images.map((i) => i.previewUrl)} phase={flow.phase} slow={flow.slow} isMenu={type === "menu"} />
          </motion.div>
        ) : images.length === 0 ? (
          <motion.div key="choose" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <PageHeading eyebrow="Scannen" title="Was möchtest du fotografieren?" subtitle="Wir lesen den Wein und sagen dir, wie gut er zu deinem Geschmack passt." />
            <div className="space-y-3">
              <ScanOption
                icon={<Wine />}
                title="Flasche scannen"
                text="Fotografiere das Etikett einer Weinflasche."
                onClick={() => openCamera("bottle")}
                primary
              />
              <ScanOption icon={<BookOpen />} title="Weinkarte scannen" text="Wir finden deinen Favoriten auf der Karte – auch mehrseitig." onClick={() => openCamera("menu")} />
            </div>
            <button
              onClick={() => galleryInput.current?.click()}
              disabled={preparing}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-[15px] font-medium text-burgundy transition hover:bg-cream active:scale-[0.98]"
            >
              <ImagePlus className="size-5" /> {preparing ? "Foto wird vorbereitet …" : "Foto aus Galerie auswählen"}
            </button>
            <Tips />
          </motion.div>
        ) : (
          <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <PageHeading
              eyebrow={type === "menu" ? "Weinkarte" : "Flasche"}
              title={emptyResult ? emptyTitle(emptyResult.status) : "Sieht gut aus?"}
              subtitle={
                emptyResult
                  ? (emptyResult.note ?? emptyText(emptyResult.status, type))
                  : type === "menu"
                    ? "Mehrere Seiten? Füge einfach weitere Fotos hinzu."
                    : "Achte darauf, dass das Etikett gut lesbar ist."
              }
            />

            <div className="mb-5">
              <Segmented
                layoutId="scan-type"
                value={type}
                onChange={(t) => {
                  setType(t);
                  flow.reset();
                  if (t === "bottle" && images.length > 1) setImages((prev) => prev.slice(0, 1));
                }}
                options={[
                  { value: "bottle", label: "Flasche" },
                  { value: "menu", label: "Weinkarte" },
                ]}
              />
            </div>

            <div className={cn("grid gap-3", images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {images.map((img, i) => (
                <motion.div key={img.previewUrl} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-[1.5rem] bg-cream shadow-[var(--shadow-soft)]">
                  <img src={img.previewUrl} alt={`Foto ${i + 1}`} className={cn("w-full object-cover", images.length > 1 ? "aspect-[3/4]" : "max-h-[52dvh]")} />
                  <button onClick={() => removeImage(i)} className="absolute top-2.5 right-2.5 grid size-9 place-items-center rounded-full bg-charcoal/60 text-ivory backdrop-blur transition hover:bg-charcoal/80" aria-label={`Foto ${i + 1} entfernen`}>
                    <X className="size-4" />
                  </button>
                  {images.length > 1 && <span className="absolute bottom-2.5 left-2.5 rounded-full bg-charcoal/60 px-2.5 py-1 text-[12px] text-ivory backdrop-blur">Seite {i + 1}</span>}
                </motion.div>
              ))}
              {type === "menu" && images.length < MAX_PAGES && (
                <button
                  onClick={() => cameraInput.current?.click()}
                  className={cn("flex flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-dashed border-line text-taupe transition hover:bg-cream", images.length > 1 ? "aspect-[3/4]" : "h-24")}
                >
                  <Plus className="size-5" /> <span className="text-[14px]">Weitere Seite</span>
                </button>
              )}
            </div>

            {flow.phase === "error" && (
              <div className="mt-5 rounded-[1.5rem] bg-cream p-4" role="alert">
                <p className="font-medium text-charcoal">{describeError(flow.error).title}</p>
                <p className="mt-1 text-[14px] text-taupe">{describeError(flow.error).text}</p>
              </div>
            )}

            <div className="mt-6 space-y-2">
              {emptyResult ? (
                <Button block onClick={() => { startOver(); cameraInput.current?.click(); }}>
                  <Camera /> Neues Foto aufnehmen
                </Button>
              ) : (
                <Button block onClick={analyze} disabled={preparing}>
                  {flow.phase === "error" ? <><RotateCcw /> Erneut versuchen</> : <><ScanLine /> {type === "menu" ? "Weinkarte analysieren" : "Wein analysieren"}</>}
                </Button>
              )}
              <Button variant="ghost" block onClick={startOver}>
                Abbrechen
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}

function emptyTitle(status: string) {
  return status === "unreadable" ? "Das Foto konnten wir nicht lesen." : "Hier haben wir keinen Wein gefunden.";
}
function emptyText(status: string, type: ScanType) {
  if (status === "unreadable") return "Versuch es mit mehr Licht und ruhiger Hand – und nah genug am Text.";
  return type === "menu" ? "Auf diesem Foto konnten wir keine Weine erkennen. Ist es die Weinseite der Karte?" : "Fotografiere am besten das Vorderetikett der Flasche.";
}

function ScanOption({ icon, title, text, onClick, primary }: { icon: React.ReactNode; title: string; text: string; onClick: () => void; primary?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-[1.75rem] p-5 text-left transition",
        primary ? "grain bg-gradient-to-br from-burgundy to-burgundy-deep text-ivory shadow-[var(--shadow-glow)]" : "border border-line bg-white/60 text-charcoal shadow-[var(--shadow-soft)] hover:bg-white",
      )}
    >
      <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl [&_svg]:size-6", primary ? "bg-ivory/10 text-gold ring-1 ring-gold/30" : "bg-cream text-burgundy")}>{icon}</span>
      <span className="flex-1">
        <span className="block font-serif text-[21px] leading-tight">{title}</span>
        <span className={cn("mt-1 block text-[14px] leading-snug", primary ? "text-ivory/75" : "text-taupe")}>{text}</span>
      </span>
      <Camera className={cn("size-5 shrink-0", primary ? "text-ivory/70" : "text-taupe")} />
    </motion.button>
  );
}

function Tips() {
  return (
    <div className="mt-8 rounded-[1.5rem] bg-cream/60 p-5">
      <p className="flex items-center gap-2 text-[14px] font-medium text-charcoal">
        <Lightbulb className="size-4 text-gold" /> So klappt es am besten
      </p>
      <ul className="mt-2.5 space-y-1.5 text-[14px] leading-relaxed text-taupe">
        <li>• Gutes Licht, ohne Blitz-Reflexe</li>
        <li>• Etikett bzw. Karte gerade und formatfüllend</li>
        <li>• Bei Weinkarten: lieber eine Seite pro Foto</li>
      </ul>
      <p className="mt-3 text-[12px] leading-relaxed text-taupe">
        Deine Fotos werden ohne Standortdaten privat gespeichert und nur zur Analyse an unseren KI-Dienst übermittelt.
      </p>
    </div>
  );
}
