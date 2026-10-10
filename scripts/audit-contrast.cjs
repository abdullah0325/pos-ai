// Rendered contrast audit. Use a separate Chrome profile with CDP on port 9231.
// Adds only an in-memory cart item; never submits a sale or changes saved records.
const fs = require('node:fs');
async function main() {
  const tabs = await (await fetch('http://127.0.0.1:9231/json')).json();
  const tab = tabs.find(t => t.type === 'page' && t.url === 'about:blank') || tabs.find(t => t.type === 'page');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', event => { const msg = JSON.parse(event.data); if (msg.id) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(msg.error) : p.resolve(msg.result); } });
  const cdp = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id:n, method, params })); });
  const evaluate = async expression => { const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if(r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  await cdp('Page.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: "sessionStorage.setItem('al-farooq-unlocked-at', String(Date.now()))" });
  await cdp('Emulation.setDeviceMetricsOverride', { width:1440, height:1000, deviceScaleFactor:1, mobile:false });
  await cdp('Page.navigate', { url:process.env.AUDIT_URL || 'http://localhost:3000' });
  for(let i=0;i<100;i++) { if(await evaluate("Boolean(document.querySelector('.nav-item'))")) break; await new Promise(r=>setTimeout(r,250)); }
  const audit = `(${function () {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const rgba = value => { ctx.clearRect(0,0,1,1); ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v); };
    const blend=(a,b)=>a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])).concat(1);
    const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    const background=el=>{let samples=[[255,255,255,1]]; const chain=[];for(let n=el;n;n=n.parentElement)chain.unshift(n);let gradient=false;
      for(const n of chain){const s=getComputedStyle(n);samples=samples.map(bg=>blend(rgba(s.backgroundColor),bg)); if(s.backgroundImage!=='none') {gradient=true; const colors=s.backgroundImage.match(/(?:rgba?|oklab|oklch|lab|lch|color)\([^)]*\)|#[0-9a-f]{3,8}/gi)||[];if(colors.length)samples=samples.flatMap(bg=>colors.map(color=>blend(rgba(color),bg)));}}return {samples,gradient};};
    const failures=[], seen=new Set();let checked=0, gradients=0;
    for(const el of document.querySelectorAll('body *')) {
      if(['SCRIPT','STYLE','OPTION','SVG','PATH'].includes(el.tagName)||el.closest('nextjs-portal,[hidden]') || (el.closest('svg') && !['text','tspan'].includes(el.tagName)))continue;
      const text=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();if(!text)continue;
      const s=getComputedStyle(el);if(s.visibility!=='visible'||!el.getClientRects().length)continue;
      if(el.closest(':disabled'))continue;
      const {samples,gradient}=background(el);if(gradient)gradients++;
      const bg=samples.reduce((a,b)=>ratio(blend(rgba(s.color),a),a)<ratio(blend(rgba(s.color),b),b)?a:b);const fg=blend(rgba(el.closest('svg') ? s.fill : s.color),bg);const contrast=ratio(fg,bg);const size=parseFloat(s.fontSize),weight=parseInt(s.fontWeight);const min=size>=24||(size>=18.66&&weight>=700)?3:4.5;checked++;
      if(contrast+.01<min){const key=s.color+'|'+bg+'|'+text.slice(0,50);if(seen.has(key))continue;seen.add(key);failures.push({text:text.slice(0,85),ratio:+contrast.toFixed(2),min,color:el.closest('svg') ? s.fill : s.color,background:bg.slice(0,3).map(Math.round),class:el.className});}
    }
    for(const el of document.querySelectorAll('button svg, a svg')) {
      if(!el.getClientRects().length||el.closest(':disabled')||getComputedStyle(el).visibility!=='visible')continue;
      const {samples}=background(el);const fg=rgba(getComputedStyle(el).color);const contrast=Math.min(...samples.map(bg=>ratio(blend(fg,bg),bg)));checked++;
      if(contrast+.01<3)failures.push({text:'Icon: '+(el.closest('button,a').getAttribute('aria-label')||el.closest('button,a').title||el.closest('button,a').textContent.trim()).slice(0,65),ratio:+contrast.toFixed(2),min:3,color:getComputedStyle(el).color,class:el.getAttribute('class')});
    }
    return {checked,gradients,failures};
  }.toString()})()`;
  const results=[];
  const names=await evaluate("[...document.querySelectorAll('.nav-item')].map(e=>e.textContent.trim())");
  for(const width of [1440,390]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
    for(const name of names){await evaluate(`(()=>{const e=[...document.querySelectorAll('.nav-item')].find(e=>e.textContent.trim()===${JSON.stringify(name)});e?.click();return true})()`);await new Promise(r=>setTimeout(r,350));const result=await evaluate(audit);results.push({page:name,width,...result});}
  }
  const navigate = async name => { await evaluate(`[...document.querySelectorAll('.nav-item')].find(e=>e.textContent.trim()===${JSON.stringify(name)})?.click()`); await new Promise(r=>setTimeout(r,200)); };
  const scene = async (page, selector) => { if(selector) { const found=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return false;e.click();return true})()`); if(!found)throw Error('Missing control: '+selector); } await new Promise(r=>setTimeout(r,150)); results.push({page,width:390,...await evaluate(audit)}); };
  await navigate('POS');
  await scene('POS manual product popup','.pos-sale-entry-actions button:first-child');
  await evaluate("document.querySelector('[aria-label=\"Close product entry\"]')?.click()");
  await scene('POS scan popup','.pos-sale-entry-actions button:last-child');
  await evaluate("document.querySelector('[aria-label=\"Close product entry\"]')?.click()");
  // Only changes the isolated browser's in-memory cart; never completes a sale.
  const productAdded=await evaluate("(()=>{const e=document.querySelector('.pos-product-add:not(:disabled)');if(!e)return false;e.click();return true})()");
  if(productAdded){
    await scene('POS populated cart');
    await scene('POS clear confirmation','button[title="Clear Cart"]');
    await evaluate("document.querySelector('.confirmation-dialog footer button:first-child')?.click()");
    await scene('POS checkout popup','#btn-pos-checkout');
    await evaluate("document.querySelector('#pos-terminal-root .fixed button')?.click()");
  }
  await navigate('Employees');
  await scene('Employee profile','.employee-card-footer button');
  for(let i=0;i<6;i++) { await scene('Employee profile section '+i,'.employee-profile-tabs button:nth-child('+(i+1)+')'); }
  await navigate('Settings');
  for(let i=0;i<4;i++)await scene('Settings section '+i,'.settings-menu button:nth-of-type('+(i+1)+')');
  await navigate('Sales');
  await scene('Sales expanded filters','.sales-filter-toggle');
  await scene('Notifications dropdown','.notification-trigger');
  await evaluate("document.querySelector('.notification-trigger')?.click()");
  const reportPath = process.env.AUDIT_REPORT || require('node:path').join(require('node:os').tmpdir(), 'al-farooq-contrast-audit.json');
  fs.writeFileSync(reportPath,JSON.stringify(results,null,2));
  console.log('Audit report: '+reportPath);
  if(results.some(r=>r.failures.length))process.exitCode=1;
  console.log(JSON.stringify(results.map(r=>({page:r.page,width:r.width,checked:r.checked,gradients:r.gradients,failures:r.failures.length})),null,2));
  ws.close();
}
main().catch(e=>{console.error(e);process.exitCode=1});
