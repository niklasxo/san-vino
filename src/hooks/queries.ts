/** TanStack-Query-Hooks: die einzige Stelle, an der UI auf Daten zugreift. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { computeMatch } from "@/lib/matching";
import { isAuthLost, recoverSession } from "@/lib/auth/session";
import { describeError } from "@/lib/errors";
import { ai, repository } from "@/services";
import { completeOnboarding, relearnProfile } from "@/services/taste-service";
import type { SwipeAnswer, SwipeAnswers } from "@/lib/taste-profile/swipes";
import type { RatingInput, SavedWine, TasteAnswers, WineSnapshot } from "@/types/domain";

export const keys = {
  profile: ["profile"] as const,
  savedWines: ["saved-wines"] as const,
  savedWine: (id: string) => ["saved-wines", id] as const,
  savedByItem: (itemId: string) => ["saved-wines", "by-item", itemId] as const,
  scan: (id: string) => ["scan", id] as const,
  recentScans: ["recent-scans"] as const,
  explanation: (itemId: string, version: number | undefined) => ["explanation", itemId, version] as const,
  swipes: ["taste-swipes"] as const,
};

/**
 * Profil-Neuberechnungen nacheinander ausführen: Zwei schnelle Bewertungen hintereinander dürfen sich nicht
 * gegenseitig überschreiben (die spätere Berechnung kennt immer alle bisherigen Bewertungen).
 */
let relearnChain: Promise<unknown> = Promise.resolve();
function queueRelearn(qc: ReturnType<typeof useQueryClient>) {
  const run = relearnChain.then(async () => {
    const res = await relearnProfile(repository);
    if (res) await qc.invalidateQueries({ queryKey: keys.profile });
    return res;
  });
  relearnChain = run.catch(() => undefined);
  return run;
}

export function useProfileState({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: keys.profile, queryFn: () => repository.getProfileState(), staleTime: 60_000, enabled });
}

/** Das aktuell gültige (gelernte) Geschmacksprofil. */
export function useTasteProfile() {
  const q = useProfileState();
  return { ...q, profile: q.data?.taste?.learned ?? null, version: q.data?.taste?.version };
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (answers: TasteAnswers) => {
      try {
        return await completeOnboarding(repository, answers);
      } catch (err) {
        // Anmeldung im Browser verloren (z. B. strenge Safari-Einstellungen) → reparieren und einmal neu versuchen.
        if (repository.kind === "supabase" && isAuthLost(err) && (await recoverSession())) return completeOnboarding(repository, answers);
        throw err;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.profile }),
  });
}

export function useResetProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => repository.resetTasteProfile(),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: keys.profile }), qc.invalidateQueries({ queryKey: keys.swipes })]),
  });
}

export function useSwipes() {
  return useQuery({ queryKey: keys.swipes, queryFn: () => repository.listSwipes(), staleTime: Infinity });
}

/**
 * Swipe-Runde: jede Antwort wird sofort gespeichert; das Profil wird gebündelt neu berechnet
 * (alle paar Antworten und beim Verlassen) – erst wenn alle Speicherungen durch sind.
 */
export function useSwipeSession() {
  const qc = useQueryClient();
  const pending = React.useRef<Promise<unknown>[]>([]);
  const dirty = React.useRef(0);

  const flush = React.useCallback(async () => {
    if (dirty.current === 0) return;
    dirty.current = 0;
    const waiting = pending.current;
    pending.current = [];
    await Promise.allSettled(waiting);
    await queueRelearn(qc);
  }, [qc]);

  const answer = React.useCallback(
    (key: string, value: SwipeAnswer) => {
      qc.setQueryData<SwipeAnswers>(keys.swipes, (prev) => ({ ...prev, [key]: value }));
      const save = repository.saveSwipe(key, value).catch((err) => {
        toast.error(describeError(err).title);
        void qc.invalidateQueries({ queryKey: keys.swipes });
      });
      pending.current.push(save);
      dirty.current += 1;
      if (dirty.current >= 5) void flush().catch(() => undefined);
    },
    [qc, flush],
  );

  // Beim Verlassen der Seite offene Antworten ins Profil übernehmen.
  React.useEffect(() => () => void flush().catch(() => undefined), [flush]);

  return { answer, flush };
}

export function useDeleteAllData() {
  return useMutation({ mutationFn: () => repository.deleteAllData() });
}

export function useSavedWines() {
  return useQuery({ queryKey: keys.savedWines, queryFn: () => repository.listSavedWines() });
}

export function useSavedWine(id: string | undefined) {
  return useQuery({ queryKey: keys.savedWine(id ?? ""), queryFn: () => repository.getSavedWine(id!), enabled: Boolean(id) });
}

export function useSavedWineForItem(itemId: string | undefined) {
  return useQuery({ queryKey: keys.savedByItem(itemId ?? ""), queryFn: () => repository.findSavedWineByScanItem(itemId!), enabled: Boolean(itemId) });
}

export function useRecentScans(limit = 6) {
  return useQuery({ queryKey: keys.recentScans, queryFn: () => repository.listRecentScans(limit) });
}

export function useScan(scanId: string | undefined) {
  return useQuery({ queryKey: keys.scan(scanId ?? ""), queryFn: () => repository.getScan(scanId!), enabled: Boolean(scanId) });
}

/** Lädt die Erklärung im Hintergrund vor, damit die Detailseite sofort fertig ist. */
export function prefetchExplanation(qc: ReturnType<typeof useQueryClient>, itemId: string, version: number | undefined) {
  return qc.prefetchQuery({ queryKey: keys.explanation(itemId, version), queryFn: () => ai.explainScanItem(itemId), staleTime: Infinity });
}

export function useExplanation(itemId: string | undefined, version: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: keys.explanation(itemId ?? "", version),
    queryFn: () => ai.explainScanItem(itemId!),
    enabled: Boolean(itemId) && enabled,
    staleTime: Infinity,
    retry: 1,
  });
}

function invalidateWines(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: keys.savedWines });
}

export function useSaveWine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { scanItemId: string | null; wineId: string | null; snapshot: WineSnapshot; isFavorite?: boolean; hasTried?: boolean }) =>
      repository.saveWine(input),
    onSuccess: () => invalidateWines(qc),
    onError: (err) => toast.error(describeError(err).title),
  });
}

export function useUpdateSavedWine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { is_favorite?: boolean; has_tried?: boolean } }) => repository.updateSavedWine(id, patch),
    // Sofort anzeigen – auf der Liste UND auf den Detailseiten (Wein aus der Sammlung bzw. vom Scan).
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: keys.savedWines });
      const snapshot = qc.getQueriesData<SavedWine[] | SavedWine | null>({ queryKey: keys.savedWines });
      for (const [key, data] of snapshot) {
        if (Array.isArray(data)) qc.setQueryData(key, data.map((w) => (w.id === id ? { ...w, ...patch } : w)));
        else if (data?.id === id) qc.setQueryData(key, { ...data, ...patch });
      }
      return { snapshot };
    },
    onError: (err, _v, ctx) => {
      for (const [key, data] of ctx?.snapshot ?? []) qc.setQueryData(key, data);
      toast.error(describeError(err).title);
    },
    onSettled: () => invalidateWines(qc),
  });
}

export function useRemoveSavedWine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repository.removeSavedWine(id),
    onSuccess: async () => {
      await invalidateWines(qc);
      // Bewertungen dieses Weins fließen nicht mehr ins Profil ein (im Hintergrund).
      void queueRelearn(qc).catch(() => undefined);
    },
    onError: (err) => toast.error(describeError(err).title),
  });
}

export function useRateWine() {
  const qc = useQueryClient();
  return useMutation({
    // Sofort fertig, sobald die Bewertung gespeichert ist – das Profil lernt danach im Hintergrund.
    mutationFn: ({ userWineId, input }: { userWineId: string; input: RatingInput }) => repository.upsertRating(userWineId, input),
    onSuccess: async () => {
      void queueRelearn(qc).catch(() => undefined);
      await invalidateWines(qc);
    },
  });
}

/** Match eines gespeicherten Weins zum aktuellen Profil. */
export function useMatchFor(snapshot: WineSnapshot | undefined) {
  const { profile } = useTasteProfile();
  return snapshot && profile ? computeMatch(profile, snapshot) : null;
}
