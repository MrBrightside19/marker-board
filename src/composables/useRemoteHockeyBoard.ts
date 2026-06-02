import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { fetchMatchState, isRemoteSyncEnabled } from "../services/matchSync";
import { DEFAULT_SCOREBOARD_STATE, type ScoreboardState } from "../types/scoreboard";
import { getPollIntervalMs } from "../config/sync";
import { getRunningClocks, parseTimeToMs } from "../utils/scoreboardClock";
import { GAME_TIME_ENDED_EVENT, handleGameTimeTick } from "../utils/gameTimeAlert";
import { isSameScoreboardState } from "../utils/scoreboardSync";

/** Sync remota del marcador hockey (live + overlay). */
export function useRemoteHockeyBoard(options?: { documentTitle?: string }) {
  const route = useRoute();
  const pollIntervalMs = getPollIntervalMs();

  const snapshot = ref<ScoreboardState>({ ...DEFAULT_SCOREBOARD_STATE });
  const lastServerRevision = ref("");
  const nowMs = ref(Date.now());
  const loadError = ref("");
  const showTimeEndedAlert = ref(false);
  const prevTimeGame = ref("");

  const matchId = computed(() => route.params.matchId?.toString() || "");
  const isRemoteConfigured = isRemoteSyncEnabled();
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

  async function refreshFromServer() {
    if (!matchId.value) return;

    const result = await fetchMatchState(matchId.value);
    if (!result) {
      if (!snapshot.value.updatedAt) {
        loadError.value = "No se encontró el partido en el servidor.";
      }
      return;
    }

    loadError.value = "";
    const unchanged =
      lastServerRevision.value === result.serverUpdatedAt &&
      isSameScoreboardState(snapshot.value, result.state);

    if (!unchanged) {
      lastServerRevision.value = result.serverUpdatedAt;
      snapshot.value = result.state;
    }

    if (options?.documentTitle) {
      document.title = options.documentTitle;
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
    if (document.visibilityState === "visible" && matchId.value && isRemoteConfigured) {
      void refreshFromServer();
    }
  }

  onMounted(() => {
    if (!matchId.value || !isRemoteConfigured) return;

    tickInterval = window.setInterval(() => {
      nowMs.value = Date.now();
    }, 1000);

    pollInterval = window.setInterval(() => {
      void refreshFromServer();
    }, pollIntervalMs);

    window.addEventListener(GAME_TIME_ENDED_EVENT, onGameTimeEnded);
    document.addEventListener("visibilitychange", onVisibilityChange);

    void refreshFromServer().then(() => {
      prevTimeGame.value = clocks.value.timeGame;
    });
  });

  watch(matchId, async (nextId, prevId) => {
    if (!nextId || nextId === prevId || !isRemoteConfigured) return;
    loadError.value = "";
    lastServerRevision.value = "";
    snapshot.value = { ...DEFAULT_SCOREBOARD_STATE };
    await refreshFromServer();
    prevTimeGame.value = clocks.value.timeGame;
  });

  onUnmounted(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener(GAME_TIME_ENDED_EVENT, onGameTimeEnded);
    if (tickInterval) window.clearInterval(tickInterval);
    if (pollInterval) window.clearInterval(pollInterval);
  });

  return {
    matchId,
    snapshot,
    clocks,
    loadError,
    isRemoteConfigured,
    showTimeEndedAlert,
    showPowerPlayLocal,
    showPowerPlayVisit,
    showThreeOnThree,
    showPenaltyClock,
    pollIntervalMs,
  };
}
