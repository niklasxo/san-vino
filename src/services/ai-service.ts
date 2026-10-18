import type { ScanItem, ScanWithItems, StoredExplanation } from "@/types/domain";

/** KI-Dienste. Implementierungen: Supabase Edge Functions (echt) oder Demo-Fixtures. */
export interface AiService {
  readonly kind: "supabase" | "demo";
  /** Startet (oder holt gecacht) die Bildanalyse eines hochgeladenen Scans. */
  analyzeScan(scanId: string): Promise<ScanWithItems & { cached: boolean }>;
  /** Persönliche Erklärung zu einem erkannten Wein (Score wird serverseitig berechnet). */
  explainScanItem(scanItemId: string, opts?: { force?: boolean }): Promise<StoredExplanation>;
  /** Nach einer Korrektur: Geschmacksmerkmale anhand der korrigierten Fakten neu einschätzen. */
  reestimateScanItem(scanItemId: string): Promise<ScanItem>;
}
