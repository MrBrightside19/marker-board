import { defineStore } from "pinia";
import {
  DEFAULT_SCOREBOARD_STATE,
  type ScoreboardState,
} from "../types/scoreboard";

const STORAGE_MAP = {
  localTeam: "local-team",
  visitTeam: "visit-team",
  goalLocal: "goal-local",
  goalVisit: "goal-visit",
  gamePeriod: "game-period",
  timeGame: "time-game",
  penaltyGame: "penalty-game",
  isPaused: "isPaused",
  penalizedLocal: "penalized-local",
  penalizedVisit: "penalized-visit",
  penalizedTeamLegacy: "penalized-team",
} as const;

function readNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readString(key: string, fallback: string): string {
  return localStorage.getItem(key) || fallback;
}

function readBool(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "true";
}

function readPenalizedFlags(): { penalizedLocal: boolean; penalizedVisit: boolean } {
  const hasNewKeys =
    localStorage.getItem(STORAGE_MAP.penalizedLocal) !== null ||
    localStorage.getItem(STORAGE_MAP.penalizedVisit) !== null;

  if (hasNewKeys) {
    return {
      penalizedLocal: readBool(STORAGE_MAP.penalizedLocal, false),
      penalizedVisit: readBool(STORAGE_MAP.penalizedVisit, false),
    };
  }

  const legacy = localStorage.getItem(STORAGE_MAP.penalizedTeamLegacy);
  if (legacy === "local") return { penalizedLocal: true, penalizedVisit: false };
  if (legacy === "visit") return { penalizedLocal: false, penalizedVisit: true };
  return { penalizedLocal: false, penalizedVisit: false };
}

export function normalizeScoreboardState(state: ScoreboardState): ScoreboardState {
  const legacyTeam = (state as ScoreboardState & { penalizedTeam?: string }).penalizedTeam;
  let penalizedLocal = Boolean(state.penalizedLocal);
  let penalizedVisit = Boolean(state.penalizedVisit);

  if (legacyTeam === "local") {
    penalizedLocal = true;
    penalizedVisit = false;
  } else if (legacyTeam === "visit") {
    penalizedLocal = false;
    penalizedVisit = true;
  }

  return {
    ...DEFAULT_SCOREBOARD_STATE,
    ...state,
    penalizedLocal,
    penalizedVisit,
  };
}

export function readScoreboardStateFromLocalStorage(): ScoreboardState {
  const penalized = readPenalizedFlags();
  return {
    localTeam: readString(STORAGE_MAP.localTeam, DEFAULT_SCOREBOARD_STATE.localTeam),
    visitTeam: readString(STORAGE_MAP.visitTeam, DEFAULT_SCOREBOARD_STATE.visitTeam),
    goalLocal: readNumber(STORAGE_MAP.goalLocal, DEFAULT_SCOREBOARD_STATE.goalLocal),
    goalVisit: readNumber(STORAGE_MAP.goalVisit, DEFAULT_SCOREBOARD_STATE.goalVisit),
    gamePeriod: readNumber(STORAGE_MAP.gamePeriod, DEFAULT_SCOREBOARD_STATE.gamePeriod),
    timeGame: readString(STORAGE_MAP.timeGame, DEFAULT_SCOREBOARD_STATE.timeGame),
    penaltyGame: readString(STORAGE_MAP.penaltyGame, DEFAULT_SCOREBOARD_STATE.penaltyGame),
    isPaused: readBool(STORAGE_MAP.isPaused, DEFAULT_SCOREBOARD_STATE.isPaused),
    penalizedLocal: penalized.penalizedLocal,
    penalizedVisit: penalized.penalizedVisit,
    updatedAt: new Date().toISOString(),
  };
}

export function writeScoreboardStateToLocalStorage(state: ScoreboardState): void {
  localStorage.setItem(STORAGE_MAP.localTeam, state.localTeam);
  localStorage.setItem(STORAGE_MAP.visitTeam, state.visitTeam);
  localStorage.setItem(STORAGE_MAP.goalLocal, String(Math.max(state.goalLocal, 0)));
  localStorage.setItem(STORAGE_MAP.goalVisit, String(Math.max(state.goalVisit, 0)));
  localStorage.setItem(STORAGE_MAP.gamePeriod, String(state.gamePeriod));
  localStorage.setItem(STORAGE_MAP.timeGame, state.timeGame);
  localStorage.setItem(STORAGE_MAP.penaltyGame, state.penaltyGame);
  localStorage.setItem(STORAGE_MAP.isPaused, String(state.isPaused));
  localStorage.setItem(STORAGE_MAP.penalizedLocal, String(state.penalizedLocal));
  localStorage.setItem(STORAGE_MAP.penalizedVisit, String(state.penalizedVisit));
  localStorage.removeItem(STORAGE_MAP.penalizedTeamLegacy);
}

export const useScoreboardStore = defineStore("scoreboard", {
  state: () => ({
    state: { ...DEFAULT_SCOREBOARD_STATE } as ScoreboardState,
  }),
  actions: {
    hydrateFromLocalStorage() {
      this.state = readScoreboardStateFromLocalStorage();
    },
    setState(nextState: ScoreboardState, persist = true) {
      this.state = normalizeScoreboardState(nextState);
      if (persist) {
        writeScoreboardStateToLocalStorage(this.state);
      }
    },
    updatePartial(partial: Partial<ScoreboardState>, persist = true) {
      this.state = normalizeScoreboardState({
        ...this.state,
        ...partial,
        updatedAt: new Date().toISOString(),
      });
      if (persist) {
        writeScoreboardStateToLocalStorage(this.state);
      }
    },
  },
});
