import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../FE/training-app-frontend/public/sw.js', import.meta.url), 'utf8');
const listeners = new Map();
let networkCalls = 0;
const shell = new Response('<app-root>cached gym app</app-root>');
const context = {
  self: { location: { origin: 'https://gym.local' }, addEventListener: (name, handler) => listeners.set(name, handler) },
  caches: { match: async path => path === '/index.html' ? shell.clone() : undefined },
  fetch: async () => { networkCalls++; throw new Error('Laptop unavailable'); },
  URL, AbortController, setTimeout, clearTimeout,
};
vm.runInNewContext(source, context);
for (const path of ['/dashboard', '/add-training', '/journey']) {
  let response;
  listeners.get('fetch')({ request: { url: `https://gym.local${path}`, method: 'GET', mode: 'navigate' }, respondWith: promise => { response = promise; } });
  assert.equal(await (await response).text(), '<app-root>cached gym app</app-root>');
}
assert.equal(networkCalls, 0, 'Offline launch must not wait for an unavailable laptop');
for (const path of ['/api/trainings', '/phone-setup.html', '/certificates/form-local-root.cer']) {
  let intercepted = false;
  listeners.get('fetch')({ request: { url: `https://gym.local${path}`, method: 'GET', mode: 'navigate' }, respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false, `${path} must not be replaced with the cached app`);
}
console.log('Offline cold launch succeeds for dashboard, workout editor and journey without network requests. API and phone setup remain separate.');
