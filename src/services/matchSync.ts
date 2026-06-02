import { normalizeScoreboardState } from "../stores/scoreboard";
import type { ScoreboardState } from "../types/scoreboard";
import { registerMatchRecord } from "./liveMatchesService";
import { isSupabaseRestConfigured, restGetMatchRow } from "./supabaseRest";

export type MatchRemoteSnapshot = {
  state: ScoreboardState;
  serverUpdatedAt: string;
};

export function isRemoteSyncEnabled(): boolean {
  return isSupabaseRestConfigured();
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
    title: options?.title,
  };
  if (options?.isLive !== undefined) {
    record.isLive = options.isLive;
  }
  if (options?.organizerId) {
    record.organizerId = options.organizerId;
  }
  if (options?.tournamentId !== undefined) {
    record.tournamentId = options.tournamentId;
  }

  const ok = await registerMatchRecord(record);
  if (!ok) {
    throw new Error("No se pudo guardar el marcador en el servidor");
  }
}

/** Lee el marcador por REST (GET explícito, aparece en Network). */
export async function fetchMatchState(matchId: string): Promise<MatchRemoteSnapshot | null> {
  if (!matchId) return null;
  if (!isSupabaseRestConfigured()) {
    throw new Error("Supabase no configurado (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY)");
  }

  const row = await restGetMatchRow(matchId);
  if (!row?.state) {
    return null;
  }

  const raw = row.state as ScoreboardState;
  const normalized = normalizeScoreboardState(raw);
  return {
    state: normalized,
    serverUpdatedAt: row.updated_at ?? normalized.updatedAt ?? "",
  };
}

export async function fetchMatchStateLegacy(matchId: string): Promise<ScoreboardState | null> {
  const snapshot = await fetchMatchState(matchId);
  return snapshot?.state ?? null;
}
