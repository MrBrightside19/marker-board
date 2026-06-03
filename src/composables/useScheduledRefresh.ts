import { onUnmounted, type Ref } from "vue";
import { getPollIntervalMs } from "../config/sync";

/** Mínimo entre dos lecturas REST seguidas (salvo entrada forzada a la vista). */
const MIN_FETCH_GAP_MS = 2_000;
/** Tras un aviso de controles/torneo, esperar antes de refetch. */
const BUMP_LEAD_MS = 1_500;

export type ScheduledRefreshOptions = {
  loading: Ref<boolean>;
  isActive: () => boolean;
  load: (showSpinner: boolean) => Promise<void>;
};

/**
 * Un solo intervalo de poll + cola de peticiones.
 * Evita ráfagas cuando hay bump, visibility, cambio de filtro y poll a la vez.
 */
export function useScheduledRefresh(options: ScheduledRefreshOptions) {
  let pollTimer: number | null = null;
  let bumpTimer: number | null = null;
  let gapTimer: number | null = null;
  let started = false;
  let inFlight = false;
  let pending = false;
  let lastFetchAt = 0;

  function clearGapTimer() {
    if (gapTimer !== null) {
      window.clearTimeout(gapTimer);
      gapTimer = null;
    }
  }

  async function runFetch(showSpinner: boolean) {
    if (!options.isActive()) return;

    if (inFlight) {
      pending = true;
      return;
    }

    inFlight = true;
    if (showSpinner) options.loading.value = true;

    try {
      await options.load(showSpinner);
      lastFetchAt = Date.now();
    } finally {
      inFlight = false;
      if (showSpinner && options.isActive()) {
        options.loading.value = false;
      }

      if (pending && options.isActive()) {
        pending = false;
        const wait = Math.max(0, MIN_FETCH_GAP_MS - (Date.now() - lastFetchAt));
        clearGapTimer();
        gapTimer = window.setTimeout(() => {
          gapTimer = null;
          void runFetch(false);
        }, wait);
      }
    }
  }

  function refresh(opts?: { showSpinner?: boolean; force?: boolean }) {
    if (!options.isActive()) return;

    const showSpinner = opts?.showSpinner ?? false;
    const force = opts?.force ?? false;
    const elapsed = Date.now() - lastFetchAt;

    if (!force && lastFetchAt > 0 && elapsed < MIN_FETCH_GAP_MS) {
      pending = true;
      clearGapTimer();
      gapTimer = window.setTimeout(() => {
        gapTimer = null;
        void runFetch(false);
      }, MIN_FETCH_GAP_MS - elapsed);
      return;
    }

    void runFetch(showSpinner);
  }

  function scheduleBumpRefresh() {
    if (!options.isActive()) return;
    if (bumpTimer !== null) window.clearTimeout(bumpTimer);
    bumpTimer = window.setTimeout(() => {
      bumpTimer = null;
      refresh({ showSpinner: false });
    }, BUMP_LEAD_MS);
  }

  function start() {
    if (started) {
      refresh({ showSpinner: false, force: true });
      return;
    }
    started = true;
    lastFetchAt = 0;
    refresh({ showSpinner: true, force: true });

    if (pollTimer !== null) window.clearInterval(pollTimer);
    pollTimer = window.setInterval(() => {
      if (!options.isActive()) return;
      refresh({ showSpinner: false });
    }, getPollIntervalMs());
  }

  function stop() {
    started = false;
    pending = false;
    inFlight = false;

    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
    if (bumpTimer !== null) {
      window.clearTimeout(bumpTimer);
      bumpTimer = null;
    }
    clearGapTimer();
    options.loading.value = false;
  }

  function onVisibilityChange() {
    if (document.visibilityState !== "visible" || !options.isActive()) return;
    const elapsed = Date.now() - lastFetchAt;
    if (elapsed >= getPollIntervalMs() - 500) {
      refresh({ showSpinner: false, force: true });
    }
  }

  onUnmounted(stop);

  return {
    start,
    stop,
    refresh,
    scheduleBumpRefresh,
    onVisibilityChange,
  };
}
