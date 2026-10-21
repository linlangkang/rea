<script setup lang="ts">
import { ref } from "vue";
// Adapted from Uiverse.io by Adamsco51 (MIT).
// Source: galaxy/Inputs/Adamsco51_moody-vampirebat-6.html
// License: public/licenses/uiverse-galaxy.txt
defineProps<{ label: string; placeholder?: string }>();
const value = defineModel<string>({ required: true });
const input = ref<HTMLInputElement>();
function clear() {
  value.value = "";
  input.value?.focus();
}
</script>

<template>
  <div class="frost-search">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </svg>
    <input
      ref="input"
      v-model="value"
      type="search"
      :aria-label="label"
      :placeholder="placeholder"
      autocomplete="off"
    />
    <button
      v-if="value"
      type="button"
      :aria-label="`清空${label}`"
      @click="clear"
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m7 7 10 10M17 7 7 17" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.frost-search {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 42px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--control-bg);
  padding: 0 8px;
  color: var(--muted);
}
.frost-search:focus-within {
  outline: 3px solid #0071e366;
  outline-offset: 2px;
}
.frost-search > svg {
  width: 19px;
  height: 19px;
  flex: none;
  stroke: currentColor;
  stroke-width: 1.7;
}
.frost-search input {
  width: 100%;
  min-width: 0;
  padding: 10px 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 13px;
  outline: none;
}
.frost-search input::-webkit-search-cancel-button {
  display: none;
}
.frost-search button {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  padding: 5px;
  background: transparent;
  border: 0;
  border-radius: 5px;
  color: inherit;
}
.frost-search button:hover {
  background: #e5e5ea;
}
.frost-search button:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 1px;
}
.frost-search button svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 1.8;
}
</style>
