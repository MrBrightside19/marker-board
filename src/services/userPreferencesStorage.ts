import {
  COUNTDOWN_SOUND_MAX_S,
  COUNTDOWN_SOUND_MIN_S,
  DEFAULT_USER_PREFERENCES,
  POLL_INTERVAL_MAX_MS,
  POLL_INTERVAL_MIN_MS,
  type AppTheme,
  type ControlShortcutAction,
  type ControlShortcuts,
  type ScoreboardScheme,
  type UserPreferences,
} from "../types/userPreferences";

const STORAGE_KEY = "marker-board-user-preferences";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizeShortcuts(raw: unknown): ControlShortcuts {
  const base = { ...DEFAULT_USER_PREFERENCES.controlShortcuts };
  if (!raw || typeof raw !== "object") return base;

  for (const key of Object.keys(base) as ControlShortcutAction[]) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      base[key] = value.trim();
    }
  }
  return base;
}

export function normalizeUserPreferences(partial?: Partial<UserPreferences>): UserPreferences {
  const envPoll = Number(import.meta.env.VITE_POLL_INTERVAL_MS);
  const defaultPoll =
    Number.isFinite(envPoll) && envPoll >= POLL_INTERVAL_MIN_MS
      ? Math.floor(envPoll)
      : DEFAULT_USER_PREFERENCES.pollIntervalMs;

  const pollIntervalMs = clamp(
    partial?.pollIntervalMs ?? defaultPoll,
    POLL_INTERVAL_MIN_MS,
    POLL_INTERVAL_MAX_MS
  );

  const appTheme: AppTheme =
    partial?.appTheme === "light" || partial?.appTheme === "system"
      ? partial.appTheme
      : partial?.appTheme === "dark"
        ? "dark"
        : DEFAULT_USER_PREFERENCES.appTheme;

  const scoreboardScheme: ScoreboardScheme =
    partial?.scoreboardScheme === "light" ? "light" : "dark";

  const countdownSoundFromSeconds = clamp(
    partial?.countdownSoundFromSeconds ?? DEFAULT_USER_PREFERENCES.countdownSoundFromSeconds,
    COUNTDOWN_SOUND_MIN_S,
    COUNTDOWN_SOUND_MAX_S
  );

  return {
    pollIntervalMs,
    appTheme,
    scoreboardScheme,
    countdownSoundFromSeconds,
    controlShortcuts: normalizeShortcuts(partial?.controlShortcuts),
  };
}

export function readUserPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeUserPreferences();
    return normalizeUserPreferences(JSON.parse(raw) as Partial<UserPreferences>);
  } catch {
    return normalizeUserPreferences();
  }
}

export function writeUserPreferences(prefs: UserPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeUserPreferences(prefs)));
}

export function getResolvedAppTheme(prefs: UserPreferences): "dark" | "light" {
  if (prefs.appTheme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return prefs.appTheme;
}

export function applyUserPreferencesToDocument(prefs = readUserPreferences()): void {
  const normalized = normalizeUserPreferences(prefs);
  const resolvedTheme = getResolvedAppTheme(normalized);

  document.documentElement.dataset.appTheme = resolvedTheme;
  document.documentElement.dataset.appThemePreference = normalized.appTheme;
  document.documentElement.dataset.scoreboardScheme = normalized.scoreboardScheme;

  const darkBoard = normalized.scoreboardScheme === "dark";
  document.documentElement.style.setProperty(
    "--scoreboard-bg",
    darkBoard ? "#000000" : "#ffffff"
  );
  document.documentElement.style.setProperty(
    "--scoreboard-fg",
    darkBoard ? "#ffffff" : "#000000"
  );
  document.documentElement.style.setProperty(
    "--scoreboard-muted",
    darkBoard ? "rgba(255, 255, 255, 0.55)" : "rgba(0, 0, 0, 0.55)"
  );
  document.documentElement.style.setProperty(
    "--scoreboard-accent-bg",
    darkBoard ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
  );

  document.documentElement.style.setProperty("--app-poll-interval-ms", String(normalized.pollIntervalMs));
  document.documentElement.style.setProperty(
    "--app-countdown-sound-ms",
    String(normalized.countdownSoundFromSeconds * 1000)
  );
}

let systemThemeMedia: MediaQueryList | null = null;

export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => undefined;
  }
  systemThemeMedia = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onChange();
  systemThemeMedia.addEventListener("change", handler);
  return () => systemThemeMedia?.removeEventListener("change", handler);
}
