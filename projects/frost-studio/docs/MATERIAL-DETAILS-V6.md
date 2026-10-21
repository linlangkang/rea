# 桌搭与主机材质细节 · 2026-09-28

本轮修改现有场景，不修改配置、兼容性、保存恢复的数据结构。模型仍为原创参数化示意，不是厂商 CAD，也不是照片级成品。

## 已实施

- `src/scene/surfaces.ts`：喷涂表面与裸露拉丝金属分开；增加 PBT 键帽、橡胶、皮革、灯光扩散件材质。添加原创 128×128 程序化微表面法线与粗糙度纹理，数据贴图使用非颜色空间；保留已有木材、织物和石材贴图。
- `src/scene/models.ts`：键盘分出金属面板、橡胶垫层、键帽、独立灯座、字符、空格键和 USB 接口；鼠标增加分体按键、橡胶滚轮和侧键；耳机分出塑料外壳、耳垫、内衬、金属连接和头梁软垫。电竞椅补充缝线、调节件与扶手材料；桌面增加织物垫、边线与脚垫。
- `src/scene/hardware.ts`、`pc.ts`：风扇塑料框、橡胶减振角、扩散灯环；机箱涂层金属和玻璃材质。保留原有内部电路板、散热片、线束和紧固件。
- `src/scene/engine.ts`、`SceneView.vue`：增加开发环境材质检查机位；导出时展开实例网格，跳过隐藏的零缩放实例，适配 UE 导入。
- `scripts/check-material-details.mjs`：真实浏览器近景截图和资源、错误、渲染诊断。`scripts/export-unreal-room.mjs`：导出不含人物的房间 GLB，默认连接 5179。

## 验证与资源

- `npm test`：53 项通过；`npm run build`：通过，有大分包提醒。
- `npm run test:e2e`：16 项通过，报告在 `output/playwright/results.json`。测试服务退出阶段停滞，结束本次测试启动的 Vite 子进程后正常返回退出码 0；5179 预览保持运行。
- 网页近景位于 `output/material-details/`；UE 材质小样位于 `output/unreal/room-keyboard.png`、`room-pc.png`、`room-desk.png`。UE 最新地图路径以 `output/unreal/room-sample.json` 为准。
- 最终四个网页近景检查未发现 pageerror，所监测材质资源全部 ready。一次并行运行期间的资源等待超时，重跑成功；该次失败不计作通过。UE 桌面前后截图保存在 `output/material-details/ue-before/` 和 `ue-after/`，均为 1280×720。主机检查机位改至玻璃侧，仅移动相机。
- 本轮新增微表面、字符贴图为代码生成的原创资源，无新增第三方模型。既有 CC0 贴图沿用 `public/materials/` 中的授权记录；人物资源继续隔离在 LocalOnly。

## 仍有限制

键帽、耳罩和软垫还需要更贴近实物的曲面与结构。玻璃使用透明混合近似，不是完整折射。部分曲面 UV 尺度仍需校正。UE 小样保留导入时的静态发光外观，尚未接入网页运行时灯效控制；未启用 Lumen 或 DLSS。

当前自动化浏览器使用 Intel UHD 核显，近景截图中帧率有明显波动，不能据此宣称稳定流畅；截图采样也不是稳定基准测试。UE 使用独立显卡，不能直接拿两者帧率比较。
