import { normalizeBasketballState } from "../stores/basketballScoreboard";
import { normalizeScoreboardState } from "../stores/scoreboard";
import type { ScoreboardState } from "../types/scoreboard";
import {
  isBasketballScoreboardState,
  type BasketballScoreboardState,
} from "../types/basketballScoreboard";
import { registerMatchRecord } from "./liveMatchesService";
import { isSupabaseRestConfigured, restGetMatchRow, restGetRows } from "./supabaseRest";

export type LiveScoreSnapshot = {
  goalLocal: number;
  goalVisit: number;
  timeGame: string;
  gamePeriod: number;
};

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
  /* El poll de Inicio/torneos públicos actualiza el listado; no avisar en cada heartbeat de Controles. */
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

function snapshotFromState(
  state: ScoreboardState | BasketballScoreboardState
): LiveScoreSnapshot {
  if (isBasketballScoreboardState(state)) {
    const normalized = normalizeBasketballState(state);
    return {
      goalLocal: normalized.pointsLocal,
      goalVisit: normalized.pointsVisit,
      timeGame: normalized.timeGame,
      gamePeriod: normalized.gamePeriod,
    };
  }
  const normalized = normalizeScoreboardState(state);
  return {
    goalLocal: normalized.goalLocal,
    goalVisit: normalized.goalVisit,
    timeGame: normalized.timeGame,
    gamePeriod: normalized.gamePeriod,
  };
}

/** Marcador en vivo desde tabla matches (una sola petición REST para varios partidos). */
export async function fetchLiveScoresByMatchIds(
  matchIds: string[]
): Promise<Record<string, LiveScoreSnapshot>> {
  const unique = [...new Set(matchIds.filter(Boolean))];
  if (!unique.length || !isSupabaseRestConfigured()) return {};

  try {
    const rows = await restGetRows<{ id: string; state: unknown }>("matches", {
      select: "id,state",
      id: `in.(${unique.join(",")})`,
    });

    const out: Record<string, LiveScoreSnapshot> = {};
    for (const row of rows) {
      if (!row?.id || !row.state) continue;
      const raw = row.state as ScoreboardState | BasketballScoreboardState;
      out[row.id] = snapshotFromState(raw);
    }
    return out;
  } catch (error) {
    console.error("[matchSync] live scores batch", error);
    return {};
  }
}
