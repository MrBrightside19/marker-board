export const ACTIVE_MATCH_STORAGE_KEY = "active-match-id";
export const ACTIVE_TOURNAMENT_STORAGE_KEY = "active-tournament-id";
export const ACTIVE_COURT_STORAGE_KEY = "active-court";
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

export function getStoredActiveMatchId(): string | null {
  return localStorage.getItem(STORAGE_KEY)?.trim() || null;
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

/** Limpia sesión de torneo (partido suelto u otro torneo). */
export function clearActiveTournamentSession(): void {
  setActiveTournamentId(null);
  setActiveCourt(null);
}

function buildAppUrl(pathSegment: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = `${base}${pathSegment}`.replace(/^\/\//, "/");
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Live publico de un partido suelto (sin torneo). */
export function getPublicLiveUrl(matchId: string): string {
  return buildAppUrl(`/live/${encodeURIComponent(matchId)}`);
}

/** Overlay (misma sync remota que el live). */
export function getOverlayUrl(matchId: string): string {
  return buildAppUrl(`/overlay/${encodeURIComponent(matchId)}`);
}

/** Live publico de básquet. */
export function getBasketballPublicLiveUrl(matchId: string): string {
  return buildAppUrl(`/basquet/live/${matchId}`);
}

/** Live publico fijo por cancha del torneo. */
export function getTournamentLiveUrl(tournamentId: string, court = "1"): string {
  const courtSlug = court.trim() || "1";
  return buildAppUrl(`/live/torneo/${tournamentId}/${encodeURIComponent(courtSlug)}`);
}

export function getActiveCourt(): string | null {
  return localStorage.getItem(ACTIVE_COURT_STORAGE_KEY)?.trim() || null;
}

export function setActiveCourt(court: string | null): void {
  if (court?.trim()) {
    localStorage.setItem(ACTIVE_COURT_STORAGE_KEY, court.trim());
  } else {
    localStorage.removeItem(ACTIVE_COURT_STORAGE_KEY);
  }
}
