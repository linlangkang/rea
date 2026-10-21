import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('../output/setup-2026-10-22/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
 const response=await page.goto('https://www.buildcores.com/setup/GdVKB9slt',{waitUntil:'domcontentloaded',timeout:45000});
 if([403,429].includes(response?.status()))throw Error('Reference access restricted; no retry');
 await page.getByRole('button',{name:'Compatibility Status',exact:true}).waitFor({timeout:30000});
 const text=await page.locator('body').innerText();
 if(/verify you are human|checking your browser|captcha/i.test(text))throw Error('Reference challenge; no retry');
 await writeFile(new URL('reference-visible.txt',out),text);
 await page.screenshot({path:fileURLToPath(new URL('reference-desktop.png',out))});
 await page.getByRole('button',{name:'Power Usage',exact:true}).click();
 await writeFile(new URL('reference-power.txt',out),await page.getByRole('dialog').innerText());
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:fileURLToPath(new URL('reference-mobile.png',out)),fullPage:true});
 console.log(JSON.stringify({status:response?.status(),desktop:[1280,900],mobile:[390,844],saved:true}));
}finally{await browser.close();}
