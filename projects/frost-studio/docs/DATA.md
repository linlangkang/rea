# 数据与导入

顶层严格字段：schemaVersion=1、products、skus、sources、assets、quotes。完整例子为 public/catalog.json；它由 src/data/catalog.ts 导出，不要手工维护两个事实源。

实体职责：Product 记录品牌/系列/型号/类别；SKU 记录具体配置、官方颜色、尺寸、发布日期、营销年份与状态；ProductSource 保存链接、类型、核验时间及支持的字段；PriceQuote 保存平台/地区/币种/金额/采集时间/商品链接；ModelAsset 保存地址/授权/比例单位/上轴/精度/生成器；SceneInstance 保存独立实例 ID、SKU、数量、位置、旋转与自定义色；BuildPreset 保存配置、场景控制及版本。

规格数字单位：尺寸 mm；内存/SSD 容量 GB；功率/供电 W；刷新率 Hz；位置 m；旋转弧度；亮度、拆解进度 0—1。未知字段省略或用已声明可空值的 null，禁止用 0 代替未知。资产 URL 为 null 表示程序生成；用户导入远程 GLB 后以该 SKU 的实例锚点加载。

CSV 是数据整理模板，**不能直接导入**。product_id/sku_id/asset_id 为稳定英文 ID（字母、数字、下划线和短横线，1—64 字符）；brand/series/model/category 对应 Product；sku_label 对应 SKU 展示名；official_color 是已核验官方在售色；release_date 是 YYYY-MM-DD；marketing_year 是营销年份；status 为 verified/partial/demo/unknown；width_mm/height_mm/depth_mm 为实测或来源产品尺寸；specs_json 为 JSON 规格对象；source_ids 为来源 ID 列表。来源与授权另建实体，不允许仅填一个裸价格。

导入文件最大 2 MB。Schema 拒绝未知字段、危险协议、错误枚举、重复 ID、错误尺寸类型和悬空引用。合并按 ID 更新；替换会核验当前实例的 SKU。UI 将文字作为普通文本，不执行 HTML。合并/替换不自动保存，用户点击保存后持久化。

报价统计只汇总有来源链接与采集时间的报价，按实例数量计算。用户预算单独累计。当前报价列表为空。功耗计算只统计主机供电组件的 maxPower；缺少任何峰值参数则显示信息不足；有完整数据才按总峰值 ×1.25 计算带余量建议，不声称实测。
