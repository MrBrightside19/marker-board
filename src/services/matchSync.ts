import { normalizeScoreboardState } from "../stores/scoreboard";
import type { ScoreboardState } from "../types/scoreboard";
import { registerMatchRecord } from "./liveMatchesService";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";

export function isRemoteSyncEnabled(): boolean {
  return isSupabaseConfigured();
}

export async function publishMatchState(
  matchId: string,
  state: ScoreboardState,
  options?: {
    organizerId?: string | null;
    title?: string;
    tournamentId?: string | null;
    isLive?: boolean;
  }
): Promise<void> {
  if (!matchId) return;

  const record: Parameters<typeof registerMatchRecord>[0] = {
    matchId,
    state,
    organizerId: options?.organizerId ?? null,
    title: options?.title,
  };
  if (options?.tournamentId !== undefined) {
    record.tournamentId = options.tournamentId;
  }
  if (options?.isLive !== undefined) {
    record.isLive = options.isLive;
  }

  const ok = await registerMatchRecord(record);
  if (!ok) {
    throw new Error("No se pudo guardar el marcador en el servidor");
  }
}

export async function fetchMatchState(matchId: string): Promise<ScoreboardState | null> {
  const supabase = getSupabase();
  if (!supabase || !matchId) return null;

  const { data, error } = await supabase
    .from("matches")
    .select("state")
    .eq("id", matchId)
    .maybeSingle();

  if (error) {
    console.error("[matchSync] fetch error", error.message);
    return null;
  }

  const raw = data?.state as ScoreboardState | undefined;
  return raw ? normalizeScoreboardState(raw) : null;
}
