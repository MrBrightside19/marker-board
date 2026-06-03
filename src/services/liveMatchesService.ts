import { normalizeBasketballState } from "../stores/basketballScoreboard";
import { normalizeScoreboardState } from "../stores/scoreboard";
import type { ScoreboardState } from "../types/scoreboard";
import { isBasketballScoreboardState } from "../types/basketballScoreboard";
import type { BasketballScoreboardState } from "../types/basketballScoreboard";
import type { LiveMatchSummary } from "../types/liveMatch";
import { DEFAULT_SPORT_ID, type SportId } from "../types/sport";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";
import { isSupabaseRestConfigured, restUpsertMatch } from "./supabaseRest";

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
  profiles?: { display_name: string | null } | { display_name: string | null }[] | null;
};

type TournamentMetaRow = {
  id: string;
  sport: string;
  visibility: string;
};

function buildTitleFromState(state: ScoreboardState | BasketballScoreboardState, fallback?: string | null): string {
  if (fallback?.trim()) return fallback.trim();
  if (isBasketballScoreboardState(state)) {
    return `${state.localTeam} vs ${state.visitTeam}`;
  }
  return `${state.localTeam} vs ${state.visitTeam}`;
}

function mapRow(row: MatchListRow): LiveMatchSummary {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const state = row.state;

  return {
    id: row.id,
    title: buildTitleFromState(state as ScoreboardState | BasketballScoreboardState, row.title),
    state: state as ScoreboardState,
    updatedAt: row.updated_at,
    organizerId: row.organizer_id,
    organizerName: profile?.display_name?.trim() || null,
  };
}

async function fetchFinishedTournamentMatchIds(): Promise<Set<string>> {
  const supabase = getSupabase();
  if (!supabase) return new Set();

  const { data, error } = await supabase
    .from("tournament_matches")
    .select("match_id")
    .eq("status", "finished")
    .not("match_id", "is", null);

  if (error) {
    console.error("[liveMatches] finished ids", error.message);
    return new Set();
  }

  return new Set(
    (data as { match_id: string | null }[])
      .map((row) => row.match_id)
      .filter((id): id is string => Boolean(id))
  );
}

async function fetchTournamentMetaByIds(ids: string[]): Promise<Map<string, TournamentMetaRow>> {
  const supabase = getSupabase();
  const map = new Map<string, TournamentMetaRow>();
  if (!supabase || ids.length === 0) return map;

  const { data, error } = await supabase
    .from("tournaments")
    .select("id, sport, visibility")
    .in("id", ids);

  if (error) {
    console.error("[liveMatches] tournament meta", error.message);
    return map;
  }

  for (const row of (data as TournamentMetaRow[]) ?? []) {
    map.set(row.id, row);
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

export async function fetchLiveMatches(filters?: LiveMatchesFilters): Promise<LiveMatchSummary[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const cutoff = new Date(Date.now() - LIVE_WINDOW_MS).toISOString();
  const finishedIds = await fetchFinishedTournamentMatchIds();

  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, title, state, updated_at, organizer_id, is_live, tournament_id, profiles:organizer_id ( display_name )"
    )
    .eq("is_live", true)
    .gte("updated_at", cutoff)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[liveMatches] fetch", error.message);
    return fetchLiveMatchesFallback(cutoff, finishedIds, filters);
  }

  const rows = (data as MatchListRow[]).filter((row) => !finishedIds.has(row.id));
  const tournamentIds = [
    ...new Set(rows.map((row) => row.tournament_id).filter((id): id is string => Boolean(id))),
  ];
  const tournamentMeta = await fetchTournamentMetaByIds(tournamentIds);

  return rows
    .filter((row) => matchVisibleOnHome(row, tournamentMeta, filters))
    .map(mapRow);
}

/** Sin join a profiles si el esquema aun no tiene FK */
async function fetchLiveMatchesFallback(
  cutoff: string,
  finishedIds: Set<string> = new Set(),
  filters?: LiveMatchesFilters
): Promise<LiveMatchSummary[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("matches")
    .select("id, title, state, updated_at, organizer_id, is_live, tournament_id")
    .gte("updated_at", cutoff)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[liveMatches] fetch fallback", error.message);
    return [];
  }

  const rows = (data as MatchListRow[])
    .filter((row) => row.is_live === true && !finishedIds.has(row.id));

  const tournamentIds = [
    ...new Set(rows.map((row) => row.tournament_id).filter((id): id is string => Boolean(id))),
  ];
  const tournamentMeta = await fetchTournamentMetaByIds(tournamentIds);

  return rows
    .filter((row) => matchVisibleOnHome(row, tournamentMeta, filters))
    .map(mapRow);
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
  const supabase = getSupabase();
  if (!supabase || !matchId) return;

  const { error } = await supabase
    .from("matches")
    .update({ is_live: isLive, updated_at: new Date().toISOString() })
    .eq("id", matchId);

  if (error) {
    console.error("[liveMatches] setLiveStatus", error.message);
  }
}

export { isSupabaseConfigured };
