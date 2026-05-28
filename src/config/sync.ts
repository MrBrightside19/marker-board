const DEFAULT_POLL_INTERVAL_MS = 5000;
const MIN_POLL_INTERVAL_MS = 1000;

/** Intervalo de poll REST (live y marcador remoto). Configurable con VITE_POLL_INTERVAL_MS */
export function getPollIntervalMs(): number {
  const raw = import.meta.env.VITE_POLL_INTERVAL_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < MIN_POLL_INTERVAL_MS) {
    return DEFAULT_POLL_INTERVAL_MS;
  }
  return Math.floor(parsed);
}
