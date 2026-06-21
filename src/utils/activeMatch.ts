import {
  basketballLiveRoute,
  liveRoute,
  overlayRoute,
  tournamentLiveRoute,
  tournamentOverlayRoute,
} from "./routes";

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

function buildAppUrl(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  const segment = path.replace(/^\//, "");
  return new URL(`${base}${segment}`, window.location.origin).href;
}

/** Live publico de un partido suelto (sin torneo). */
export function getPublicLiveUrl(matchId: string): string {
  return buildAppUrl(liveRoute(matchId).path);
}

/** Overlay (misma sync remota que el live). */
export function getOverlayUrl(matchId: string): string {
  return buildAppUrl(overlayRoute(matchId).path);
}

/** Live publico de básquet. */
export function getBasketballPublicLiveUrl(matchId: string): string {
  return buildAppUrl(basketballLiveRoute(matchId).path);
}

/** Live público fijo por cancha del torneo (misma URL para todos los partidos de esa cancha). */
export function getTournamentLiveUrl(tournamentId: string, court = "1"): string {
  return buildAppUrl(tournamentLiveRoute(tournamentId, court).path);
}

/** Overlay fijo por cancha del torneo (OBS: configurar una sola vez). */
export function getTournamentOverlayUrl(tournamentId: string, court = "1"): string {
  return buildAppUrl(tournamentOverlayRoute(tournamentId, court).path);
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
