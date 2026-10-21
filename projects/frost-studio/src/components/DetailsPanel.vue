<script setup lang="ts">
import { computed, ref } from "vue";
import { useStudio } from "../store";
import {
  inputsFor,
  checkCompatibility,
  totals,
  power,
} from "../domain/compatibility";
const s = useStudio();
const tab = ref("details");
const checks = computed(() =>
  checkCompatibility(inputsFor(s.preset, s.catalog), s.catalog),
);
const price = computed(() => totals(s.preset, s.catalog));
const watts = computed(() => power(s.preset, s.catalog));
const productIndex = computed(
  () => new Map(s.catalog.products.map((p) => [p.id, p])),
);
const sourceIndex = computed(
  () => new Map(s.catalog.sources.map((source) => [source.id, source])),
);
const product = computed(() => productIndex.value.get(s.sku?.productId ?? ""));
const alternatives = computed(() =>
  s.catalog.skus.filter(
    (x) =>
      productIndex.value.get(x.productId)?.category === product.value?.category,
  ),
);
const statuses: Record<string, string> = {
  partial: "部分核验",
  verified: "已核验",
  demo: "演示规格",
  unknown: "待核验",
};
const swatches = [
  { name: "云雾白", color: "#e3eaf3" },
  { name: "冰川蓝白", color: "#b1d8f2" },
  { name: "银白", color: "#aebdc9" },
  { name: "黑蓝", color: "#233e5e" },
  { name: "深黑", color: "#191f29" },
  { name: "冰蓝", color: "#4087c0" },
];
const specLabels: Record<string, string> = {
  productCode: "官方商品编号",
  cpuModel: "处理器",
  gpuModel: "显卡",
  storageGB: "SSD 容量 GB",
  screenInches: "屏幕英寸",
  thicknessRangeMm: "厚度范围 mm",
  weightKg: "重量约 kg",
  socket: "插槽",
  ddr: "内存代际",
  capacity: "容量（内存 GB / SSD GB）",
  sticks: "内存条数",
  slots: "内存槽数",
  maxMemory: "最大内存 GB",
  gpuLength: "显卡长度 mm",
  gpuThickness: "显卡厚度 mm",
  watts: "额定 / 标称功率 W",
  recommendedPsu: "显卡建议电源 W",
  tdp: "CPU TDP W（非峰值）",
  resolution: "分辨率",
  hz: "刷新率 Hz",
  dp: "DP 接口数",
  hdmi: "HDMI 接口数",
  form: "板型",
  connector: "供电接口",
  radiator: "冷排规格 mm",
};
</script>
<template>
  <aside class="details panel">
    <div class="detail-tabs">
      <button :class="{ active: tab === 'details' }" @click="tab = 'details'">
        组件详情</button
      ><button :class="{ active: tab === 'build' }" @click="tab = 'build'">
        方案检查
        <span>{{ checks.filter((x) => x.status !== "兼容").length }}</span>
      </button>
    </div>
    <template v-if="tab === 'details'"
      ><div v-if="s.instance && s.sku" class="detail-body">
        <div class="eyebrow">{{ product?.category }} / {{ s.instance.id }}</div>
        <h2>{{ s.sku.label }}</h2>
        <p v-if="s.selected?.startsWith('ram-')" class="micro">
          当前选中第
          {{ s.selected.slice(-1) }} 条内存；型号、颜色和报价按所选套装管理。
        </p>
        <span class="tag">{{ statuses[s.sku.status] }}</span
        ><span class="tag">参数化示意</span>
        <p class="micro">
          示意比例与结构，不是官方精确外观。相同系列可复用模型。
        </p>
        <label class="field-label"
          >型号 / SKU<select v-model="s.instance.skuId" aria-label="切换型号">
            <option v-for="sku in alternatives" :value="sku.id">
              {{ sku.label }}
            </option>
          </select></label
        >
        <div class="section-label">外观定制 <span>自定义喷涂</span></div>
        <div class="swatches">
          <button
            v-for="sw in swatches"
            :key="sw.color"
            :style="{ background: sw.color }"
            :class="{ chosen: s.instance.customColor === sw.color }"
            :aria-label="sw.name"
            :title="sw.name"
            @click="s.instance.customColor = sw.color"
          ></button
          ><input
            aria-label="自定义颜色"
            type="color"
            :value="s.instance.customColor ?? '#e3eaf3'"
            @input="
              s.instance.customColor = ($event.target as HTMLInputElement).value
            "
          />
        </div>
        <button class="text-button" @click="s.instance.customColor = null">
          恢复示意默认色
        </button>
        <p class="micro">
          官方在售颜色：{{ s.sku.officialColor ?? "未知 / 未选定 SKU"
          }}<br />自定义颜色单独保存，不代表官方在售版本。
        </p>
        <dl class="specs">
          <template v-for="(value, key) in s.sku.specs" :key="key"
            ><dt>{{ specLabels[key] ?? key }}</dt>
            <dd>
              {{ Array.isArray(value) ? value.join(" / ") : value }}
            </dd></template
          >
          <dt>产品外形尺寸</dt>
          <dd>
            {{
              s.sku.dimensionsMm
                ? s.sku.dimensionsMm.join(" × ") + " mm"
                : "未知，模型用示意尺寸"
            }}
          </dd>
          <dt>发布日期</dt>
          <dd>{{ s.sku.releaseDate ?? "待核验" }}</dd>
          <dt>营销年份</dt>
          <dd>{{ s.sku.marketingYear ?? "未知" }}</dd>
        </dl>
        <label class="field-label"
          >该实例预算估值（元，不是报价）<input
            type="number"
            min="0"
            step="100"
            :value="s.preset.budgets[s.instance.id] ?? ''"
            placeholder="未填写"
            @change="
              ($event.target as HTMLInputElement).value.trim() === ''
                ? delete s.preset.budgets[s.instance.id]
                : (s.preset.budgets[s.instance.id] = Math.max(
                    0,
                    Number(($event.target as HTMLInputElement).value),
                  ))
            "
        /></label>
        <div class="sources">
          <h3>核验来源</h3>
          <p v-if="!s.sku.sourceIds.length" class="muted">
            无官方规格来源，当前为测试规格。
          </p>
          <template v-for="id in s.sku.sourceIds"
            ><a
              v-if="sourceIndex.has(id)"
              :href="sourceIndex.get(id)!.url"
              target="_blank"
              rel="noopener noreferrer"
              >{{ id }} ↗</a
            >
            <p class="micro">
              {{ sourceIndex.get(id)?.checkedAt }} · 仅支持来源记录中列出的字段
            </p></template
          >
        </div>
      </div>
      <div v-else class="empty-detail">
        <svg
          class="empty-illustration"
          viewBox="0 0 40 40"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          aria-hidden="true"
        >
          <rect x="6" y="6" width="28" height="28" rx="8" />
          <path d="M20 13v14m-7-7h14" />
        </svg>
        <h2>选择一个组件</h2>
        <p>点击场景物件或左侧列表，调整型号与颜色。</p>
      </div></template
    >
    <div v-else class="detail-body">
      <h2>当前方案检查</h2>
      <p class="status-summary">
        {{
          checks.some((x) => x.status === "不兼容")
            ? "存在不兼容项"
            : checks.some((x) => x.status === "未知")
              ? "信息未齐，不能确认完全兼容"
              : "部分条件仍需实物核验"
        }}
      </p>
      <details v-for="check in checks" :key="check.id" class="check">
        <summary>
          <span>{{ check.name }}</span
          ><b
            :class="
              check.status === '兼容'
                ? 'ok'
                : check.status === '不兼容'
                  ? 'bad'
                  : 'warn'
            "
            >{{ check.status }}</b
          >
        </summary>
        <p>{{ check.reason }}</p>
        <p>建议：{{ check.suggestion }}</p>
        <p class="micro">依据：{{ check.fields.join("、") }}</p>
        <a
          v-for="(url, index) in check.sources"
          :href="url"
          target="_blank"
          rel="noopener noreferrer"
          >来源 {{ index + 1 }} ↗
        </a>
      </details>
      <h3>主机电源</h3>
      <p>
        {{
          watts.max === null
            ? "峰值信息不足，不能给出可靠整机功耗"
            : `最大 ${watts.max} W，按 25% 余量建议 ${watts.recommended} W`
        }}
      </p>
      <p class="micro">
        CPU TDP
        不等于最大功耗。估算以当前配件的已知参数为依据；显示器、笔记本、电视与冰箱不计入主机电源。
      </p>
      <h3>报价与预算</h3>
      <dl class="specs">
        <template v-for="(value, key) in price.groups"
          ><dt>{{ key }}真实报价小计</dt>
          <dd>
            {{ price.groupCoverage[key] ? "¥ " + value : "暂无报价" }}
          </dd></template
        >
        <dt>真实报价总计</dt>
        <dd>{{ price.covered ? "¥ " + price.total : "暂无报价" }}</dd>
        <dt>报价覆盖率（实例数）</dt>
        <dd>{{ price.covered }} / {{ price.units }}</dd>
        <dt>用户预算估值</dt>
        <dd>¥ {{ price.budget.toLocaleString() }}</dd>
      </dl>
      <p class="micro">
        双屏计两台，内存按所选套装计价。无可靠来源时不虚构市场价格。
      </p>
    </div>
    <div class="save-block">
      <small>{{
        s.preset.savedAt
          ? "保存于 " + new Date(s.preset.savedAt).toLocaleString()
          : "仅保存到本机浏览器 · 无需登录"
      }}</small>
    </div>
  </aside>
</template>
