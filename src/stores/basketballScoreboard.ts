import { defineStore } from "pinia";
import {
  DEFAULT_BASKETBALL_STATE,
  type BasketballScoreboardState,
} from "../types/basketballScoreboard";

const STORAGE = {
  localTeam: "bb-local-team",
  visitTeam: "bb-visit-team",
  pointsLocal: "bb-points-local",
  pointsVisit: "bb-points-visit",
  foulsLocal: "bb-fouls-local",
  foulsVisit: "bb-fouls-visit",
  gamePeriod: "bb-game-period",
  timeGame: "bb-time-game",
  isPaused: "bb-isPaused",
  updatedAt: "bb-updated-at",
} as const;

function readNumber(key: string, fallback: number): number {
  const parsed = Number(localStorage.getItem(key));
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

export function createFreshBasketballState(options: {
  localTeam: string;
  visitTeam: string;
  timeGame?: string;
}): BasketballScoreboardState {
  return normalizeBasketballState({
    ...DEFAULT_BASKETBALL_STATE,
    localTeam: options.localTeam.trim() || DEFAULT_BASKETBALL_STATE.localTeam,
    visitTeam: options.visitTeam.trim() || DEFAULT_BASKETBALL_STATE.visitTeam,
    timeGame: options.timeGame ?? DEFAULT_BASKETBALL_STATE.timeGame,
    isPaused: true,
    updatedAt: new Date().toISOString(),
  });
}

export function normalizeBasketballState(
  state: Partial<BasketballScoreboardState>
): BasketballScoreboardState {
  return {
    ...DEFAULT_BASKETBALL_STATE,
    ...state,
    sportType: DEFAULT_BASKETBALL_STATE.sportType,
    pointsLocal: Math.max(0, state.pointsLocal ?? 0),
    pointsVisit: Math.max(0, state.pointsVisit ?? 0),
    foulsLocal: Math.max(0, state.foulsLocal ?? 0),
    foulsVisit: Math.max(0, state.foulsVisit ?? 0),
    gamePeriod: Math.max(1, state.gamePeriod ?? 1),
  };
}

export function readBasketballStateFromLocalStorage(): BasketballScoreboardState {
  return normalizeBasketballState({
    localTeam: readString(STORAGE.localTeam, DEFAULT_BASKETBALL_STATE.localTeam),
    visitTeam: readString(STORAGE.visitTeam, DEFAULT_BASKETBALL_STATE.visitTeam),
    pointsLocal: readNumber(STORAGE.pointsLocal, 0),
    pointsVisit: readNumber(STORAGE.pointsVisit, 0),
    foulsLocal: readNumber(STORAGE.foulsLocal, 0),
    foulsVisit: readNumber(STORAGE.foulsVisit, 0),
    gamePeriod: readNumber(STORAGE.gamePeriod, 1),
    timeGame: readString(STORAGE.timeGame, DEFAULT_BASKETBALL_STATE.timeGame),
    isPaused: readBool(STORAGE.isPaused, true),
    updatedAt: readString(STORAGE.updatedAt, ""),
  });
}

export function writeBasketballStateToLocalStorage(state: BasketballScoreboardState): void {
  const normalized = normalizeBasketballState(state);
  localStorage.setItem(STORAGE.localTeam, normalized.localTeam);
  localStorage.setItem(STORAGE.visitTeam, normalized.visitTeam);
  localStorage.setItem(STORAGE.pointsLocal, String(normalized.pointsLocal));
  localStorage.setItem(STORAGE.pointsVisit, String(normalized.pointsVisit));
  localStorage.setItem(STORAGE.foulsLocal, String(normalized.foulsLocal));
  localStorage.setItem(STORAGE.foulsVisit, String(normalized.foulsVisit));
  localStorage.setItem(STORAGE.gamePeriod, String(normalized.gamePeriod));
  localStorage.setItem(STORAGE.timeGame, normalized.timeGame);
  localStorage.setItem(STORAGE.isPaused, String(normalized.isPaused));
  if (normalized.updatedAt) {
    localStorage.setItem(STORAGE.updatedAt, normalized.updatedAt);
  }
}

export const useBasketballScoreboardStore = defineStore("basketballScoreboard", {
  state: () => ({
    state: { ...DEFAULT_BASKETBALL_STATE } as BasketballScoreboardState,
  }),
  actions: {
    hydrateFromLocalStorage() {
      this.state = readBasketballStateFromLocalStorage();
    },
    setState(nextState: BasketballScoreboardState, persist = true) {
      this.state = normalizeBasketballState({
        ...nextState,
        updatedAt: nextState.updatedAt || new Date().toISOString(),
      });
      if (persist) {
        writeBasketballStateToLocalStorage(this.state);
      }
    },
    updatePartial(partial: Partial<BasketballScoreboardState>, persist = true) {
      this.setState(
        {
          ...this.state,
          ...partial,
          updatedAt: new Date().toISOString(),
        },
        persist
      );
    },
  },
});
