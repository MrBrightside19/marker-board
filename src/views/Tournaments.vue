<template>
  <div class="tournaments-page">
    <header class="page-header">
      <div>
        <h1>Mis torneos</h1>
        <p v-if="auth.isOrganizer">
          Crea torneos, carga el calendario por deporte y opera cada partido.
        </p>
        <p v-else>Solo los organizadores pueden crear torneos.</p>
      </div>
      <a-button v-if="auth.isOrganizer" type="primary" size="large" @click="openCreateModal">
        Nuevo torneo
      </a-button>
    </header>

    <a-spin :spinning="loading">
      <a-empty v-if="!loading && tournaments.length === 0" description="Aún no tienes torneos" />

      <a-row v-else :gutter="[16, 16]">
        <a-col v-for="t in tournaments" :key="t.id" :xs="24" :md="12" :lg="8">
          <a-card hoverable class="tournament-card" @click="goToTournament(t.id)">
            <div class="card-tags">
              <a-tag :color="t.visibility === 'public' ? 'blue' : 'default'">
                {{ t.visibility === "public" ? "Público" : "Privado" }}
              </a-tag>
              <a-tag>{{ sportLabel(t.sport) }}</a-tag>
            </div>
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
      width="520px"
      destroy-on-close
      @ok="onCreateModalOk"
    >
      <a-form layout="vertical">
        <a-form-item label="Deporte del torneo" required>
          <SportPicker
            v-model="form.sport"
            required
            hint="Define qué marcador y plantilla CSV usarás en este torneo."
          />
        </a-form-item>
        <a-form-item label="Nombre del torneo" required>
          <a-input v-model:value="form.name" placeholder="Ej. Liga Verano 2026" />
        </a-form-item>
        <a-form-item label="Visibilidad" required>
          <a-radio-group v-model:value="form.visibility">
            <a-radio value="private">Privado (solo con enlace)</a-radio>
            <a-radio value="public">Público (aparece en inicio)</a-radio>
          </a-radio-group>
          <p class="form-hint visibility-hint">
            Los torneos privados no se listan en el inicio. Comparte el enlace del torneo para que
            otros vean calendario y marcadores.
          </p>
        </a-form-item>
        <a-form-item label="Fecha inicio" required>
          <a-date-picker
            :value="form.startDate"
            style="width: 100%"
            format="DD/MM/YYYY"
            placeholder="Selecciona fecha"
            allow-clear
            input-read-only
            :get-popup-container="popupContainer"
            @update:value="onStartDateChange"
          />
        </a-form-item>
        <a-form-item label="Fecha fin" required>
          <a-date-picker
            :value="form.endDate"
            style="width: 100%"
            format="DD/MM/YYYY"
            placeholder="Selecciona fecha"
            allow-clear
            input-read-only
            :get-popup-container="popupContainer"
            @update:value="onEndDateChange"
          />
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
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useAuthStore } from "../stores/auth";
import type { Tournament, TournamentVisibility } from "../types/tournament";
import { getSportById, type SportId } from "../types/sport";
import { createTournament as createTournamentApi, fetchTournamentsByOrganizer } from "../services/tournamentService";
import { getTournamentTemplateUrl } from "../utils/tournamentCsv";
import SportPicker from "../components/sport/SportPicker.vue";

const router = useRouter();
const auth = useAuthStore();
const templateUrl = getTournamentTemplateUrl();

const tournaments = ref<Tournament[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const creating = ref(false);

const form = ref<{
  name: string;
  sport: SportId | null;
  visibility: TournamentVisibility;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
}>({
  name: "",
  sport: null,
  visibility: "private",
  startDate: dayjs(),
  endDate: dayjs().add(7, "day"),
});

function sportLabel(sportId: SportId) {
  return getSportById(sportId)?.name ?? sportId;
}

function formatDate(value: string) {
  return dayjs(value).format("DD/MM/YYYY");
}

function goToTournament(id: string) {
  router.push({ name: "tournament-detail", params: { id } });
}

function popupContainer(trigger: HTMLElement) {
  return trigger.parentElement ?? document.body;
}

/** Evita valores inválidos del picker al borrar texto (causaban cuelgue de la UI). */
function coercePickerDate(value: unknown): Dayjs | null {
  if (value == null || value === "") return null;
  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = dayjs(trimmed, ["DD/MM/YYYY", "YYYY-MM-DD"], true);
    return parsed.isValid() ? parsed : null;
  }
  return null;
}

function onStartDateChange(value: unknown) {
  form.value.startDate = coercePickerDate(value);
}

function onEndDateChange(value: unknown) {
  form.value.endDate = coercePickerDate(value);
}

function openCreateModal() {
  form.value = {
    name: "",
    sport: null,
    visibility: "private",
    startDate: dayjs().startOf("day"),
    endDate: dayjs().add(7, "day").startOf("day"),
  };
  showCreate.value = true;
}

function onCreateModalOk() {
  return createTournament();
}

async function loadTournaments() {
  const organizerId = auth.userId;
  if (!organizerId) {
    tournaments.value = [];
    return;
  }

  loading.value = true;
  try {
    tournaments.value = await fetchTournamentsByOrganizer(organizerId);
  } finally {
    loading.value = false;
  }
}

async function bootstrapPage() {
  await auth.init();

  if (!auth.isOrganizer) {
    loading.value = false;
    message.info("Regístrate como organizador para crear torneos.");
    router.replace("/");
    return;
  }

  await loadTournaments();
}

watch(
  () => auth.userId,
  (userId, prevUserId) => {
    if (!auth.initialized || !auth.isOrganizer || !userId || userId === prevUserId) return;
    void loadTournaments();
  }
);

async function createTournament(): Promise<void> {
  if (!auth.userId) {
    message.warning("Inicia sesión como organizador.");
    return Promise.reject();
  }
  if (!form.value.sport) {
    message.error("Selecciona el deporte del torneo.");
    return Promise.reject();
  }
  if (!form.value.name.trim()) {
    message.error("Indica el nombre del torneo.");
    return Promise.reject();
  }

  const start = form.value.startDate;
  const end = form.value.endDate;
  if (!start?.isValid() || !end?.isValid()) {
    message.error("Indica las fechas del torneo.");
    return Promise.reject();
  }
  if (end.isBefore(start, "day")) {
    message.error("La fecha fin debe ser posterior a la de inicio.");
    return Promise.reject();
  }

  creating.value = true;
  try {
    const created = await createTournamentApi({
      organizerId: auth.userId,
      name: form.value.name.trim(),
      sport: form.value.sport,
      visibility: form.value.visibility,
      startDate: start.format("YYYY-MM-DD"),
      endDate: end.format("YYYY-MM-DD"),
    });
    message.success("Torneo creado");
    showCreate.value = false;
    await loadTournaments();
    goToTournament(created.id);
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Error al crear torneo");
    return Promise.reject();
  } finally {
    creating.value = false;
  }
}

onMounted(() => {
  document.title = "Torneos";
  void bootstrapPage();
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

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.form-hint {
  margin: 0;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
  line-height: 1.5;
}

.visibility-hint {
  margin-top: 8px;
  color: rgba(0, 0, 0, 0.45);
}

</style>
