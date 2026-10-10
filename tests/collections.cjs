const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const loaded = new Module('collections');
loaded._compile(ts.transpileModule(fs.readFileSync('lib/collections.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, 'collections.js');
const { latestDistributorCollection } = loaded.exports;
const payment = (id, date, createdAt) => ({ id, date, createdAt, amount: 150000 });
const db = { customers: [
  { id: 'one', type: 'Distributor', paymentRecords: [payment('older', '2026-08-23', '2026-08-23T12:00:00Z'), payment('latest', '2026-08-24', '2026-08-24T13:00:00Z')] },
  { id: 'two', type: 'Distributor', paymentRecords: [payment('same-day', '2026-08-24', '2026-08-24T10:00:00Z')] },
  { id: 'retail', type: 'Retailer', paymentRecords: [payment('not-distributor', '2026-09-01', '2026-09-01T10:00:00Z')] },
  { id: 'empty', type: 'Distributor' },
] };
const original = JSON.stringify(db);
assert.equal(latestDistributorCollection(db).payment.id, 'latest');
assert.equal(latestDistributorCollection(db).customer.id, 'one');
assert.equal(JSON.stringify(db), original);
assert.equal(latestDistributorCollection({ customers: [] }), undefined);
console.log('Receipt source tests passed: latest date, same-day order, distributor-only records, empty state, and no mutations.');
