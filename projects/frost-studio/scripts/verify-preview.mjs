import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 await page.goto('http://127.0.0.1:5179/');
 await page.getByText('场景就绪 · 原创参数化模型').waitFor({timeout:30000});
 await page.getByRole('button',{name:'沉浸预览',exact:true}).click();
 await page.getByLabel('窗外景观').selectOption('coast');
 await page.getByRole('button',{name:'拆解',exact:true}).click();await page.waitForTimeout(1600);
 await page.getByRole('button',{name:'组装',exact:true}).click();
 await page.getByRole('button',{name:'退出沉浸',exact:true}).click();
 await page.getByRole('button',{name:'保存方案',exact:true}).click();await page.reload();
 await page.getByText('场景就绪 · 原创参数化模型').waitFor({timeout:30000});
 if(await page.getByLabel('窗外景观').inputValue()!=='coast')throw Error('Production restore failed');
 await page.waitForTimeout(3000);await page.screenshot({path:'output/visual-v3/production.png',fullPage:true});
 writeFileSync('output/visual-v3/production.json',JSON.stringify({url:page.url(),browser:browser.version(),errors,failed,restoredScenery:'coast'},null,2));
 if(errors.length||failed.length)throw Error(JSON.stringify({errors,failed}));
 console.log('Production preview: rendering, scene change, assembly, save/reload passed; zero console errors and HTTP failures.');
}finally{await browser.close();}
