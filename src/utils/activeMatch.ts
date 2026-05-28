const STORAGE_KEY = "active-match-id";

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

export function getPublicLiveUrl(matchId: string): string {
  return `${window.location.origin}/marker-board/live/${matchId}`;
}
