<template>
  <div class="home">
    <header class="home-header">
      <div class="brand">
        <h1>Marcador Hockey</h1>
        <p>Partidos en vivo, torneos y resultados</p>
      </div>

      <div class="header-actions">
        <template v-if="auth.loading">
          <a-spin />
        </template>
        <template v-else-if="auth.isAuthenticated">
          <a-tag :color="auth.isOrganizer ? 'blue' : 'default'">
            {{ auth.isOrganizer ? "Organizador" : "Espectador" }}
          </a-tag>
          <span class="user-name">{{ auth.displayName }}</span>
          <a-button @click="auth.signOut()">Cerrar sesión</a-button>
        </template>
        <template v-else>
          <a-button @click="openAuth('login')">Iniciar sesión</a-button>
          <a-button type="primary" @click="openAuth('register')">Registrarse</a-button>
        </template>
      </div>
    </header>

    <section v-if="!remoteEnabled" class="banner banner-warn">
      Configura Supabase en <code>.env</code> para ver partidos en vivo y usar cuentas.
    </section>

    <section v-if="auth.isOrganizer" class="organizer-actions">
      <router-link to="/tournaments">
        <a-button type="primary" size="large">Gestionar torneos</a-button>
      </router-link>
      <a-button size="large" :loading="startingMatch" @click="startNewOrganizerMatch">
        Partido suelto (sin torneo)
      </a-button>
      <span class="hint">
        Crea un torneo con calendario y carga masiva CSV, o inicia un partido independiente.
      </span>
    </section>

    <section class="live-section">
      <div class="section-title">
        <h2>En vivo ahora</h2>
        <a-button size="small" :loading="loadingHome" @click="loadHomeData">Actualizar</a-button>
      </div>

      <a-empty
        v-if="!loadingHome && liveMatches.length === 0"
        description="No hay partidos en vivo en este momento"
      />

      <a-row v-else :gutter="[16, 16]">
        <a-col
          v-for="match in liveMatches"
          :key="match.id"
          :xs="24"
          :sm="12"
          :lg="8"
        >
          <a-card class="match-card" hoverable>
            <template #title>
              <span class="match-title">{{ match.title }}</span>
            </template>
            <template #extra>
              <a-tag color="red">LIVE</a-tag>
            </template>

            <div class="match-scoreline">
              <div class="team-line">
                <span class="team-name">{{ match.state.localTeam }}</span>
                <span class="team-goals">{{ match.state.goalLocal }}</span>
              </div>
              <div class="team-line">
                <span class="team-name">{{ match.state.visitTeam }}</span>
                <span class="team-goals">{{ match.state.goalVisit }}</span>
              </div>
            </div>

            <div class="match-meta">
              <span>Periodo {{ match.state.gamePeriod }}</span>
              <span class="clock">{{ displayClock(match) }}</span>
            </div>

            <p v-if="match.organizerName" class="organizer-line">
              Organiza: {{ match.organizerName }}
            </p>

            <div class="card-actions">
              <router-link :to="liveRoute(match.id)">
                <a-button type="primary" block>Ver marcador</a-button>
              </router-link>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </section>

    <section v-if="remoteEnabled && activeTournaments.length > 0" class="tournaments-section">
      <div class="section-title">
        <h2>Torneos en curso</h2>
      </div>

      <a-collapse v-model:activeKey="activeTournamentKeys" class="tournament-collapse">
        <a-collapse-panel
          v-for="t in activeTournaments"
          :key="t.id"
          :header="tournamentPanelHeader(t)"
        >
          <p class="tournament-stats">
            {{ t.finishedCount }} finalizados · {{ t.liveCount }} en juego ·
            {{ t.scheduledCount }} programados
          </p>

          <a-table
            v-if="t.recentResults.length > 0"
            :data-source="t.recentResults"
            :columns="resultColumns"
            row-key="id"
            size="small"
            :pagination="false"
            class="results-table"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'matchup'">
                {{ record.localTeam }} vs {{ record.visitTeam }}
              </template>
              <template v-else-if="column.key === 'score'">
                <strong>{{ record.goalLocal }} - {{ record.goalVisit }}</strong>
              </template>
              <template v-else-if="column.key === 'finishedAt'">
                {{ formatResultDate(record.finishedAt) }}
              </template>
            </template>
          </a-table>
          <a-empty v-else description="Sin resultados aún" />
        </a-collapse-panel>
      </a-collapse>
    </section>

    <section
      v-if="remoteEnabled && recentResults.length > 0"
      class="history-section"
    >
      <div class="section-title">
        <h2>Últimos resultados</h2>
        <span class="section-sub">Torneos activos</span>
      </div>

      <a-table
        :data-source="recentResults"
        :columns="historyColumns"
        row-key="id"
        size="small"
        :pagination="{ pageSize: 12 }"
        class="results-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'matchup'">
            {{ record.localTeam }} vs {{ record.visitTeam }}
          </template>
          <template v-else-if="column.key === 'score'">
            <strong>{{ record.goalLocal }} - {{ record.goalVisit }}</strong>
          </template>
          <template v-else-if="column.key === 'finishedAt'">
            {{ formatResultDate(record.finishedAt) }}
          </template>
        </template>
      </a-table>
    </section>

    <section
      v-if="remoteEnabled && finishedTournaments.length > 0"
      class="finished-section"
    >
      <div class="section-title">
        <h2>Torneos finalizados</h2>
      </div>

      <a-collapse v-model:activeKey="finishedTournamentKeys" class="tournament-collapse">
        <a-collapse-panel
          v-for="item in finishedTournaments"
          :key="item.tournament.id"
          :header="`${item.tournament.name} (${item.tournament.matches.length} partidos)`"
        >
          <TournamentStandingsPanel
            :matches="item.tournament.matches"
            title="Resultados y tabla de posiciones"
            :results-page-size="20"
          />
        </a-collapse-panel>
      </a-collapse>
    </section>

    <section class="roles-info">
      <a-row :gutter="16">
        <a-col :xs="24" :md="12">
          <a-card title="Espectador">
            Regístrate para seguir torneos y partidos. Puedes ver todos los marcadores en vivo
            sin necesidad de cuenta; con cuenta podrás guardar preferencias en el futuro.
          </a-card>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-card title="Organizador">
            Crea y opera partidos desde la mesa de control, enlaza el marcador en TV y comparte la
            URL pública del live con tu audiencia.
          </a-card>
        </a-col>
      </a-row>
    </section>

    <AuthModal
      :visible="authModalVisible"
      :initial-mode="authModalMode"
      @close="authModalVisible = false"
      @success="onAuthSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import dayjs from "dayjs";
import AuthModal from "../components/auth/AuthModal.vue";
import TournamentStandingsPanel from "../components/tournament/TournamentStandingsPanel.vue";
import { createFreshMatchState, useScoreboardStore } from "../stores/scoreboard";
import { useAuthStore } from "../stores/auth";
import { fetchLiveMatches } from "../services/liveMatchesService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import {
  fetchActiveTournamentsWithResults,
  fetchFinishedTournaments,
  fetchRecentTournamentResults,
  fetchTournamentWithMatches,
} from "../services/tournamentService";
import type { LiveMatchSummary } from "../types/liveMatch";
import type {
  ActiveTournamentSummary,
  TournamentMatchResult,
  TournamentWithMatches,
} from "../types/tournament";
import { getRunningClocks } from "../utils/scoreboardClock";
import { createMatchId, setActiveMatchId } from "../utils/activeMatch";
import { registerMatchRecord } from "../services/liveMatchesService";
import { boardRoute, liveRoute as liveRouteUtil } from "../utils/routes";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const scoreboardStore = useScoreboardStore();

const remoteEnabled = isSupabaseConfigured();
const liveMatches = ref<LiveMatchSummary[]>([]);
const activeTournaments = ref<ActiveTournamentSummary[]>([]);
const recentResults = ref<TournamentMatchResult[]>([]);
const finishedTournaments = ref<{ tournament: TournamentWithMatches }[]>([]);
const loadingHome = ref(false);
const startingMatch = ref(false);
const authModalVisible = ref(false);
const authModalMode = ref<"login" | "register">("login");
const activeTournamentKeys = ref<string[]>([]);
const finishedTournamentKeys = ref<string[]>([]);

let refreshInterval: number | null = null;
let matchesPollInterval: number | null = null;
const nowMs = ref(Date.now());

const resultColumns = [
  { title: "Partido", key: "matchup" },
  { title: "Resultado", key: "score", width: 100, align: "center" as const },
  { title: "Fecha", key: "finishedAt", width: 120 },
];

const historyColumns = [
  { title: "Torneo", dataIndex: "tournamentName", key: "tournamentName", ellipsis: true },
  { title: "Partido", key: "matchup", ellipsis: true },
  { title: "Resultado", key: "score", width: 100, align: "center" as const },
  { title: "Fecha", key: "finishedAt", width: 120 },
];

function liveRoute(matchId: string) {
  return liveRouteUtil(matchId);
}

function displayClock(match: LiveMatchSummary): string {
  if (match.state.isPaused || match.state.timeGame === "00:00") {
    return match.state.timeGame;
  }
  return getRunningClocks(match.state, nowMs.value).timeGame;
}

function formatResultDate(value: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM HH:mm");
}

function tournamentPanelHeader(t: ActiveTournamentSummary) {
  return `${t.name} · ${t.finishedCount} resultados`;
}

function openAuth(mode: "login" | "register") {
  authModalMode.value = mode;
  authModalVisible.value = true;
}

function onAuthSuccess() {
  authModalVisible.value = false;
  loadHomeData();
}

async function loadHomeData() {
  if (!remoteEnabled) return;
  loadingHome.value = true;
  try {
    const [live, active, recent, finishedList] = await Promise.all([
      fetchLiveMatches(),
      fetchActiveTournamentsWithResults(),
      fetchRecentTournamentResults(30),
      fetchFinishedTournaments(),
    ]);

    liveMatches.value = live;
    activeTournaments.value = active;
    recentResults.value = recent;

    const details = await Promise.all(
      finishedList.map((summary) => fetchTournamentWithMatches(summary.id))
    );
    finishedTournaments.value = details
      .filter((t): t is TournamentWithMatches => t !== null)
      .map((tournament) => ({ tournament }));
  } finally {
    loadingHome.value = false;
  }
}

async function startNewOrganizerMatch() {
  if (!auth.isOrganizer) {
    openAuth("register");
    return;
  }

  startingMatch.value = true;
  try {
    const matchId = createMatchId();
    const state = createFreshMatchState({
      localTeam: "Equipo Local",
      visitTeam: "Equipo Visita",
      timeGame: "20:00",
    });

    setActiveMatchId(matchId);
    scoreboardStore.setState(state);

    await registerMatchRecord({
      matchId,
      state,
      organizerId: auth.userId,
      title: `${state.localTeam} vs ${state.visitTeam}`,
    });

    await router.push(boardRoute(matchId));
  } finally {
    startingMatch.value = false;
  }
}

onMounted(async () => {
  document.title = "Marcador Hockey";
  await auth.init();
  await loadHomeData();

  if (route.query.login === "1") {
    openAuth("login");
  }
  if (route.query.error === "organizer-only") {
    message.warning("Solo los organizadores pueden acceder a la mesa de control.");
  }

  refreshInterval = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);

  matchesPollInterval = window.setInterval(loadHomeData, 15000);
});

onUnmounted(() => {
  if (refreshInterval) {
    window.clearInterval(refreshInterval);
  }
  if (matchesPollInterval) {
    window.clearInterval(matchesPollInterval);
  }
});
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: #0a0a0a;
  color: #f5f5f5;
  padding: 24px clamp(16px, 4vw, 48px) 48px;
}

.home-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
}

.brand h1 {
  margin: 0;
  font-size: clamp(28px, 4vw, 40px);
  color: #fff;
}

.brand p {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.65);
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.user-name {
  color: rgba(255, 255, 255, 0.85);
}

.banner {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.banner-warn {
  background: #2b2111;
  border: 1px solid #594214;
  color: #ffd666;
}

.organizer-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
  padding: 16px;
  background: #141414;
  border-radius: 12px;
  border: 1px solid #303030;
}

.organizer-actions .hint {
  color: rgba(255, 255, 255, 0.55);
  font-size: 14px;
}

.live-section,
.tournaments-section,
.history-section,
.finished-section {
  margin-bottom: 40px;
}

.section-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.section-title h2 {
  margin: 0;
  color: #fff;
}

.section-sub {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
}

.tournament-stats {
  margin: 0 0 12px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
}

.tournament-collapse {
  background: transparent;
  border: none;
}

.tournament-collapse :deep(.ant-collapse-item) {
  margin-bottom: 12px;
  border: 1px solid #303030 !important;
  border-radius: 12px !important;
  overflow: hidden;
  background: #141414;
}

.tournament-collapse :deep(.ant-collapse-header) {
  color: #fff !important;
}

.tournament-collapse :deep(.ant-collapse-content) {
  background: #141414;
  border-top: 1px solid #303030;
  color: rgba(255, 255, 255, 0.85);
}

.match-card {
  background: #141414;
  border-color: #303030;
}

.match-card :deep(.ant-card-head-title) {
  color: #fff;
}

.match-title {
  font-weight: 600;
}

.match-scoreline {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.team-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.team-name {
  color: rgba(255, 255, 255, 0.85);
}

.team-goals {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.match-meta {
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.55);
  font-size: 14px;
  margin-bottom: 8px;
}

.match-meta .clock {
  font-variant-numeric: tabular-nums;
  color: #69b1ff;
}

.organizer-line {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0 0 12px;
}

.card-actions {
  margin-top: 8px;
}

.results-table :deep(.ant-table) {
  background: transparent;
  color: #fff;
}

.results-table :deep(.ant-table-thead > tr > th) {
  background: #1a1a1a;
  color: rgba(255, 255, 255, 0.85);
}

.results-table :deep(.ant-table-tbody > tr > td) {
  border-color: #303030;
}

.roles-info :deep(.ant-card) {
  background: #141414;
  border-color: #303030;
  color: rgba(255, 255, 255, 0.75);
  height: 100%;
}

.roles-info :deep(.ant-card-head-title) {
  color: #fff;
}
</style>
