import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeScoreboardState } from "../stores/scoreboard";
import type { ScoreboardState } from "../types/scoreboard";

type MatchRow = {
  id: string;
  state: ScoreboardState;
  updated_at?: string;
};

let supabaseClient: SupabaseClient | null = null;

function getEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return { url, anonKey };
}

export function isRemoteSyncEnabled(): boolean {
  const { url, anonKey } = getEnv();
  return Boolean(url && anonKey);
}

function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const { url, anonKey } = getEnv();
  if (!url || !anonKey) return null;
  supabaseClient = createClient(url, anonKey);
  return supabaseClient;
}

export async function publishMatchState(matchId: string, state: ScoreboardState): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !matchId) return;

  const payload: MatchRow = {
    id: matchId,
    state: { ...state, updatedAt: new Date().toISOString() },
  };

  const { error } = await supabase.from("matches").upsert(payload, { onConflict: "id" });
  if (error) {
    console.error("[matchSync] publish error", error.message);
  }
}

export async function fetchMatchState(matchId: string): Promise<ScoreboardState | null> {
  const supabase = getSupabase();
  if (!supabase || !matchId) return null;

  const { data, error } = await supabase
    .from("matches")
    .select("state")
    .eq("id", matchId)
    .maybeSingle();

  if (error) {
    console.error("[matchSync] fetch error", error.message);
    return null;
  }

  const raw = data?.state as ScoreboardState | undefined;
  return raw ? normalizeScoreboardState(raw) : null;
}
