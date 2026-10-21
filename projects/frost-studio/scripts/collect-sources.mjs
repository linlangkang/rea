import { catalog } from '../src/data/catalog.ts';
import { research } from '../src/data/research.ts';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
// Finite, explicit official-source refresh. Never turns fetched text into verified specifications.
const sources = [...new Set([...catalog.sources.map(s=>s.url), ...research.map(r=>r.url)])];
const result=[];
for (const url of sources) {
  const row={url,checkedAt:new Date().toISOString(),status:'pending'};
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(20000),redirect:'error',headers:{'User-Agent':'FrostCatalogResearch/0.2'}});
    row.httpStatus=response.status;
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const text=await response.text();
    if (text.length>5_000_000) throw Error('Page exceeds 5 MB limit');
    row.title=text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g,' ').trim() ?? null;
    row.sha256=createHash('sha256').update(text).digest('hex');
    row.bytes=Buffer.byteLength(text);
    row.status='fetched-not-verified';
  } catch(e) {row.status='failed';row.error=String(e.message);}
  result.push(row);
  console.log(row.status,url);
  await new Promise(resolve=>setTimeout(resolve,1000));
}
mkdirSync('output/research',{recursive:true});
writeFileSync('output/research/source-refresh.json',JSON.stringify({generatedAt:new Date().toISOString(),scope:'2024-2026; finite source list, not an exhaustive web crawl',sources:result},null,2),'utf8');
writeFileSync('public/research-index.json',JSON.stringify(research,null,2),'utf8');
if(result.some(r=>r.status==='failed')) process.exitCode=1;
