/** Rutas con base /marker-board/ aplicada por vue-router */

import type { Router } from "vue-router";

export function boardRoute(matchId?: string) {
  return {
    path: "/board",
    query: matchId ? { matchId } : {},
  };
}

export function controlsRoute(matchId?: string) {
  return {
    path: "/controls",
    query: matchId ? { matchId } : {},
  };
}

export function liveRoute(matchId: string) {
  return { path: `/live/${matchId}` };
}

/** Abre el marcador TV en una pestaña nueva (para pantalla de cancha). */
export function openBoardInNewTab(router: Router, matchId?: string): void {
  const href = router.resolve(boardRoute(matchId)).href;
  window.open(href, "_blank", "noopener,noreferrer");
}
