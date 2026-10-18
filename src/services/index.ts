/** Wählt die passende Implementierung: echtes Supabase-Backend oder klar gekennzeichneter Demo-Modus. */
import { config } from "@/lib/config";
import type { AiService } from "./ai-service";
import { DemoAiService, DemoRepository } from "./demo";
import type { VinoRepository } from "./repository";
import { SupabaseAiService } from "./supabase-ai-service";
import { SupabaseRepository } from "./supabase-repository";

export const repository: VinoRepository = config.demoMode ? new DemoRepository() : new SupabaseRepository();
export const ai: AiService = config.demoMode ? new DemoAiService() : new SupabaseAiService();
export const isDemo = config.demoMode;
export type { AiService, VinoRepository };
