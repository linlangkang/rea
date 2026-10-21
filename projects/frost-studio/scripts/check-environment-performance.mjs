import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(process.env.FROST_URL??'http://127.0.0.1:5179/');
 await page.waitForFunction(()=>window.__frost?.diagnostics()?.assets&&Object.values(window.__frost.diagnostics().assets).every(v=>v==='ready'),null,{timeout:60000});
 const baseline=(await page.evaluate(()=>window.__frost.diagnostics())).layout;
 await page.getByText('场景设置 / 画质与房间尺寸',{exact:true}).click();
 const samples=[];
 for(const level of ['low','medium','high']){
  await page.getByLabel('画质',{exact:true}).selectOption(level);
  await page.waitForTimeout(2500);
  const fps=[];
  for(let index=0;index<4;index++){await page.waitForTimeout(2000);fps.push(await page.locator('.scene-badge').textContent());}
  const diagnostics=await page.evaluate(()=>window.__frost.diagnostics());
  assert.deepEqual(diagnostics.layout,baseline);
  samples.push({level,fps,gpu:diagnostics.gpu,viewport:diagnostics.size,pixelRatio:diagnostics.pixelRatio,triangles:diagnostics.triangles,drawCalls:diagnostics.drawCalls});
 }
 assert.deepEqual(errors,[]);
 await mkdir('output/refinement-v9',{recursive:true});
 await writeFile('output/refinement-v9/performance.json',JSON.stringify({samples,errors,limitations:'Short headless Chrome samples while the UE editor is open; not an isolated benchmark.'},null,2));
 console.log(JSON.stringify(samples));
}finally{await browser.close();}
