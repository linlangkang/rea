---
id: frost.data
kind: rule-leaf
scope:
  paths: ["src/data/**", "src/domain/**", "src/store.ts"]
load_when: ["修改目录、来源、规则、导入或存储"]
---

Product、SKU、ProductSource、PriceQuote、ModelAsset、SceneInstance、BuildPreset 分离。单位由字段名确定；未知数据用 null 或缺失，不用零。

官网仅支持已查到的字段；来源必须记录字段覆盖和核验时间。演示规格、自定义颜色、预算不得冒充官方 SKU、官方颜色或市场报价。

兼容规则缺少输入返回未知；BIOS 和 USB-C 视频能力单独验证。功耗只包含 PSU 供电部件；双屏按两台，内存按套装一次计价。

JSON 导入采用白名单 Schema、大小限制、引用检查与预览。恢复先于任何保存，拒绝损坏或未知版本，目录删除不得留下悬空引用。
