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
import { withTimeout } from "../utils/async";

function roleFromUser(user: User): UserRole {
  const role = user.user_metadata?.role;
  return role === "organizer" ? "organizer" : "spectator";
}

function displayNameFromUser(user: User): string {
  const fromMeta = user.user_metadata?.display_name;
  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();
  return user.email?.split("@")[0] || "Usuario";
}

function profileFromUser(user: User): UserProfile {
  return {
    id: user.id,
    role: roleFromUser(user),
    displayName: displayNameFromUser(user),
  };
}

let initPromise: Promise<void> | null = null;
let authListenerAttached = false;

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
    /** Espera a que la sesión inicial esté resuelta (compartido entre llamadas concurrentes). */
    async init() {
      if (this.initialized) return;
      if (!initPromise) {
        initPromise = this.bootstrapAuth().finally(() => {
          initPromise = null;
        });
      }
      await initPromise;
    },

    async bootstrapAuth() {
      const supabase = getSupabase();
      if (!supabase) {
        this.loading = false;
        this.initialized = true;
        return;
      }

      const applySession = async (session: Session | null) => {
        this.session = session;
        if (session?.user) {
          await this.syncProfile(session.user);
        } else {
          this.profile = null;
        }
      };

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("[auth] getSession", error.message);
        }
        await applySession(data.session ?? null);
      } catch (error) {
        console.error("[auth] bootstrap getSession", error);
        this.session = null;
        this.profile = null;
      }

      if (!authListenerAttached) {
        authListenerAttached = true;
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === "INITIAL_SESSION") return;

          if (event === "SIGNED_OUT") {
            this.session = null;
            this.profile = null;
            return;
          }

          if (event === "TOKEN_REFRESHED") return;

          if (event === "SIGNED_IN" || event === "USER_UPDATED") {
            if (!session?.user) return;
            this.session = session;
            try {
              await this.syncProfile(session.user);
            } catch (error) {
              console.error("[auth] onAuthStateChange profile", error);
              this.profile = profileFromUser(session.user);
            }
          }
        });
      }

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
      this.profile = profile ?? profileFromUser(user);
    },

    async signIn(email: string, password: string) {
      const { session } = await signInWithPassword(email, password);
      if (!session?.user) {
        throw new Error("No se pudo iniciar sesión. Verifica tu correo y contraseña.");
      }

      this.session = session;

      try {
        await withTimeout(
          this.syncProfile(session.user),
          12_000,
          "No se pudo cargar el perfil"
        );
      } catch (error) {
        console.error("[auth] signIn profile", error);
        this.profile = profileFromUser(session.user);
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
        try {
          this.profile =
            (await fetchProfile(user.id)) ||
            (await upsertProfile(user.id, role, displayName)) ||
            profileFromUser(user);
        } catch {
          this.profile = profileFromUser(user);
        }
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
