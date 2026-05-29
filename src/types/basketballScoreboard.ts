export const BASKETBALL_SPORT_TYPE = "basketball" as const;

export interface BasketballScoreboardState {
  sportType: typeof BASKETBALL_SPORT_TYPE;
  localTeam: string;
  visitTeam: string;
  pointsLocal: number;
  pointsVisit: number;
  foulsLocal: number;
  foulsVisit: number;
  gamePeriod: number;
  timeGame: string;
  isPaused: boolean;
  updatedAt: string;
}

export const DEFAULT_BASKETBALL_STATE: BasketballScoreboardState = {
  sportType: BASKETBALL_SPORT_TYPE,
  localTeam: "Equipo Local",
  visitTeam: "Equipo Visita",
  pointsLocal: 0,
  pointsVisit: 0,
  foulsLocal: 0,
  foulsVisit: 0,
  gamePeriod: 1,
  timeGame: "10:00",
  isPaused: true,
  updatedAt: "",
};

export function isBasketballScoreboardState(value: unknown): value is BasketballScoreboardState {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as BasketballScoreboardState).sportType === BASKETBALL_SPORT_TYPE
  );
}
