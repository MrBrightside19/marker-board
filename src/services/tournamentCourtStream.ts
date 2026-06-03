import { normalizeCourt } from "../utils/court";
import { withTimeout } from "../utils/async";
import { getSupabaseRestConfig, isSupabaseRestConfigured } from "./supabaseRest";

const REST_TIMEOUT_MS = 20_000;

export type TournamentCourtStreamRow = {
  tournament_id: string;
  court: string;
  live_match_id: string | null;
  updated_at: string | null;
};

function restHeaders(apiKey: string, extra?: HeadersInit): Headers {
  return new Headers({
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    ...Object.fromEntries(new Headers(extra ?? {}).entries()),
  });
}

/** Partido en vivo actual para una cancha del torneo (URL fija de live/overlay). */
export async function fetchTournamentCourtLiveMatchId(
  tournamentId: string,
  court: string
): Promise<string | null> {
  if (!isSupabaseRestConfigured() || !tournamentId) return null;

  const config = getSupabaseRestConfig();
  if (!config) return null;

  const courtKey = normalizeCourt(court);
  const query = new URLSearchParams({
    select: "live_match_id,updated_at",
    tournament_id: `eq.${tournamentId}`,
    court: `eq.${courtKey}`,
  });

  const response = await withTimeout(
    fetch(`${config.url}/rest/v1/tournament_court_streams?${query}`, {
      method: "GET",
      headers: restHeaders(config.apiKey),
      cache: "no-store",
    }),
    REST_TIMEOUT_MS,
    "Tiempo de espera al leer la cancha del torneo"
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
  }

  const rows = (await response.json()) as { live_match_id: string | null }[];
  const id = rows[0]?.live_match_id?.trim();
  return id || null;
}

/** Apunta la transmisión fija de la cancha al partido activo (Controles al iniciar/avanzar). */
export async function setTournamentCourtLiveMatch(
  tournamentId: string,
  court: string,
  matchId: string | null
): Promise<void> {
  if (!isSupabaseRestConfigured() || !tournamentId) return;

  const config = getSupabaseRestConfig();
  if (!config) return;

  const courtKey = normalizeCourt(court);
  const row = {
    tournament_id: tournamentId,
    court: courtKey,
    live_match_id: matchId,
    updated_at: new Date().toISOString(),
  };

  const response = await withTimeout(
    fetch(`${config.url}/rest/v1/tournament_court_streams`, {
      method: "POST",
      headers: restHeaders(config.apiKey, {
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify(row),
      cache: "no-store",
    }),
    REST_TIMEOUT_MS,
    "Tiempo de espera al actualizar la transmisión del torneo"
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
  }
}
