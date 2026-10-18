import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase/client";
import { analyzeResponseSchema, explanationResponseSchema, parseScanItem } from "@/lib/validation/api";
import type { AiService } from "./ai-service";

async function invoke<T>(name: string, body: Record<string, unknown>, parse: (data: unknown) => T): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      let code = "unknown";
      try {
        const payload = await res.json();
        code = payload?.error?.code ?? (res.status === 404 ? "function_missing" : "unknown");
      } catch {
        if (res.status === 404) code = "function_missing";
      }
      throw new AppError(code, `${name}: HTTP ${res.status}`);
    }
    if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
      throw new AppError(navigator.onLine ? "unreachable" : "offline", error.message);
    }
    throw new AppError("unknown", String(error));
  }
  try {
    return parse(data);
  } catch {
    throw new AppError("ai_invalid_response", `${name}: unexpected response`);
  }
}

export class SupabaseAiService implements AiService {
  readonly kind = "supabase" as const;

  analyzeScan(scanId: string) {
    return invoke("analyze-wine-image", { scan_id: scanId }, (d) => analyzeResponseSchema.parse(d));
  }

  async explainScanItem(scanItemId: string, opts?: { force?: boolean }) {
    const res = await invoke("generate-wine-explanation", { scan_item_id: scanItemId, force: opts?.force }, (d) =>
      explanationResponseSchema.parse(d),
    );
    return res.explanation;
  }

  reestimateScanItem(scanItemId: string) {
    return invoke("analyze-wine-image", { mode: "reestimate", scan_item_id: scanItemId }, (d) => parseScanItem((d as { item: unknown }).item));
  }
}
