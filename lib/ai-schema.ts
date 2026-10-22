import { z } from 'zod'

export function numeric(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const text = value.trim().replace(/[\u06f0-\u06f9\u0660-\u0669]/g, c => String(c.charCodeAt(0) - (c.charCodeAt(0) >= 0x6f0 ? 0x6f0 : 0x660))).replace(/[,\u066c]/g, '').replace(/\u066b/g, '.')
  return text === '' ? null : Number(text)
}
export const number = z.preprocess(numeric, z.number().finite().min(0).max(1e12))
export const quantity = z.preprocess(numeric, z.number().finite().positive().max(1e9))
export const text = z.string().trim().max(300)
export const billLine = z.object({ name: text.min(1), qty: quantity.nullable(), unit: text.nullable(), rate: number.nullable(), amount: number.nullable(), kind: z.enum(['raw_material', 'finished_product', 'expense']) })
export const billSchema = z.object({ supplier_name: text.nullable(), bill_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), bill_total: number.nullable(), items: z.array(billLine).min(1).max(100) })
export const saleSchema = z.object({ customer_name: text.nullable(), payment_type: z.enum(['cash', 'credit']).nullable(), items: z.array(z.object({ spoken_name: text.min(1), matched_product_id: text.nullable(), qty: quantity, unit: text.nullable() })).min(1).max(100) })
export const catalogSchema = z.object({ transcript: z.string().trim().min(1).max(10000), products: z.array(z.object({ id: text.min(1), name: text.min(1) })).max(3000), customers: z.array(z.object({ id: text.min(1), name: text.min(1) })).max(3000) })
export type Bill = z.infer<typeof billSchema>
export type BillLine = z.infer<typeof billLine>
export type SaleDraft = z.infer<typeof saleSchema>
export const nameKey = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ')
export function suggest(name: string, items: ReadonlyArray<{ id: string; name: string }>): string {
  const key = nameKey(name)
  const exact = items.find(p => nameKey(p.name) === key)
  if (exact) return exact.id
  const grams = (s: string) => new Set(Array.from({ length: Math.max(0, s.length - 2) }, (_, i) => s.slice(i, i + 3)))
  const a = grams(key)
  let best = '', score = 0.6
  for (const item of items) {
    const b = grams(nameKey(item.name))
    const similarity = 2 * [...a].filter(g => b.has(g)).length / (a.size + b.size || 1)
    if (similarity > score) { best = item.id; score = similarity }
  }
  return best
}
