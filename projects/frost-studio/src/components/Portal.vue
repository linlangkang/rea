<script setup lang="ts">
import { computed, ref, defineAsyncComponent } from "vue";
import { useStudio } from "../store";
import { categories, type SKU } from "../domain/schema";
import {
  productRows,
  replacementTargets,
  replacePart,
  comparisonRows,
  statusLabels,
} from "../domain/workbench";
import {
  checkCompatibility,
  inputsFor,
  totals,
  power,
} from "../domain/compatibility";
import PartIcon from "./PartIcon.vue";
import ModuleSwitch from "./ModuleSwitch.vue";
import ModalDialog from "./ModalDialog.vue";
const SizeCompare = defineAsyncComponent(() => import("./SizeCompare.vue"));
const ImportDialog = defineAsyncComponent(() => import("./ImportDialog.vue"));
const props = defineProps<{ page: string }>();
const s = useStudio();
const query = ref(""),
  category = ref(""),
  verified = ref(false),
  sort = ref("default");
const compared = computed({
    get: () =>
      s.compared.filter((id) => s.catalog.skus.some((sku) => sku.id === id)),
    set: (ids: string[]) => {
      s.compared = ids;
    },
  }),
  limit = ref(24),
  importing = ref(false);
const target = ref<Record<string, string>>({});
const rows = computed(() => {
  const result = productRows(
    s.catalog,
    query.value,
    category.value,
    verified.value,
  );
  if (sort.value === "name")
    return result.sort((a, b) =>
      a.sku.label.localeCompare(b.sku.label, "zh-CN"),
    );
  if (sort.value === "verified")
    return result.sort((a, b) => a.sku.status.localeCompare(b.sku.status));
  return result;
});
const allRows = computed(() => productRows(s.catalog));
const checked = computed(() =>
  checkCompatibility(inputsFor(s.preset, s.catalog), s.catalog),
);
const issues = computed(() => checked.value.filter((c) => c.status !== "兼容"));
const price = computed(() => totals(s.preset, s.catalog));
const watts = computed(() => power(s.preset, s.catalog));
const comparison = computed(() =>
  compared.value.flatMap(
    (id) => s.catalog.skus.find((sku) => sku.id === id) ?? [],
  ),
);
const specs = computed(() => comparisonRows(comparison.value));
const current = computed(() =>
  s.preset.instances.map((instance) => ({
    instance,
    record: allRows.value.find((r) => r.sku.id === instance.skuId),
  })),
);
const showChecks = ref(false),
  showBudget = ref(false);
function start(camera: typeof s.preset.camera = "pc") {
  s.preset.camera = camera;
  s.cameraRevision++;
  location.hash = camera === "pc" ? "build" : "studio";
}
function apply(sku: SKU) {
  const targets = replacementTargets(s.preset, s.catalog, sku);
  const id =
    target.value[sku.id] || (targets.length === 1 ? targets[0].id : "");
  try {
    const instance = replacePart(s.preset, s.catalog, sku.id, id);
    s.selected = instance.id;
    s.notice = `已将 ${instance.id} 更换为 ${sku.label}，方案检查已更新`;
  } catch (e) {
    s.notice = (e as Error).message;
  }
}
function toggleCompare(id: string) {
  if (compared.value.includes(id))
    compared.value = compared.value.filter((x) => x !== id);
  else if (compared.value.length < 3) compared.value = [...compared.value, id];
  else s.notice = "最多同时比较 3 个型号，请先移除一个";
}
function preview(id: string) {
  s.selected = id;
  const host = [
    "cpu",
    "gpu",
    "board",
    "ram",
    "ssd",
    "psu",
    "aio",
    "fan",
    "case",
  ];
  start(host.includes(id) ? "pc" : "desk");
}
function quick(mode: string) {
  if (mode === "day") {
    s.preset.night = false;
    s.preset.light = "white";
    start("desk");
  } else if (mode === "night") {
    s.preset.night = true;
    s.preset.light = "ice";
    start("room");
  } else start("pc");
}
function exportList() {
  const text = [
    "# 霜境装机清单",
    "",
    ...current.value.map(
      ({ instance, record }) =>
        `- ${record?.product.category ?? "组件"}：${record?.sku.label ?? instance.skuId} × ${instance.quantity}`,
    ),
    "",
    `用户预算估值：¥${price.value.budget}`,
    "报价缺项不计为免费；请在购买前核验规格与价格。",
  ].join("\n");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/markdown;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "霜境装机清单.md";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>
<template>
  <div class="portal">
    <header class="portal-header">
      <a class="portal-brand" href="#home" aria-label="霜境首页"
        ><img src="/favicon.svg" alt="" /><strong>霜境</strong
        ><span>装机与空间</span></a
      >
      <nav aria-label="主导航">
        <a href="#build">3D 装机</a>
        <a href="#home" :aria-current="page === 'home' ? 'page' : undefined"
          >探索</a
        ><a href="#parts" :aria-current="page === 'parts' ? 'page' : undefined"
          >配件库</a
        ><a
          href="#compare"
          :aria-current="page === 'compare' ? 'page' : undefined"
          >配件比较<span v-if="compared.length" class="count">{{
            compared.length
          }}</span></a
        ><a
          href="#modules"
          :aria-current="page === 'modules' ? 'page' : undefined"
          >模组中心</a
        >
      </nav>
      <a class="portal-button blue small" href="#studio"
        >进入 3D 工作台 <span aria-hidden="true">↗</span></a
      >
    </header>
    <main v-if="page === 'home'" class="portal-home">
      <section class="portal-hero">
        <div class="hero-copy">
          <span class="kicker">你的下一台电脑，从这里开始</span>
          <h1>先看见，<br />再组装<span>。</span></h1>
          <p>
            从一颗芯片，到整个房间。<br />用 3D
            预览你的装机与桌搭，让每个选择更清楚。
          </p>
          <div class="hero-features">
            <span>◇ 交互式 3D 预览</span><span>✓ 兼容性检查</span
            ><span>▤ 配件并排比较</span><span>↗ 本地保存与导出</span>
          </div>
          <div class="hero-actions">
            <button class="portal-button blue" @click="start()">
              开始搭建 <span aria-hidden="true">→</span></button
            ><a class="portal-button outline" href="#parts">浏览配件</a>
          </div>
          <small>无需注册 · 中文工作台 · 方案保存在本机</small>
        </div>
        <div class="hero-preview">
          <img
            src="/showcase/pc.webp"
            alt="霜境工作台实际渲染的白色主机，包含风扇、水冷和供电线材"
            fetchpriority="high"
          /><span class="preview-label">霜境原创参数化场景 · 实际截图</span>
          <div class="hero-floating">
            <span class="live-dot"></span>
            <div>
              <b>白色海景房装机</b><small>配件、尺寸与空间，一起规划</small>
            </div>
            <button aria-label="打开主机 3D 预览" @click="start()">↗</button>
          </div>
        </div>
      </section>
      <div class="portal-facts">
        <span
          ><b>{{ s.catalog.skus.length }}</b> 个本地型号</span
        ><span
          ><b>{{ categories.length }}</b> 类可选组件</span
        ><span
          ><b>{{ checked.length }}</b> 项装机规则</span
        ><span>独立中文体验，数据来源可查</span>
      </div>
      <section class="portal-section">
        <div class="section-heading">
          <div>
            <span class="kicker">从喜欢的氛围出发</span>
            <h2>选一个起点，自由调整。</h2>
          </div>
          <a href="#studio">继续我的方案 →</a>
        </div>
        <div class="preset-grid">
          <button class="preset-card" @click="quick('pc')">
            <img src="/showcase/pc.webp" alt="白色主机" loading="lazy" />
            <div>
              <span>装机探索</span>
              <h3>冰白性能主机</h3>
              <p>检查配件与安装空间</p>
              <b>开始搭建 ↗</b>
            </div>
          </button>
          <button class="preset-card" @click="quick('day')">
            <img src="/showcase/desk.webp" alt="双屏桌面" loading="lazy" />
            <div>
              <span>日间桌搭</span>
              <h3>双屏创作空间</h3>
              <p>搭配外设、桌椅与线材</p>
              <b>探索桌搭 ↗</b>
            </div>
          </button>
          <button class="preset-card" @click="quick('night')">
            <img src="/showcase/room.webp" alt="房间全景" loading="lazy" />
            <div>
              <span>完整房间</span>
              <h3>安静的夜间客厅</h3>
              <p>设置灯光、场景与家具</p>
              <b>进入空间 ↗</b>
            </div>
          </button>
        </div>
      </section>
      <section class="portal-section workflow">
        <div class="section-heading">
          <div>
            <span class="kicker">让选择更有依据</span>
            <h2>从挑配件，到完整方案。</h2>
          </div>
        </div>
        <div class="workflow-grid">
          <a href="#parts"
            ><span>01</span>
            <h3>挑选配件</h3>
            <p>按类别、型号和核验状态筛选。</p></a
          ><a href="#compare"
            ><span>02</span>
            <h3>比较细节</h3>
            <p>并排查看尺寸、规格和来源。</p></a
          ><button @click="showChecks = true">
            <span>03</span>
            <h3>检查方案</h3>
            <p>查看兼容性、缺失参数与建议。</p></button
          ><button @click="exportList">
            <span>04</span>
            <h3>带走清单</h3>
            <p>保存到本机，或导出中文清单。</p>
          </button>
        </div>
      </section>
    </main>
    <main v-else-if="page === 'parts'" class="portal-content">
      <div class="page-intro">
        <span class="kicker">找到适合你的每一件</span>
        <h1>配件库<span>。</span></h1>
        <p>核验规格，比较型号，直接应用到你的 3D 方案。</p>
      </div>
      <div class="catalog-layout">
        <aside class="part-filters">
          <h2>类别</h2>
          <button
            :class="{ chosen: !category }"
            @click="
              category = '';
              limit = 24;
            "
          >
            全部配件 <span>{{ s.catalog.skus.length }}</span></button
          ><button
            v-for="cat in categories"
            :key="cat"
            :class="{ chosen: category === cat }"
            @click="
              category = cat;
              limit = 24;
            "
          >
            {{ cat === "CPU" ? "处理器" : cat }}
            <span>{{
              allRows.filter((r) => r.product.category === cat).length
            }}</span>
          </button>
        </aside>
        <section class="part-results" aria-label="配件列表">
          <div class="part-toolbar">
            <label class="part-search"
              ><span aria-hidden="true">⌕</span
              ><input
                v-model="query"
                aria-label="搜索配件"
                placeholder="搜索品牌、型号或关键词"
                @input="limit = 24" /></label
            ><select v-model="sort" aria-label="配件排序">
              <option value="default">默认排序</option>
              <option value="name">按名称</option>
              <option value="verified">按核验状态</option>
            </select>
          </div>
          <div class="results-meta">
            <span>共 {{ rows.length }} 个型号</span
            ><label
              ><input
                type="checkbox"
                v-model="verified"
                @change="limit = 24"
              />仅显示有核验的型号</label
            >
          </div>
          <div class="part-grid">
            <article
              class="part-card"
              v-for="record in rows.slice(0, limit)"
              :key="record.sku.id"
            >
              <div class="part-visual">
                <PartIcon :category="record.product.category" /><span>{{
                  record.product.category === "CPU"
                    ? "处理器"
                    : record.product.category
                }}</span
                ><label class="compare-choice"
                  ><input
                    type="checkbox"
                    :checked="compared.includes(record.sku.id)"
                    :disabled="
                      compared.length >= 3 && !compared.includes(record.sku.id)
                    "
                    :aria-label="'比较 ' + record.sku.label"
                    @change="toggleCompare(record.sku.id)"
                  />比较</label
                >
              </div>
              <div class="part-card-body">
                <span class="record-status" :class="record.sku.status">{{
                  statusLabels[record.sku.status]
                }}</span>
                <h2>{{ record.sku.label }}</h2>
                <p>
                  {{ record.product.brand }} ·
                  {{ record.sku.dimensionsMm?.join(" × ") ?? "尺寸待核验"
                  }}<span v-if="record.sku.dimensionsMm"> mm</span>
                </p>
                <small
                  >{{ record.sku.officialColor ?? "颜色未核验" }} ·
                  参数化外观示意</small
                >
                <div class="part-card-bottom">
                  <b>{{
                    record.quotes[0]
                      ? "¥ " + record.quotes[0].amount.toLocaleString()
                      : "暂无报价"
                  }}</b
                  ><span>来源 {{ record.sources.length }}</span>
                </div>
                <label
                  v-if="
                    replacementTargets(s.preset, s.catalog, record.sku).length >
                    1
                  "
                  class="target-label"
                  >替换位置<select
                    :aria-label="record.sku.label + ' 替换位置'"
                    v-model="target[record.sku.id]"
                  >
                    <option value="">请选择位置</option>
                    <option
                      v-for="i in replacementTargets(
                        s.preset,
                        s.catalog,
                        record.sku,
                      )"
                      :key="i.id"
                      :value="i.id"
                    >
                      {{
                        i.id === "monitor"
                          ? "左侧显示器"
                          : i.id === "monitor-2"
                            ? "右侧显示器"
                            : i.id
                      }}
                    </option>
                  </select></label
                ><button
                  class="portal-button outline"
                  @click="apply(record.sku)"
                >
                  应用到方案 <span>＋</span>
                </button>
              </div>
            </article>
          </div>
          <div v-if="!rows.length" class="portal-empty">
            <h2>没有找到匹配的型号</h2>
            <p>换个关键词，或清除筛选再试试。</p>
            <button
              @click="
                query = '';
                category = '';
                verified = false;
              "
            >
              清除筛选
            </button>
          </div>
          <button
            v-if="rows.length > limit"
            class="load-more"
            @click="limit += 24"
          >
            再显示 24 个
          </button>
        </section>
        <aside class="build-overview">
          <h2>
            我的方案 <span>{{ s.preset.instances.length }}</span>
          </h2>
          <p>与 3D 工作台同步</p>
          <button class="summary-row" @click="showChecks = true">
            <span>兼容性检查</span
            ><b>{{
              issues.length ? issues.length + " 项待检查" : "通过"
            }}</b></button
          ><button class="summary-row" @click="showBudget = true">
            <span>用户预算估值</span
            ><b>¥ {{ price.budget.toLocaleString() }}</b>
          </button>
          <div class="current-parts">
            <button
              v-for="item in current"
              :key="item.instance.id"
              @click="preview(item.instance.id)"
            >
              <PartIcon :category="item.record?.product.category" /><span
                ><small>{{ item.record?.product.category }}</small
                ><b>{{
                  item.record?.sku.label ?? item.instance.skuId
                }}</b></span
              ><span>↗</span>
            </button>
          </div>
          <button class="portal-button blue" @click="start()">
            查看 3D 方案 →
          </button>
        </aside>
      </div>
    </main>
    <main v-else-if="page === 'compare'" class="portal-content">
      <div class="page-intro">
        <span class="kicker">把差异看清楚</span>
        <h1>配件比较<span>。</span></h1>
        <p>
          最多比较 3 个型号。3D 方体按已录入尺寸等比例显示，不代表产品精确外形。
        </p>
      </div>
      <div v-if="comparison.length" class="compare-layout">
        <div class="compare-header">
          <h2>已选 {{ comparison.length }} 个型号</h2>
          <a href="#parts">添加型号 ＋</a
          ><button @click="compared = []">清空比较</button>
        </div>
        <SizeCompare :skus="comparison" />
        <div class="comparison-scroll">
          <table class="comparison-table">
            <thead>
              <tr>
                <th scope="col">对比项目</th>
                <th scope="col" v-for="sku in comparison" :key="sku.id">
                  {{ sku.label
                  }}<button
                    :aria-label="'移除比较 ' + sku.label"
                    @click="toggleCompare(sku.id)"
                  >
                    移除
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">核验状态</th>
                <td v-for="sku in comparison" :key="sku.id">
                  {{ statusLabels[sku.status] }}
                </td>
              </tr>
              <tr>
                <th scope="row">尺寸 / mm</th>
                <td v-for="sku in comparison" :key="sku.id">
                  {{ sku.dimensionsMm?.join(" × ") ?? "未核验" }}
                </td>
              </tr>
              <tr v-for="row in specs" :key="row.label">
                <th scope="row">{{ row.label }}</th>
                <td v-for="(value, index) in row.values" :key="index">
                  {{ value }}
                </td>
              </tr>
              <tr>
                <th scope="row">规格依据</th>
                <td v-for="sku in comparison" :key="sku.id">
                  <span v-if="!sku.sourceIds.length">暂无来源</span
                  ><a
                    v-for="source in s.catalog.sources.filter((x) =>
                      sku.sourceIds.includes(x.id),
                    )"
                    :key="source.id"
                    :href="source.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    >{{ source.type === "official" ? "官网" : "来源" }} ·
                    {{ source.checkedAt }} ↗<small
                      >覆盖：{{ source.fields.join("、") }}</small
                    ></a
                  >
                </td>
              </tr>
              <tr>
                <th scope="row">采集报价</th>
                <td v-for="sku in comparison" :key="sku.id">
                  <span v-if="!s.catalog.quotes.some((q) => q.skuId === sku.id)"
                    >暂无报价</span
                  ><a
                    v-for="quote in s.catalog.quotes.filter(
                      (q) => q.skuId === sku.id,
                    )"
                    :key="quote.id"
                    :href="quote.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    >{{ quote.platform }} ¥{{ quote.amount
                    }}<small
                      >{{ quote.region }} ·
                      {{
                        new Date(quote.collectedAt).toLocaleDateString("zh-CN")
                      }}</small
                    ></a
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="portal-empty">
        <PartIcon category="机箱" />
        <h2>先挑选想比较的配件</h2>
        <p>在配件卡片勾选“比较”，再回来查看规格与尺寸。</p>
        <a class="portal-button blue" href="#parts">去配件库挑选 →</a>
      </div>
    </main>
    <main v-else class="portal-content">
      <div class="page-intro">
        <span class="kicker">按需组合，更轻更清楚</span>
        <h1>模组中心<span>。</span></h1>
        <p>内置功能与场景控制。开关直接作用于当前方案，保存后下次继续。</p>
      </div>
      <div class="module-grid">
        <article class="module-card">
          <div class="module-heading">
            <PartIcon category="风扇" /><span class="record-status verified"
              >内置场景组件</span
            >
          </div>
          <h2>主机灯光</h2>
          <p>开启冰蓝灯效，或关闭发光材质与灯效更新。</p>
          <div class="module-control">
            <span>{{ s.preset.light === "off" ? "已关闭" : "已启用" }}</span
            ><ModuleSwitch
              label="启用主机灯光模组"
              :model-value="s.preset.light !== 'off'"
              @update:model-value="s.preset.light = $event ? 'ice' : 'off'"
            />
          </div>
        </article>
        <article class="module-card">
          <div class="module-heading">
            <PartIcon category="灯带" /><span class="record-status verified"
              >内置场景组件</span
            >
          </div>
          <h2>夜间氛围</h2>
          <p>切换房间环境照明，与工作台的日夜设置同步。</p>
          <div class="module-control">
            <span>{{ s.preset.night ? "夜间" : "日间" }}</span
            ><ModuleSwitch label="启用夜间氛围模组" v-model="s.preset.night" />
          </div>
        </article>
        <article class="module-card">
          <div class="module-heading">
            <PartIcon category="机箱" /><span class="record-status verified"
              >内置装配组件</span
            >
          </div>
          <h2>透明侧板</h2>
          <p>控制侧板显示。装配、线材与风扇结构继续可用。</p>
          <div class="module-control">
            <span>{{ s.preset.sidePanel ? "侧板显示" : "侧板隐藏" }}</span
            ><ModuleSwitch
              label="显示主机侧板模组"
              v-model="s.preset.sidePanel"
            />
          </div>
        </article>
        <article class="module-card">
          <div class="module-heading">
            <PartIcon category="显示器" /><span class="record-status partial"
              >按需加载</span
            >
          </div>
          <h2>3D 尺寸比较</h2>
          <p>等比例比较型号尺寸；只在打开比较页时加载渲染器。</p>
          <a href="#compare">打开比较工具 →</a>
        </article>
        <article class="module-card">
          <div class="module-heading">
            <PartIcon category="内存" /><span class="record-status partial"
              >数据组件</span
            >
          </div>
          <h2>自定义组件目录</h2>
          <p>通过 JSON 导入配件、规格、来源与预算报价。导入前验证引用。</p>
          <button class="portal-button outline" @click="importing = true">
            导入组件目录 →
          </button>
        </article>
        <article class="module-card">
          <div class="module-heading">
            <PartIcon /><span class="record-status partial">开发工具</span>
          </div>
          <h2>REA 分析接口</h2>
          <p>
            固定版本 6.7.0，项目内隔离。用于构建产物静态分析与 MCP
            接入，不进入网页运行时。
          </p>
          <a
            href="https://github.com/linlangkang/rea"
            target="_blank"
            rel="noopener noreferrer"
            >查看工具仓库 ↗</a
          >
        </article>
      </div>
      <div class="module-save">
        <p>灯光与外观变更已应用到当前方案。</p>
        <button class="portal-button blue" @click="s.save">
          保存当前模组设置</button
        ><a href="#studio">预览效果 ↗</a>
      </div>
    </main>
    <footer class="portal-footer">
      <a href="#home" class="portal-brand"
        ><img src="/favicon.svg" alt="" /><strong>霜境</strong></a
      ><span>独立中文装机与空间工作台</span><a href="#parts">配件库</a
      ><a href="#modules">模组中心</a
      ><button @click="exportList">导出清单</button
      ><small>参数化模型 · 无实时价格与游戏帧率预测</small>
    </footer>
    <div v-if="compared.length && page === 'parts'" class="compare-tray">
      <span
        >已选 <b>{{ compared.length }}</b> 个型号</span
      ><button @click="compared = []">清空</button
      ><a class="portal-button blue small" href="#compare">开始比较 →</a>
    </div>
    <p v-if="s.notice && !['尚无本地保存', '已恢复本地方案'].includes(s.notice)" role="status" class="portal-notice">{{ s.notice }}</p>
    <ModalDialog
      v-if="showChecks || showBudget"
      class="portal-dialog"
      :label="showChecks ? '装机方案检查' : '方案预算'"
      @close="
        showChecks = false;
        showBudget = false;
      "
      ><header>
        <h2>{{ showChecks ? "装机方案检查" : "方案预算" }}</h2>
        <button
          @click="
            showChecks = false;
            showBudget = false;
          "
          aria-label="关闭方案面板"
        >
          关闭
        </button>
      </header>
      <template v-if="showChecks"
        ><details v-for="check in checked" :key="check.id">
          <summary>
            {{ check.name }} <b>{{ check.status }}</b>
          </summary>
          <p>{{ check.reason }}</p>
          <p>建议：{{ check.suggestion }}</p>
        </details>
        <p>
          主机功耗：{{
            watts.max === null ? "参数不足，暂不能估算" : watts.max + " W"
          }}
        </p></template
      ><template v-else
        ><p>
          采集报价：{{
            price.covered ? "¥ " + price.total.toLocaleString() : "暂无报价"
          }}
        </p>
        <p>报价覆盖：{{ price.covered }} / {{ price.units }} 件</p>
        <label
          v-for="item in current"
          :key="item.instance.id"
          class="budget-entry"
          ><span
            >{{ item.record?.sku.label }} × {{ item.instance.quantity }}</span
          ><input
            type="number"
            min="0"
            :aria-label="item.record?.sku.label + ' 预算'"
            :value="s.preset.budgets[item.instance.id] ?? ''"
            placeholder="单件预算 / 元"
            @change="
              ($event.target as HTMLInputElement).value === ''
                ? delete s.preset.budgets[item.instance.id]
                : (s.preset.budgets[item.instance.id] = Math.max(
                    0,
                    Number(($event.target as HTMLInputElement).value) || 0,
                  ))
            "
        /></label>
        <p>用户预算估值：¥ {{ price.budget.toLocaleString() }}</p></template
      ><button class="portal-button blue" @click="s.save">
        保存方案
      </button></ModalDialog
    >
    <ImportDialog v-if="importing" @close="importing = false" />
  </div>
</template>
<style src="./portal.css"></style>
