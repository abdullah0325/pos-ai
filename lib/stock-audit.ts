import type { AppDatabase } from './db'
export function auditStock(previous: AppDatabase, next: AppDatabase): AppDatabase {
  const now = new Date().toISOString()
  const purchase = next.purchases.find(p => !previous.purchases.some(old => old.id === p.id))
  const sale = next.invoices.find(p => !previous.invoices.some(old => old.id === p.id))
  const movements = [...(next.stockMovements || [])]
  for (const kind of ['product', 'raw_material'] as const) {
    const before = kind === 'product' ? previous.products : previous.rawMaterials
    const after = kind === 'product' ? next.products : next.rawMaterials
    for (const item of after) {
      const qty = item.quantity - (before.find(p => p.id === item.id)?.quantity || 0)
      if (qty) movements.push({ id: crypto.randomUUID(), itemId: item.id, kind, type: purchase ? 'purchase' : sale ? 'sale' : !before.some(p => p.id === item.id) ? 'opening' : 'adjust', qty, refId: purchase?.id || sale?.id || crypto.randomUUID(), createdAt: now })
    }
    for (const item of before) if (!after.some(p => p.id === item.id) && item.quantity) movements.push({ id: crypto.randomUUID(), itemId: item.id, kind, type: 'adjust', qty: -item.quantity, refId: item.id, createdAt: now })
  }
  return { ...next, stockMovements: movements }
}
