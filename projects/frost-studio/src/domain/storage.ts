import {
  catalogSchema,
  presetSchema,
  type Catalog,
  type BuildPreset,
} from "./schema";
export const STORAGE_KEY = "frost-studio-v1";
export function validateState(preset: BuildPreset, catalog: Catalog) {
  const ids = new Set<string>();
  for (const i of preset.instances) {
    if (ids.has(i.id)) throw Error("实例 ID 重复");
    ids.add(i.id);
    if (!catalog.skus.some((s) => s.id === i.skuId))
      throw Error(`目录中缺少 ${i.skuId}，未覆盖原方案`);
  }
  return { preset, catalog };
}
export function decode(raw: string) {
  const obj = JSON.parse(raw);
  return validateState(
    presetSchema.parse(obj.preset),
    catalogSchema.parse(obj.catalog),
  );
}
export function readSaved(storage: Pick<Storage, "getItem">) {
  const raw = storage.getItem(STORAGE_KEY);
  return raw ? decode(raw) : null;
}
export function saveState(
  storage: Pick<Storage, "setItem">,
  preset: BuildPreset,
  catalog: Catalog,
) {
  validateState(preset, catalog);
  storage.setItem(STORAGE_KEY, JSON.stringify({ preset, catalog }));
}
