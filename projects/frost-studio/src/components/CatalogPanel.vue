<script setup lang="ts">
import { computed, ref } from "vue";
import { useStudio } from "../store";
import { categories } from "../domain/schema";
import SearchField from "./SearchField.vue";
import ComponentIcon from "./ComponentIcon.vue";
const s = useStudio();
const query = ref("");
const category = ref("");
const brand = ref("");
const year = ref("");
const color = ref("");
const currentYear = new Date().getFullYear();
const normalizedQuery = computed(() => query.value.trim().toLowerCase());
const skuIndex = computed(
  () => new Map(s.catalog.skus.map((sku) => [sku.id, sku])),
);
const productIndex = computed(
  () => new Map(s.catalog.products.map((product) => [product.id, product])),
);
const activeFilters = computed(
  () =>
    [category.value, brand.value, year.value, color.value].filter(Boolean)
      .length,
);
function clearFilters() {
  category.value = "";
  brand.value = "";
  year.value = "";
  color.value = "";
  query.value = "";
}
const brands = computed(() => [
  ...new Set(s.catalog.products.map((p) => p.brand)),
]);
const colors = computed(() => [
  ...new Set(s.catalog.skus.map((x) => x.officialColor).filter(Boolean)),
]);
const entries = computed(() =>
  s.preset.instances.filter((i) => {
    const sku = skuIndex.value.get(i.skuId);
    const p = productIndex.value.get(sku?.productId ?? "");
    if (!sku || !p) return false;
    return (
      (!normalizedQuery.value ||
        (sku.label + p.brand + i.id)
          .toLowerCase()
          .includes(normalizedQuery.value)) &&
      (!category.value || p.category === category.value) &&
      (!brand.value || brand.value === p.brand) &&
      (!color.value || sku.officialColor === color.value) &&
      (!year.value ||
        (year.value === "unknown"
          ? !sku.releaseDate
          : sku.releaseDate?.startsWith(year.value)))
    );
  }),
);
const productFor = (skuId: string) =>
  productIndex.value.get(skuIndex.value.get(skuId)?.productId ?? "");
const skuFor = (id: string) => skuIndex.value.get(id)!;
function memoryLabel(skuId: string) {
  const { capacity, sticks } = skuFor(skuId).specs;
  return capacity && sticks
    ? `${Number((capacity / sticks).toFixed(2))}GB`
    : "容量待核验";
}
const statuses: Record<string, string> = {
  demo: "演示规格",
  unknown: "待核验",
  verified: "已核验",
  partial: "部分核验",
};
</script>
<template>
  <aside class="catalog panel">
    <div class="panel-title">
      <h2>组件</h2>
      <span class="count">{{ s.preset.instances.length }}</span>
    </div>
    <SearchField
      v-model="query"
      label="搜索产品"
      placeholder="搜索型号、品牌或实例"
    />
    <details class="catalog-filters">
      <summary>
        筛选组件 <span v-if="activeFilters">· {{ activeFilters }} 项</span>
      </summary>
      <div class="filter-grid">
        <select v-model="category" aria-label="类别">
          <option value="">全部类别</option>
          <option v-for="c in categories" :key="c">{{ c }}</option></select
        ><select v-model="brand" aria-label="品牌">
          <option value="">全部品牌</option>
          <option v-for="b in brands" :key="b">{{ b }}</option></select
        ><select v-model="year" aria-label="发布日期">
          <option value="">发布日期</option>
          <option
            v-for="y in [currentYear, currentYear - 1, currentYear - 2]"
            :value="String(y)"
          >
            {{ y }} 年
          </option>
          <option value="unknown">待核验日期</option></select
        ><select v-model="color" aria-label="官方颜色">
          <option value="">官方颜色</option>
          <option v-for="c in colors" :value="c!">{{ c }}</option>
        </select>
      </div>
      <p class="micro">
        近三年口径：{{ currentYear - 2 }}—{{
          currentYear
        }}。日期未知单列；演示目录并非全网收录。
      </p>
      <button
        v-if="activeFilters || query"
        class="text-button"
        @click="clearFilters"
      >
        清空筛选
      </button>
    </details>
    <div class="catalog-list">
      <template v-for="i in entries" :key="i.id"
        ><button
          class="item"
          :class="{ selected: s.selected === i.id }"
          :data-instance="i.id"
          :aria-pressed="s.selected === i.id"
          :title="skuFor(i.skuId).label"
          @click="s.selected = i.id"
        >
          <span class="item-icon"
            ><ComponentIcon :category="productFor(i.skuId)?.category" /></span
          ><span class="item-copy"
            ><small
              >{{ productFor(i.skuId)?.category
              }}<template v-if="i.id === 'monitor-2'"> · 右屏</template
              ><template v-if="i.id === 'monitor'"> · 左屏</template> ·
              {{ statuses[skuFor(i.skuId).status] }}</small
            ><strong>{{ skuFor(i.skuId).label }}</strong></span
          ><span class="item-arrow">›</span>
        </button>
        <div v-if="i.id === 'ram'" class="ram-subitems">
          <button
            v-for="n in Math.min(skuFor(i.skuId).specs.sticks ?? 0, 2)"
            :key="n"
            :data-instance="'ram-' + n"
            :class="{ selected: s.selected === 'ram-' + n }"
            @click="s.selected = 'ram-' + n"
          >
            内存 {{ n }} · {{ memoryLabel(i.skuId) }}
          </button>
        </div></template
      >
      <p v-if="!entries.length" class="muted empty">没有符合筛选的组件。</p>
    </div>
    <div class="catalog-bottom">
      {{ entries.length }} / {{ s.preset.instances.length }} 个组件
      <span class="micro">外观均为参数化示意</span>
    </div>
  </aside>
</template>
