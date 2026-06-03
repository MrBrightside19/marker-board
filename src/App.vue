<template>
  <ConfigProvider>
    <AppNav v-if="showMainNav" ref="navRef" @auth-success="onAuthSuccess" />
    <RouterView />
  </ConfigProvider>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ConfigProvider } from "ant-design-vue";
import AppNav from "./components/layout/AppNav.vue";

const route = useRoute();
const navRef = ref<InstanceType<typeof AppNav> | null>(null);

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

function openAuthFromQuery() {
  if (route.query.login === "1") {
    navRef.value?.openAuth("login");
  }
}

function onAuthSuccess() {
  if (route.path === "/") {
    window.location.reload();
  }
}

onMounted(openAuthFromQuery);

watch(
  () => route.query.login,
  () => openAuthFromQuery()
);
</script>
