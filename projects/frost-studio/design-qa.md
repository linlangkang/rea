# 具体配置页延续 QA — 2026-10-22

final result: passed

范围：用户确认的独立中文版，参考 BuildCores 配置页功能与布局，保留霜境品牌、原创参数化主机及现有配件。这里的通过指本轮页面质量和交互，不代表下面历史房间参考图的照片级目标已经完成。

## 源与实现证据

- 源：`output/setup-2026-10-22/reference-initial.png`，已加载主机的公开配置页，1280×720 CSS px、1280×720 图片，密度 1；`reference-desktop.png` 为另一次 1280×900 采集，该图主机尚在加载，不作为主机完成画面的依据。
- 实现：`output/setup-2026-10-22/build-desktop-1280.png`，`/#build`，1280×720 CSS px、1280×720 图片，密度 1。源站黑色 Intel 商品、霜境冰白 AMD 参数模型及两种品牌主题是已确认的差异。
- 同一输入的完整并排：`comparison-desktop.png`，2560×760，其中上方 40px 是证据标签。已实际打开对照。
- 可读细节对照：`comparison-summary.png`，从实际源和实现裁出方案标题、摘要、分享/导出操作区域，保留密度 1、未拉伸；区域宽度不同，不做像素差异百分比声明。
- 手机：`comparison-mobile.png`，两边均 390×844 首屏裁图、密度 1。源的完整截图 `reference-mobile.png` 是 390×2942；实现 `build-mobile-webgl.png` 为 390 宽长图。源在手机截图时 3D 区域未出现主机，已记录为源状态限制，未据此推断源站移动渲染行为。另检查实现清单与 WebGL 失败降级截图。
- 导出：已打开检查 `exported-pc.png`，真实 PNG 来自用户当前缩放后的画布；未作为默认视角参考图。

## 发现、修复与复核

- [P2，已修复] 初版 `build-desktop.png` 的画布按固定高度显示，短桌面视口的模型控件落在首屏以外。现改为随视口高度调整，右侧清单独立滚动；复核 `build-desktop-1280.png`，拆装/灯效/画质全部可见，浏览器断言控件底部小于 720px。
- [P2，已修复] 相机按钮和导出在首次 GPU 初始化期间看似可用。现以渲染就绪事件控制禁用状态；实际浏览器完成旋转、缩放、真实 PNG 下载后复核。
- [P2，已修复] 手机切到清单时，隐藏画布仍可能继续渲染。现由 IntersectionObserver 与页面可见性统一控制一个动画循环；真实浏览器验证切走 rendering=false，返回 rendering=true。
- 功能边界：不借用源站“Compatible”、美元报价和跑分作为本项目的确认结果；已核验不足时明确显示未知，不兼容结果单独显示。商品缩略图使用既有类别图标，不冒充精确商品图片。

## 五项视觉检查

- 字体：沿用霜境系统中文字体，标题、主数值、型号和操作层级清楚；品牌与 SKU 保留原名。未宣称与源站 Inter 等宽匹配。
- 间距：桌面保留左导航、上摘要、中央主机、右部件组织；取消广告区域，以视口适配保持短屏主操作可见。390px 无横向溢出，手机摘要为两列。
- 颜色：白/蓝独立品牌、浅灰画布与分隔一致；待核验用黄色，不兼容用红色。与源站黑/粉主题的差异符合用户选择。
- 图像：主机有真实可旋转 WebGL、实际部件及导出画布，没有用参考站截图替代模型；本项目参数化模型与精确商品模型仍有显著精度差异。
- 文案：操作、状态、弹窗为中文；来源未知、报价缺失、全方案预算与主机功耗范围分别说明，无会员、社区或购买的空操作。

## 验证及未覆盖

66 项逻辑测试与生产构建通过。完整浏览器回归 33 项首次 32 通过，1 项持久化测试将未结束的相机动画误计为保存造成的移动；改为减少动态的静态相机条件后，装机与优化 9 项定向复测全部通过。浏览器覆盖独立主机/房间共享配置、旋转缩放、拆装、侧板、PNG 下载、方案归档身份、复制、分享预览不自动持久化、手机暂停和 WebGL 失败降级。新增桌面/手机流程未捕获到 pageerror；其他原有流程结果保存在浏览器报告。

未做全量无障碍审计；瞬时 FPS 不代表跨设备或等画质的提升。模型、材质与真实装配精度属于后续资产工作，不将本轮功能验收替代照片级验收。无阻断的 P0/P1/P2 页面问题，保留模型精度作为明确的范围差异。

---

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
