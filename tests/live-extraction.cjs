const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
const base='http://localhost:3000';let r=await fetch(base);assert.equal(r.status,200);assert.ok((await r.text()).includes('Checking access'));
r=await fetch(base+'/api/database',{cache:'no-store'});const db=await r.json();if(!r.ok)throw new Error(db.error);assert.equal(db.products.length,72);console.log('Page and online API passed:',db.products.length,'products, revision',db.revision);
r=await fetch(base+'/api/ai/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,400);console.log('Invalid approval rejected.');
for(const [mode,file]of [['purchase_bill','01-purchase-bill'],['product_list','02-price-list'],['stock_count','03-stock-count'],['sale_list','04-customer-list']]){
const image='data:image/jpeg;base64,'+fs.readFileSync('sample-bills/'+file+'.jpg').toString('base64');
r=await fetch(base+'/api/ai/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,images:[image]})});const result=await r.json();if(!r.ok)throw new Error(mode+': '+result.error);assert.equal(result.draft.mode,mode);assert.ok(result.draft.lines.length);console.log('Live OpenAI image extraction:',mode,JSON.stringify(result.draft.lines.map(l=>({name:l.name,qty:l.qty,unit:l.unit,status:l.status,warnings:l.warnings.length}))));
}
const after=await(await fetch(base+'/api/database',{cache:'no-store'})).json();assert.equal(after.revision,db.revision);assert.equal(after.purchases.length,db.purchases.length);console.log('Confirmed: all four extractions left Neon unchanged.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
