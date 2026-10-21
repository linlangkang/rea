// Local authoring tool: export the existing room without the restricted character.
import { chromium } from 'playwright';
import { mkdir, stat,writeFile,copyFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage();
  await page.goto(process.env.FROST_URL ?? 'http://127.0.0.1:5179/');
  await page.waitForFunction(()=>window.__frost?.diagnostics()?.assets && Object.values(window.__frost.diagnostics().assets).every(v=>v==='ready'),{},{timeout:60000});
  const snapshot=await page.evaluate(async()=>{
    const {createUnrealSnapshot}=await import('/src/domain/unreal.ts');const {useStudio}=await import('/src/store.ts');
    const studio=useStudio();return createUnrealSnapshot(studio.preset,studio.catalog);
  });
  const pending=page.waitForEvent('download',{timeout:120000});
  await page.evaluate(()=>window.__frost.exportRoom());
  const download=await pending;
  await mkdir('local-assets/unreal',{recursive:true});
  await download.saveAs('local-assets/unreal/room-baseline.glb');
  await mkdir('unreal/FrostRoom/Saved',{recursive:true});
  await copyFile('unreal/FrostRoom/Saved/frost-unreal.json','local-assets/unreal/previous-snapshot.json');
  await writeFile('unreal/FrostRoom/Saved/frost-unreal.json',JSON.stringify(snapshot,null,2));
  console.log(JSON.stringify({file:'local-assets/unreal/room-baseline.glb',bytes:(await stat('local-assets/unreal/room-baseline.glb')).size,characterIncluded:false}));
} finally {await browser.close();}
