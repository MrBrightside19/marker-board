import type { ScoreboardState } from "./scoreboard";

export interface LiveMatchSummary {
  id: string;
  title: string;
  state: ScoreboardState;
  updatedAt: string;
  organizerId: string | null;
  organizerName: string | null;
}
