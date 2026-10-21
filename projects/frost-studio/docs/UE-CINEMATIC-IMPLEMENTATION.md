# 霜境 UE 写实桌搭实施记录

日期：2026-09-28。目标图为 `output/concepts/frost-cinematic-desk.png`，它是 AI 概念图，不作为运行结果。

## 已写入本项目

- `unreal/FrostRoom/Config/DefaultEngine.ini`：DX12、SM6、软件 Lumen 全局照明与反射、距离场及 TSR；硬件光追关闭。限制 Shader 编译并行度；不是 DLSS 集成。
- `unreal/FrostRoom/Content/Python/cinematic_room.py`：从最新验证关卡创建独立展示关卡；保持家具锚点一致；建立日光、窗边面积光和室内补光；固定曝光；三台相机；编译/加载完成后才预热与出图。
- 透明材质组件使用非 Nanite 渲染，包含材质实例的 Blend Mode 覆盖；原始资产不被覆盖。
- `public/materials/leather_white-*`：新增 1K 白皮革 DirectX 法线、粗糙度和授权记录。UE 为皮革创建独立材质，应用到椅垫与耳垫等匹配槽位；保留原始导入材质。
- `src/scene/models.ts`：椅背改为有肩腰收窄的软包曲面，中央靠垫、头枕使用软垫几何。原座面高度、椅子坐标和人物锚点不变。
- `unreal/render-cinematic.ps1`：实际运行 UE、出图并检查新报告与完成标志；`unreal/open-cinematic-room.ps1`：打开完成出图的最新可编辑关卡。

## 如何查看

在项目根目录运行 `powershell -File unreal/open-cinematic-room.ps1`。这会打开 UE 编辑器中的新关卡。点击视口后按 G 可切换编辑器辅助图标；它不删除相机或灯。图片由 SceneCapture 输出，不含编辑器图标。

重新制作出图：`powershell -File unreal/render-cinematic.ps1`。输出在 `output/unreal/cinematic/`，包含 hero、pc、keyboard 三张真实 UE 渲染。地图路径、材质槽数量、坐标检查、运行时渲染开关见 `report.json`。只有 `captureComplete=true` 才表示本次流程完成。

按用户最新要求，UE 保持开启。`editor_session.py` 在当前编辑器内接收项目 Saved 目录的本地请求，不监听网络端口。出图脚本复用当前进程，不再启动并退出批处理编辑器。旧采样脚本的自动退出也已移除；未保存关卡会拒绝新任务，避免覆盖用户编辑。已在同一个 PID 中实际完成一次重新出图并确认编辑器继续运行。

旧的 `open-latest-room.ps1` 仍指向 DX11 基础验证关卡，不代表本次展示效果。所有关卡均按时间命名保留；人物仍位于 LocalOnly，不随公共部署分发。

## 网络检索与实际采用

1. [Epic UE 5.7 Lumen 技术说明](https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-technical-details-in-unreal-engine?application_version=5.7)：软件 Lumen 需要 SM6 与网格距离场；细薄几何、透明体和骨骼网格有局限。本轮采用软件方案，不宣称人物享有完整硬件光追效果。
2. [Poly Haven Leather White](https://polyhaven.com/a/leather_white)，作者 Rob Tuytel，[CC0](https://polyhaven.com/license)：本轮实际下载法线和粗糙度，校验 MD5，来源见同目录 license JSON。源纹理元数据尺度约 3m×3m；UV 按已有米制映射接入，曲面密度仍需近景校验。
3. [Poly Haven 家具](https://polyhaven.com/models/furniture)、[Modern Arm Chair 01](https://polyhaven.com/a/modern_arm_chair_01)：已检索，造型不是所需电竞椅，未强行替代。
4. [Fab 资源市场](https://www.fab.com/o/about)、[Standard License](https://www.fab.com/eula)：已检索模型渠道。未购买、未下载任何付费或账户授权不明确的资产；不能把市场全部模型称为免费可再分发资源。
5. 官方机箱、显卡、桌椅和外设研究沿用 `output/concepts/素材参考与制作说明.md` 的链接。检索是有范围的候选筛选，不代表覆盖全网全部型号或最近三年全部产品。

## 验证与已知差距

网页构建与 53 项逻辑测试通过。椅背修改后运行四机位真实浏览器截图检查；此次未重跑完整 16 项浏览器套件，上一轮套件通过不能冒充本轮结果。

另定向运行 `studio.spec.ts` 的“型号尺寸、颜色、灯光、侧板、十次拆装与保存恢复”用例：1 项通过（42 秒）。测试配置支持 FROST_URL，以复用 5179 预览。

首轮 DX12 捕获出现未编译棋盘材质；已加入加载完成屏障。曾发现玻璃与 Nanite 不兼容，以及材质实例覆盖未被识别的问题；已按组件处理。UE 启动期间仍可能记录原始导入资产的警告，不能说日志完全无警告。

这是一轮真实工程升级，尚未达到概念图级别。机箱和外设仍是参数化模型，未达到厂商 CAD 精度；窗外为远景图，不具备真实近景视差；人物坐姿与椅子仍需逐点碰撞检查。本轮没有完成 Control Rig 行为动画、实时布料、Pixel Streaming、部署或打包成独立程序。网页仍由 Three.js 渲染，UE 出图不能被称为网页实时画质。没有测量稳定实时 FPS。

机器约 16GB 内存，开始时约 2.4GB 可用；运行期间更低。不要同时打开多个 UE 实例或大量高分辨率贴图。本轮采用 1K 新贴图和独立展示关卡，不关闭用户的其他应用。
