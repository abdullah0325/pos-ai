const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
function compile(path, dependency) {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = new Module(path);
  module.require = () => dependency;
  module._compile(source, path + '.js');
  return module.exports;
}
const db = compile('lib/db.ts');
const { createReportSample, buildReportTimeline, pakistanDate } = compile('lib/report-data.ts', db);
const before = JSON.stringify(db.initialDatabase);
const sample = createReportSample('2026-10-10', 2026);
assert.deepEqual(sample, createReportSample('2026-10-10', 2026), 'Seed should reproduce data');
assert.notDeepEqual(sample.invoices, createReportSample('2026-10-10', 2027).invoices);
assert.equal(JSON.stringify(db.initialDatabase), before, 'Sample generation must not mutate saved/template data');
assert.ok(sample.invoices.length > 150);
for (const record of [...sample.invoices, ...sample.purchases]) {
  assert.equal(record.grandTotal, record.items.reduce((sum, item) => sum + item.total, 0));
  assert.equal(record.grandTotal, record.amountPaid + record.balanceDue);
  assert.ok(record.date <= '2026-10-10');
  assert.ok(record.id.startsWith('DEMO-'));
}
const sources = [
  ...sample.invoices.map(r => ({ id: r.id, date: r.date, amount: r.grandTotal, direction: 'revenue' })),
  ...sample.purchases.map(r => ({ id: r.id, date: r.date, amount: r.grandTotal, direction: 'purchases' })),
  ...sample.expenses.map(r => ({ id: r.id, date: r.date, amount: r.amount, direction: 'expenses' })),
  ...sample.employees.flatMap(employee => employee.salaryHistory.map(r => ({ id: r.id, date: r.paymentDate, amount: r.amountPaid, direction: 'salaries' }))),
];
const timeline = buildReportTimeline(sources, '2026-10-01', '2026-10-10');
assert.equal(timeline.length, 10);
for (const point of timeline) {
  const records = sources.filter(r => r.date === point.date);
  assert.equal(point.revenue, records.filter(r => r.direction === 'revenue').reduce((sum,r) => sum+r.amount,0));
  assert.equal(point.outflow, records.filter(r => r.direction !== 'revenue').reduce((sum,r) => sum+r.amount,0));
}
assert.equal(buildReportTimeline([], '2026-10-01', '2026-10-05').length, 5);
assert.deepEqual(buildReportTimeline([], '2000-01-01', '2099-12-31'), []);
assert.equal(buildReportTimeline([], '2026-10-05', '2026-10-01').length, 0);
assert.equal(buildReportTimeline(sources, '2000-01-01', '2099-12-31').length, 90);
const long = buildReportTimeline([{date: '2024-01-15', amount: 10, direction: 'revenue'}, {date: '2026-10-10', amount: 20, direction: 'revenue'}], '2000-01-01', '2099-12-31');
assert.equal(long[0].date, '2024-01');
assert.equal(long.reduce((sum,p) => sum+p.revenue,0),30);
assert.equal(pakistanDate(new Date('2026-10-09T22:00:00Z')), '2026-10-10');
console.log('Report data tests passed: reproducible samples, no mutations, transaction totals, chart reconciliation, zero days, monthly grouping, date boundaries.');
