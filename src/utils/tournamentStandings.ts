import type { TournamentMatch } from "../types/tournament";

export interface StandingsRow {
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

const POINTS_WIN = 3;
const POINTS_DRAW = 1;

type TeamStats = Omit<StandingsRow, "goalDiff">;

function emptyStats(team: string): TeamStats {
  return {
    team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  };
}

function ensureTeam(map: Map<string, TeamStats>, team: string): TeamStats {
  if (!map.has(team)) {
    map.set(team, emptyStats(team));
  }
  return map.get(team)!;
}

function applyResult(
  map: Map<string, TeamStats>,
  team: string,
  goalsFor: number,
  goalsAgainst: number
) {
  const stats = ensureTeam(map, team);
  stats.played += 1;
  stats.goalsFor += goalsFor;
  stats.goalsAgainst += goalsAgainst;

  if (goalsFor > goalsAgainst) {
    stats.wins += 1;
    stats.points += POINTS_WIN;
  } else if (goalsFor < goalsAgainst) {
    stats.losses += 1;
  } else {
    stats.draws += 1;
    stats.points += POINTS_DRAW;
  }
}

/** Tabla de puntos (3-1-0) a partir de partidos finalizados con marcador guardado */
export function computeTournamentStandings(
  matches: TournamentMatch[]
): StandingsRow[] {
  const statsMap = new Map<string, TeamStats>();

  for (const match of matches) {
    if (match.status !== "finished") continue;
    if (match.goalLocal == null || match.goalVisit == null) continue;

    applyResult(statsMap, match.localTeam, match.goalLocal, match.goalVisit);
    applyResult(statsMap, match.visitTeam, match.goalVisit, match.goalLocal);
  }

  return [...statsMap.values()]
    .map((row) => ({
      ...row,
      goalDiff: row.goalsFor - row.goalsAgainst,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.team.localeCompare(b.team, "es");
    });
}

export function getMatchWinnerLabel(match: TournamentMatch): string {
  if (match.goalLocal == null || match.goalVisit == null) return "—";
  if (match.goalLocal > match.goalVisit) return match.localTeam;
  if (match.goalVisit > match.goalLocal) return match.visitTeam;
  return "Empate";
}

export function formatMatchScore(match: TournamentMatch): string {
  if (match.goalLocal == null || match.goalVisit == null) return "—";
  return `${match.goalLocal} - ${match.goalVisit}`;
}
