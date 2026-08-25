import { NextResponse } from 'next/server'
import { initialDatabase, moduleLabels, type ModuleKey } from '@/lib/db'

type Params = { params: Promise<{ resource: string[] }> }

function envelope<T>(data: T, meta: Record<string, unknown> = {}) {
  return NextResponse.json({
    data,
    meta: {
      ...meta,
      mode: 'offline-first',
      company: 'AL FAROOQ FOODS',
      generatedAt: new Date().toISOString(),
    },
  })
}

export async function GET(_: Request, { params }: Params) {
  const { resource } = await params
  const key = resource[0] as ModuleKey

  if (key === 'dashboard') {
    return envelope({
      totalSales: initialDatabase.invoices.reduce((s, i) => s + i.grandTotal, 0),
      totalFinishedStockValuation: initialDatabase.products.reduce((s, p) => s + p.quantity * p.wholesalePrice, 0),
      totalRawMaterialValuation: initialDatabase.rawMaterials.reduce((s, r) => s + r.quantity * r.unitCost, 0),
      totalCustomerReceivables: initialDatabase.customers.reduce((s, c) => s + c.currentBalance, 0),
    })
  }

  if (key === 'products') return envelope(initialDatabase.products)
  if (key === 'raw-materials') return envelope(initialDatabase.rawMaterials)
  if (key === 'invoices') return envelope(initialDatabase.invoices)
  if (key === 'production') return envelope(initialDatabase.productionRuns)
  if (key === 'distributors' || key === 'customers') return envelope(initialDatabase.customers)
  if (key === 'suppliers') return envelope(initialDatabase.suppliers)
  if (key === 'purchases') return envelope(initialDatabase.purchases)
  if (key === 'expenses') return envelope(initialDatabase.expenses)
  if (key === 'cash-bank') return envelope(initialDatabase.accounts)

  if (key === 'settings') {
    return envelope({
      company: 'AL FAROOQ FOODS',
      tagline: 'Mineral Water, Fruit Juices, Confectionery & Snacks',
      currency: 'PKR',
    })
  }

  return NextResponse.json({ error: { code: 'NOT_FOUND', message: `Unknown resource: ${key}` } }, { status: 404 })
}
