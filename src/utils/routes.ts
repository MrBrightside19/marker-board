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

export function basketballBoardRoute(matchId?: string) {
  return {
    path: "/basquet/board",
    query: matchId ? { matchId } : {},
  };
}

export function basketballControlsRoute(matchId?: string) {
  return {
    path: "/basquet/controls",
    query: matchId ? { matchId } : {},
  };
}

export function basketballLiveRoute(matchId: string) {
  return { path: `/basquet/live/${matchId}` };
}

export function tournamentPublicRoute(tournamentId: string) {
  return { path: `/torneo/${tournamentId}` };
}

/** URL absoluta para compartir el torneo con espectadores. */
export function getTournamentPublicUrl(tournamentId: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}/torneo/${tournamentId}`;
}

/** Abre el marcador TV en una pestaña nueva (para pantalla de cancha). */
export function openBoardInNewTab(router: Router, matchId?: string): void {
  const href = router.resolve(boardRoute(matchId)).href;
  window.open(href, "_blank", "noopener,noreferrer");
}
