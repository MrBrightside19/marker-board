import { normalizeBasketballState } from "../stores/basketballScoreboard";
import type { BasketballScoreboardState } from "../types/basketballScoreboard";
import { isBasketballScoreboardState } from "../types/basketballScoreboard";
import { registerMatchRecord } from "./liveMatchesService";
import { isSupabaseRestConfigured, restGetMatchRow } from "./supabaseRest";

export function isBasketballRemoteSyncEnabled(): boolean {
  return isSupabaseRestConfigured();
}

export async function publishBasketballMatchState(
  matchId: string,
  state: BasketballScoreboardState,
  options?: {
    organizerId?: string | null;
    title?: string;
    isLive?: boolean;
  }
): Promise<void> {
  if (!matchId) return;

  const ok = await registerMatchRecord({
    matchId,
    state,
    organizerId: options?.organizerId ?? null,
    title: options?.title ?? `${state.localTeam} vs ${state.visitTeam}`,
    isLive: options?.isLive ?? true,
  });

  if (!ok) {
    throw new Error("No se pudo guardar el marcador de básquet en el servidor");
  }
}

export async function fetchBasketballMatchState(
  matchId: string
): Promise<BasketballScoreboardState | null> {
  if (!matchId || !isSupabaseRestConfigured()) return null;

  try {
    const row = await restGetMatchRow(matchId);
    const raw = row?.state;
    if (!isBasketballScoreboardState(raw)) return null;
    return normalizeBasketballState(raw);
  } catch (error) {
    console.error("[basketballMatchSync] fetch error", error);
    return null;
  }
}
