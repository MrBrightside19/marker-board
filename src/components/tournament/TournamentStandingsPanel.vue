<template>
  <div class="standings-panel">
    <h3 v-if="title" class="panel-title">{{ title }}</h3>

    <a-table
      v-if="finishedMatches.length > 0"
      :data-source="finishedMatches"
      :columns="resultsColumns"
      row-key="id"
      size="small"
      :pagination="resultsPagination"
      class="results-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'score'">
          <strong>{{ formatMatchScore(record) }}</strong>
        </template>
        <template v-else-if="column.key === 'winner'">
          {{ getMatchWinnerLabel(record) }}
        </template>
        <template v-else-if="column.key === 'finishedAt'">
          {{ formatDateTime(record.finishedAt) }}
        </template>
      </template>
    </a-table>
    <a-empty v-else description="Aún no hay partidos con resultado" />

    <h4 class="subsection-title">Tabla de posiciones</h4>
    <a-table
      v-if="standings.length > 0"
      :data-source="standings"
      :columns="standingsColumns"
      row-key="team"
      size="small"
      :pagination="false"
      class="standings-table"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'pos'">
          <span :class="{ champion: index === 0 }">{{ index + 1 }}</span>
        </template>
        <template v-else-if="column.key === 'goalDiff'">
          <span :class="diffClass(record.goalDiff)">
            {{ record.goalDiff > 0 ? "+" : "" }}{{ record.goalDiff }}
          </span>
        </template>
      </template>
    </a-table>
    <a-empty v-else description="Juega y finaliza partidos para calcular puntos" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import dayjs from "dayjs";
import type { TournamentMatch } from "../../types/tournament";
import {
  computeTournamentStandings,
  formatMatchScore,
  getMatchWinnerLabel,
} from "../../utils/tournamentStandings";

const props = withDefaults(
  defineProps<{
    matches: TournamentMatch[];
    title?: string;
    resultsPageSize?: number;
  }>(),
  { resultsPageSize: 10 }
);

const finishedMatches = computed(() =>
  [...props.matches]
    .filter((m) => m.status === "finished" && m.goalLocal != null && m.goalVisit != null)
    .sort((a, b) => {
      const ta = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
      const tb = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
      return tb - ta;
    })
);

const standings = computed(() => computeTournamentStandings(props.matches));

const resultsPagination = computed(() =>
  finishedMatches.value.length > props.resultsPageSize
    ? { pageSize: props.resultsPageSize }
    : false
);

const resultsColumns = [
  { title: "Local", dataIndex: "localTeam", key: "localTeam", ellipsis: true },
  { title: "Marcador", key: "score", width: 90, align: "center" as const },
  { title: "Visita", dataIndex: "visitTeam", key: "visitTeam", ellipsis: true },
  { title: "Ganador", key: "winner", ellipsis: true },
  { title: "Finalizado", key: "finishedAt", width: 130 },
];

const standingsColumns = [
  { title: "#", key: "pos", width: 44, align: "center" as const },
  { title: "Equipo", dataIndex: "team", key: "team", ellipsis: true },
  { title: "PJ", dataIndex: "played", key: "played", width: 48, align: "center" as const },
  { title: "G", dataIndex: "wins", key: "wins", width: 44, align: "center" as const },
  { title: "E", dataIndex: "draws", key: "draws", width: 44, align: "center" as const },
  { title: "P", dataIndex: "losses", key: "losses", width: 44, align: "center" as const },
  { title: "GF", dataIndex: "goalsFor", key: "goalsFor", width: 48, align: "center" as const },
  { title: "GC", dataIndex: "goalsAgainst", key: "goalsAgainst", width: 48, align: "center" as const },
  { title: "DG", key: "goalDiff", width: 52, align: "center" as const },
  { title: "Pts", dataIndex: "points", key: "points", width: 52, align: "center" as const },
];

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM HH:mm");
}

function diffClass(diff: number) {
  if (diff > 0) return "diff-positive";
  if (diff < 0) return "diff-negative";
  return "";
}
</script>

<style scoped>
.standings-panel {
  width: 100%;
}

.panel-title {
  margin: 0 0 12px;
  font-size: 16px;
}

.subsection-title {
  margin: 20px 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.champion {
  font-weight: 700;
  color: #ffd666;
}

.diff-positive {
  color: #73d13d;
}

.diff-negative {
  color: #ff7875;
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
