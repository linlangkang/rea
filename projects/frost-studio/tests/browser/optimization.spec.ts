import { test, expect } from "@playwright/test";
import { catalog, defaultPreset } from "../../src/data/catalog";
import { openSection } from "./sections";

test("产品库分批展示、清空搜索及原生弹窗焦点恢复", async ({ page }) => {
  await page.goto("/?noWebGL#studio");
  const trigger = page.getByRole("button", { name: "产品库", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  const cards = dialog.locator(".library-grid").first().locator("article");
  await expect(cards).toHaveCount(24);
  await page.getByRole("button", { name: "加载更多型号", exact: true }).click();
  await expect(cards).toHaveCount(Math.min(48, catalog.skus.length));
  await page.getByLabel("产品库搜索", { exact: true }).fill("  dEx  ");
  await expect(cards).toHaveCount(3);
  await page
    .getByRole("button", { name: "清空产品库搜索", exact: true })
    .click();
  await expect(page.getByLabel("产品库搜索", { exact: true })).toBeFocused();
  await expect(cards).toHaveCount(24);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await openSection(page, ".tools-menu");
  const importTrigger = page.getByRole("button", {
    name: "↓ 导入目录",
    exact: true,
  });
  await importTrigger.click();
  await expect(
    page.getByRole("button", { name: "确认应用目录" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "取消", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "关闭导入" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // The tools menu closes when opening a dialog; focus must return to a visible control.
  await expect(page.locator(".tools-menu > summary")).toBeFocused();
});

test("导入不同内存套装后容量说明同步，清空预算恢复为未填写", async ({
  page,
}) => {
  await page.goto("/?noWebGL#studio");
  const next = structuredClone(catalog);
  const ramId = defaultPreset().instances.find((i) => i.id === "ram")!.skuId;
  const ram = next.skus.find((sku) => sku.id === ramId)!;
  ram.specs.capacity = 32;
  ram.specs.sticks = 2;
  await openSection(page, ".tools-menu");
  await page.getByRole("button", { name: "↓ 导入目录", exact: true }).click();
  await page.getByLabel("选择 JSON 文件").setInputFiles({
    name: "ram.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(next)),
  });
  await page.getByRole("button", { name: "确认应用目录" }).click();
  await expect(page.locator('[data-instance="ram-1"]')).toHaveText(
    "内存 1 · 16GB",
  );
  await page.locator('[data-instance="ram-1"]').click();
  const budget = page.getByRole("spinbutton", {
    name: "该实例预算估值（元，不是报价）",
  });
  await budget.fill("300");
  await budget.press("Tab");
  await budget.fill("");
  await budget.press("Tab");
  await expect(budget).toHaveValue("");
  await page.getByRole("button", { name: "保存方案", exact: true }).click();
  await page.reload();
  await page.locator('[data-instance="ram-1"]').click();
  await expect(budget).toHaveValue("");
  await expect(page.locator('[data-instance="ram-2"]')).toHaveText(
    "内存 2 · 16GB",
  );
});

test("保存与预算调整不重建场景，也不改变相机", async ({ page }) => {
  // Isolate persistence from the independent entrance-camera animation.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#studio");
  await expect(page.getByText("场景就绪 · 原创参数化模型")).toBeVisible({
    timeout: 30000,
  });
  await page.locator('[data-instance="mouse"]').click();
  await page.waitForTimeout(1700);
  const before = await page.evaluate(() =>
    (window as any).__frost.diagnostics(),
  );
  expect(before.updates).toBeGreaterThan(0);
  expect(before.rebuilds).toBeGreaterThan(0);
  await page
    .getByRole("spinbutton", { name: "该实例预算估值（元，不是报价）" })
    .fill("280");
  await page.getByRole("button", { name: "保存方案", exact: true }).click();
  await page.waitForTimeout(250);
  const after = await page.evaluate(() =>
    (window as any).__frost.diagnostics(),
  );
  expect(after.updates).toBe(before.updates);
  expect(after.rebuilds).toBe(before.rebuilds);
  expect(after.cameraPosition).toEqual(before.cameraPosition);
});
