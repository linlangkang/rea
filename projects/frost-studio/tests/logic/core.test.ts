import { describe, it, expect } from "vitest";
import { catalog, defaultPreset } from "../../src/data/catalog";
import {
  rules,
  checkCompatibility,
  inputsFor,
  power,
  totals,
} from "../../src/domain/compatibility";
import {
  parseCatalog,
  mergeCatalog,
  presetSchema,
} from "../../src/domain/schema";
import { decode, readSaved, saveState } from "../../src/domain/storage";
import { applyExplosion } from "../../src/scene/pc";
import * as T from "three";
const copy = <T>(x: T): T => structuredClone(x);
function valid() {
  const input = inputsFor(defaultPreset(), copy(catalog));
  input.board!.specs.biosCpu = input.cpu!.label;
  input.board!.specs.bios = "verified-minimum";
  input.laptop!.specs = { video: true, requiredPd: 65 };
  return input;
}
const conflicts: Record<string, (s: ReturnType<typeof valid>) => void> = {
  socket: (s) => (s.cpu!.specs.socket = "LGA1700"),
  bios: (s) => (s.board!.specs.biosCpu = "other"),
  ddr: (s) => (s.ram!.specs.ddr = "DDR4"),
  memory: (s) => (s.ram!.specs.capacity = 512),
  length: (s) => (s.gpu!.specs.gpuLength = 500),
  thickness: (s) => (s.gpu!.specs.gpuThickness = 100),
  power: (s) => (s.psu!.specs.watts = 500),
  connector: (s) => (s.psu!.specs.connectors = ["8-pin"]),
  radiator: (s) => (s.case!.specs.radiatorClearance = false),
  form: (s) => (s.case!.specs.forms = ["ITX"]),
  ssd: (s) => (s.board!.specs.m2Slots = 0),
  displays: (s) => (s.gpu!.specs.dp = 1),
  dock: (s) => (s.laptop!.specs.video = false),
};
describe("每条规则的正常、冲突与缺失数据", () => {
  for (const r of rules) {
    it(r.id + " 正常输入", () => {
      expect(["兼容", "警告"]).toContain(
        checkCompatibility(valid(), catalog).find((x) => x.id === r.id)!.status,
      );
    });
    it(r.id + " 冲突", () => {
      const s = valid();
      conflicts[r.id](s);
      expect(
        checkCompatibility(s, catalog).find((x) => x.id === r.id)!.status,
      ).toBe("不兼容");
    });
    it(r.id + " 缺失", () => {
      const s = valid();
      delete s[r.needs[0].split(".")[0]];
      expect(
        checkCompatibility(s, catalog).find((x) => x.id === r.id)!.status,
      ).toBe("未知");
    });
  }
});
it("默认 BIOS 和笔记本为未知", () => {
  const res = checkCompatibility(inputsFor(defaultPreset(), catalog), catalog);
  expect(res.find((x) => x.id === "bios")!.status).toBe("未知");
  expect(res.find((x) => x.id === "dock")!.status).toBe("未知");
});
it("两台显示器计两次，内存套装仅一次", () => {
  const c = copy(catalog);
  for (const id of ["monitor", "ram"])
    c.quotes.push({
      id,
      skuId: id,
      amount: id === "ram" ? 2000 : 1000,
      platform: "测试报价",
      region: "CN",
      currency: "CNY",
      collectedAt: "2026-09-23T00:00:00Z",
      url: "https://example.com",
    });
  expect(totals(defaultPreset(), c).total).toBe(4000);
  expect(totals(defaultPreset(), c).covered).toBe(3);
  expect(totals(defaultPreset(), c).groupCoverage.家具).toBe(0);
});
it("外部电器不影响 PSU，即使功耗很高", () => {
  const c = copy(catalog);
  for (const sku of c.skus) sku.specs.maxPower = 10;
  let p = defaultPreset();
  const base = power(p, c);
  for (const sku of c.skus.filter((x) =>
    ["monitor", "tv", "fridge", "laptop"].includes(x.id),
  ))
    sku.specs.maxPower = 10000;
  expect(power(p, c)).toEqual(base);
  expect(base.recommended).toBe(Math.ceil(base.max! * 1.25));
});
it("未知峰值不使用 TDP 冒充", () =>
  expect(power(defaultPreset(), catalog).max).toBeNull());
it("有效目录可解析", () =>
    expect(parseCatalog(JSON.stringify(catalog)).skus.length).toBe(catalog.skus.length));
it("重复 ID、未知字段、危险 URL、错误单位类型及引用拒绝", () => {
  for (const mutate of [
    (c: any) => c.skus.push(c.skus[0]),
    (c: any) => (c.skus[0].html = "<script/>"),
    (c: any) => (c.sources[0].url = "javascript:alert(1)"),
    (c: any) => (c.skus[0].dimensionsMm = ["40mm", 4, 40]),
    (c: any) => (c.skus[0].assetId = "missing"),
  ]) {
    const c = copy(catalog);
    mutate(c);
    expect(() => parseCatalog(JSON.stringify(c))).toThrow();
  }
});
it("大文件和损坏 JSON 拒绝", () => {
  expect(() => parseCatalog("x".repeat(2_000_001))).toThrow();
  expect(() => parseCatalog("{")).toThrow();
});
it("合并更新同 ID，不增加重复项", () => {
  const c = copy(catalog);
  c.skus[0].label = "新测试名";
  expect(mergeCatalog(catalog, c).skus.length).toBe(catalog.skus.length);
  expect(mergeCatalog(catalog, c).skus[0].label).toBe("新测试名");
});
it("存储恢复、目录与颜色一致", () => {
  let raw = "";
  const fake = {
    setItem: (_k: string, v: string) => (raw = v),
    getItem: () => raw,
  };
  const p = defaultPreset();
  p.instances[0].customColor = "#abcdef";
  saveState(fake, p, catalog);
  expect(readSaved(fake)!.preset).toEqual(p);
});
it("损坏、旧版本、产品删除和存储不可用被发现", () => {
  expect(() => decode("broken")).toThrow();
  const p = defaultPreset();
  expect(() => presetSchema.parse({ ...p, schemaVersion: 0 })).toThrow();
  expect(() =>
    decode(
      JSON.stringify({
        preset: p,
        catalog: { ...catalog, skus: catalog.skus.slice(1) },
      }),
    ),
  ).toThrow();
  expect(() =>
    readSaved({
      getItem: () => {
        throw Error("blocked");
      },
    }),
  ).toThrow();
});
it("绝对插值反向十次无漂移", () => {
  const g = new T.Group();
  const part = {
    object: g,
    home: new T.Vector3(0.13, 0.2, 0.3),
    offset: new T.Vector3(0.6, 0.2, -0.4),
  };
  for (let i = 0; i < 10; i++) {
    applyExplosion([part], 1);
    applyExplosion([part], 0.43);
    applyExplosion([part], 0);
  }
  expect(g.position.toArray()).toEqual(part.home.toArray());
});
