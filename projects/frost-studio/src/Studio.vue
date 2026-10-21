<script setup lang="ts">
import { ref, defineAsyncComponent, watch } from "vue";
import { useStudio } from "./store";
import CatalogPanel from "./components/CatalogPanel.vue";
import DetailsPanel from "./components/DetailsPanel.vue";
import PreviewToggle from "./components/PreviewToggle.vue";
const ImportDialog = defineAsyncComponent(
  () => import("./components/ImportDialog.vue"),
);
const ProductLibrary = defineAsyncComponent(
  () => import("./components/ProductLibrary.vue"),
);
import { createUnrealSnapshot } from "./domain/unreal";
const SceneView = defineAsyncComponent(
  () => import("./components/SceneView.vue"),
);
const s = useStudio();
const importing = ref(false);
const library = ref(false);
const mobilePanel = ref("scene");
const immersive = ref(false);
const toolsMenu = ref<HTMLDetailsElement>();
const viewMenu = ref<HTMLDetailsElement>();
const sceneTools = ref<HTMLElement>();
function closeTools() {
  if (toolsMenu.value) toolsMenu.value.open = false;
}
function dismissTools(event: MouseEvent) {
  if (event.target instanceof Node && !toolsMenu.value?.contains(event.target))
    closeTools();
  if (event.target instanceof Node)
    for (const menu of Array.from(
      sceneTools.value?.querySelectorAll<HTMLDetailsElement>("details[open]") ??
        [],
    ))
      if (!menu.contains(event.target)) menu.open = false;
}
watch(
  () => s.selected,
  (id) => {
    if (id && matchMedia("(max-width: 900px)").matches)
      mobilePanel.value = "details";
  },
);
function chooseCamera(id: typeof s.preset.camera) {
  s.preset.camera = id;
  s.cameraRevision++;
  if (viewMenu.value?.open) {
    viewMenu.value.open = false;
    viewMenu.value.querySelector("summary")?.focus();
  }
}
function closeSceneTools() {
  const menu =
    sceneTools.value?.querySelector<HTMLDetailsElement>("details[open]");
  if (menu) {
    menu.open = false;
    menu.querySelector("summary")?.focus();
  }
}
const cameras = [
  { id: "default", label: "默认视角", short: "默认" },
  { id: "room", label: "房间全景", short: "全景" },
  { id: "desk", label: "桌面特写", short: "桌搭" },
  { id: "pc", label: "主机内部", short: "主机" },
  { id: "window", label: "窗边视角", short: "窗边" },
  { id: "bed", label: "床品近景", short: "床品" },
  { id: "lounge", label: "沙发近景", short: "沙发" },
] as const;
function download(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>
<template>
  <div class="app" :class="{ immersive }" @click="dismissTools">
    <header class="topbar">
      <a class="brand" href="/" aria-label="霜境工作台"
        ><span class="brand-mark">❆</span
        ><span>霜境 <small>FROST STUDIO</small></span></a
      >
      <nav class="studio-nav" aria-label="工作台导航">
        <a href="#home">首页</a><a href="#parts">选配</a
        ><a href="#compare">比较</a><a href="#modules">模组</a>
      </nav>
      <div class="header-actions">
        <button @click="library = true">产品库</button>
        <PreviewToggle
          :active="immersive"
          @toggle="
            immersive = !immersive;
            mobilePanel = 'scene';
          "
        />
        <button class="primary" aria-label="保存方案" @click="s.save">
          保存
        </button>
        <details
          ref="toolsMenu"
          class="tools-menu"
          @keydown.esc="
            closeTools();
            toolsMenu?.querySelector('summary')?.focus();
          "
        >
          <summary aria-label="工具" title="导入、导出与恢复">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </summary>
          <div class="tools-popover" @click="closeTools">
            <button @click="importing = true">↓ 导入目录</button
            ><button @click="download(s.catalog, 'frost-catalog.json')">
              ↑ 导出目录</button
            ><button
              class="subtle"
              @click="
                download(
                  { preset: s.preset, catalog: s.catalog },
                  'frost-backup.json',
                )
              "
            >
              方案备份
            </button>
            <button
              title="导出 UE 编辑器布局接口；尚未连接实时串流"
              @click="
                download(
                  createUnrealSnapshot(s.preset, s.catalog),
                  'frost-unreal.json',
                )
              "
            >
              导出 UE 配置
            </button>
            <button @click="s.restore">恢复</button>
            <button @click="s.reset">重置</button>
          </div>
        </details>
      </div>
    </header>
    <nav class="mobile-tabs">
      <button
        :class="{ active: mobilePanel === 'scene' }"
        @click="mobilePanel = 'scene'"
      >
        3D 空间</button
      ><button
        :class="{ active: mobilePanel === 'catalog' }"
        @click="mobilePanel = 'catalog'"
      >
        组件目录</button
      ><button
        :class="{ active: mobilePanel === 'details' }"
        @click="mobilePanel = 'details'"
      >
        详情与检查
      </button>
    </nav>
    <main class="workspace" :data-mobile="mobilePanel">
      <CatalogPanel />
      <div class="center">
        <SceneView v-if="s.ready" />
        <div
          ref="sceneTools"
          class="scene-toolbar"
          @keydown.esc="closeSceneTools"
        >
          <nav class="camera-bar" aria-label="场景视角">
            <button
              v-for="camera in cameras.slice(0, 4)"
              :key="camera.id"
              :aria-label="camera.label"
              :class="{ active: s.preset.camera === camera.id }"
              :aria-pressed="s.preset.camera === camera.id"
              @click="chooseCamera(camera.id)"
            >
              {{ camera.short }}
            </button>
            <details ref="viewMenu" name="scene-tools" class="view-menu">
              <summary
                :class="{
                  active: cameras
                    .slice(4)
                    .some((camera) => camera.id === s.preset.camera),
                }"
              >
                {{
                  cameras
                    .slice(4)
                    .find((camera) => camera.id === s.preset.camera)?.short ??
                  "更多"
                }}<span aria-hidden="true">⌄</span>
              </summary>
              <div class="view-popover">
                <button
                  v-for="camera in cameras.slice(4)"
                  :key="camera.id"
                  :aria-pressed="s.preset.camera === camera.id"
                  @click="chooseCamera(camera.id)"
                >
                  {{ camera.label }}
                </button>
              </div>
            </details>
          </nav>
          <section class="controls">
            <details name="scene-tools" class="control-section assembly">
              <summary>装配</summary>
              <div class="control-popover">
                <div class="popover-heading">
                  <h3>主机装配</h3>
                  <button aria-label="关闭装配" @click="closeSceneTools">
                    完成
                  </button>
                </div>
                <p class="micro">结构示意，非维修指导</p>
                <div class="button-row">
                  <button @click="s.preset.sidePanel = !s.preset.sidePanel">
                    {{ s.preset.sidePanel ? "隐藏侧板" : "显示侧板" }}</button
                  ><button @click="s.preset.explode = 1">拆解</button
                  ><button @click="s.preset.explode = 0">组装</button>
                </div>
                <label class="range-label"
                  >爆炸视图
                  <input
                    aria-label="爆炸进度"
                    type="range"
                    min="0"
                    max="1"
                    step=".01"
                    v-model.number="s.preset.explode"
                  /><span
                    >{{ Math.round(s.preset.explode * 100) }}%</span
                  ></label
                >
              </div>
            </details>
            <details name="scene-tools" class="control-section atmosphere">
              <summary>氛围</summary>
              <div class="control-popover">
                <div class="popover-heading">
                  <h3>氛围与显示</h3>
                  <button aria-label="关闭氛围" @click="closeSceneTools">
                    完成
                  </button>
                </div>
                <div class="button-row">
                  <select aria-label="窗外景观" v-model="s.preset.scenery">
                    <option value="mountain">高山流水</option>
                    <option value="coast">三亚风格海边</option>
                    <option value="mist">群山云雾</option>
                  </select>
                  <select aria-label="灯光模式" v-model="s.preset.light">
                    <option value="ice">冰蓝灯光</option>
                    <option value="white">纯白灯光</option>
                    <option value="breath">蓝白呼吸</option>
                    <option value="off">关闭灯光</option></select
                  ><button @click="s.preset.night = !s.preset.night">
                    {{ s.preset.night ? "☾ 夜间" : "☀ 白天" }}</button
                  ><select aria-label="动态壁纸" v-model="s.preset.wallpaper">
                    <option value="photo">电脑：山湖摄影</option>
                    <option value="aurora">极光壁纸</option>
                    <option value="orbit">星轨壁纸</option>
                    <option value="grid">网格壁纸</option>
                  </select>
                  <select aria-label="电视画面" v-model="s.preset.tvWallpaper">
                    <option value="coast">电视：海岸摄影</option>
                    <option value="mountain">电视：山湖摄影</option>
                  </select>
                </div>
                <label class="range-label"
                  >屏幕亮度
                  <input
                    aria-label="屏幕亮度"
                    type="range"
                    min="0"
                    max="1"
                    step=".05"
                    v-model.number="s.preset.brightness"
                  /><span
                    >{{ Math.round(s.preset.brightness * 100) }}%</span
                  ></label
                >
              </div>
            </details>
            <details name="scene-tools" class="advanced">
              <summary>设置</summary>
              <div class="control-popover">
                <div class="popover-heading">
                  <h3>场景设置</h3>
                  <button aria-label="关闭场景设置" @click="closeSceneTools">
                    完成
                  </button>
                </div>
                <div class="button-row">
                  <button @click="s.referenceLayout()">应用参考图布局</button>
                  <label
                    >时间 {{ s.preset.timeOfDay.toFixed(1) }} 时<input
                      aria-label="时间"
                      type="range"
                      min="0"
                      max="23.5"
                      step=".5"
                      v-model.number="s.preset.timeOfDay"
                      @input="
                        s.preset.night =
                          s.preset.timeOfDay < 6 || s.preset.timeOfDay >= 18
                      "
                  /></label>
                  <label
                    >布局调试<select
                      aria-label="布局调试"
                      v-model="s.preset.debug"
                    >
                      <option value="off">关闭</option>
                      <option value="axes">坐标轴</option>
                      <option value="bounds">包围盒</option>
                      <option value="wireframe">线框</option>
                    </select></label
                  >
                  <label
                    >画质
                    <select aria-label="画质" v-model="s.preset.quality">
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                    </select></label
                  ><label v-for="(title, i) in ['宽', '深', '高']"
                    >{{ title }}（米）<input
                      type="number"
                      :min="[8, 6, 3][i]"
                      :max="[12, 10, 4][i]"
                      step=".5"
                      :value="s.preset.room[i]"
                      @change="
                        s.preset.room[i] = Math.min(
                          [12, 10, 4][i],
                          Math.max(
                            [8, 6, 3][i],
                            Number(($event.target as HTMLInputElement).value),
                          ),
                        )
                      "
                  /></label>
                </div>
                <p class="micro">
                  拖动旋转 · 滚轮缩放 · 右键平移 ·
                  点击选中。触屏单指旋转、双指缩放。窗外为固定方向远景示意，二维景观无近景视差。时间为艺术光照控制，非真实天文定位。
                  房间
                  {{
                    s.preset.room.join("×")
                  }}m，为示意布局。顶部与前墙剖切，尚无完整家具碰撞。
                </p>
              </div>
            </details>
          </section>
        </div>
      </div>
      <DetailsPanel />
    </main>
    <footer class="statusbar">
      <span role="status">{{ s.notice || "本地工作台已就绪" }}</span
      ><span>演示目录 · 参数化模型 · 无实时价格</span>
    </footer>
    <ImportDialog
      v-if="importing"
      @close="
        importing = false;
        toolsMenu?.querySelector('summary')?.focus();
      "
    />
    <ProductLibrary v-if="library" @close="library = false" />
  </div>
</template>
