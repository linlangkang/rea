import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5179/');
 await page.waitForFunction(()=>window.__frost?.diagnostics()?.assets&&Object.values(window.__frost.diagnostics().assets).every(v=>v==='ready'),{},{timeout:60000});
 await page.getByRole('button',{name:'沉浸预览',exact:true}).click();
 await page.evaluate(()=>window.__frost.character('visible'));
 await mkdir('output/refinement-v11',{recursive:true});
 const records=[];
 for(const name of ['keyboard','mouse','cables']){
  await page.evaluate(name=>window.__frost.inspectHardware(name),name);
  await page.waitForTimeout(2000);
  await page.locator('canvas[aria-label="可旋转的 3D 电竞房间"]').screenshot({path:`output/refinement-v11/${name}.png`});
  records.push({name,fps:await page.locator('.scene-badge').textContent()});
 }
 await writeFile('output/refinement-v11/web-report.json',JSON.stringify({errors,records},null,2));
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
