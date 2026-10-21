import type { Catalog, BuildPreset, SKU } from "./schema";
export type Status = "兼容" | "警告" | "不兼容" | "未知";
export type RuleResult = {
  id: string;
  name: string;
  status: Status;
  reason: string;
  fields: string[];
  sources: string[];
  suggestion: string;
};
type Input = Record<string, SKU | undefined>;
type Rule = {
  id: string;
  name: string;
  needs: string[];
  check: (s: Input) => boolean;
  reason: string;
  suggestion: string;
};
const v = (s: Input, path: string): any => {
  const [id, field] = path.split(".");
  return field === "label"
    ? s[id]?.label
    : s[id]?.specs[field as keyof SKU["specs"]];
};
export const rules: Rule[] = [
  {
    id: "socket",
    name: "CPU / 主板插槽",
    needs: ["cpu.socket", "board.socket"],
    check: (s) => v(s, "cpu.socket") === v(s, "board.socket"),
    reason: "CPU 与主板插槽必须一致",
    suggestion: "选择相同插槽的 CPU 和主板",
  },
  {
    id: "bios",
    name: "CPU 支持列表 / BIOS",
    needs: ["cpu.label", "board.biosCpu", "board.bios"],
    check: (s) => v(s, "board.biosCpu") === v(s, "cpu.label"),
    reason: "需要确切 CPU 支持条目与最低 BIOS 版本；不由 AM5 推断",
    suggestion: "查主板 CPU 支持页，并核对到手 BIOS 版本",
  },
  {
    id: "ddr",
    name: "DDR 代际",
    needs: ["ram.ddr", "board.ddr"],
    check: (s) => v(s, "ram.ddr") === v(s, "board.ddr"),
    reason: "内存 DDR 代际匹配，不代表 EXPO 超频保证",
    suggestion: "更换对应 DDR 内存，频率需另查 QVL",
  },
  {
    id: "memory",
    name: "内存容量 / 条数",
    needs: ["ram.capacity", "ram.sticks", "board.maxMemory", "board.slots"],
    check: (s) =>
      v(s, "ram.capacity") <= v(s, "board.maxMemory") &&
      v(s, "ram.sticks") <= v(s, "board.slots"),
    reason: "套装总容量、条数不能超过主板上限",
    suggestion: "减少条数或容量，优先双条套装",
  },
  {
    id: "length",
    name: "显卡长度",
    needs: ["gpu.gpuLength", "case.gpuClearance"],
    check: (s) => v(s, "gpu.gpuLength") <= v(s, "case.gpuClearance"),
    reason: "具体显卡长度需小于机箱有效限长",
    suggestion: "选择更短的显卡或更宽裕的机箱",
  },
  {
    id: "thickness",
    name: "显卡厚度",
    needs: ["gpu.gpuThickness", "case.thicknessClearance"],
    check: (s) => v(s, "gpu.gpuThickness") <= v(s, "case.thicknessClearance"),
    reason: "核对显卡厚度与底部风扇空间",
    suggestion: "增加安装余量，并核对接头弯折空间",
  },
  {
    id: "power",
    name: "电源额定功率",
    needs: ["gpu.recommendedPsu", "psu.watts"],
    check: (s) => v(s, "psu.watts") >= v(s, "gpu.recommendedPsu"),
    reason: "仅核对显卡厂家建议电源门槛，整机峰值仍需核实",
    suggestion: "选满足厂家建议的电源并留出整机峰值余量",
  },
  {
    id: "connector",
    name: "显卡供电接口",
    needs: ["gpu.connector", "psu.connectors"],
    check: (s) => v(s, "psu.connectors").includes(v(s, "gpu.connector")),
    reason: "电源应提供显卡要求的原生接口",
    suggestion: "核验具体电源 SKU 的线材、额定能力与插接要求",
  },
  {
    id: "radiator",
    name: "360 冷排 / 空间",
    needs: ["aio.radiator", "case.radiators", "case.radiatorClearance"],
    check: (s) =>
      v(s, "case.radiators").includes(v(s, "aio.radiator")) &&
      v(s, "case.radiatorClearance"),
    reason: "安装位和内存/主板干涉需要同时确认",
    suggestion: "核验机箱冷排位、总厚度及实际主板净空",
  },
  {
    id: "form",
    name: "主板板型",
    needs: ["board.form", "case.forms"],
    check: (s) => v(s, "case.forms").includes(v(s, "board.form")),
    reason: "机箱应支持主板板型",
    suggestion: "更换支持该板型的机箱",
  },
  {
    id: "ssd",
    name: "SSD 接口 / 长度 / 插槽",
    needs: [
      "ssd.ssdInterface",
      "ssd.ssdSize",
      "board.ssdInterfaces",
      "board.ssdSizes",
      "board.m2Slots",
    ],
    check: (s) =>
      v(s, "board.ssdInterfaces").includes(v(s, "ssd.ssdInterface")) &&
      v(s, "board.ssdSizes").includes(v(s, "ssd.ssdSize")) &&
      v(s, "board.m2Slots") >= 1,
    reason: "默认一块 SSD；共享通道限制需另查手册",
    suggestion: "使用支持该协议与尺寸的空闲 M.2 槽",
  },
  {
    id: "displays",
    name: "双屏输出 / DP 连接",
    needs: ["gpu.dp", "monitor.dp", "monitor-2.dp"],
    check: (s) =>
      v(s, "gpu.dp") >= 2 &&
      v(s, "monitor.dp") >= 1 &&
      v(s, "monitor-2.dp") >= 1,
    reason: "两根 DP 线分别连接独显；线材带宽及刷新率需验证",
    suggestion: "使用两路独显输出和符合带宽的 DP 线",
  },
  {
    id: "dock",
    name: "笔记本 / 扩展坞 / USB-C",
    needs: [
      "laptop.video",
      "laptop.requiredPd",
      "dock.video",
      "dock.pd",
      "cable.video",
      "cable.pd",
    ],
    check: (s) =>
      v(s, "laptop.video") &&
      v(s, "dock.video") &&
      v(s, "cable.video") &&
      Math.min(v(s, "dock.pd"), v(s, "cable.pd")) >= v(s, "laptop.requiredPd"),
    reason: "USB-C 外形不能证明视频输出或供电能力",
    suggestion: "核验笔记本具体 SKU 端口协议与 PD 需求；游戏负载使用原装电源",
  },
];
export function checkCompatibility(input: Input, cat: Catalog): RuleResult[] {
  return rules.map((r) => {
    const missing = r.needs.filter(
      (f) => v(input, f) === undefined || v(input, f) === null,
    );
    const ids = [...new Set(r.needs.map((f) => f.split(".")[0]))];
    const sources = [
      ...new Set(ids.flatMap((id) => input[id]?.sourceIds ?? [])),
    ].flatMap((id) => cat.sources.find((s) => s.id === id)?.url ?? []);
    const evidenced = r.needs.every((path) => {
      const [id, field] = path.split(".");
      const sku = input[id];
      return sku?.sourceIds.some((sid) =>
        cat.sources
          .find((x) => x.id === sid)
          ?.fields.includes(field === "label" ? "label" : `specs.${field}`),
      );
    });
    let status: Status = missing.length
      ? "未知"
      : !r.check(input)
        ? "不兼容"
        : !evidenced || r.id === "bios" || r.id === "power"
          ? "警告"
          : "兼容";
    return {
      id: r.id,
      name: r.name,
      status,
      reason: missing.length
        ? `缺少 ${missing.join("、")}。${r.reason}`
        : r.reason +
          (!evidenced ? "（包含演示或未核验字段，仅作条件演算）" : ""),
      fields: r.needs,
      sources,
      suggestion: r.suggestion,
    };
  });
}
export function inputsFor(preset: BuildPreset, cat: Catalog): Input {
  return Object.fromEntries(
    preset.instances.map((i) => [i.id, cat.skus.find((s) => s.id === i.skuId)]),
  );
}
const host = [
  "CPU",
  "显卡",
  "主板",
  "内存",
  "固态",
  "电源",
  "散热",
  "风扇",
  "灯带",
  "机箱",
];
const furniture = ["桌子", "椅子", "床", "沙发", "电视", "冰箱"];
export function totals(preset: BuildPreset, cat: Catalog) {
  const groups = { 主机: 0, 外设: 0, 家具: 0 };
  const groupCoverage = { 主机: 0, 外设: 0, 家具: 0 };
  let covered = 0,
    units = 0;
  for (const i of preset.instances) {
    const sku = cat.skus.find((s) => s.id === i.skuId);
    const product = cat.products.find((p) => p.id === sku?.productId);
    if (!product) continue;
    const q = cat.quotes
      .filter((q) => q.skuId === i.skuId)
      .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))[0];
    units += i.quantity;
    if (q) {
      covered += i.quantity;
      const group = host.includes(product.category)
        ? "主机"
        : furniture.includes(product.category)
          ? "家具"
          : "外设";
      groups[group] += q.amount * i.quantity;
      groupCoverage[group] += i.quantity;
    }
  }
  return {
    groups,
    groupCoverage,
    covered,
    units,
    total: Object.values(groups).reduce((a, b) => a + b, 0),
    budget: Object.entries(preset.budgets).reduce(
      (sum, [id, x]) =>
        sum + x * (preset.instances.find((i) => i.id === id)?.quantity ?? 0),
      0,
    ),
  };
}
export function power(preset: BuildPreset, cat: Catalog) {
  const parts = preset.instances.filter((i) => {
    const sku = cat.skus.find((s) => s.id === i.skuId);
    return [
      "CPU",
      "显卡",
      "主板",
      "内存",
      "固态",
      "散热",
      "风扇",
      "灯带",
    ].includes(
      cat.products.find((p) => p.id === sku?.productId)?.category ?? "",
    );
  });
  const unknown = parts.filter(
    (i) => cat.skus.find((s) => s.id === i.skuId)?.specs.maxPower === undefined,
  );
  const max = parts.reduce(
    (n, i) =>
      n +
      (cat.skus.find((s) => s.id === i.skuId)?.specs.maxPower ?? 0) *
        i.quantity,
    0,
  );
  return {
    unknown: unknown.map((i) => i.id),
    max: unknown.length ? null : max,
    recommended: unknown.length ? null : Math.ceil(max * 1.25),
  };
}
