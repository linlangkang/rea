# 来源与模型授权

核验窗口：2026-09-22—23。只有在以下网页中直接可见的字段进入来源覆盖。来源对象的 fields 是字段级证据，不能以一个来源链接证明整份 SKU。

- MSI [RTX 5070 Ti 16G GAMING TRIO OC WHITE 规格](https://www.msi.com/Graphics-Card/GeForce-RTX-5070-Ti-16G-GAMING-TRIO-OC-WHITE/Specification)：具体桌面版 SKU、白色、338×140×50mm（数据存宽/高/深重新排列）、300W、16-pin、建议 750W、3 DP + 1 HDMI。不是 RTX 5070 或笔记本显卡。
- MSI [MPG B850 EDGE TI WIFI 规格](https://www.msi.com/Motherboard/MPG-B850-EDGE-TI-WIFI/Specification)：AM5、DDR5、4 槽、最大容量、ATX、M.2 支持。页面底部混有其他平台模板文字，未据此推断 CPU 支持列表或 BIOS。具体 BIOS 保留未知。
- AMD [Ryzen 7 9800X3D](https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-7-9800x3d.html)：产品名、AM5 与 120W TDP。TDP 不是实际峰值。
- [联想官方商品详情](https://item.lenovo.com.cn/product/1054215.html)：商品编号 **83QC0003CD**、机型 LEGION R9000P ADR10M、冰魄白、8945HX、RTX 5060 8GB、16GB（16×1）DDR5、1TB、16 英寸 2560×1600 / 240Hz、约 2.5kg、厚约 21.9—26.7mm。商品页写有 USB-C×2 与 HDMI，但没有证明 USB-C 的视频/PD 能力，因此兼容检查仍为未知。未核验完整长宽或发布日期。检索页存在不同价格和配置条目，未混用其价格或其他 SKU 的参数；页面动态价格未可靠取得，报价仍为空。

测试规格的桌椅、显示器、内存、SSD、电源、水冷等没有伪造官方来源，不用于采购保证。默认两台 27 英寸 2560×1440、180Hz 是演示规格，后续必须换成确切型号再核验。

最初版本的默认 3D 几何、线条、房间远山与屏幕动态壁纸由本项目生成；后续下载资源按下列记录分别授权。产品名称只用于识别，外形模型并非官方授权精确还原。第三方依赖沿用各自许可证。

实现参考官方文档：[Vue](https://vuejs.org/guide/quick-start)、[Vite](https://vite.dev/guide/)、[Three.js](https://threejs.org/docs/)。

2026-10-01 环境精修新增：[ambientCG Marble012](https://ambientcg.com/view?id=Marble012)，提供方 ambientCG，CC0。使用 1K Color、NormalGL 与 Roughness；官方标注为程序化 PBR 材质。文件与授权记录见 `public/materials/marble012-license.json`。上述早期“未下载资源”描述仅对应最初版本；现有其他纹理各自保留 `public/materials/*-license.json`。新增植物、花盆与生活物件几何仍由本项目生成。

2026-10-01 V12：
- Long Life Food：https://polyhaven.com/a/long_life_food；作者 Mia Pecina Zorko，Poly Haven，CC0。实际使用 public/models/long-life-food 的 GLTF/BIN 与 1K JPG 贴图；source.json 保留官方元数据。
- Kenney Food Kit：https://kenney.nl/assets/food-kit，CC0；仅检索，未下载或使用。
- 品牌外形参考：https://www.coca-cola.com/cn/zh/brands/coca-cola 、https://www.coca-cola.com/cn/zh/brands/minute-maid 、https://www.nestle.com.cn/brands/confectionery-a/confectionery_01 、https://www.masterkong.com.cn/ 、https://www.samsclub.com/browse/Candy-%26-Snacks/1455 。包装文字和图形为本项目自绘示意，未使用这些网站图片作为贴图；未核验完整中国山姆 SKU。品牌参考不等于获得品牌模型授权。

2026-10-21：新增原有贴图与 HDR 的离线运行版本，来源、格式和转换方式在 `public/licenses/runtime-assets.json` 中记录，原始资源与许可文件保留。织物纱线颜色贴图是本项目生成，皮革/布料法线与粗糙度沿用现有 CC0 文件。Poly Haven API 与 ambientCG Fabric030 下载均遇到 HTTP 403，本轮未新增下载扫描材质。实施与实测范围见 `REALISM_OPTIMIZATION_2026-10-21.md`。
