export type TournamentMatchStatus = "scheduled" | "live" | "finished";
export type TournamentStatus = "active" | "finished";

export interface Tournament {
  id: string;
  organizerId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: TournamentStatus;
  liveMatchId: string | null;
  createdAt: string;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  sortOrder: number;
  scheduledAt: string | null;
  localTeam: string;
  visitTeam: string;
  timeGame: string;
  court: string;
  matchId: string | null;
  status: TournamentMatchStatus;
  goalLocal: number | null;
  goalVisit: number | null;
  finishedAt: string | null;
}

export interface TournamentWithMatches extends Tournament {
  matches: TournamentMatch[];
}

export interface TournamentMatchImportRow {
  localTeam: string;
  visitTeam: string;
  timeGame: string;
  court: string;
  scheduledAt: string | null;
  lineNumber: number;
}

export interface TournamentImportResult {
  created: number;
  errors: { line: number; message: string }[];
}

export interface TournamentMatchResult {
  id: string;
  tournamentId: string;
  tournamentName: string;
  tournamentStatus: TournamentStatus;
  localTeam: string;
  visitTeam: string;
  goalLocal: number;
  goalVisit: number;
  finishedAt: string;
  matchId: string | null;
}

export interface ActiveTournamentSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  liveCount: number;
  scheduledCount: number;
  finishedCount: number;
  recentResults: TournamentMatchResult[];
}

export interface FinishedTournamentSummary {
  id: string;
  name: string;
  endDate: string;
  finishedAt: string | null;
  matchCount: number;
}
