import type { UserRole, UserProfile } from "../types/auth";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";

type ProfileRow = {
  id: string;
  role: UserRole;
  display_name: string | null;
  created_at?: string;
};

function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    role: row.role,
    displayName: row.display_name?.trim() || "Usuario",
    createdAt: row.created_at,
  };
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, display_name, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    console.error("[auth] fetchProfile", error?.message);
    return null;
  }

  return mapProfile(data as ProfileRow);
}

export async function upsertProfile(
  userId: string,
  role: UserRole,
  displayName: string
): Promise<UserProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        role,
        display_name: displayName.trim() || "Usuario",
      },
      { onConflict: "id" }
    )
    .select("id, role, display_name, created_at")
    .single();

  if (error || !data) {
    console.error("[auth] upsertProfile", error?.message);
    return null;
  }

  return mapProfile(data as ProfileRow);
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase no configurado");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(
  email: string,
  password: string,
  role: UserRole,
  displayName: string
) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase no configurado");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        display_name: displayName.trim(),
      },
    },
  });
  if (error) throw error;

  if (data.session && data.user) {
    await upsertProfile(data.user.id, role, displayName);
  }

  return {
    session: data.session,
    user: data.user,
    needsEmailConfirmation: Boolean(data.user && !data.session),
  };
}

export async function signOut() {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export { isSupabaseConfigured };
