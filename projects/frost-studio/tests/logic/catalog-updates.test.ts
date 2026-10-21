import { describe, it, expect, vi, afterEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { catalog, defaultPreset } from "../../src/data/catalog";
import { updateLegacySofa } from "../../src/domain/catalog-updates";
import { useStudio } from "../../src/store";

function legacy() {
  const next = structuredClone(catalog);
  next.products.find((p) => p.id === "sofa")!.model = "雾蓝双人沙发";
  Object.assign(next.skus.find((s) => s.id === "sofa")!, {
    label: "雾蓝双人沙发",
    dimensionsMm: [2200, 850, 900],
  });
  return next;
}
afterEach(() => vi.unstubAllGlobals());
describe("legacy furniture upgrade", () => {
  it("shows the new sofa after restore while preserving saved bytes, positions and colors until Save", () => {
    const preset = defaultPreset(),
      sofa = preset.instances.find((i) => i.id === "sofa")!;
    sofa.position = [0.4, 0, -0.9];
    sofa.customColor = "#416283";
    let raw = JSON.stringify({ preset, catalog: legacy() }),
      original = raw;
    vi.stubGlobal("localStorage", {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    });
    setActivePinia(createPinia());
    const studio = useStudio();
    studio.restore();
    expect(
      studio.catalog.skus.find((s) => s.id === "sofa")!.dimensionsMm,
    ).toEqual([2800, 850, 950]);
    expect(studio.preset.instances.find((i) => i.id === "sofa")).toEqual(sofa);
    expect(studio.notice).toContain("旧默认沙发已更新");
    expect(raw).toBe(original);
    studio.save();
    expect(
      JSON.parse(raw).catalog.skus.find((s: { id: string }) => s.id === "sofa")
        .dimensionsMm,
    ).toEqual([2800, 850, 950]);
  });
  it("preserves custom dimensions, names, official data and imported GLBs", () => {
    for (const customize of [
      (c: ReturnType<typeof legacy>) => {
        c.skus.find((s) => s.id === "sofa")!.dimensionsMm = [3100, 900, 1000];
      },
      (c: ReturnType<typeof legacy>) => {
        c.products.find((p) => p.id === "sofa")!.model = "自定义沙发";
      },
      (c: ReturnType<typeof legacy>) => {
        c.skus.find((s) => s.id === "sofa")!.status = "verified";
      },
      (c: ReturnType<typeof legacy>) => {
        c.assets.find((a) => a.id === "sofa")!.url =
          "https://example.com/sofa.glb";
      },
    ]) {
      const next = legacy();
      customize(next);
      const before = structuredClone(next);
      expect(updateLegacySofa(next, catalog)).toBe(false);
      expect(next).toEqual(before);
    }
  });
});
