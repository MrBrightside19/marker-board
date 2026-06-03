export type AppTheme = "dark" | "light" | "system";
export type ScoreboardScheme = "dark" | "light";

/** Acciones del controlador de hockey enlazables a teclado. */
export type ControlShortcutAction =
  | "goalLocalPlus"
  | "goalLocalMinus"
  | "goalVisitPlus"
  | "goalVisitMinus"
  | "penalizedLocal"
  | "penalizedVisit"
  | "togglePause"
  | "changePeriod"
  | "timePlus5"
  | "timeMinus5"
  | "timePlus10"
  | "timeMinus10";

export type ControlShortcuts = Record<ControlShortcutAction, string>;

export interface UserPreferences {
  pollIntervalMs: number;
  appTheme: AppTheme;
  scoreboardScheme: ScoreboardScheme;
  /** Segundos restantes en los que empiezan los pitidos (1–30). */
  countdownSoundFromSeconds: number;
  controlShortcuts: ControlShortcuts;
}

export const CONTROL_SHORTCUT_LABELS: Record<ControlShortcutAction, string> = {
  goalLocalPlus: "Gol local +",
  goalLocalMinus: "Gol local −",
  goalVisitPlus: "Gol visita +",
  goalVisitMinus: "Gol visita −",
  penalizedLocal: "Penalidad local",
  penalizedVisit: "Penalidad visita",
  togglePause: "Pausar / continuar",
  changePeriod: "Cambiar periodo",
  timePlus5: "Tiempo de juego +5 s",
  timeMinus5: "Tiempo de juego −5 s",
  timePlus10: "Tiempo de juego +10 s",
  timeMinus10: "Tiempo de juego −10 s",
};

export const DEFAULT_CONTROL_SHORTCUTS: ControlShortcuts = {
  goalLocalPlus: "KeyQ",
  goalLocalMinus: "KeyA",
  goalVisitPlus: "KeyP",
  goalVisitMinus: "KeyL",
  penalizedLocal: "Digit1",
  penalizedVisit: "Digit2",
  togglePause: "Space",
  changePeriod: "KeyN",
  timePlus5: "ArrowUp",
  timeMinus5: "ArrowDown",
  timePlus10: "PageUp",
  timeMinus10: "PageDown",
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  pollIntervalMs: 5000,
  appTheme: "dark",
  scoreboardScheme: "dark",
  countdownSoundFromSeconds: 5,
  controlShortcuts: { ...DEFAULT_CONTROL_SHORTCUTS },
};

export const POLL_INTERVAL_MIN_MS = 2000;
export const POLL_INTERVAL_MAX_MS = 60_000;
export const COUNTDOWN_SOUND_MIN_S = 1;
export const COUNTDOWN_SOUND_MAX_S = 30;
