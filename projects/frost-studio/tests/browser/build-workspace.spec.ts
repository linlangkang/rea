import { test, expect } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
async function rename(page: any, name: string) {
  await page.locator(".build-name").click();
  await page.getByRole("textbox", { name: "方案名称", exact: true }).fill(name);
  await page.getByRole("button", { name: "确认名称", exact: true }).click();
}
test("独立主机渲染不创建房间，旋转缩放和 PNG 导出真实生效", async ({
  page,
}) => {
  const resources: string[] = [];
  page.on("request", (r) => resources.push(r.url()));
  await page.goto("/#build");
  await expect(
    page.getByRole("img", { name: "可旋转的 3D 主机装配", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect
    .poll(
      () => page.evaluate(() => (window as any).__frost?.diagnostics()?.mode),
      { timeout: 30000 },
    )
    .toBe("build");
  expect(
    resources.some(
      (u) =>
        u.includes("long_life_food") || u.includes("/environment/mountain"),
    ),
  ).toBe(false);
  const data: any = await page.evaluate(() =>
    (window as any).__frost.diagnostics(),
  );
  expect(
    data.layout.some((i: any) =>
      ["desk", "sofa", "tv", "fridge"].includes(i.id),
    ),
  ).toBe(false);
  expect(data.layout.find((i: any) => i.id === "case").position).toEqual([
    0, 0, 0,
  ]);
  await page.getByRole("button", { name: "自动旋转", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__frost.diagnostics().autoRotate),
    )
    .toBe(true);
  await page.getByRole("button", { name: "停止旋转", exact: true }).click();
  const before: any = await page.evaluate(
    () => (window as any).__frost.diagnostics().cameraPosition,
  );
  await page.getByRole("button", { name: "放大主机", exact: true }).click();
  const after: any = await page.evaluate(
    () => (window as any).__frost.diagnostics().cameraPosition,
  );
  expect(after).not.toEqual(before);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "导出图片", exact: true }).click(),
  ]);
  await mkdir("output/setup-2026-10-22", { recursive: true });
  await download.saveAs("output/setup-2026-10-22/exported-pc.png");
  expect(
    (await readFile("output/setup-2026-10-22/exported-pc.png")).byteLength,
  ).toBeGreaterThan(20000);
  await page.getByRole("button", { name: "复位视角", exact: true }).click();
  await page.screenshot({ path: "output/setup-2026-10-22/build-desktop.png" });
  await writeFile(
    "output/setup-2026-10-22/build-diagnostics.json",
    JSON.stringify(
      await page.evaluate(() => (window as any).__frost.diagnostics()),
      null,
      2,
    ),
  );
});

test("桌面全部主机控件首屏可用，手机隐藏画布后暂停渲染", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/#build");
  await expect(
    page.getByRole("button", { name: "导出图片", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Math.abs(
            (window as any).__frost.diagnostics().cameraPosition[0] - 0.85,
          ),
        ),
      { timeout: 10000 },
    )
    .toBeLessThan(0.01);
  const control = await page
    .getByRole("button", { name: "拆解主机", exact: true })
    .boundingBox();
  expect(control!.y + control!.height).toBeLessThan(720);
  await page.screenshot({
    path: "output/setup-2026-10-22/build-desktop-1280.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__frost.diagnostics().size[0]),
    )
    .toBeLessThan(390);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "output/setup-2026-10-22/build-mobile-webgl.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "配件清单", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__frost.diagnostics().rendering),
    )
    .toBe(false);
  await page.getByRole("button", { name: "3D 预览", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__frost.diagnostics().rendering),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});
test("更换机箱、拆装与房间模式共享真实配件，房间坐标保持原值", async ({
  page,
}) => {
  await page.goto("/#build");
  await page.getByRole("button", { name: "更换 机箱", exact: true }).click();
  await page.getByRole("button", { name: /FROST XL · 加高演示款/ }).click();
  await expect(page.locator(".build-part-list")).toContainText(
    "FROST XL · 加高演示款",
  );
  await page.getByRole("button", { name: "隐藏侧板", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__frost?.diagnostics().sidePanel),
    )
    .toBe(false);
  await page.getByRole("button", { name: "拆解主机", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__frost?.diagnostics().explosion),
    )
    .toBe(1);
  await page.getByRole("button", { name: "合拢主机", exact: true }).click();
  await page.getByRole("link", { name: "房间模式", exact: true }).click();
  await expect
    .poll(
      () => page.evaluate(() => (window as any).__frost?.diagnostics().mode),
      { timeout: 30000 },
    )
    .toBe("room");
  const diagnostic: any = await page.evaluate(() =>
    (window as any).__frost.diagnostics(),
  );
  expect(diagnostic.layout.some((i: any) => i.id === "sofa")).toBe(true);
  expect(
    diagnostic.layout.find((i: any) => i.id === "case").position,
  ).not.toEqual([0, 0, 0]);
});
test("方案命名与独立复制；取消载入不会让下次保存覆盖另一方案", async ({
  page,
}) => {
  await page.goto("/?noWebGL#build");
  await rename(page, "原始方案");
  await page.getByRole("button", { name: "保存方案", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "保存方案", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("frost-build-plans-v1")!).plans.length,
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "复制方案", exact: true }).click();
  await expect(page.locator(".build-name")).toContainText("原始方案 副本");
  await page
    .getByRole("button", { name: "我的方案", exact: true })
    .last()
    .click();
  await page
    .locator(".build-saved")
    .filter({ has: page.getByText("原始方案", { exact: true }) })
    .getByRole("button", { name: "预览载入" })
    .click();
  await page.getByRole("button", { name: "保留当前方案" }).click();
  await rename(page, "副本已更新");
  await page.getByRole("button", { name: "保存方案", exact: true }).click();
  const names = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("frost-build-plans-v1")!).plans.map(
      (p: any) => p.snapshot.preset.name,
    ),
  );
  expect(names.sort()).toEqual(["副本已更新", "原始方案"].sort());
});
test("分享链接先预览，不自动覆盖存档，接受后才载入", async ({
  page,
  context,
}) => {
  await page.goto("/?noWebGL#build");
  await rename(page, "保存原方案");
  await page.getByRole("button", { name: "保存方案", exact: true }).click();
  await rename(page, "分享测试方案");
  await page.getByRole("button", { name: "分享链接", exact: true }).click();
  const link = await page
    .getByRole("textbox", { name: "方案分享链接" })
    .inputValue();
  const destination = new URL(link);
  destination.search = "?noWebGL";
  const other = await context.newPage();
  await other.goto(destination.toString());
  await expect(
    other.getByRole("dialog", { name: "载入方案预览" }),
  ).toContainText("分享测试方案");
  await expect(other.locator(".build-name")).toContainText("保存原方案");
  await other.getByRole("button", { name: "载入到当前工作台" }).click();
  await expect(other.locator(".build-name")).toContainText("分享测试方案");
  expect(
    await other.evaluate(
      () => JSON.parse(localStorage.getItem("frost-studio-v1")!).preset.name,
    ),
  ).toBe("保存原方案");
  await other.close();
});
test("手机装机页与配件面板无横向溢出，WebGL 失败仍可配置", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?noWebGL#build");
  await expect(page.getByText(/3D 暂不可用/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "output/setup-2026-10-22/build-mobile.png" });
  await page.getByRole("button", { name: "配件清单", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "更换 显卡", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "output/setup-2026-10-22/build-mobile-parts.png",
  });
});
