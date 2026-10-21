<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useStudio } from "../store";
import { categories } from "../domain/schema";
import { research } from "../data/research";
import ModalDialog from "./ModalDialog.vue";
import SearchField from "./SearchField.vue";
const s = useStudio();
const emit = defineEmits<{ close: [] }>();
const libraryNotice = ref("");
const q = ref(""),
  category = ref(""),
  year = ref(""),
  target = ref("");
const normalizedQuery = computed(() => q.value.trim().toLowerCase());
const pageSize = 24;
const limit = ref(pageSize),
  familyLimit = ref(pageSize);
const productIndex = computed(
  () => new Map(s.catalog.products.map((p) => [p.id, p])),
);
const sourceIndex = computed(
  () => new Map(s.catalog.sources.map((source) => [source.id, source])),
);
const records = computed(() =>
  s.catalog.skus.flatMap((sku) => {
    const product = productIndex.value.get(sku.productId);
    return product
      ? [
          {
            sku,
            product,
            search: (
              product.brand +
              " " +
              sku.label +
              " " +
              sku.id
            ).toLowerCase(),
            year: String(
              sku.marketingYear ?? sku.releaseDate?.slice(0, 4) ?? "unknown",
            ),
            sources: sku.sourceIds.flatMap((id) => {
              const source = sourceIndex.value.get(id);
              return source ? [source] : [];
            }),
          },
        ]
      : [];
  }),
);
const results = computed(() =>
  records.value.filter(
    (record) =>
      (!normalizedQuery.value ||
        record.search.includes(normalizedQuery.value)) &&
      (!category.value || record.product.category === category.value) &&
      (!year.value || record.year === year.value),
  ),
);
const backed = computed(
  () => records.value.filter((record) => record.sources.length).length,
);
const families = computed(() =>
  research.filter(
    (r) =>
      (!normalizedQuery.value ||
        (r.brand + " " + r.model)
          .toLowerCase()
          .includes(normalizedQuery.value)) &&
      (!category.value || category.value === r.category) &&
      (!year.value || year.value === String(r.year)),
  ),
);
watch([normalizedQuery, category, year], () => {
  limit.value = pageSize;
  familyLimit.value = pageSize;
});
const instancesByCategory = computed(() => {
  const skuIndex = new Map(s.catalog.skus.map((sku) => [sku.id, sku]));
  const groups = new Map<string, typeof s.preset.instances>();
  for (const instance of s.preset.instances) {
    const product = productIndex.value.get(
      skuIndex.get(instance.skuId)?.productId ?? "",
    );
    if (product) {
      const group = groups.get(product.category) ?? [];
      group.push(instance);
      groups.set(product.category, group);
    }
  }
  return groups;
});
function clearFilters() {
  q.value = "";
  category.value = "";
  year.value = "";
}
function apply(id: string) {
  const record = records.value.find((record) => record.sku.id === id);
  if (!record) return;
  const matches = instancesByCategory.value.get(record.product.category) ?? [];
  const instance =
    matches.find((i) => i.id === target.value) ??
    (matches.length === 1 ? matches[0] : undefined);
  if (!instance) {
    s.notice = libraryNotice.value = "双屏请先选择左屏或右屏作为替换目标";
    return;
  }
  instance.skuId = id;
  s.selected = instance.id;
  s.notice = libraryNotice.value =
    "已替换 " + instance.id + "：" + record.sku.label + "，请查看兼容性检查";
}
</script>

<template>
  <ModalDialog class="library" label="近三年产品库" @close="emit('close')">
    <header class="library-header">
      <div class="button-row">
        <h2>产品库</h2>
        <button @click="emit('close')">关闭产品库</button>
      </div>
      <p class="micro">
        {{ s.catalog.skus.length }} 个配置 / 颜色记录 · {{ backed }} 条有来源 ·
        外观均为参数化示意
      </p>
      <div class="library-filters">
        <SearchField
          v-model="q"
          label="产品库搜索"
          placeholder="搜索品牌、型号或 SKU"
        />
        <select aria-label="产品库类别" v-model="category">
          <option value="">全部类别</option>
          <option v-for="c in categories" :key="c">{{ c }}</option>
        </select>
        <select aria-label="产品库年份" v-model="year">
          <option value="">全部年份</option>
          <option>2024</option>
          <option>2025</option>
          <option>2026</option>
          <option value="unknown">日期未知</option>
        </select>
        <select aria-label="替换目标" v-model="target">
          <option value="">单实例自动匹配</option>
          <option value="monitor">左屏</option>
          <option value="monitor-2">右屏</option>
        </select>
      </div>
      <button
        v-if="q || category || year"
        class="text-button"
        @click="clearFilters"
      >
        清空产品库筛选
      </button>
    </header>
    <details class="library-notes">
      <summary>数据范围与使用说明</summary>
      <p>
        收集 2024—2026
        年部分产品，未穷尽全网。年份含官方宣传年份，不等于精确上市日。地区货号、缺失参数和实时价格仍待补齐。选择型号后请检查兼容性；双屏替换需指定左屏或右屏。
      </p>
    </details>
    <p v-if="libraryNotice" class="library-notice" aria-live="polite">
      {{ libraryNotice }}
    </p>
    <h3>
      可配置型号 <span class="count">{{ results.length }}</span>
    </h3>
    <div class="library-grid">
      <article v-for="record in results.slice(0, limit)" :key="record.sku.id">
        <small
          >{{ record.product.brand }} / {{ record.product.category }}</small
        >
        <h3>{{ record.sku.label }}</h3>
        <p>
          {{
            record.sku.status === "demo"
              ? "演示规格"
              : record.sku.status === "verified"
                ? "已核验"
                : record.sku.status === "unknown"
                  ? "待核验"
                  : "部分核验"
          }}
          ·
          {{
            record.sku.releaseDate ??
            (record.sku.marketingYear
              ? record.sku.marketingYear + " 宣传年份"
              : "日期未知")
          }}
        </p>
        <p>
          {{
            record.sku.dimensionsMm
              ? record.sku.dimensionsMm.join(" × ") + " mm"
              : "尺寸待核验，模型不作尺寸依据"
          }}
        </p>
        <a
          v-for="source in record.sources"
          :key="source.id"
          :href="source.url"
          target="_blank"
          rel="noopener noreferrer"
          >查看核验来源 ↗
        </a>
        <button @click="apply(record.sku.id)">应用到场景</button>
      </article>
    </div>
    <p v-if="!results.length" class="empty">没有匹配记录。</p>
    <div v-else class="library-pagination">
      <span
        >已显示 {{ Math.min(limit, results.length) }} /
        {{ results.length }} 个型号</span
      ><button v-if="limit < results.length" @click="limit += pageSize">
        加载更多型号
      </button>
    </div>
    <h3>
      系列资料索引 <span class="count">{{ families.length }}</span>
    </h3>
    <p class="micro">
      系列资料用于查阅；补齐地区货号和具体配置后才能用于装机。
    </p>
    <div class="library-grid">
      <article v-for="r in families.slice(0, familyLimit)" :key="r.model">
        <small>{{ r.year }} · {{ r.brand }} / {{ r.category }}</small>
        <h3>{{ r.model }}</h3>
        <p>{{ r.status }}</p>
        <a :href="r.url" target="_blank" rel="noopener noreferrer"
          >官方发布来源 ↗</a
        >
        <p>核验：{{ r.checkedAt }}</p>
      </article>
    </div>
    <div v-if="familyLimit < families.length" class="library-pagination">
      <span>已显示 {{ familyLimit }} / {{ families.length }} 条资料</span
      ><button @click="familyLimit += pageSize">加载更多资料</button>
    </div>
  </ModalDialog>
</template>
