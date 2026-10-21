import { describe, it, expect } from "vitest";
import { catalog, defaultPreset } from "../../src/data/catalog";
import {
  productRows,
  replacePart,
  replacementTargets,
  comparisonRows,
} from "../../src/domain/workbench";
describe("中文选配与比较", () => {
  it("按类别和核验状态筛选，不把演示型号当成已核验", () => {
    const rows = productRows(catalog, "MSI", "显卡", true);
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.every(
        (r) =>
          r.product.category === "显卡" &&
          ["verified", "partial"].includes(r.sku.status),
      ),
    ).toBe(true);
    expect(productRows(catalog, "不存在的型号")).toEqual([]);
  });
  it("双屏只能替换指定目标，不能静默覆盖另一台", () => {
    const preset = defaultPreset(),
      sku = productRows(catalog, "", "显示器")[0].sku;
    expect(replacementTargets(preset, catalog, sku).length).toBe(2);
    const left = preset.instances.find((i) => i.id === "monitor")!;
    const before = left.skuId;
    expect(() => replacePart(preset, catalog, sku.id, "")).toThrow();
    const right = replacePart(preset, catalog, sku.id, "monitor-2");
    expect(right.skuId).toBe(sku.id);
    expect(left.skuId).toBe(before);
    expect(() => replacePart(preset, catalog, sku.id, "cpu")).toThrow();
  });
  it("比较对缺少的规格保留未知值，不推断为零", () => {
    const one = structuredClone(catalog.skus[0]),
      two = structuredClone(one);
    one.specs = { socket: "AM5" };
    two.specs = {};
    expect(comparisonRows([one, two])).toEqual([
      { label: "插槽", values: ["AM5", "未核验"] },
    ]);
  });
});
