const assert=require('node:assert/strict')
const {load}=require('../scripts/ts-loader.cjs')
const {buildDemo}=load('lib/demo-seed.ts'),{applySmartEntry}=load('lib/smart-apply.ts'),{auditStock}=load('lib/stock-audit.ts'),{blankDraft,blankRow,factor}=load('lib/smart-schema.ts'),{numeric}=load('lib/ai-schema.ts'),{databaseSchema}=load('lib/online-schema.ts')
const seed=buildDemo(),before=JSON.stringify(seed)
assert.deepEqual(seed,buildDemo());assert.equal(seed.products.length,72);assert.equal(seed.purchases.length,25);assert.equal(seed.invoices.length,80);databaseSchema.parse(seed)
assert.equal(numeric('\u06f1,\u06f2\u06f3\u06f4\u066b\u06f5'),1234.5);assert.equal(numeric('\u0661\u0662'),12)
function balances(db){for(const p of db.products){const sum=db.stockMovements.filter(m=>m.itemId===p.id&&m.kind==='product').reduce((s,m)=>s+m.qty,0);assert.ok(Math.abs(sum-p.quantity)<.00001,`${p.name} movement sum`)}for(const s of db.suppliers)assert.equal(s.currentBalance,db.purchases.filter(p=>p.supplierId===s.id).reduce((n,p)=>n+p.balanceDue,0));for(const c of db.customers)assert.equal(c.currentBalance,db.invoices.filter(p=>p.customerId===c.id).reduce((n,p)=>n+p.balanceDue,0))}
balances(seed)
let draft=blankDraft('purchase_bill');draft.supplier='New Supplier';draft.lines=[{...blankRow(),name:'bijli taar 2.5mm',product_id:'hw-002',qty:2,unit:'coil',rate:6300,amount:12600},{...blankRow(),name:'New brass fitting',qty:10,unit:'piece',rate:50,amount:500},{...blankRow(),name:'Freight',kind:'expense',qty:1,rate:300,amount:300}]
let result=applySmartEntry(seed,draft,'image',crypto.randomUUID()),db=auditStock(seed,result.db)
assert.equal(db.products.find(p=>p.id==='hw-002').quantity,seed.products.find(p=>p.id==='hw-002').quantity+180);assert.equal(db.products.find(p=>p.id==='hw-002').costPrice,70);assert.equal(result.summary.created,1);assert.equal(db.suppliers.at(-1).currentBalance,13400);assert.equal(db.expenses.at(-1).amount,300);assert.equal(db.products.at(-1).quantity,10);balances(db);assert.equal(JSON.stringify(seed),before)
draft=blankDraft('sale_list');draft.customer='New Contractor';draft.payment_type='credit';draft.lines=[{...blankRow(),name:'Copper wire 2.5mm',product_id:'hw-002',qty:2,unit:'coil'},{...blankRow(),name:'PVC pipe 1 inch',product_id:'hw-020',qty:12,unit:'foot'}]
result=applySmartEntry(db,draft,'voice',crypto.randomUUID());let sold=auditStock(db,result.db);assert.equal(sold.products.find(p=>p.id==='hw-002').quantity,db.products.find(p=>p.id==='hw-002').quantity-180);assert.equal(sold.customers.at(-1).currentBalance,2*90*78+12*75);assert.ok(result.receiptId);balances(sold)
draft=blankDraft('stock_count');draft.lines=[{...blankRow(),name:'Copper wire 2.5mm',product_id:'hw-002',qty:6,unit:'coil'}];result=applySmartEntry(sold,draft,'image',crypto.randomUUID());let counted=auditStock(sold,result.db);assert.equal(counted.products.find(p=>p.id==='hw-002').quantity,540);assert.equal(counted.stockMovements.at(-1).type,'adjust');balances(counted)
draft=blankDraft('product_list');draft.lines=[{...blankRow(),name:'New wall bracket',qty:0},{...blankRow(),name:'Copper wire 2.5mm',product_id:'hw-002',sale_price:85}];result=applySmartEntry(counted,draft,'text',crypto.randomUUID());assert.equal(result.db.products.find(p=>p.id==='hw-002').costPrice,70);assert.equal(result.db.products.find(p=>p.id==='hw-002').retailPrice,85);assert.equal(result.db.products.at(-1).name,'New wall bracket')
assert.throws(()=>factor(seed.products[0],'box'),/not configured/)
draft=blankDraft('sale_list');draft.lines=[{...blankRow(),name:'Unknown',product_id:'missing',qty:1}];assert.throws(()=>applySmartEntry(seed,draft,'text',crypto.randomUUID()),/no longer exists/)
draft.lines=[{...blankRow(),name:'Copper wire 1.5mm',product_id:'hw-001',qty:1e6,unit:'coil'}];result=applySmartEntry(seed,draft,'voice',crypto.randomUUID());assert.ok(result.summary.warnings.some(w=>/negative/i.test(w)));assert.ok(result.db.products[0].quantity<0)
draft.payment_type='credit';assert.throws(()=>applySmartEntry(seed,draft,'text',crypto.randomUUID()),/customer/)
draft=blankDraft('purchase_bill');draft.lines=[{...blankRow(),name:'Missing qty'}];assert.throws(()=>applySmartEntry(seed,draft,'text',crypto.randomUUID()),/quantity/)
assert.equal(JSON.stringify(seed),before)
console.log('Passed: deterministic 72-product seed, Urdu/Arabic digits, ledger balances, mixed units, atomic draft application, new supplier/product, expenses, credit sale, receipt, counts, aliases, unknown IDs, missing quantities, negative-stock warnings, immutable input.')

// Extraction may return blank optional cells; preserve them as unknown for review.
const {draftSchema}=load('lib/smart-schema.ts')
const extracted=blankDraft('purchase_bill'); extracted.date=''; extracted.total=''; extracted.lines=[{...blankRow(),name:'Copper wire',qty:'\u06f2',rate:'',amount:''}]
const reviewed=draftSchema.parse(extracted)
assert.equal(reviewed.date,null); assert.equal(reviewed.total,null); assert.equal(reviewed.lines[0].qty,2); assert.equal(reviewed.lines[0].rate,null); assert.equal(reviewed.lines[0].amount,null)
assert.throws(()=>draftSchema.parse({...extracted,lines:[{...extracted.lines[0],qty:'unreadable'}]}))
console.log('Passed: blank extracted cells remain editable; multilingual quantities normalize; invalid numbers are rejected.')
