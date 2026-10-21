# 霜境 · 中文装机与空间工作台

独立中文本地应用。Vue 3 + TypeScript + Vite + Pinia + Three.js；不需要后端和账号。新增首页、配件筛选、三型号规格/3D 尺寸比较、模组中心；原有 3D 工作台保留在 `/#studio`。本轮范围与 REA 接入见 [中文工作台说明](docs/BUILDCORES_CN.md)。下文早期说明保留历史边界，以本轮说明为准。

## 启动

在 PowerShell 执行（Node.js 22.12+，本次环境 Node 24.14）：

```powershell
Set-Location 'projects/frost-studio'
npm ci
npm run dev
```

打开 http://127.0.0.1:5178 。只监听本机；端口占用会明确报错，不自动换端口。

```powershell
npm run build
npm test
npm run test:e2e
node scripts/export-catalog.mjs
```

浏览器测试使用电脑已安装的 Chrome；没有 Chrome 时安装 Playwright Chromium 并移除 playwright.config.ts 中的 channel 配置。构建输出为 dist。依赖锁在 package-lock.json，`npm ci` 重现版本。没有自动 Git 提交、推送、发布。

## 使用

- 左侧是当前空间实例目录，可按类别、品牌、发布日期和官方颜色筛选。点选实例后，在右侧切换该类别的 SKU 或自定义颜色；桌子与机箱各提供两种不同尺寸的示例 SKU。
- 中间左键旋转、滚轮缩放、右键平移；触屏单指旋转、双指缩放/平移。四个视角平滑切换，手动拖动可中断。
- 主机内部可独立选择 CPU、主板、显卡、内存套装（可见两条）、SSD、电源、水冷、风扇和灯带。拆装只为结构示意，不是维修教程。
- 隐藏侧板、调整爆炸进度、灯光、日夜、屏幕亮度、原创壁纸。遵循系统“减少动态效果”。
- “保存方案”保存到当前浏览器 localStorage；刷新恢复目录与配置。重置只重置当前状态，点击保存后才覆盖旧存档。损坏或版本不支持时明确提示并保留原始存档。
- JSON 导入先校验并预览，再选择合并或替换；同 ID 合并覆盖。替换缺少当前使用 SKU 时拒绝。模型链接会产生远程 GET 请求，默认没有外部资源。
- `public/catalog.json` 为可导入目录，`public/catalog-template.csv` 是 UTF-8 BOM 字段模板。**本期未实现 CSV 导入器**，字段解释见 docs/DATA.md。
- 移动端先显示 3D，通过顶部标签切换目录与详情。

## 默认方案与真实性

9800X3D / MSI RTX 5070 Ti 16G GAMING TRIO OC WHITE / MSI MPG B850 EDGE TI WIFI / DDR5 64GB（32×2）/ NVMe 2TB / 白色 850W 全模组 / 360 水冷 / 双 27 英寸 QHD 演示显示器。后续部件均为**测试规格，未指定可购买 SKU**。CPU、主板和显卡仅部分字段有官方来源；BIOS、价格、其他具体搭配仍需核验。

联想使用官方商品页对应的“拯救者 R9000P 2026 冰魄白”SKU **83QC0003CD**（机型 LEGION R9000P ADR10M）：Ryzen 9 8945HX、RTX 5060 Laptop 8GB、16GB DDR5 单条、1TB SSD、16 英寸 2560×1600 / 240Hz。官方页面提供约 2.5kg、厚度约 21.9—26.7mm，但没有核验完整长宽尺寸、发布日期、USB-C 视频和 PD 能力，这些仍留空。场景采用原创白色笔记本示意模型。营销年份不代表发布日期；当前仅 CPU 有核验发布日期 2024-11-07，其他未知日期单列，不假装全部是近三年发行产品。

没有全网爬虫、全平台笔记本数据库、实时报价或官方精确模型。没有可靠报价就显示暂无报价。预算是用户估值。兼容性包含未知项时不显示完全兼容；演示数据参与规则时仅作为条件演算。

## 目录与状态流

```text
src/data/catalog.ts          目录种子、默认实例与预设
src/domain/schema.ts         七类实体、严格导入 Schema
src/domain/compatibility.ts  13 项规则、报价、功耗
src/domain/storage.ts        保存验证与恢复
src/store.ts                 Pinia 单一配置源
src/components/              目录、详情、导入、3D 生命周期
src/scene/models.ts           参数化桌搭和家具
src/scene/pc.ts               安装锚点与绝对爆炸插值
src/scene/room.ts             房间、落地窗、原创远景
src/scene/engine.ts           渲染、光照、射线、相机
src/scene/assets.ts           GLB/GLTF 扩展入口
tests/logic/ tests/browser/   逻辑与真实浏览器测试
output/playwright/            截图、测量与浏览器结果
```

UI 修改 Pinia → SceneView 监听 → 渲染引擎更新；射线点击返回实例 ID → 同一 Pinia 选中状态 → 列表/面板同步。存储恢复在场景创建之前，无启动默认值自动覆盖。

## 扩展规范

新增产品时分别添加 Product、SKU、来源和 ModelAsset；不能把不同笔记本配置拼到同一 SKU。字段、单位、支持来源必须一致，再运行 `node scripts/export-catalog.mjs` 更新交付 JSON。导入只允许 schema.ts 列出的字段；添加参数同时扩展 Schema、规则与测试。

新增规则在 compatibility.ts 的 rules 中声明依赖字段、判断和建议，为正常/冲突/缺失数据补测试。具体 BIOS 必須由官方支持列表验证，不能从 AM5 自动推导；供电和视频能力不能从 USB-C 外形推导。

模型世界单位为米、Y 向上、Z 朝房间入口。SKU dimensionsMm 顺序为宽/高/深。家具原点位于底面中心；电视原点是屏幕中心；桌面外设以桌面为基准。主机部件原点相对机箱锚点，动画仅用 home + offset × progress。部件尺寸与展示结构是近似；换机箱时当前原型缩放内部演示装配，不代表真实机械装配验证。

GLB/GLTF 可填入资产 URL（HTTP/HTTPS）并声明授权与精度；保持米制、Y 向上、原点规范。默认不加载 Draco/KTX2；当资源确实压缩时再增加解码器。远程模型失败会保留参数化模型。不要填入来源不明的版权资源。

## 实现边界

已实现核心本地工作台、房间家具桌搭、四视角、双屏独立选择、颜色、结构拆装、灯光、兼容规则、导入、保存、响应式和错误降级。场景渲染延迟加载、像素比限流、少量阴影、共享几何和键帽实例化、单一循环与页面后台暂停。

部分实现：参数化模型精度、通道/线材实际布置、镜头碰撞（仅地面/俯仰/目标范围限制）。房间扩容不自动重排家具；不提供完整物理碰撞或任意产品机械装配保证。只有测试桌子和机箱有备选 SKU，其他类别需导入目录。两条内存支持独立选中，型号/颜色/计价仍作为套装整体管理。

不在本期：账号、支付、云数据库、爬虫、全部品牌型号、精确数字孪生、物理仿真、CSV 导入器。

具体真实测试结果及未通过项见 [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)；来源/授权见 [docs/SOURCES.md](docs/SOURCES.md)。
# 2026-09-23 参考布局升级

本地开发预览 http://127.0.0.1:5178/ ，生产构建预览 http://127.0.0.1:5179/ 。新增山景/海景、沉浸预览、产品库和参考布局恢复。

当前交付范围与真实测试记录见 [本轮验收](docs/ACCEPTANCE-V2.md)，部署见 [部署说明](docs/DEPLOYMENT.md)。图形仍为简化参数化 3D，全网全量商品库尚未完成；下方早期说明保留为历史版本信息。
