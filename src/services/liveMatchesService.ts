import { normalizeBasketballState } from "../stores/basketballScoreboard";
import { normalizeScoreboardState } from "../stores/scoreboard";
import type { ScoreboardState } from "../types/scoreboard";
import { isBasketballScoreboardState } from "../types/basketballScoreboard";
import type { BasketballScoreboardState } from "../types/basketballScoreboard";
import type { LiveMatchSummary } from "../types/liveMatch";
import { DEFAULT_SPORT_ID, type SportId } from "../types/sport";
import { isSupabaseConfigured } from "./supabaseClient";
import {
  isSupabaseRestConfigured,
  restGetRows,
  restPatchRows,
  restUpsertMatch,
} from "./supabaseRest";

const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

export type LiveMatchesFilters = {
  /** Sin valor = todos los deportes con marcador disponible. */
  sportId?: SportId | null;
  publicTournamentsOnly?: boolean;
};

type MatchListRow = {
  id: string;
  title: string | null;
  state: ScoreboardState | BasketballScoreboardState;
  updated_at: string;
  organizer_id: string | null;
  is_live: boolean | null;
  tournament_id?: string | null;
};

type TournamentMetaRow = {
  id: string;
  sport: string;
  visibility: string;
};

function buildTitleFromState(
  state: ScoreboardState | BasketballScoreboardState,
  fallback?: string | null
): string {
  if (fallback?.trim()) return fallback.trim();
  return `${state.localTeam} vs ${state.visitTeam}`;
}

function mapRow(row: MatchListRow): LiveMatchSummary {
  const state = row.state;

  return {
    id: row.id,
    title: buildTitleFromState(state as ScoreboardState | BasketballScoreboardState, row.title),
    state: state as ScoreboardState,
    updatedAt: row.updated_at,
    organizerId: row.organizer_id,
    organizerName: null,
  };
}

async function fetchFinishedTournamentMatchIdsRest(): Promise<Set<string>> {
  if (!isSupabaseRestConfigured()) return new Set();

  try {
    const rows = await restGetRows<{ match_id: string | null }>("tournament_matches", {
      select: "match_id",
      status: "eq.finished",
      match_id: "not.is.null",
    });
    return new Set(
      rows.map((row) => row.match_id).filter((id): id is string => Boolean(id))
    );
  } catch (error) {
    console.error("[liveMatches] finished ids REST", error);
    return new Set();
  }
}

async function fetchTournamentMetaByIdsRest(
  ids: string[]
): Promise<Map<string, TournamentMetaRow>> {
  const map = new Map<string, TournamentMetaRow>();
  if (!isSupabaseRestConfigured() || ids.length === 0) return map;

  try {
    const rows = await restGetRows<TournamentMetaRow>("tournaments", {
      select: "id,sport,visibility",
      id: `in.(${ids.join(",")})`,
    });
    for (const row of rows) {
      map.set(row.id, row);
    }
  } catch (error) {
    console.error("[liveMatches] tournament meta REST", error);
  }
  return map;
}

function matchVisibleOnHome(
  row: MatchListRow,
  tournamentMeta: Map<string, TournamentMetaRow>,
  filters?: LiveMatchesFilters
): boolean {
  if (!filters) return true;

  const tournamentId = row.tournament_id;
  if (!tournamentId) {
    if (!filters.sportId) return true;
    if (isBasketballScoreboardState(row.state)) {
      return filters.sportId === "basquet";
    }
    return filters.sportId === DEFAULT_SPORT_ID;
  }

  const meta = tournamentMeta.get(tournamentId);
  if (!meta) return false;

  if (filters.publicTournamentsOnly && meta.visibility !== "public") {
    return false;
  }

  if (!filters.sportId) return true;
  return meta.sport === filters.sportId;
}

async function fetchLiveMatchesRest(
  filters?: LiveMatchesFilters
): Promise<LiveMatchSummary[]> {
  const cutoff = new Date(Date.now() - LIVE_WINDOW_MS).toISOString();
  const finishedIds = await fetchFinishedTournamentMatchIdsRest();

  let rows: MatchListRow[] = [];

  try {
    rows = await restGetRows<MatchListRow>("matches", {
      select: "id,title,state,updated_at,organizer_id,is_live,tournament_id",
      is_live: "eq.true",
      updated_at: `gte.${cutoff}`,
      order: "updated_at.desc",
      limit: "50",
    });
  } catch (error) {
    console.error("[liveMatches] fetch REST", error);
    try {
      const fallbackRows = await restGetRows<MatchListRow>("matches", {
        select: "id,title,state,updated_at,organizer_id,is_live,tournament_id",
        updated_at: `gte.${cutoff}`,
        order: "updated_at.desc",
        limit: "50",
      });
      rows = fallbackRows.filter((row) => row.is_live === true);
    } catch (fallbackError) {
      console.error("[liveMatches] fetch REST fallback", fallbackError);
      return [];
    }
  }

  const liveRows = rows.filter((row) => !finishedIds.has(row.id));
  const tournamentIds = [
    ...new Set(
      liveRows.map((row) => row.tournament_id).filter((id): id is string => Boolean(id))
    ),
  ];
  const tournamentMeta = await fetchTournamentMetaByIdsRest(tournamentIds);

  return liveRows
    .filter((row) => matchVisibleOnHome(row, tournamentMeta, filters))
    .map(mapRow);
}

export async function fetchLiveMatches(
  filters?: LiveMatchesFilters
): Promise<LiveMatchSummary[]> {
  if (!isSupabaseRestConfigured()) return [];
  return fetchLiveMatchesRest(filters);
}

export async function registerMatchRecord(options: {
  matchId: string;
  state: ScoreboardState | BasketballScoreboardState;
  organizerId?: string | null;
  title?: string;
  tournamentId?: string | null;
  isLive?: boolean;
}): Promise<boolean> {
  if (!isSupabaseRestConfigured()) return false;

  const isBasketball = isBasketballScoreboardState(options.state);
  const normalized: ScoreboardState | BasketballScoreboardState = isBasketball
    ? normalizeBasketballState(options.state)
    : normalizeScoreboardState(options.state as ScoreboardState);
  const title =
    options.title?.trim() ||
    buildTitleFromState(normalized as ScoreboardState | BasketballScoreboardState);

  const publishedAt = normalized.updatedAt || new Date().toISOString();
  const row: Record<string, unknown> = {
    id: options.matchId,
    state: { ...normalized, updatedAt: publishedAt },
    title,
    is_live: options.isLive ?? true,
    updated_at: new Date().toISOString(),
  };

  if (options.organizerId) {
    row.organizer_id = options.organizerId;
  }

  if (options.tournamentId !== undefined) {
    row.tournament_id = options.tournamentId;
  }

  try {
    await restUpsertMatch(row);
    return true;
  } catch (error) {
    if (options.organizerId) {
      try {
        delete row.organizer_id;
        await restUpsertMatch(row);
        return true;
      } catch (retryError) {
        console.error("[liveMatches] register retry", retryError);
      }
    }
    console.error("[liveMatches] register", error);
    return false;
  }
}

export async function setMatchLiveStatus(matchId: string, isLive: boolean): Promise<void> {
  if (!matchId || !isSupabaseRestConfigured()) return;

  try {
    await restPatchRows(
      "matches",
      { id: `eq.${matchId}` },
      { is_live: isLive, updated_at: new Date().toISOString() }
    );
  } catch (error) {
    console.error("[liveMatches] setLiveStatus REST", error);
  }
}

export { isSupabaseConfigured };
