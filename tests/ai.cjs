const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const Module = require('node:module')
const path = require('node:path')
const cache = new Map()
function load(file) {
  const filename = path.resolve(file)
  if (cache.has(filename)) return cache.get(filename).exports
  const mod = new Module(filename, module)
  mod.filename = filename; mod.paths = module.paths; cache.set(filename, mod)
  const original = mod.require.bind(mod)
  mod.require = name => name.startsWith('./') ? load(path.resolve(path.dirname(filename), name + '.ts')) : original(name)
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename)
  return mod.exports
}
const { numeric, suggest, billSchema } = load('lib/ai-schema.ts')
const { approveBill } = load('lib/ai-purchase.ts')
const { auditStock } = load('lib/stock-audit.ts')
const { mirrorPayload } = load('lib/mirror-client.ts')
const { mirrorSchema } = load('lib/mirror-schema.ts')
assert.equal(numeric('۱,۲۳۴٫۵'), 1234.5)
assert.equal(numeric('١٢'), 12)
assert.equal(numeric(''), null)
assert.equal(suggest(' sugar ', [{ id: 's', name: 'Sugar' }]), 's')
assert.equal(suggest('Sugar fine', [{ id: 's', name: 'Sugar fines' }]), 's')
const db = { products: [], rawMaterials: [{ id: 's', name: 'Sugar', unit: 'kg', quantity: 5, reorderLevel: 1, unitCost: 2 }], suppliers: [], customers: [], purchases: [], invoices: [], expenses: [], ledgers: [] }
const rows = [
  { name: 'Sugar', qty: 3, rate: 5, amount: 15, unit: 'kg', kind: 'raw_material', matchId: 's' },
  { name: 'Juice', qty: 2, rate: null, amount: null, unit: null, kind: 'finished_product', matchId: '' },
  { name: 'Freight', qty: 1, rate: 10, amount: 10, unit: null, kind: 'expense', matchId: '' },
]
const bill = { supplier_name: 'Test Supplier', bill_date: null, bill_total: null, items: rows }
const before = JSON.stringify(db)
const next = auditStock(db, approveBill(db, bill, rows, ''))
assert.equal(JSON.stringify(db), before)
assert.equal(next.rawMaterials[0].quantity, 8)
assert.equal(next.rawMaterials[0].unitCost, 5)
assert.equal(next.products[0].quantity, 2)
assert.equal(next.products[0].retailPrice, 0)
assert.equal(next.suppliers[0].currentBalance, 25)
assert.equal(next.expenses.length, 1)
assert.equal(next.expenses[0].status, 'Pending')
assert.equal(next.stockMovements.length, 2)
assert.equal(next.stockMovements.reduce((n, m) => n + m.qty, 0), 5)
assert.equal(next.aiActivity[0].created, 1)
assert.equal(next.ledgers[0].credit, 25)
assert.equal(mirrorSchema.safeParse(mirrorPayload(db, next)).success, true)
assert.throws(() => approveBill(db, bill, rows.map(r => ({ ...r, qty: null })), ''))
assert.throws(() => billSchema.parse({ ...bill, items: [{ ...rows[0], qty: 'invalid' }] }))
assert.equal(JSON.stringify(db), before)
const sale = structuredClone(next)
sale.products[0].quantity = -2
sale.invoices = [{ id: 'invoice' }]
const audited = auditStock(next, sale)
assert.equal(audited.stockMovements.at(-1).qty, -4)
assert.equal(audited.stockMovements.at(-1).type, 'sale')
assert.equal(audited.stockMovements.at(-1).refId, 'invoice')
assert.equal(auditStock(next, next).stockMovements.length, next.stockMovements.length)
console.log('AI save tests passed: normalized numbers, matching, immutable approval, stock, expenses, supplier payable, movements, mirror payload, invalid input, negative sale stock.')
