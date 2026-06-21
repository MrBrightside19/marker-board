const REDIRECT_QUERY_KEY = "r";
const LEGACY_STORAGE_KEY = "404-redirect";

/** Ruta guardada por public/404.html (GitHub Pages) antes de cargar la SPA. */
export function consumeSpaRedirect(): string | null {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get(REDIRECT_QUERY_KEY);
  if (fromQuery) {
    url.searchParams.delete(REDIRECT_QUERY_KEY);
    const clean = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, "", clean || import.meta.env.BASE_URL);
    const path = decodeURIComponent(fromQuery).trim();
    if (!path || path === "/") return null;
    return path.startsWith("/") ? path : `/${path}`;
  }

  try {
    const legacy = sessionStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      sessionStorage.removeItem(LEGACY_STORAGE_KEY);
      const path = legacy.trim();
      if (!path || path === "/") return null;
      return path.startsWith("/") ? path : `/${path}`;
    }
  } catch {
    /* modo privado / storage bloqueado */
  }

  return null;
}
