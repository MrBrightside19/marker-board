<template>
  <ConfigProvider v-bind="configProviderAttrs">
    <AppNav v-if="showMainNav" ref="navRef" @auth-success="onAuthSuccess" />
    <RouterView />
  </ConfigProvider>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { theme } from "ant-design-vue";
import { ConfigProvider } from "ant-design-vue";
import AppNav from "./components/layout/AppNav.vue";
import { getResolvedAppTheme } from "./services/userPreferencesStorage";
import { useUserPreferencesStore } from "./stores/userPreferences";
import { BROADCAST_ROUTE_NAMES } from "./utils/broadcastRoutes";

const route = useRoute();
const navRef = ref<InstanceType<typeof AppNav> | null>(null);
const prefsStore = useUserPreferencesStore();

const showMainNav = computed(() => {
  const name = route.name?.toString() ?? "";
  return !BROADCAST_ROUTE_NAMES.has(name);
});

/** Live/overlay/board: ConfigProvider sin :theme (igual que 6368e90). */
const configProviderAttrs = computed(() => {
  if (!showMainNav.value) return {};
  const resolved = getResolvedAppTheme(prefsStore.prefs);
  return {
    theme: {
      algorithm: resolved === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
    },
  };
});

function openAuthFromQuery() {
  if (route.query.login === "1") {
    navRef.value?.openAuth("login");
  }
}

function onAuthSuccess() {
  /* La sesión ya está en Pinia; no recargar la página (evita perder sesión por carreras en init). */
}

function hydrateThemeIfNeeded() {
  if (showMainNav.value) {
    prefsStore.hydrate();
  }
}

onMounted(() => {
  hydrateThemeIfNeeded();
  openAuthFromQuery();
});

watch(
  () => route.name,
  () => hydrateThemeIfNeeded()
);

watch(
  () => route.query.login,
  () => openAuthFromQuery()
);
</script>
