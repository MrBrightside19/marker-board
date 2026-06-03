<template>
  <section class="live-carousel-section">
    <div class="section-head">
      <h1 class="page-title">En vivo</h1>
      <p class="page-sub">
        Partidos de <strong>{{ sportName }}</strong> en este momento
      </p>
    </div>

    <a-spin :spinning="loading">
      <a-empty
        v-if="!loading && matches.length === 0"
        class="carousel-empty"
        :description="emptyDescription"
      />

      <div v-else class="carousel-track" role="list">
        <article
          v-for="match in matches"
          :key="match.id"
          class="carousel-card"
          role="listitem"
        >
          <div class="card-top">
            <span class="card-title">{{ match.title }}</span>
            <a-tag color="red">LIVE</a-tag>
          </div>

          <div class="score-block">
            <div class="score-row">
              <span class="team">{{ matchLocalTeam(match) }}</span>
              <span class="goals">{{ matchLocalScore(match) }}</span>
            </div>
            <div class="score-row">
              <span class="team">{{ matchVisitTeam(match) }}</span>
              <span class="goals">{{ matchVisitScore(match) }}</span>
            </div>
          </div>

          <div class="card-meta">
            <span>P{{ matchPeriod(match) }}</span>
            <span class="clock">{{ displayClock(match) }}</span>
          </div>

          <p v-if="match.organizerName" class="organizer">Organiza: {{ match.organizerName }}</p>

          <router-link :to="liveRouteForMatch(match)" class="card-link">
            <a-button type="primary" block>Ver marcador</a-button>
          </router-link>
        </article>
      </div>
    </a-spin>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { LiveMatchSummary } from "../../types/liveMatch";
import { isBasketballScoreboardState } from "../../types/basketballScoreboard";
import { getBasketballRunningClock } from "../../utils/basketballClock";
import { getRunningClocks } from "../../utils/scoreboardClock";
import { basketballLiveRoute, liveRoute as liveRouteUtil } from "../../utils/routes";

const props = defineProps<{
  matches: LiveMatchSummary[];
  loading: boolean;
  sportName: string;
  nowMs: number;
}>();

const emptyDescription = computed(() =>
  props.sportName === "Todos los deportes"
    ? "No hay partidos en vivo en este momento"
    : `No hay partidos en vivo de ${props.sportName} ahora`
);

function liveRouteForMatch(match: LiveMatchSummary) {
  if (isBasketballScoreboardState(match.state)) {
    return basketballLiveRoute(match.id);
  }
  return liveRouteUtil(match.id);
}

function matchLocalTeam(match: LiveMatchSummary) {
  return match.state.localTeam;
}

function matchVisitTeam(match: LiveMatchSummary) {
  return match.state.visitTeam;
}

function matchLocalScore(match: LiveMatchSummary) {
  if (isBasketballScoreboardState(match.state)) return match.state.pointsLocal;
  return match.state.goalLocal;
}

function matchVisitScore(match: LiveMatchSummary) {
  if (isBasketballScoreboardState(match.state)) return match.state.pointsVisit;
  return match.state.goalVisit;
}

function matchPeriod(match: LiveMatchSummary) {
  return match.state.gamePeriod;
}

function displayClock(match: LiveMatchSummary) {
  if (isBasketballScoreboardState(match.state)) {
    if (match.state.isPaused || match.state.timeGame === "00:00") {
      return match.state.timeGame;
    }
    return getBasketballRunningClock(match.state, props.nowMs);
  }
  if (match.state.isPaused || match.state.timeGame === "00:00") {
    return match.state.timeGame;
  }
  return getRunningClocks(match.state, props.nowMs).timeGame;
}
</script>

<style scoped>
.live-carousel-section {
  max-width: 100%;
}

.section-head {
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: clamp(26px, 4vw, 36px);
  color: #fff;
}

.page-sub {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 15px;
}

.carousel-empty {
  padding: 48px 0;
}

.carousel-track {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding: 16px;
  padding: 4px 4px 20px;
  -webkit-overflow-scrolling: touch;
}

.carousel-track::-webkit-scrollbar {
  height: 8px;
}

.carousel-track::-webkit-scrollbar-thumb {
  background: #434343;
  border-radius: 4px;
}

.carousel-card {
  flex: 0 0 min(88vw, 340px);
  scroll-snap-align: start;
  background: #141414;
  border: 1px solid #303030;
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.card-title {
  font-weight: 600;
  color: #fff;
  line-height: 1.3;
}

.score-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.team {
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
}

.goals {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.55);
}

.clock {
  color: #69b1ff;
  font-variant-numeric: tabular-nums;
}

.organizer {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.card-link {
  margin-top: auto;
  text-decoration: none;
}
</style>
