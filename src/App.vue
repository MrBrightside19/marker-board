<template>
  <ConfigProvider :theme="antdTheme">
    <AppNav v-if="showMainNav" ref="navRef" @auth-success="onAuthSuccess" />
    <RouterView :key="route.fullPath" />
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

const route = useRoute();
const navRef = ref<InstanceType<typeof AppNav> | null>(null);
const prefsStore = useUserPreferencesStore();

const showMainNav = computed(() => {
  const name = route.name?.toString() ?? "";
  return ![
    "board",
    "controls",
    "live",
    "tournament-live",
    "overlay",
    "tournament-overlay",
    "basketball-board",
    "basketball-controls",
    "basketball-live",
  ].includes(name);
});

const antdTheme = computed(() => {
  const resolved = getResolvedAppTheme(prefsStore.prefs);
  return {
    algorithm: resolved === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
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

onMounted(() => {
  prefsStore.hydrate();
  openAuthFromQuery();
});

watch(
  () => route.query.login,
  () => openAuthFromQuery()
);
</script>
