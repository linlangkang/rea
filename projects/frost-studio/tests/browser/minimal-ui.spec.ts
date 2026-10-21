import { test, expect } from "@playwright/test";
import { openSection } from "./sections";

test("简洁工具栏默认收起，所有装配、氛围和视角操作仍可到达", async ({
  page,
}) => {
  await page.goto("/?noWebGL#studio");
  await expect(page.locator(".scene-toolbar details[open]")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "拆解", exact: true }),
  ).not.toBeVisible();
  await openSection(page, ".assembly");
  await page.getByRole("button", { name: "拆解", exact: true }).click();
  await expect(page.getByLabel("爆炸进度")).toHaveValue("1");
  await openSection(page, ".atmosphere");
  await expect(page.locator(".assembly")).not.toHaveAttribute("open", "");
  await page.getByLabel("灯光模式").selectOption("white");
  await openSection(page, ".advanced");
  await page.getByLabel("画质", { exact: true }).selectOption("low");
  await page.keyboard.press("Escape");
  await expect(page.locator(".scene-toolbar details[open]")).toHaveCount(0);
  await expect(page.locator(".advanced > summary")).toBeFocused();
  await openSection(page, ".view-menu");
  await page.getByRole("button", { name: "窗边视角", exact: true }).click();
  await expect(page.locator(".view-menu > summary")).toContainText("窗边");
  await expect(page.locator(".view-menu > summary")).toBeFocused();
  await page.getByRole("button", { name: "保存方案", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("灯光模式")).toHaveValue("white");
  await expect(page.getByLabel("画质", { exact: true })).toHaveValue("low");
  await expect(page.getByLabel("爆炸进度")).toHaveValue("1");
  await expect(page.locator(".view-menu > summary")).toContainText("窗边");
});

test("移动端选中组件直接进入详情，产品库不产生横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?noWebGL#studio");
  await page.getByRole("button", { name: "组件目录", exact: true }).click();
  await page.locator('[data-instance="mouse"]').click();
  await expect(
    page.getByRole("heading", { name: "云翼无线鼠标", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "产品库", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "产品库", exact: true }),
  ).toBeFocused();
});
