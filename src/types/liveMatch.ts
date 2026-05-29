import type { ScoreboardState } from "./scoreboard";
import type { BasketballScoreboardState } from "./basketballScoreboard";

export interface LiveMatchSummary {
  id: string;
  title: string;
  state: ScoreboardState | BasketballScoreboardState;
  updatedAt: string;
  organizerId: string | null;
  organizerName: string | null;
}
