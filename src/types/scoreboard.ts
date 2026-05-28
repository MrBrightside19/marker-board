export interface ScoreboardState {
  localTeam: string;
  visitTeam: string;
  goalLocal: number;
  goalVisit: number;
  gamePeriod: number;
  timeGame: string;
  penaltyGame: string;
  isPaused: boolean;
  penalizedLocal: boolean;
  penalizedVisit: boolean;
  updatedAt: string;
}

export const DEFAULT_SCOREBOARD_STATE: ScoreboardState = {
  localTeam: "Equipo Local",
  visitTeam: "Equipo Visita",
  goalLocal: 0,
  goalVisit: 0,
  gamePeriod: 1,
  timeGame: "20:00",
  penaltyGame: "00:00",
  isPaused: false,
  penalizedLocal: false,
  penalizedVisit: false,
  updatedAt: "",
};
