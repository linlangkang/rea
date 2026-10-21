import {test,expect} from '@playwright/test';
import {catalog,defaultPreset} from '../../src/data/catalog';
import {openSection} from './sections';

test('纹理请求失败可配置保存，恢复资源后可重试',async({page})=>{
  await page.route('**/materials/**',r=>r.abort('failed'));
  await page.route('**/environment/**',r=>r.abort('failed'));
  await page.goto('/#studio');
  await expect(page.getByText(/资源加载失败（/)).toBeVisible({timeout:30000});
  expect(await page.evaluate(()=>(window as any).__frost.diagnostics().drawCalls)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'保存方案',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('已保存');
  await page.unroute('**/materials/**');await page.unroute('**/environment/**');
  await page.getByRole('button',{name:'重试场景'}).click();
  await expect.poll(()=>page.evaluate(()=>{
    const assets=(window as any).__frost?.diagnostics()?.assets;
    return !!assets && Object.keys(assets).length>0 && Object.values(assets).every(v=>v==='ready');
  }),{timeout:30000}).toBe(true);
  await expect(page.getByText('场景就绪 · 原创参数化模型')).toBeVisible({timeout:30000});
});

test('时间、独立电视壁纸、全屏、调试与保存恢复',async({page})=>{
  await page.goto('/#studio');await expect(page.getByText('场景就绪 · 原创参数化模型')).toBeVisible({timeout:30000});
  await page.getByRole('button',{name:'全屏 / 退出'}).click();
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
  await page.getByRole('button',{name:'全屏 / 退出'}).click();
  await openSection(page,'.advanced');
  await page.getByLabel('时间',{exact:true}).evaluate((el:HTMLInputElement)=>{el.value='21';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.getByLabel('布局调试').selectOption('bounds');
  await page.getByRole('button',{name:'保存方案',exact:true}).click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('frost-studio-v1')!).preset);
  expect(saved.timeOfDay).toBe(21);expect(saved.night).toBe(true);expect(saved.debug).toBe('bounds');
  expect(saved.wallpaper).toBe('photo');expect(saved.tvWallpaper).toBe('coast');
  await page.reload();await expect(page.getByText('场景就绪 · 原创参数化模型')).toBeVisible({timeout:30000});
  expect(await page.evaluate(()=>(window as any).__frost.diagnostics().timeOfDay)).toBe(21);
});

test('旧布局迁移保留配件与配色，不自动覆盖原存档',async({page})=>{
  const preset=defaultPreset();preset.layoutVersion=1;preset.instances[0].customColor='#abc123';
  const raw=JSON.stringify({preset,catalog});
  await page.addInitScript(value=>localStorage.setItem('frost-studio-v1',value),raw);
  await page.goto('/#studio');await expect(page.getByRole('status')).toContainText('迁移到修正布局');
  expect(await page.evaluate(()=>localStorage.getItem('frost-studio-v1'))).toBe(raw);
  await page.getByRole('button',{name:'保存方案',exact:true}).click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('frost-studio-v1')!).preset);
  expect(saved.layoutVersion).toBe(2);expect(saved.instances[0].skuId).toBe(preset.instances[0].skuId);
  expect(saved.instances[0].customColor).toBe('#abc123');
});
