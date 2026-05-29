<template>
  <div class="basketball-board font-digital">
    <div aria-hidden="true" />

    <div class="session-bar">
      <router-link to="/" class="session-link">Inicio</router-link>
      <template v-if="activeMatchId && remoteSyncEnabled">
        <span class="session-label">Partido: {{ activeMatchId }}</span>
        <a class="session-link" :href="publicUrl" target="_blank" rel="noopener">Live público</a>
      </template>
    </div>

    <a-button
      type="primary"
      size="large"
      class="controls-button"
      @click="openControlsInNewTab"
    >
      Controles
    </a-button>

    <div class="board-stage">
      <div class="board-grid">
        <div class="team-panel local">
          <div class="team-name">{{ snapshot.localTeam }}</div>
          <div class="team-score">{{ snapshot.pointsLocal }}</div>
          <div class="team-fouls">
            <span class="fouls-label">Faltas</span>
            <span class="fouls-value">{{ snapshot.foulsLocal }}</span>
          </div>
        </div>

        <div class="center-panel">
          <div class="clock" :class="{ 'time-ended': showTimeEndedAlert }">{{ displayClock }}</div>
          <div class="period-block">
            <div class="meta-label">Periodo</div>
            <div class="period-value">{{ snapshot.gamePeriod }}</div>
          </div>
        </div>

        <div class="team-panel visit">
          <div class="team-name">{{ snapshot.visitTeam }}</div>
          <div class="team-score">{{ snapshot.pointsVisit }}</div>
          <div class="team-fouls">
            <span class="fouls-label">Faltas</span>
            <span class="fouls-value">{{ snapshot.foulsVisit }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useBasketballScoreboardStore } from "../../stores/basketballScoreboard";
import {
  fetchBasketballMatchState,
  isBasketballRemoteSyncEnabled,
} from "../../services/basketballMatchSync";
import { getPollIntervalMs } from "../../config/sync";
import {
  getBasketballPublicLiveUrl,
  resolveActiveMatchId,
  setActiveMatchId,
} from "../../utils/activeMatch";
import { getBasketballRunningClock } from "../../utils/basketballClock";
import {
  BASKETBALL_MATCH_CHANGED_EVENT,
  BASKETBALL_SYNC_EVENT,
  isBasketballControlsActiveWriter,
  isBasketballRemoteStateNewer,
} from "../../utils/basketballSync";
import { GAME_TIME_ENDED_EVENT } from "../../utils/gameTimeAlert";
import { parseTimeToMs } from "../../utils/scoreboardClock";

const router = useRouter();
const route = useRoute();
const store = useBasketballScoreboardStore();
const activeMatchId = ref("");
const remoteSyncEnabled = isBasketballRemoteSyncEnabled();
const nowMs = ref(Date.now());
const showTimeEndedAlert = ref(false);
const pollIntervalMs = getPollIntervalMs();

let pollInterval: number | null = null;
let displayInterval: number | null = null;

const publicUrl = computed(() =>
  activeMatchId.value ? getBasketballPublicLiveUrl(activeMatchId.value) : ""
);

const snapshot = computed(() => store.state);

const displayClock = computed(() => {
  if (isBasketballControlsActiveWriter()) {
    return snapshot.value.timeGame;
  }
  return getBasketballRunningClock(snapshot.value, nowMs.value);
});

function openControlsInNewTab() {
  const routeLocation = router.resolve({
    path: "/basquet/controls",
    query: activeMatchId.value ? { matchId: activeMatchId.value } : {},
  });
  const width = 920;
  const height = 720;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`;
  window.open(routeLocation.href, "basketballControlsWindow", features);
}

function syncFromStore() {
  store.hydrateFromLocalStorage();
  if (parseTimeToMs(store.state.timeGame) > 0) {
    showTimeEndedAlert.value = false;
  }
}

function onGameTimeEnded() {
  showTimeEndedAlert.value = true;
}

function onBasketballSync() {
  syncFromStore();
}

function applyMatchId(matchId: string) {
  if (!matchId || matchId === activeMatchId.value) return;
  activeMatchId.value = matchId;
  setActiveMatchId(matchId);
  router.replace({ path: "/basquet/board", query: { matchId } });
  syncFromStore();
}

function onMatchChanged(event: Event) {
  const matchId = (event as CustomEvent<{ matchId: string }>).detail?.matchId;
  if (matchId) applyMatchId(matchId);
}

onMounted(async () => {
  document.title = "Marcador Básquet";

  const matchId = resolveActiveMatchId(
    typeof route.query.matchId === "string" ? route.query.matchId : null
  );
  activeMatchId.value = matchId;
  if (route.query.matchId !== matchId) {
    router.replace({ path: "/basquet/board", query: { matchId } });
  }

  syncFromStore();

  if (remoteSyncEnabled && activeMatchId.value) {
    const remoteState = await fetchBasketballMatchState(activeMatchId.value);
    if (remoteState && isBasketballRemoteStateNewer(remoteState, store.state.updatedAt)) {
      store.setState(remoteState);
    }

    pollInterval = window.setInterval(async () => {
      if (isBasketballControlsActiveWriter() || !activeMatchId.value) return;
      const remote = await fetchBasketballMatchState(activeMatchId.value);
      if (remote && isBasketballRemoteStateNewer(remote, store.state.updatedAt)) {
        store.setState(remote);
      }
    }, pollIntervalMs);
  }

  window.addEventListener(BASKETBALL_SYNC_EVENT, onBasketballSync);
  window.addEventListener(BASKETBALL_MATCH_CHANGED_EVENT, onMatchChanged);
  window.addEventListener(GAME_TIME_ENDED_EVENT, onGameTimeEnded);

  displayInterval = window.setInterval(() => {
    nowMs.value = Date.now();
    if (isBasketballControlsActiveWriter()) {
      syncFromStore();
    }
  }, 1000);
});

onUnmounted(() => {
  if (displayInterval) window.clearInterval(displayInterval);
  if (pollInterval) window.clearInterval(pollInterval);
  window.removeEventListener(BASKETBALL_SYNC_EVENT, onBasketballSync);
  window.removeEventListener(BASKETBALL_MATCH_CHANGED_EVENT, onMatchChanged);
  window.removeEventListener(GAME_TIME_ENDED_EVENT, onGameTimeEnded);
});
</script>

<style scoped lang="scss">
.basketball-board {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(180deg, #1a1208 0%, #0d0905 45%, #120a04 100%);
  color: #fff;
}

.court-lines {
  position: absolute;
  inset: 8% 6%;
  border: 4px solid rgba(255, 140, 40, 0.35);
  border-radius: 8px;
  pointer-events: none;

  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(255, 140, 40, 0.25);
    transform: translateY(-50%);
  }
}

.session-bar {
  position: absolute;
  top: clamp(8px, 2vh, 20px);
  left: clamp(8px, 2vh, 20px);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: clamp(12px, 1.4vw, 18px);
}

.session-link {
  color: #ffb366;
}

.controls-button {
  position: absolute;
  top: clamp(8px, 2vh, 20px);
  right: clamp(8px, 2vh, 20px);
  z-index: 10;
  background: #ff6b00;
  border-color: #ff6b00;
}

.board-stage {
  width: min(100vw, calc(100vh * 16 / 9));
  aspect-ratio: 16 / 9;
  margin: auto;
  position: relative;
  top: 50%;
  transform: translateY(-50%);
  container-type: size;
}

.board-grid {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  padding: 0 4%;
}

.team-panel {
  text-align: center;
  min-width: 0;
}

.local {
  grid-column: 1;
}

.visit {
  grid-column: 3;
}

.team-name {
  font-size: clamp(18px, 9cqh, 180px);
  line-height: 1.05;
  margin-bottom: clamp(8px, 2.5cqh, 36px);
  color: rgba(255, 255, 255, 0.92);
}

.team-score {
  font-size: clamp(72px, 36cqh, 680px);
  line-height: 0.9;
  color: #fff;
  text-shadow: 0 0 24px rgba(255, 107, 0, 0.35);
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
  grid-column: 2;
  text-align: center;
}

.clock {
  font-size: clamp(64px, 30cqh, 560px);
  line-height: 0.9;
  color: #fff;
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

.period-block {
  margin-top: clamp(8px, 2cqh, 24px);
}

.meta-label {
  font-size: clamp(14px, 5cqh, 72px);
  color: rgba(255, 180, 100, 0.8);
}

.period-value {
  font-size: clamp(28px, 14cqh, 180px);
  line-height: 1;
  color: #ff8c28;
}
</style>
