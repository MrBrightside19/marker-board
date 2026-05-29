import { createFreshMatchState, normalizeScoreboardState } from "../stores/scoreboard";
import type { ScoreboardState } from "../types/scoreboard";
import type {
  ActiveTournamentSummary,
  FinishedTournamentSummary,
  Tournament,
  TournamentImportResult,
  TournamentMatch,
  TournamentMatchImportRow,
  TournamentMatchResult,
  TournamentWithMatches,
} from "../types/tournament";
import { createMatchId } from "../utils/activeMatch";
import { normalizeCourt } from "../utils/court";
import { resolveSportId, type SportId } from "../types/sport";
import { getSupabase } from "./supabaseClient";
import { registerMatchRecord } from "./liveMatchesService";

type TournamentRow = {
  id: string;
  organizer_id: string;
  name: string;
  sport?: string;
  visibility?: string;
  start_date: string;
  end_date: string;
  status?: string;
  live_match_id?: string | null;
  created_at: string;
};

export type PublicHomeFilters = {
  sportId: SportId;
};

type TournamentMatchRow = {
  id: string;
  tournament_id: string;
  sort_order: number;
  scheduled_at: string | null;
  local_team: string;
  visit_team: string;
  time_game: string;
  match_id: string | null;
  court?: string;
  status: string;
  goal_local?: number | null;
  goal_visit?: number | null;
  finished_at?: string | null;
};

function mapTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    organizerId: row.organizer_id,
    name: row.name,
    sport: resolveSportId(row.sport),
    visibility: row.visibility === "private" ? "private" : "public",
    startDate: row.start_date,
    endDate: row.end_date,
    status: (row.status === "finished" ? "finished" : "active") as Tournament["status"],
    liveMatchId: row.live_match_id ?? null,
    createdAt: row.created_at,
  };
}

function mapTournamentMatch(row: TournamentMatchRow): TournamentMatch {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    sortOrder: row.sort_order,
    scheduledAt: row.scheduled_at,
    localTeam: row.local_team,
    visitTeam: row.visit_team,
    timeGame: row.time_game,
    matchId: row.match_id,
    court: normalizeCourt(row.court ?? "1"),
    status: row.status as TournamentMatch["status"],
    goalLocal: row.goal_local ?? null,
    goalVisit: row.goal_visit ?? null,
    finishedAt: row.finished_at ?? null,
  };
}

function mapToMatchResult(
  row: TournamentMatchRow,
  tournamentName: string,
  tournamentStatus: Tournament["status"]
): TournamentMatchResult {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    tournamentName,
    tournamentStatus,
    localTeam: row.local_team,
    visitTeam: row.visit_team,
    goalLocal: row.goal_local ?? 0,
    goalVisit: row.goal_visit ?? 0,
    finishedAt: row.finished_at ?? "",
    matchId: row.match_id,
  };
}

export async function createTournament(input: {
  organizerId: string;
  name: string;
  sport: SportId;
  visibility: Tournament["visibility"];
  startDate: string;
  endDate: string;
}): Promise<Tournament> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase no configurado");

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      organizer_id: input.organizerId,
      name: input.name.trim(),
      sport: input.sport,
      visibility: input.visibility,
      start_date: input.startDate,
      end_date: input.endDate,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo crear el torneo");
  }

  return mapTournament(data as TournamentRow);
}

export async function fetchTournamentsByOrganizer(
  organizerId: string
): Promise<Tournament[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("organizer_id", organizerId)
    .order("start_date", { ascending: false });

  if (error) {
    console.error("[tournaments] list", error.message);
    return [];
  }

  return (data as TournamentRow[]).map(mapTournament);
}

export async function fetchTournamentWithMatches(
  tournamentId: string
): Promise<TournamentWithMatches | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tournamentError || !tournament) {
    console.error("[tournaments] get", tournamentError?.message);
    return null;
  }

  const { data: matches, error: matchesError } = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: true });

  if (matchesError) {
    console.error("[tournaments] matches", matchesError.message);
    return { ...mapTournament(tournament as TournamentRow), matches: [] };
  }

  return {
    ...mapTournament(tournament as TournamentRow),
    matches: (matches as TournamentMatchRow[]).map(mapTournamentMatch),
  };
}

export async function bulkImportTournamentMatches(
  tournamentId: string,
  rows: TournamentMatchImportRow[],
  _organizerId: string
): Promise<TournamentImportResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase no configurado");

  const tournament = await fetchTournamentWithMatches(tournamentId);
  if (!tournament) throw new Error("Torneo no encontrado");

  const startOrder = tournament.matches.length;

  const payload = rows.map((row, index) => ({
    tournament_id: tournamentId,
    sort_order: startOrder + index,
    scheduled_at: row.scheduledAt,
    local_team: row.localTeam,
    visit_team: row.visitTeam,
    time_game: row.timeGame,
    court: row.court,
    match_id: null,
    status: "scheduled",
  }));

  const { error } = await supabase.from("tournament_matches").insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  return { created: rows.length, errors: [] };
}

export type TournamentControlsContext = {
  tournament: TournamentWithMatches;
  court: string;
  currentMatch: TournamentMatch | null;
  upcomingMatches: TournamentMatch[];
};

function buildTournamentControlsContext(
  tournamentData: TournamentWithMatches,
  matchId: string,
  courtHint?: string
): TournamentControlsContext {
  const courtKey = normalizeCourt(courtHint ?? "1");

  let currentMatch =
    tournamentData.matches.find((m) => m.matchId === matchId) ?? null;

  if (!currentMatch) {
    const liveOnCourt = tournamentData.matches.filter(
      (m) => m.status === "live" && normalizeCourt(m.court) === courtKey
    );
    currentMatch =
      liveOnCourt.find((m) => m.matchId === matchId) ?? liveOnCourt[0] ?? null;
  }

  const court = currentMatch?.court ?? courtKey;

  return {
    tournament: tournamentData,
    court,
    currentMatch,
    upcomingMatches: tournamentData.matches.filter(
      (m) => m.status === "scheduled" && normalizeCourt(m.court) === court
    ),
  };
}

/** Canchas distintas definidas en el calendario del torneo. */
export async function fetchTournamentCourts(tournamentId: string): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("tournament_matches")
    .select("court")
    .eq("tournament_id", tournamentId);

  if (error) {
    console.error("[tournaments] courts", error.message);
    return [];
  }

  const courts = new Set(
    (data as { court: string | null }[]).map((r) => normalizeCourt(r.court ?? "1"))
  );
  return [...courts].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}

export async function fetchTournamentControlsContextByTournamentId(
  tournamentId: string,
  matchId: string,
  courtHint?: string
): Promise<TournamentControlsContext | null> {
  const tournamentData = await fetchTournamentWithMatches(tournamentId);
  if (!tournamentData) return null;
  return buildTournamentControlsContext(tournamentData, matchId, courtHint);
}

export async function fetchTournamentControlsContext(
  matchId: string
): Promise<TournamentControlsContext | null> {
  const supabase = getSupabase();
  if (!supabase || !matchId) return null;

  const { data: matchRow, error: matchError } = await supabase
    .from("matches")
    .select("tournament_id, court")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError) {
    return null;
  }

  let tournamentId = (matchRow?.tournament_id as string | null) ?? null;
  let courtHint = (matchRow?.court as string | null) ?? undefined;

  if (!tournamentId) {
    const { data: tmRow } = await supabase
      .from("tournament_matches")
      .select("tournament_id, court")
      .eq("match_id", matchId)
      .maybeSingle();
    tournamentId = (tmRow?.tournament_id as string | null) ?? null;
    courtHint = courtHint ?? (tmRow?.court as string | null) ?? undefined;
  }

  if (!tournamentId) return null;

  const tournamentData = await fetchTournamentWithMatches(tournamentId);
  if (!tournamentData) return null;

  return buildTournamentControlsContext(tournamentData, matchId, courtHint);
}

export async function finishTournamentMatch(
  tournamentMatchId: string,
  finalState?: ScoreboardState
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase no configurado");

  const { data: row, error: fetchError } = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("id", tournamentMatchId)
    .maybeSingle();

  if (fetchError || !row) {
    throw new Error(fetchError?.message || "Partido no encontrado");
  }

  const matchRow = row as TournamentMatchRow;
  const finishedAt = new Date().toISOString();
  const normalized = finalState
    ? normalizeScoreboardState({
        ...finalState,
        timeGame: "00:00",
        penaltyGame: "00:00",
        isPaused: true,
        penalizedLocal: false,
        penalizedVisit: false,
      })
    : null;

  const updatePayload: Record<string, unknown> = {
    status: "finished",
    finished_at: finishedAt,
  };

  if (normalized) {
    updatePayload.goal_local = Math.max(0, normalized.goalLocal);
    updatePayload.goal_visit = Math.max(0, normalized.goalVisit);
  }

  const { error } = await supabase
    .from("tournament_matches")
    .update(updatePayload)
    .eq("id", tournamentMatchId);

  if (error) {
    throw new Error(error.message);
  }

  if (normalized && matchRow.match_id) {
    const matchUpdate: Record<string, unknown> = {
      state: { ...normalized, updatedAt: finishedAt },
      goal_local: updatePayload.goal_local,
      goal_visit: updatePayload.goal_visit,
      finished_at: finishedAt,
      is_live: false,
      updated_at: finishedAt,
    };

    await supabase.from("matches").update(matchUpdate).eq("id", matchRow.match_id);
  }
}

export async function finalizeTournament(tournamentId: string): Promise<TournamentWithMatches | null> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase no configurado");

  const { error } = await supabase
    .from("tournaments")
    .update({ status: "finished" })
    .eq("id", tournamentId);

  if (error) {
    throw new Error(error.message);
  }

  return fetchTournamentWithMatches(tournamentId);
}

export async function fetchActiveTournamentsWithResults(
  filters?: PublicHomeFilters
): Promise<ActiveTournamentSummary[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from("tournaments")
    .select("*")
    .eq("status", "active")
    .eq("visibility", "public");

  if (filters?.sportId) {
    query = query.eq("sport", filters.sportId);
  }

  const { data: tournaments, error } = await query.order("start_date", { ascending: false });

  if (error || !tournaments?.length) {
    if (error) console.error("[tournaments] active", error.message);
    return [];
  }

  const ids = tournaments.map((t) => t.id);
  const { data: matches, error: matchesError } = await supabase
    .from("tournament_matches")
    .select("*")
    .in("tournament_id", ids)
    .order("finished_at", { ascending: false });

  if (matchesError) {
    console.error("[tournaments] active matches", matchesError.message);
    return [];
  }

  const matchesByTournament = new Map<string, TournamentMatchRow[]>();
  for (const row of (matches as TournamentMatchRow[]) ?? []) {
    const list = matchesByTournament.get(row.tournament_id) ?? [];
    list.push(row);
    matchesByTournament.set(row.tournament_id, list);
  }

  return (tournaments as TournamentRow[]).map((t) => {
    const tMatches = matchesByTournament.get(t.id) ?? [];
    const mapped = tMatches.map(mapTournamentMatch);
    const tournament = mapTournament(t);
    const finished = mapped.filter((m) => m.status === "finished" && m.finishedAt);

    const recentResults = tMatches
      .filter((m) => m.status === "finished" && m.finished_at != null && m.goal_local != null)
      .sort((a, b) => new Date(b.finished_at!).getTime() - new Date(a.finished_at!).getTime())
      .slice(0, 5)
      .map((m) => mapToMatchResult(m, tournament.name, tournament.status));

    return {
      id: tournament.id,
      name: tournament.name,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      liveCount: mapped.filter((m) => m.status === "live").length,
      scheduledCount: mapped.filter((m) => m.status === "scheduled").length,
      finishedCount: finished.length,
      recentResults,
    };
  });
}

export async function fetchRecentTournamentResults(
  limit = 30,
  filters?: PublicHomeFilters
): Promise<TournamentMatchResult[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from("tournament_matches")
    .select("*, tournaments!inner(id, name, status, sport, visibility)")
    .eq("status", "finished")
    .eq("tournaments.visibility", "public")
    .not("finished_at", "is", null)
    .not("goal_local", "is", null)
    .order("finished_at", { ascending: false })
    .limit(limit);

  if (filters?.sportId) {
    query = query.eq("tournaments.sport", filters.sportId);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error("[tournaments] recent results", error.message);
    return fetchRecentResultsFallback(limit);
  }

  return (rows as (TournamentMatchRow & { tournaments: TournamentRow | TournamentRow[] })[])
    .map((row) => {
      const tournament = Array.isArray(row.tournaments) ? row.tournaments[0] : row.tournaments;
      return mapToMatchResult(
        row,
        tournament?.name ?? "Torneo",
        tournament?.status === "finished" ? "finished" : "active"
      );
    })
    .filter((r) => r.tournamentStatus === "active");
}

async function fetchRecentResultsFallback(limit: number): Promise<TournamentMatchResult[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: rows, error } = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("status", "finished")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) return [];

  const tournamentIds = [...new Set((rows as TournamentMatchRow[]).map((r) => r.tournament_id))];
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, status")
    .in("id", tournamentIds);

  const nameMap = new Map(
    (tournaments as TournamentRow[] | null)?.map((t) => [
      t.id,
      { name: t.name, status: (t.status === "finished" ? "finished" : "active") as Tournament["status"] },
    ]) ?? []
  );

  return (rows as TournamentMatchRow[]).map((row) => {
    const meta = nameMap.get(row.tournament_id);
    return mapToMatchResult(
      row,
      meta?.name ?? "Torneo",
      meta?.status ?? "active"
    );
  });
}

export async function fetchFinishedTournaments(
  filters?: PublicHomeFilters
): Promise<FinishedTournamentSummary[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from("tournaments")
    .select("*")
    .eq("status", "finished")
    .eq("visibility", "public");

  if (filters?.sportId) {
    query = query.eq("sport", filters.sportId);
  }

  const { data: tournaments, error } = await query.order("end_date", { ascending: false });

  if (error || !tournaments?.length) {
    if (error) console.error("[tournaments] finished list", error.message);
    return [];
  }

  const ids = tournaments.map((t) => t.id);
  const { data: matches } = await supabase
    .from("tournament_matches")
    .select("tournament_id, finished_at")
    .in("tournament_id", ids)
    .eq("status", "finished");

  const lastFinished = new Map<string, string>();
  for (const row of (matches as { tournament_id: string; finished_at: string | null }[]) ?? []) {
    if (!row.finished_at) continue;
    const prev = lastFinished.get(row.tournament_id);
    if (!prev || new Date(row.finished_at) > new Date(prev)) {
      lastFinished.set(row.tournament_id, row.finished_at);
    }
  }

  const countMap = new Map<string, number>();
  for (const row of (matches as { tournament_id: string }[]) ?? []) {
    countMap.set(row.tournament_id, (countMap.get(row.tournament_id) ?? 0) + 1);
  }

  return (tournaments as TournamentRow[]).map((t) => ({
    id: t.id,
    name: t.name,
    endDate: t.end_date,
    finishedAt: lastFinished.get(t.id) ?? null,
    matchCount: countMap.get(t.id) ?? 0,
  }));
}

export async function fetchFinishedTournamentDetail(
  tournamentId: string
): Promise<TournamentWithMatches | null> {
  const data = await fetchTournamentWithMatches(tournamentId);
  if (!data || data.status !== "finished") return data;
  return data;
}

export async function startTournamentMatch(
  tournamentMatchId: string,
  organizerId: string
): Promise<{ matchId: string; tournamentId: string; court: string }> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase no configurado");

  const { data: row, error } = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("id", tournamentMatchId)
    .maybeSingle();

  if (error || !row) {
    throw new Error(error?.message || "Partido no encontrado");
  }

  const matchRow = row as TournamentMatchRow;
  const matchId = matchRow.match_id || createMatchId();
  const court = normalizeCourt(matchRow.court ?? "1");

  const state = createFreshMatchState({
    localTeam: matchRow.local_team,
    visitTeam: matchRow.visit_team,
    timeGame: matchRow.time_game,
  });

  const saved = await registerMatchRecord({
    matchId,
    state,
    organizerId,
    title: `${matchRow.local_team} vs ${matchRow.visit_team}`,
    tournamentId: matchRow.tournament_id,
    isLive: true,
  });

  if (!saved) {
    throw new Error("No se pudo registrar el partido en el servidor");
  }

  const { error: updateError } = await supabase
    .from("tournament_matches")
    .update({ match_id: matchId, status: "live" })
    .eq("id", tournamentMatchId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { matchId, tournamentId: matchRow.tournament_id, court };
}
