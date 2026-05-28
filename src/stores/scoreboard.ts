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

export function readScoreboardStateFromLocalStorage(): ScoreboardState {
  return {
    localTeam: readString(STORAGE_MAP.localTeam, DEFAULT_SCOREBOARD_STATE.localTeam),
    visitTeam: readString(STORAGE_MAP.visitTeam, DEFAULT_SCOREBOARD_STATE.visitTeam),
    goalLocal: readNumber(STORAGE_MAP.goalLocal, DEFAULT_SCOREBOARD_STATE.goalLocal),
    goalVisit: readNumber(STORAGE_MAP.goalVisit, DEFAULT_SCOREBOARD_STATE.goalVisit),
    gamePeriod: readNumber(STORAGE_MAP.gamePeriod, DEFAULT_SCOREBOARD_STATE.gamePeriod),
    timeGame: readString(STORAGE_MAP.timeGame, DEFAULT_SCOREBOARD_STATE.timeGame),
    penaltyGame: readString(STORAGE_MAP.penaltyGame, DEFAULT_SCOREBOARD_STATE.penaltyGame),
    isPaused: readBool(STORAGE_MAP.isPaused, DEFAULT_SCOREBOARD_STATE.isPaused),
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
      this.state = { ...nextState };
      if (persist) {
        writeScoreboardStateToLocalStorage(this.state);
      }
    },
    updatePartial(partial: Partial<ScoreboardState>, persist = true) {
      this.state = {
        ...this.state,
        ...partial,
        updatedAt: new Date().toISOString(),
      };
      if (persist) {
        writeScoreboardStateToLocalStorage(this.state);
      }
    },
  },
});

