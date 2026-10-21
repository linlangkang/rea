import type { Catalog } from "./schema";

/** Upgrade only the untouched legacy demo; imported/custom furniture remains authoritative. */
export function updateLegacySofa(catalog: Catalog, current: Catalog) {
  const product = catalog.products.find((p) => p.id === "sofa"),
    sku = catalog.skus.find((s) => s.id === "sofa");
  const asset = catalog.assets.find((a) => a.id === sku?.assetId);
  if (
    !product ||
    !sku ||
    product.brand !== "测试规格" ||
    product.category !== "沙发" ||
    product.model !== "雾蓝双人沙发" ||
    sku.label !== "雾蓝双人沙发" ||
    sku.productId !== "sofa" ||
    sku.status !== "demo" ||
    sku.sourceIds.length ||
    asset?.url ||
    asset?.generator !== "沙发" ||
    JSON.stringify(sku.dimensionsMm) !== "[2200,850,900]"
  )
    return false;
  const next = current.skus.find((s) => s.id === "sofa"),
    nextProduct = current.products.find((p) => p.id === "sofa");
  if (!next || !nextProduct) return false;
  sku.label = next.label;
  sku.dimensionsMm = next.dimensionsMm ? [...next.dimensionsMm] : null;
  product.model = nextProduct.model;
  return true;
}
