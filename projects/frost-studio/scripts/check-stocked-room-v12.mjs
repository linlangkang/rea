import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await mkdir('output/refinement-v12/web',{recursive:true});await page.goto('http://127.0.0.1:5179/');
 await page.waitForFunction(()=>window.__frost?.diagnostics()&&Object.values(window.__frost.diagnostics().assets).every(v=>v==='ready'),null,{timeout:90000});
 await page.getByRole('button',{name:'沉浸预览',exact:true}).click();
 const canvas=page.locator('canvas[aria-label="可旋转的 3D 电竞房间"]');
 const start=await page.evaluate(()=>window.__frost.diagnostics());
 assert.equal(start.fridge.doorAngles.length,2);assert.ok(start.stock.includes('脆脆鲨'));assert.ok(start.stock.includes('果粒橙'));
 await page.locator('.fridge-controls > summary').click();
 await page.getByRole('button',{name:'冰箱近景',exact:true}).click();await page.waitForTimeout(1500);await canvas.screenshot({path:'output/refinement-v12/web/fridge-closed.png'});
 await page.getByRole('button',{name:'打开冰箱',exact:true}).click();await page.waitForFunction(()=>window.__frost.diagnostics().fridge.doorAngles.every(a=>a>1.6),null,{timeout:15000});
 const opened=await page.evaluate(()=>window.__frost.diagnostics());assert.ok(opened.fridge.doorAngles.every(a=>a>1.6));
 await canvas.screenshot({path:'output/refinement-v12/web/fridge-open.png'});
 await page.getByRole('button',{name:'零食柜近景',exact:true}).click();await page.waitForTimeout(1500);await canvas.screenshot({path:'output/refinement-v12/web/snacks.png'});
 await page.getByRole('button',{name:'关闭冰箱',exact:true}).click();await page.waitForFunction(()=>window.__frost.diagnostics().fridge.doorAngles.every(a=>a<.01),null,{timeout:15000});
 const closed=await page.evaluate(()=>window.__frost.diagnostics());assert.ok(closed.fridge.doorAngles.every(a=>a<.01));assert.deepEqual(closed.layout,start.layout);
 assert.equal(await page.locator('.character-controls').count(),0);
 assert.equal(await page.evaluate(()=>typeof window.__frost.character),'undefined');
 await writeFile('output/refinement-v12/web/report.json',JSON.stringify({errors,start,opened,closed},null,2));assert.deepEqual(errors,[]);
}finally{await browser.close();}
