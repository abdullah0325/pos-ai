import { z } from 'zod'
const id = z.string().min(1).max(150)
const value = z.number().finite().min(-1e12).max(1e12)
const item = z.object({ id, name: z.string().max(300), unit: z.string().max(100), stock: value, purchase_price: value.nullable(), sale_price: value.nullable() })
const line = z.object({ item_id: id.nullable(), kind: z.enum(['product', 'raw_material']).nullable(), name: z.string().max(300), qty: value, unit: z.string().max(100), rate: value, amount: value })
const record = z.object({ id, name: z.string().max(300), date: z.string().max(50), total: value, items: z.array(line).max(500) })
export const mirrorSchema = z.object({ products: z.array(item).max(5000), raw_materials: z.array(item).max(5000), purchases: z.array(record).max(20), sales: z.array(record).max(20), expenses: z.array(z.object({ id, name: z.string().max(300), date: z.string().max(50), amount: value })).max(100), movements: z.array(z.object({ id, itemId: id, kind: z.enum(['product', 'raw_material']), type: z.enum(['purchase', 'sale', 'adjust']), qty: value, refId: id, createdAt: z.string().datetime() })).max(10000) })
