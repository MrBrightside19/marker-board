import { defineStore } from "pinia";
import {
  applyUserPreferencesToDocument,
  normalizeUserPreferences,
  readUserPreferences,
  watchSystemTheme,
  writeUserPreferences,
} from "../services/userPreferencesStorage";
import {
  DEFAULT_USER_PREFERENCES,
  type ControlShortcutAction,
  type UserPreferences,
} from "../types/userPreferences";

export const useUserPreferencesStore = defineStore("userPreferences", {
  state: () => ({
    prefs: readUserPreferences() as UserPreferences,
    hydrated: false,
  }),

  getters: {
    pollIntervalMs: (state) => state.prefs.pollIntervalMs,
    countdownSoundFromSeconds: (state) => state.prefs.countdownSoundFromSeconds,
  },

  actions: {
    hydrate() {
      if (this.hydrated) return;
      this.prefs = readUserPreferences();
      applyUserPreferencesToDocument(this.prefs);
      watchSystemTheme(() => {
        if (this.prefs.appTheme === "system") {
          applyUserPreferencesToDocument(this.prefs);
        }
      });
      this.hydrated = true;
    },

    patch(partial: Partial<UserPreferences>) {
      this.prefs = normalizeUserPreferences({ ...this.prefs, ...partial });
      writeUserPreferences(this.prefs);
      applyUserPreferencesToDocument(this.prefs);
    },

    setShortcut(action: ControlShortcutAction, code: string) {
      this.patch({
        controlShortcuts: {
          ...this.prefs.controlShortcuts,
          [action]: code,
        },
      });
    },

    resetShortcuts() {
      this.patch({
        controlShortcuts: { ...DEFAULT_USER_PREFERENCES.controlShortcuts },
      });
    },

    resetAll() {
      this.prefs = normalizeUserPreferences();
      writeUserPreferences(this.prefs);
      applyUserPreferencesToDocument(this.prefs);
    },
  },
});
