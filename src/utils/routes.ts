/** Rutas con base /marker-board/ aplicada por vue-router */

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
