import { test, expect } from "@playwright/test";
test("中文首页按需加载，入口可达", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "script") scripts.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "先看见， 再组装。" }),
  ).toBeVisible();
  expect(
    scripts.some((url) => /\/scene\/engine|\/three(?:-|\/)/.test(url)),
  ).toBe(false);
  await page.getByRole("link", { name: "浏览配件", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "搜索配件" })).toBeVisible();
});
test("筛选、比较上限与规格展示", async ({ page }) => {
  await page.goto("/#parts");
  await page.getByRole("button", { name: "机箱 8", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "比较 FROST 全景海景房", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "比较 FROST XL · 加高演示款", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "比较 3500X · 白色", exact: true })
    .check();
  await expect(
    page.getByRole("checkbox", { name: "比较 3500X · 黑色", exact: true }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "开始比较 →", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "已选 3 个型号" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "285 × 480 × 450", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "按录入尺寸等比例显示的配件方体，可拖动旋转",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/portal-2026-10-21/compare-desktop.png",
  });
});
test("双屏替换与预算弹窗使用同一方案", async ({ page }) => {
  await page.goto("/?noWebGL#parts");
  await page.getByRole("button", { name: "显示器 1", exact: true }).click();
  await page
    .getByRole("button", { name: "应用到方案 ＋", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "请选择同类别的替换目标",
  );
  await page
    .getByRole("combobox", { name: "冰境 27 · QHD 180Hz 替换位置" })
    .selectOption("monitor-2");
  await page
    .getByRole("button", { name: "应用到方案 ＋", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("已将 monitor-2");
  await page.getByRole("button", { name: "用户预算估值 ¥ 0" }).click();
  const dialog = page.getByRole("dialog", { name: "方案预算" });
  await dialog
    .getByRole("spinbutton", { name: "冰境 27 · QHD 180Hz 预算" })
    .nth(1)
    .fill("1800");
  await dialog.getByRole("heading", { name: "方案预算" }).click();
  await expect(dialog).toContainText("用户预算估值：¥ 1,800");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "用户预算估值 ¥ 1,800" }),
  ).toBeFocused();
});
test("模组开关保存后恢复，原有工作台可达", async ({ page }) => {
  await page.goto("/?noWebGL#modules");
  await page.getByRole("checkbox", { name: "启用夜间氛围模组" }).check();
  await page.getByRole("checkbox", { name: "启用主机灯光模组" }).uncheck();
  await page.getByRole("button", { name: "保存当前模组设置" }).click();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "启用夜间氛围模组" }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "启用主机灯光模组" }),
  ).not.toBeChecked();
  await page.getByRole("link", { name: "进入 3D 工作台" }).click();
  await expect(page.getByRole("button", { name: "保存方案" })).toBeVisible();
});
test("中文首页和选件手机布局无横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: "output/portal-2026-10-21/home-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "配件库", exact: true }).first().click();
  await page.getByRole("textbox", { name: "搜索配件" }).fill("MSI");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "output/portal-2026-10-21/parts-mobile.png" });
  await expect(
    page.getByRole("heading", {
      name: "RTX 5070 Ti 16G GAMING TRIO OC WHITE",
      exact: true,
    }),
  ).toBeVisible();
});
test("首页与模组实际桌面截图", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.screenshot({ path: "output/portal-2026-10-21/home-desktop.png" });
  await page
    .getByRole("link", { name: "模组中心", exact: true })
    .first()
    .click();
  await page.screenshot({
    path: "output/portal-2026-10-21/modules-desktop.png",
  });
  await page.getByRole("link", { name: "配件库", exact: true }).first().click();
  await page.screenshot({ path: "output/portal-2026-10-21/parts-desktop.png" });
});
