import { z } from "zod";
import {
  presetSchema,
  catalogSchema,
  type BuildPreset,
  type Catalog,
} from "./schema";
import { validateState } from "./storage";
export const PLAN_KEY = "frost-build-plans-v1";
const snapshotSchema = z
  .object({
    version: z.literal(1),
    preset: presetSchema,
    catalog: catalogSchema,
  })
  .strict();
const planSchema = z
  .object({
    id: z.string().uuid(),
    updatedAt: z.iso.datetime(),
    snapshot: snapshotSchema,
  })
  .strict();
const archiveSchema = z
  .object({ version: z.literal(1), plans: z.array(planSchema).max(8) })
  .strict();
export type PlanSnapshot = z.infer<typeof snapshotSchema>;
export type SavedPlan = z.infer<typeof planSchema>;
export function snapshot(preset: BuildPreset, catalog: Catalog): PlanSnapshot {
  const next = snapshotSchema.parse({ version: 1, preset, catalog });
  validateState(next.preset, next.catalog);
  return next;
}
export function readPlans(storage: Pick<Storage, "getItem">): SavedPlan[] {
  const raw = storage.getItem(PLAN_KEY);
  if (!raw) return [];
  if (new TextEncoder().encode(raw).length > 8_000_000)
    throw Error("方案库过大，未覆盖原数据");
  const parsed = archiveSchema.parse(JSON.parse(raw));
  parsed.plans.forEach((plan) =>
    validateState(plan.snapshot.preset, plan.snapshot.catalog),
  );
  if (new Set(parsed.plans.map((p) => p.id)).size !== parsed.plans.length)
    throw Error("方案 ID 重复");
  return parsed.plans;
}
export function savePlan(
  storage: Pick<Storage, "getItem" | "setItem">,
  plan: SavedPlan,
): SavedPlan[] {
  const plans = readPlans(storage);
  const index = plans.findIndex((p) => p.id === plan.id);
  const next = planSchema.parse(plan);
  validateState(next.snapshot.preset, next.snapshot.catalog);
  if (index < 0) {
    if (plans.length >= 8)
      throw Error("已保存 8 个方案，请导出备份后再整理方案库");
    plans.unshift(next);
  } else plans[index] = next;
  const raw = JSON.stringify({ version: 1, plans });
  if (new TextEncoder().encode(raw).length > 8_000_000)
    throw Error("方案库容量不足，请导出文件");
  storage.setItem(PLAN_KEY, raw);
  return plans;
}
export function encodePlan(value: PlanSnapshot) {
  const validated = snapshot(value.preset, value.catalog);
  validated.preset.savedPlanId = null;
  const bytes = new TextEncoder().encode(JSON.stringify(validated));
  if (bytes.length > 45_000)
    throw Error("此方案超过链接容量，请导出 JSON 分享");
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
export function decodePlan(token: string): PlanSnapshot {
  if (token.length > 60_000 || !/^[A-Za-z0-9_-]+$/.test(token))
    throw Error("分享链接无效或过大，当前方案未更改");
  try {
    const bytes = Uint8Array.from(
      atob(token.replaceAll("-", "+").replaceAll("_", "/")),
      (c) => c.charCodeAt(0),
    );
    const value = snapshotSchema.parse(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    );
    validateState(value.preset, value.catalog);
    return value;
  } catch {
    throw Error("分享方案校验失败，当前方案未更改");
  }
}
export function buildRenderPreset(preset: BuildPreset): BuildPreset {
  const ids = new Set([
    "case",
    "cpu",
    "gpu",
    "board",
    "ram",
    "ssd",
    "psu",
    "aio",
    "fan",
    "strip",
  ]);
  return {
    ...preset,
    camera: "pc",
    instances: preset.instances
      .filter((i) => ids.has(i.id))
      .map((i) => ({
        ...i,
        position: i.id === "case" ? [0, 0, 0] : [...i.position],
        rotation: i.id === "case" ? 0 : i.rotation,
      })),
  };
}
