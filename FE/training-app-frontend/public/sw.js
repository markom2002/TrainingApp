// Public assets only. Account data is isolated in application storage.
const CACHE='form-offline-__BUILD__';
self.addEventListener('message',event=>{if(event.data?.type==='OFFLINE_STATUS')event.ports[0]?.postMessage({cache:CACHE});});
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const response=await fetch('/offline-assets.json',{cache:'reload'});
 if(!response.ok)throw new Error('Offline preparation unavailable');
 const files=await response.json(),cache=await caches.open(CACHE);
 await cache.addAll(files.map(url=>new Request(url,{cache:'reload'})));await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if((key.startsWith('form-offline-')||key.startsWith('form-shell-'))&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/certificates/')||url.pathname==='/phone-setup.html'||url.pathname==='/offline-assets.json')return;
 // Installation metadata must refresh independently of the cached app shell.
 if(url.pathname==='/manifest.webmanifest'){
   event.respondWith(fetch(event.request,{cache:'no-cache'}).catch(()=>caches.match('/manifest.webmanifest')));return;
 }
 if(event.request.mode==='navigate')event.respondWith((async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3000);
   try{return await fetch(event.request,{signal:controller.signal});}
   catch{return await caches.match('/index.html')||await caches.match('/offline.html');}
   finally{clearTimeout(timer);}
 })());
 else event.respondWith(caches.match(event.request,{ignoreSearch:url.pathname.startsWith('/icons/')}).then(hit=>hit||fetch(event.request)));
});
