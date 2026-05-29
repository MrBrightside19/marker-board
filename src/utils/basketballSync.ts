import type { BasketballScoreboardState } from "../types/basketballScoreboard";

export const BASKETBALL_SYNC_EVENT = "basketball-sync";
export const BASKETBALL_MATCH_CHANGED_EVENT = "basketball-match-changed";
export const BASKETBALL_WRITER_KEY = "basketball-writer";
export const BASKETBALL_WRITER_HEARTBEAT = "basketball-writer-heartbeat";
export const BASKETBALL_WRITER_CONTROLS = "controls";

const WRITER_STALE_MS = 15000;

export function claimBasketballControlsWriter(): void {
  localStorage.setItem(BASKETBALL_WRITER_KEY, BASKETBALL_WRITER_CONTROLS);
  touchBasketballControlsWriterHeartbeat();
}

export function releaseBasketballControlsWriter(): void {
  localStorage.removeItem(BASKETBALL_WRITER_KEY);
  localStorage.removeItem(BASKETBALL_WRITER_HEARTBEAT);
}

export function touchBasketballControlsWriterHeartbeat(): void {
  if (localStorage.getItem(BASKETBALL_WRITER_KEY) === BASKETBALL_WRITER_CONTROLS) {
    localStorage.setItem(BASKETBALL_WRITER_HEARTBEAT, String(Date.now()));
  }
}

export function isBasketballControlsActiveWriter(): boolean {
  if (localStorage.getItem(BASKETBALL_WRITER_KEY) !== BASKETBALL_WRITER_CONTROLS) {
    return false;
  }
  const heartbeat = Number(localStorage.getItem(BASKETBALL_WRITER_HEARTBEAT) || 0);
  if (!heartbeat) return true;
  return Date.now() - heartbeat < WRITER_STALE_MS;
}

export function notifyBasketballSync(): void {
  window.dispatchEvent(new CustomEvent(BASKETBALL_SYNC_EVENT));
}

export function notifyBasketballMatchChanged(matchId: string): void {
  window.dispatchEvent(new CustomEvent(BASKETBALL_MATCH_CHANGED_EVENT, { detail: { matchId } }));
}

export function isBasketballRemoteStateNewer(
  remote: BasketballScoreboardState,
  localUpdatedAt: string
): boolean {
  if (!remote.updatedAt) return false;
  if (!localUpdatedAt) return true;
  return new Date(remote.updatedAt).getTime() > new Date(localUpdatedAt).getTime();
}
