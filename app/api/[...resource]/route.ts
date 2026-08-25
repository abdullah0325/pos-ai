import { NextResponse } from 'next/server'
import { getRecords, moduleLabels, type ModuleKey, type RecordItem } from '@/lib/data'

type Params = { params: Promise<{ resource: string[] }> }
const dataKeys = Object.keys(moduleLabels).filter((key) => !['dashboard', 'reports', 'settings'].includes(key)) as Exclude<ModuleKey, 'dashboard' | 'reports' | 'settings'>[]

function envelope<T>(data: T, meta: Record<string, unknown> = {}) { return NextResponse.json({ data, meta: { ...meta, mode: 'demo-offline', generatedAt: new Date().toISOString() } }) }

export async function GET(_: Request, { params }: Params) {
  const { resource } = await params
  const key = resource[0] as ModuleKey
  if (key === 'dashboard') return envelope({ metrics: [{ label: 'Total sales', value: 428650 }, { label: 'Orders', value: 184 }], mode: 'demo' })
  if (dataKeys.includes(key as never)) return envelope(getRecords(key as never), { resource: key })
  if (key === 'reports') return envelope({ message: 'Report aggregates will be supplied by the live adapter.' })
  if (key === 'settings') return envelope({ workspace: 'Atelier Studio', currency: 'PKR' })
  return NextResponse.json({ error: { code: 'NOT_FOUND', message: `Unknown resource: ${key}` } }, { status: 404 })
}

export async function POST(request: Request, { params }: Params) {
  const { resource } = await params
  const key = resource[0] as ModuleKey
  if (!dataKeys.includes(key as never)) return NextResponse.json({ error: { code: 'INVALID_RESOURCE', message: 'This resource does not accept records.' } }, { status: 400 })
  let body: Partial<RecordItem>
  try { body = await request.json() } catch { return NextResponse.json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } }, { status: 400 }) }
  if (!body.name || typeof body.name !== 'string') return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'name is required.' } }, { status: 422 })
  const record: RecordItem = { id: `${key}-${crypto.randomUUID()}`, name: body.name.trim(), category: body.category || 'General', quantity: body.quantity || 0, unit: body.unit || 'unit', price: body.price || 0, status: body.status || 'Pending', meta: body.meta || 'Created via API' }
  return envelope(record, { resource: key, persisted: false })
}
