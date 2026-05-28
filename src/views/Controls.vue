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
      <span style="margin: 10px">
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
      </span>
      <a-divider
        type="vertical"
        style="height: 300px; background-color: black; width: 10px; top: 0"
      />

      <div>
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
    </a-flex>

    <div
      v-if="activeMatchId && remoteSyncEnabled"
      style="margin: 0 20px 10px; padding: 12px; background: #f5f5f5; border-radius: 8px"
    >
      <div><strong>Partido activo:</strong> {{ activeMatchId }}</div>
      <div style="margin-top: 6px">
        <strong>URL publica (live):</strong>
        <a style="margin-left: 8px" :href="publicUrl" target="_blank">{{ publicUrl }}</a>
      </div>
    </div>

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
        <h1 style="margin-top: 10px; font-size: 40px">{{ formattedTime }}</h1>
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
        <h1 style="margin-top: 10px; font-size: 40px">{{ formattedPenalty }}</h1>
      </div>
    </a-flex>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  readScoreboardStateFromLocalStorage,
  useScoreboardStore,
  writeScoreboardStateToLocalStorage,
} from "../stores/scoreboard";
import {
  fetchMatchState,
  isRemoteSyncEnabled,
  publishMatchState,
} from "../services/matchSync";
import { getPublicLiveUrl, resolveActiveMatchId } from "../utils/activeMatch";

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
  { value: "2:00", label: "2 minutos" },
  { value: "4:00", label: "4 minutos" },
  { value: "5:00", label: "5 minutos" },
  { value: "10:00", label: "10 minutos" },
];

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

const parseTimeToMs = (value: string): number => {
  const [minutes, seconds] = value.split(":").map(Number);
  return Math.max(0, (minutes || 0) * 60000 + (seconds || 0) * 1000);
};

const formatTime = (ms: number): string => {
  const safe = Math.max(0, ms);
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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

const syncUiFromLocalStorage = () => {
  local.value = localStorage.getItem("local-team") || "";
  visit.value = localStorage.getItem("visit-team") || "";
  localGoals.value = localStorage.getItem("goal-local") || "0";
  visitGoals.value = localStorage.getItem("goal-visit") || "0";
  gamePeriod.value = localStorage.getItem("game-period") || "1";
  formattedTime.value = localStorage.getItem("time-game") || "20:00";
  formattedPenalty.value = localStorage.getItem("penalty-game") || "02:00";
  isPaused.value = localStorage.getItem("isPaused") === "true";
};

const tickTimersFromControls = () => {
  if (isPaused.value) {
    syncUiFromLocalStorage();
    return;
  }

  const currentTimeMs = parseTimeToMs(localStorage.getItem("time-game") || "20:00");
  const currentPenaltyMs = parseTimeToMs(
    localStorage.getItem("penalty-game") || "02:00"
  );

  const nextTime = formatTime(currentTimeMs - 1000);
  const nextPenalty = formatTime(currentPenaltyMs - 1000);

  localStorage.setItem("time-game", nextTime);
  localStorage.setItem("penalty-game", nextPenalty);
  formattedTime.value = nextTime;
  formattedPenalty.value = nextPenalty;

  scheduleRemotePublish();
};

// 🔄 Alternar pausa
const togglePause = () => {
  isPaused.value = !isPaused.value;
  localStorage.setItem("isPaused", isPaused.value.toString());
  window.dispatchEvent(new Event("storage")); // Forzar actualización en Home
  scheduleRemotePublish();
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
const changePeriod = () => {
  const currentValue = Number(localStorage.getItem("game-period") || 1);
  localStorage.setItem("game-period", (currentValue + 1).toString());
  if (currentValue + 1 > 4) {
    localStorage.setItem("game-period", "1");
  }
  gamePeriod.value = localStorage.getItem("game-period") || "1";
  scheduleRemotePublish();
};

// 🔄 Reiniciar el tiempo en localStorage y notificar a `/home`
const resetTime = () => {
  const confirmReset = window.confirm(
    "¿Estás seguro de que deseas resetear el tiempo de juego?"
  );
  if (confirmReset) {
    localStorage.setItem("time-game", selectedTime.value);
    formattedTime.value = selectedTime.value;
    window.dispatchEvent(new Event("storage")); // Forzar actualización en todas las ventanas
    scheduleRemotePublish();
  }
};
const resetPenalty = () => {
  const confirmReset = window.confirm(
    "¿Estás seguro de que deseas resetear el tiempo de penalidad?"
  );
  if (confirmReset) {
    localStorage.setItem("penalty-game", selectedPenalty.value);
    formattedPenalty.value = selectedPenalty.value;
    window.dispatchEvent(new Event("storage"));
    scheduleRemotePublish();
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
const formattedPenalty = ref(localStorage.getItem("penalty-game") || "02:00");

const storedLocal = ref(local.value);
const storedVisit = ref(visit.value);

const syncWithStorage = (event: StorageEvent) => {
  if (event.key === "time-game") {
    formattedTime.value = localStorage.getItem("time-game") || "20:00";
  }
  if (event.key === "penalty-game") {
    formattedPenalty.value = localStorage.getItem("penalty-game") || "02:00";
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

  if (remoteSyncEnabled && activeMatchId.value) {
    fetchMatchState(activeMatchId.value).then((remoteState) => {
      if (!remoteState) {
        scheduleRemotePublish();
        return;
      }
      scoreboardStore.setState(remoteState);
      writeScoreboardStateToLocalStorage(remoteState);
      syncUiFromLocalStorage();
    });
  }

  // En la misma pestaña, el evento "storage" no se dispara.
  // Controls actua como fuente visual de tiempo para validar live.
  controlsTicker = window.setInterval(() => {
    tickTimersFromControls();
  }, 1000);

  window.addEventListener("storage", syncWithStorage);
});

onUnmounted(() => {
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
