import type { ScoreboardState } from "../types/scoreboard";

export const SCOREBOARD_SYNC_EVENT = "scoreboard-sync";
export const MATCH_CHANGED_EVENT = "scoreboard-match-changed";
export const SCOREBOARD_WRITER_KEY = "scoreboard-writer";
export const SCOREBOARD_WRITER_HEARTBEAT = "scoreboard-writer-heartbeat";
export const SCOREBOARD_WRITER_CONTROLS = "controls";

const WRITER_STALE_MS = 4000;

/** Controles toma el tick (compartido entre pestañas/ventanas vía localStorage). */
export function claimControlsWriter(): void {
  localStorage.setItem(SCOREBOARD_WRITER_KEY, SCOREBOARD_WRITER_CONTROLS);
  touchControlsWriterHeartbeat();
}

export function releaseControlsWriter(): void {
  localStorage.removeItem(SCOREBOARD_WRITER_KEY);
  localStorage.removeItem(SCOREBOARD_WRITER_HEARTBEAT);
}

export function touchControlsWriterHeartbeat(): void {
  if (localStorage.getItem(SCOREBOARD_WRITER_KEY) === SCOREBOARD_WRITER_CONTROLS) {
    localStorage.setItem(SCOREBOARD_WRITER_HEARTBEAT, String(Date.now()));
  }
}

export function isControlsActiveWriter(): boolean {
  if (localStorage.getItem(SCOREBOARD_WRITER_KEY) !== SCOREBOARD_WRITER_CONTROLS) {
    return false;
  }
  const heartbeat = Number(localStorage.getItem(SCOREBOARD_WRITER_HEARTBEAT) || 0);
  if (!heartbeat) return true;
  return Date.now() - heartbeat < WRITER_STALE_MS;
}

/** Notifica al marcador (misma pestaña) que localStorage cambió. */
export function notifyScoreboardSync(): void {
  window.dispatchEvent(new CustomEvent(SCOREBOARD_SYNC_EVENT));
}

export function notifyMatchChanged(matchId: string): void {
  window.dispatchEvent(new CustomEvent(MATCH_CHANGED_EVENT, { detail: { matchId } }));
}

export function isRemoteStateNewer(
  remote: ScoreboardState,
  localUpdatedAt: string
): boolean {
  if (!remote.updatedAt) return false;
  if (!localUpdatedAt) return true;
  return new Date(remote.updatedAt).getTime() > new Date(localUpdatedAt).getTime();
}
