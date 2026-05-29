import { normalizeBasketballState } from "../stores/basketballScoreboard";
import type { BasketballScoreboardState } from "../types/basketballScoreboard";
import { isBasketballScoreboardState } from "../types/basketballScoreboard";
import { registerMatchRecord } from "./liveMatchesService";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";

export function isBasketballRemoteSyncEnabled(): boolean {
  return isSupabaseConfigured();
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
  const supabase = getSupabase();
  if (!supabase || !matchId) return null;

  const { data, error } = await supabase
    .from("matches")
    .select("state")
    .eq("id", matchId)
    .maybeSingle();

  if (error) {
    console.error("[basketballMatchSync] fetch error", error.message);
    return null;
  }

  const raw = data?.state;
  if (!isBasketballScoreboardState(raw)) return null;
  return normalizeBasketballState(raw);
}
