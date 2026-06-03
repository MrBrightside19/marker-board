<template>
  <a-modal
    v-model:open="open"
    :title="mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'"
    :footer="null"
    destroy-on-close
    @cancel="emit('close')"
  >
    <a-segmented
      v-model:value="mode"
      :options="[
        { label: 'Iniciar sesión', value: 'login' },
        { label: 'Registrarse', value: 'register' },
      ]"
      block
      style="margin-bottom: 20px"
    />

    <form class="auth-form" @submit.prevent="submit">
      <template v-if="mode === 'register'">
        <label class="field">
          <span class="field-label">Nombre</span>
          <a-input v-model:value="displayName" placeholder="Tu nombre" size="large" />
        </label>

        <div class="field">
          <span class="field-label">Tipo de cuenta</span>
          <a-radio-group v-model:value="role" style="width: 100%">
            <a-radio-button value="spectator" style="width: 50%; text-align: center">
              Espectador
            </a-radio-button>
            <a-radio-button value="organizer" style="width: 50%; text-align: center">
              Organizador
            </a-radio-button>
          </a-radio-group>
          <div class="role-hint">
            <template v-if="role === 'organizer'">
              Crea partidos, torneos y opera el marcador desde la mesa.
            </template>
            <template v-else>
              Sigue partidos en vivo y consulta marcadores sin operar la mesa.
            </template>
          </div>
        </div>
      </template>

      <label class="field">
        <span class="field-label">Correo</span>
        <a-input
          v-model:value="email"
          type="email"
          autocomplete="email"
          placeholder="correo@ejemplo.com"
          size="large"
        />
      </label>

      <label class="field">
        <span class="field-label">Contraseña</span>
        <a-input-password
          v-model:value="password"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          placeholder="Mínimo 6 caracteres"
          size="large"
        />
      </label>

      <a-alert
        v-if="!remoteConfigured"
        type="warning"
        show-icon
        message="Supabase no está configurado. Revisa el archivo .env"
        style="margin-bottom: 12px"
      />

      <a-alert
        v-if="infoMessage"
        type="success"
        :message="infoMessage"
        show-icon
        style="margin-bottom: 12px"
      />

      <a-alert
        v-if="errorMessage"
        type="error"
        :message="errorMessage"
        show-icon
        style="margin-bottom: 12px"
      />

      <a-button type="primary" html-type="submit" size="large" block :loading="loading">
        {{ mode === "login" ? "Entrar" : "Registrarse" }}
      </a-button>
    </form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { UserRole } from "../../types/auth";
import { useAuthStore } from "../../stores/auth";
import { isSupabaseConfigured } from "../../services/supabaseClient";
import { getAuthErrorMessage } from "../../utils/authErrors";

const props = defineProps<{
  visible: boolean;
  initialMode?: "login" | "register";
}>();

const emit = defineEmits<{
  close: [];
  success: [];
}>();

const auth = useAuthStore();
const remoteConfigured = isSupabaseConfigured();
const open = ref(props.visible);
const mode = ref<"login" | "register">(props.initialMode ?? "login");
const email = ref("");
const password = ref("");
const displayName = ref("");
const role = ref<UserRole>("spectator");
const loading = ref(false);
const errorMessage = ref("");
const infoMessage = ref("");

watch(
  () => props.visible,
  (value) => {
    open.value = value;
    if (value) {
      mode.value = props.initialMode ?? "login";
      errorMessage.value = "";
      infoMessage.value = "";
    }
  }
);

watch(open, (value) => {
  if (!value) emit("close");
});

async function submit() {
  errorMessage.value = "";
  infoMessage.value = "";

  if (!remoteConfigured) {
    errorMessage.value = "Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env";
    return;
  }

  const trimmedEmail = email.value.trim();
  if (!trimmedEmail) {
    errorMessage.value = "Indica tu correo.";
    return;
  }
  if (!password.value) {
    errorMessage.value = "Indica tu contraseña.";
    return;
  }

  loading.value = true;

  try {
    if (mode.value === "login") {
      await auth.signIn(trimmedEmail, password.value);
      if (!auth.isAuthenticated) {
        errorMessage.value = "No se pudo establecer la sesión. Intenta de nuevo.";
        return;
      }
      open.value = false;
      emit("success");
      return;
    }

    if (password.value.length < 6) {
      errorMessage.value = "La contraseña debe tener al menos 6 caracteres.";
      return;
    }
    if (!displayName.value.trim()) {
      errorMessage.value = "Indica tu nombre.";
      return;
    }

    const { needsEmailConfirmation } = await auth.signUp(
      trimmedEmail,
      password.value,
      role.value,
      displayName.value.trim()
    );

    if (needsEmailConfirmation) {
      infoMessage.value =
        "Cuenta creada. Revisa tu correo y confirma el enlace antes de iniciar sesión.";
      return;
    }

    open.value = false;
    emit("success");
  } catch (error) {
    errorMessage.value = getAuthErrorMessage(error);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
}

.role-hint {
  margin-top: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
  line-height: 1.4;
}
</style>
