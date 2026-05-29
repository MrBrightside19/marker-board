import type { BasketballScoreboardState } from "../types/basketballScoreboard";
import { formatTime, parseTimeToMs } from "./scoreboardClock";

export function getBasketballRunningClock(
  snapshot: BasketballScoreboardState,
  nowMs: number = Date.now()
): string {
  if (snapshot.isPaused || !snapshot.updatedAt) {
    return snapshot.timeGame;
  }

  const anchorMs = new Date(snapshot.updatedAt).getTime();
  const elapsed = Math.max(0, nowMs - anchorMs);
  return formatTime(parseTimeToMs(snapshot.timeGame) - elapsed);
}
