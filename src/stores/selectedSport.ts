import { defineStore } from "pinia";
import {
  getSportById,
  isSportId,
  type SportDefinition,
  type SportId,
} from "../types/sport";

const STORAGE_KEY = "selected-sport-id";

function readStoredSport(): SportId | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isSportId(stored) && getSportById(stored)?.available) {
    return stored;
  }
  return null;
}

/** Filtro de deporte en nav/inicio (opcional; sin valor = todos los deportes). */
export const useSelectedSportStore = defineStore("selectedSport", {
  state: () => ({
    sportId: readStoredSport() as SportId | null,
  }),

  getters: {
    hasSport(state): boolean {
      return state.sportId !== null;
    },
    sport(state): SportDefinition | undefined {
      return state.sportId ? getSportById(state.sportId) : undefined;
    },
    sportName(state): string {
      if (!state.sportId) return "Todos los deportes";
      return getSportById(state.sportId)?.name ?? state.sportId;
    },
    filterLabel(state): string {
      if (!state.sportId) return "Deporte";
      return getSportById(state.sportId)?.name ?? "Deporte";
    },
  },

  actions: {
    setSport(id: SportId) {
      const sport = getSportById(id);
      if (!sport?.available) return;
      this.sportId = id;
      localStorage.setItem(STORAGE_KEY, id);
    },

    clearSport() {
      this.sportId = null;
      localStorage.removeItem(STORAGE_KEY);
    },

    /** Solo aplica si la URL trae ?deporte=; no borra el filtro guardado si falta el query. */
    syncFromQuery(value: string | null | undefined) {
      if (!value) return;
      if (isSportId(value) && getSportById(value)?.available) {
        this.setSport(value);
      }
    },
  },
});
