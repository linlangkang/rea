# 霜境 Unreal 房间工程

本工程与 Vue / Three.js 网页共享房间配置、物体坐标和相机约定。2026-10-02 按用户要求移除阮·梅：项目内模型副本、人物导入脚本、网页加载和人物控制已删除；房间地图中的人物引用由 remove_project_character.py 清理。

## 房间工作流

1. 网页导出 frost-unreal.json，将快照放到 FrostRoom/Saved/frost-unreal.json。
2. 使用 FrostRoom/FrostRoom.uproject，UE 5.7。
3. import_layout.py 创建布局锚点；import_room.py 导入网页房间底稿；room_sample.py 校验坐标并创建房间小样。
4. cinematic_room.py 处理室内光照、材质、冰箱及展示镜头，不再导入人物。
5. 保留现有编辑器会话，避免反复开关。编辑器已打开时在其 Python 控制台执行脚本。

本地脚本入口：./unreal/run-editor-script.ps1 -Script import_layout（或 import_room、room_sample）。
房间模型导出：node scripts/export-unreal-room.mjs。
打开已有房间：./unreal/open-latest-room.ps1。

世界约定：网页使用米、Y 向上；UE 使用厘米、Z 向上。UE X=-Web Z，UE Y=Web X，UE Z=Web Y。所有相机共用家具坐标。
材质来源与授权记录保存在 public/materials/*-license.json。

## 人物删除记录

FrostRoom/Saved/character-removal-report.json 记录已检查地图、移除演员、删除资产及失败项。
用户外部原始目录 [本机路径，未公开]

## 限制

编辑器 Python 用于资产制作；尚不能将文件快照交接称为网页实时串流。旧的 DX11 / HDRI 验证也不代表已启用 Lumen、DLSS 或达到照片级效果。
