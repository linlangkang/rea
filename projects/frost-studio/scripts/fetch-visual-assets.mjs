import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const ids=['wood_floor','fabric_pattern_07','marble_01','painted_plaster_wall','fouriesburg_mountain_cloudy'];
for(const id of ids){
 const cached=`output/visual-v3/${id}-files.json`;
 const data=existsSync(cached)?JSON.parse(readFileSync(cached)):await fetch(`https://api.polyhaven.com/files/${id}`).then(r=>r.json());
 mkdirSync('output/visual-v3',{recursive:true});
 writeFileSync(`output/visual-v3/${id}-files.json`,JSON.stringify(data,null,2));
 const infoPath=`output/visual-v3/${id}-info.json`;
 const info=existsSync(infoPath)?JSON.parse(readFileSync(infoPath)):await fetch(`https://api.polyhaven.com/info/${id}`).then(r=>r.json());
 writeFileSync(`output/visual-v3/${id}-info.json`,JSON.stringify(info,null,2));
 const selected=id==='fouriesburg_mountain_cloudy' ? [['environment.hdr', data.hdri['2k'].hdr]] : ['Diffuse','nor_gl','Rough','AO'].filter(k=>data[k]).map(k=>[`${id}-${k}.jpg`,data[k]['1k'].jpg]);
 mkdirSync('public/materials',{recursive:true});
 const records=[];
 for(const [name,file] of selected){
   if(!file) continue;
   const dest=`public/materials/${name}`;
   const bytes=existsSync(dest)?readFileSync(dest):Buffer.from(await fetch(file.url).then(r=>{if(!r.ok) throw Error(String(r.status)); return r.arrayBuffer();}));
   if(createHash('md5').update(bytes).digest('hex')!==file.md5) throw Error(`Checksum mismatch ${name}`);
   writeFileSync(dest,bytes);records.push({file:dest,url:file.url,bytes:bytes.length,md5:file.md5});
 }
 writeFileSync(`public/materials/${id}-license.json`,JSON.stringify({id,authors:info.authors,source:`https://polyhaven.com/a/${id}`,license:'CC0-1.0',licenseUrl:'https://polyhaven.com/license',scale:info.scale??'scene scale estimated',downloaded:'2026-09-24',files:records},null,2));
 console.log('Downloaded',id,records.length);
}
