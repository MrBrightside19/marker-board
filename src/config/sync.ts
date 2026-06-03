import { readUserPreferences } from "../services/userPreferencesStorage";
import { POLL_INTERVAL_MIN_MS } from "../types/userPreferences";

const DEFAULT_POLL_INTERVAL_MS = 5000;

/** Intervalo de poll REST (live, marcador remoto, torneo público). */
export function getPollIntervalMs(): number {
  return readUserPreferences().pollIntervalMs || DEFAULT_POLL_INTERVAL_MS;
}

export { POLL_INTERVAL_MIN_MS };
