import type { AppDatabase } from './db'
export function mirrorPayload(before: AppDatabase, next: AppDatabase) {
  const movements = (next.stockMovements || []).filter(m => !(before.stockMovements || []).some(old => old.id === m.id))
  const purchases = next.purchases.filter(p => !before.purchases.some(old => old.id === p.id))
  const sales = next.invoices.filter(p => !before.invoices.some(old => old.id === p.id))
  const touched = new Set(movements.map(m => m.itemId))
  return {
    products: next.products.filter(p => touched.has(p.id)).map(p => ({ id: p.id, name: p.name, unit: p.unit, stock: p.quantity, purchase_price: p.costPrice, sale_price: p.retailPrice })),
    raw_materials: next.rawMaterials.filter(p => touched.has(p.id)).map(p => ({ id: p.id, name: p.name, unit: p.unit, stock: p.quantity, purchase_price: p.unitCost, sale_price: null })),
    purchases: purchases.map(p => ({ id: p.id, name: p.supplierName, date: p.date, total: p.grandTotal, items: p.items.map(l => ({ item_id: l.itemId || l.productId || l.rawMaterialId || null, kind: l.itemType === 'Raw Material' ? 'raw_material' as const : 'product' as const, name: l.name, qty: l.quantity, unit: l.unit, rate: l.unitPrice, amount: l.total })) })),
    sales: sales.map(p => ({ id: p.id, name: p.customerName, date: p.date, total: p.grandTotal, items: p.items.map(l => ({ item_id: l.productId, kind: 'product' as const, name: l.name, qty: l.quantity, unit: l.unit, rate: l.unitPrice, amount: l.total })) })),
    expenses: next.expenses.filter(p => !before.expenses.some(old => old.id === p.id)).map(p => ({ id: p.id, name: p.description, date: p.date, amount: p.amount })), movements,
  }
}
