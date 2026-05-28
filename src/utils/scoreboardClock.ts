import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import type { ScoreboardState } from "../types/scoreboard";

dayjs.extend(duration);

export function parseTimeToMs(time: string): number {
  const [minutes, seconds] = time.split(":").map(Number);
  return dayjs.duration({ minutes: minutes || 0, seconds: seconds || 0 }).asMilliseconds();
}

export function formatTime(ms: number): string {
  const safeMs = Math.max(ms, 0);
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Tiempos visibles según snapshot + tiempo transcurrido desde updatedAt */
export function getRunningClocks(
  snapshot: ScoreboardState,
  nowMs: number = Date.now()
): { timeGame: string; penaltyGame: string } {
  if (snapshot.isPaused || !snapshot.updatedAt) {
    return { timeGame: snapshot.timeGame, penaltyGame: snapshot.penaltyGame };
  }

  const anchorMs = new Date(snapshot.updatedAt).getTime();
  const elapsed = Math.max(0, nowMs - anchorMs);

  return {
    timeGame: formatTime(parseTimeToMs(snapshot.timeGame) - elapsed),
    penaltyGame: formatTime(parseTimeToMs(snapshot.penaltyGame) - elapsed),
  };
}
