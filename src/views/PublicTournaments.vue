<template>
  <div class="public-tournaments-page">
    <header class="page-header">
      <div>
        <h1>Torneos públicos</h1>
        <p>
          {{
            selectedSport.hasSport
              ? `Torneos públicos activos de ${selectedSport.sportName}.`
              : "Torneos públicos activos de todos los deportes."
          }}
        </p>
      </div>
      <router-link v-if="auth.isOrganizer" to="/tournaments">
        <a-button type="primary">Mis torneos</a-button>
      </router-link>
    </header>

    <a-spin :spinning="loading">
      <a-empty
        v-if="!loading && tournaments.length === 0"
        :description="
          selectedSport.hasSport
            ? `No hay torneos públicos activos de ${selectedSport.sportName}`
            : 'No hay torneos públicos activos'
        "
      />

      <a-row v-else :gutter="[16, 16]">
        <a-col v-for="t in tournaments" :key="t.id" :xs="24" :md="12" :lg="8">
          <a-card hoverable class="tournament-card" @click="goToPublic(t.id)">
            <a-tag color="blue">Público</a-tag>
            <h3>{{ t.name }}</h3>
            <p class="stats">
              {{ t.finishedCount }} finalizados · {{ t.liveCount }} en juego ·
              {{ t.scheduledCount }} programados
            </p>
            <a-button type="link" @click.stop="goToPublic(t.id)">Ver calendario y resultados →</a-button>
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useSelectedSportStore } from "../stores/selectedSport";
import { fetchActiveTournamentsWithResults } from "../services/tournamentService";
import type { ActiveTournamentSummary } from "../types/tournament";
import { tournamentPublicRoute } from "../utils/routes";

const router = useRouter();
const auth = useAuthStore();
const selectedSport = useSelectedSportStore();

const tournaments = ref<ActiveTournamentSummary[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    tournaments.value = await fetchActiveTournamentsWithResults(
      selectedSport.sportId ? { sportId: selectedSport.sportId } : undefined
    );
  } finally {
    loading.value = false;
  }
}

function goToPublic(id: string) {
  router.push(tournamentPublicRoute(id));
}

watch(
  () => selectedSport.sportId,
  () => void load()
);

onMounted(async () => {
  document.title = "Torneos públicos";
  await auth.init();
  await load();
});
</script>

<style scoped>
.public-tournaments-page {
  min-height: 100vh;
  padding: 24px clamp(16px, 4vw, 48px);
  background: #0a0a0a;
  color: #fff;
}

.page-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 8px 0 4px;
}

.page-header p {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
}

.tournament-card {
  background: #141414;
  border-color: #303030;
  cursor: pointer;
}

.tournament-card h3 {
  color: #fff;
  margin: 8px 0;
}

.stats {
  margin: 0 0 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
}
</style>
