# 中文装机入口 QA — 2026-10-21

Final result: passed — 仅针对本轮独立中文网页及功能入口，不表示下面历史房间参考图已经达到照片级效果。

用户确认使用自有品牌与素材，参考功能和布局。BuildCores 的黑/粉配色、商标、广告、用户数据和产品模型不属于复制目标；霜境白/蓝界面沿用用户此前的简洁界面要求。

## 对照证据

- 源站：`output/buildcores-reference/home-desktop.png`，1280×720；另检查 builder-desktop.png 与 parts-desktop.png。
- 实现：`output/portal-2026-10-21/home-desktop.png`，1280×900；用于首页首屏对照时裁为 1280×720，未缩放，密度归一为 1。
- 同一输入中的左右对照：`output/portal-2026-10-21/source-implementation.png`，2560×760，顶部 40px 为证据标签。已实际打开并检查，未把分开查看声称为并排比较。
- 实现细节：parts-desktop.png、compare-desktop.png、modules-desktop.png；移动端 home-mobile.png、parts-mobile.png，390×844。手机首页证据是完整长图，选件证据为视口截图。
- 比较状态：公开未登录首页；实现无需账号。源站与实现商品数据和主题有意不同，不做像素误差或视觉相似率声明。

## 发现、修复及复核

- [P2，已修复] 第四个比较项曾能保留原生勾选外观，但实际比较列表仍只有三项。现达到上限后禁用未选项；真实浏览器已验证第三项加入及第四项禁用。
- [P2，已修复] 初次打开时的“尚无本地保存”常驻提示遮住页面底部。首页现不显示正常初始化提示，只显示操作结果；复核截图已更新。
- [P2，已修复] 首页场景截图带有旧渲染器按钮/FPS 覆盖。已重新裁切本项目原始截图，去除旧 UI；复核图使用真实截图并明确为参数化场景。

## 五项视觉检查

- 字体：源站 Inter 的标题层级转为系统中文字体；标题、正文、细小来源标签均可读。中文两行标题属于独立文案布局，品牌和 SKU 保留原名。
- 间距：保留左文右图、主次入口、预览信息浮层、快速方案卡片和选件清单的组织。桌面 1280×900、1600×1000 与手机 390×844 已检查，没有隐藏常驻控件的页面横向溢出。
- 颜色：白/蓝品牌、灰色分隔、来源与核验状态色统一；这是允许的独立品牌差异，不声称沿用源站黑/粉主题。
- 图片：使用霜境真实渲染的本地 WebP，非参考站产品图。配件类别图标是导航辅助，不冒充精确模型；3D 尺寸图明确使用尺寸方体。底层房间仍是参数化示意，不能据此宣称照片级材质。
- 文案：入口与操作为中文，产品名和 SKU 保留；未知尺寸、报价、功耗与规格显式保留未知，没有复制原站的用户量、模型量或性能/价格宣传。

## 交互与验证

`npm run build` 通过；`npm test` 62 项通过。完整浏览器回归 27 项通过（3.4 分钟），最后 UI 提示调整后新增页面六项再次通过。覆盖搜索、筛选、三项比较、WebGL 方体、双屏替换目标、预算、原生弹窗焦点/Escape、模组保存恢复、原工作台与手机无横向溢出。首页不请求 Three.js 引擎。

没有自动化无障碍全量审计，也没有实时价格、游戏 FPS、账户、支付或社区后端；这些不是已验证的产品能力。剩余非阻断差异是参数化模型与原站精确商品模型的精度差异，已在产品和交付范围中明确。

---

# 历史房间参考图 QA — 2026-09-23

Result: blocked

This result concerns photographic fidelity, not the passing functional acceptance tests. The requested spatial arrangement is implemented, but the current parametric scene does not reproduce the references at photographic quality. No claim of a pixel-perfect clone is made.

## Comparison inputs

- Reference mountain: `[本机路径，未公开]).png`
- Reference coast: `[本机路径，未公开]).png`
- Render mountain: `output/playwright/reference-mountain.png`
- Render coast: `output/playwright/reference-coast.png`
- Desktop workspace: `output/playwright/default.png`
- Mobile: `output/playwright/mobile.png`

Reference coast and rendered coast were inspected together. Desktop viewport 1600×1000, medium quality, daytime, default camera, immersive mode. Screenshots include the page controls below the canvas. IAB also checked the production build at 127.0.0.1:5179 and the development build at 5178. Mobile test viewport 390×844.

## Implemented and verified

Left glazing and workstation; central sofa facing right-side TV; fridge and cabinet at rear right; entrance-side bed; two outdoor landscape options. Added ceiling after the first screenshot exposed an open sky gap. Reduced overexposure. Kept camera orbit, independent selection, live model replacement, explosion animation, lighting and persistence working. No room photograph substitutes for the 3D scene.

## Remaining visual differences

- Furniture uses rounded parametric solids, without fabric folds, upholstery seams, detailed cushions or industrial product geometry.
- Plants are simplified geometry; the exterior is two image planes, not a continuous 360-degree environment.
- Material response, indirect lighting, cove detailing, balcony furnishings and rug pattern differ from the reference.
- Room proportions are a configurable 8×8×3 m test space, not dimensions inferred as fact from a generated image.

These need a dedicated detailed asset/material pass before photographic fidelity can pass QA. Functional test success does not remove these differences.
