<template>
  <div class="overlay-root">
  
    <div v-if="!tournamentId" class="overlay-hint">
      Enlace inválido: <code>/overlay/torneo/:torneoId/:cancha</code>
    </div>
    <div v-else-if="!isRemoteConfigured" class="overlay-hint">
      Sincronización remota no configurada.
    </div>
    <div v-else-if="streamError" class="overlay-hint">{{ streamError }}</div>
    <div v-else-if="waitingForMatch" class="overlay-hint">
      Overlay — {{ courtLabel }}<br />
      <span class="hint-sub">Esperando partido en cancha…</span>
    </div>
    <div v-else class="scoreboard-wrap">
      <p v-if="loadError" class="overlay-sync-warning">{{ loadError }}</p>
      <p
        v-else-if="!isPolling && !isPollingStream && isRemoteConfigured"
        class="overlay-sync-warning"
      >
        Iniciando sincronización…
      </p>
      <div class="scoreboard-pill">
        <div class="team-stack team-local">
          <div class="team-main">
            <div class="team-logo team-logo--edge team-logo--edge-left" aria-hidden="true">
              <span class="team-logo-fallback">{{ localInitials }}</span>
            </div>
            <div class="team-body">
              <span class="team-name">{{ snapshot.localTeam }}</span>
            </div>
            <span class="team-score">{{ snapshot.goalLocal }}</span>
          </div>
          <div v-if="powerPlayOnLocal" class="pp-banner">
            <span class="pp-label">{{ powerPlayLabel }}</span>
            <span class="pp-time">{{ clocks.penaltyGame }}</span>
          </div>
        </div>

        <div
          class="clock-block"
          :class="{ paused: snapshot.isPaused, 'time-ended': showTimeEndedAlert }"
        >
          <span class="period-tag">{{ periodLabel }}</span>
          <span class="clock-separator" aria-hidden="true">·</span>
          <span class="game-time">{{ clocks.timeGame }}</span>
        </div>

        <div class="team-stack team-visit">
          <div class="team-main team-main--visit">
            <span class="team-score">{{ snapshot.goalVisit }}</span>
            <div class="team-body team-body--visit">
              <span class="team-name">{{ snapshot.visitTeam }}</span>
            </div>
            <div class="team-logo team-logo--edge team-logo--edge-right" aria-hidden="true">
              <span class="team-logo-fallback">{{ visitInitials }}</span>
            </div>
          </div>
          <div v-if="powerPlayOnVisit" class="pp-banner">
            <span class="pp-label">{{ powerPlayLabel }}</span>
            <span class="pp-time">{{ clocks.penaltyGame }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useBroadcastPage } from "../composables/useBroadcastPage";
import { useTournamentCourtBoard } from "../composables/useTournamentCourtBoard";

useBroadcastPage("overlay");

const {
  tournamentId,
  courtLabel,

  snapshot,
  clocks,
  loadError,
  streamError,
  waitingForMatch,
  isRemoteConfigured,
  isPolling,
  isPollingStream,

  showTimeEndedAlert,
  showPowerPlayLocal,
  showPowerPlayVisit,
  showThreeOnThree,
  showPenaltyClock,
} = useTournamentCourtBoard({ documentTitle: "Overlay — torneo" });

function teamInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

const periodLabel = computed(() => {
  const p = snapshot.value.gamePeriod;
  if (p >= 4) return "TE";
  return `${p}T`;
});

const localInitials = computed(() => teamInitials(snapshot.value.localTeam));
const visitInitials = computed(() => teamInitials(snapshot.value.visitTeam));

const powerPlayOnLocal = computed(
  () => showPenaltyClock.value && (showPowerPlayLocal.value || showThreeOnThree.value)
);
const powerPlayOnVisit = computed(
  () => showPenaltyClock.value && (showPowerPlayVisit.value || showThreeOnThree.value)
);

const powerPlayLabel = computed(() => {
  if (showThreeOnThree.value) return "3c3";
  return "POWER PLAY";
});
</script>

<style scoped lang="scss">
$overlay-bg: #1a1a1a;
$overlay-bg-muted: #141414;

.overlay-root {
  min-height: 100vh;
  padding: 16px 24px;
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  font-family: "Roboto Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif;
}

.overlay-hint {
  max-width: 420px;
  padding: 12px 16px;
  font-size: 14px;
  color: #fff;
  background: $overlay-bg;
  border-radius: 8px;
}

.hint-sub {
  opacity: 0.8;
  font-size: 13px;
}

.overlay-sync-warning {
  margin: 0 0 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(180, 30, 30, 0.85);
  color: #fff;
  font-size: 13px;
  text-align: center;
}

.scoreboard-wrap {
  width: min(100%, 920px);
}

.scoreboard-pill {
  display: flex;
  align-items: stretch;
  border-radius: 12px;
  overflow: hidden;
  background: $overlay-bg;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}

.team-stack {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-width: 0;
}

.team-main {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 12px;
  min-height: 72px;
  padding: 0;
  color: #fff;
}

.team-main--visit {
  flex-direction: row;
}

.team-body {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
  padding: 10px 12px;
}

.team-body--visit {
  justify-content: flex-end;
}

.team-logo {
  flex: 0 0 auto;
  align-self: stretch;
  height: 100%;
  aspect-ratio: 1;
  width: auto;
  min-width: 56px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-sizing: border-box;
}

.team-logo--edge-left {
  border-left: 4px solid rgba(255, 255, 255, 0.85);
  border-radius: 12px 0 0 0;
}

.team-logo--edge-right {
  border-right: 4px solid rgba(255, 255, 255, 0.85);
  border-radius: 0 12px 0 0;
}

.team-logo-fallback {
  font-size: clamp(16px, 2vw, 22px);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.8);
}

.team-name {
  font-size: clamp(20px, 2.6vw, 28px);
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
}

.team-score {
  flex: 0 0 auto;
  align-self: center;
  padding-right: 14px;
  font-size: clamp(32px, 4.5vw, 44px);
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.45);
}

.team-main--visit .team-score {
  padding-right: 0;
  padding-left: 14px;
}

.pp-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #fff;
  background: $overlay-bg-muted;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.pp-time {
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.clock-block {
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 140px;
  padding: 10px 16px;
  color: #fff;
  background: $overlay-bg;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
}

.pause-hint {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #ff6b6b;
}

.clock-block.paused .game-time {
  opacity: 0.55;
}

.clock-block.time-ended .game-time {
  color: #ff4d4f;
  animation: time-flash 0.7s ease-in-out infinite;
}

@keyframes time-flash {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.period-tag,
.clock-separator,
.game-time {
  color: #fff;
}

.period-tag {
  font-size: clamp(16px, 2vw, 20px);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.clock-separator {
  font-size: 18px;
  font-weight: 700;
  opacity: 0.45;
  line-height: 1;
}

.game-time {
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-family: "DS-DIGIT", "Roboto Condensed", sans-serif;
  letter-spacing: 0.03em;
  line-height: 1;
}
</style>