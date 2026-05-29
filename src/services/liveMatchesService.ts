import { normalizeScoreboardState } from "../stores/scoreboard";
import type { ScoreboardState } from "../types/scoreboard";
import type { LiveMatchSummary } from "../types/liveMatch";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";

const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

type MatchListRow = {
  id: string;
  title: string | null;
  state: ScoreboardState;
  updated_at: string;
  organizer_id: string | null;
  is_live: boolean | null;
  profiles?: { display_name: string | null } | { display_name: string | null }[] | null;
};

function buildTitle(state: ScoreboardState, fallback?: string | null): string {
  if (fallback?.trim()) return fallback.trim();
  return `${state.localTeam} vs ${state.visitTeam}`;
}

function mapRow(row: MatchListRow): LiveMatchSummary {
  const state = normalizeScoreboardState(row.state);
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  return {
    id: row.id,
    title: buildTitle(state, row.title),
    state,
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

export async function fetchLiveMatches(): Promise<LiveMatchSummary[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const cutoff = new Date(Date.now() - LIVE_WINDOW_MS).toISOString();
  const finishedIds = await fetchFinishedTournamentMatchIds();

  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, title, state, updated_at, organizer_id, is_live, profiles:organizer_id ( display_name )"
    )
    .eq("is_live", true)
    .gte("updated_at", cutoff)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[liveMatches] fetch", error.message);
    return fetchLiveMatchesFallback(cutoff, finishedIds);
  }

  return (data as MatchListRow[])
    .filter((row) => !finishedIds.has(row.id))
    .map(mapRow);
}

/** Sin join a profiles si el esquema aun no tiene FK */
async function fetchLiveMatchesFallback(
  cutoff: string,
  finishedIds: Set<string> = new Set()
): Promise<LiveMatchSummary[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("matches")
    .select("id, title, state, updated_at, organizer_id, is_live")
    .gte("updated_at", cutoff)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[liveMatches] fetch fallback", error.message);
    return [];
  }

  return (data as MatchListRow[])
    .filter((row) => row.is_live === true && !finishedIds.has(row.id))
    .map(mapRow);
}

export async function registerMatchRecord(options: {
  matchId: string;
  state: ScoreboardState;
  organizerId?: string | null;
  title?: string;
  tournamentId?: string | null;
  isLive?: boolean;
}): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const state = normalizeScoreboardState(options.state);
  const title = options.title?.trim() || buildTitle(state);

  const publishedAt = state.updatedAt || new Date().toISOString();
  const row: Record<string, unknown> = {
    id: options.matchId,
    state: { ...state, updatedAt: publishedAt },
    title,
    is_live: options.isLive ?? true,
    organizer_id: options.organizerId ?? null,
    updated_at: new Date().toISOString(),
  };

  // No pisar tournament_id en cada tick si no se envía explícitamente
  if (options.tournamentId !== undefined) {
    row.tournament_id = options.tournamentId;
  }

  const { error } = await supabase.from("matches").upsert(row, { onConflict: "id" });

  if (error) {
    console.error("[liveMatches] register", error.message);
    return false;
  }
  return true;
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
