import { catalog } from "../src/data/catalog.ts";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("public", { recursive: true });
writeFileSync("public/catalog.json", JSON.stringify(catalog, null, 2), "utf8");
const header =
  "product_id,brand,series,model,category,sku_id,sku_label,official_color,release_date,marketing_year,status,width_mm,height_mm,depth_mm,specs_json,source_ids,asset_id";
const row = [
  "desk",
  "测试规格",
  "原创演示",
  "冰原电竞桌 280",
  "桌子",
  "desk",
  "冰原电竞桌 280",
  "",
  "",
  "",
  "demo",
  "2800",
  "750",
  "900",
  "{}",
  "",
  "desk",
];
writeFileSync(
  "public/catalog-template.csv",
  "\uFEFF" +
    header +
    "\r\n" +
    row.map((v) => '"' + v.replaceAll('"', '""') + '"').join(",") +
    "\r\n",
  "utf8",
);
console.log(
  `已导出 ${catalog.products.length} 个产品 / ${catalog.skus.length} 个 SKU`,
);
