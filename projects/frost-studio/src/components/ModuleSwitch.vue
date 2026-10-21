<script setup lang="ts">
// Adapted from Uiverse / aasisodiya_sour-horse-29.html (MIT); public/licenses/uiverse-galaxy.txt.
defineProps<{ modelValue: boolean; label: string }>();
defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>
<template>
  <label class="module-switch"
    ><input
      type="checkbox"
      :aria-label="label"
      :checked="modelValue"
      @change="
        $emit('update:modelValue', ($event.target as HTMLInputElement).checked)
      " /><span class="module-slider" aria-hidden="true"></span
  ></label>
</template>
<style scoped>
.module-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 26px;
  flex-shrink: 0;
}
.module-switch input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
}
.module-slider {
  position: absolute;
  pointer-events: none;
  inset: 0;
  background: #d6d6dc;
  border-radius: 20px;
  transition: background 0.2s;
}
.module-slider:before {
  content: "";
  position: absolute;
  width: 20px;
  height: 20px;
  top: 3px;
  left: 3px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 1px 3px #0002;
  transition: transform 0.2s;
}
input:checked + .module-slider {
  background: #0071e3;
}
input:checked + .module-slider:before {
  transform: translateX(18px);
}
input:focus-visible + .module-slider {
  outline: 3px solid #0071e366;
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .module-slider,
  .module-slider:before {
    transition: none;
  }
}
</style>
