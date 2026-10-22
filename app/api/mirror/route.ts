import { NextResponse } from 'next/server'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { mirrorSchema } from '@/lib/mirror-schema'
export const runtime = 'nodejs'
export async function POST(request: Request) {
  const parsed = mirrorSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid mirror data.' }, { status: 400 })
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'Neon is not configured.' }, { status: 503 })
  neonConfig.webSocketConstructor = ws
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 })
  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    const data = parsed.data
    // Serialize mirrors for a single POC store. IDs make retries idempotent.
    await client.query('SELECT pg_advisory_xact_lock(724193)')
    for (const table of ['products', 'raw_materials'] as const) for (const p of data[table]) {
      await client.query(`INSERT INTO ${table} (id,name,unit,stock,purchase_price,sale_price) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET name=excluded.name,unit=excluded.unit,stock=excluded.stock,purchase_price=excluded.purchase_price,sale_price=excluded.sale_price`, [p.id, p.name, p.unit, p.stock, p.purchase_price, p.sale_price])
    }
    for (const table of ['purchases', 'sales'] as const) for (const record of data[table]) {
      const purchase = table === 'purchases'
      const inserted = await client.query(`INSERT INTO ${table} (id,${purchase ? 'supplier_name,bill_date' : 'customer_name,sale_date'},total) VALUES ($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING RETURNING id`, [record.id, record.name, record.date, record.total])
      if (!inserted.rowCount) continue
      for (const [index, l] of record.items.entries()) await client.query(`INSERT INTO ${purchase ? 'purchase_items' : 'sale_items'} (id,${purchase ? 'purchase_id' : 'sale_id'},item_id,kind,raw_name,qty,unit,rate,amount) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [`${record.id}-${index}`, record.id, l.item_id, l.kind, l.name, l.qty, l.unit, l.rate, l.amount])
    }
    for (const e of data.expenses) await client.query('INSERT INTO expenses (id,description,expense_date,amount) VALUES ($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING', [e.id, e.name, e.date, e.amount])
    for (const m of data.movements) await client.query('INSERT INTO stock_movements (id,item_id,kind,type,qty,ref_id,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING', [m.id, m.itemId, m.kind, m.type, m.qty, m.refId, m.createdAt])
    await client.query('COMMIT')
    return NextResponse.json({ synced: true })
  } catch {
    if (client) await client.query('ROLLBACK').catch(() => {})
    return NextResponse.json({ error: 'Saved locally; not synced to Neon.' }, { status: 503 })
  } finally { client?.release(); await pool.end() }
}
