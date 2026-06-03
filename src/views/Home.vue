<template>
  <div class="home">
    <section v-if="!remoteEnabled" class="banner banner-warn">
      Configura Supabase en <code>.env</code> para ver partidos en vivo y usar cuentas.
    </section>

    <LiveMatchesCarousel
      :matches="liveMatches"
      :loading="loadingHome"
      :sport-name="selectedSport.sportName"
      :now-ms="nowMs"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { message } from "ant-design-vue";
import LiveMatchesCarousel from "../components/home/LiveMatchesCarousel.vue";
import { useAuthStore } from "../stores/auth";
import { useSelectedSportStore } from "../stores/selectedSport";
import { fetchLiveMatches } from "../services/liveMatchesService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import type { LiveMatchSummary } from "../types/liveMatch";

const route = useRoute();
const auth = useAuthStore();
const selectedSport = useSelectedSportStore();

const remoteEnabled = isSupabaseConfigured();
const liveMatches = ref<LiveMatchSummary[]>([]);
const loadingHome = ref(false);
const nowMs = ref(Date.now());

let refreshInterval: number | null = null;
let matchesPollInterval: number | null = null;

async function loadLiveMatches() {
  if (!remoteEnabled) return;
  loadingHome.value = true;
  try {
    liveMatches.value = await fetchLiveMatches({
      sportId: selectedSport.sportId,
      publicTournamentsOnly: true,
    });
  } finally {
    loadingHome.value = false;
  }
}

onMounted(async () => {
  document.title = "Marcador Deportivo";
  selectedSport.syncFromQuery(route.query.deporte?.toString());

  await auth.init();
  await loadLiveMatches();

  if (route.query.error === "organizer-only") {
    message.warning("Solo los organizadores pueden acceder a la mesa de control.");
  }

  refreshInterval = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);

  matchesPollInterval = window.setInterval(loadLiveMatches, 15000);
});

watch(
  () => selectedSport.sportId,
  () => void loadLiveMatches()
);

watch(
  () => route.query.deporte,
  (value) => {
    selectedSport.syncFromQuery(value?.toString());
  }
);

onUnmounted(() => {
  if (refreshInterval) window.clearInterval(refreshInterval);
  if (matchesPollInterval) window.clearInterval(matchesPollInterval);
});
</script>

<style scoped>
.home {
  min-height: calc(100vh - 52px);
  background: #0a0a0a;
  color: #f5f5f5;
  padding: 28px clamp(16px, 4vw, 48px) 48px;
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
</style>
