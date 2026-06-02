import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { fetchTournamentCourtLiveMatchId } from "../services/tournamentCourtStream";
import { isRemoteSyncEnabled } from "../services/matchSync";
import { getPollIntervalMs } from "../config/sync";
import { courtFromRouteParam, formatCourtLabel } from "../utils/court";
import { useRemoteHockeyBoardCore } from "./useRemoteHockeyBoardCore";

/**
 * Live/overlay con URL fija por torneo + cancha.
 * Resuelve el matchId activo desde tournament_court_streams y sincroniza el marcador vía Supabase.
 */
export function useTournamentCourtBoard(options?: { documentTitle?: string }) {
  const route = useRoute();
  const pollIntervalMs = getPollIntervalMs();

  const tournamentId = computed(() => {
    const param = route.params.tournamentId;
    const raw = (Array.isArray(param) ? param[0] : param)?.toString().trim() || "";
    return raw ? decodeURIComponent(raw) : "";
  });

  const court = computed(() => courtFromRouteParam(route.params.court));
  const courtLabel = computed(() => formatCourtLabel(court.value));

  const resolvedMatchId = ref("");
  const streamError = ref("");
  const isPollingStream = ref(false);
  const streamFetchCount = ref(0);

  const core = useRemoteHockeyBoardCore(() => resolvedMatchId.value, options);

  let streamPollInterval: number | null = null;

  function stopStreamPoll() {
    isPollingStream.value = false;
    if (streamPollInterval !== null) {
      window.clearInterval(streamPollInterval);
      streamPollInterval = null;
    }
  }

  async function refreshCourtStream() {
    const tid = tournamentId.value;
    if (!tid || !isRemoteSyncEnabled()) return;

    streamFetchCount.value += 1;

    try {
      const liveMatchId = await fetchTournamentCourtLiveMatchId(tid, court.value);
      streamError.value = "";

      if (liveMatchId !== resolvedMatchId.value) {
        resolvedMatchId.value = liveMatchId ?? "";
        if (!liveMatchId) {
          core.stopTimers();
          core.loadError.value = "";
        } else {
          core.setupPolling();
        }
      }
    } catch (error) {
      console.error("[tournament-court] stream poll", error);
      streamError.value =
        error instanceof Error ? error.message : "No se pudo leer la cancha del torneo.";
    }
  }

  function startStreamPoll() {
    if (streamPollInterval !== null) return;
    if (!tournamentId.value || !isRemoteSyncEnabled()) return;

    isPollingStream.value = true;
    void refreshCourtStream();

    streamPollInterval = window.setInterval(() => {
      void refreshCourtStream();
    }, pollIntervalMs);
  }

  function onVisibilityChange() {
    if (document.visibilityState === "visible" && tournamentId.value) {
      void refreshCourtStream();
    }
  }

  watch(resolvedMatchId, (nextId, prevId) => {
    if (!nextId || nextId === prevId) return;
    core.setupPolling();
  });

  watch([tournamentId, court], ([nextTid, nextCourt], [prevTid, prevCourt]) => {
    if (!nextTid || (nextTid === prevTid && nextCourt === prevCourt)) return;
    resolvedMatchId.value = "";
    streamError.value = "";
    core.stopTimers();
    stopStreamPoll();
    startStreamPoll();
  });

  onMounted(() => {
    document.addEventListener("visibilitychange", onVisibilityChange);
    startStreamPoll();
  });

  onUnmounted(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    stopStreamPoll();
  });

  const waitingForMatch = computed(
    () => Boolean(tournamentId.value) && !resolvedMatchId.value && !streamError.value
  );

  return {
    tournamentId,
    court,
    courtLabel,
    resolvedMatchId,
    streamError,
    waitingForMatch,
    isPollingStream,
    streamFetchCount,
    ...core,
  };
}
