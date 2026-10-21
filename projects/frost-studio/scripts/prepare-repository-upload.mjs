// Prepare a bounded, reviewable copy. This script never commits, pushes or deletes files.
import {readdir,readFile,writeFile,mkdir,copyFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const destination=path.resolve(process.argv[2] ?? '');
const update=process.argv[3]==='--update';
if(!process.argv[2] || path.basename(destination)!=='frost-studio' || path.basename(path.dirname(destination))!=='projects')throw Error('目标必须是明确指定的 projects/frost-studio 新目录');
if((await stat(destination).catch(()=>null))&&!update)throw Error('目标已存在；使用 --update 仅更新经清单校验、未被修改的已发布副本');
const repo=path.resolve(destination,'../..');
const config=await readFile(path.join(repo,'.git','config'),'utf8');
if(!config.includes('https://github.com/linlangkang/rea.git'))throw Error('目标仓库不匹配');
const manifestPath=path.join(destination,'docs','UPLOAD_MANIFEST.json');
let previous;
if(update){
 previous=JSON.parse(await readFile(manifestPath,'utf8'));
 if(previous.repository!=='linlangkang/rea'||previous.directory!=='projects/frost-studio')throw Error('原上传清单目标不匹配');
 for(const record of previous.manifest){
   const target=path.resolve(destination,record.path);
   if(!target.startsWith(destination+path.sep))throw Error('原上传清单路径越界');
   const content=await readFile(target);
   if(createHash('sha256').update(content).digest('hex')!==record.sha256)throw Error(`发布副本已有修改，保留现场：${record.path}`);
 }
}
const files=[];
async function walk(relative){for(const entry of await readdir(path.join(source,relative),{withFileTypes:true})){
  if(entry.isSymbolicLink())throw Error(`拒绝链接：${relative}/${entry.name}`);
  if(['node_modules','.git','output','dist','Saved','Intermediate','DerivedDataCache','Binaries','LocalOnly'].includes(entry.name))continue;
  const next=path.posix.join(relative,entry.name);
  if(entry.isDirectory())await walk(next);else if(entry.isFile()&&!entry.name.endsWith('.log')&&!entry.name.startsWith('.env'))files.push(next);
}}
for(const dir of ['src','public','tests','scripts','deploy','.agents','.codex','docs'])await walk(dir);
for(const name of ['.gitignore','.dockerignore','AGENTS.md','Dockerfile','LICENSE','README.md','design-qa.md','index.html','package.json','package-lock.json','playwright.config.ts','tsconfig.json','vite.config.ts','vitest.config.ts','tools/rea/package.json','tools/rea/package-lock.json','unreal/README.md','unreal/open-cinematic-room.ps1','unreal/open-latest-room.ps1','unreal/render-cinematic.ps1','unreal/run-editor-script.ps1','unreal/FrostRoom/FrostRoom.uproject','unreal/FrostRoom/Config/DefaultEngine.example.ini'])files.push(name);
await walk('unreal/FrostRoom/Content/Python');
const privatePattern=/ghp_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9]{24,}|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|SecurityToken\s*=\s*[^\s]/;
const manifest=[];
// Validate the entire candidate before writing the destination.
const candidate=[];
for(const relative of [...new Set(files)].filter(f=>f!=='docs/UPLOAD_MANIFEST.json').sort()){
  let content=await readFile(path.join(source,relative));
  if(content.length>50_000_000)throw Error(`文件过大：${relative}`);
  const textFile=/\.(md|txt|json|ts|vue|css|html|py|ps1|ini|toml|yml|yaml|mjs|csv|gltf|uproject|svg)$/.test(relative) || ['.gitignore','.dockerignore','Dockerfile','LICENSE'].includes(path.basename(relative));
  if(textFile){let text=content.toString('utf8');if(privatePattern.test(text))throw Error(`需要人工检查敏感内容：${relative}`);
    // Historical documentation may describe local-only assets. Do not publish machine-specific roots.
    if(/\.(md|txt)$/.test(relative))text=text.replace(/C:[\\/]Users[\\/]35078[\\/]Documents[\\/]New project[\\/]blue-white-room/g,'.').replace(/[CD]:[\\/][^\r\n`"<>)]*/g,'[本机路径，未公开]');
    content=Buffer.from(text.replace(/\r\n/g,'\n'),'utf8');
  }
  candidate.push({relative,content});manifest.push({path:relative,bytes:content.length,sha256:createHash('sha256').update(content).digest('hex')});
}
// An update may overwrite only files owned by the previous verified manifest.
const owned=new Set(previous?.manifest.map(record=>record.path)??[]);
for(const {relative} of candidate){
 const target=path.resolve(destination,relative);
 if(!target.startsWith(destination+path.sep))throw Error('路径越界');
 if(await stat(target).catch(()=>null))if(!owned.has(relative))throw Error(`目标有非清单文件，保留现场：${relative}`);
}
await mkdir(destination,{recursive:true});
for(const {relative,content} of candidate){const target=path.resolve(destination,relative);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,content,{flag:owned.has(relative)?'w':'wx'});}
const report={repository:'linlangkang/rea',directory:'projects/frost-studio',files:manifest.length,bytes:manifest.reduce((n,f)=>n+f.bytes,0),excluded:['node_modules','dist','output','UE content binaries','machine UE config and tokens','private models'],manifest};
await writeFile(manifestPath,JSON.stringify(report,null,2)+'\n',{flag:update?'w':'wx'});
console.log(JSON.stringify({directory:report.directory,files:report.files,bytes:report.bytes,excluded:report.excluded},null,2));
