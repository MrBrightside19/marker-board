<template>
  <div class="controls">
    <router-link
      :to="{ path: '/', query: { matchId: activeMatchId } }"
      class="nav-button"
    >
      <a-button
        type="default"
        size="large"
        style="position: absolute; top: 20px; left: 20px; z-index: 1000"
      >
        ← Volver al Marcador
      </a-button>
    </router-link>

    <a-flex class="separator" justify="space-between" align="center">
      <div class="team-goals-column">
        <h1>
          Local

          <a-input
            style="width: 220px"
            v-model:value="local"
            size="large"
            placeholder="Nombre equipo local"
          />

          Marcador: {{ localGoals }}
        </h1>

        <div class="goal-buttons">
          <a-button
            class="control-button"
            size="large"
            type="primary"
            @click="changeGoalLocal(+1)"
            >Sumar Gol
          </a-button>
          <a-button
            class="control-button"
            size="large"
            type="primary"
            @click="changeGoalLocal(-1)"
            >Restar Gol
          </a-button>
        </div>
        <div class="penalty-toggle">
          <a-button
            class="penalty-button"
            :type="penalizedLocal ? 'primary' : 'default'"
            @click="togglePenalizedLocal"
          >
            Penalidad
          </a-button>
        </div>
      </div>
      <a-divider
        type="vertical"
        style="height: 300px; background-color: black; width: 10px; top: 0"
      />

      <div class="team-goals-column">
        <h1>
          Visita

          <a-input
            style="width: 220px"
            v-model:value="visit"
            size="large"
            placeholder="Nombre equipo visita"
          />
          Marcador: {{ visitGoals }}
        </h1>
        <div class="goal-buttons">
          <a-button
            class="control-button"
            size="large"
            type="primary"
            danger
            @click="changeGoalVisit(+1)"
          >
            Sumar Gol
          </a-button>
          <a-button
            class="control-button"
            size="large"
            type="primary"
            danger
            @click="changeGoalVisit(-1)"
          >
            Restar Gol
          </a-button>
        </div>
        <div class="penalty-toggle">
          <a-button
            class="penalty-button"
            danger
            :type="penalizedVisit ? 'primary' : 'default'"
            @click="togglePenalizedVisit"
          >
            Penalidad
          </a-button>
        </div>
      </div>
    </a-flex>

    <a-flex class="separator" justify="space-between" align="flex-end">
      <div style="text-align: center">
        <a-button class="control-button-2" size="large" @click="changePeriod">
          Cambiar periodo</a-button>
        <h1 style="margin-top: 10px; font-size: 40px">{{ gamePeriod }}</h1>
      </div>
      <a-divider
        type="vertical"
        style="height: 300px; background-color: black; width: 10px; top: 0"
      />

      <div style="text-align: center">
        <a-select
          class="time-select"
          size="large"
          ref="select"
          v-model:value="selectedTime"
          style="width: 220px"
          :options="optionsTime"
        ></a-select>
        <a-button class="control-button-2" size="large" @click="resetTime">
          Resetear tiempo</a-button
        >
        <div style="margin-top: 8px">
          <a-button size="small" @click="adjustGameTime(10)">+10 s</a-button>
          <a-button size="small" style="margin-left: 6px" @click="adjustGameTime(5)"
            >+5 s</a-button
          >
          <a-button size="small" style="margin-left: 6px" @click="adjustGameTime(-5)"
            >-5 s</a-button
          >
          <a-button size="small" style="margin-left: 6px" @click="adjustGameTime(-10)"
            >-10 s</a-button
          >
        </div>
        <h1
          class="game-clock-display"
          :class="{ 'time-ended': showTimeEndedAlert }"
          style="margin-top: 10px; font-size: 40px"
        >
          {{ formattedTime }}
        </h1>
      </div>

      <a-button
        :danger="!isPaused"
        type="primary"
        style="
          min-width: 150px;
          height: 80px;
          font-size: 28px;
          align-self: center;
        "
        size="large"
        @click="togglePause"
      >
        {{ isPaused ? "Continuar" : "Pausar" }}</a-button
      >

      <div style="text-align: center">
        <a-select
          size="large"
          class="time-select"
          ref="select"
          v-model:value="selectedPenalty"
          style="width: 220px"
          :options="optionsPenalty"
        ></a-select>
        <a-button class="control-button-2" size="large" @click="resetPenalty">
          Resetear Penalidad</a-button>
        <div style="margin-top: 8px">
          <a-button size="small" @click="adjustPenaltyTime(10)">+10 s</a-button>
          <a-button size="small" style="margin-left: 6px" @click="adjustPenaltyTime(5)"
            >+5 s</a-button
          >
          <a-button size="small" style="margin-left: 6px" @click="adjustPenaltyTime(-5)"
            >-5 s</a-button
          >
          <a-button size="small" style="margin-left: 6px" @click="adjustPenaltyTime(-10)"
            >-10 s</a-button
          >
        </div>
        <h1 style="margin-top: 10px; font-size: 40px">{{ formattedPenalty }}</h1>
      </div>
    </a-flex>
    <div class="match-panel">
      <div v-if="activeMatchId && remoteSyncEnabled" class="match-panel-info">
        <div><strong>Partido activo:</strong> {{ activeMatchId }}</div>
        <div style="margin-top: 6px">
          <strong>URL publica (live):</strong>
          <a style="margin-left: 8px" :href="publicUrl" target="_blank">{{ publicUrl }}</a>
        </div>
      </div>
      <a-button type="primary" danger size="large" @click="startNewMatch">
        Nuevo partido
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  createFreshMatchState,
  normalizeScoreboardState,
  useScoreboardStore,
} from "../stores/scoreboard";
import {
  fetchMatchState,
  isRemoteSyncEnabled,
  publishMatchState,
} from "../services/matchSync";
import {
  createMatchId,
  getPublicLiveUrl,
  resolveActiveMatchId,
  setActiveMatchId,
} from "../utils/activeMatch";
import {
  GAME_TIME_ENDED_EVENT,
  handleGameTimeTick,
  resetGameTimeAlertCooldown,
} from "../utils/gameTimeAlert";
import { formatTime, parseTimeToMs } from "../utils/scoreboardClock";
import {
  claimControlsWriter,
  isRemoteStateNewer,
  notifyMatchChanged,
  notifyScoreboardSync,
  releaseControlsWriter,
  touchControlsWriterHeartbeat,
} from "../utils/scoreboardSync";

const local = ref(localStorage.getItem("local-team") || "");
const visit = ref(localStorage.getItem("visit-team") || "");
const selectedTime = ref("20:00");
const selectedPenalty = ref("2:00");
const gamePeriod = ref(localStorage.getItem("game-period") || "1");
const localGoals = ref(localStorage.getItem("goal-local") || "0");
const visitGoals = ref(localStorage.getItem("goal-visit") || "0");

const optionsTime = [
  { value: "25:00", label: "25 minutos" },
  { value: "20:00", label: "20 minutos" },
  { value: "15:00", label: "15 minutos" },
  { value: "10:00", label: "10 minutos" },
  { value: "5:00", label: "5 minutos" },
  // { value: "10:00", label: "10 minutos" },
];
const optionsPenalty = [
  { value: "00:00", label: "0 minutos (sin penalidad)" },
  { value: "2:00", label: "2 minutos" },
  { value: "4:00", label: "4 minutos" },
  { value: "5:00", label: "5 minutos" },
  { value: "10:00", label: "10 minutos" },
];

const penalizedLocal = ref(false);
const penalizedVisit = ref(false);

// Estado de pausa
const isPaused = ref(localStorage.getItem("isPaused") === "true");
const route = useRoute();
const router = useRouter();
const scoreboardStore = useScoreboardStore();
const activeMatchId = ref("");
const remoteSyncEnabled = isRemoteSyncEnabled();
const publicUrl = computed(() =>
  activeMatchId.value ? getPublicLiveUrl(activeMatchId.value) : ""
);

let publishTimeout: number | null = null;
let controlsTicker: number | null = null;

const scheduleRemotePublish = () => {
  if (!isRemoteSyncEnabled() || !activeMatchId.value) return;
  if (publishTimeout) {
    window.clearTimeout(publishTimeout);
  }
  publishTimeout = window.setTimeout(() => {
    publishTimeout = null;
    void publishMatchState(activeMatchId.value, scoreboardStore.state);
  }, 120);
};

/** Publica de inmediato tras cambios manuales de reloj (evita que un poll devuelva el valor anterior). */
const flushRemotePublish = () => {
  if (!isRemoteSyncEnabled() || !activeMatchId.value) return;
  if (publishTimeout) {
    window.clearTimeout(publishTimeout);
    publishTimeout = null;
  }
  void publishMatchState(activeMatchId.value, scoreboardStore.state);
};

const syncPenalizedFromStorage = () => {
  penalizedLocal.value = localStorage.getItem("penalized-local") === "true";
  penalizedVisit.value = localStorage.getItem("penalized-visit") === "true";
  if (
    localStorage.getItem("penalized-local") === null &&
    localStorage.getItem("penalized-visit") === null
  ) {
    const legacy = localStorage.getItem("penalized-team");
    penalizedLocal.value = legacy === "local";
    penalizedVisit.value = legacy === "visit";
  }
};

const syncUiFromLocalStorage = () => {
  local.value = localStorage.getItem("local-team") || "";
  visit.value = localStorage.getItem("visit-team") || "";
  localGoals.value = localStorage.getItem("goal-local") || "0";
  visitGoals.value = localStorage.getItem("goal-visit") || "0";
  gamePeriod.value = localStorage.getItem("game-period") || "1";
  formattedTime.value = localStorage.getItem("time-game") || "20:00";
  formattedPenalty.value = localStorage.getItem("penalty-game") || "00:00";
  isPaused.value = localStorage.getItem("isPaused") === "true";
  syncPenalizedFromStorage();
};

const tickTimersFromControls = () => {
  if (isPaused.value) {
    syncUiFromLocalStorage();
    return;
  }

  touchControlsWriterHeartbeat();

  const currentTimeMs = parseTimeToMs(scoreboardStore.state.timeGame || "20:00");
  const currentPenaltyMs = parseTimeToMs(scoreboardStore.state.penaltyGame || "00:00");

  const nextTime = formatTime(currentTimeMs - 1000);
  const nextPenalty = formatTime(currentPenaltyMs - 1000);
  const nextPenaltyValue = currentPenaltyMs > 0 ? nextPenalty : "00:00";

  formattedTime.value = nextTime;
  formattedPenalty.value = nextPenaltyValue;

  if (nextPenaltyValue === "00:00" && (penalizedLocal.value || penalizedVisit.value)) {
    clearPenalizedFlags();
  }

  handleGameTimeTick(currentTimeMs, parseTimeToMs(nextTime), isPaused.value);

  scoreboardStore.updatePartial({
    timeGame: nextTime,
    penaltyGame: nextPenaltyValue,
  });
  scheduleRemotePublish();
};

const effectivePenaltyDuration = (): string => {
  const ms = parseTimeToMs(selectedPenalty.value);
  return ms > 0 ? selectedPenalty.value : "2:00";
};

const setPenaltyClock = (value: string) => {
  formattedPenalty.value = value;
  scoreboardStore.updatePartial({ penaltyGame: value });
  notifyScoreboardSync();
  flushRemotePublish();
};

const clearPenalizedFlags = () => {
  if (!penalizedLocal.value && !penalizedVisit.value) return;
  penalizedLocal.value = false;
  penalizedVisit.value = false;
  scoreboardStore.updatePartial({ penalizedLocal: false, penalizedVisit: false });
  notifyScoreboardSync();
  scheduleRemotePublish();
};

// 🔄 Alternar pausa
const showTimeEndedAlert = ref(false);

const togglePause = () => {
  setPaused(!isPaused.value);
  notifyScoreboardSync();
  flushRemotePublish();
};

const changeGoalLocal = (value: number) => {
  const currentValue = Number(localStorage.getItem("goal-local") || 0);
  localStorage.setItem("goal-local", (currentValue + value).toString());
  if (currentValue + value < 0) {
    localStorage.setItem("goal-local", (0).toString());
  }
  localGoals.value = localStorage.getItem("goal-local") || "0";
  scheduleRemotePublish();
};

const changeGoalVisit = (value: number) => {
  const currentValue = Number(localStorage.getItem("goal-visit") || 0);
  localStorage.setItem("goal-visit", (currentValue + value).toString());

  if (currentValue + value < 0) {
    localStorage.setItem("goal-visit", (0).toString());
  }
  visitGoals.value = localStorage.getItem("goal-visit") || "0";
  scheduleRemotePublish();
};
const adjustGameTime = (seconds: number) => {
  const currentMs = parseTimeToMs(scoreboardStore.state.timeGame || "20:00");
  const next = formatTime(currentMs + seconds * 1000);
  formattedTime.value = next;
  scoreboardStore.updatePartial({ timeGame: next });
  notifyScoreboardSync();
  flushRemotePublish();
};

const adjustPenaltyTime = (seconds: number) => {
  const currentMs = parseTimeToMs(localStorage.getItem("penalty-game") || "00:00");
  setPenaltyClock(formatTime(currentMs + seconds * 1000));
};

const persistPenalizedFlags = () => {
  scoreboardStore.updatePartial({
    penalizedLocal: penalizedLocal.value,
    penalizedVisit: penalizedVisit.value,
  });
  notifyScoreboardSync();
  flushRemotePublish();
};

const togglePenalizedLocal = () => {
  const turningOn = !penalizedLocal.value;
  penalizedLocal.value = turningOn;
  if (turningOn) {
    const currentMs = parseTimeToMs(localStorage.getItem("penalty-game") || "00:00");
    if (currentMs <= 0) {
      setPenaltyClock(effectivePenaltyDuration());
    }
  } else if (!penalizedVisit.value) {
    setPenaltyClock("00:00");
  }
  persistPenalizedFlags();
};

const togglePenalizedVisit = () => {
  const turningOn = !penalizedVisit.value;
  penalizedVisit.value = turningOn;
  if (turningOn) {
    const currentMs = parseTimeToMs(localStorage.getItem("penalty-game") || "00:00");
    if (currentMs <= 0) {
      setPenaltyClock(effectivePenaltyDuration());
    }
  } else if (!penalizedLocal.value) {
    setPenaltyClock("00:00");
  }
  persistPenalizedFlags();
};

const setGameTime = (value: string) => {
  formattedTime.value = value;
  if (parseTimeToMs(value) > 0) {
    resetGameTimeAlertCooldown();
    showTimeEndedAlert.value = false;
  }
  scoreboardStore.updatePartial({ timeGame: value });
  notifyScoreboardSync();
  flushRemotePublish();
};

const setPaused = (paused: boolean) => {
  isPaused.value = paused;
  scoreboardStore.updatePartial({ isPaused: paused });
};

const changePeriod = () => {
  const currentValue = Number(scoreboardStore.state.gamePeriod || 1);
  const nextPeriod = currentValue >= 4 ? 1 : currentValue + 1;

  const resetClock = window.confirm(
    `Pasaste al periodo ${nextPeriod}.\n\n` +
      `¿Resetear el tiempo de juego a ${selectedTime.value}?\n` +
      `(El reloj quedará en pausa hasta que pulses Continuar.)`
  );

  gamePeriod.value = String(nextPeriod);
  const partial: {
    gamePeriod: number;
    isPaused: boolean;
    timeGame?: string;
  } = {
    gamePeriod: nextPeriod,
    isPaused: true,
  };

  if (resetClock) {
    partial.timeGame = selectedTime.value;
    formattedTime.value = selectedTime.value;
    resetGameTimeAlertCooldown();
    showTimeEndedAlert.value = false;
  }

  isPaused.value = true;
  scoreboardStore.updatePartial(partial);
  notifyScoreboardSync();
  flushRemotePublish();
};

const resetTime = () => {
  const confirmReset = window.confirm(
    "¿Estás seguro de que deseas resetear el tiempo de juego?"
  );
  if (confirmReset) {
    setGameTime(selectedTime.value);
  }
};
const resetPenalty = () => {
  const confirmReset = window.confirm(
    "¿Estás seguro de que deseas resetear el tiempo de penalidad?"
  );
  if (confirmReset) {
    setPenaltyClock(selectedPenalty.value);
    if (parseTimeToMs(selectedPenalty.value) <= 0) {
      clearPenalizedFlags();
    }
  }
};

const startNewMatch = async () => {
  const confirmed = window.confirm(
    "¿Iniciar un partido nuevo?\n\n" +
      "Se reinician goles, periodo, tiempos y penalidades.\n" +
      "Se conservan los nombres de equipos.\n" +
      "Se generará un nuevo código de partido y una URL de live distinta."
  );
  if (!confirmed) return;

  const newMatchId = createMatchId();
  const freshState = createFreshMatchState({
    localTeam: local.value,
    visitTeam: visit.value,
    timeGame: selectedTime.value,
  });

  setActiveMatchId(newMatchId);
  activeMatchId.value = newMatchId;
  scoreboardStore.setState(freshState);

  penalizedLocal.value = false;
  penalizedVisit.value = false;
  isPaused.value = false;
  syncUiFromLocalStorage();

  await router.replace({ path: "/controls", query: { matchId: newMatchId } });

  notifyScoreboardSync();
  notifyMatchChanged(newMatchId);

  if (remoteSyncEnabled) {
    await publishMatchState(newMatchId, scoreboardStore.state);
  }
};

const updateLocalTeam = () => {
  localStorage.setItem("local-team", local.value);
  window.dispatchEvent(new Event("storage")); // Forzar actualización en otras vistas
  scheduleRemotePublish();
};
const updateVisitlTeam = () => {
  localStorage.setItem("visit-team", visit.value);
  window.dispatchEvent(new Event("storage")); // Forzar actualización en otras vistas
  scheduleRemotePublish();
};

const formattedTime = ref(localStorage.getItem("time-game") || "20:00");
const formattedPenalty = ref(localStorage.getItem("penalty-game") || "00:00");

const storedLocal = ref(local.value);
const storedVisit = ref(visit.value);

const syncWithStorage = (event: StorageEvent) => {
  if (event.key === "time-game") {
    formattedTime.value = localStorage.getItem("time-game") || "20:00";
  }
  if (event.key === "penalty-game") {
    formattedPenalty.value = localStorage.getItem("penalty-game") || "00:00";
  }
  if (event.key === "penalized-local" || event.key === "penalized-visit" || event.key === "penalized-team") {
    syncPenalizedFromStorage();
  }
  if (event.key === "game-period") {
    gamePeriod.value = localStorage.getItem("game-period") || "1";
  }
  if (event.key === "local-team") {
    storedLocal.value = localStorage.getItem("local-team") || "";
    local.value = storedLocal.value;
  }
  if (event.key === "visit-team") {
    storedVisit.value = localStorage.getItem("visit-team") || "";
    visit.value = storedVisit.value;
  }

  if (event.key === "isPaused") {
    isPaused.value = localStorage.getItem("isPaused") === "true";
  }
};

const onGameTimeEnded = () => {
  showTimeEndedAlert.value = true;
};

// 🎯 Detectar cambios en `localStorage`
onMounted(() => {
  document.title = "Controles";

  const matchId = resolveActiveMatchId(
    typeof route.query.matchId === "string" ? route.query.matchId : null
  );
  activeMatchId.value = matchId;
  if (route.query.matchId !== matchId) {
    router.replace({ path: "/controls", query: { matchId } });
  }

  scoreboardStore.hydrateFromLocalStorage();
  syncUiFromLocalStorage();
  claimControlsWriter();
  window.addEventListener("beforeunload", releaseControlsWriter);

  if (remoteSyncEnabled && activeMatchId.value) {
    fetchMatchState(activeMatchId.value).then((remoteState) => {
      if (!remoteState) {
        scheduleRemotePublish();
        return;
      }
      const localUpdatedAt = scoreboardStore.state.updatedAt;
      if (!isRemoteStateNewer(remoteState, localUpdatedAt)) {
        scheduleRemotePublish();
        return;
      }
      const normalized = normalizeScoreboardState(remoteState);
      scoreboardStore.setState(normalized);
      syncUiFromLocalStorage();
      notifyScoreboardSync();
    });
  }

  // En la misma pestaña, el evento "storage" no se dispara.
  // Controls actua como fuente visual de tiempo para validar live.
  controlsTicker = window.setInterval(() => {
    tickTimersFromControls();
  }, 1000);

  window.addEventListener("storage", syncWithStorage);
  window.addEventListener(GAME_TIME_ENDED_EVENT, onGameTimeEnded);
});

onUnmounted(() => {
  window.removeEventListener(GAME_TIME_ENDED_EVENT, onGameTimeEnded);
  window.removeEventListener("beforeunload", releaseControlsWriter);
  releaseControlsWriter();
  notifyScoreboardSync();
  if (publishTimeout) {
    window.clearTimeout(publishTimeout);
  }
  if (controlsTicker) {
    window.clearInterval(controlsTicker);
  }
  window.removeEventListener("storage", syncWithStorage);
});
watch(local, updateLocalTeam);
watch(visit, updateVisitlTeam);
</script>

<style scoped>
.team-goals-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 10px;
  text-align: center;
}

.goal-buttons {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.penalty-toggle {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  width: 100%;
}

.penalty-button {
  min-width: 120px;
  height: 36px;
  font-size: 14px;
}

.match-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 20px 10px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.match-panel-info {
  flex: 1;
  min-width: 200px;
}

.game-clock-display.time-ended {
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
</style>
