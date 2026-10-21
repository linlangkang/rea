<script setup lang="ts">
import { ref } from "vue";
import ModalDialog from "./ModalDialog.vue";
import { useStudio } from "../store";
import { parseCatalog, mergeCatalog, type Catalog } from "../domain/schema";
const emit = defineEmits<{ close: [] }>();
const s = useStudio();
const preview = ref<Catalog | null>(null);
const error = ref("");
const strategy = ref("merge");
async function read(event: Event) {
  error.value = "";
  preview.value = null;
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw Error("文件超过 2 MB 限制");
    preview.value = parseCatalog(await file.text());
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}
function apply() {
  if (!preview.value) return;
  try {
    s.importCatalog(
      strategy.value === "merge"
        ? mergeCatalog(s.catalog, preview.value)
        : preview.value,
    );
    emit("close");
  } catch (e) {
    error.value = String(e);
  }
}
</script>
<template>
  <ModalDialog
    label="导入产品目录"
    return-focus=".tools-menu > summary"
    class="modal"
    @close="emit('close')"
  >
    <div class="panel-title">
      <h2 id="import-title">导入产品目录</h2>
      <button aria-label="关闭导入" @click="emit('close')">×</button>
    </div>
    <p>
      仅接受不超过 2 MB 的版本 1 JSON。验证字段、单位、枚举、重复 ID、引用关系和
      URL 协议。
    </p>
    <input
      aria-label="选择 JSON 文件"
      type="file"
      accept="application/json,.json"
      @change="read"
    />
    <pre v-if="error" class="error-text">{{ error }}</pre>
    <div v-if="preview" class="import-preview">
      <h3>已验证，尚未应用</h3>
      <p>
        {{ preview.products.length }} 个产品 · {{ preview.skus.length }} 个 SKU
        · {{ preview.sources.length }} 条来源
      </p>
      <select v-model="strategy" aria-label="导入策略">
        <option value="merge">合并：同 ID 覆盖，其他记录保留</option>
        <option value="replace">替换：必须保留当前使用的 SKU</option>
      </select>
      <p class="micro">
        覆盖现有 SKU 会改变尺寸和兼容结果。远程 GLB 链接仅在选用该 SKU 后加载。
      </p>
      <ul>
        <li v-for="sku in preview.skus.slice(0, 6)" :key="sku.id">
          {{ sku.label }}
        </li>
      </ul>
    </div>
    <div class="button-row">
      <button @click="emit('close')">取消</button
      ><button class="primary" :disabled="!preview" @click="apply">
        确认应用目录
      </button>
    </div>
  </ModalDialog>
</template>
