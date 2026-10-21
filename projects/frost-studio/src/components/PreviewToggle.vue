<script setup lang="ts">
defineProps<{ active: boolean }>();
const emit = defineEmits<{ toggle: [] }>();
</script>
<template>
  <button class="preview-toggle" :aria-pressed="active" @click="emit('toggle')">
    <span class="toggle-track" aria-hidden="true"
      ><span class="toggle-thumb"></span
    ></span>
    {{ active ? "退出沉浸" : "沉浸预览" }}
  </button>
</template>
<style scoped>
/* Adapted from Uiverse.io by alexruix / GlintonLiao.
 * galaxy/Toggle-switches/alexruix_unlucky-pug-99.html
 * MIT license: public/licenses/uiverse-galaxy.txt */
.preview-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  background: transparent;
}
.toggle-track {
  position: relative;
  display: block;
  width: 26px;
  height: 16px;
  border-radius: 12px;
  background: #d4d4da;
  flex: none;
}
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 2px #0002;
  transition: transform 0.15s;
}
[aria-pressed="true"] .toggle-track {
  background: var(--accent);
}
[aria-pressed="true"] .toggle-thumb {
  transform: translateX(10px);
}
@media (prefers-reduced-motion: reduce) {
  .toggle-thumb {
    transition: none;
  }
}
</style>
