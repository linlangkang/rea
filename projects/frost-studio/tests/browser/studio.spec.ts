import { openSection } from './sections';
import { test, expect, type Page } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { catalog } from "../../src/data/catalog";
const dir = "output/playwright";
mkdirSync(dir, { recursive: true });
const diagnostics = (page: Page) =>
  page.evaluate(() => (window as any).__frost.diagnostics());
async function ready(page: Page) {
  await page.goto("/#studio");
  await expect(page.getByText("场景就绪 · 原创参数化模型")).toBeVisible({
    timeout: 30000,
  });
  await expect
    .poll(() => page.evaluate(() => !!(window as any).__frost))
    .toBeTruthy();
}
test("场景、四视角、桌面/主机截图与实际帧率", async ({ page, browser }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await ready(page);
  const views = ["默认视角", "房间全景", "桌面特写", "主机内部"];
  const files = ["default", "room", "desk", "pc"];
  const viewsMeasured: unknown[] = [];
  for (let i = 0; i < views.length; i++) {
    await page.getByRole("button", { name: views[i], exact: true }).click();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${dir}/${files[i]}.png`, fullPage: true });
    viewsMeasured.push({
      view: files[i],
      fps: await page.locator(".scene-badge").textContent(),
      metrics: await diagnostics(page),
    });
    expect((await diagnostics(page)).view).toBe(
      ["default", "room", "desk", "pc"][i],
    );
  }
  const metrics = await diagnostics(page);
  const info = await page.evaluate(() => ({
    ua: navigator.userAgent,
    cores: navigator.hardwareConcurrency,
    viewport: [innerWidth, innerHeight],
    fps: document.querySelector(".scene-badge")?.textContent,
  }));
  writeFileSync(
    `${dir}/performance.json`,
    JSON.stringify(
      { browser: browser.version(), info, metrics, viewsMeasured, errors },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
});
test("选择同步、空白取消与拖动不误选", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "桌面特写", exact: true }).click();
  await page.waitForTimeout(1800);
  await page.locator('[data-instance="monitor"]').click();
  expect((await diagnostics(page)).selected).toBe("monitor");
  const position = await page.evaluate(() =>
    (window as any).__frost.project("monitor-2"),
  );
  await page.mouse.click(position.x, position.y);
  await expect(page.locator('[data-instance="monitor-2"]')).toHaveClass(
    /selected/,
  );
  const canvas = page.locator("canvas");
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width * 0.7,
    bounds.y + bounds.height * 0.65,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.76,
    bounds.y + bounds.height * 0.7,
    { steps: 8 },
  );
  await page.mouse.up();
  expect((await diagnostics(page)).selected).toBe("monitor-2");
  await page.getByRole("button", { name: "默认视角", exact: true }).click();
  await page.waitForTimeout(1800);
  await page.mouse.click(bounds.x + 25, bounds.y + 180);
  await expect.poll(async () => (await diagnostics(page)).selected).toBe(null);
});
test("型号尺寸、颜色、灯光、侧板、十次拆装与保存恢复", async ({ page }) => {
  test.setTimeout(90000);
  await ready(page);
  await page.locator('[data-instance="desk"]').click();
  const before = (await diagnostics(page)).instances.find(
    (x: any) => x.id === "desk",
  ).bounds[2];
  await page.getByLabel("切换型号").selectOption("desk-wide");
  await expect
    .poll(
      async () =>
        (await diagnostics(page)).instances.find((x: any) => x.id === "desk")
          .bounds[2],
    )
    .toBeGreaterThan(before + 0.3);
  await page.getByRole("button", { name: "黑蓝", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await diagnostics(page)).instances.find((x: any) => x.id === "desk")
          .colors,
    )
    .toContain("233e5e");
  await page.getByRole("button", { name: "主机内部", exact: true }).click();
  await openSection(page, '.assembly');
  await page.getByRole("button", { name: "隐藏侧板", exact: true }).click();
  await expect.poll(async () => (await diagnostics(page)).sidePanel).toBe(false);
  await expect(page.getByRole("button", { name: "显示侧板" })).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.getByRole("button", { name: "拆解", exact: true }).click();
    await page.waitForTimeout(60);
    await page.getByRole("button", { name: "组装", exact: true }).click();
  }
  await expect.poll(async () => (await diagnostics(page)).explosion).toBe(0);
  const parts = (await diagnostics(page)).parts;
  for (const part of parts) expect(part.position).toEqual(part.home);
  await page.getByRole("button", { name: "拆解", exact: true }).click();
  await expect.poll(async () => (await diagnostics(page)).explosion).toBe(1);
  await page.locator('[data-instance="gpu"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${dir}/exploded.png`, fullPage: true });
  await openSection(page, '.assembly');
  await page.getByRole("button", { name: "组装", exact: true }).click();
  await openSection(page, '.atmosphere');
  await page.getByLabel("灯光模式").selectOption("off");
  await expect
    .poll(async () =>
      (await diagnostics(page)).emissive.every((n: number) => n === 0),
    )
    .toBe(true);
  await openSection(page, '.atmosphere');
  await page.getByRole("button", { name: "☀ 白天", exact: true }).click();
  expect((await diagnostics(page)).night).toBe(true);
  await openSection(page, '.atmosphere');
  await page.getByLabel("动态壁纸").selectOption("grid");
  expect((await diagnostics(page)).wallpaper).toBe("grid");
  await openSection(page, '.atmosphere');
  await page.getByLabel("屏幕亮度").fill("0.35");
  await expect
    .poll(async () => (await diagnostics(page)).screenBrightness)
    .toBe(0.35);
  await page.getByRole("button", { name: "保存方案", exact: true }).click();
  await page.reload();
  await expect(page.getByText("场景就绪 · 原创参数化模型")).toBeVisible({ timeout: 30000 });
  await expect(page.getByLabel("灯光模式")).toHaveValue("off");
  await expect(page.getByLabel("屏幕亮度")).toHaveValue("0.35");
  await page.locator('[data-instance="desk"]').click();
  await expect(page.getByLabel("切换型号")).toHaveValue("desk-wide");
  await expect(
    page.getByRole("button", { name: "黑蓝", exact: true }),
  ).toHaveClass(/chosen/);
});
test("导入错误、预览取消、合并与兼容检查", async ({ page }) => {
  await ready(page);
  await openSection(page, '.tools-menu');
  await page.getByRole("button", { name: "↓ 导入目录" }).click();
  await page.getByLabel("选择 JSON 文件").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });
  await expect(page.locator(".error-text")).toBeVisible();
  await page.getByLabel("选择 JSON 文件").setInputFiles({
    name: "catalog.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(catalog)),
  });
  await expect(page.getByText("已验证，尚未应用")).toBeVisible();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "方案检查", exact: false }).click();
  await expect(page.getByText("信息未齐，不能确认完全兼容")).toBeVisible();
});
test("移动端与 WebGL 失败仍可配置", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${dir}/mobile.png`, fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "组件目录", exact: true }).click();
  await page.locator('[data-instance="cpu"]').click();
  await page.getByRole("button", { name: "详情与检查", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ryzen 7 9800X3D" }),
  ).toBeVisible();
  await page.goto("/?noWebGL#studio");
  await page.getByRole("button", { name: "3D 空间", exact: true }).click();
  await expect(page.getByText(/3D 暂不可用/)).toBeVisible();
  await page.getByRole("button", { name: "组件目录", exact: true }).click();
  await page.locator('[data-instance="mouse"]').click();
  await page.getByRole("button", { name: "详情与检查", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "云翼无线鼠标" }),
  ).toBeVisible();
});
