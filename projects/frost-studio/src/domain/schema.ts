import { z } from "zod";
export const categories = [
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
  "显示器",
  "笔记本",
  "键盘",
  "鼠标",
  "耳机",
  "桌子",
  "椅子",
  "线材",
  "扩展坞",
  "床",
  "沙发",
  "电视",
  "冰箱",
] as const;
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const text = z.string().min(1).max(300);
const url = z
  .url()
  .refine((s) => /^https?:\/\//.test(s), "仅允许 HTTP/HTTPS 链接");
export const specsSchema = z
  .object({
    productCode: text,
    cpuModel: text,
    gpuModel: text,
    storageGB: z.number().positive(),
    screenInches: z.number().positive(),
    thicknessRangeMm: z.tuple([z.number().positive(), z.number().positive()]),
    weightKg: z.number().positive(),
    socket: text,
    ddr: text,
    capacity: z.number().positive(),
    sticks: z.number().int().positive(),
    slots: z.number().int().nonnegative(),
    maxMemory: z.number().positive(),
    biosCpu: text,
    bios: text,
    form: text,
    forms: z.array(text),
    gpuLength: z.number().positive(),
    gpuThickness: z.number().positive(),
    gpuClearance: z.number().positive(),
    thicknessClearance: z.number().positive(),
    watts: z.number().positive(),
    recommendedPsu: z.number().positive(),
    connector: text,
    connectors: z.array(text),
    radiator: z.number().positive(),
    radiators: z.array(z.number().positive()),
    radiatorClearance: z.boolean(),
    ssdInterface: text,
    ssdInterfaces: z.array(text),
    ssdSize: text,
    ssdSizes: z.array(text),
    m2Slots: z.number().int().nonnegative(),
    dp: z.number().int().nonnegative(),
    hdmi: z.number().int().nonnegative(),
    resolution: text,
    hz: z.number().positive(),
    video: z.boolean(),
    pd: z.number().nonnegative(),
    requiredPd: z.number().nonnegative(),
    tdp: z.number().nonnegative(),
    maxPower: z.number().nonnegative(),
  })
  .partial()
  .strict();
export const productSchema = z
  .object({
    id,
    brand: text,
    series: text,
    model: text,
    category: z.enum(categories),
  })
  .strict();
export const sourceSchema = z
  .object({
    id,
    url,
    type: z.enum(["official", "store", "user"]),
    checkedAt: z.iso.date(),
    fields: z.array(text),
  })
  .strict();
export const assetSchema = z
  .object({
    id,
    url: url.nullable(),
    license: text,
    unit: z.literal("m"),
    up: z.literal("Y"),
    accuracy: z.enum(["parametric", "third-party", "official"]),
    generator: z.enum(categories),
  })
  .strict();
export const skuSchema = z
  .object({
    id,
    productId: id,
    label: text,
    officialColor: text.nullable(),
    releaseDate: z.iso.date().nullable(),
    marketingYear: z.number().int().min(2024).max(2100).nullable(),
    status: z.enum(["verified", "partial", "demo", "unknown"]),
    dimensionsMm: z
      .tuple([
        z.number().positive().max(10000),
        z.number().positive().max(10000),
        z.number().positive().max(10000),
      ])
      .nullable(),
    specs: specsSchema,
    sourceIds: z.array(id),
    assetId: id,
  })
  .strict();
export const quoteSchema = z
  .object({
    id,
    skuId: id,
    platform: text,
    region: text,
    currency: z.literal("CNY"),
    amount: z.number().nonnegative(),
    collectedAt: z.iso.datetime(),
    url,
  })
  .strict();
export const catalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    products: z.array(productSchema).max(1000),
    skus: z.array(skuSchema).max(2000),
    sources: z.array(sourceSchema).max(2000),
    assets: z.array(assetSchema).max(1000),
    quotes: z.array(quoteSchema).max(5000),
  })
  .strict()
  .superRefine((d, ctx) => {
    for (const key of [
      "products",
      "skus",
      "sources",
      "assets",
      "quotes",
    ] as const) {
      const ids = new Set<string>();
      d[key].forEach((row, i) => {
        if (ids.has(row.id))
          ctx.addIssue({
            code: "custom",
            path: [key, i, "id"],
            message: "ID 重复",
          });
        ids.add(row.id);
      });
    }
    const has = (key: "products" | "skus" | "sources" | "assets", id: string) =>
      d[key].some((x) => x.id === id);
    d.skus.forEach((s, i) => {
      if (
        !has("products", s.productId) ||
        !has("assets", s.assetId) ||
        s.sourceIds.some((id) => !has("sources", id))
      )
        ctx.addIssue({
          code: "custom",
          path: ["skus", i],
          message: "引用的产品、来源或模型不存在",
        });
      if (
        d.assets.find((a) => a.id === s.assetId)?.generator !==
        d.products.find((p) => p.id === s.productId)?.category
      )
        ctx.addIssue({
          code: "custom",
          path: ["skus", i],
          message: "模型类别与产品类别不匹配",
        });
    });
    d.quotes.forEach((q, i) => {
      if (!has("skus", q.skuId))
        ctx.addIssue({
          code: "custom",
          path: ["quotes", i],
          message: "报价 SKU 不存在",
        });
    });
  });
export type Catalog = z.infer<typeof catalogSchema>;
export type SKU = z.infer<typeof skuSchema>;
export type Category = (typeof categories)[number];
export const instanceSchema = z
  .object({
    id,
    skuId: id,
    quantity: z.number().int().positive().max(100),
    position: z.tuple([z.number(), z.number(), z.number()]),
    rotation: z.number(),
    customColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .nullable(),
  })
  .strict();
export const presetSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: z.string().trim().min(1).max(80).default("霜境装机方案"),
    savedPlanId: z.string().uuid().nullable().default(null),
    savedAt: z.string().nullable(),
    layoutVersion: z.union([z.literal(1),z.literal(2)]).default(1),
    instances: z.array(instanceSchema).max(100),
    light: z.enum(["ice", "white", "breath", "off"]),
    night: z.boolean(),
    scenery: z.enum(["mountain", "coast", "mist"]).default("mountain"),
    timeOfDay: z.number().min(0).max(24).default(14),
    debug: z.enum(['off','axes','bounds','wireframe']).default('off'),
    tvWallpaper: z.enum(['coast','mountain']).default('coast'),
    brightness: z.number().min(0).max(1),
    wallpaper: z.enum(["aurora", "orbit", "grid", "photo"]),
    camera: z.enum(["default", "room", "desk", "pc", "window", "bed", "lounge"]),
    quality: z.enum(["low", "medium", "high"]),
    sidePanel: z.boolean(),
    explode: z.number().min(0).max(1),
    room: z.tuple([
      z.number().min(8).max(12),
      z.number().min(6).max(10),
      z.number().min(3).max(4),
    ]),
    budgets: z.record(z.string(), z.number().nonnegative()),
  })
  .strict();
export type BuildPreset = z.infer<typeof presetSchema>;
export type SceneInstance = z.infer<typeof instanceSchema>;
export function parseCatalog(raw: string) {
  if (new TextEncoder().encode(raw).length > 2_000_000)
    throw Error("文件超过 2 MB 限制");
  return catalogSchema.parse(JSON.parse(raw));
}
export function mergeCatalog(base: Catalog, add: Catalog): Catalog {
  const merge = <T extends { id: string }>(a: T[], b: T[]) => [
    ...new Map([...a, ...b].map((x) => [x.id, x])).values(),
  ];
  return catalogSchema.parse({
    schemaVersion: 1,
    products: merge(base.products, add.products),
    skus: merge(base.skus, add.skus),
    sources: merge(base.sources, add.sources),
    assets: merge(base.assets, add.assets),
    quotes: merge(base.quotes, add.quotes),
  });
}
