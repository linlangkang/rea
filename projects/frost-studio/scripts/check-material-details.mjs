import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5179/');
 await page.waitForFunction(()=>window.__frost?.diagnostics()?.assets && Object.values(window.__frost.diagnostics().assets).every(v=>v==='ready'),{},{timeout:60000});
 await page.getByRole('button',{name:'沉浸预览',exact:true}).click();
 await page.evaluate(()=>window.__frost.character('visible'));
 await mkdir('output/material-details',{recursive:true});
 const records=[];
 for(const name of ['keyboard','headset','chair','pc','sofa','bedding','coffee','plant']){
  await page.evaluate(name=>window.__frost.inspectHardware(name),name);await page.waitForTimeout(1500);
  await page.locator('canvas[aria-label="可旋转的 3D 电竞房间"]').screenshot({path:`output/material-details/${name}.png`});
  records.push({name,fps:await page.locator('.scene-badge').textContent(),diagnostics:await page.evaluate(()=>window.__frost.diagnostics())});
 }
 await writeFile('output/material-details/report.json',JSON.stringify({errors,records},null,2));
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
