<template>
  <nav class="app-nav" aria-label="Navegación principal">
    <router-link to="/" class="nav-brand">Marcador Deportivo</router-link>

    <div class="nav-center">
      <NavDropdown
        v-if="auth.isOrganizer"
        label="Torneos"
        title="Torneos"
        :active="isTournamentsArea"
        :icon="TrophyOutlined"
        :items="tournamentMenuItems"
        @select="onTournamentMenu"
      />

      <NavDropdown
        v-else
        label="Torneos"
        title="Torneos"
        :active="route.path === '/torneos-publicos'"
        :icon="TrophyOutlined"
        :items="publicTournamentMenuItems"
        @select="onTournamentMenu"
      />

      <router-link to="/" class="nav-link" :class="{ active: route.path === '/' }">
        <FireOutlined class="nav-link-icon" />
        En vivo
      </router-link>

      <NavDropdown
        :label="selectedSport.filterLabel"
        title="Filtrar deporte"
        :active="selectedSport.hasSport"
        :icon="AppstoreOutlined"
        :selected-key="sportMenuSelectedKey"
        :items="sportMenuItems"
        @select="onSportMenu"
      />

      <NavDropdown
        v-if="auth.isOrganizer"
        label="Crear"
        title="Nuevo"
        primary
        :disabled="creating"
        :icon="PlusOutlined"
        :items="createMenuItems"
        @select="onCreateMenu"
      />
    </div>

    <div class="nav-end">
      <template v-if="auth.loading">
        <a-spin size="small" />
      </template>
      <template v-else-if="auth.isAuthenticated">
        <NavDropdown
          :label="auth.displayName"
          title="Cuenta"
          :icon="UserOutlined"
          :items="profileMenuItems"
          @select="onProfileMenu"
        />
      </template>
      <template v-else>
        <button type="button" class="nav-link" @click="openAuthModal('login')">
          Iniciar sesión
        </button>
        <button type="button" class="nav-link nav-link--primary" @click="openAuthModal('register')">
          Registrarse
        </button>
      </template>
    </div>

    <a-modal
      v-model:open="pickSportForMatch"
      title="Partido suelto — elegir deporte"
      ok-text="Crear partido"
      cancel-text="Cancelar"
      :confirm-loading="creating"
      @ok="confirmCreateMatch"
    >
      <SportPicker
        v-model="matchSportId"
        required
        hint="El marcador y los controles se abrirán según el deporte que elijas."
      />
    </a-modal>

    <AuthModal
      :visible="authModalVisible"
      :initial-mode="authModalMode"
      @close="authModalVisible = false"
      @success="onAuthSuccess"
    />
  </nav>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import {
  AppstoreOutlined,
  FireOutlined,
  LogoutOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SettingOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons-vue";
import { useAuthStore } from "../../stores/auth";
import { useSelectedSportStore } from "../../stores/selectedSport";
import { SPORTS, type SportId } from "../../types/sport";
import { useCreateStandaloneMatch } from "../../composables/useCreateStandaloneMatch";
import SportPicker from "../sport/SportPicker.vue";
import AuthModal from "../auth/AuthModal.vue";
import NavDropdown, { type NavDropdownItem } from "./NavDropdown.vue";

const emit = defineEmits<{
  "auth-success": [];
}>();

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const selectedSport = useSelectedSportStore();
const { creating, createStandaloneMatch } = useCreateStandaloneMatch();

const authModalVisible = ref(false);
const authModalMode = ref<"login" | "register">("login");
const pickSportForMatch = ref(false);
const matchSportId = ref<SportId | null>(null);

const availableSports = computed(() => SPORTS.filter((s) => s.available));

const sportMenuSelectedKey = computed(() =>
  selectedSport.sportId ? selectedSport.sportId : "all"
);

const isTournamentsArea = computed(
  () =>
    route.path.startsWith("/tournaments") || route.path === "/torneos-publicos"
);

const tournamentMenuItems = computed((): NavDropdownItem[] => [
  {
    key: "mine",
    label: "Mis torneos",
    description: "Crear y gestionar tus calendarios",
    icon: TrophyOutlined,
  },
  {
    key: "public",
    label: "Torneos públicos activos",
    description: "Ver competiciones abiertas",
    icon: FireOutlined,
  },
]);

const publicTournamentMenuItems = computed((): NavDropdownItem[] => [
  {
    key: "public",
    label: "Torneos públicos activos",
    description: "Calendarios y marcadores en vivo",
    icon: FireOutlined,
  },
]);

const sportMenuItems = computed((): NavDropdownItem[] => {
  const items: NavDropdownItem[] = [
    {
      key: "all",
      label: "Todos los deportes",
      description: "Carrusel con todos los partidos en vivo",
      icon: AppstoreOutlined,
    },
    { key: "sport-divider", label: "", divider: true },
  ];
  for (const sport of availableSports.value) {
    items.push({
      key: sport.id,
      label: sport.name,
      description: sport.description,
      icon: PlayCircleOutlined,
    });
  }
  return items;
});

const createMenuItems = computed((): NavDropdownItem[] => [
  {
    key: "match",
    label: "Partido suelto",
    description: "Marcador TV + controles sin torneo",
    icon: PlayCircleOutlined,
  },
]);

const profileMenuItems = computed((): NavDropdownItem[] => [
  {
    key: "role",
    label: auth.isOrganizer ? "Organizador" : "Espectador",
    description: "Rol de tu cuenta",
    icon: UserOutlined,
    disabled: true,
  },
  { key: "profile-divider", label: "", divider: true },
  {
    key: "profile",
    label: "Mi perfil",
    description: "Datos y preferencias",
    icon: SettingOutlined,
  },
  {
    key: "logout",
    label: "Cerrar sesión",
    icon: LogoutOutlined,
    danger: true,
  },
]);

function sportQuery() {
  return selectedSport.sportId ? { deporte: selectedSport.sportId } : {};
}

onMounted(() => {
  void auth.init();
  selectedSport.syncFromQuery(route.query.deporte?.toString());
  if (route.query.login === "1") {
    openAuthModal("login");
  }
});

function onSportMenu(key: string) {
  if (key === "all" || key === "sport-divider") {
    selectedSport.clearSport();
    const query = { ...route.query };
    delete query.deporte;
    router.replace({ query });
    return;
  }
  selectedSport.setSport(key as SportId);
  router.replace({ query: { ...route.query, deporte: key } });
}

function onTournamentMenu(key: string) {
  if (key === "mine") {
    router.push({ path: "/tournaments", query: sportQuery() });
    return;
  }
  router.push({ path: "/torneos-publicos", query: sportQuery() });
}

function onProfileMenu(key: string) {
  if (key === "role" || key === "profile-divider") return;
  if (key === "logout") {
    void auth.signOut();
    message.success("Sesión cerrada");
    return;
  }
  if (key === "profile") {
    router.push("/profile");
  }
}

function onCreateMenu(key: string) {
  if (key !== "match") return;
  if (!auth.isOrganizer) {
    openAuthModal("register");
    return;
  }
  matchSportId.value = selectedSport.sportId;
  pickSportForMatch.value = true;
}

async function confirmCreateMatch() {
  if (!matchSportId.value) {
    message.warning("Selecciona un deporte.");
    return;
  }
  await createStandaloneMatch(matchSportId.value, () => {
    pickSportForMatch.value = false;
    openAuthModal("register");
  });
  pickSportForMatch.value = false;
}

function openAuthModal(mode: "login" | "register") {
  authModalMode.value = mode;
  authModalVisible.value = true;
}

function onAuthSuccess() {
  authModalVisible.value = false;
  message.success(`Bienvenido, ${auth.displayName}`);
  emit("auth-success");
}

defineExpose({
  openAuth: openAuthModal,
});
</script>

<style scoped>
.app-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  padding: 10px clamp(16px, 4vw, 48px);
  background: var(--app-nav-bg, #141414);
  border-bottom: 1px solid var(--app-nav-border, #303030);
}

.nav-brand {
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  text-decoration: none;
  white-space: nowrap;
  margin-right: auto;
}

.nav-brand:hover {
  color: #69b1ff;
}

.nav-center {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.nav-end {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.nav-link {
  color: rgba(255, 255, 255, 0.78);
  text-decoration: none;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: inherit;
  white-space: nowrap;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.nav-link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.12);
}

.nav-link.active {
  color: #fff;
  background: #1677ff;
  border-color: #4096ff;
  box-shadow: 0 0 0 1px rgba(64, 150, 255, 0.35);
}

.nav-link--primary {
  background: linear-gradient(180deg, #1677ff 0%, #0958d9 100%);
  border-color: #4096ff;
  color: #fff;
}

.nav-link--primary:hover {
  background: linear-gradient(180deg, #4096ff 0%, #1677ff 100%);
}

.nav-link-icon {
  font-size: 14px;
  opacity: 0.9;
}

@media (max-width: 768px) {
  .nav-center {
    order: 3;
    width: 100%;
    justify-content: flex-start;
  }

  .nav-brand {
    margin-right: 0;
  }
}
</style>
