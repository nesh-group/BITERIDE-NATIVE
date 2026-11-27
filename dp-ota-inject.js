// Injects the OTA helper script into every www/*.html (idempotent).
// Used by BOTH the APK build and the Driver/Partner OTA publish workflow,
// so the APK and the OTA bundle always carry the same helper.
const fs = require('fs');
const path = require('path');
const dir = process.argv[2] || 'www';
const SNIPPET = `<script id="nesh-ota">
(function(){try{
  var C=window.Capacitor;
  if(!(C&&C.isNativePlatform&&C.isNativePlatform())) return;
  // Inside the app a cached old page must never hide a new bundle: switch the service worker off.
  try{
    if(navigator.serviceWorker){
      navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});}).catch(function(){});
      navigator.serviceWorker.register=function(){return Promise.reject(new Error('sw disabled in app'));};
    }
    if(window.caches&&caches.keys) caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k);});}).catch(function(){});
  }catch(e){}
  // If a real script error happens while the page boots, do NOT confirm the bundle -> updater rolls back.
  var bad=false;
  window.addEventListener('error',function(ev){
    if(ev&&ev.error&&ev.error.stack&&!/ResizeObserver/i.test(String(ev.message||''))) bad=true;
  });
  function ready(){
    if(bad) return;
    try{var U=C.Plugins&&C.Plugins.CapacitorUpdater; if(U&&U.notifyAppReady) U.notifyAppReady();}catch(e){}
  }
  window.addEventListener('load',function(){setTimeout(ready,4000);});
}catch(e){}})();
</script>`;
let n = 0;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.html')) continue;
  const p = path.join(dir, f);
  let h = fs.readFileSync(p, 'utf8');
  if (h.includes('id="nesh-ota"')) { console.log('already injected', f); continue; }
  if (!/<head[^>]*>/i.test(h)) { console.log('::warning::no <head> in ' + f); continue; }
  h = h.replace(/<head[^>]*>/i, function (m) { return m + '\n' + SNIPPET + '\n'; });
  fs.writeFileSync(p, h);
  n++; console.log('injected', f);
}
if (n === 0) console.log('nothing new injected');
