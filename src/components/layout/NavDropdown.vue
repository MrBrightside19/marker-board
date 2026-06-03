<template>
  <a-dropdown
    v-model:open="open"
    :trigger="['click']"
    placement="bottom"
    :overlay-class-name="overlayClass"
  >
    <button
      type="button"
      class="nav-dropdown-trigger"
      :class="{
        active,
        primary,
        disabled,
      }"
      :disabled="disabled"
    >
      <component :is="icon" v-if="icon" class="trigger-icon" />
      <span class="trigger-label">{{ label }}</span>
      <DownOutlined class="trigger-chevron" />
    </button>

    <template #overlay>
      <div class="nav-dropdown-panel" role="menu">
        <p v-if="title" class="panel-title">{{ title }}</p>
        <template v-for="(item, index) in items" :key="item.key ?? `sep-${index}`">
          <div v-if="item.divider && index > 0" class="panel-divider" role="separator" />
          <button
            v-if="!item.divider"
            type="button"
            role="menuitem"
            class="panel-item"
            :class="{
              active: selectedKey === item.key,
              danger: item.danger,
              disabled: item.disabled,
            }"
            :disabled="item.disabled"
            @click="onSelect(item)"
          >
            <component :is="item.icon" v-if="item.icon" class="item-icon" />
            <span class="item-body">
              <span class="item-label">{{ item.label }}</span>
              <span v-if="item.description" class="item-desc">{{ item.description }}</span>
            </span>
            <CheckOutlined v-if="selectedKey === item.key" class="item-check" />
          </button>
        </template>
      </div>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { Component } from "vue";
import { CheckOutlined, DownOutlined } from "@ant-design/icons-vue";

const open = ref(false);

export type NavDropdownItem = {
  key: string;
  label: string;
  description?: string;
  icon?: Component;
  danger?: boolean;
  disabled?: boolean;
  /** Solo separador visual (sin key de acción). */
  divider?: boolean;
};

withDefaults(
  defineProps<{
    label: string;
    items: NavDropdownItem[];
    active?: boolean;
    primary?: boolean;
    disabled?: boolean;
    icon?: Component;
    title?: string;
    selectedKey?: string | null;
    overlayClass?: string;
  }>(),
  {
    active: false,
    primary: false,
    disabled: false,
    title: "",
    selectedKey: null,
    overlayClass: "app-nav-dropdown-root",
  }
);

const emit = defineEmits<{
  select: [key: string];
}>();

function onSelect(item: NavDropdownItem) {
  if (item.disabled || item.divider) return;
  open.value = false;
  emit("select", item.key);
}
</script>

<style scoped>
.nav-dropdown-trigger {
  color: rgba(255, 255, 255, 0.78);
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: inherit;
  white-space: nowrap;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s,
    box-shadow 0.15s;
}

.nav-dropdown-trigger:hover:not(:disabled) {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.12);
}

.nav-dropdown-trigger.active {
  color: #fff;
  background: #1677ff;
  border-color: #4096ff;
  box-shadow: 0 0 0 1px rgba(64, 150, 255, 0.35);
}

.nav-dropdown-trigger.primary {
  background: linear-gradient(180deg, #1677ff 0%, #0958d9 100%);
  border-color: #4096ff;
  color: #fff;
}

.nav-dropdown-trigger.primary:hover:not(:disabled) {
  background: linear-gradient(180deg, #4096ff 0%, #1677ff 100%);
}

.nav-dropdown-trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.trigger-icon {
  font-size: 14px;
  opacity: 0.9;
}

.trigger-label {
  line-height: 1.2;
}

.trigger-chevron {
  font-size: 10px;
  opacity: 0.65;
  transition: transform 0.2s;
}

.nav-dropdown-panel {
  min-width: 220px;
  max-width: min(320px, 92vw);
  padding: 8px;
  background: #1a1a1a;
  border: 1px solid #353535;
  border-radius: 12px;
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
}

.panel-title {
  margin: 0 4px 6px;
  padding: 4px 10px 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
}

.panel-divider {
  height: 1px;
  margin: 6px 8px;
  background: linear-gradient(90deg, transparent, #404040, transparent);
}

.panel-item {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.88);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
}

.panel-item:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
}

.panel-item.active {
  background: rgba(22, 119, 255, 0.22);
  color: #fff;
}

.panel-item.danger {
  color: #ff7875;
}

.panel-item.danger:hover:not(:disabled) {
  background: rgba(255, 77, 79, 0.15);
  color: #ff9c9c;
}

.panel-item.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.item-icon {
  font-size: 16px;
  margin-top: 2px;
  color: #69b1ff;
  flex-shrink: 0;
}

.panel-item.danger .item-icon {
  color: #ff7875;
}

.item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-label {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.25;
}

.item-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.3;
}

.item-check {
  font-size: 12px;
  color: #69b1ff;
  margin-top: 4px;
  flex-shrink: 0;
}
</style>

<style>
/* Contenedor del popup (fuera del scoped del trigger). */
.app-nav-dropdown-root .ant-dropdown-menu {
  display: none;
}

.app-nav-dropdown-root {
  z-index: 1100;
}
</style>
