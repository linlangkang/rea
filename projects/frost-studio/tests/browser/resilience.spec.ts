import { openSection } from './sections';
import { test, expect } from "@playwright/test";
import { catalog } from "../../src/data/catalog";
test("目录合并真实生效、缺失资源回退、替换拒绝悬空 SKU", async ({ page }) => {
  await page.goto("/#studio");
  await expect(page.getByText("场景就绪 · 原创参数化模型")).toBeVisible();
  const next = structuredClone(catalog);
  next.skus.find((x) => x.id === "desk")!.label = "导入测试电竞桌";
  next.assets.find((x) => x.id === "desk")!.url =
    "http://127.0.0.1:5178/test-missing-model.glb";
  await page.route("**/test-missing-model.glb", (route) =>
    route.abort("failed"),
  );
  await openSection(page, '.tools-menu');
  await page.getByRole("button", { name: "↓ 导入目录" }).click();
  await page
    .getByLabel("选择 JSON 文件")
    .setInputFiles({
      name: "new.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(next)),
    });
  await page.getByRole("button", { name: "确认应用目录" }).click();
  await expect(page.locator('[data-instance="desk"]')).toContainText(
    "导入测试电竞桌",
  );
  await expect(page.getByText(/GLB 资源加载失败/)).toBeVisible();
  expect(
    await page.evaluate(() =>
      (window as any).__frost
        .diagnostics()
        .instances.some((x: any) => x.id === "desk"),
    ),
  ).toBe(true);
  await openSection(page, '.tools-menu');
  await page.getByRole("button", { name: "↓ 导入目录" }).click();
  const empty = {
    schemaVersion: 1,
    products: [],
    skus: [],
    sources: [],
    assets: [],
    quotes: [],
  };
  await page
    .getByLabel("选择 JSON 文件")
    .setInputFiles({
      name: "empty.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(empty)),
    });
  await page.getByLabel("导入策略").selectOption("replace");
  await page.getByRole("button", { name: "确认应用目录" }).click();
  await expect(page.locator(".error-text")).toContainText("目录中缺少");
});
test("损坏存储不覆盖，禁用存储明确提示", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("frost-studio-v1", "{bad"),
  );
  await page.goto("/#studio");
  await expect(page.getByRole("status")).toContainText("恢复失败");
  expect(
    await page.evaluate(() => localStorage.getItem("frost-studio-v1")),
  ).toBe("{bad");
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new Error("test quota");
    };
  });
  await page.getByRole("button", { name: "保存方案", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("保存失败");
});
test("减少动态偏好、两条内存独立选择与真实上下文丢失重试", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#studio");
  await expect(page.getByText("场景就绪 · 原创参数化模型")).toBeVisible();
  await page.getByRole("button", { name: "主机内部", exact: true }).click();
  for (const id of ["ram-1", "ram-2"]) {
    await page.locator(`[data-instance="${id}"]`).click();
    expect(
      await page.evaluate(() => (window as any).__frost.diagnostics().selected),
    ).toBe(id);
  }
  await openSection(page, '.atmosphere');
  await page.getByLabel("灯光模式").selectOption("breath");
  const before = await page.evaluate(
    () => (window as any).__frost.diagnostics().emissive,
  );
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => (window as any).__frost.diagnostics().emissive),
  ).toEqual(before);
  const extension = await page.evaluate(() => {
    const gl = document.querySelector("canvas")!.getContext("webgl2")!;
    const ext = gl.getExtension("WEBGL_lose_context");
    ext?.loseContext();
    return !!ext;
  });
  expect(extension).toBe(true);
  await expect(page.getByText(/WebGL 上下文丢失/)).toBeVisible();
  await page.getByRole("button", { name: "重试场景" }).click();
  await expect(page.getByText("场景就绪 · 原创参数化模型")).toBeVisible();
});
test("品牌、年份、颜色与搜索筛选", async ({ page }) => {
  await page.goto("/#studio");
  await openSection(page, '.catalog-filters');
  await page.getByLabel("发布日期").selectOption("2024");
  await expect(page.locator(".catalog-list .item")).toHaveCount(1);
  await expect(page.locator(".catalog-list .item")).toContainText("9800X3D");
  await openSection(page, '.catalog-filters');
  await page.getByLabel("发布日期").selectOption("");
  await openSection(page, '.catalog-filters');
  await page.getByLabel("品牌", { exact: true }).selectOption("MSI");
  await expect(page.locator(".catalog-list .item")).toHaveCount(2);
  await openSection(page, '.catalog-filters');
  await page.getByLabel("官方颜色").selectOption("白色");
  await expect(page.locator(".catalog-list .item")).toHaveCount(1);
  await page.getByLabel("搜索产品").fill("不存在");
  await expect(page.getByText("没有符合筛选的组件。")).toBeVisible();
});
