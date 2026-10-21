import { openSection } from "./sections";
import { test, expect } from "@playwright/test";
test("参考布局、山海切换、沉浸预览及保存", async ({ page }) => {
  await page.goto("/#studio");
  await expect(page.getByText("场景就绪 · 原创参数化模型")).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole("button", { name: "沉浸预览", exact: true }).click();
  await expect(page.locator(".catalog")).not.toBeVisible();
  await openSection(page, ".atmosphere");
  await page.getByLabel("窗外景观").selectOption("coast");
  await expect
    .poll(async () =>
      page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .some((r) =>
            /\/environment\/optimized\/coast\.[a-f0-9]+\.webp/.test(r.name),
          ),
      ),
    )
    .toBe(true);
  await page.waitForTimeout(1800);
  await page.screenshot({
    path: "output/playwright/reference-coast.png",
    fullPage: true,
  });
  await openSection(page, ".atmosphere");
  await page.getByLabel("窗外景观").selectOption("mountain");
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: "output/playwright/reference-mountain.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "退出沉浸" }).click();
  await page.getByRole("button", { name: "保存方案", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("窗外景观")).toHaveValue("mountain");
});
test("产品库筛选、来源、具体配置替换和关闭焦点", async ({ page }) => {
  await page.goto("/#studio");
  await page.getByRole("button", { name: "产品库", exact: true }).click();
  await page.getByLabel("产品库类别").selectOption("鼠标");
  await page.getByLabel("产品库年份").selectOption("2024");
  await page.getByLabel("产品库搜索").fill("DEX");
  const cards = page.locator(".library-grid article");
  await expect(cards).toHaveCount(3);
  await expect(cards.first().getByRole("link")).toHaveAttribute(
    "href",
    /news.logitech.com/,
  );
  await cards.first().getByRole("button", { name: "应用到场景" }).click();
  await page.getByRole("button", { name: "关闭产品库" }).click();
  await expect(
    page.getByRole("button", { name: "产品库", exact: true }),
  ).toBeFocused();
  await expect(page.locator('[data-instance="mouse"]')).toContainText(
    "PRO X SUPERLIGHT 2 DEX",
  );
  await page.getByRole("button", { name: "产品库", exact: true }).click();
  await page.getByLabel("产品库类别").selectOption("笔记本");
  await page.getByLabel("产品库年份").selectOption("2026");
  await expect(
    page.getByText("Legion 7a (16, 11)", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
