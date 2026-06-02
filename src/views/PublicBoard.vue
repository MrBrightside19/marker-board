<template>
  <div class="public-board font-digital">
    <div v-if="!matchId" class="status-message">
      Debes abrir esta vista con un enlace de live valido (/live/:matchId).
    </div>
    <div v-else-if="!isRemoteConfigured" class="status-message">
      Sincronizacion remota no configurada. Define VITE_SUPABASE_URL y
      VITE_SUPABASE_ANON_KEY.
    </div>
    <div v-else-if="loadError" class="status-message">{{ loadError }}</div>
    <div v-else class="board-content">
      <div class="team-panel left">
        <div class="team-name">{{ snapshot.localTeam }}</div>
        <div class="team-score">{{ snapshot.goalLocal }}</div>
      </div>

      <div class="center-panel">
        <div class="clock" :class="{ 'time-ended': showTimeEndedAlert }">{{ clocks.timeGame }}</div>
        <div class="meta-group">
          <div class="meta-label">Periodo</div>
          <div class="meta-value">{{ snapshot.gamePeriod }}</div>
        </div>
        <div class="meta-group">
          <div class="meta-label">Penalidad</div>
          <div class="meta-value">{{ clocks.penaltyGame }}</div>
        </div>
      </div>

      <div class="team-panel right">
        <div class="team-name">{{ snapshot.visitTeam }}</div>
        <div class="team-score">{{ snapshot.goalVisit }}</div>
      </div>

      <div class="play-status-bar">
        <div class="play-status">
          <span v-if="snapshot.penalizedVisit && !snapshot.penalizedLocal">Power play</span>
        </div>
        <div class="play-status">
          <span v-if="snapshot.penalizedLocal && snapshot.penalizedVisit">3on3</span>
        </div>
        <div class="play-status">
          <span v-if="snapshot.penalizedLocal && !snapshot.penalizedVisit">Power play</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRemoteHockeyBoard } from "../composables/useRemoteHockeyBoard";

const { matchId, snapshot, clocks, loadError, isRemoteConfigured, showTimeEndedAlert } =
  useRemoteHockeyBoard({ documentTitle: "Marcador en vivo" });
</script>

<style scoped lang="scss">
.public-board {
  width: 100vw;
  height: 100vh;
  background: #000;
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
  position: relative;
  width: min(100vw, calc(100vh * 16 / 9));
  aspect-ratio: 16 / 9;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr auto;
  align-items: center;
}

.team-panel {
  text-align: center;
}

.team-name {
  font-size: clamp(24px, 4vw, 86px);
  margin-bottom: clamp(8px, 2vh, 34px);
}

.team-score {
  font-size: clamp(80px, 17vw, 360px);
  line-height: 0.9;
}

.center-panel {
  text-align: center;
}

.clock {
  font-size: clamp(84px, 14vw, 320px);
  line-height: 0.9;
}

.clock.time-ended {
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

.meta-group {
  margin-top: clamp(10px, 1.4vh, 22px);
}

.meta-label {
  font-size: clamp(20px, 2.6vw, 56px);
}

.meta-value {
  font-size: clamp(36px, 6vw, 120px);
}

.play-status-bar {
  grid-column: 1 / -1;
  grid-row: 2;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: start;
  margin-top: clamp(4px, 1vh, 16px);
}

.play-status {
  font-size: clamp(18px, 3vw, 48px);
  line-height: 1.1;
  text-align: center;
  color: #ffd666;
}
</style>
