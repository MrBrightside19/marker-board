<template>
  <div class="basketball-public font-digital">
    <div v-if="!matchId" class="status-message">
      Abre esta vista con un enlace válido (/basquet/live/:matchId).
    </div>
    <div v-else-if="!isRemoteConfigured" class="status-message">
      Sincronización remota no configurada.
    </div>
    <div v-else-if="loadError" class="status-message">{{ loadError }}</div>
    <div v-else class="board-content">
      <div class="team-panel left">
        <div class="team-name">{{ snapshot.localTeam }}</div>
        <div class="team-score">{{ snapshot.pointsLocal }}</div>
        <div class="team-fouls">
          <span class="fouls-label">Faltas</span>
          <span class="fouls-value">{{ snapshot.foulsLocal }}</span>
        </div>
      </div>

      <div class="center-panel">
        <div class="clock" :class="{ 'time-ended': showTimeEndedAlert }">{{ displayClock }}</div>
        <div class="meta-label">Periodo</div>
        <div class="period-value">{{ snapshot.gamePeriod }}</div>
      </div>

      <div class="team-panel right">
        <div class="team-name">{{ snapshot.visitTeam }}</div>
        <div class="team-score">{{ snapshot.pointsVisit }}</div>
        <div class="team-fouls">
          <span class="fouls-label">Faltas</span>
          <span class="fouls-value">{{ snapshot.foulsVisit }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { normalizeBasketballState } from "../stores/basketballScoreboard";
import { DEFAULT_BASKETBALL_STATE, type BasketballScoreboardState } from "../types/basketballScoreboard";
import {
  fetchBasketballMatchState,
  isBasketballRemoteSyncEnabled,
} from "../services/basketballMatchSync";
import { getPollIntervalMs } from "../config/sync";
import { getBasketballRunningClock } from "../utils/basketballClock";
import { GAME_TIME_ENDED_EVENT, handleGameTimeTick } from "../utils/gameTimeAlert";
import { parseTimeToMs } from "../utils/scoreboardClock";
import { useBroadcastPage } from "../composables/useBroadcastPage";

useBroadcastPage("live");

const route = useRoute();
const snapshot = ref<BasketballScoreboardState>({ ...DEFAULT_BASKETBALL_STATE });
const nowMs = ref(Date.now());
const loadError = ref("");
const showTimeEndedAlert = ref(false);
const prevTimeGame = ref("");
const pollIntervalMs = getPollIntervalMs();

const matchId = computed(() => route.params.matchId?.toString() || "");
const isRemoteConfigured = isBasketballRemoteSyncEnabled();

const displayClock = computed(() => getBasketballRunningClock(snapshot.value, nowMs.value));

watch(displayClock, (time) => {
  const previousMs = parseTimeToMs(prevTimeGame.value || time);
  const nextMs = parseTimeToMs(time);
  if (prevTimeGame.value) {
    handleGameTimeTick(previousMs, nextMs, snapshot.value.isPaused);
  }
  if (time !== "00:00") showTimeEndedAlert.value = false;
  prevTimeGame.value = time;
});

let tickInterval: number | null = null;
let pollInterval: number | null = null;

async function refreshFromServer() {
  if (!matchId.value) return;
  const remote = await fetchBasketballMatchState(matchId.value);
  if (!remote) {
    if (!snapshot.value.updatedAt) {
      loadError.value = "No se encontró el partido en el servidor.";
    }
    return;
  }
  loadError.value = "";
  snapshot.value = normalizeBasketballState(remote);
  document.title = "Básquet en vivo";
}

onMounted(async () => {
  if (!matchId.value || !isRemoteConfigured) return;
  await refreshFromServer();
  prevTimeGame.value = displayClock.value;

  tickInterval = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);

  window.addEventListener(GAME_TIME_ENDED_EVENT, () => {
    showTimeEndedAlert.value = true;
  });

  pollInterval = window.setInterval(() => {
    void refreshFromServer();
  }, pollIntervalMs);
});

onUnmounted(() => {
  if (tickInterval) window.clearInterval(tickInterval);
  if (pollInterval) window.clearInterval(pollInterval);
});
</script>

<style scoped lang="scss">
.basketball-public {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(180deg, #1a1208 0%, #0d0905 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-message {
  font-size: clamp(18px, 2.4vw, 36px);
  padding: 20px;
  text-align: center;
}

.board-content {
  width: min(100vw, calc(100vh * 16 / 9));
  aspect-ratio: 16 / 9;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
}

.team-panel {
  text-align: center;
}

.team-name {
  font-size: clamp(22px, 4vw, 80px);
  margin-bottom: clamp(8px, 2vh, 28px);
}

.team-score {
  font-size: clamp(80px, 16vw, 340px);
  line-height: 0.9;
  text-shadow: 0 0 20px rgba(255, 107, 0, 0.3);
}

.team-fouls {
  margin-top: clamp(10px, 3cqh, 40px);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fouls-label {
  font-size: clamp(14px, 4.5cqh, 56px);
  color: rgba(255, 180, 100, 0.75);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.fouls-value {
  font-size: clamp(28px, 12cqh, 140px);
  line-height: 1;
  color: #ffb366;
}

.center-panel {
  text-align: center;
}

.clock {
  font-size: clamp(84px, 14vw, 300px);
  line-height: 0.9;
}

.clock.time-ended {
  color: #ff4d4f;
  animation: blink 0.7s ease-in-out infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.meta-label {
  margin-top: clamp(12px, 2vh, 24px);
  font-size: clamp(18px, 2.5vw, 48px);
  color: rgba(255, 180, 100, 0.8);
}

.period-value {
  font-size: clamp(36px, 6vw, 110px);
  color: #ff8c28;
}
</style>
