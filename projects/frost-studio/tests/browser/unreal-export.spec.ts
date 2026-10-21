import { openSection } from './sections';
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('UE snapshot downloads real current configuration', async ({ page }) => {
  await page.goto('/#studio');
  const pending = page.waitForEvent('download');
  await openSection(page, '.tools-menu');
  await page.getByRole('button', {name:'导出 UE 配置',exact:true}).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('frost-unreal.json');
  const data = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(data.protocol).toBe('frost.unreal.snapshot');
  expect(data.instances.filter((i:any)=>i.category==='显示器')).toHaveLength(2);
  expect(data.source.preset.instances.length).toBe(data.instances.length);
  await download.saveAs('output/unreal/frost-unreal.json');
});
