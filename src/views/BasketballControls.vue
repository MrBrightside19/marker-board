<template>
  <div class="basketball-controls">
    <OperatorCloseGuardBanner :needs-arm-click="needsArmClick" :arm-now="armNow" />
    <section class="controls-panel">
      <div class="controls-toolbar">
        <div v-if="activeMatchId && remoteSyncEnabled" class="match-info">
          <strong>Partido:</strong> {{ activeMatchId }}
          <a class="live-link" :href="publicUrl" target="_blank" rel="noopener">Live</a>
        </div>
        <a-button type="primary" danger size="small" :loading="startingNew" @click="startNewMatch">
          Nuevo partido
        </a-button>
      </div>

      <div class="teams-row">
        <div class="team-column local">
          <span class="team-tag">Local</span>
          <a-input v-model:value="localTeam" size="small" placeholder="Equipo local" />
          <div class="points-display">{{ pointsLocal }}</div>
          <div class="points-buttons">
            <a-button type="primary" @click="addPoints('local', 1)">+1</a-button>
            <a-button type="primary" @click="addPoints('local', 2)">+2</a-button>
            <a-button type="primary" @click="addPoints('local', 3)">+3</a-button>
            <a-button @click="addPoints('local', -1)">−1</a-button>
          </div>
          <div class="fouls-row">
            <span>Faltas: {{ foulsLocal }}</span>
            <a-button size="small" @click="changeFouls('local', 1)">+ Falta</a-button>
            <a-button size="small" @click="changeFouls('local', -1)">− Falta</a-button>
          </div>
        </div>

        <div class="center-column">
          <div class="period-controls">
            <span class="section-label">Periodo</span>
            <div class="period-value">{{ gamePeriod }}</div>
            <div class="period-buttons">
              <a-button size="small" @click="changePeriod(-1)">−</a-button>
              <a-button size="small" type="primary" @click="changePeriod(1)">+</a-button>
              <a-button size="small" @click="resetFouls">Reset faltas</a-button>
            </div>
          </div>

          <div class="time-controls">
            <span class="section-label">Tiempo</span>
            <div class="time-input-row">
              <a-input
                v-model:value="gameMinutesInput"
                size="small"
                inputmode="numeric"
                maxlength="3"
                class="minutes-input"
                @input="onMinutesInput"
                @blur="normalizeMinutes"
              />
              <span>min</span>
            </div>
            <a-button size="small" block @click="resetTime">Resetear tiempo</a-button>
            <div class="adjust-row">
              <a-button size="small" @click="adjustTime(10)">+10 s</a-button>
              <a-button size="small" @click="adjustTime(5)">+5 s</a-button>
              <a-button size="small" @click="adjustTime(-5)">−5 s</a-button>
              <a-button size="small" @click="adjustTime(-10)">−10 s</a-button>
            </div>
            <div class="clock-display" :class="{ 'time-ended': showTimeEndedAlert }">
              {{ formattedTime }}
            </div>
            <a-button
              block
              type="primary"
              :danger="!isPaused"
              @click="togglePause"
            >
              {{ isPaused ? "Continuar" : "Pausar" }}
            </a-button>
          </div>
        </div>

        <div class="team-column visit">
          <span class="team-tag visit-tag">Visita</span>
          <a-input v-model:value="visitTeam" size="small" placeholder="Equipo visita" />
          <div class="points-display visit-points">{{ pointsVisit }}</div>
          <div class="points-buttons">
            <a-button type="primary" danger @click="addPoints('visit', 1)">+1</a-button>
            <a-button type="primary" danger @click="addPoints('visit', 2)">+2</a-button>
            <a-button type="primary" danger @click="addPoints('visit', 3)">+3</a-button>
            <a-button danger @click="addPoints('visit', -1)">−1</a-button>
          </div>
          <div class="fouls-row">
            <span>Faltas: {{ foulsVisit }}</span>
            <a-button size="small" danger @click="changeFouls('visit', 1)">+ Falta</a-button>
            <a-button size="small" danger @click="changeFouls('visit', -1)">− Falta</a-button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import {
  createFreshBasketballState,
  useBasketballScoreboardStore,
} from "../stores/basketballScoreboard";
import {
  fetchBasketballMatchState,
  isBasketballRemoteSyncEnabled,
  publishBasketballMatchState,
} from "../services/basketballMatchSync";
import { useAuthStore } from "../stores/auth";
import {
  createMatchId,
  getBasketballPublicLiveUrl,
  resolveActiveMatchId,
  setActiveMatchId,
} from "../utils/activeMatch";
import OperatorCloseGuardBanner from "../components/OperatorCloseGuardBanner.vue";
import { useOperatorCloseGuard } from "../composables/useOperatorCloseGuard";
import {
  claimBasketballControlsWriter,
  isBasketballRemoteStateNewer,
  notifyBasketballMatchChanged,
  notifyBasketballSync,
  releaseBasketballControlsWriter,
  touchBasketballControlsWriterHeartbeat,
} from "../utils/basketballSync";
import { formatTime, parseTimeToMs } from "../utils/scoreboardClock";
import { GAME_TIME_ENDED_EVENT, handleGameTimeTick } from "../utils/gameTimeAlert";

const route = useRoute();
const router = useRouter();
const store = useBasketballScoreboardStore();
const auth = useAuthStore();

const activeMatchId = ref("");
const remoteSyncEnabled = isBasketballRemoteSyncEnabled();
const startingNew = ref(false);
const isPaused = ref(true);
const gamePeriod = ref(1);
const pointsLocal = ref(0);
const pointsVisit = ref(0);
const foulsLocal = ref(0);
const foulsVisit = ref(0);
const localTeam = ref("Equipo Local");
const visitTeam = ref("Equipo Visita");
const gameMinutesInput = ref("10");
const formattedTime = ref("10:00");
const showTimeEndedAlert = ref(false);

let publishTimeout: number | null = null;
let controlsTicker: number | null = null;

const { needsArmClick, armNow } = useOperatorCloseGuard();

const publicUrl = computed(() =>
  activeMatchId.value ? getBasketballPublicLiveUrl(activeMatchId.value) : ""
);

function syncUiFromStore() {
  const s = store.state;
  localTeam.value = s.localTeam;
  visitTeam.value = s.visitTeam;
  pointsLocal.value = s.pointsLocal;
  pointsVisit.value = s.pointsVisit;
  foulsLocal.value = s.foulsLocal;
  foulsVisit.value = s.foulsVisit;
  gamePeriod.value = s.gamePeriod;
  formattedTime.value = s.timeGame;
  isPaused.value = s.isPaused;
  gameMinutesInput.value = String(Math.max(0, Math.round(parseTimeToMs(s.timeGame) / 60000)));
}

function publishOptions() {
  return {
    organizerId: auth.userId,
    title: `${store.state.localTeam} vs ${store.state.visitTeam}`,
    isLive: true,
  };
}

function clearPendingPublish() {
  if (publishTimeout) {
    window.clearTimeout(publishTimeout);
    publishTimeout = null;
  }
}

function syncClockToStore() {
  touchBasketballControlsWriterHeartbeat();
  store.updatePartial({ timeGame: formattedTime.value });
}

function scheduleRemotePublish() {
  if (!remoteSyncEnabled || !activeMatchId.value) return;
  if (publishTimeout) window.clearTimeout(publishTimeout);
  publishTimeout = window.setTimeout(() => {
    publishTimeout = null;
    syncClockToStore();
    void publishBasketballMatchState(activeMatchId.value, store.state, publishOptions());
  }, 120);
}

function flushRemotePublish() {
  if (!remoteSyncEnabled || !activeMatchId.value) return;
  clearPendingPublish();
  syncClockToStore();
  void publishBasketballMatchState(activeMatchId.value, store.state, publishOptions());
}

function commitPartial(partial: Parameters<typeof store.updatePartial>[0]) {
  syncClockToStore();
  store.updatePartial(partial);
  syncUiFromStore();
  notifyBasketballSync();
  scheduleRemotePublish();
}

function addPoints(side: "local" | "visit", value: number) {
  if (side === "local") {
    commitPartial({ pointsLocal: Math.max(0, store.state.pointsLocal + value) });
  } else {
    commitPartial({ pointsVisit: Math.max(0, store.state.pointsVisit + value) });
  }
}

function changeFouls(side: "local" | "visit", delta: number) {
  if (side === "local") {
    commitPartial({ foulsLocal: Math.max(0, store.state.foulsLocal + delta) });
  } else {
    commitPartial({ foulsVisit: Math.max(0, store.state.foulsVisit + delta) });
  }
}

function resetFouls() {
  commitPartial({ foulsLocal: 0, foulsVisit: 0 });
}

function changePeriod(delta: number) {
  const next = Math.max(1, Math.min(8, store.state.gamePeriod + delta));
  commitPartial({ gamePeriod: next, foulsLocal: 0, foulsVisit: 0 });
}

function minutesToTime(raw: string | number): string {
  const minutes = Math.max(0, Math.min(60, Math.floor(Number(raw) || 0)));
  return `${String(minutes).padStart(2, "0")}:00`;
}

function onMinutesInput(event: Event) {
  gameMinutesInput.value = (event.target as HTMLInputElement).value.replace(/\D/g, "");
}

function normalizeMinutes() {
  if (!gameMinutesInput.value.trim()) gameMinutesInput.value = "0";
  gameMinutesInput.value = String(Math.min(60, Number(gameMinutesInput.value) || 0));
}

function resetTime() {
  const next = minutesToTime(gameMinutesInput.value);
  formattedTime.value = next;
  commitPartial({ timeGame: next });
  showTimeEndedAlert.value = false;
}

function adjustTime(seconds: number) {
  const next = formatTime(parseTimeToMs(store.state.timeGame) + seconds * 1000);
  formattedTime.value = next;
  commitPartial({ timeGame: next });
}

function setPaused(next: boolean) {
  isPaused.value = next;
  store.updatePartial({ isPaused: next });
}

function togglePause() {
  setPaused(!isPaused.value);
  notifyBasketballSync();
  flushRemotePublish();
}

function tickClock() {
  touchBasketballControlsWriterHeartbeat();
  if (isPaused.value) {
    syncUiFromStore();
    return;
  }

  const currentMs = parseTimeToMs(store.state.timeGame);
  const nextMs = Math.max(0, currentMs - 1000);
  const next = formatTime(nextMs);
  formattedTime.value = next;
  handleGameTimeTick(currentMs, nextMs, isPaused.value);
  store.updatePartial({ timeGame: next });
  scheduleRemotePublish();
}

async function startNewMatch() {
  startingNew.value = true;
  try {
    const matchId = createMatchId();
    const state = createFreshBasketballState({
      localTeam: localTeam.value,
      visitTeam: visitTeam.value,
      timeGame: minutesToTime(gameMinutesInput.value),
    });

    setActiveMatchId(matchId);
    activeMatchId.value = matchId;
    store.setState(state);
    syncUiFromStore();
    notifyBasketballMatchChanged(matchId);
    notifyBasketballSync();

    if (remoteSyncEnabled) {
      await publishBasketballMatchState(matchId, state, publishOptions());
    }

    await router.replace({ path: "/basquet/controls", query: { matchId } });
    message.success("Nuevo partido de básquet iniciado");
  } finally {
    startingNew.value = false;
  }
}

watch(localTeam, (value) => {
  if (value !== store.state.localTeam) commitPartial({ localTeam: value });
});

watch(visitTeam, (value) => {
  if (value !== store.state.visitTeam) commitPartial({ visitTeam: value });
});

onMounted(async () => {
  document.title = "Controles Básquet";
  await auth.init();

  if (!auth.isOrganizer) {
    message.warning("Solo los organizadores pueden usar la mesa de control.");
    router.replace("/");
    return;
  }

  claimBasketballControlsWriter();

  const matchId = resolveActiveMatchId(
    typeof route.query.matchId === "string" ? route.query.matchId : null
  );
  activeMatchId.value = matchId;
  if (route.query.matchId !== matchId) {
    router.replace({ path: "/basquet/controls", query: { matchId } });
  }

  store.hydrateFromLocalStorage();
  syncUiFromStore();

  if (remoteSyncEnabled) {
    const remote = await fetchBasketballMatchState(matchId);
    if (remote && isBasketballRemoteStateNewer(remote, store.state.updatedAt)) {
      store.setState(remote);
      syncUiFromStore();
    }
  }

  controlsTicker = window.setInterval(tickClock, 1000);
  window.addEventListener(GAME_TIME_ENDED_EVENT, () => {
    showTimeEndedAlert.value = true;
  });
});

onUnmounted(() => {
  if (controlsTicker) window.clearInterval(controlsTicker);
  clearPendingPublish();
  releaseBasketballControlsWriter();
});
</script>

<style scoped>
.basketball-controls {
  min-height: 100vh;
  padding: 16px;
  background: #120a04;
  color: #fff;
}

.controls-panel {
  max-width: 980px;
  margin: 0 auto;
  background: #1a1208;
  border: 1px solid #4a3018;
  border-radius: 12px;
  padding: 16px;
}

.controls-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.match-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.live-link {
  color: #ffb366;
}

.teams-row {
  display: grid;
  grid-template-columns: 1fr minmax(220px, 280px) 1fr;
  gap: 16px;
}

.team-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  background: #22160c;
  border: 1px solid #4a3018;
}

.team-column.local {
  border-color: #ff6b00;
}

.team-column.visit {
  border-color: #d4380d;
}

.team-tag {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: #ffb366;
}

.visit-tag {
  color: #ff7875;
}

.points-display {
  font-size: 48px;
  font-weight: 700;
  text-align: center;
  line-height: 1;
}

.visit-points {
  color: #ff7875;
}

.points-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.fouls-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.75);
}

.center-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.period-controls,
.time-controls {
  padding: 14px;
  border-radius: 10px;
  background: #22160c;
  border: 1px solid #4a3018;
}

.section-label {
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  color: rgba(255, 180, 100, 0.8);
  margin-bottom: 8px;
}

.period-value {
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 10px;
  color: #ff8c28;
}

.period-buttons,
.adjust-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.time-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.minutes-input {
  width: 72px;
}

.clock-display {
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin: 12px 0;
  font-variant-numeric: tabular-nums;
}

.clock-display.time-ended {
  color: #ff4d4f;
}

@media (max-width: 768px) {
  .teams-row {
    grid-template-columns: 1fr;
  }
}
</style>
