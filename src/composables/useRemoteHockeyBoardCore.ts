import { type MaybeRefOrGetter, computed, onMounted, onUnmounted, ref, toValue, watch } from "vue";
import { fetchMatchState, isRemoteSyncEnabled } from "../services/matchSync";
import { DEFAULT_SCOREBOARD_STATE, type ScoreboardState } from "../types/scoreboard";
import { getPollIntervalMs } from "../config/sync";
import { getRunningClocks, parseTimeToMs } from "../utils/scoreboardClock";
import { GAME_TIME_ENDED_EVENT, handleGameTimeTick } from "../utils/gameTimeAlert";
import { isSameScoreboardState } from "../utils/scoreboardSync";

/** Poll del marcador hockey por matchId (live, overlay y transmisión fija de torneo). */
export function useRemoteHockeyBoardCore(
  matchIdSource: MaybeRefOrGetter<string>,
  options?: { documentTitle?: string }
) {
  const matchId = computed(() => toValue(matchIdSource) || "");
  const pollIntervalMs = getPollIntervalMs();

  const snapshot = ref<ScoreboardState>({ ...DEFAULT_SCOREBOARD_STATE });
  const lastServerRevision = ref("");
  const nowMs = ref(Date.now());
  const loadError = ref("");
  const showTimeEndedAlert = ref(false);
  const prevTimeGame = ref("");
  const isPolling = ref(false);
  const lastSyncAt = ref<number | null>(null);
  const fetchCount = ref(0);

  const isRemoteConfigured = computed(() => isRemoteSyncEnabled());
  const clocks = computed(() => getRunningClocks(snapshot.value, nowMs.value));

  const showPowerPlayLocal = computed(
    () => snapshot.value.penalizedVisit && !snapshot.value.penalizedLocal
  );
  const showPowerPlayVisit = computed(
    () => snapshot.value.penalizedLocal && !snapshot.value.penalizedVisit
  );
  const showThreeOnThree = computed(
    () => snapshot.value.penalizedLocal && snapshot.value.penalizedVisit
  );
  const showPenaltyClock = computed(() => parseTimeToMs(clocks.value.penaltyGame) > 0);

  let tickInterval: number | null = null;
  let pollInterval: number | null = null;

  function stopTimers() {
    isPolling.value = false;
    if (tickInterval !== null) {
      window.clearInterval(tickInterval);
      tickInterval = null;
    }
    if (pollInterval !== null) {
      window.clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function startTimers() {
    if (pollInterval !== null) return;
    isPolling.value = true;

    tickInterval = window.setInterval(() => {
      nowMs.value = Date.now();
    }, 1000);

    pollInterval = window.setInterval(() => {
      void refreshFromServer();
    }, pollIntervalMs);
  }

  function setupPolling() {
    stopTimers();

    if (!matchId.value || !isRemoteSyncEnabled()) {
      return;
    }

    startTimers();
    void refreshFromServer().then(() => {
      prevTimeGame.value = clocks.value.timeGame;
    });
  }

  async function refreshFromServer() {
    const id = matchId.value;
    if (!id || !isRemoteSyncEnabled()) return;

    fetchCount.value += 1;
    if (import.meta.env.DEV) {
      console.debug(`[live] poll #${fetchCount.value}`, id);
    }

    try {
      const result = await fetchMatchState(id);
      lastSyncAt.value = Date.now();

      if (!result) {
        if (!snapshot.value.updatedAt) {
          loadError.value = "No se encontró el partido en el servidor.";
        }
        return;
      }

      loadError.value = "";
      const unchanged =
        Boolean(result.serverUpdatedAt) &&
        lastServerRevision.value === result.serverUpdatedAt &&
        isSameScoreboardState(snapshot.value, result.state);

      if (!unchanged) {
        lastServerRevision.value = result.serverUpdatedAt;
        snapshot.value = result.state;
      }

      if (options?.documentTitle) {
        document.title = options.documentTitle;
      }
    } catch (error) {
      console.error("[live] poll error", error);
      loadError.value =
        error instanceof Error ? error.message : "Error al leer el marcador del servidor.";
    }
  }

  const onGameTimeEnded = () => {
    showTimeEndedAlert.value = true;
  };

  watch(
    () => clocks.value.timeGame,
    (time) => {
      const previousMs = parseTimeToMs(prevTimeGame.value || time);
      const nextMs = parseTimeToMs(time);

      if (prevTimeGame.value) {
        handleGameTimeTick(previousMs, nextMs, snapshot.value.isPaused);
      }

      if (time !== "00:00") {
        showTimeEndedAlert.value = false;
      }
      prevTimeGame.value = time;
    }
  );

  function onVisibilityChange() {
    if (document.visibilityState === "visible" && matchId.value && isRemoteSyncEnabled()) {
      void refreshFromServer();
    }
  }

  watch(
    () => matchId.value,
    (nextId, prevId) => {
      if (!nextId || nextId === prevId) return;
      loadError.value = "";
      lastServerRevision.value = "";
      snapshot.value = { ...DEFAULT_SCOREBOARD_STATE };
      setupPolling();
    }
  );

  onMounted(() => {
    if (options?.documentTitle) {
      document.title = options.documentTitle;
    }
    window.addEventListener(GAME_TIME_ENDED_EVENT, onGameTimeEnded);
    document.addEventListener("visibilitychange", onVisibilityChange);
    setupPolling();
  });

  onUnmounted(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener(GAME_TIME_ENDED_EVENT, onGameTimeEnded);
    stopTimers();
  });

  return {
    matchId,
    snapshot,
    clocks,
    loadError,
    isRemoteConfigured,
    isPolling,
    lastSyncAt,
    fetchCount,
    pollIntervalMs,
    showTimeEndedAlert,
    showPowerPlayLocal,
    showPowerPlayVisit,
    showThreeOnThree,
    showPenaltyClock,
    refreshFromServer,
    setupPolling,
    stopTimers,
  };
}
