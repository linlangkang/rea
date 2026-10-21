<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useStudio } from "../store";
import type { EngineAPI } from "../scene/engine";
import { buildRenderPreset } from "../domain/build-plans";
const props = withDefaults(defineProps<{ mode?: "room" | "build" }>(), {
  mode: "room",
});
const emit = defineEmits<{ ready: [value: boolean] }>();
const s = useStudio();
const rendering = computed(() =>
  props.mode === "build" ? buildRenderPreset(s.preset) : s.preset,
);
const host = ref<HTMLElement>();
const shell = ref<HTMLElement>();
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await shell.value?.requestFullscreen();
  } catch {
    status.value = "浏览器未允许全屏，可使用顶部沉浸预览";
  }
}
const status = ref("正在准备渲染模块");
const fps = ref(0);
const loading = ref(false);
const fridgeOpen = ref(false);
function toggleFridge() {
  fridgeOpen.value = !fridgeOpen.value;
  engine?.fridge(fridgeOpen.value);
}
let engine: EngineAPI | undefined;
let generation = 0;
let stopped = false;
let updateFrame = 0;
function scheduleUpdate() {
  if (updateFrame || stopped) return;
  updateFrame = requestAnimationFrame(() => {
    updateFrame = 0;
    engine?.update(rendering.value, s.catalog);
  });
}
async function load() {
  if (loading.value || stopped) return;
  const attempt = ++generation;
  const current = () => !stopped && attempt === generation;
  loading.value = true;
  emit("ready", false);
  fps.value = 0;
  engine?.dispose();
  engine = undefined;
  status.value = "正在加载 Three.js 渲染模块";
  try {
    if (new URLSearchParams(location.search).has("noWebGL"))
      throw Error("测试模式：WebGL 不可用");
    const { createEngine } = await import("../scene/engine");
    if (stopped || attempt !== generation) return;
    status.value = "正在创建 GPU 渲染器与程序化模型";
    const next = await createEngine(
      host.value!,
      (id) => {
        if (current()) s.selected = id;
      },
      (value) => {
        if (current()) status.value = value;
      },
      (value) => {
        if (current()) fps.value = value;
      },
      { mode: props.mode },
    );
    if (!current()) {
      next.dispose();
      return;
    }
    engine = next;
    engine.update(rendering.value, s.catalog);
    engine.select(s.selected);
    engine.fridge(fridgeOpen.value);
    emit("ready", true);
    if (import.meta.env.DEV)
      (window as any).__frost = {
        diagnostics: () => engine?.diagnostics(),
        exportRoom: () => engine?.exportRoom(),
        inspectHardware: (name: string) => engine?.inspectHardware(name),
        project: (id: string) => engine?.project(id),
        captureCamera: () => engine?.captureCamera(),
        fridge: (open: boolean) => {
          fridgeOpen.value = open;
          engine?.fridge(open);
        },
      };
  } catch (e) {
    if (!current()) return;
    engine?.dispose();
    engine = undefined;
    status.value = `3D 暂不可用：${e instanceof Error ? e.message : String(e)}。仍可使用目录、兼容检查和保存。`;
  } finally {
    if (current()) loading.value = false;
  }
}
watch(
  // Budgets, savedAt, quotes and source metadata do not change the scene.
  () => [
    s.preset.instances,
    s.preset.room,
    s.preset.scenery,
    s.preset.camera,
    s.preset.quality,
    s.preset.sidePanel,
    s.preset.explode,
    s.preset.debug,
    s.preset.light,
    s.preset.night,
    s.preset.timeOfDay,
    s.preset.wallpaper,
    s.preset.tvWallpaper,
    s.preset.brightness,
    s.catalog.products,
    s.catalog.skus,
    s.catalog.assets,
  ],
  scheduleUpdate,
  { deep: true },
);
watch(
  () => s.selected,
  (id) => engine?.select(id),
);
watch(
  () => s.cameraRevision,
  () => engine?.focus(rendering.value.camera),
);
function rotate(enabled: boolean) {
  engine?.rotate(enabled);
}
function zoom(factor: number) {
  engine?.zoom(factor);
}
function resetView() {
  engine?.focus(rendering.value.camera);
}
async function downloadImage() {
  if (!engine) throw Error("3D 尚未就绪，请稍后再试");
  const blob = await engine.snapshot();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "霜境装机预览.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
defineExpose({ rotate, zoom, resetView, downloadImage });
onMounted(load);
onBeforeUnmount(() => {
  stopped = true;
  cancelAnimationFrame(updateFrame);
  generation++;
  engine?.dispose();
  delete (window as any).__frost;
});
</script>
<template>
  <section ref="shell" class="scene-shell">
    <div ref="host" class="canvas-host"></div>
    <button class="fullscreen-button" @click="fullscreen">全屏 / 退出</button>
    <details v-if="props.mode === 'room'" class="fridge-controls">
      <summary>房间互动</summary>
      <div>
        <button @click="toggleFridge">
          {{ fridgeOpen ? "关闭冰箱" : "打开冰箱" }}</button
        ><button @click="engine?.inspectHardware('fridge')">冰箱近景</button
        ><button @click="engine?.inspectHardware('snacks')">零食柜近景</button>
      </div>
    </details>
    <div class="scene-badge">
      <i></i>{{ fps ? `${fps} FPS` : "初始化" }} ·
      {{
        s.preset.quality === "low"
          ? "低"
          : s.preset.quality === "high"
            ? "高"
            : "中"
      }}画质
    </div>
    <div class="scene-footer">
      <span>{{ status }}</span
      ><button
        v-if="
          status.includes('失败') ||
          status.includes('丢失') ||
          status.includes('不可用')
        "
        @click="load"
        :disabled="loading"
      >
        重试场景
      </button>
    </div>
    <slot />
  </section>
</template>
<style scoped>
.fridge-controls {
  position: absolute;
  left: 16px;
  top: 58px;
  z-index: 5;
  color: #edf7ff;
  font-size: 11px;
}
.fridge-controls summary {
  cursor: pointer;
  list-style: none;
  padding: 7px 9px;
  border: 1px solid #ffffff24;
  border-radius: 6px;
  background: #262a30c9;
}
.fridge-controls > div {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}
.fridge-controls button {
  padding: 7px 9px;
  background: #262a30ec;
  color: #edf7ff;
  border-radius: 6px;
  border: 1px solid #ffffff24;
}
</style>
