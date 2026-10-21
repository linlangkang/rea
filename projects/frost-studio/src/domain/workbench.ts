import type { Catalog, BuildPreset, SKU } from "./schema";
export const statusLabels = {
  verified: "已核验",
  partial: "部分核验",
  demo: "演示规格",
  unknown: "待核验",
};
export function productRows(
  catalog: Catalog,
  query = "",
  category = "",
  verifiedOnly = false,
) {
  const q = query.trim().toLocaleLowerCase();
  return catalog.skus.flatMap((sku) => {
    const product = catalog.products.find((p) => p.id === sku.productId);
    if (
      !product ||
      (category && product.category !== category) ||
      (verifiedOnly && !["verified", "partial"].includes(sku.status))
    )
      return [];
    if (
      q &&
      !`${product.brand} ${product.model} ${sku.label} ${sku.id}`
        .toLocaleLowerCase()
        .includes(q)
    )
      return [];
    const sources = catalog.sources.filter((source) =>
      sku.sourceIds.includes(source.id),
    );
    const quotes = catalog.quotes
      .filter((quote) => quote.skuId === sku.id)
      .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
    return [{ sku, product, sources, quotes }];
  });
}
export function replacementTargets(
  preset: BuildPreset,
  catalog: Catalog,
  sku: SKU,
) {
  const category = catalog.products.find(
    (p) => p.id === sku.productId,
  )?.category;
  if (!category) return [];
  return preset.instances.filter(
    (i) =>
      catalog.products.find(
        (p) => p.id === catalog.skus.find((s) => s.id === i.skuId)?.productId,
      )?.category === category,
  );
}
export function replacePart(
  preset: BuildPreset,
  catalog: Catalog,
  skuId: string,
  instanceId: string,
) {
  const sku = catalog.skus.find((s) => s.id === skuId);
  if (!sku) throw Error("型号不存在");
  const target = replacementTargets(preset, catalog, sku).find(
    (i) => i.id === instanceId,
  );
  if (!target) throw Error("请选择同类别的替换目标");
  target.skuId = skuId;
  return target;
}
export function comparisonRows(skus: SKU[]) {
  const keys = [...new Set(skus.flatMap((sku) => Object.keys(sku.specs)))];
  const labels: Record<string, string> = {
    socket: "插槽",
    ddr: "内存代际",
    capacity: "容量",
    sticks: "内存条数",
    form: "板型",
    gpuLength: "显卡长度 / mm",
    gpuThickness: "显卡厚度 / mm",
    gpuClearance: "显卡限长 / mm",
    watts: "额定功率 / W",
    tdp: "设计功耗 / W",
    maxPower: "最大功耗 / W",
    resolution: "分辨率",
    hz: "刷新率 / Hz",
    productCode: "产品型号",
    screenInches: "屏幕尺寸 / 英寸",
    weightKg: "重量 / kg",
    radiator: "冷排尺寸 / mm",
    recommendedPsu: "建议电源 / W",
    connector: "供电接口",
    storageGB: "存储容量 / GB",
    cpuModel: "处理器型号",
    gpuModel: "图形处理器型号",
    bios: "最低 BIOS",
    biosCpu: "支持的处理器",
    slots: "内存插槽",
    maxMemory: "最大内存 / GB",
    forms: "兼容板型",
    thicknessClearance: "显卡厚度空间 / mm",
    connectors: "供电接口",
    radiators: "冷排位 / mm",
    radiatorClearance: "冷排余量核验",
    ssdInterface: "固态接口",
    ssdInterfaces: "支持固态接口",
    ssdSize: "固态尺寸",
    ssdSizes: "支持固态尺寸",
    m2Slots: "M.2 插槽",
    dp: "DP 接口数量",
    hdmi: "HDMI 接口数量",
    video: "视频输出核验",
    pd: "供电 / W",
    requiredPd: "所需供电 / W",
    thicknessRangeMm: "厚度范围 / mm",
  };
  return keys.map((key) => ({
    label: labels[key] ?? key,
    values: skus.map((sku) => {
      const value = sku.specs[key as keyof SKU["specs"]];
      return value === undefined
        ? "未核验"
        : typeof value === "boolean"
          ? value
            ? "是"
            : "否"
          : Array.isArray(value)
            ? value.join(" / ")
            : String(value);
    }),
  }));
}
