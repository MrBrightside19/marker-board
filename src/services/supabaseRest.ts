import { withTimeout } from "../utils/async";

/** Lectura/escritura REST directa a PostgREST (visible en Network, sin depender del cliente JS). */

const REST_TIMEOUT_MS = 15_000;

export function getSupabaseRestConfig(): { url: string; apiKey: string } | null {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/$/, "");
  const apiKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (!url || !apiKey) return null;
  return { url, apiKey };
}

export function isSupabaseRestConfigured(): boolean {
  return getSupabaseRestConfig() !== null;
}

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

/** GET PostgREST; no comparte cola con @supabase/supabase-js (evita bloqueos entre vistas). */
export async function restGetRows<T>(
  table: string,
  query: Record<string, string>
): Promise<T[]> {
  const config = getSupabaseRestConfig();
  if (!config) return [];

  const params = new URLSearchParams(query);
  const url = `${config.url}/rest/v1/${table}?${params}`;

  const response = await withTimeout(
    fetch(url, {
      method: "GET",
      headers: restHeaders(config.apiKey),
      cache: "no-store",
    }),
    REST_TIMEOUT_MS,
    `Tiempo de espera al leer ${table}`
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
  }

  return (await response.json()) as T[];
}

export async function restPatchRows(
  table: string,
  filterQuery: Record<string, string>,
  body: Record<string, unknown>
): Promise<void> {
  const config = getSupabaseRestConfig();
  if (!config) {
    throw new Error("Supabase no configurado");
  }

  const params = new URLSearchParams(filterQuery);
  const url = `${config.url}/rest/v1/${table}?${params}`;

  const response = await withTimeout(
    fetch(url, {
      method: "PATCH",
      headers: restHeaders(config.apiKey, { Prefer: "return=minimal" }),
      body: JSON.stringify(body),
      cache: "no-store",
    }),
    REST_TIMEOUT_MS,
    `Tiempo de espera al actualizar ${table}`
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }
}

export async function restGetMatchRow(
  matchId: string
): Promise<{ state: unknown; updated_at: string | null } | null> {
  const config = getSupabaseRestConfig();
  if (!config) {
    throw new Error("Supabase no configurado");
  }

  const query = new URLSearchParams({
    select: "state,updated_at",
    id: `eq.${matchId}`,
  });

  const response = await fetch(`${config.url}/rest/v1/matches?${query}`, {
    method: "GET",
    headers: restHeaders(config.apiKey),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
  }

  const rows = (await response.json()) as { state: unknown; updated_at: string | null }[];
  return rows[0] ?? null;
}

export async function restUpsertMatch(row: Record<string, unknown>): Promise<void> {
  const config = getSupabaseRestConfig();
  if (!config) {
    throw new Error("Supabase no configurado");
  }

  const response = await fetch(`${config.url}/rest/v1/matches`, {
    method: "POST",
    headers: restHeaders(config.apiKey, {
      Prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify(row),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
  }
}
