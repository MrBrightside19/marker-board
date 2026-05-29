export const ACTIVE_MATCH_STORAGE_KEY = "active-match-id";
export const ACTIVE_TOURNAMENT_STORAGE_KEY = "active-tournament-id";
const STORAGE_KEY = ACTIVE_MATCH_STORAGE_KEY;

export function createMatchId(): string {
  return `partido-${Date.now().toString(36)}`;
}

/**
 * Obtiene o crea el partido activo compartido entre marcador, controles y live.
 * Prioridad: query de URL > localStorage > nuevo id.
 */
export function resolveActiveMatchId(fromQuery?: string | null): string {
  const fromUrl = fromQuery?.trim();
  if (fromUrl) {
    localStorage.setItem(STORAGE_KEY, fromUrl);
    return fromUrl;
  }

  const stored = localStorage.getItem(STORAGE_KEY)?.trim();
  if (stored) return stored;

  const created = createMatchId();
  localStorage.setItem(STORAGE_KEY, created);
  return created;
}

export function setActiveMatchId(matchId: string): void {
  localStorage.setItem(STORAGE_KEY, matchId.trim());
}

export function getActiveTournamentId(): string | null {
  return localStorage.getItem(ACTIVE_TOURNAMENT_STORAGE_KEY)?.trim() || null;
}

export function setActiveTournamentId(tournamentId: string | null): void {
  if (tournamentId?.trim()) {
    localStorage.setItem(ACTIVE_TOURNAMENT_STORAGE_KEY, tournamentId.trim());
  } else {
    localStorage.removeItem(ACTIVE_TOURNAMENT_STORAGE_KEY);
  }
}

export function getPublicLiveUrl(matchId: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = `${base}/live/${matchId}`.replace(/^\/\//, "/");
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}
