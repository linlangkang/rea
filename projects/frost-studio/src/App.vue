<script setup lang="ts">
import { ref, computed, defineAsyncComponent, onBeforeUnmount } from "vue";
import { useStudio } from "./store";
import Portal from "./components/Portal.vue";
const Studio = defineAsyncComponent(() => import("./Studio.vue"));
const BuildWorkspace = defineAsyncComponent(
  () => import("./components/BuildWorkspace.vue"),
);
const s = useStudio();
s.restore();
const hash = ref(location.hash.slice(1) || "home");
const page = computed(() =>
  ["home", "parts", "compare", "modules"].includes(hash.value)
    ? hash.value
    : "home",
);
function navigate() {
  hash.value = location.hash.slice(1) || "home";
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", navigate);
onBeforeUnmount(() => window.removeEventListener("hashchange", navigate));
</script>
<template>
  <BuildWorkspace v-if="hash.split('?')[0] === 'build'" /><Studio
    v-else-if="hash === 'studio'"
  /><Portal v-else :page="page" />
</template>
