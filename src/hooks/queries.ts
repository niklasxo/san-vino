/** TanStack-Query-Hooks: die einzige Stelle, an der UI auf Daten zugreift. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { computeMatch } from "@/lib/matching";
import { describeError } from "@/lib/errors";
import { ai, repository } from "@/services";
import { completeOnboarding, relearnProfile } from "@/services/taste-service";
import type { RatingInput, SavedWine, TasteAnswers, WineSnapshot } from "@/types/domain";

export const keys = {
  profile: ["profile"] as const,
  savedWines: ["saved-wines"] as const,
  savedWine: (id: string) => ["saved-wines", id] as const,
  savedByItem: (itemId: string) => ["saved-wines", "by-item", itemId] as const,
  scan: (id: string) => ["scan", id] as const,
  recentScans: ["recent-scans"] as const,
  explanation: (itemId: string, version: number | undefined) => ["explanation", itemId, version] as const,
};

export function useProfileState() {
  return useQuery({ queryKey: keys.profile, queryFn: () => repository.getProfileState(), staleTime: 60_000 });
}

/** Das aktuell gültige (gelernte) Geschmacksprofil. */
export function useTasteProfile() {
  const q = useProfileState();
  return { ...q, profile: q.data?.taste?.learned ?? null, version: q.data?.taste?.version };
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answers: TasteAnswers) => completeOnboarding(repository, answers),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.profile }),
  });
}

export function useResetProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => repository.resetTasteProfile(),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.profile }),
  });
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
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: keys.savedWines });
      const prev = qc.getQueryData<SavedWine[]>(keys.savedWines);
      qc.setQueryData<SavedWine[]>(keys.savedWines, (list) => list?.map((w) => (w.id === id ? { ...w, ...patch } : w)));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.savedWines, ctx.prev);
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
      // Bewertungen dieses Weins fließen nicht mehr ins Profil ein.
      const res = await relearnProfile(repository);
      if (res) await qc.invalidateQueries({ queryKey: keys.profile });
    },
    onError: (err) => toast.error(describeError(err).title),
  });
}

export function useRateWine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userWineId, input }: { userWineId: string; input: RatingInput }) => {
      await repository.upsertRating(userWineId, input);
      return relearnProfile(repository);
    },
    onSuccess: async () => {
      await Promise.all([invalidateWines(qc), qc.invalidateQueries({ queryKey: keys.profile })]);
    },
  });
}

/** Match eines gespeicherten Weins zum aktuellen Profil. */
export function useMatchFor(snapshot: WineSnapshot | undefined) {
  const { profile } = useTasteProfile();
  return snapshot && profile ? computeMatch(profile, snapshot) : null;
}
