'use client';
import { useEffect, useRef, useState, useId } from 'react';
import type { AppDatabase, InvoiceItem } from '@/lib/db';
import { formatPKR } from '@/lib/db';
import { blankDraft, blankRow, draftSchema, factor, type SmartMode, type SmartDraft, type SmartRow, type MatchedRow } from '@/lib/smart-schema';
import { numeric } from '@/lib/ai-schema';
import { rowWarnings } from '@/lib/smart-apply';
const titles: Record<SmartMode, string> = { product_list: 'Add products from a list', purchase_bill: 'Scan a purchase bill', sale_list: 'Create a sale', stock_count: 'Count or adjust stock' };
async function resize(file: File) {
    if (!file.type.startsWith('image/'))
        throw new Error('Choose an image file.');
    const bitmap = await createImageBitmap(file);
    try {
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height)), canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', .8);
    }
    finally {
        bitmap.close();
    }
}
async function request(path: string, input: unknown) { const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }); const body = await response.json(); if (!response.ok)
    throw new Error(body.error || 'Request failed. Continue manually.'); return body; }
export default function SmartEntry({ mode, db, onClose }: {
    mode: SmartMode;
    db: AppDatabase;
    onClose?: () => void;
}) {
    const instanceId = useId();
    const [draft, setDraft] = useState<SmartDraft | null>(null), [matches, setMatches] = useState<MatchedRow[]>([]), [images, setImages] = useState<string[]>([]), [text, setText] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [recording, setRecording] = useState(false), [receipt, setReceipt] = useState<InvoiceItem | null>(null);
    const [source, setSource] = useState<'image' | 'voice' | 'text' | 'manual'>('manual'), [revision, setRevision] = useState(db.revision ?? 0);
    const recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), requestId = useRef(crypto.randomUUID()), inFlight = useRef(false), audioTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (audioTimer.current)
        clearTimeout(audioTimer.current); if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state !== 'inactive')
            recorder.current.stop();
    } stream.current?.getTracks().forEach(t => t.stop()); }, []);
    function startManual() { setDraft(blankDraft(mode)); setMatches([]); setImages([]); setSource('manual'); setRevision(db.revision ?? 0); requestId.current = crypto.randomUUID(); setMessage('Fill in the table, then approve to save.'); setReceipt(null); }
    async function extract(input: unknown, origin: 'image' | 'voice' | 'text') {
        if (inFlight.current)
            return;
        inFlight.current = true;
        setBusy(true);
        setDraft(null); setMatches([]);
        setMessage('Reading your input. Nothing is being saved.');
        setReceipt(null);
        try {
            const result = await request('/api/ai/extract', { mode, ...input as object });
            setDraft({ ...result.draft, lines: result.draft.lines.map(({ status, confidence, warnings, matchedProduct, ...row }: MatchedRow) => row) });
            setMatches(result.draft.lines);
            setSource(origin);
            setRevision(result.revision);
            requestId.current = crypto.randomUUID();
            if (result.transcript)
                setText(result.transcript);
            setMessage('Review the extracted information before approval.');
        }
        catch (e) {
            setMessage((e as Error).message + ' You can use Manual entry below.');
        }
        finally {
            inFlight.current = false;
            setBusy(false);
        }
    }
    async function speak() {
        if (recording) {
            recorder.current?.stop();
            return;
        }
        try {
            if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
                throw new Error('Microphone requires HTTPS or localhost and a supported browser.');
            const media = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.current = media;
            const mime = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t));
            if (!mime) {
                media.getTracks().forEach(t => t.stop());
                throw new Error('This browser has no supported recording format. Paste text instead.');
            }
            const recordingDevice = new MediaRecorder(media, { mimeType: mime });
            recorder.current = recordingDevice;
            const chunks: BlobPart[] = [];
            recordingDevice.ondataavailable = e => { if (e.data.size)
                chunks.push(e.data); };
            recordingDevice.onstop = async () => { if (audioTimer.current)
                clearTimeout(audioTimer.current); media.getTracks().forEach(t => t.stop()); setRecording(false); const blob = new Blob(chunks, { type: mime }); if (blob.size > 10000000) {
                setMessage('Recording too large. Record a shorter command.');
                return;
            } const reader = new FileReader(); reader.onload = () => { void extract({ audio: { data: String(reader.result).split(',')[1], mime } }, 'voice'); }; reader.readAsDataURL(blob); };
            recordingDevice.start();
            setRecording(true);
            setMessage('Listening. Stop when finished (maximum 60 seconds).');
            audioTimer.current = setTimeout(() => { if (recordingDevice.state === 'recording')
                recordingDevice.stop(); }, 60000);
        }
        catch (e) {
            setMessage((e as Error).message);
        }
    }
    const change = (i: number, patch: Partial<SmartRow>) => { if (draft)
        setDraft({ ...draft, lines: draft.lines.map((r, n) => n === i ? { ...r, ...patch } : r) }); };
    async function approve() {
        if (!draft || inFlight.current)
            return;
        inFlight.current = true;
        setBusy(true);
        setMessage('Saving approved records...');
        try {
            const clean = draftSchema.parse(draft);
            const result = await request('/api/ai/approve', { draft: clean, revision, request_id: requestId.current, source });
            window.dispatchEvent(new CustomEvent('hardware:committed', { detail: result.db }));
            setMessage(`${result.summary.updated} updated, ${result.summary.created} created, ${result.summary.warnings.length} warnings. ${result.summary.warnings.join(' | ')}`);
            setReceipt(result.db.invoices.find((s: InvoiceItem) => s.id === result.receiptId) || null);
            setDraft(null);
            setImages([]);
        }
        catch (e) {
            setMessage((e as Error).message);
        }
        finally {
            inFlight.current = false;
            setBusy(false);
        }
    }
    const total = draft?.lines.reduce((sum, row) => { const p = db.products.find(p => p.id === row.product_id); let rate = row.rate ?? 0; if (mode === 'sale_list' && p) {
        try {
            rate = p.retailPrice * factor(p, row.unit);
        }
        catch {
            rate = 0;
        }
    } return sum + (row.amount ?? (row.qty ?? 0) * rate); }, 0) || 0;
    return <section className="smart-entry" aria-label={titles[mode]}>
  <div className="smart-heading"><div><span className="eyebrow">SMART ENTRY</span><h2>{titles[mode]}</h2><p>Scan, upload or speak to fill this form. Manual entry is always available.</p></div>{onClose && <button type="button" className="button secondary" onClick={onClose}>Close</button>}</div>
  <div className="smart-inputs"><label className="button primary">Upload / Scan images<input type="file" accept="image/*" multiple hidden disabled={busy || recording} onChange={async (e) => { const files = Array.from(e.target.files || []); e.target.value = ''; if (!files.length)
        return; if (files.length > 5) {
        setMessage('Choose up to 5 images.');
        return;
    } setBusy(true); try {
        const previews = await Promise.all(files.map(resize));
        setImages(previews);
        setBusy(false);
        await extract({ images: previews }, 'image');
    }
    catch (e) {
        setMessage((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}/></label>
  <label className="button secondary">Camera<input type="file" accept="image/*" capture="environment" hidden disabled={busy || recording} onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ''; if (!file)
        return; try {
        const image = await resize(file);
        setImages([image]);
        await extract({ images: [image] }, 'image');
    }
    catch (e) {
        setMessage((e as Error).message);
    } }}/></label>
  <button type="button" className="button secondary" disabled={busy} onClick={() => void speak()}>{recording ? 'Stop recording' : 'Speak'}</button><button type="button" className="button secondary" disabled={busy || recording} onClick={startManual}>Manual entry</button></div>
  <label className="smart-text-label">Paste text<textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="English, Urdu or Roman Urdu - for example: 2.5mm wire 2 coil, PVC pipe 1 inch 30 feet"/></label><button type="button" className="button secondary" disabled={busy || recording || !text.trim()} onClick={() => { setImages([]); void extract({ text }, 'text'); }}>Read text</button>
  {message && <p role="status" className="smart-notice">{message}</p>}
  {draft && <div className="smart-review"><div className="smart-thumbnails">{images.map((image, i) => <a key={i} href={image} target="_blank" rel="noreferrer"><img src={image} alt={`Source image ${i + 1}`}/></a>)}</div><div className="smart-review-main">
  <h3>Review &amp; approve</h3><p>Nothing is saved yet. Suggested matches need your confirmation. Prices are per selected line unit; catalog prices are per base unit.</p>
  <div className="smart-meta">
   {mode === 'purchase_bill' && <><label>Supplier name<input value={draft.supplier || ''} onChange={e => setDraft({ ...draft, supplier: e.target.value || null, supplier_id: null })}/></label><label>Use supplier<select value={draft.supplier_id || ''} onChange={e => setDraft({ ...draft, supplier_id: e.target.value || null })}><option value="">Create / match by name</option>{db.suppliers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></>}
   {mode === 'sale_list' && <><label>Customer name<input value={draft.customer || ''} onChange={e => setDraft({ ...draft, customer: e.target.value || null, customer_id: null })}/></label><label>Use customer<select value={draft.customer_id || ''} onChange={e => setDraft({ ...draft, customer_id: e.target.value || null })}><option value="">Walk-in / create by name</option>{db.customers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Payment<select value={draft.payment_type || 'cash'} onChange={e => setDraft({ ...draft, payment_type: e.target.value as 'cash' | 'credit' })}><option value="cash">Cash</option><option value="credit">Credit</option></select></label></>}
   <label>Date<input type="date" value={draft.date || ''} onChange={e => setDraft({ ...draft, date: e.target.value || null })}/></label>
   {mode === 'purchase_bill' && <label>Bill total (optional)<input inputMode="decimal" value={draft.total ?? ''} onChange={e => setDraft({ ...draft, total: numeric(e.target.value) as number | null })}/></label>}
  </div>
  <div className="smart-table-wrap"><table><thead><tr><th>Name / match</th><th>{mode === 'stock_count' ? 'Counted qty' : mode === 'product_list' ? 'Opening stock' : 'Qty'}</th><th>Unit</th>{mode === 'purchase_bill' && <><th>Rate</th><th>Amount</th><th>Kind</th></>}<th>Review</th><th /></tr></thead><tbody>{draft.lines.map((row, i) => {
                const p = db.products.find(p => p.id === row.product_id), match = matches.find(m => m.name === row.name), warnings = [...new Set([...(match?.status === 'suggested' && match.product_id === row.product_id ? ['Check suggested variant before approval'] : []), ...rowWarnings(row, db, mode), ...(draft.lines.filter(l => l.name.toLowerCase().trim() === row.name.toLowerCase().trim()).length > 1 ? ['Duplicate line'] : [])])];
                let converted = '';
                try {
                    if (p && row.qty !== null)
                        converted = `${row.qty} ${row.unit || p.unit} = ${row.qty * factor(p, row.unit)} ${p.baseUnit || p.unit}`;
                }
                catch { }
                return <tr key={i} className={warnings.length ? 'smart-warn' : ''}><td><input aria-label={`Name row ${i + 1}`} value={row.name} onChange={e => change(i, { name: e.target.value })}/><span className={`smart-badge ${p ? '' : 'smart-new'}`}>{row.kind === 'expense' ? 'Expense' : p ? match?.status === 'suggested' && match.product_id === row.product_id ? `Suggested match (${Math.round((match?.confidence || 0) * 100)}%)` : 'Existing' : 'New will be created'}</span>{row.kind !== 'expense' && <><input aria-label={`Search existing product row ${i + 1}`} list={`smart-products-${instanceId}-${i}`} placeholder="Search existing or leave blank to create" defaultValue={p?.name || ''} key={`${row.product_id}-${i}`} onChange={e => { const found = db.products.find(p => p.name === e.target.value); change(i, { product_id: found?.id || null }); }}/><datalist id={`smart-products-${instanceId}-${i}`}>{db.products.map(p => <option key={p.id} value={p.name}/>)}</datalist>{p && <button type="button" onClick={() => change(i, { product_id: null })}>Create new instead</button>}</>}</td>
   <td><input aria-label={`Quantity row ${i + 1}`} inputMode="decimal" value={row.qty ?? ''} onChange={e => change(i, { qty: numeric(e.target.value) as number | null })}/><small>{converted}</small></td><td><input aria-label={`Unit row ${i + 1}`} value={row.unit || ''} placeholder={p?.unit || 'piece'} onChange={e => change(i, { unit: e.target.value || null })}/><small>{p?.units?.map(u => `${u.unit}: ${u.factor_to_base}`).join(' | ')}</small></td>
   {mode === 'purchase_bill' && <><td><input aria-label={`Rate row ${i + 1}`} inputMode="decimal" value={row.rate ?? ''} onChange={e => change(i, { rate: numeric(e.target.value) as number | null })}/></td><td><input aria-label={`Amount row ${i + 1}`} inputMode="decimal" value={row.amount ?? ''} onChange={e => change(i, { amount: numeric(e.target.value) as number | null })}/></td><td><select value={row.kind} aria-label={`Kind row ${i + 1}`} onChange={e => change(i, { kind: e.target.value as 'product' | 'expense', product_id: null })}><option value="product">Product</option><option value="expense">Expense</option></select></td></>}
   <td>{warnings.map(w => <p key={w}>{w}</p>)}{(mode === 'product_list' || !p) && row.kind === 'product' && <details><summary>Product details &amp; units</summary>{(['group_name', 'spec', 'category', 'base_unit', 'purchase_price', 'sale_price'] as const).map(field => <label key={field}>{field.replaceAll('_', ' ')}<input value={row[field] ?? ''} onChange={e => change(i, { [field]: field.includes('price') ? numeric(e.target.value) : e.target.value || null })}/></label>)}{(row.units || []).map((u, j) => <div key={j} className="smart-unit"><input aria-label="Conversion unit" value={u.unit} onChange={e => change(i, { units: row.units!.map((v, n) => n === j ? { ...v, unit: e.target.value } : v) })}/><input aria-label="Factor to base unit" value={u.factor_to_base} onChange={e => change(i, { units: row.units!.map((v, n) => n === j ? { ...v, factor_to_base: Number(numeric(e.target.value)) } : v) })}/><button type="button" onClick={() => change(i, { units: row.units!.filter((_, n) => n !== j) })}>?</button></div>)}<button type="button" onClick={() => change(i, { units: [...(row.units || []), { unit: '', factor_to_base: 1 }] })}>Add unit conversion</button></details>}</td><td><button type="button" aria-label={`Delete row ${i + 1}`} onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, n) => n !== i) })}>Delete</button></td></tr>;
            })}</tbody></table></div>
  <div className="smart-footer"><button type="button" className="button secondary" onClick={() => setDraft({ ...draft, lines: [...draft.lines, blankRow()] })}>Add row</button>{(mode === 'purchase_bill' || mode === 'sale_list') && <strong>Line total: {formatPKR(total)}</strong>}<button type="button" className="button primary" disabled={busy || !draft.lines.length} onClick={() => void approve()}>Approve &amp; Save</button><button type="button" className="button secondary" disabled={busy} onClick={() => setDraft(null)}>Cancel draft</button></div>
  </div></div>}
  {receipt && <dialog open className="smart-receipt" aria-label="Printable sale receipt"><div id="smart-print-receipt"><h2>{db.companyProfile?.name || 'Hardware Store'}</h2><p>{receipt.invoiceNumber} | {receipt.date}</p><p>{receipt.customerName} | {receipt.paymentMethod}</p><table><thead><tr><th>Item</th><th>Qty / unit</th><th>Rate</th><th>Total</th></tr></thead><tbody>{receipt.items.map((l, i) => <tr key={i}><td>{l.name}</td><td>{l.quantity} {l.unit}</td><td>{formatPKR(l.unitPrice)}</td><td>{formatPKR(l.total)}</td></tr>)}</tbody></table><h3>Total {formatPKR(receipt.grandTotal)}</h3><p>Paid {formatPKR(receipt.amountPaid)} | Due {formatPKR(receipt.balanceDue)}</p></div><div className="smart-footer"><button type="button" className="button primary" onClick={() => window.print()}>Print receipt</button><button type="button" className="button secondary" onClick={() => setReceipt(null)}>Close receipt</button></div></dialog>}
 </section>;
}
