// Explicitly disposable POC workflow: replaces hardware demo records after testing.
const assert=require('node:assert/strict'),{load}=require('../scripts/ts-loader.cjs'),{blankDraft,blankRow}=load('lib/smart-schema.ts')
const base=process.env.POS_TEST_URL||'http://localhost:3000'
async function read(){const r=await fetch(base+'/api/database',{cache:'no-store'});if(!r.ok)throw new Error('Database unavailable');return r.json()}
async function post(path,body){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()}}
async function main(){let db=await read();const start=db.purchases.length;let changed=false;try{
 const draft=blankDraft('purchase_bill');draft.supplier='Smoke Test Supplier';draft.lines=[{...blankRow(),name:'Copper wire 2.5mm',extracted_name:'test taar 2.5mm',product_id:'hw-002',qty:2,unit:'coil',rate:6300},{...blankRow(),name:'Smoke Test Bracket',qty:5,unit:'piece',rate:100}]
 const input={draft,revision:db.revision,request_id:crypto.randomUUID(),source:'text'};let result=await post('/api/ai/approve',input);assert.equal(result.status,200,JSON.stringify(result.body));changed=true;db=result.body.db;assert.equal(db.purchases.length,start+1);assert.equal(result.body.summary.created,1);assert.ok(db.productAliases.some(a=>a.aliasKey==='test taar 2.5mm'&&a.productId==='hw-002'))
 result=await post('/api/ai/approve',input);assert.equal(result.status,200);assert.equal(result.body.db.purchases.length,start+1);assert.equal(result.body.db.revision,db.revision)
 result=await post('/api/ai/approve',{...input,request_id:crypto.randomUUID()});assert.equal(result.status,409)
 console.log('Passed HTTP approval, new product/supplier, mixed units, learned original alias, idempotent retry and stale revision rejection.')
 }finally{if(changed){db=await read();const reset=await post('/api/demo/reset',{confirmation:'RESET',revision:db.revision});assert.equal(reset.status,200);assert.equal(reset.body.products.length,72);assert.equal(reset.body.purchases.length,25);console.log('Settings reset endpoint passed; clean hardware demo restored.')}}}
main().catch(e=>{console.error(e.message);process.exitCode=1})
