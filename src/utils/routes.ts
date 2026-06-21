/** Rutas con base /marker-board/ aplicada por vue-router */

import type { RouteLocationRaw, Router } from "vue-router";
import { normalizeCourt } from "./court";

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

export function overlayRoute(matchId: string) {
  return { path: `/overlay/${matchId}` };
}

export function tournamentLiveRoute(tournamentId: string, court = "1") {
  const courtSlug = normalizeCourt(court);
  return {
    path: `/live/torneo/${encodeURIComponent(tournamentId)}/${encodeURIComponent(courtSlug)}`,
  };
}

export function tournamentOverlayRoute(tournamentId: string, court = "1") {
  const courtSlug = normalizeCourt(court);
  return {
    path: `/overlay/torneo/${encodeURIComponent(tournamentId)}/${encodeURIComponent(courtSlug)}`,
  };
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

/** URL absoluta para compartir (respeta la base de vue-router, p. ej. /marker-board/). */
export function resolveShareUrl(router: Router, to: RouteLocationRaw): string {
  const { href } = router.resolve(to);
  if (/^https?:\/\//i.test(href)) return href;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${href.startsWith("/") ? href : `/${href}`}`;
}

/** URL absoluta para compartir el torneo con espectadores. */
export function getTournamentPublicUrl(tournamentId: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}/torneo/${tournamentId}`;
}

export { openHockeyBoardInNewTab as openBoardInNewTab } from "./operatorWindows";
