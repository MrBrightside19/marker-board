<template>
  <div class="tournament-detail" v-if="tournament">
    <header class="page-header">
      <div>
        <router-link to="/tournaments" class="back-link">← Mis torneos</router-link>
        <h1>
          {{ tournament.name }}
          <a-tag v-if="tournament.status === 'finished'" color="default">Finalizado</a-tag>
          <a-tag v-else color="green">Activo</a-tag>
        </h1>
        <p>{{ formatDate(tournament.startDate) }} — {{ formatDate(tournament.endDate) }}</p>
      </div>
      <a-button
        v-if="tournament.status === 'active'"
        type="primary"
        danger
        :loading="finalizing"
        @click="handleFinalizeTournament"
      >
        Finalizar torneo
      </a-button>
    </header>

    <section class="import-panel">
      <h2>Carga masiva de partidos</h2>
      <p>
        Descarga la
        <a :href="templateUrl" download target="_blank" rel="noopener">plantilla CSV</a>,
        complétala con <strong>local</strong>, <strong>visita</strong> y
        <strong>tiempo_juego</strong> (cada partido su duración). Opcional:
        <strong>fecha_programada</strong> (<code>yyyy-MM-dd HH:mm</code>).
      </p>

      <div class="import-actions">
        <a-button :href="templateUrl" download>Descargar plantilla CSV</a-button>
        <a-upload
          :before-upload="handleCsvUpload"
          :show-upload-list="false"
          accept=".csv,text/csv"
        >
          <a-button type="primary" :loading="importing">Subir CSV</a-button>
        </a-upload>
      </div>

      <a-alert
        v-if="importErrors.length"
        type="warning"
        style="margin-top: 12px"
        :message="`Se importaron ${importedCount} partidos. ${importErrors.length} filas con error.`"
      >
        <template #description>
          <ul class="error-list">
            <li v-for="err in importErrors" :key="err.line">
              Fila {{ err.line }}: {{ err.message }}
            </li>
          </ul>
        </template>
      </a-alert>
    </section>

    <section v-if="finishedMatchCount > 0" class="standings-section">
      <h2>Resultados y posiciones</h2>
      <TournamentStandingsPanel :matches="tournament.matches" :results-page-size="15" />
    </section>

    <section class="matches-section">
      <h2>Partidos del torneo ({{ tournament.matches.length }})</h2>

      <a-empty v-if="tournament.matches.length === 0" description="Importa partidos con el CSV" />

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
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button
                v-if="record.status !== 'finished' && tournament.status === 'active'"
                type="primary"
                size="small"
                :loading="startingId === record.id"
                @click="operateMatch(record.id)"
              >
                Mesa de control
              </a-button>
              <router-link v-if="record.matchId" :to="liveRoute(record.matchId)">
                <a-button size="small">Live</a-button>
              </router-link>
            </a-space>
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
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import type { UploadProps } from "ant-design-vue";
import dayjs from "dayjs";
import { useAuthStore } from "../stores/auth";
import type { TournamentMatch, TournamentWithMatches } from "../types/tournament";
import TournamentStandingsPanel from "../components/tournament/TournamentStandingsPanel.vue";
import {
  bulkImportTournamentMatches,
  fetchTournamentWithMatches,
  finalizeTournament,
  startTournamentMatch,
} from "../services/tournamentService";
import { getTournamentTemplateUrl, parseTournamentCsv } from "../utils/tournamentCsv";

const templateUrl = getTournamentTemplateUrl();
import { boardRoute, liveRoute as liveRouteUtil } from "../utils/routes";
import { setActiveMatchId } from "../utils/activeMatch";
import { useScoreboardStore } from "../stores/scoreboard";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const scoreboardStore = useScoreboardStore();

const tournament = ref<TournamentWithMatches | null>(null);
const importing = ref(false);
const importedCount = ref(0);
const importErrors = ref<{ line: number; message: string }[]>([]);
const startingId = ref<string | null>(null);
const finalizing = ref(false);

const finishedMatchCount = computed(
  () =>
    tournament.value?.matches.filter(
      (m) => m.status === "finished" && m.goalLocal != null
    ).length ?? 0
);

const columns = [
  { title: "Local", dataIndex: "localTeam", key: "localTeam" },
  { title: "Visita", dataIndex: "visitTeam", key: "visitTeam" },
  { title: "Resultado", key: "result", width: 100, align: "center" as const },
  { title: "Tiempo", dataIndex: "timeGame", key: "timeGame", width: 90 },
  { title: "Programado", key: "scheduledAt", width: 160 },
  { title: "Estado", key: "status", width: 110 },
  { title: "Acciones", key: "actions", width: 220 },
];

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

function liveRoute(matchId: string) {
  return liveRouteUtil(matchId);
}

async function loadTournament() {
  const id = route.params.id?.toString();
  if (!id) return;
  tournament.value = await fetchTournamentWithMatches(id);
}

const handleCsvUpload: UploadProps["beforeUpload"] = async (file) => {
  if (!tournament.value || !auth.userId) return false;

  importing.value = true;
  importErrors.value = [];
  importedCount.value = 0;

  try {
    const text = await file.text();
    const { rows, errors } = parseTournamentCsv(text);

    importErrors.value = errors;

    if (rows.length === 0) {
      message.warning("No hay filas validas para importar.");
      return false;
    }

    const result = await bulkImportTournamentMatches(
      tournament.value.id,
      rows,
      auth.userId
    );
    importedCount.value = result.created;
    message.success(`Se importaron ${result.created} partidos`);
    await loadTournament();
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Error al importar CSV");
  } finally {
    importing.value = false;
  }

  return false;
};

async function handleFinalizeTournament() {
  if (!tournament.value) return;

  const pending = tournament.value.matches.filter((m) => m.status !== "finished").length;
  const confirmed = window.confirm(
    pending > 0
      ? `Quedan ${pending} partidos sin marcar como finalizados.\n\n¿Cerrar el torneo y publicar la tabla definitiva?`
      : "¿Finalizar el torneo y publicar la tabla de posiciones definitiva?"
  );
  if (!confirmed) return;

  finalizing.value = true;
  try {
    const updated = await finalizeTournament(tournament.value.id);
    if (updated) {
      tournament.value = updated;
      message.success("Torneo finalizado. La tabla ya está visible en Inicio.");
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : "No se pudo finalizar el torneo");
  } finally {
    finalizing.value = false;
  }
}

async function operateMatch(tournamentMatchId: string) {
  if (!auth.userId) return;

  startingId.value = tournamentMatchId;
  try {
    const { matchId } = await startTournamentMatch(tournamentMatchId, auth.userId);
    setActiveMatchId(matchId);
    scoreboardStore.hydrateFromLocalStorage();

    await router.push(boardRoute(matchId));
  } catch (error) {
    message.error(error instanceof Error ? error.message : "No se pudo abrir el partido");
  } finally {
    startingId.value = null;
  }
}

onMounted(async () => {
  await auth.init();
  if (!auth.isOrganizer) {
    router.replace("/");
    return;
  }
  await loadTournament();
  if (!tournament.value) {
    message.error("Torneo no encontrado");
    router.replace("/tournaments");
  } else {
    document.title = tournament.value.name;
  }
});
</script>

<style scoped>
.tournament-detail {
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
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
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
}

.import-panel,
.standings-section,
.matches-section {
  background: #141414;
  border: 1px solid #303030;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.import-panel h2,
.standings-section h2,
.matches-section h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.import-panel p {
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 16px;
}

.import-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.error-list {
  margin: 8px 0 0;
  padding-left: 20px;
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
