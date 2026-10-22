import type { AppDatabase, PurchaseLineItem } from './db'
import { billSchema, nameKey, type Bill } from './ai-schema'
export type ReviewLine = Bill['items'][number] & { matchId: string }
export function approveBill(db: AppDatabase, input: Bill, rows: ReviewLine[], supplierId: string): AppDatabase {
  const bill = billSchema.parse({ ...input, items: rows })
  if (bill.items.some(i => i.qty == null)) throw new Error('Enter a quantity for every row.')
  const next = structuredClone(db)
  const id = crypto.randomUUID(), now = new Date().toISOString(), date = bill.bill_date || now.slice(0, 10)
  const items: PurchaseLineItem[] = []
  let created = 0
  for (const [index, line] of bill.items.entries()) {
    const qty = line.qty!, amount = line.amount ?? qty * (line.rate ?? 0)
    if (line.kind === 'expense') {
      next.expenses.unshift({ id: crypto.randomUUID(), expenseNumber: `AI-EXP-${id}-${index}`, date, category: 'Other', description: line.name, amount, paidTo: bill.supplier_name || '', paymentMethod: 'Cash', paymentAccount: 'cash-in-hand', status: 'Pending', notes: `Bill ${id}; unpaid supplier payable included in purchase`, createdAt: now })
      continue
    }
    const raw = line.kind === 'raw_material', list = raw ? next.rawMaterials : next.products
    let item = list.find(p => p.id === rows[index].matchId)
    if (rows[index].matchId && !item) throw new Error('Selected item no longer exists. Select it again.')
    if (!item) {
      if (list.some(p => nameKey(p.name) === nameKey(line.name))) throw new Error(`An item named ${line.name} already exists. Select it instead.`)
      const base = { id: crypto.randomUUID(), name: line.name, sku: '', category: 'Other', unit: line.unit || '', quantity: 0, reorderLevel: 0, status: 'In stock' as const, updatedAt: now }
      if (raw) { const value = { ...base, unitCost: line.rate ?? 0 }; next.rawMaterials.push(value); item = value }
      else { const value = { ...base, costPrice: line.rate ?? 0, retailPrice: 0, wholesalePrice: 0, isPurchasedProduct: true }; next.products.push(value); item = value }
      created++
    }
    item.quantity += qty
    item.status = item.quantity <= 0 ? 'Out of stock' : item.quantity <= item.reorderLevel ? 'Low stock' : 'In stock'
    item.updatedAt = now
    if (line.rate != null) { if ('unitCost' in item) item.unitCost = line.rate; else item.costPrice = line.rate }
    items.push({ itemId: item.id, itemType: raw ? 'Raw Material' : 'Finished Product', name: item.name, quantity: qty, unit: line.unit || item.unit, unitPrice: line.rate ?? 0, total: amount })
  }
  const total = bill.bill_total ?? bill.items.reduce((sum, l) => sum + (l.amount ?? l.qty! * (l.rate ?? 0)), 0)
  let supplier = next.suppliers.find(s => s.id === supplierId)
  if (!supplier && bill.supplier_name) {
    if (next.suppliers.some(s => nameKey(s.name) === nameKey(bill.supplier_name!))) throw new Error('Select the existing supplier.')
    supplier = { id: crypto.randomUUID(), name: bill.supplier_name, contactPerson: '', category: 'Other', phone: '', address: '', city: '', openingBalance: 0, currentBalance: 0, status: 'Active', updatedAt: now }
    next.suppliers.push(supplier)
  }
  if (supplier) {
    supplier.currentBalance += total
    next.ledgers.unshift({ id: crypto.randomUUID(), partyId: supplier.id, partyType: 'Supplier', date, referenceType: 'Purchase', referenceId: id, description: 'Approved scanned bill', debit: 0, credit: total, balance: supplier.currentBalance })
  }
  next.purchases.unshift({ id, poNumber: `AI-PO-${id.slice(0, 8)}`, date, supplierId: supplier?.id, supplierName: supplier?.name || '', items, grandTotal: total, amountPaid: 0, balanceDue: total, status: 'Unpaid', paymentMethod: 'Credit', createdAt: now })
  next.aiActivity = [...(next.aiActivity || []), { id, type: 'scan', createdAt: now, created }]
  return next
}
