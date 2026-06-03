<template>
  <div class="shortcut-input">
    <a-button
      size="small"
      :type="listening ? 'primary' : 'default'"
      class="key-btn"
      @click="startListening"
    >
      {{ listening ? "Pulsa una tecla…" : displayLabel }}
    </a-button>
    <a-button v-if="modelValue" type="link" size="small" danger @click="clear">Quitar</a-button>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { formatShortcutCode } from "../../utils/controlShortcuts";

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const listening = ref(false);

const displayLabel = computed(() =>
  props.modelValue ? formatShortcutCode(props.modelValue) : "Sin asignar"
);

function stopListening() {
  listening.value = false;
  window.removeEventListener("keydown", onKeyDown, true);
}

function startListening() {
  stopListening();
  listening.value = true;
  window.addEventListener("keydown", onKeyDown, true);
}

function onKeyDown(event: KeyboardEvent) {
  event.preventDefault();
  event.stopPropagation();

  if (event.key === "Escape") {
    stopListening();
    return;
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    emit("update:modelValue", "");
    stopListening();
    return;
  }

  if (event.code === "Tab" || event.code.startsWith("F")) {
    return;
  }

  emit("update:modelValue", event.code);
  stopListening();
}

function clear() {
  emit("update:modelValue", "");
}

onUnmounted(stopListening);
</script>

<style scoped>
.shortcut-input {
  display: flex;
  align-items: center;
  gap: 4px;
}

.key-btn {
  min-width: 120px;
  font-family: ui-monospace, monospace;
}
</style>
