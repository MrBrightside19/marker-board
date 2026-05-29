import { defineStore } from "pinia";
import type { Session, User } from "@supabase/supabase-js";
import type { UserProfile, UserRole } from "../types/auth";
import {
  fetchProfile,
  signInWithPassword,
  signOut as authSignOut,
  signUpWithPassword,
  upsertProfile,
} from "../services/authService";
import { getSupabase } from "../services/supabaseClient";

function roleFromUser(user: User): UserRole {
  const role = user.user_metadata?.role;
  return role === "organizer" ? "organizer" : "spectator";
}

function displayNameFromUser(user: User): string {
  const fromMeta = user.user_metadata?.display_name;
  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();
  return user.email?.split("@")[0] || "Usuario";
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    session: null as Session | null,
    profile: null as UserProfile | null,
    loading: true,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.session),
    userId: (state) => state.session?.user.id ?? null,
    isOrganizer: (state) => state.profile?.role === "organizer",
    isSpectator: (state) => state.profile?.role === "spectator",
    displayName: (state) =>
      state.profile?.displayName || state.session?.user.email || "Usuario",
  },

  actions: {
    async init() {
      if (this.initialized) return;

      const supabase = getSupabase();
      if (!supabase) {
        this.loading = false;
        this.initialized = true;
        return;
      }

      const { data } = await supabase.auth.getSession();
      this.session = data.session;
      if (this.session?.user) {
        await this.syncProfile(this.session.user);
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        this.session = session;
        if (session?.user) {
          await this.syncProfile(session.user);
        } else {
          this.profile = null;
        }
      });

      this.loading = false;
      this.initialized = true;
    },

    async syncProfile(user: User) {
      let profile = await fetchProfile(user.id);
      if (!profile) {
        profile = await upsertProfile(
          user.id,
          roleFromUser(user),
          displayNameFromUser(user)
        );
      }
      this.profile = profile;
    },

    async signIn(email: string, password: string) {
      const { session } = await signInWithPassword(email, password);
      if (!session) {
        throw new Error("No se pudo iniciar sesión. Verifica tu correo y contraseña.");
      }
      this.session = session;
      if (session.user) {
        await this.syncProfile(session.user);
      }
    },

    async signUp(
      email: string,
      password: string,
      role: UserRole,
      displayName: string
    ): Promise<{ needsEmailConfirmation: boolean }> {
      const { session, user, needsEmailConfirmation } = await signUpWithPassword(
        email,
        password,
        role,
        displayName
      );
      if (session) {
        this.session = session;
      }
      if (user && session) {
        this.profile =
          (await fetchProfile(user.id)) ||
          (await upsertProfile(user.id, role, displayName));
      }
      return { needsEmailConfirmation };
    },

    async signOut() {
      await authSignOut();
      this.session = null;
      this.profile = null;
    },
  },
});
