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
import { useScheduledRefresh } from "../composables/useScheduledRefresh";
import { useSelectedSportStore } from "../stores/selectedSport";
import { fetchLiveMatches } from "../services/liveMatchesService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import type { LiveMatchSummary } from "../types/liveMatch";
import { onLiveMatchesBump } from "../utils/liveMatchesSync";

const route = useRoute();
const selectedSport = useSelectedSportStore();

const remoteEnabled = isSupabaseConfigured();
const liveMatches = ref<LiveMatchSummary[]>([]);
const loadingHome = ref(false);
const nowMs = ref(Date.now());

let refreshInterval: number | null = null;
let stopLiveBump: (() => void) | null = null;

const scheduler = useScheduledRefresh({
  loading: loadingHome,
  isActive: () => route.name === "home",
  load: async () => {
    if (!remoteEnabled) return;
    try {
      liveMatches.value = await fetchLiveMatches({
        sportId: selectedSport.sportId,
        publicTournamentsOnly: true,
      });
    } catch (error) {
      console.error("[home] live matches", error);
      message.error(error instanceof Error ? error.message : "No se pudo cargar en vivo");
    }
  },
});

function activateHome() {
  selectedSport.syncFromQuery(route.query.deporte?.toString());
  scheduler.start();
}

onMounted(() => {
  document.title = "Marcador Deportivo";

  refreshInterval = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);

  document.addEventListener("visibilitychange", scheduler.onVisibilityChange);
  stopLiveBump = onLiveMatchesBump(() => scheduler.scheduleBumpRefresh());

  if (route.name === "home") {
    activateHome();
  }

  if (route.query.error === "organizer-only") {
    message.warning("Solo los organizadores pueden acceder a la mesa de control.");
  }
});

watch(
  () => route.name,
  (name, prev) => {
    if (name === "home" && prev !== "home") {
      activateHome();
    } else if (name !== "home") {
      scheduler.stop();
    }
  }
);

watch(
  () => selectedSport.sportId,
  () => {
    if (route.name === "home") {
      scheduler.refresh({ showSpinner: liveMatches.value.length === 0, force: true });
    }
  }
);

watch(
  () => route.query.deporte,
  (value) => {
    selectedSport.syncFromQuery(value?.toString());
  }
);

onUnmounted(() => {
  scheduler.stop();
  stopLiveBump?.();
  stopLiveBump = null;
  if (refreshInterval) window.clearInterval(refreshInterval);
  document.removeEventListener("visibilitychange", scheduler.onVisibilityChange);
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
