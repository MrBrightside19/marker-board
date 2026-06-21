import { applyUserPreferencesToDocument } from "../services/userPreferencesStorage";

/** Rutas sin nav principal (marcador, controles, live, overlay). */
export const BROADCAST_ROUTE_NAMES = new Set([
  "board",
  "controls",
  "live",
  "tournament-live",
  "overlay",
  "tournament-overlay",
  "basketball-board",
  "basketball-controls",
  "basketball-live",
]);

export const FRAMELESS_BROADCAST_ROUTE_NAMES = new Set([
  "live",
  "tournament-live",
  "overlay",
  "tournament-overlay",
  "basketball-live",
]);

const SCOREBOARD_DOCUMENT_CLASS = "broadcast-scoreboard-page";

export function isBroadcastRoute(routeName: string | undefined | null): boolean {
  return BROADCAST_ROUTE_NAMES.has(routeName ?? "");
}

export function isFramelessBroadcastRoute(routeName: string | undefined | null): boolean {
  return FRAMELESS_BROADCAST_ROUTE_NAMES.has(routeName ?? "");
}

/** Marca live/overlay para no aplicar tema de app; /board usa esquema de marcador. */
export function syncBroadcastDocumentClass(routeName: string | undefined | null): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const frameless = isFramelessBroadcastRoute(routeName);
  const isScoreboard = routeName === "board" || routeName === "basketball-board";

  if (frameless) {
    root.dataset.broadcastFrameless = "true";
  } else {
    delete root.dataset.broadcastFrameless;
  }

  if (isScoreboard) {
    root.classList.add(SCOREBOARD_DOCUMENT_CLASS);
  } else {
    root.classList.remove(SCOREBOARD_DOCUMENT_CLASS);
  }

  if (!frameless) {
    applyUserPreferencesToDocument();
  }
}
