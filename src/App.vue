<template>
  <ConfigProvider>
    <AppNav v-if="showMainNav" />
    <RouterView />
  </ConfigProvider>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { ConfigProvider } from "ant-design-vue";
import AppNav from "./components/layout/AppNav.vue";

const route = useRoute();

const showMainNav = computed(() => {
  const name = route.name?.toString() ?? "";
  return !["board", "controls", "live", "basketball-board", "basketball-controls", "basketball-live"].includes(name);
});
</script>


<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
