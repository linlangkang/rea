<script setup lang="ts">
import { computed, ref, watch, onMounted, defineAsyncComponent } from "vue";
import { useStudio } from "../store";
import { type SKU } from "../domain/schema";
import {
  inputsFor,
  checkCompatibility,
  power,
  totals,
} from "../domain/compatibility";
import { productRows, replacePart, statusLabels } from "../domain/workbench";
import {
  snapshot,
  readPlans,
  savePlan,
  encodePlan,
  decodePlan,
  type SavedPlan,
  type PlanSnapshot,
} from "../domain/build-plans";
import ModalDialog from "./ModalDialog.vue";
import PartIcon from "./PartIcon.vue";
const SceneView = defineAsyncComponent(() => import("./SceneView.vue"));
const s = useStudio();
const dialogTitles: Record<string, string> = {
  rename: "修改方案名称",
  plans: "我的方案",
  restore: "载入方案预览",
  replace: "更换配件",
  share: "分享装机方案",
  checks: "装机兼容性",
  power: "主机功耗",
  budget: "报价与预算",
};
const scene = ref<{
  rotate: (v: boolean) => void;
  zoom: (n: number) => void;
  resetView: () => void;
  downloadImage: () => Promise<void>;
}>();
const sceneReady = ref(false);
const dialog = ref(""),
  activeTab = ref("parts"),
  search = ref(""),
  editing = ref(""),
  hide3d = ref(false),
  rotating = ref(false),
  mobileTab = ref("scene");
const plans = ref<SavedPlan[]>([]),
  activePlan = computed({
    get: () => s.preset.savedPlanId ?? "",
    set: (id: string) => {
      s.preset.savedPlanId = id || null;
    },
  }),
  pending = ref<PlanSnapshot>(),
  pendingId = ref(""),
  localNotice = ref("");
const rows = computed(() => productRows(s.catalog));
const checks = computed(() =>
  checkCompatibility(inputsFor(s.preset, s.catalog), s.catalog),
);
const issues = computed(() => checks.value.filter((c) => c.status !== "兼容"));
const conflicts = computed(() =>
  checks.value.filter((c) => c.status === "不兼容"),
);
const watts = computed(() => power(s.preset, s.catalog));
const price = computed(() => totals(s.preset, s.catalog));
const caseIds = [
  "case",
  "cpu",
  "board",
  "gpu",
  "ram",
  "aio",
  "ssd",
  "psu",
  "fan",
  "strip",
];
const parts = computed(() =>
  caseIds.flatMap((id) => {
    const instance = s.preset.instances.find((i) => i.id === id);
    const record = rows.value.find((r) => r.sku.id === instance?.skuId);
    return instance && record ? [{ instance, ...record }] : [];
  }),
);
const chosen = computed(() =>
  parts.value.find(
    (p) =>
      p.instance.id === (s.selected?.startsWith("ram-") ? "ram" : s.selected),
  ),
);
const alternatives = computed(() =>
  productRows(s.catalog, search.value, chosen.value?.product.category ?? ""),
);
const quoteRows = computed(() =>
  parts.value.flatMap((p) =>
    p.quotes.map((q) => ({
      ...q,
      label: p.sku.label,
      quantity: p.instance.quantity,
    })),
  ),
);
const errors = ref("");
function open(name: string) {
  dialog.value = name;
  errors.value = "";
  if (name === "plans") {
    try {
      plans.value = readPlans(localStorage);
    } catch {
      errors.value = "方案库无法读取，原数据未覆盖。可先导出当前方案。";
    }
  }
}
function message(text: string) {
  s.notice = localNotice.value = text;
}
function current() {
  return snapshot(s.preset, s.catalog);
}
function apply(value: PlanSnapshot) {
  const next = snapshot(value.preset, value.catalog);
  s.preset = next.preset;
  s.catalog = next.catalog;
  s.selected = null;
  s.cameraRevision++;
  activePlan.value = "";
  rotating.value = false;
}
function store(copy = false) {
  try {
    const next = current();
    if (copy)
      next.preset.name = (next.preset.name.slice(0, 75) + " 副本").slice(0, 80);
    const id =
      copy || !activePlan.value ? crypto.randomUUID() : activePlan.value;
    next.preset.savedPlanId = id;
    plans.value = savePlan(localStorage, {
      id,
      updatedAt: new Date().toISOString(),
      snapshot: next,
    });
    if (copy) apply(next);
    activePlan.value = id;
    const saved = s.save();
    message(
      saved
        ? copy
          ? "已创建独立方案副本，原归档保留"
          : "已保存当前方案及方案库快照"
        : "方案库快照已保存，当前存档保存失败，请导出备份",
    );
  } catch (e) {
    message((e as Error).message);
  }
}
function load(plan: SavedPlan) {
  pending.value = plan.snapshot;
  pendingId.value = plan.id;
  dialog.value = "restore";
}
function acceptPending() {
  if (!pending.value) return;
  const id = pendingId.value;
  apply(pending.value);
  activePlan.value = id;
  pending.value = undefined;
  pendingId.value = "";
  dialog.value = "";
  if (location.hash.includes("?")) history.replaceState(null, "", "#build");
  message("方案已载入当前工作台；保存前不会覆盖原存档");
}
function rename() {
  const name = editing.value.trim();
  if (!name || name.length > 80) {
    errors.value = "方案名称需为 1—80 个字符";
    return;
  }
  s.preset.name = name;
  dialog.value = "";
  message("已更新方案名称，请保存以保留");
}
function change(sku: SKU) {
  try {
    replacePart(s.preset, s.catalog, sku.id, s.selected ?? "");
    dialog.value = "";
    message("已更换为 " + sku.label + "，检查结果已更新");
  } catch (e) {
    errors.value = (e as Error).message;
  }
}
function select(id: string) {
  s.selected = id;
}
function switchRotation() {
  rotating.value = !rotating.value;
  scene.value?.rotate(rotating.value);
}
watch(hide3d, () => {
  rotating.value = false;
  sceneReady.value = false;
});
async function image() {
  try {
    await scene.value?.downloadImage();
    if (!scene.value) throw Error("请先显示 3D 预览");
    message("已导出当前真实 3D 预览图片");
  } catch (e) {
    message((e as Error).message);
  }
}
function download(data: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportJson() {
  download(
    JSON.stringify(current(), null, 2),
    "霜境装机方案.json",
    "application/json;charset=utf-8",
  );
}
function exportMarkdown() {
  download(
    [
      "# " + s.preset.name,
      "",
      ...parts.value.map(
        (p) =>
          `- ${p.product.category}：${p.sku.label} × ${p.instance.quantity}（${statusLabels[p.sku.status]}）`,
      ),
      "",
      `主机已采集报价：${price.value.groupCoverage.主机 ? "¥ " + price.value.groups.主机 : "暂无报价"}`,
      "无报价部件不计为免费。功耗信息不足时不推断。",
    ].join("\n"),
    "霜境装机清单.md",
    "text/markdown;charset=utf-8",
  );
}
const shareLink = ref("");
function share() {
  try {
    shareLink.value =
      location.origin +
      location.pathname +
      "#build?config=" +
      encodePlan(current());
    open("share");
  } catch (e) {
    message((e as Error).message);
  }
}
async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareLink.value);
    message("分享链接已复制；链接包含完整方案，接收方打开后可预览载入");
  } catch {
    errors.value = "浏览器未允许复制，请手动选择下方链接复制";
  }
}
onMounted(() => {
  const token = new URLSearchParams(location.hash.split("?")[1] ?? "").get(
    "config",
  );
  if (token) {
    try {
      pending.value = decodePlan(token);
      dialog.value = "restore";
    } catch (e) {
      message((e as Error).message);
    }
  }
});
</script>
<template>
  <div class="build-app">
    <header class="build-header">
      <a href="#home" class="build-brand"
        ><img src="/favicon.svg" alt="" />霜境<span>装机工作台</span></a
      >
      <nav aria-label="装机导航">
        <a href="#home">探索</a><a href="#parts">配件库</a
        ><a href="#studio">房间模式</a><a href="#modules">模组</a>
      </nav>
      <button class="build-save" @click="store()">保存方案</button>
    </header>
    <aside class="build-nav">
      <span class="build-nav-label">我的工作台</span
      ><a href="#build" aria-current="page"
        ><PartIcon category="机箱" />3D 装机</a
      ><button @click="open('plans')">
        <PartIcon category="固态" />我的方案</button
      ><a href="#parts"><PartIcon category="主板" />配件库</a
      ><a href="#compare"><PartIcon category="显示器" />尺寸比较</a
      ><a href="#studio"><PartIcon category="沙发" />房间与桌搭</a>
      <div class="build-nav-bottom">
        <span>原创参数化场景</span>
        <p>先检查尺寸与规格，<br />再决定如何搭配。</p>
        <a
          href="https://www.buildcores.com/setup/GdVKB9slt"
          target="_blank"
          rel="noopener noreferrer"
          >查看功能参考 ↗</a
        >
      </div>
    </aside>
    <main class="build-main">
      <div class="build-title">
        <div>
          <span>装机方案 · 本机保存</span
          ><button
            class="build-name"
            @click="
              editing = s.preset.name;
              open('rename');
            "
          >
            <h1>{{ s.preset.name }}</h1>
            <span>编辑</span>
          </button>
        </div>
        <div class="build-title-actions">
          <button @click="open('plans')">我的方案</button
          ><button @click="store(true)">复制方案</button>
        </div>
      </div>
      <section class="build-metrics" aria-label="方案概览">
        <button @click="open('budget')">
          <span
            >主机采集报价
            <small>{{
              price.groupCoverage.主机 ? "部分报价" : "尚未采集"
            }}</small></span
          ><b>{{
            price.groupCoverage.主机
              ? "¥ " + price.groups.主机.toLocaleString()
              : "暂无报价"
          }}</b></button
        ><button @click="open('checks')">
          <span>兼容性检查</span
          ><b :class="{ warning: issues.length, conflict: conflicts.length }">{{
            conflicts.length
              ? conflicts.length + " 项不兼容"
              : issues.length
                ? issues.length + " 项待核验"
                : "已通过"
          }}</b></button
        ><button @click="open('power')">
          <span>主机功耗</span
          ><b>{{
            watts.max === null ? "参数待补全" : watts.max + " W"
          }}</b></button
        ><button @click="open('budget')">
          <span>用户预算估值 <small>全方案</small></span
          ><b>¥ {{ price.budget.toLocaleString() }}</b>
        </button>
      </section>
      <div class="build-actions">
        <div>
          <button @click="share">分享链接</button
          ><button @click="image" :disabled="hide3d || !sceneReady">
            导出图片</button
          ><button @click="exportMarkdown">导出清单</button
          ><button @click="exportJson">方案备份</button>
        </div>
        <button @click="hide3d = !hide3d">
          {{ hide3d ? "显示 3D" : "隐藏 3D" }}
        </button>
      </div>
      <nav class="build-mobile-tabs" aria-label="装机内容">
        <button
          :aria-pressed="mobileTab === 'scene'"
          @click="mobileTab = 'scene'"
        >
          3D 预览</button
        ><button
          :aria-pressed="mobileTab === 'parts'"
          @click="mobileTab = 'parts'"
        >
          配件清单
        </button>
      </nav>
      <div class="build-workspace" :data-mobile="mobileTab">
        <section class="build-preview" :class="{ hidden3d: hide3d }">
          <div v-if="hide3d" class="build-preview-off">
            <PartIcon category="机箱" />
            <h2>3D 已暂停</h2>
            <p>渲染器已释放，配件配置与检查继续可用。</p>
            <button @click="hide3d = false">继续预览</button>
          </div>
          <SceneView
            v-else
            ref="scene"
            mode="build"
            @ready="sceneReady = $event"
          >
            <div class="build-view-controls">
              <button
                :aria-pressed="rotating"
                :disabled="!sceneReady"
                @click="switchRotation"
              >
                {{ rotating ? "停止旋转" : "自动旋转" }}</button
              ><button
                aria-label="放大主机"
                :disabled="!sceneReady"
                @click="scene?.zoom(0.8)"
              >
                ＋</button
              ><button
                aria-label="缩小主机"
                :disabled="!sceneReady"
                @click="scene?.zoom(1.25)"
              >
                −</button
              ><button :disabled="!sceneReady" @click="scene?.resetView()">
                复位视角
              </button>
            </div>
          </SceneView>
          <div class="build-model-controls">
            <button
              :aria-pressed="s.preset.sidePanel"
              @click="s.preset.sidePanel = !s.preset.sidePanel"
            >
              {{ s.preset.sidePanel ? "隐藏侧板" : "显示侧板" }}</button
            ><button
              :aria-pressed="s.preset.explode > 0"
              @click="s.preset.explode = s.preset.explode ? 0 : 1"
            >
              {{ s.preset.explode ? "合拢主机" : "拆解主机" }}</button
            ><label
              >灯效<select aria-label="装机灯效" v-model="s.preset.light">
                <option value="ice">冰蓝</option>
                <option value="white">白光</option>
                <option value="breath">呼吸</option>
                <option value="off">关闭</option>
              </select></label
            ><label
              >画质<select aria-label="装机画质" v-model="s.preset.quality">
                <option value="low">流畅</option>
                <option value="medium">均衡</option>
                <option value="high">精细</option>
              </select></label
            >
          </div>
          <p class="build-model-note">
            拖动旋转 · 滚轮缩放 ·
            点选部件。模型为尺寸参数化示意，非精确装配仿真。
          </p>
        </section>
        <aside class="build-parts">
          <nav aria-label="配件面板">
            <button
              :aria-pressed="activeTab === 'parts'"
              @click="activeTab = 'parts'"
            >
              配件清单 <span>{{ parts.length }}</span></button
            ><button
              :aria-pressed="activeTab === 'quotes'"
              @click="activeTab = 'quotes'"
            >
              报价记录
            </button>
          </nav>
          <div v-if="activeTab === 'parts'" class="build-part-list">
            <article
              v-for="part in parts"
              :key="part.instance.id"
              :class="{ selected: s.selected === part.instance.id }"
            >
              <span class="build-part-type"
                >{{
                  part.product.category === "CPU"
                    ? "处理器"
                    : part.product.category
                }}<small>× {{ part.instance.quantity }}</small></span
              >
              <div class="build-part-row">
                <button
                  class="build-part-icon"
                  :aria-label="'选择 ' + part.sku.label"
                  @click="select(part.instance.id)"
                >
                  <PartIcon :category="part.product.category" /></button
                ><button
                  class="build-part-name"
                  @click="select(part.instance.id)"
                >
                  <h2>{{ part.sku.label }}</h2>
                  <small>{{ statusLabels[part.sku.status] }}</small>
                </button>
              </div>
              <div class="build-part-foot">
                <span>{{
                  part.quotes[0]
                    ? "¥ " + part.quotes[0].amount.toLocaleString()
                    : "暂无报价"
                }}</span
                ><button
                  :aria-label="'更换 ' + part.product.category"
                  @click="
                    select(part.instance.id);
                    search = '';
                    open('replace');
                  "
                >
                  更换
                </button>
              </div>
            </article>
            <div v-if="chosen" class="build-part-detail">
              <h3>当前选中 · {{ chosen.product.category }}</h3>
              <p>
                {{ chosen.sku.dimensionsMm?.join(" × ") ?? "尺寸尚未核验"
                }}<span v-if="chosen.sku.dimensionsMm"> mm</span>
              </p>
              <p v-if="chosen.sku.id !== s.instance?.skuId">
                所选条目与场景套装关联
              </p>
              <a
                v-for="source in chosen.sources"
                :key="source.id"
                :href="source.url"
                target="_blank"
                rel="noopener noreferrer"
                >规格来源 · {{ source.checkedAt }} ↗</a
              >
              <p v-if="!chosen.sources.length">暂无官方规格来源</p>
            </div>
          </div>
          <div v-else class="build-quotes">
            <h2>已采集的报价</h2>
            <p>仅展示目录中的来源记录，不是实时价格曲线。</p>
            <article v-for="q in quoteRows" :key="q.id">
              <b>{{ q.label }}</b
              ><a :href="q.url" target="_blank" rel="noopener noreferrer"
                >{{ q.platform }} · ¥{{ q.amount.toLocaleString() }} ↗</a
              ><small
                >{{ q.region }} ·
                {{ new Date(q.collectedAt).toLocaleDateString("zh-CN") }} ·
                单件</small
              >
            </article>
            <div v-if="!quoteRows.length" class="build-empty">
              <PartIcon category="固态" />
              <p>暂无报价记录</p>
              <small>可通过组件目录导入带来源与采集时间的报价。</small
              ><a href="#modules">导入组件目录 →</a>
            </div>
          </div>
        </aside>
      </div>
      <p class="build-status" role="status">
        {{ localNotice || s.notice || "装机工作台已就绪" }}
      </p>
    </main>
    <ModalDialog
      v-if="dialog"
      class="build-dialog"
      :label="dialogTitles[dialog]"
      @close="dialog = ''"
      ><header>
        <h2>{{ dialogTitles[dialog] }}</h2>
        <button aria-label="关闭装机面板" @click="dialog = ''">关闭</button>
      </header>
      <form v-if="dialog === 'rename'" @submit.prevent="rename">
        <label
          >方案名称<input
            aria-label="方案名称"
            v-model="editing"
            maxlength="80"
            required /></label
        ><button class="build-save" type="submit">确认名称</button>
      </form>
      <template v-else-if="dialog === 'plans'"
        ><p>最多保存 8 个独立方案；加载前先预览，当前存档不会自动覆盖。</p>
        <article v-for="plan in plans" :key="plan.id" class="build-saved">
          <div>
            <b>{{ plan.snapshot.preset.name }}</b
            ><small>{{
              new Date(plan.updatedAt).toLocaleString("zh-CN")
            }}</small>
          </div>
          <button @click="load(plan)">预览载入</button>
        </article>
        <p v-if="!plans.length">
          还没有归档方案，点击“保存方案”创建。
        </p></template
      >
      <template v-else-if="dialog === 'restore' && pending"
        ><h3>{{ pending.preset.name }}</h3>
        <p>
          包含 {{ pending.preset.instances.length }} 个场景组件、{{
            pending.catalog.skus.length
          }}
          个型号。将替换当前工作台的配件与显示设置，原保存仍保留。
        </p>
        <button class="build-save" @click="acceptPending">
          载入到当前工作台</button
        ><button
          @click="
            dialog = '';
            pending = undefined;
          "
        >
          保留当前方案
        </button></template
      >
      <template v-else-if="dialog === 'replace'"
        ><p v-if="chosen">
          替换 {{ chosen.product.category }}：{{ chosen.sku.label }}
        </p>
        <input
          aria-label="搜索替换型号"
          v-model="search"
          placeholder="搜索型号或品牌"
        />
        <div class="build-replacements">
          <button
            v-for="item in alternatives"
            :key="item.sku.id"
            @click="change(item.sku)"
          >
            <PartIcon :category="item.product.category" /><span
              ><b>{{ item.sku.label }}</b
              ><small
                >{{ statusLabels[item.sku.status] }} ·
                {{ item.sku.dimensionsMm?.join(" × ") ?? "尺寸未核验" }}</small
              ></span
            ><span>使用</span>
          </button>
        </div></template
      >
      <template v-else-if="dialog === 'share'"
        ><p>
          链接包含完整配置与目录，数据在链接片段中，不上传服务器。对方打开后需要确认载入。
        </p>
        <textarea
          readonly
          aria-label="方案分享链接"
          :value="shareLink"
        ></textarea
        ><button class="build-save" @click="copyLink">复制分享链接</button
        ><button @click="exportJson">下载 JSON</button></template
      >
      <template v-else-if="dialog === 'checks'"
        ><p>
          {{
            issues.length
              ? "存在未知或待核验项目，不能视为整机完全兼容。"
              : "已有规则检查通过，购买前仍应核对机械安装空间。"
          }}
        </p>
        <details v-for="check in checks" :key="check.id">
          <summary>
            {{ check.name }} <b>{{ check.status }}</b>
          </summary>
          <p>{{ check.reason }}</p>
          <p>建议：{{ check.suggestion }}</p>
          <a
            v-for="url in check.sources"
            :key="url"
            :href="url"
            target="_blank"
            rel="noopener noreferrer"
            >查看依据 ↗</a
          >
        </details></template
      >
      <template v-else-if="dialog === 'power'"
        ><p>
          {{
            watts.max === null
              ? "缺少部分部件的最大功耗参数，暂不显示可靠的整机估值。"
              : "最大功耗 " +
                watts.max +
                " W，按 25% 余量建议 " +
                watts.recommended +
                " W。"
          }}
        </p>
        <p>
          仅统计主机电源供电部件，TDP 不当作最大功耗。显示器和房间电器不计入。
        </p>
        <ul>
          <li
            v-for="part in parts.filter(
              (p) => !['机箱', '电源'].includes(p.product.category),
            )"
            :key="part.instance.id"
          >
            {{ part.sku.label }}：{{
              part.sku.specs.maxPower === undefined
                ? "未核验最大功耗"
                : part.sku.specs.maxPower * part.instance.quantity + " W"
            }}
          </li>
        </ul></template
      >
      <template v-else-if="dialog === 'budget'"
        ><p>
          主机采集报价：{{
            price.groupCoverage.主机 ? "¥ " + price.groups.主机 : "暂无报价"
          }}；用户预算估值不代表市场价格。
        </p>
        <label
          class="build-budget"
          v-for="part in parts"
          :key="part.instance.id"
          ><span>{{ part.sku.label }} × {{ part.instance.quantity }}</span
          ><input
            :aria-label="part.product.category + ' 单件预算'"
            type="number"
            min="0"
            placeholder="单件预算 / 元"
            :value="s.preset.budgets[part.instance.id] ?? ''"
            @change="
              ($event.target as HTMLInputElement).value === ''
                ? delete s.preset.budgets[part.instance.id]
                : (s.preset.budgets[part.instance.id] = Math.max(
                    0,
                    Number(($event.target as HTMLInputElement).value) || 0,
                  ))
            "
        /></label>
        <p>全方案用户预算：¥ {{ price.budget.toLocaleString() }}</p></template
      >
      <p v-if="errors" class="build-error" role="alert">
        {{ errors }}
      </p></ModalDialog
    >
  </div>
</template>
<style src="./build-workspace.css"></style>
