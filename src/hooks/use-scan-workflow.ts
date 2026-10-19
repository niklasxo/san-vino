/**
 * Kompletter Scan-Ablauf: Fotos sicher hochladen → Scan anlegen → KI-Analyse.
 * Tempo: Fotos werden schon während der Vorschau hochgeladen (preload), sodass nach „Analysieren“
 * nur noch der Datensatz angelegt und die KI gestartet wird.
 * Die angezeigten Phasen folgen ausschließlich echten Ereignissen (keine künstlichen Wartezeiten).
 */
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { keys } from "@/hooks/queries";
import { AppError } from "@/lib/errors";
import { ai, repository } from "@/services";
import type { ScanType, ScanWithItems } from "@/types/domain";

type Draft = { scanId: string; uploads: Map<Blob, Promise<string>> };

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const errorCode = (err: unknown) => (err instanceof AppError ? err.code : "");

/**
 * Analyse, die kurze Unterbrechungen übersteht: Auf dem iPhone bricht die Verbindung ab, sobald man
 * kurz die App wechselt oder der Bildschirm ausgeht – der Server rechnet aber weiter. Dann nicht mit
 * einem Fehler abbrechen, sondern das fertige Ergebnis abholen (der Server liefert es ohne neue KI-Kosten).
 */
function analyzeResilient(scanId: string): Promise<ScanWithItems> {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("visibilitychange", onVisible);
      fn();
    };
    // Zurück in der App: sofort nachsehen, ob das Ergebnis schon fertig ist.
    const onVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - startedAt < 3_000) return;
      ai.analyzeScan(scanId).then((r) => finish(() => resolve(r)), () => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);

    void (async () => {
      let dropped = 0;
      for (;;) {
        try {
          const r = await ai.analyzeScan(scanId);
          return finish(() => resolve(r));
        } catch (err) {
          const code = errorCode(err);
          const transient = code === "already_running" || (code === "unreachable" && dropped++ < 3);
          if (settled) return;
          if (!transient || Date.now() - startedAt > 170_000) return finish(() => reject(err));
          await sleep(code === "already_running" ? 2_000 : 1_500);
        }
      }
    })();
  });
}

export type ScanPhase = "idle" | "uploading" | "analyzing" | "matching" | "done" | "error";

export function useScanWorkflow() {
  const qc = useQueryClient();
  const [phase, setPhase] = React.useState<ScanPhase>("idle");
  const [error, setError] = React.useState<unknown>(null);
  const [slow, setSlow] = React.useState(false);
  // Bereits hochgeladener Scan → bei „Erneut versuchen“ nicht erneut hochladen.
  const uploaded = React.useRef<{ scanId: string; signature: string } | null>(null);
  // Vorab-Uploads des nächsten Scans (Scan-ID wird im Browser erzeugt).
  const draft = React.useRef<Draft | null>(null);

  const ensureDraft = (): Draft => (draft.current ??= { scanId: crypto.randomUUID(), uploads: new Map() });
  const startUpload = (d: Draft, blob: Blob) => {
    const p = repository.uploadScanImage(d.scanId, blob);
    p.catch(() => undefined); // Fehler zeigen wir erst, wenn wirklich analysiert wird (dann neuer Versuch)
    d.uploads.set(blob, p);
    return p;
  };

  /** Startet Uploads für neue Fotos und löscht die von entfernten Fotos. */
  const preload = React.useCallback((blobs: Blob[]) => {
    const d = ensureDraft();
    for (const blob of blobs) if (!d.uploads.has(blob)) startUpload(d, blob);
    for (const [blob, p] of d.uploads) {
      if (blobs.includes(blob)) continue;
      d.uploads.delete(blob);
      p.then((path) => repository.removeScanImages([path])).catch(() => undefined);
    }
  }, []);

  /** Nicht verwendete Vorab-Uploads verwerfen (z. B. Seite verlassen, „Neu starten“). */
  const discard = React.useCallback(() => {
    const d = draft.current;
    draft.current = null;
    if (!d) return;
    void Promise.allSettled(d.uploads.values()).then((results) => {
      const paths = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      return paths.length ? repository.removeScanImages(paths) : undefined;
    });
  }, []);

  React.useEffect(() => {
    if (phase !== "analyzing") return setSlow(false);
    const t = window.setTimeout(() => setSlow(true), 15_000);
    return () => window.clearTimeout(t);
  }, [phase]);

  const run = React.useCallback(
    async (type: ScanType, images: Blob[], signature: string): Promise<ScanWithItems | null> => {
      setError(null);
      try {
        let scanId = uploaded.current?.signature === signature ? uploaded.current.scanId : null;
        if (!scanId) {
          setPhase("uploading");
          const d = ensureDraft();
          const paths = await Promise.all(
            images.map((blob) => (d.uploads.get(blob) ?? startUpload(d, blob)).catch(() => startUpload(d, blob))),
          );
          await repository.createScan(type, d.scanId, paths);
          scanId = d.scanId;
          draft.current = null; // verbraucht – der nächste Scan bekommt eine neue ID
          uploaded.current = { scanId, signature };
        }
        setPhase("analyzing");
        const result = await analyzeResilient(scanId);
        setPhase("matching");
        qc.setQueryData(keys.scan(scanId), { scan: result.scan, items: result.items });
        void qc.invalidateQueries({ queryKey: keys.recentScans }); // im Hintergrund – Ergebnis sofort zeigen
        setPhase("done");
        return result;
      } catch (err) {
        setError(err);
        setPhase("error");
        return null;
      }
    },
    [qc],
  );

  const reset = React.useCallback(() => {
    uploaded.current = null;
    setPhase("idle");
    setError(null);
  }, []);

  return { phase, error, slow, run, reset, preload, discard };
}
