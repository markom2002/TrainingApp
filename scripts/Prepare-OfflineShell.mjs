import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../FE/training-app-frontend/dist/training-app-frontend/browser/',import.meta.url));
const files=[];
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 const absolute=path.join(dir,item.name),relative=path.relative(root,absolute).replaceAll('\\','/');
 if(item.isDirectory()){if(!relative.startsWith('audio'))walk(absolute);continue;}
 if(/\.(js|css)$/.test(relative)&&relative!=='sw.js'||['index.html','offline.html','manifest.webmanifest','favicon.svg'].includes(relative)||relative.startsWith('icons/')||relative.startsWith('images/')||relative==='models/athlete-v3.glb')files.push('/'+relative);
}}
walk(root);files.sort();
const hash=crypto.createHash('sha256');for(const file of files)hash.update(fs.readFileSync(path.join(root,file.slice(1))));
fs.writeFileSync(path.join(root,'offline-assets.json'),JSON.stringify(files));
const worker=fileURLToPath(new URL('../FE/training-app-frontend/public/sw.js',import.meta.url));
const build=hash.digest('hex').slice(0,16);
fs.writeFileSync(path.join(root,'sw.js'),fs.readFileSync(worker,'utf8').replace('__BUILD__',build));
const index=path.join(root,'index.html');
fs.writeFileSync(index,fs.readFileSync(index,'utf8').replace('</head>',`<meta name="form-offline-build" content="${build}"></head>`));
console.log(`Offline shell prepared: ${files.length} public assets.`);
