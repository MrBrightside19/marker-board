<template>
  <div class="tournament-detail" v-if="tournament">
    <header class="page-header">
      <div>
        <h1>
          {{ tournament.name }}
          <a-tag v-if="tournament.status === 'finished'" color="default">Finalizado</a-tag>
          <a-tag v-else color="green">Activo</a-tag>
          <a-tag :color="tournament.visibility === 'public' ? 'blue' : 'default'">
            {{ tournament.visibility === "public" ? "Público" : "Privado" }}
          </a-tag>
          <a-tag>{{ sportLabel }}</a-tag>
        </h1>
        <p>{{ formatDate(tournament.startDate) }} — {{ formatDate(tournament.endDate) }}</p>
        <p class="live-hint">
          Cada partido tiene su propia URL de live. Copiala desde
          <strong>Marcador TV</strong> o <strong>Controles</strong> al iniciar el encuentro.
        </p>
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

    <section class="share-panel">
      <h2>Enlace para espectadores</h2>
      <p>
        {{
          tournament.visibility === "public"
            ? "Este torneo también aparece en el inicio. Comparte este enlace para acceso directo."
            : "Torneo privado: no aparece en el inicio. Comparte este enlace para que otros vean calendario y marcadores."
        }}
      </p>
      <div class="share-row">
        <a-input :value="publicTournamentUrl" readonly />
        <a-button type="primary" @click="copyPublicLink">Copiar enlace</a-button>
        <router-link :to="tournamentPublicRoute(tournament.id)">
          <a-button>Vista espectador</a-button>
        </router-link>
      </div>
    </section>

    <section class="import-panel">
      <h2>Carga masiva de partidos</h2>
      <p>
        Descarga la
        <a :href="templateUrl" download target="_blank" rel="noopener">plantilla CSV</a>,
        complétala con <strong>local</strong>, <strong>visita</strong>,
        <strong>tiempo_juego</strong> y <strong>cancha</strong> (número o nombre;
        por defecto <code>1</code>). Opcional:
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
      <p class="matches-hint">
        Usa <strong>Marcador TV</strong> para abrir la pantalla de cancha; desde ahí abre
        <strong>Controles</strong> en otra ventana.
      </p>

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
          <template v-else-if="column.key === 'court'">
            {{ formatCourtLabel(record.court) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space wrap>
              <a-button
                v-if="record.status !== 'finished' && tournament.status === 'active'"
                type="primary"
                size="small"
                :loading="openingBoardId === record.id"
                @click="openMarcadorTab(record)"
              >
                Marcador TV
              </a-button>
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
import { fetchMatchState, publishMatchState } from "../services/matchSync";
import {
  createFreshMatchState,
  normalizeScoreboardState,
  writeScoreboardStateToLocalStorage,
} from "../stores/scoreboard";
import { getTournamentTemplateUrl, parseTournamentCsv } from "../utils/tournamentCsv";
import { getSportById } from "../types/sport";
import { getTournamentPublicUrl, openBoardInNewTab, tournamentPublicRoute as tournamentPublicRouteUtil } from "../utils/routes";
import { setActiveMatchId, setActiveTournamentId } from "../utils/activeMatch";
import { formatCourtLabel } from "../utils/court";

const templateUrl = getTournamentTemplateUrl();

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const tournament = ref<TournamentWithMatches | null>(null);

const importing = ref(false);
const importedCount = ref(0);
const importErrors = ref<{ line: number; message: string }[]>([]);
const openingBoardId = ref<string | null>(null);
const finalizing = ref(false);

const finishedMatchCount = computed(
  () =>
    tournament.value?.matches.filter(
      (m) => m.status === "finished" && m.goalLocal != null
    ).length ?? 0
);

const sportLabel = computed(
  () => getSportById(tournament.value?.sport)?.name ?? "Deporte"
);

const publicTournamentUrl = computed(() =>
  tournament.value ? getTournamentPublicUrl(tournament.value.id) : ""
);

function tournamentPublicRoute(id: string) {
  return tournamentPublicRouteUtil(id);
}

async function copyPublicLink() {
  if (!publicTournamentUrl.value) return;
  try {
    await navigator.clipboard.writeText(publicTournamentUrl.value);
    message.success("Enlace copiado");
  } catch {
    message.error("No se pudo copiar el enlace");
  }
}

const columns = [
  { title: "Local", dataIndex: "localTeam", key: "localTeam" },
  { title: "Visita", dataIndex: "visitTeam", key: "visitTeam" },
  { title: "Cancha", key: "court", width: 80, align: "center" as const },
  { title: "Resultado", key: "result", width: 100, align: "center" as const },
  { title: "Tiempo", dataIndex: "timeGame", key: "timeGame", width: 90 },
  { title: "Programado", key: "scheduledAt", width: 160 },
  { title: "Estado", key: "status", width: 110 },
  { title: "Acciones", key: "actions", width: 140 },
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

async function openMarcadorTab(record: TournamentMatch) {
  if (!auth.userId || !tournament.value) return;

  openingBoardId.value = record.id;
  try {
    let matchId = record.matchId;
    if (!matchId) {
      const started = await startTournamentMatch(record.id, auth.userId);
      matchId = started.matchId;
      await loadTournament();
    }
    setActiveTournamentId(tournament.value.id);
    setActiveMatchId(matchId);

    const remote = await fetchMatchState(matchId);
    let state = remote?.state;
    if (!state) {
      state = createFreshMatchState({
        localTeam: record.localTeam,
        visitTeam: record.visitTeam,
        timeGame: record.timeGame,
      });
      await publishMatchState(matchId, state, {
        organizerId: auth.userId,
        tournamentId: tournament.value.id,
        isLive: true,
      });
    }
    writeScoreboardStateToLocalStorage(normalizeScoreboardState(state));

    openBoardInNewTab(router, matchId);
  } catch (error) {
    message.error(error instanceof Error ? error.message : "No se pudo abrir el marcador");
  } finally {
    openingBoardId.value = null;
  }
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
      message.success(
        tournament.value.visibility === "public"
          ? "Torneo finalizado. La tabla ya está visible en Inicio."
          : "Torneo finalizado. Comparte el enlace del torneo para que otros vean la tabla."
      );
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : "No se pudo finalizar el torneo");
  } finally {
    finalizing.value = false;
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

.live-hint {
  margin-top: 10px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  max-width: 520px;
}

.back-link {
  color: #69b1ff;
}

.share-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.share-row :deep(.ant-input) {
  flex: 1 1 280px;
  min-width: 0;
}

.share-panel,
.import-panel,
.standings-section,
.matches-section {
  background: #141414;
  border: 1px solid #303030;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.share-panel h2,
.import-panel h2,
.standings-section h2,
.matches-section h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.matches-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
}

.share-panel p,
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
