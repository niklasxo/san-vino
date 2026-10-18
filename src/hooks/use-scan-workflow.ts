/**
 * Kompletter Scan-Ablauf: Scan anlegen → Fotos sicher hochladen → KI-Analyse.
 * Die angezeigten Phasen folgen ausschließlich echten Ereignissen (keine künstlichen Wartezeiten).
 */
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { keys } from "@/hooks/queries";
import { ai, repository } from "@/services";
import type { ScanType, ScanWithItems } from "@/types/domain";

export type ScanPhase = "idle" | "uploading" | "analyzing" | "matching" | "done" | "error";

export function useScanWorkflow() {
  const qc = useQueryClient();
  const [phase, setPhase] = React.useState<ScanPhase>("idle");
  const [error, setError] = React.useState<unknown>(null);
  const [slow, setSlow] = React.useState(false);
  // Bereits hochgeladener Scan → bei „Erneut versuchen“ nicht erneut hochladen.
  const uploaded = React.useRef<{ scanId: string; signature: string } | null>(null);

  React.useEffect(() => {
    if (phase !== "analyzing") return setSlow(false);
    const t = window.setTimeout(() => setSlow(true), 20_000);
    return () => window.clearTimeout(t);
  }, [phase]);

  const run = React.useCallback(
    async (type: ScanType, images: Blob[], signature: string): Promise<ScanWithItems | null> => {
      setError(null);
      try {
        let scanId = uploaded.current?.signature === signature ? uploaded.current.scanId : null;
        if (!scanId) {
          setPhase("uploading");
          const scan = await repository.createScan(type);
          await repository.uploadScanImages(scan.id, images);
          scanId = scan.id;
          uploaded.current = { scanId, signature };
        }
        setPhase("analyzing");
        const result = await ai.analyzeScan(scanId);
        setPhase("matching");
        qc.setQueryData(keys.scan(scanId), { scan: result.scan, items: result.items });
        await qc.invalidateQueries({ queryKey: keys.recentScans });
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

  return { phase, error, slow, run, reset };
}
