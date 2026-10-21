<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import type { SKU } from "../domain/schema";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const props = defineProps<{ skus: SKU[] }>();
const host = ref<HTMLElement>(),
  error = ref("");
let renderer: THREE.WebGLRenderer | undefined,
  controls: OrbitControls | undefined,
  observer: ResizeObserver | undefined;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#f5f6f8");
const camera = new THREE.PerspectiveCamera(35, 1, 0.001, 100);
const group = new THREE.Group();
scene.add(group);
const colors = ["#8dacc8", "#d3bfa1", "#a5b9a8"];
function render() {
  if (renderer && host.value) {
    const { clientWidth: w, clientHeight: h } = host.value;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
}
function clear() {
  while (group.children.length) {
    const child = group.children[0] as THREE.Mesh;
    child.geometry?.dispose();
    if (Array.isArray(child.material))
      child.material.forEach((m) => m.dispose());
    else child.material?.dispose();
    group.remove(child);
  }
}
function update() {
  clear();
  const items = props.skus.filter((s) => s.dimensionsMm);
  const max = Math.max(
    0.06,
    ...items.flatMap((s) => s.dimensionsMm!.map((n) => n / 1000)),
  );
  let cursor = 0;
  items.forEach((sku) => {
    const index = props.skus.indexOf(sku),
      dims = sku.dimensionsMm!.map((n) => n / 1000) as [number, number, number];
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...dims),
      new THREE.MeshStandardMaterial({
        color: colors[index],
        roughness: 0.6,
        metalness: 0.12,
      }),
    );
    mesh.position.set(cursor + dims[0] / 2, dims[1] / 2, 0);
    group.add(mesh);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({
        color: "#5e7386",
        transparent: true,
        opacity: 0.5,
      }),
    );
    edges.position.copy(mesh.position);
    group.add(edges);
    cursor += dims[0] + max * 0.3;
  });
  const width = Math.max(max, cursor - max * 0.3),
    center = width / 2;
  const grid = new THREE.GridHelper(
    Math.max(1, width * 2, max * 3),
    20,
    "#c3cbd3",
    "#e0e4e8",
  );
  group.add(grid);
  grid.position.x = center;
  camera.position.set(
    center + max * 1.5,
    max * 1.7,
    Math.max(width, max * 2) * 1.8,
  );
  if (controls) {
    controls.target.set(center, max * 0.4, 0);
    controls.update();
  } else camera.lookAt(center, max * 0.4, 0);
  render();
}
onMounted(() => {
  try {
    if (new URLSearchParams(location.search).has("noWebGL"))
      throw Error("当前为纯数据预览");
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute(
      "aria-label",
      "按录入尺寸等比例显示的配件方体，可拖动旋转",
    );
    renderer.domElement.setAttribute("role", "img");
    host.value!.append(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x879aac, 2));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(3, 5, 4);
    scene.add(light);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.addEventListener("change", render);
    observer = new ResizeObserver(render);
    observer.observe(host.value!);
    update();
  } catch (e) {
    error.value = `3D 尺寸图暂不可用：${(e as Error).message}。仍可查看下方规格比较。`;
    renderer?.dispose();
  }
});
watch(() => props.skus, update, { deep: true });
onBeforeUnmount(() => {
  observer?.disconnect();
  controls?.removeEventListener("change", render);
  controls?.dispose();
  clear();
  renderer?.dispose();
  renderer?.domElement.remove();
});
</script>
<template>
  <section class="size-compare">
    <div ref="host" class="size-canvas">
      <p v-if="error" role="status">{{ error }}</p>
    </div>
    <div class="size-legend">
      <span v-for="(sku, index) in skus" :key="sku.id"
        ><i :style="{ background: colors[index] }"></i>{{ sku.label
        }}<small>{{
          sku.dimensionsMm ? "录入尺寸，非外形模型" : "尺寸缺失，未绘制"
        }}</small></span
      >
    </div>
    <p>拖动旋转 · 滚轮缩放 · 方体尺寸示意，不代表实物外形或安装余量</p>
  </section>
</template>
<style scoped>
.size-compare {
  background: #f5f6f8;
  border-block: 1px solid #ebecf0;
}
.size-canvas {
  height: 300px;
  position: relative;
}
.size-canvas :deep(canvas) {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}
.size-canvas > p {
  padding: 30px;
  color: #8d8d98;
  font-size: 12px;
}
.size-legend {
  padding: 16px 24px;
  display: flex;
  gap: 30px;
  justify-content: center;
  flex-wrap: wrap;
}
.size-legend > span {
  font-size: 11px;
  max-width: 260px;
}
.size-legend i {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 3px;
  margin-right: 6px;
}
.size-legend small {
  font-size: 9px;
  display: block;
  color: #909099;
  margin-top: 6px;
}
.size-compare > p {
  text-align: center;
  font-size: 10px;
  color: #909099;
  margin: 0;
  padding: 10px 20px 20px;
}
@media (max-width: 700px) {
  .size-canvas {
    height: 250px;
  }
  .size-legend {
    gap: 15px;
    justify-content: start;
  }
}
</style>
