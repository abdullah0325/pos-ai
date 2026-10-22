require('@next/env').loadEnvConfig(process.cwd())
const assert=require('node:assert/strict'),{load}=require('../scripts/ts-loader.cjs')
const {buildDemo}=load('lib/demo-seed.ts'),{transaction,readDatabase,persist,checkRevision,closeDatabase}=load('lib/online-db.ts'),{applySmartEntry}=load('lib/smart-apply.ts'),{blankDraft,blankRow}=load('lib/smart-schema.ts')
const rollback=new Error('TEST_ROLLBACK')
async function main(){const before=await transaction(c=>readDatabase(c));try{await transaction(async c=>{
 const current=await readDatabase(c,true);const seeded=await persist(c,current,buildDemo(),true);assert.equal(seeded.products.length,72)
 let draft=blankDraft('purchase_bill');draft.supplier='Integration test supplier';draft.lines=[{...blankRow(),name:'Copper wire 2.5mm',product_id:'hw-002',qty:2,unit:'coil',rate:6300},{...blankRow(),name:'Integration new bracket',qty:5,unit:'piece',rate:100}]
 const approved=applySmartEntry(seeded,draft,'image',crypto.randomUUID()),saved=await persist(c,seeded,approved.db),read=await readDatabase(c)
 assert.equal(read.revision,saved.revision);assert.equal(read.products.length,73)
 const stock=await c.query(`SELECT p.id,p.stock,COALESCE(sum(m.qty_base),0) AS movements FROM products p LEFT JOIN stock_movements m ON m.product_id=p.id GROUP BY p.id HAVING abs(p.stock-COALESCE(sum(m.qty_base),0))>0.00001`);assert.equal(stock.rows.length,0)
 const fuzzy=await c.query("SELECT name FROM products ORDER BY similarity(lower(name), 'coppr wire 2.5mm') DESC LIMIT 1");assert.equal(fuzzy.rows[0].name,'Copper wire 2.5mm')
 assert.equal((await c.query('SELECT count(*)::int n FROM purchase_items')).rows[0].n,77)
 assert.throws(()=>checkRevision(read,read.revision-1),/another session/)
 throw rollback
 })}catch(e){if(e!==rollback)throw e}
 const after=await transaction(c=>readDatabase(c));assert.deepEqual(after,before);console.log('Passed real Neon transaction: seed, purchase, normalized items, alias, pg_trgm, stock ledger balance, revision conflict, full rollback without altering workspace.')}
main().catch(e=>{console.error('Database test failed:',e.code||e.message);process.exitCode=1}).finally(closeDatabase)
