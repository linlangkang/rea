import type { Catalog, Category, SKU } from '../domain/schema';
// Source-backed additions. Announcement years are not substituted for exact sale dates.
export function expandCatalog(c: Catalog) {
  const sources = [
    ['logi-pro-2024', 'https://news.logitech.com/press-releases/news-details/2024/Logitech-G-Launches-the-Next-Generation-of-PRO-Series-Mice-and-Keyboard-Designed-With-and-For-the-Worlds-Best-Esports-Athletes/default.aspx', ['label', 'officialColor', 'marketingYear']],
    ['corsair-3500', 'https://www.corsair.com/newsroom/press-release/corsair-launches-3500x-series-cases-merging-modern-design-with-great-performance', ['label', 'officialColor', 'marketingYear', 'specs.forms', 'specs.radiators']],
    ['samsung-evo', 'https://news.samsung.com/global/samsung-launches-990-evo-plus-ssd-with-best-in-class-performance-speeds-supported-by-pcie-4-0', ['label', 'marketingYear', 'specs.capacity', 'specs.ssdInterface', 'specs.ssdSize']],
    ['logi-g522', 'https://news.logitech.com/press-releases/news-details/2025/Level-Up-Your-Play-With-the-New-Logitech-G522-Gaming-Headset/default.aspx', ['label', 'marketingYear']],
  ] as const;
  for (const [id, url, fields] of sources) c.sources.push({id, url, fields: [...fields], checkedAt: '2026-09-23', type: 'official'});
  function add(id: string, category: Category, brand: string, model: string, year: number, source: string, colors: (string|null)[], specs: SKU['specs'] = {}) {
    c.products.push({id, category, brand, series: model, model});
    c.assets.push({id, generator: category, accuracy:'parametric', up:'Y', unit:'m', url:null, license:'本项目原创参数化示意模型，MIT；不代表品牌精确外观'});
    colors.forEach((color, n) => c.skus.push({id: `${id}-${n}`, productId:id, label:model + (color ? ` · ${color}` : ''), officialColor:color, releaseDate:null, marketingYear:year, status:'partial', dimensionsMm:null, specs, sourceIds:[source], assetId:id}));
  }
  add('dex', '鼠标', 'Logitech G', 'PRO X SUPERLIGHT 2 DEX', 2024, 'logi-pro-2024', ['白色', '黑色', '粉色']);
  add('pro2', '鼠标', 'Logitech G', 'PRO 2 LIGHTSPEED', 2024, 'logi-pro-2024', ['白色', '黑色', '粉色']);
  add('tkl-rapid', '键盘', 'Logitech G', 'PRO X TKL RAPID', 2024, 'logi-pro-2024', ['白色', '黑色', '粉色']);
  for (const variant of ['3500X', '3500X ARGB', 'iCUE LINK 3500X RGB'])
    add(variant.toLowerCase().replaceAll(' ', '-'), '机箱', 'CORSAIR', variant, 2024, 'corsair-3500', ['白色','黑色'], {forms:['Mini-ITX','mATX','ATX','EATX'], radiators:[360]});
  for (const capacity of [1000,2000,4000]) add(`evo-${capacity}`, '固态', 'Samsung', `990 EVO Plus ${capacity / 1000}TB`, 2024, 'samsung-evo', [null], {capacity, ssdInterface:'NVMe', ssdSize:'2280'});
  add('g522', '耳机', 'Logitech G', 'G522 LIGHTSPEED', 2025, 'logi-g522', [null]);
  for (const sku of c.skus.filter(s => ['dex', 'pro2'].includes(s.productId))) sku.releaseDate='2024-09-17';
}
