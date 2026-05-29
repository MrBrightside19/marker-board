<template>
  <div class="public-tournament" v-if="tournament">
    <header class="page-header">
      <div>
        <router-link to="/" class="back-link">← Inicio</router-link>
        <h1>
          {{ tournament.name }}
          <a-tag v-if="tournament.status === 'finished'" color="default">Finalizado</a-tag>
          <a-tag v-else color="green">Activo</a-tag>
          <a-tag>{{ sportLabel }}</a-tag>
        </h1>
        <p>{{ formatDate(tournament.startDate) }} — {{ formatDate(tournament.endDate) }}</p>
        <p v-if="tournament.visibility === 'private'" class="visibility-note">
          Torneo privado · solo accesible con este enlace
        </p>
      </div>
    </header>

    <section v-if="liveMatches.length > 0" class="live-section">
      <h2>En vivo ahora</h2>
      <a-row :gutter="[16, 16]">
        <a-col v-for="match in liveMatches" :key="match.id" :xs="24" :sm="12" :lg="8">
          <a-card class="match-card" hoverable>
            <template #title>{{ match.localTeam }} vs {{ match.visitTeam }}</template>
            <template #extra><a-tag color="red">LIVE</a-tag></template>
            <div class="scoreline">
              <span>{{ match.goalLocal ?? 0 }}</span>
              <span class="sep">-</span>
              <span>{{ match.goalVisit ?? 0 }}</span>
            </div>
            <p class="meta">Cancha {{ formatCourtLabel(match.court) }}</p>
            <router-link v-if="match.matchId" :to="liveRoute(match.matchId)">
              <a-button type="primary" block>Ver marcador</a-button>
            </router-link>
          </a-card>
        </a-col>
      </a-row>
    </section>

    <section v-if="finishedMatchCount > 0" class="panel">
      <h2>Resultados y posiciones</h2>
      <TournamentStandingsPanel :matches="tournament.matches" :results-page-size="15" />
    </section>

    <section class="panel">
      <h2>Calendario ({{ tournament.matches.length }})</h2>
      <a-empty v-if="tournament.matches.length === 0" description="Aún no hay partidos programados" />
      <a-table
        v-else
        :data-source="tournament.matches"
        :columns="columns"
        row-key="id"
        :pagination="{ pageSize: 20 }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'scheduledAt'">
            {{ record.scheduledAt ? formatDateTime(record.scheduledAt) : "—" }}
          </template>
          <template v-else-if="column.key === 'result'">
            <span v-if="record.goalLocal != null">{{ record.goalLocal }} - {{ record.goalVisit }}</span>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'court'">
            {{ formatCourtLabel(record.court) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <router-link v-if="record.status === 'live' && record.matchId" :to="liveRoute(record.matchId)">
              <a-button type="primary" size="small">Ver live</a-button>
            </router-link>
            <span v-else>—</span>
          </template>
        </template>
      </a-table>
    </section>
  </div>

  <div v-else class="loading-wrap">
    <a-spin size="large" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { message } from "ant-design-vue";
import dayjs from "dayjs";
import TournamentStandingsPanel from "../components/tournament/TournamentStandingsPanel.vue";
import { fetchTournamentWithMatches } from "../services/tournamentService";
import type { TournamentMatch, TournamentWithMatches } from "../types/tournament";
import { getSportById } from "../types/sport";
import { formatCourtLabel } from "../utils/court";
import { liveRoute as liveRouteUtil } from "../utils/routes";

const route = useRoute();
const tournament = ref<TournamentWithMatches | null>(null);

const columns = [
  { title: "Local", dataIndex: "localTeam", key: "localTeam" },
  { title: "Visita", dataIndex: "visitTeam", key: "visitTeam" },
  { title: "Cancha", key: "court", width: 80, align: "center" as const },
  { title: "Resultado", key: "result", width: 100, align: "center" as const },
  { title: "Programado", key: "scheduledAt", width: 160 },
  { title: "Estado", key: "status", width: 110 },
  { title: "", key: "actions", width: 110 },
];

const liveMatches = computed(() =>
  (tournament.value?.matches ?? []).filter((m) => m.status === "live")
);

const finishedMatchCount = computed(
  () =>
    tournament.value?.matches.filter(
      (m) => m.status === "finished" && m.goalLocal != null
    ).length ?? 0
);

const sportLabel = computed(() => getSportById(tournament.value?.sport)?.name ?? "Deporte");

function liveRoute(matchId: string) {
  return liveRouteUtil(matchId);
}

function formatDate(value: string) {
  return dayjs(value).format("DD/MM/YYYY");
}

function formatDateTime(value: string) {
  return dayjs(value).format("DD/MM/YYYY HH:mm");
}

function statusLabel(status: TournamentMatch["status"]) {
  if (status === "live") return "En juego";
  if (status === "finished") return "Finalizado";
  return "Programado";
}

function statusColor(status: TournamentMatch["status"]) {
  if (status === "live") return "red";
  if (status === "finished") return "default";
  return "blue";
}

onMounted(async () => {
  const id = route.params.id?.toString();
  if (!id) return;

  tournament.value = await fetchTournamentWithMatches(id);
  if (!tournament.value) {
    message.error("Torneo no encontrado");
    return;
  }
  document.title = tournament.value.name;
});
</script>

<style scoped>
.public-tournament {
  min-height: 100vh;
  padding: 24px clamp(16px, 4vw, 48px);
  background: #0a0a0a;
  color: #fff;
}

.loading-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #0a0a0a;
}

.page-header {
  margin-bottom: 28px;
}

.page-header h1 {
  margin: 8px 0 4px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.page-header p {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
}

.back-link {
  color: #69b1ff;
  text-decoration: none;
}

.visibility-note {
  margin-top: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
}

.live-section,
.panel {
  background: #141414;
  border: 1px solid #303030;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.live-section h2,
.panel h2 {
  margin: 0 0 16px;
  font-size: 18px;
}

.match-card {
  background: #1a1a1a;
  border-color: #303030;
}

.match-card :deep(.ant-card-head-title) {
  color: #fff;
}

.scoreline {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.scoreline .sep {
  color: rgba(255, 255, 255, 0.4);
}

.meta {
  text-align: center;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 12px;
}

:deep(.ant-table) {
  background: transparent;
  color: #fff;
}

:deep(.ant-table-thead > tr > th) {
  background: #1a1a1a;
  color: rgba(255, 255, 255, 0.85);
}

:deep(.ant-table-tbody > tr > td) {
  border-color: #303030;
}
</style>
