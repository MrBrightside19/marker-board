<template>
  <div class="profile-page">
    <header class="page-header">
      <div>
        <h1>Mi perfil y configuración</h1>
        <p v-if="auth.isAuthenticated">
          {{ auth.displayName }}
          <a-tag :color="auth.isOrganizer ? 'blue' : 'default'" class="role-tag">
            {{ auth.isOrganizer ? "Organizador" : "Espectador" }}
          </a-tag>
        </p>
        <p v-else class="hint">Inicia sesión para sincronizar tu cuenta. La configuración se guarda en este navegador.</p>
      </div>
      <a-button @click="resetAll">Restaurar valores por defecto</a-button>
    </header>

    <a-card title="Sincronización" class="settings-card">
      <p class="card-hint">
        Frecuencia con la que se actualizan En vivo, torneos públicos, marcador remoto y overlay.
      </p>
      <a-form layout="vertical">
        <a-form-item label="Intervalo de actualización (poll)">
          <a-slider
            v-model:value="pollSeconds"
            :min="pollMinSeconds"
            :max="pollMaxSeconds"
            :step="1"
            :tooltip-formatter="(v: number) => `${v} s`"
          />
          <span class="value-hint">{{ pollSeconds }} segundos ({{ prefs.pollIntervalMs }} ms)</span>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="Apariencia de la aplicación" class="settings-card">
      <a-form layout="vertical">
        <a-form-item label="Tema de la interfaz">
          <a-radio-group v-model:value="prefs.appTheme" @change="persist">
            <a-radio value="dark">Oscuro</a-radio>
            <a-radio value="light">Claro</a-radio>
            <a-radio value="system">Sistema</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="Marcador TV" class="settings-card">
      <p class="card-hint">
        Esquema de color en <code>/board</code> (pantalla de cancha). Live y overlay siempre usan
        fondo negro / pastilla oscura para transmisión.
      </p>
      <a-radio-group v-model:value="prefs.scoreboardScheme" @change="persist">
        <a-radio-button value="dark">Negro (texto blanco)</a-radio-button>
        <a-radio-button value="light">Blanco (texto negro)</a-radio-button>
      </a-radio-group>
    </a-card>

    <a-card title="Sonido del conteo final" class="settings-card">
      <p class="card-hint">
        Pitidos mientras baja el reloj de juego, antes de llegar a 00:00 (solo con el reloj en marcha).
      </p>
      <a-form layout="vertical">
        <a-form-item label="Empezar pitidos desde">
          <a-slider
            v-model:value="prefs.countdownSoundFromSeconds"
            :min="countdownMin"
            :max="countdownMax"
            :step="1"
            :tooltip-formatter="(v: number) => `${v} s`"
            @change="persist"
          />
          <span class="value-hint">Últimos {{ prefs.countdownSoundFromSeconds }} segundos</span>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="Atajos de teclado — Controles" class="settings-card">
      <p class="card-hint">
        Solo aplican en la mesa de control de hockey. Haz clic en el botón y pulsa la tecla deseada.
        No funcionan mientras escribes en un campo de texto.
      </p>
      <div class="shortcuts-actions">
        <a-button size="small" @click="prefsStore.resetShortcuts">Restaurar atajos</a-button>
      </div>
      <a-table
        :data-source="shortcutRows"
        :columns="shortcutColumns"
        row-key="action"
        :pagination="false"
        size="small"
        class="shortcuts-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'key'">
            <ShortcutKeyInput
              :model-value="prefs.controlShortcuts[record.action as ControlShortcutAction]"
              @update:model-value="(code) => onShortcutChange(record.action as ControlShortcutAction, code)"
            />
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, watch } from "vue";
import { message } from "ant-design-vue";
import ShortcutKeyInput from "../components/settings/ShortcutKeyInput.vue";
import { useAuthStore } from "../stores/auth";
import { useUserPreferencesStore } from "../stores/userPreferences";
import {
  CONTROL_SHORTCUT_LABELS,
  COUNTDOWN_SOUND_MAX_S,
  COUNTDOWN_SOUND_MIN_S,
  POLL_INTERVAL_MAX_MS,
  POLL_INTERVAL_MIN_MS,
  type ControlShortcutAction,
} from "../types/userPreferences";

const auth = useAuthStore();
const prefsStore = useUserPreferencesStore();

const prefs = reactive(prefsStore.prefs);

const pollMinSeconds = POLL_INTERVAL_MIN_MS / 1000;
const pollMaxSeconds = POLL_INTERVAL_MAX_MS / 1000;
const countdownMin = COUNTDOWN_SOUND_MIN_S;
const countdownMax = COUNTDOWN_SOUND_MAX_S;

const pollSeconds = computed({
  get: () => Math.round(prefs.pollIntervalMs / 1000),
  set: (seconds: number) => {
    prefs.pollIntervalMs = Math.round(seconds * 1000);
    persist();
  },
});

const shortcutColumns = [
  { title: "Acción", dataIndex: "label", key: "label" },
  { title: "Tecla", key: "key", width: 220 },
];

const shortcutRows = computed(() =>
  (Object.keys(CONTROL_SHORTCUT_LABELS) as ControlShortcutAction[]).map((action) => ({
    action,
    label: CONTROL_SHORTCUT_LABELS[action],
  }))
);

function persist() {
  prefsStore.patch({ ...prefs });
}

function onShortcutChange(action: ControlShortcutAction, code: string) {
  const used = (Object.entries(prefs.controlShortcuts) as [ControlShortcutAction, string][]).find(
    ([a, c]) => a !== action && c && c === code
  );
  if (used) {
    message.warning(`Esa tecla ya está asignada a «${CONTROL_SHORTCUT_LABELS[used[0]]}».`);
    return;
  }
  prefsStore.setShortcut(action, code);
  Object.assign(prefs, prefsStore.prefs);
}

function resetAll() {
  prefsStore.resetAll();
  Object.assign(prefs, prefsStore.prefs);
  message.success("Configuración restaurada");
}

watch(
  () => prefsStore.prefs,
  (next) => Object.assign(prefs, next),
  { deep: true }
);

watch(
  () => prefs.appTheme,
  () => persist()
);

watch(
  () => prefs.scoreboardScheme,
  () => persist()
);

onMounted(async () => {
  document.title = "Mi perfil";
  prefsStore.hydrate();
  Object.assign(prefs, prefsStore.prefs);
  await auth.init();
});
</script>

<style scoped>
.profile-page {
  min-height: calc(100vh - 52px);
  padding: 24px clamp(16px, 4vw, 48px) 48px;
  background: var(--app-shell-bg);
  color: var(--app-shell-text);
}

.page-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px;
}

.page-header p {
  margin: 0;
  color: var(--app-shell-muted);
}

.role-tag {
  margin-left: 8px;
}

.hint,
.card-hint,
.value-hint {
  color: var(--app-shell-muted);
  font-size: 13px;
}

.card-hint {
  margin: 0 0 16px;
}

.value-hint {
  display: block;
  margin-top: 8px;
}

.settings-card {
  margin-bottom: 20px;
  background: var(--app-panel-bg);
  border-color: var(--app-panel-border);
}

.settings-card :deep(.ant-card-head-title) {
  color: var(--app-shell-text);
}

.shortcuts-actions {
  margin-bottom: 12px;
}

.shortcuts-table :deep(.ant-table) {
  background: transparent;
  color: var(--app-shell-text);
}
</style>
