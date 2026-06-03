<template>
  <div class="sport-picker">
    <p v-if="hint" class="picker-hint">{{ hint }}</p>
    <a-select
      :value="modelValue ?? undefined"
      :placeholder="placeholder"
      allow-clear
      show-search
      option-filter-prop="label"
      class="sport-select"
      :status="required && !modelValue ? 'error' : undefined"
      :options="selectOptions"
      @change="onChange"
    />
    <p v-if="selectedDescription" class="picker-desc">{{ selectedDescription }}</p>
    <p v-if="required && !modelValue" class="picker-error">Selecciona un deporte para continuar.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { SPORTS, getSportById, type SportId } from "../../types/sport";

const props = withDefaults(
  defineProps<{
    modelValue: SportId | null;
    hint?: string;
    required?: boolean;
    placeholder?: string;
  }>(),
  {
    hint: "",
    required: false,
    placeholder: "Selecciona un deporte",
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: SportId | null];
}>();

const sports = computed(() => SPORTS.filter((s) => s.available));

const selectOptions = computed(() =>
  sports.value.map((sport) => ({
    value: sport.id,
    label: sport.name,
  }))
);

const selectedDescription = computed(() => {
  if (!props.modelValue) return "";
  return getSportById(props.modelValue)?.description ?? "";
});

function onChange(value: SportId | undefined) {
  emit("update:modelValue", value ?? null);
}
</script>

<style scoped>
.sport-picker {
  width: 100%;
}

.picker-hint {
  margin: 0 0 8px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.55);
  line-height: 1.45;
}

.picker-desc {
  margin: 8px 0 0;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

.picker-error {
  margin: 8px 0 0;
  font-size: 13px;
  color: #ff4d4f;
}

.sport-select {
  width: 100%;
}
</style>
