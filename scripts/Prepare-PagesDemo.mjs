import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../FE/training-app-frontend/dist/pages-demo/browser/', import.meta.url));
const base = '/TrainingApp/';
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    const relative = path.relative(root, full).replaceAll('\\', '/');
    // Component CSS can be embedded in lazy JS chunks. Rewrite only known public asset roots.
    if (/\.(js|css|html)$/.test(relative)) {
      const text = fs.readFileSync(full, 'utf8').replace(/(["'(])\/(images|models|icons)\//g, `$1${base}$2/`)
        .replace(/(["'])\/manifest\.webmanifest/g, `$1${base}manifest.webmanifest`);
      fs.writeFileSync(full, text);
    }
    if (/\.(js|css)$/.test(relative) && relative !== 'sw.js' || ['index.html', 'offline.html', 'manifest.webmanifest', 'favicon.svg'].includes(relative)
      || relative.startsWith('icons/') || relative.startsWith('images/') || relative === 'models/athlete-v3.glb') files.push(relative);
  }
}
walk(root);
const manifestPath = path.join(root, 'manifest.webmanifest');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.id = base;
manifest.name = 'Training Journal Demo'; manifest.short_name = 'Training Demo';
manifest.start_url = base + '#/login'; manifest.scope = base;
manifest.description = 'Interactive portfolio demo. Synthetic data is stored only in your browser.';
for (const icon of manifest.icons) icon.src = base + icon.src.replace(/^\//, '');
for (const shortcut of manifest.shortcuts ?? []) shortcut.url = base + '#' + shortcut.url;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
const indexPath = path.join(root, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/<title>.*?<\/title>/, '<title>Gym Training Tracker | Interactive Demo</title>')
  .replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]+/, '$1Training Demo');
const hash = crypto.createHash('sha256');
for (const file of files.sort()) hash.update(fs.readFileSync(path.join(root, file)));
const build = hash.digest('hex').slice(0, 16);
html = html.replace('</head>', `<meta name="form-offline-build" content="${build}"></head>`);
fs.writeFileSync(indexPath, html);
fs.writeFileSync(path.join(root, 'offline-assets.json'), JSON.stringify(files.map(file => base + file)));
// Reuse the production shell worker with a separate cache namespace and project-scoped URLs.
const source = new URL('../FE/training-app-frontend/public/sw.js', import.meta.url);
let worker = fs.readFileSync(source, 'utf8').replace('__BUILD__', build)
  .replaceAll('form-offline-', 'training-pages-').replaceAll('form-shell-', 'training-pages-legacy-');
for (const file of ['offline-assets.json', 'index.html', 'offline.html', 'manifest.webmanifest'])
  worker = worker.replaceAll(`'/${file}'`, `'${base}${file}'`);
worker = worker.replace("startsWith('/icons/')", `startsWith('${base}icons/')`);
fs.writeFileSync(path.join(root, 'sw.js'), worker);
fs.writeFileSync(path.join(root, '.nojekyll'), '');
console.log(`Pages demo prepared at ${base}: ${files.length} public assets, isolated local data and hash routes.`);
