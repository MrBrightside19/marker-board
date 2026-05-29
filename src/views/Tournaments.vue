<template>
  <div class="tournaments-page">
    <header class="page-header">
      <div>
        <h1>Mis torneos</h1>
        <p v-if="auth.isOrganizer">Crea torneos, carga el calendario y opera cada partido.</p>
        <p v-else>Solo los organizadores pueden crear torneos.</p>
      </div>
      <a-button v-if="auth.isOrganizer" type="primary" size="large" @click="showCreate = true">
        Nuevo torneo
      </a-button>
    </header>

    <a-spin :spinning="loading">
      <a-empty v-if="!loading && tournaments.length === 0" description="Aún no tienes torneos" />

      <a-row v-else :gutter="[16, 16]">
        <a-col v-for="t in tournaments" :key="t.id" :xs="24" :md="12" :lg="8">
          <a-card hoverable class="tournament-card" @click="goToTournament(t.id)">
            <h3>{{ t.name }}</h3>
            <p>{{ formatDate(t.startDate) }} — {{ formatDate(t.endDate) }}</p>
            <a-button type="link" @click.stop="goToTournament(t.id)">Gestionar partidos →</a-button>
          </a-card>
        </a-col>
      </a-row>
    </a-spin>

    <a-modal
      v-model:open="showCreate"
      title="Nuevo torneo"
      ok-text="Crear torneo"
      cancel-text="Cancelar"
      :confirm-loading="creating"
      @ok="createTournament"
    >
      <a-form layout="vertical">
        <a-form-item label="Nombre del torneo" required>
          <a-input v-model:value="form.name" placeholder="Ej. Liga Verano 2026" />
        </a-form-item>
        <a-form-item label="Fecha inicio" required>
          <a-date-picker v-model:value="form.startDate" style="width: 100%" />
        </a-form-item>
        <a-form-item label="Fecha fin" required>
          <a-date-picker v-model:value="form.endDate" style="width: 100%" />
        </a-form-item>
        <p class="form-hint">
          Los tiempos de cada partido se definen en la
          <a :href="templateUrl" download target="_blank" rel="noopener">plantilla CSV</a>.
        </p>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useAuthStore } from "../stores/auth";
import type { Tournament } from "../types/tournament";
import { createTournament as createTournamentApi, fetchTournamentsByOrganizer } from "../services/tournamentService";
import { getTournamentTemplateUrl } from "../utils/tournamentCsv";

const router = useRouter();
const auth = useAuthStore();
const templateUrl = getTournamentTemplateUrl();

const tournaments = ref<Tournament[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const creating = ref(false);

const form = ref<{
  name: string;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
}>({
  name: "",
  startDate: dayjs(),
  endDate: dayjs().add(7, "day"),
});

function formatDate(value: string) {
  return dayjs(value).format("DD/MM/YYYY");
}

function goToTournament(id: string) {
  router.push({ name: "tournament-detail", params: { id } });
}

async function loadTournaments() {
  if (!auth.userId) return;
  loading.value = true;
  try {
    tournaments.value = await fetchTournamentsByOrganizer(auth.userId);
  } finally {
    loading.value = false;
  }
}

async function createTournament() {
  if (!auth.userId) {
    message.warning("Inicia sesión como organizador.");
    return;
  }
  if (!form.value.name.trim()) {
    message.error("Indica el nombre del torneo.");
    return;
  }
  if (!form.value.startDate || !form.value.endDate) {
    message.error("Indica las fechas del torneo.");
    return;
  }
  if (form.value.endDate.isBefore(form.value.startDate, "day")) {
    message.error("La fecha fin debe ser posterior a la de inicio.");
    return;
  }

  creating.value = true;
  try {
    const created = await createTournamentApi({
      organizerId: auth.userId,
      name: form.value.name.trim(),
      startDate: form.value.startDate.format("YYYY-MM-DD"),
      endDate: form.value.endDate.format("YYYY-MM-DD"),
    });
    message.success("Torneo creado");
    showCreate.value = false;
    await loadTournaments();
    goToTournament(created.id);
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Error al crear torneo");
  } finally {
    creating.value = false;
  }
}

onMounted(async () => {
  document.title = "Torneos";
  await auth.init();
  if (!auth.isOrganizer) {
    message.info("Regístrate como organizador para crear torneos.");
    router.replace("/");
    return;
  }
  await loadTournaments();
});
</script>

<style scoped>
.tournaments-page {
  min-height: 100vh;
  padding: 24px clamp(16px, 4vw, 48px);
  background: #0a0a0a;
  color: #fff;
}

.page-header {
  display: flex;
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

.back-link {
  color: #69b1ff;
}

.tournament-card {
  background: #141414;
  border-color: #303030;
  cursor: pointer;
}

.tournament-card h3 {
  color: #fff;
  margin: 0 0 8px;
}

.tournament-card p {
  margin: 0 0 4px;
  color: rgba(255, 255, 255, 0.7);
}

.form-hint {
  margin: 0;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
  line-height: 1.5;
}
</style>
