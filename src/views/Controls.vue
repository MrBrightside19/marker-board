<template>
  <div class="controls-page" :class="{ 'has-tournament': isTournamentMode }">
    <section class="controls-panel">
      <div class="controls-toolbar">
        <div v-if="activeMatchId && remoteSyncEnabled" class="match-panel-info">
          <span v-if="tournamentContext">
            <strong>{{ tournamentContext.tournament.name }}</strong>
            <a-tag color="blue">Cancha {{ formatCourtLabel(tournamentContext.court) }}</a-tag>
            <span v-if="tournamentContext.currentMatch">
              · {{ tournamentContext.currentMatch.localTeam }} vs
              {{ tournamentContext.currentMatch.visitTeam }}
            </span>
          </span>
          <span v-else><strong>Partido:</strong> {{ activeMatchId }}</span>
          <a class="live-link" :href="publicUrl" target="_blank" rel="noopener">Live</a>
        </div>
        <a-button
          type="primary"
          :danger="!isTournamentMode"
          size="small"
          :loading="advancingMatch"
          :disabled="isTournamentMode && !hasUpcomingMatch"
          @click="onAdvanceMatch"
        >
          {{ advanceMatchLabel }}
        </a-button>
      </div>

      <a-flex class="separator controls-row" justify="space-between" align="center">
        <div class="team-goals-column">
          <div class="team-block">
            <span class="team-label">Local</span>
            <a-input
              v-model:value="local"
              class="team-name-input"
              size="small"
              placeholder="Equipo local"
            />
            <span class="score-label">Marcador: {{ localGoals }}</span>
          </div>
          <div class="goal-buttons">
            <a-button class="control-button" type="primary" @click="changeGoalLocal(+1)">
              + Gol
            </a-button>
            <a-button class="control-button" type="primary" @click="changeGoalLocal(-1)">
              − Gol
            </a-button>
          </div>
          <a-button
            class="penalty-button"
            size="small"
            :type="penalizedLocal ? 'primary' : 'default'"
            @click="togglePenalizedLocal"
          >
            Penalidad
          </a-button>
        </div>

        <a-divider type="vertical" class="row-divider" />

        <div class="team-goals-column">
          <div class="team-block">
            <span class="team-label">Visita</span>
            <a-input
              v-model:value="visit"
              class="team-name-input"
              size="small"
              placeholder="Equipo visita"
            />
            <span class="score-label">Marcador: {{ visitGoals }}</span>
          </div>
          <div class="goal-buttons">
            <a-button class="control-button" type="primary" danger @click="changeGoalVisit(+1)">
              + Gol
            </a-button>
            <a-button class="control-button" type="primary" danger @click="changeGoalVisit(-1)">
              − Gol
            </a-button>
          </div>
          <a-button
            class="penalty-button"
            size="small"
            danger
            :type="penalizedVisit ? 'primary' : 'default'"
            @click="togglePenalizedVisit"
          >
            Penalidad
          </a-button>
        </div>
      </a-flex>

      <a-flex class="separator controls-row" justify="space-between" align="center">
        <div class="clock-block">
          <a-button class="control-button-2" size="small" @click="changePeriod">
            Cambiar periodo
          </a-button>
          <div class="clock-value">{{ gamePeriod }}</div>
        </div>

        <a-divider type="vertical" class="row-divider" />

        <div class="clock-block">
          <div class="game-time-input">
            <a-input
              v-model:value="gameMinutesInput"
              class="time-minutes-input"
              size="small"
              inputmode="numeric"
              maxlength="3"
              @input="onGameMinutesInput"
              @blur="normalizeGameMinutes"
            />
            <span class="time-minutes-label">minutos</span>
          </div>
          <a-button class="control-button-2" size="small" @click="resetTime">
            Resetear tiempo
          </a-button>
          <div class="adjust-buttons">
            <a-button size="small" @click="adjustGameTime(10)">+10 s</a-button>
            <a-button size="small" @click="adjustGameTime(5)">+5 s</a-button>
            <a-button size="small" @click="adjustGameTime(-5)">−5 s</a-button>
            <a-button size="small" @click="adjustGameTime(-10)">−10 s</a-button>
          </div>
          <div class="clock-value game-clock-display" :class="{ 'time-ended': showTimeEndedAlert }">
            {{ formattedTime }}
          </div>
        </div>

        <a-button
          class="pause-button"
          :danger="!isPaused"
          type="primary"
          size="small"
          @click="togglePause"
        >
          {{ isPaused ? "Continuar" : "Pausar" }}
        </a-button>

        <div class="clock-block">
          <a-select
            v-model:value="selectedPenalty"
            class="time-select"
            size="small"
            style="width: 140px"
            :options="optionsPenalty"
          />
          <a-button class="control-button-2" size="small" @click="resetPenalty">
            Reset penalidad
          </a-button>
          <div class="adjust-buttons">
            <a-button size="small" @click="adjustPenaltyTime(10)">+10 s</a-button>
            <a-button size="small" @click="adjustPenaltyTime(5)">+5 s</a-button>
            <a-button size="small" @click="adjustPenaltyTime(-5)">−5 s</a-button>
            <a-button size="small" @click="adjustPenaltyTime(-10)">−10 s</a-button>
          </div>
          <div class="clock-value">{{ formattedPenalty }}</div>
        </div>
      </a-flex>
    </section>

    <section v-if="isTournamentMode" class="upcoming-panel">
      <h2 class="upcoming-title">
        Siguientes partidos<span v-if="tournamentContext?.court">
          — Cancha {{ formatCourtLabel(tournamentContext.court) }}</span
        >
        <span class="upcoming-count">({{ tournamentContext?.upcomingMatches.length ?? 0 }})</span>
      </h2>
      <a-table
        :data-source="tournamentContext?.upcomingMatches ?? []"
        :columns="upcomingColumns"
        row-key="id"
        size="small"
        :pagination="false"
        :loading="loadingTournament"
        :scroll="{ y: 'calc(50vh - 72px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'scheduledAt'">
            {{ record.scheduledAt ? formatScheduledAt(record.scheduledAt) : "—" }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button
              type="link"
              size="small"
              :loading="advancingMatch && startingMatchId === record.id"
              @click="startScheduledTournamentMatch(record)"
            >
              Iniciar
            </a-button>
          </template>
        </template>
        <template #emptyText>
          <a-empty description="No quedan partidos programados" />
        </template>
      </a-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import dayjs from "dayjs";
import {
  buildFinishedMatchState,
  createFreshMatchState,
  normalizeScoreboardState,
  useScoreboardStore,
} from "../stores/scoreboard";
import {
  fetchMatchState,
  isRemoteSyncEnabled,
  publishMatchState,
} from "../services/matchSync";
import { setMatchLiveStatus } from "../services/liveMatchesService";
import {
  createMatchId,
  getActiveCourt,
  getActiveTournamentId,
  getPublicLiveUrl,
  resolveActiveMatchId,
  setActiveMatchId,
  setActiveTournamentId,
} from "../utils/activeMatch";
import { formatCourtLabel } from "../utils/court";
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
import { useAuthStore } from "../stores/auth";
import type { TournamentMatch } from "../types/tournament";
import {
  fetchTournamentControlsContext,
  fetchTournamentControlsContextByTournamentId,
  finishTournamentMatch,
  startTournamentMatch,
  type TournamentControlsContext,
} from "../services/tournamentService";

const local = ref(localStorage.getItem("local-team") || "");
const visit = ref(localStorage.getItem("visit-team") || "");
const gameMinutesInput = ref("20");
const selectedPenalty = ref("2:00");
const gamePeriod = ref(localStorage.getItem("game-period") || "1");
const localGoals = ref(localStorage.getItem("goal-local") || "0");
const visitGoals = ref(localStorage.getItem("goal-visit") || "0");

const optionsPenalty = [
  { value: "00:00", label: "0 min (sin penalidad)" },
  { value: "2:00", label: "2 minutos" },
  { value: "4:00", label: "4 minutos" },
  { value: "5:00", label: "5 minutos" },
  { value: "10:00", label: "10 minutos" },
];

const upcomingColumns = [
  { title: "Local", dataIndex: "localTeam", key: "localTeam", ellipsis: true },
  { title: "Visita", dataIndex: "visitTeam", key: "visitTeam", ellipsis: true },
  { title: "Tiempo", dataIndex: "timeGame", key: "timeGame", width: 72 },
  { title: "Programado", key: "scheduledAt", width: 130 },
  { title: "", key: "actions", width: 72 },
];

const penalizedLocal = ref(false);
const penalizedVisit = ref(false);
const isPaused = ref(localStorage.getItem("isPaused") === "true");
const route = useRoute();
const router = useRouter();
const scoreboardStore = useScoreboardStore();
const auth = useAuthStore();
const activeMatchId = ref("");
const remoteSyncEnabled = isRemoteSyncEnabled();
const activeTournamentId = ref<string | null>(getActiveTournamentId());
const tournamentContext = ref<TournamentControlsContext | null>(null);
const loadingTournament = ref(false);
const advancingMatch = ref(false);
const startingMatchId = ref<string | null>(null);

const publicUrl = computed(() =>
  activeMatchId.value ? getPublicLiveUrl(activeMatchId.value) : ""
);

const isTournamentMode = computed(() => Boolean(activeTournamentId.value));
const hasUpcomingMatch = computed(
  () => (tournamentContext.value?.upcomingMatches.length ?? 0) > 0
);
const advanceMatchLabel = computed(() =>
  isTournamentMode.value ? "Siguiente partido" : "Nuevo partido"
);

function formatScheduledAt(value: string): string {
  return dayjs(value).format("DD/MM HH:mm");
}

function minutesFromTimeGame(time: string): number {
  return Math.max(0, Math.round(parseTimeToMs(time || "00:00") / 60000));
}

function minutesToTimeGame(raw: string | number): string {
  const minutes = Math.max(0, Math.min(120, Math.floor(Number(raw) || 0)));
  return `${String(minutes).padStart(2, "0")}:00`;
}

const selectedTime = computed(() => minutesToTimeGame(gameMinutesInput.value));

const onGameMinutesInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  gameMinutesInput.value = input.value.replace(/\D/g, "");
};

const normalizeGameMinutes = () => {
  if (!gameMinutesInput.value.trim()) {
    gameMinutesInput.value = "0";
    return;
  }
  gameMinutesInput.value = String(Math.min(120, Number(gameMinutesInput.value) || 0));
};

const publishOptions = () => {
  const state = scoreboardStore.state;
  const opts: {
    organizerId: string | null;
    title: string;
    tournamentId?: string | null;
  } = {
    organizerId: auth.userId,
    title: `${state.localTeam} vs ${state.visitTeam}`,
  };
  if (activeTournamentId.value) {
    opts.tournamentId = activeTournamentId.value;
  }
  return opts;
};

let publishTimeout: number | null = null;
let controlsTicker: number | null = null;

/** El reloj visible en UI debe estar en el store antes de publicar (evita reset en TV/live). */
function syncClocksToStore() {
  touchControlsWriterHeartbeat();
  scoreboardStore.updatePartial({
    timeGame: formattedTime.value,
    penaltyGame: formattedPenalty.value,
  });
}

function clearPendingPublish() {
  if (publishTimeout) {
    window.clearTimeout(publishTimeout);
    publishTimeout = null;
  }
}

const scheduleRemotePublish = () => {
  if (advancingMatch.value || !isRemoteSyncEnabled() || !activeMatchId.value) return;
  if (publishTimeout) {
    window.clearTimeout(publishTimeout);
  }
  publishTimeout = window.setTimeout(() => {
    publishTimeout = null;
    if (advancingMatch.value) return;
    syncClocksToStore();
    void publishMatchState(activeMatchId.value, scoreboardStore.state, {
      ...publishOptions(),
      isLive: true,
    });
  }, 120);
};

const flushRemotePublish = () => {
  if (advancingMatch.value || !isRemoteSyncEnabled() || !activeMatchId.value) return;
  clearPendingPublish();
  syncClocksToStore();
  void publishMatchState(activeMatchId.value, scoreboardStore.state, {
    ...publishOptions(),
    isLive: true,
  });
};

async function loadTournamentContext() {
  if (!remoteSyncEnabled || !activeMatchId.value) {
    if (!activeTournamentId.value) {
      tournamentContext.value = null;
    }
    return;
  }

  loadingTournament.value = true;
  try {
    let ctx = await fetchTournamentControlsContext(activeMatchId.value);
    if (!ctx && activeTournamentId.value) {
      ctx = await fetchTournamentControlsContextByTournamentId(
        activeTournamentId.value,
        activeMatchId.value,
        getActiveCourt() ?? tournamentContext.value?.court
      );
    }
    if (ctx) {
      activeTournamentId.value = ctx.tournament.id;
      setActiveTournamentId(ctx.tournament.id);
      tournamentContext.value = ctx;
    } else if (!activeTournamentId.value) {
      tournamentContext.value = null;
    }
  } finally {
    loadingTournament.value = false;
  }
}

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
  const snapshot = scoreboardStore.state;
  local.value = snapshot.localTeam;
  visit.value = snapshot.visitTeam;
  localGoals.value = String(snapshot.goalLocal);
  visitGoals.value = String(snapshot.goalVisit);
  gamePeriod.value = String(snapshot.gamePeriod);
  formattedTime.value = snapshot.timeGame || "20:00";
  formattedPenalty.value = snapshot.penaltyGame || "00:00";
  gameMinutesInput.value = String(minutesFromTimeGame(snapshot.timeGame));
  isPaused.value = snapshot.isPaused;
  syncPenalizedFromStorage();
};

const tickTimersFromControls = () => {
  if (advancingMatch.value) return;

  touchControlsWriterHeartbeat();

  if (isPaused.value) {
    syncUiFromLocalStorage();
    return;
  }

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

const showTimeEndedAlert = ref(false);

const togglePause = () => {
  setPaused(!isPaused.value);
  notifyScoreboardSync();
  flushRemotePublish();
};

const changeGoalLocal = (value: number) => {
  syncClocksToStore();
  const next = Math.max(0, scoreboardStore.state.goalLocal + value);
  scoreboardStore.updatePartial({ goalLocal: next });
  localGoals.value = String(next);
  notifyScoreboardSync();
  flushRemotePublish();
};

const changeGoalVisit = (value: number) => {
  syncClocksToStore();
  const next = Math.max(0, scoreboardStore.state.goalVisit + value);
  scoreboardStore.updatePartial({ goalVisit: next });
  visitGoals.value = String(next);
  notifyScoreboardSync();
  flushRemotePublish();
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
      `¿Resetear el tiempo de juego a ${selectedTime.value} (${gameMinutesInput.value} minutos)?\n` +
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
  if (window.confirm("¿Resetear el tiempo de juego?")) {
    setGameTime(selectedTime.value);
  }
};

const resetPenalty = () => {
  if (window.confirm("¿Resetear el tiempo de penalidad?")) {
    setPenaltyClock(selectedPenalty.value);
    if (parseTimeToMs(selectedPenalty.value) <= 0) {
      clearPenalizedFlags();
    }
  }
};

function findActiveTournamentMatch(): TournamentMatch | null {
  const ctx = tournamentContext.value;
  if (!ctx || !activeMatchId.value) return null;

  const byId = ctx.tournament.matches.find((m) => m.matchId === activeMatchId.value);
  if (byId) return byId;

  return ctx.currentMatch;
}

async function finishCurrentTournamentMatchIfNeeded() {
  const current = findActiveTournamentMatch();
  if (!current || !activeMatchId.value) return;

  clearPendingPublish();

  const finishedMatchId = activeMatchId.value;
  const finishedState = buildFinishedMatchState(scoreboardStore.state);

  scoreboardStore.setState(finishedState);
  isPaused.value = true;
  formattedTime.value = "00:00";
  formattedPenalty.value = "00:00";
  penalizedLocal.value = false;
  penalizedVisit.value = false;
  notifyScoreboardSync();

  await finishTournamentMatch(current.id, finishedState);

  if (remoteSyncEnabled) {
    await publishMatchState(finishedMatchId, finishedState, {
      organizerId: auth.userId,
      title: `${finishedState.localTeam} vs ${finishedState.visitTeam}`,
      tournamentId:
        tournamentContext.value?.tournament.id ?? activeTournamentId.value ?? undefined,
      isLive: false,
    });
  } else {
    await setMatchLiveStatus(finishedMatchId, false);
  }
}

function applyTournamentMatchToControls(scheduled: TournamentMatch, matchId: string) {
  const freshState = createFreshMatchState({
    localTeam: scheduled.localTeam,
    visitTeam: scheduled.visitTeam,
    timeGame: scheduled.timeGame,
  });

  setActiveMatchId(matchId);
  activeMatchId.value = matchId;
  scoreboardStore.setState(freshState);
  penalizedLocal.value = false;
  penalizedVisit.value = false;
  isPaused.value = true;
  syncUiFromLocalStorage();
}

async function activateTournamentMatch(scheduled: TournamentMatch) {
  if (!auth.userId) {
    message.warning("Inicia sesión como organizador");
    return;
  }
  if (advancingMatch.value) return;

  startingMatchId.value = scheduled.id;
  clearPendingPublish();
  advancingMatch.value = true;
  try {
    await loadTournamentContext();
    await finishCurrentTournamentMatchIfNeeded();

    activeTournamentId.value = scheduled.tournamentId;
    setActiveTournamentId(scheduled.tournamentId);

    const { matchId } = await startTournamentMatch(scheduled.id, auth.userId);
    applyTournamentMatchToControls(scheduled, matchId);

    await router.replace({ path: "/controls", query: { matchId } });
    notifyScoreboardSync();
    notifyMatchChanged(matchId);

    if (remoteSyncEnabled) {
      syncClocksToStore();
      await publishMatchState(matchId, scoreboardStore.state, {
        ...publishOptions(),
        organizerId: auth.userId,
        isLive: true,
      });
    }

    await loadTournamentContext();
    message.success(
      `${scheduled.localTeam} vs ${scheduled.visitTeam}. Nueva URL live: ${getPublicLiveUrl(matchId)}`
    );
  } catch (error) {
    message.error(error instanceof Error ? error.message : "No se pudo cargar el partido");
  } finally {
    advancingMatch.value = false;
    startingMatchId.value = null;
  }
}

async function startScheduledTournamentMatch(scheduled: TournamentMatch) {
  const confirmed = window.confirm(
    `¿Iniciar ${scheduled.localTeam} vs ${scheduled.visitTeam}?\n\n` +
      "El partido actual se marcará como finalizado."
  );
  if (!confirmed) return;
  await activateTournamentMatch(scheduled);
}

async function startNextTournamentMatch() {
  if (!tournamentContext.value) {
    await loadTournamentContext();
  }

  const next = tournamentContext.value?.upcomingMatches[0];
  if (!next) {
    message.info("No hay más partidos programados en esta cancha");
    return;
  }

  const confirmed = window.confirm(
    `¿Pasar al siguiente partido?\n\n` +
      `${next.localTeam} vs ${next.visitTeam} (${next.timeGame})\n\n` +
      "Se reinician goles, periodo y relojes. Habra una nueva URL de live para espectadores."
  );
  if (!confirmed) return;

  await activateTournamentMatch(next);
}

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
  activeTournamentId.value = null;
  setActiveTournamentId(null);
  tournamentContext.value = null;

  penalizedLocal.value = false;
  penalizedVisit.value = false;
  isPaused.value = true;
  syncUiFromLocalStorage();

  await router.replace({ path: "/controls", query: { matchId: newMatchId } });
  notifyScoreboardSync();
  notifyMatchChanged(newMatchId);

  if (remoteSyncEnabled) {
    await publishMatchState(newMatchId, scoreboardStore.state, publishOptions());
  }
};

const onAdvanceMatch = () => {
  if (isTournamentMode.value) {
    void startNextTournamentMatch();
  } else {
    void startNewMatch();
  }
};

const updateLocalTeam = () => {
  scoreboardStore.updatePartial({ localTeam: local.value });
  notifyScoreboardSync();
  scheduleRemotePublish();
};

const updateVisitlTeam = () => {
  scoreboardStore.updatePartial({ visitTeam: visit.value });
  notifyScoreboardSync();
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
  if (
    event.key === "penalized-local" ||
    event.key === "penalized-visit" ||
    event.key === "penalized-team"
  ) {
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

onMounted(async () => {
  document.title = "Controles";

  const matchId = resolveActiveMatchId(
    typeof route.query.matchId === "string" ? route.query.matchId : null
  );
  activeMatchId.value = matchId;
  activeTournamentId.value = getActiveTournamentId();
  if (route.query.matchId !== matchId) {
    router.replace({ path: "/controls", query: { matchId } });
  }

  scoreboardStore.hydrateFromLocalStorage();
  syncUiFromLocalStorage();

  claimControlsWriter();
  window.addEventListener("beforeunload", releaseControlsWriter);

  await auth.init();
  await loadTournamentContext();

  if (remoteSyncEnabled && activeMatchId.value) {
    const remoteState = await fetchMatchState(activeMatchId.value);
    if (!remoteState) {
      scheduleRemotePublish();
    } else if (
      isRemoteStateNewer(remoteState, scoreboardStore.state.updatedAt)
    ) {
      scoreboardStore.setState(normalizeScoreboardState(remoteState));
      syncUiFromLocalStorage();
      notifyScoreboardSync();
    } else {
      scheduleRemotePublish();
    }
  }

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
.controls-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #fff;
}

.controls-panel {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.controls-page.has-tournament .controls-panel {
  flex: 0 0 50%;
}

.upcoming-panel {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-top: 4px solid #000;
  padding: 8px 12px;
  background: #fafafa;
}

.upcoming-title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
}

.upcoming-count {
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
}

.controls-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 6px;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 12px;
}

.match-panel-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.live-link {
  color: #1677ff;
}

.controls-row {
  flex: 1;
  min-height: 0;
  padding: 6px 4px;
}

.team-goals-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.team-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.team-label {
  font-size: 13px;
  font-weight: 600;
}

.team-name-input {
  width: 100%;
  max-width: 180px;
}

.score-label {
  font-size: 18px;
  font-weight: 700;
}

.goal-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.penalty-button {
  min-width: 88px;
}

.row-divider {
  height: 120px !important;
  margin: 0 4px;
}

.clock-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.clock-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
}

.pause-button {
  min-width: 88px;
  height: 40px !important;
  font-size: 14px !important;
  align-self: center;
}

.game-time-input {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.time-minutes-input {
  width: 56px;
  text-align: center;
}

.time-minutes-label {
  font-size: 12px;
}

.adjust-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
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
