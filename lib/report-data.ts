import { initialDatabase, type AppDatabase } from './db'

export function pakistanDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-')
}

// Seeded randomness keeps a report reproducible until the user regenerates it.
export function createReportSample(endDate: string, seed = 2026): AppDatabase {
  const db: AppDatabase = JSON.parse(JSON.stringify(initialDatabase))
  let state = seed >>> 0
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 }
  const invoiceTemplates = db.invoices
  const purchaseTemplates = db.purchases
  const expenseTemplates = db.expenses.filter(item => !item.employeeId && !/salary|loan|advance/i.test(item.category))
  db.invoices = []
  db.purchases = []
  db.expenses = []
  db.employees = db.employees.map(employee => ({ ...employee, salaryHistory: [] }))
  for (let day = 89; day >= 0; day--) {
    const cursor = new Date(`${endDate}T12:00:00Z`)
    cursor.setUTCDate(cursor.getUTCDate() - day)
    const date = cursor.toISOString().slice(0, 10)
    const weekend = cursor.getUTCDay() === 0
    const count = weekend ? (random() > .6 ? 1 : 0) : 2 + Math.floor(random() * 4)
    const growth = 1 + (89 - day) / 450
    for (let index = 0; index < count; index++) {
      const template = invoiceTemplates[Math.floor(random() * invoiceTemplates.length)]
      const items = template.items.map(item => {
        const quantity = Math.max(1, Math.round(item.quantity * (.35 + random() * .8) * growth))
        return { ...item, quantity, total: Math.round(quantity * item.unitPrice), discount: 0, discountValue: 0 }
      })
      const total = items.reduce((sum, item) => sum + item.total, 0)
      const paid = Math.round(total * (random() < .65 ? 1 : .4 + random() * .45))
      const id = `DEMO-INV-${date}-${index + 1}`
      db.invoices.push({ ...template, id, invoiceNumber: id, date, dueDate: undefined, items, subtotal: total, discount: 0, tax: 0, grandTotal: total, amountPaid: paid, balanceDue: total - paid, status: paid === total ? 'Paid' : 'Partial', createdAt: `${date}T10:00:00Z`, notes: 'Generated sample transaction; not a business record.' })
    }
    if (!weekend && random() < .45) {
      const template = purchaseTemplates[Math.floor(random() * purchaseTemplates.length)]
      const items = template.items.map(item => {
        const quantity = Math.max(1, Math.round(item.quantity * (.3 + random() * .7)))
        return { ...item, quantity, otherCost: 0, total: Math.round(quantity * item.unitPrice) }
      })
      const total = items.reduce((sum, item) => sum + item.total, 0)
      const paid = Math.round(total * (random() < .5 ? 1 : .35 + random() * .4))
      const id = `DEMO-PO-${date}`
      db.purchases.push({ ...template, id, poNumber: id, purchaseNumber: id, date, dueDate: undefined, items, otherCost: 0, grandTotal: total, amountPaid: paid, balanceDue: total - paid, status: paid === total ? 'Paid' : 'Partial', isReturnOrDefect: false, notes: 'Generated sample procurement record.' })
    }
    if (!weekend && random() < .8) {
      const template = expenseTemplates[Math.floor(random() * expenseTemplates.length)]
      const id = `DEMO-EXP-${date}`
      db.expenses.push({ ...template, id, expenseNumber: id, voucherNumber: id, date, amount: Math.round((500 + random() * 7000) / 50) * 50, status: 'Paid', createdAt: `${date}T12:00:00Z`, notes: 'Generated sample operating expense.' })
    }
    if (cursor.getUTCDate() === 1) {
      db.employees.forEach(employee => {
        const amount = employee.baseSalary || 30000
        employee.salaryHistory!.push({ id: `DEMO-SAL-${date}-${employee.id}`, receiptNumber: `DEMO-SAL-${date}-${employee.id}`, month: date.slice(0, 7), paymentDate: date, baseSalary: amount, allowances: 0, netPayable: amount, amountPaid: amount, pendingBalance: 0, paymentMethod: 'Bank Transfer', paymentAccount: 'meezan-bank', status: 'Paid', createdAt: `${date}T09:00:00Z` })
      })
    }
  }
  db.customers = db.customers.map(customer => ({ ...customer, openingBalance: 0, currentBalance: db.invoices.filter(invoice => invoice.customerId === customer.id).reduce((sum, invoice) => sum + invoice.balanceDue, 0), paymentRecords: [] }))
  db.suppliers = db.suppliers.map(supplier => ({ ...supplier, openingBalance: 0, currentBalance: db.purchases.filter(purchase => purchase.supplierId === supplier.id).reduce((sum, purchase) => sum + purchase.balanceDue, 0), paymentRecords: [] }))
  return db
}

export interface ReportSource { id: string; date: string; kind: string; party: string; amount: number; direction: 'revenue' | 'purchases' | 'expenses' | 'salaries' }
export function buildReportTimeline(sources: ReportSource[], start: string, end: string) {
  const filtered = sources.filter(source => source.date >= start && source.date <= end)
  const dates = filtered.map(source => source.date).sort()
  if (!dates.length && (start === '2000-01-01' || end === '2099-12-31')) return []
  // All-time views use actual record bounds, rather than decades of empty dates.
  const first = start === '2000-01-01' ? (dates[0] || end) : start
  const last = end === '2099-12-31' ? (dates.at(-1) || first) : end
  if (first > last || !Number.isFinite(Date.parse(first)) || !Number.isFinite(Date.parse(last))) return []
  const monthly = (Date.parse(last) - Date.parse(first)) / 86400000 > 366
  const map = new Map<string, { date: string; label: string; revenue: number; outflow: number; purchases: number; expenses: number; salaries: number; net: number; count: number }>()
  const cursor = new Date(`${first}T12:00:00Z`)
  while (cursor.toISOString().slice(0, 10) <= last) {
    const date = cursor.toISOString().slice(0, monthly ? 7 : 10)
    map.set(date, { date, label: date, revenue: 0, outflow: 0, purchases: 0, expenses: 0, salaries: 0, net: 0, count: 0 })
    if (monthly) { cursor.setUTCDate(1); cursor.setUTCMonth(cursor.getUTCMonth() + 1) }
    else cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  for (const source of filtered) {
    const point = map.get(source.date.slice(0, monthly ? 7 : 10))
    if (!point) continue
    point[source.direction] += source.amount
    if (source.direction !== 'revenue') point.outflow += source.amount
    point.count++
    point.net = point.revenue - point.outflow
  }
  return [...map.values()]
}
