<template>
  <div v-if="needsArmClick" class="operator-arm-overlay" role="dialog" aria-modal="true">
    <button type="button" class="operator-arm-dialog" @click="armNow">
      <span class="operator-arm-title">Protección al cerrar</span>
      <span class="operator-arm-text">
        Pulsa aquí para activar la confirmación si cierras esta ventana por error.
      </span>
      <span class="operator-arm-action">Activar protección</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  needsArmClick: boolean;
  armNow: () => void;
}>();
</script>

<style scoped>
.operator-arm-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.72);
}

.operator-arm-dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 420px;
  width: 100%;
  margin: 0;
  padding: 24px 28px;
  border: 2px solid #faad14;
  border-radius: 12px;
  background: #1a1a1a;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  text-align: center;
}

.operator-arm-dialog:hover {
  background: #262626;
}

.operator-arm-title {
  font-size: 18px;
  font-weight: 700;
}

.operator-arm-text {
  font-size: 14px;
  line-height: 1.45;
  opacity: 0.9;
}

.operator-arm-action {
  margin-top: 4px;
  padding: 8px 20px;
  border-radius: 6px;
  background: #faad14;
  color: #141414;
  font-size: 14px;
  font-weight: 700;
}
</style>
