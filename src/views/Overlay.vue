<template>
  <div class="overlay-root">
    <div v-if="!matchId" class="overlay-hint">
      Abre esta vista con un enlace válido: <code>/overlay/:matchId</code> (desde Controles).
    </div>

    <div v-else-if="!isRemoteConfigured" class="overlay-hint">
      Sincronización remota no configurada. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
    </div>

    <div v-else-if="loadError && !snapshot.updatedAt" class="overlay-hint">
      {{ loadError }}
    </div>

    <div v-else class="scoreboard-wrap">
      <div class="scoreboard-pill">
        <!-- Local (izquierda) -->
        <div class="team-stack team-local">
          <div class="team-main">
            <div class="team-identity">
              <div class="team-logo" aria-hidden="true">
                <span class="team-logo-fallback">{{ localInitials }}</span>
              </div>
              <span class="team-name">{{ snapshot.localTeam }}</span>
            </div>
            <span class="team-score">{{ snapshot.goalLocal }}</span>
          </div>
          <div v-if="powerPlayOnLocal" class="pp-banner">
            <span class="pp-label">{{ powerPlayLabel }}</span>
            <span class="pp-time">{{ clocks.penaltyGame }}</span>
          </div>
        </div>

        <!-- Periodo + tiempo de juego (horizontal) -->
        <div
          class="clock-block"
          :class="{ paused: snapshot.isPaused, 'time-ended': showTimeEndedAlert }"
        >
          <span class="period-tag">{{ periodLabel }}</span>
          <span class="clock-separator" aria-hidden="true">·</span>
          <span class="game-time">{{ clocks.timeGame }}</span>
          <span v-if="snapshot.isPaused" class="pause-hint">PAUSA</span>
        </div>

        <!-- Visita (derecha) -->
        <div class="team-stack team-visit">
          <div class="team-main team-main--visit">
            <span class="team-score">{{ snapshot.goalVisit }}</span>
            <div class="team-identity team-identity--visit">
              <span class="team-name">{{ snapshot.visitTeam }}</span>
              <div class="team-logo" aria-hidden="true">
                <span class="team-logo-fallback">{{ visitInitials }}</span>
              </div>
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
import { computed, onMounted, onUnmounted } from "vue";
import { useRemoteHockeyBoard } from "../composables/useRemoteHockeyBoard";

const {
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
} = useRemoteHockeyBoard({ documentTitle: "Overlay" });

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

/** Periodo en español: 1T, 2T, 3T; tiempo extra = TE. */
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

onMounted(() => {
  document.documentElement.classList.add("overlay-page");
});

onUnmounted(() => {
  document.documentElement.classList.remove("overlay-page");
});
</script>

<style scoped lang="scss">
$overlay-bg: rgba(0, 0, 0, 0.7);

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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 56px;
  padding: 10px 14px;
  color: #fff;
}

.team-main--visit {
  flex-direction: row;
}

.team-identity {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1 1 auto;
}

.team-identity--visit {
  justify-content: flex-end;
}

.team-logo {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px dashed rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  /* Cuando haya logo real: <img class="team-logo-img" /> */
  :deep(.team-logo-img) {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.team-logo-fallback {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.75);
}

.team-name {
  font-size: clamp(14px, 1.8vw, 18px);
  font-weight: 700;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.team-score {
  flex: 0 0 auto;
  font-size: clamp(32px, 4.5vw, 44px);
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.45);
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
  background: rgba(0, 0, 0, 0.45);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.pp-time {
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
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

<style>
html.overlay-page,
html.overlay-page body,
html.overlay-page #app {
  background: transparent !important;
  margin: 0;
  min-height: 100%;
}
</style>
