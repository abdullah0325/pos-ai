'use client'
import { useEffect, useRef, useState } from 'react'
import type { AppDatabase } from '@/lib/db'
import { saleSchema, suggest, type SaleDraft } from '@/lib/ai-schema'
import { aiRequest } from './ai-bill'
export default function AiVoice({ db, onApply }: { db: AppDatabase; onApply: (draft: SaleDraft, customerId: string) => void }) {
  const recorder = useRef<MediaRecorder | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [recording, setRecording] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [transcript, setTranscript] = useState(''), [draft, setDraft] = useState<SaleDraft | null>(null), [customer, setCustomer] = useState('')
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (recorder.current) { recorder.current.onstop = null; if (recorder.current.state !== 'inactive') recorder.current.stop(); recorder.current.stream.getTracks().forEach(t => t.stop()) } }, [])
  async function parse(text: string) {
    setBusy(true); setMessage('')
    try { const result = saleSchema.parse(await aiRequest('/api/parse-sale', JSON.stringify({ transcript: text, products: db.products.map(p => ({ id: p.id, name: p.name })), customers: db.customers.map(c => ({ id: c.id, name: c.name })) }))); setDraft(result); setCustomer(suggest(result.customer_name || '', db.customers)) }
    catch (e) { setMessage(e instanceof Error ? e.message : 'AI needs internet. Continue manually.') } finally { setBusy(false) }
  }
  async function start() {
    try {
      if (!navigator.onLine) throw new Error('AI needs internet. Continue manually.')
      if (!navigator.mediaDevices || typeof MediaRecorder === 'undefined') throw new Error('Microphone needs HTTPS or localhost and a supported browser.')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      let rec: MediaRecorder
      try { rec = new MediaRecorder(stream) } catch (e) { stream.getTracks().forEach(t => t.stop()); throw e }
      recorder.current = rec; const chunks: BlobPart[] = []
      rec.ondataavailable = e => chunks.push(e.data)
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop()); if (timer.current) clearTimeout(timer.current); setRecording(false); setBusy(true)
        try { const form = new FormData(); form.set('audio', new Blob(chunks, { type: rec.mimeType }), rec.mimeType.includes('mp4') ? 'sale.mp4' : 'sale.webm'); const result = await aiRequest('/api/transcribe', form, false); setTranscript(result.text); await parse(result.text) }
        catch (e) { setMessage(e instanceof Error ? e.message : 'AI needs internet. Continue manually.') } finally { setBusy(false) }
      }
      rec.start(); setRecording(true); setMessage(''); timer.current = setTimeout(() => { if (rec.state === 'recording') rec.stop() }, 60000)
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Microphone unavailable. Continue manually.') }
  }
  return <section className="ai-panel gradient-card p-4 rounded-2xl border border-stone-200 space-y-3 pos-no-print"><div className="flex gap-3 items-center"><strong>Voice Sale</strong><button className="btn btn-primary" disabled={busy} onClick={() => recording ? recorder.current?.stop() : void start()}>{recording ? 'Stop recording' : busy ? 'Processing…' : 'Speak'}</button></div>
    <p className="text-sm">English, Urdu or Roman Urdu. Recording stops after 60 seconds. Review before checkout.</p>
    {message && <p role="status">{message}</p>}
    <textarea aria-label="Sale transcript" placeholder="Speak or type a sale description" value={transcript} onChange={e => setTranscript(e.target.value)} className="w-full" />
    <button className="btn" disabled={busy || recording || !transcript.trim()} onClick={() => void parse(transcript)}>Parse transcript</button>
    {draft && <div className="space-y-3"><label>Customer ({draft.customer_name || 'not specified'})<select value={customer} onChange={e => setCustomer(e.target.value)}><option value="">Select manually / walk-in</option>{db.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Payment<select value={draft.payment_type || 'cash'} onChange={e => setDraft({ ...draft, payment_type: e.target.value as 'cash' | 'credit' })}><option value="cash">Cash</option><option value="credit">Credit</option></select></label>
      {draft.items.map((item, i) => <div key={i} className="flex gap-2 flex-wrap"><span>{item.spoken_name} ({item.unit || 'unit not specified'})</span><select aria-label={`Voice product ${i + 1}`} value={item.matched_product_id || ''} onChange={e => setDraft({ ...draft, items: draft.items.map((r, n) => n === i ? { ...r, matched_product_id: e.target.value || null } : r) })}><option value="">Unmatched — select product</option>{db.products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}</select><input aria-label={`Voice quantity ${i + 1}`} type="number" min="0.001" step="any" value={item.qty} onChange={e => setDraft({ ...draft, items: draft.items.map((r, n) => n === i ? { ...r, qty: Number(e.target.value) } : r) })} /><button onClick={() => setDraft({ ...draft, items: draft.items.filter((_, n) => i !== n) })}>Delete</button></div>)}
      <button className="btn btn-primary" disabled={draft.items.some(r => !r.matched_product_id) || (draft.payment_type === 'credit' && !customer) || !draft.items.length} onClick={() => { try { onApply(saleSchema.parse(draft), customer); setDraft(null); setMessage('Draft loaded into POS. Check units, quantities and rates, then use the existing checkout to confirm.') } catch { setMessage('Check quantities and customer before continuing.') } }}>Use draft in POS</button><button className="btn" onClick={() => setDraft(null)}>Cancel draft</button>
    </div>}
  </section>
}
