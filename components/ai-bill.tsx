'use client'
import { useState } from 'react'
import type { AppDatabase } from '@/lib/db'
import { approveBill, type ReviewLine } from '@/lib/ai-purchase'
import { billSchema, numeric, suggest, type Bill } from '@/lib/ai-schema'
export async function aiRequest(path: string, body: BodyInit, json = true) {
  if (!navigator.onLine) throw new Error('AI needs internet. Continue manually.')
  const response = await fetch(path, { method: 'POST', headers: json ? { 'Content-Type': 'application/json' } : {}, body })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'AI needs internet. Continue manually.')
  return result
}
async function resize(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image.')
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.8)
  } finally { bitmap.close() }
}
export default function AiBill({ db, onSave }: { db: AppDatabase; onSave: (db: AppDatabase) => void }) {
  const [bill, setBill] = useState<Bill | null>(null), [rows, setRows] = useState<ReviewLine[]>([])
  const [supplierId, setSupplierId] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const candidates = (kind: string) => kind === 'raw_material' ? db.rawMaterials : kind === 'finished_product' ? db.products : []
  const change = (index: number, patch: Partial<ReviewLine>) => setRows(old => old.map((r, i) => i === index ? { ...r, ...patch } : r))
  return <section className="ai-panel gradient-card p-4 rounded-2xl border border-stone-200 space-y-3 mb-4" aria-label="Scan Bill">
    <div className="flex gap-3 items-center flex-wrap"><strong>Purchase bill assistant</strong><label className="btn btn-primary cursor-pointer">{busy ? 'Reading…' : 'Scan Bill'}<input aria-label="Upload purchase bill" type="file" accept="image/*" capture="environment" className="sr-only" disabled={busy} onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return
      setBusy(true); setMessage('')
      try { const data = billSchema.parse(await aiRequest('/api/scan-bill', JSON.stringify({ image: await resize(file) }))); setBill(data); setRows(data.items.map(r => ({ ...r, matchId: suggest(r.name, candidates(r.kind)) }))); setSupplierId(suggest(data.supplier_name || '', db.suppliers)) }
      catch (error) { setMessage(error instanceof Error ? error.message : 'AI needs internet. Continue manually.') } finally { setBusy(false) }
    }} /></label></div>
    {message && <p role="status">{message}</p>}
    {bill && <><p>Review every field. Nothing is saved until approval. Bill is recorded as unpaid.</p>
      <div className="flex gap-3 flex-wrap"><label>Supplier<input aria-label="Supplier name" value={bill.supplier_name || ''} onChange={e => { setBill({ ...bill, supplier_name: e.target.value || null }); setSupplierId(suggest(e.target.value, db.suppliers)) }} /></label>
      <label>Supplier match<select value={supplierId} onChange={e => setSupplierId(e.target.value)}><option value="">Create new / no supplier</option>{db.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>Date<input type="date" value={bill.bill_date || ''} onChange={e => setBill({ ...bill, bill_date: e.target.value || null })} /></label>
      <label>Bill total<input aria-label="Bill total" value={bill.bill_total ?? ''} onChange={e => setBill({ ...bill, bill_total: numeric(e.target.value) as number | null })} /></label></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Name', 'Qty', 'Unit', 'Rate', 'Amount', 'Kind', 'Match', ''].map((s, i) => <th key={i}>{s}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i} className={row.qty != null && row.rate != null && row.amount != null && Math.abs(row.qty * row.rate - row.amount) > 0.01 ? 'bg-amber-100' : ''}>
        {(['name', 'qty', 'unit', 'rate', 'amount'] as const).map(field => <td key={field}><input aria-label={`${field} row ${i + 1}`} className="w-full min-w-20" value={row[field] ?? ''} onChange={e => change(i, { [field]: ['qty', 'rate', 'amount'].includes(field) ? numeric(e.target.value) : e.target.value })} /></td>)}
        <td><select aria-label={`Kind row ${i + 1}`} value={row.kind} onChange={e => change(i, { kind: e.target.value as ReviewLine['kind'], matchId: suggest(row.name, candidates(e.target.value)) })}><option value="raw_material">Raw material</option><option value="finished_product">Finished product</option><option value="expense">Expense</option></select></td>
        <td>{row.kind !== 'expense' && <><span>{row.matchId ? 'Existing item' : 'New (will be created)'}</span><select aria-label={`Match row ${i + 1}`} value={row.matchId} onChange={e => change(i, { matchId: e.target.value })}><option value="">Create new</option>{candidates(row.kind).map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}</select></>}</td>
        <td><button type="button" onClick={() => setRows(rows.filter((_, n) => n !== i))}>Delete</button></td></tr>)}</tbody></table></div>
      <p className="text-sm">Amber rows: quantity × rate differs from amount. Check units; no unit conversion is performed.</p>
      <div className="flex gap-3"><button className="btn" onClick={() => setRows([...rows, { name: '', qty: null, unit: null, rate: null, amount: null, kind: 'raw_material', matchId: '' }])}>Add row</button>
      <button className="btn btn-primary" disabled={busy} onClick={() => { try { const next = approveBill(db, bill, rows, supplierId); onSave(next); const created = next.aiActivity!.at(-1)!.created; setMessage(`${rows.filter(r => r.kind !== 'expense').length - created} items updated, ${created} items created, ${rows.filter(r => r.kind === 'expense').length} expenses added.`); setBill(null); setRows([]) } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save.') } }}>Approve &amp; Save</button><button className="btn" onClick={() => setBill(null)}>Cancel</button></div>
    </>}
  </section>
}
