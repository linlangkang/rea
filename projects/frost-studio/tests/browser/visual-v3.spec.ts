import { openSection } from './sections';
import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test('视觉升级验收与同机位记录',async({page})=>{
  test.setTimeout(180000);
  const errors:string[]=[]; const requests:unknown[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(/environment|materials/.test(r.url())) requests.push({url:r.url(),status:r.status()});});
  await page.goto('/#studio');
  await expect(page.getByText('场景就绪 · 原创参数化模型')).toBeVisible({timeout:30000});
  await page.getByRole('button',{name:'沉浸预览',exact:true}).click();
  await page.waitForTimeout(2500);
  mkdirSync('output/visual-v3',{recursive:true});
  if(process.env.FROST_BASELINE){
    await page.screenshot({path:'output/visual-v3/before.png'});
    writeFileSync('output/visual-v3/before.json',JSON.stringify({requests,errors,diagnostics:await page.evaluate(()=>(window as any).__frost.diagnostics())},null,2));return;
  }
  await expect.poll(async()=>page.evaluate(()=>Object.values((window as any).__frost.diagnostics().assets).every(x=>x==='ready')),{timeout:30000}).toBe(true);
  const layout=await page.evaluate(()=>(window as any).__frost.diagnostics().layout);
  await page.evaluate(()=>(window as any).__frost.captureCamera());
  await page.waitForTimeout(300);
  await page.screenshot({path:'output/visual-v3/after-same-camera.png'});
  const readings=[];
  for(const [button,file] of [['默认视角','entrance'],['床品近景','bedding'],['桌面特写','desk'],['沙发近景','lounge'],['房间全景','overview'],['窗边视角','window']]){
    if(['床品近景','沙发近景','窗边视角'].includes(button))await openSection(page,'.view-menu');
    await page.getByRole('button',{name:button,exact:true}).click();await page.waitForTimeout(1700);
    await page.screenshot({path:`output/visual-v3/${file}.png`});
    expect(await page.evaluate(()=>(window as any).__frost.diagnostics().layout)).toEqual(layout);
    readings.push({view:file,fps:await page.locator('.scene-badge').textContent(),diagnostics:await page.evaluate(()=>(window as any).__frost.diagnostics())});
  }
  await page.getByRole('button',{name:'默认视角',exact:true}).click();await page.waitForTimeout(2600);
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'output/visual-v3/day.png'});
  await openSection(page, '.atmosphere');
  await page.getByRole('button',{name:'☀ 白天',exact:true}).click();await page.waitForTimeout(1700);await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'output/visual-v3/night.png'});
  await openSection(page, '.atmosphere');
  await page.getByRole('button',{name:'☾ 夜间',exact:true}).click();
  for(const env of ['mountain','coast','mist']){
    await openSection(page, '.atmosphere');
    await page.getByLabel('窗外景观').selectOption(env);
    await expect.poll(async()=>page.evaluate(()=>Object.values((window as any).__frost.diagnostics().assets).every(x=>x==='ready')),{timeout:30000}).toBe(true);
    await page.waitForTimeout(600);await page.screenshot({path:`output/visual-v3/environment-${env}.png`});
  }
  await openSection(page,'.advanced');
  for(const quality of ['low','medium','high']){
    await page.getByLabel('画质',{exact:true}).selectOption(quality);await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(4000);
    const samples=[];for(let i=0;i<3;i++){await page.waitForTimeout(1600);samples.push(await page.locator('.scene-badge').textContent());}
    readings.push({quality,samples,diagnostics:await page.evaluate(()=>(window as any).__frost.diagnostics())});
  }
  writeFileSync('output/visual-v3/verification.json',JSON.stringify({requests,errors,readings},null,2));expect(errors).toEqual([]);
});
