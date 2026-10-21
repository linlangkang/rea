# 霜境 3D 配置器

本目录是独立的 Vue 3 / Vite / TypeScript 工程，与父目录的商水同城业务无关。用户最新任务优先；完整产品要求保存在 [docs/REQUEST.md](docs/REQUEST.md)。

仅本地开发测试。保留无关修改，不自动提交、推送或发布。沿用 npm 和 package-lock.json。

产品目录、业务规则、Pinia 状态、UI 和 Three.js 渲染分别维护。配置只有一个状态源；交互控件必须实际改变场景或业务状态。

按修改范围读取对应规则，文档修改不必读取无关叶子：

| 范围 | 规则 |
| --- | --- |
| 产品、来源、兼容性、存储、导入 | [.agents/data.md](.agents/data.md) |
| 场景、相机、交互、动画、UI | [.agents/scene.md](.agents/scene.md) |

最小验证：逻辑修改运行 `npm test`，交付前运行 `npm run build`；交互改动运行 `npm run test:e2e`。记录未测试项，不把构建通过当成交互验收。
