import { describe, it, expect } from "vitest";
import { catalog, defaultPreset } from "../../src/data/catalog";
import { decode } from "../../src/domain/storage";
import {
  snapshot,
  encodePlan,
  decodePlan,
  readPlans,
  savePlan,
  buildRenderPreset,
  PLAN_KEY,
} from "../../src/domain/build-plans";
function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}
describe("装机方案数据边界", () => {
  it("旧存档补默认名称；构建视图不修改房间坐标", () => {
    const old: any = defaultPreset();
    delete old.name;
    expect(decode(JSON.stringify({ preset: old, catalog })).preset.name).toBe(
      "霜境装机方案",
    );
    const preset = defaultPreset(),
      before = JSON.stringify(preset),
      render = buildRenderPreset(preset);
    expect(render.instances.find((i) => i.id === "case")?.position).toEqual([
      0, 0, 0,
    ]);
    expect(
      render.instances.some((i) => i.id === "sofa" || i.id === "desk"),
    ).toBe(false);
    expect(JSON.stringify(preset)).toBe(before);
  });
  it("分享 UTF-8 名称及自定义配置往返，拒绝过大或悬空引用", () => {
    const preset = defaultPreset();
    preset.name = "我的冰白主机 · 工作";
    preset.light = "off";
    expect(decodePlan(encodePlan(snapshot(preset, catalog))).preset).toEqual(
      preset,
    );
    preset.savedPlanId = crypto.randomUUID();
    expect(
      decodePlan(encodePlan(snapshot(preset, catalog))).preset.savedPlanId,
    ).toBeNull();
    expect(preset.savedPlanId).not.toBeNull();
    expect(() => decodePlan("!invalid")).toThrow();
    expect(() => decodePlan("a".repeat(60001))).toThrow();
    const broken = structuredClone(catalog);
    broken.skus = [];
    expect(() => snapshot(preset, broken)).toThrow();
  });
  it("保存多个独立归档，更新指定记录不覆盖其他归档，容量满时保留原数据", () => {
    const store = storage();
    const first = snapshot(defaultPreset(), catalog);
    const ids = Array.from({ length: 8 }, () => crypto.randomUUID());
    ids.forEach((id, i) =>
      savePlan(store, {
        id,
        updatedAt: new Date().toISOString(),
        snapshot: { ...first, preset: { ...first.preset, name: "方案" + i } },
      }),
    );
    savePlan(store, {
      id: ids[0],
      updatedAt: new Date().toISOString(),
      snapshot: { ...first, preset: { ...first.preset, name: "已更名" } },
    });
    expect(
      readPlans(store).find((p) => p.id === ids[1])?.snapshot.preset.name,
    ).toBe("方案1");
    expect(
      readPlans(store).find((p) => p.id === ids[0])?.snapshot.preset.name,
    ).toBe("已更名");
    const before = store.getItem(PLAN_KEY);
    expect(() =>
      savePlan(store, {
        id: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
        snapshot: first,
      }),
    ).toThrow("8");
    expect(store.getItem(PLAN_KEY)).toBe(before);
  });
  it("损坏归档不可静默覆盖", () => {
    const store = storage();
    store.setItem(PLAN_KEY, "broken");
    expect(() =>
      savePlan(store, {
        id: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
        snapshot: snapshot(defaultPreset(), catalog),
      }),
    ).toThrow();
    expect(store.getItem(PLAN_KEY)).toBe("broken");
  });
});
