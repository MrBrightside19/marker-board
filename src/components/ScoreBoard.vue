<template>

  <div class="scoreboard-container font-digital">
    <div v-if="activeMatchId && remoteSyncEnabled" class="session-bar">
      <span class="session-label">Partido: {{ activeMatchId }}</span>
      <a class="session-link" :href="publicUrl" target="_blank" rel="noopener">Live público</a>
    </div>

    <a-button
      @click="openControlsInNewTab"
      type="primary"
      size="large"
      class="controls-button"
    >
      Controles
    </a-button>

    <div class="scoreboard-stage">
      <div class="scoreboard-content">
        <div class="team-score local-team">
          <div class="team-name">{{ localTeam }}</div>
          <div class="score">{{ goalLocal }}</div>
        </div>

        <div class="game-info">
          <div class="time" :class="{ 'time-ended': showTimeEndedAlert }">{{ formattedTime }}</div>
          <div class="period-container">
            <div class="label">Periodo</div>
            <div class="period">{{ gamePeriod }}</div>
          </div>
          <div class="penalty-container">
            <div class="label penalty-label">Penalidad</div>
            <div class="penalty">{{ formattedPenalty }}</div>
          </div>
        </div>

        <div class="team-score visit-team">
          <div class="team-name">{{ visitTeam }}</div>
          <div class="score">{{ goalVisit }}</div>
        </div>

        <div class="play-status-bar">
          <div class="play-status">
            <span v-if="showPowerPlayLocal">Power play</span>
          </div>
          <div class="play-status">
            <span v-if="showThreeOnThree">3on3</span>
          </div>
          <div class="play-status">
            <span v-if="showPowerPlayVisit">Power play</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import {
  readScoreboardStateFromLocalStorage,
  useScoreboardStore,
} from "../stores/scoreboard";
import {
  fetchMatchState,
  isRemoteSyncEnabled,
  publishMatchState,
} from "../services/matchSync";
import { getPollIntervalMs } from "../config/sync";
import {
  ACTIVE_MATCH_STORAGE_KEY,
  getPublicLiveUrl,
  resolveActiveMatchId,
} from "../utils/activeMatch";
import {
  isControlsActiveWriter,
  isRemoteStateNewer,
  MATCH_CHANGED_EVENT,
  SCOREBOARD_SYNC_EVENT,
} from "../utils/scoreboardSync";
import { getRunningClocks, parseTimeToMs } from "../utils/scoreboardClock";
import { GAME_TIME_ENDED_EVENT, handleGameTimeTick } from "../utils/gameTimeAlert";

dayjs.extend(duration);

const router = useRouter();
const route = useRoute();
const scoreboardStore = useScoreboardStore();
const activeMatchId = ref("");
const remoteSyncEnabled = isRemoteSyncEnabled();
const publicUrl = computed(() =>
  activeMatchId.value ? getPublicLiveUrl(activeMatchId.value) : ""
);
let publishTimeout: number | null = null;
let pollInterval: number | null = null;
let displayInterval: number | null = null;
const nowMs = ref(Date.now());

const pollIntervalMs = getPollIntervalMs();

const openControlsInNewTab = () => {
  const routeLocation = router.resolve({
    path: "/controls",
    query: activeMatchId.value ? { matchId: activeMatchId.value } : {},
  });
  const width = 800;
  const height = 600;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`;
  window.open(routeLocation.href, "controlsWindow", features);
};

const syncLocalRefsFromStorage = () => {
  scoreboardStore.hydrateFromLocalStorage();
  const snapshot = scoreboardStore.state;
  localTeam.value = snapshot.localTeam;
  visitTeam.value = snapshot.visitTeam;
  goalLocal.value = snapshot.goalLocal;
  goalVisit.value = snapshot.goalVisit;
  gamePeriod.value = snapshot.gamePeriod;
  isPaused.value = snapshot.isPaused;

  if (
    !isPaused.value &&
    snapshot.updatedAt &&
    !isControlsActiveWriter() &&
    remoteSyncEnabled
  ) {
    const clocks = getRunningClocks(snapshot, nowMs.value);
    timeString.value = clocks.timeGame;
    penaltyString.value = clocks.penaltyGame;
  } else {
    timeString.value = snapshot.timeGame;
    penaltyString.value = snapshot.penaltyGame;
  }

  timeMilliseconds.value = convertToMilliseconds(timeString.value);
  penaltyMilliseconds.value = convertToMilliseconds(penaltyString.value);
  formattedTime.value = formatTime(timeMilliseconds.value);
  formattedPenalty.value = formatTime(penaltyMilliseconds.value);

  if (parseTimeToMs(timeString.value) > 0) {
    showTimeEndedAlert.value = false;
  }
};

const showTimeEndedAlert = ref(false);

const onGameTimeEnded = () => {
  showTimeEndedAlert.value = true;
};

const tickScoreboardWhenStandalone = () => {
  if (isPaused.value || isControlsActiveWriter()) return;

  const previousTimeMs = timeMilliseconds.value;
  const currentTimeMs = Math.max(0, timeMilliseconds.value - 1000);
  const currentPenaltyMs = Math.max(0, penaltyMilliseconds.value - 1000);
  const nextTime = formatTime(currentTimeMs);
  const nextPenalty = formatTime(currentPenaltyMs);

  scoreboardStore.updatePartial({ timeGame: nextTime, penaltyGame: nextPenalty });
  timeMilliseconds.value = currentTimeMs;
  penaltyMilliseconds.value = currentPenaltyMs;
  formattedTime.value = nextTime;
  formattedPenalty.value = nextPenalty;

  handleGameTimeTick(previousTimeMs, currentTimeMs, isPaused.value);

  scheduleRemotePublish();
};

const onScoreboardSync = () => {
  syncLocalRefsFromStorage();
  syncPenalizedFlags();
};

const applyMatchId = (matchId: string) => {
  if (!matchId || matchId === activeMatchId.value) return;
  activeMatchId.value = matchId;
  router.replace({ path: "/", query: { matchId } });
  scoreboardStore.hydrateFromLocalStorage();
  onScoreboardSync();
};

const onMatchChanged = (event: Event) => {
  const matchId = (event as CustomEvent<{ matchId: string }>).detail?.matchId;
  if (matchId) applyMatchId(matchId);
};

const scheduleRemotePublish = () => {
  if (!isRemoteSyncEnabled() || !activeMatchId.value) return;
  if (publishTimeout) {
    window.clearTimeout(publishTimeout);
  }
  publishTimeout = window.setTimeout(() => {
    scoreboardStore.setState(readScoreboardStateFromLocalStorage(), false);
    publishMatchState(activeMatchId.value, scoreboardStore.state);
  }, 120);
};

const localTeam = ref(localStorage.getItem("local-team") || "Equipo Local");
const visitTeam = ref(localStorage.getItem("visit-team") || "Equipo Visita");
const goalLocal = ref<number>(Number(localStorage.getItem("goal-local") || 0));
const goalVisit = ref<number>(Number(localStorage.getItem("goal-visit") || 0));
const gamePeriod = ref<number>(Number(localStorage.getItem("game-period") || 1));

const readPenalizedLocal = () => localStorage.getItem("penalized-local") === "true";
const readPenalizedVisit = () => localStorage.getItem("penalized-visit") === "true";

const penalizedLocal = ref(readPenalizedLocal());
const penalizedVisit = ref(readPenalizedVisit());

const showThreeOnThree = computed(() => penalizedLocal.value && penalizedVisit.value);
const showPowerPlayLocal = computed(
  () => penalizedVisit.value && !penalizedLocal.value
);
const showPowerPlayVisit = computed(
  () => penalizedLocal.value && !penalizedVisit.value
);

const syncPenalizedFlags = () => {
  penalizedLocal.value = readPenalizedLocal();
  penalizedVisit.value = readPenalizedVisit();
  if (
    localStorage.getItem("penalized-local") === null &&
    localStorage.getItem("penalized-visit") === null
  ) {
    const legacy = localStorage.getItem("penalized-team");
    penalizedLocal.value = legacy === "local";
    penalizedVisit.value = legacy === "visit";
  }
};

const updateGoalLocal = () => {
  goalLocal.value = Number(localStorage.getItem("goal-local") || 0);
};
const updateGoalVisit = () => {
  goalVisit.value = Number(localStorage.getItem("goal-visit") || 0);
};
const updateGamePeriod = () => {
  gamePeriod.value = Number(localStorage.getItem("game-period") || 1);
};

const timeString = ref<string>(localStorage.getItem("time-game") || "20:00");
const timeMilliseconds = ref<number>(convertToMilliseconds(timeString.value));

const penaltyString = ref<string>(localStorage.getItem("penalty-game") || "0:00");
const penaltyMilliseconds = ref<number>(convertToMilliseconds(penaltyString.value));

const isPaused = ref(localStorage.getItem("isPaused") === "true");

const syncWithStorage = (event: StorageEvent) => {
  if (event.key === ACTIVE_MATCH_STORAGE_KEY) {
    const matchId = localStorage.getItem(ACTIVE_MATCH_STORAGE_KEY)?.trim();
    if (matchId) applyMatchId(matchId);
  }
  if (
    event.key === "time-game" ||
    event.key === "penalty-game" ||
    event.key === "scoreboard-updated-at" ||
    event.key === "isPaused"
  ) {
    onScoreboardSync();
  }
  if (event.key === "local-team") {
    localTeam.value = localStorage.getItem("local-team") || "";
  }
  if (event.key === "visit-team") {
    visitTeam.value = localStorage.getItem("visit-team") || "Equipo Visita";
  }
  if (event.key === "penalized-local" || event.key === "penalized-visit" || event.key === "penalized-team") {
    syncPenalizedFlags();
  }
};

onMounted(() => {
  document.title = "Marcador";

  const matchId = resolveActiveMatchId(
    typeof route.query.matchId === "string" ? route.query.matchId : null
  );
  activeMatchId.value = matchId;
  if (route.query.matchId !== matchId) {
    router.replace({ path: "/", query: { matchId } });
  }

  scoreboardStore.hydrateFromLocalStorage();
  syncLocalRefsFromStorage();

  window.addEventListener("storage", updateGoalLocal);
  window.addEventListener("storage", updateGoalVisit);
  window.addEventListener("storage", updateGamePeriod);
  window.addEventListener("storage", syncPenalizedFlags);
  window.addEventListener("storage", syncWithStorage);
  window.addEventListener(SCOREBOARD_SYNC_EVENT, onScoreboardSync);
  window.addEventListener(MATCH_CHANGED_EVENT, onMatchChanged);
  window.addEventListener(GAME_TIME_ENDED_EVENT, onGameTimeEnded);
  displayInterval = window.setInterval(() => {
    nowMs.value = Date.now();
    if (isControlsActiveWriter()) {
      syncLocalRefsFromStorage();
    } else {
      tickScoreboardWhenStandalone();
    }
  }, 1000);
  updateGoalLocal(); // Actualiza el valor inicial al montar la vista
  updateGoalVisit();
  updateGamePeriod();
  syncPenalizedFlags();

  const applyRemoteState = (remoteState: NonNullable<Awaited<ReturnType<typeof fetchMatchState>>>) => {
    const localUpdatedAt = scoreboardStore.state.updatedAt;
    if (!isRemoteStateNewer(remoteState, localUpdatedAt)) {
      return;
    }
    scoreboardStore.setState(remoteState);
    onScoreboardSync();
  };

  if (isRemoteSyncEnabled() && activeMatchId.value) {
    fetchMatchState(activeMatchId.value).then((remoteState) => {
      if (!remoteState) {
        scheduleRemotePublish();
        return;
      }
      applyRemoteState(remoteState);
    });

    pollInterval = window.setInterval(async () => {
      const remoteState = await fetchMatchState(activeMatchId.value);
      if (remoteState) applyRemoteState(remoteState);
    }, pollIntervalMs);
  }
});

onUnmounted(() => {
  if (displayInterval) {
    window.clearInterval(displayInterval);
  }
  window.removeEventListener(SCOREBOARD_SYNC_EVENT, onScoreboardSync);
  window.removeEventListener(MATCH_CHANGED_EVENT, onMatchChanged);
  window.removeEventListener(GAME_TIME_ENDED_EVENT, onGameTimeEnded);
  window.removeEventListener("storage", syncWithStorage);
  window.removeEventListener("storage", updateGoalLocal);
  window.removeEventListener("storage", updateGoalVisit);
  window.removeEventListener("storage", updateGamePeriod);
  window.removeEventListener("storage", syncPenalizedFlags);
  if (publishTimeout) {
    window.clearTimeout(publishTimeout);
  }
  if (pollInterval) {
    window.clearInterval(pollInterval);
  }
});

// 📌 Convertir "mm:ss" a milisegundos
function convertToMilliseconds(timeString: string): number {
  const [minutes, seconds] = timeString.split(":").map(Number);
  return dayjs.duration({ minutes, seconds }).asMilliseconds();
}

// 📌 Convertir milisegundos a "mm:ss"
function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// 📌 Formato del tiempo a mostrar en pantalla
const formattedTime = ref(formatTime(timeMilliseconds.value));
const formattedPenalty = ref(formatTime(penaltyMilliseconds.value));

watch(timeMilliseconds, (newVal) => {
  formattedTime.value = formatTime(newVal);
});

watch(penaltyMilliseconds, (newVal) => {
  formattedPenalty.value = formatTime(newVal);
});
</script>

<style scoped lang="scss">
.scoreboard-container {
  display: grid;
  place-items: center;
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
  color: #fff;
}

.session-bar {
  position: absolute;
  top: clamp(8px, 2vh, 20px);
  left: clamp(8px, 2vh, 20px);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: clamp(12px, 1.4vw, 18px);
  max-width: min(50vw, 520px);
}

.session-label {
  opacity: 0.85;
}

.session-link {
  color: #69b1ff;
  word-break: break-all;
}

.controls-button {
  position: absolute;
  top: clamp(8px, 2vh, 20px);
  right: clamp(8px, 2vh, 20px);
  z-index: 1000;
}

.scoreboard-stage {
  width: min(100vw, calc(100vh * 16 / 9));
  aspect-ratio: 16 / 9;
  position: relative;
  container-type: size;
}

.scoreboard-content {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr auto;
  align-items: center;
  padding: 0 4%;
}

.team-score {
  grid-row: 1;
  text-align: center;
  min-width: 0;
  align-self: center;
}

.local-team {
  grid-column: 1;
}

.visit-team {
  grid-column: 3;
}

.team-name {
  font-size: clamp(18px, 10.4cqh, 220px);
  word-wrap: break-word;
  white-space: normal;
  max-width: 38cqw;
  display: block;
  line-height: 1.05;
  margin-bottom: clamp(8px, 3.5cqh, 50px);

}


.score {
  font-size: clamp(70px, 39.5cqh, 760px);
  line-height: 0.9;
}

.game-info {
  grid-row: 1;
  grid-column: 2;
  align-self: start;
  justify-self: center;
  text-align: center;
  width: 100%;
  max-width: 48cqw;
  margin-top: 1%;
}

.time {
  font-size: clamp(64px, 34.5cqh, 700px);
  line-height: 0.9;
}

.time.time-ended {
  color: #ff4d4f;
  animation: time-ended-blink 0.7s ease-in-out infinite;
}

@keyframes time-ended-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.period-container,
.penalty-container {
  margin-top: clamp(2px, 0.35cqh, 10px);
}

.label {
  font-size: clamp(14px, 6.25cqh, 130px);
  line-height: 1;
}

.period-container .label {
  min-height: clamp(18px, 5.55cqh, 90px);
}

.penalty-label {
  min-height: clamp(12px, 2.77cqh, 50px);
}

.period,
.penalty {
  font-size: clamp(24px, 13.9cqh, 340px);
  line-height: 0.95;
}

.play-status-bar {
  grid-column: 1 / -1;
  grid-row: 2;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: start;
  margin-top: clamp(4px, 1cqh, 16px);
  pointer-events: none;
}

.play-status {
  font-size: clamp(20px, 5.5cqh, 72px);
  line-height: 1.1;
  text-align: center;
  color: #ffd666;
}
</style>
