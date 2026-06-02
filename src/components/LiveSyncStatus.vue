<template>
  <footer v-if="show" class="live-sync-status" aria-live="polite">
    <span>Partido: {{ matchId || "—" }}</span>
    <span>·</span>
    <span>{{ remoteLabel }}</span>
    <span>·</span>
    <span>Poll: {{ fetchCount }} (cada {{ pollSec }}s)</span>
    <span v-if="lastSyncLabel">· Última: {{ lastSyncLabel }}</span>
  </footer>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  matchId: string;
  isRemoteConfigured: boolean;
  isPolling: boolean;
  fetchCount: number;
  pollIntervalMs: number;
  lastSyncAt: number | null;
}>();

const show = computed(() => Boolean(props.matchId) && props.isRemoteConfigured);

const pollSec = computed(() => Math.round(props.pollIntervalMs / 1000));

const remoteLabel = computed(() => {
  if (!props.isRemoteConfigured) return "sin Supabase";
  if (!props.isPolling) return "poll detenido";
  return "sincronizando";
});

const lastSyncLabel = computed(() => {
  if (!props.lastSyncAt) return "";
  return new Date(props.lastSyncAt).toLocaleTimeString();
});
</script>

<style scoped>
.live-sync-status {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  margin: 0;
  padding: 4px 10px;
  font-size: 11px;
  font-family: system-ui, sans-serif;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(0, 0, 0, 0.65);
  text-align: center;
  pointer-events: none;
}
</style>
