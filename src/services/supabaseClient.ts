import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseRestConfigured } from "./supabaseRest";

let client: SupabaseClient | null = null;

function getEnv() {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return isSupabaseRestConfigured();
}

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const { url, anonKey } = getEnv();
  if (!url || !anonKey) return null;

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: localStorage,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        apikey: anonKey,
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    },
  });
  return client;
}
