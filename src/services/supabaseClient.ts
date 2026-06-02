import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getEnv() {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getEnv();
  return Boolean(url && anonKey);
}

/** Copia headers del Request/init sin perder apikey (requerido por Supabase). */
function mergeFetchHeaders(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  apiKey: string
): Headers {
  const headers = new Headers();

  if (input instanceof Request) {
    input.headers.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  if (!headers.has("apikey")) {
    headers.set("apikey", apiKey);
  }

  headers.set("Cache-Control", "no-cache");
  headers.set("Pragma", "no-cache");

  return headers;
}

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const { url, anonKey } = getEnv();
  if (!url || !anonKey) return null;

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        apikey: anonKey,
      },
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          headers: mergeFetchHeaders(input, init, anonKey),
        }),
    },
  });
  return client;
}
