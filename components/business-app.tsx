'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, BarChart3, Bell, Boxes, Check, ChevronRight, CircleDollarSign, FileText, Factory, LayoutDashboard, Menu, Package, Plus, Receipt, Search, Settings, Share2, ShoppingBag, ShoppingCart, SlidersHorizontal, Truck, Users, Wallet, X, WifiOff, Pencil, Trash2, ImagePlus } from 'lucide-react'
import { currency, dashboardStats, getRecords, moduleLabels, saveRecords, type ModuleKey, type RecordItem, type Status } from '@/lib/data'

const navGroups = [
  { label: 'Overview', items: [{ key: 'dashboard', icon: LayoutDashboard }] },
  { label: 'Inventory', items: [{ key: 'products', icon: Package }, { key: 'raw-materials', icon: Boxes }, { key: 'production', icon: Factory }] },
  { label: 'Commerce', items: [{ key: 'sales', icon: ShoppingCart }, { key: 'purchases', icon: ShoppingBag }, { key: 'expenses', icon: Wallet }] },
  { label: 'People', items: [{ key: 'staff', icon: Users }, { key: 'customers', icon: Users }, { key: 'suppliers', icon: Truck }] },
  { label: 'Insights', items: [{ key: 'reports', icon: BarChart3 }, { key: 'settings', icon: Settings }] },
] as const

const quickStats = [34, 56, 42, 76, 65, 82, 68, 90, 78, 88, 72, 96]

function statusClass(status: Status) {
  if (status === 'Low stock') return 'status status-warning'
  if (status === 'Completed' || status === 'Paid' || status === 'Active') return 'status status-success'
  if (status === 'In production') return 'status status-purple'
  return 'status status-neutral'
}

export default function BusinessApp() {
  const [active, setActive] = useState<ModuleKey>('dashboard')
  const [mobileNav, setMobileNav] = useState(false)
  const [query, setQuery] = useState('')
  const [offline, setOffline] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [records, setRecords] = useState<RecordItem[]>([])
  const [editor, setEditor] = useState<{ record?: RecordItem } | null>(null)
  const [editingRecord, setEditingRecord] = useState<RecordItem | undefined>()

  useEffect(() => {
    setOffline(!navigator.onLine)
    const online = () => setOffline(false)
    const offlineHandler = () => setOffline(true)
    window.addEventListener('online', online); window.addEventListener('offline', offlineHandler)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offlineHandler) }
  }, [])

  useEffect(() => {
    if (active !== 'dashboard' && active !== 'reports' && active !== 'settings') setRecords(getRecords(active))
  }, [active])

  const filtered = useMemo(() => records.filter((record) => `${record.name} ${record.category} ${record.meta}`.toLowerCase().includes(query.toLowerCase())), [records, query])

  function selectModule(key: ModuleKey) { setActive(key); setQuery(''); setMobileNav(false) }
  function openCreate() { if (active !== 'dashboard' && active !== 'reports' && active !== 'settings') { setEditingRecord(undefined); setEditor({}) } }
  function openEdit(record: RecordItem) { setEditingRecord(record); setEditor({ record }) }
  function removeRecord(id: string) { if (active === 'dashboard' || active === 'reports' || active === 'settings') return; const updated = records.filter((record) => record.id !== id); setRecords(updated); saveRecords(active, updated) }
  function saveRecord(record: RecordItem) { if (active === 'dashboard' || active === 'reports' || active === 'settings') return; const updated = editingRecord ? records.map((item) => item.id === record.id ? record : item) : [record, ...records]; setRecords(updated); saveRecords(active, updated); setEditor(null); setEditingRecord(undefined) }

  return <div className="app-frame">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><img className="brand-logo" src="/al-farooq-foods-logo.png" alt="AL-FAROOQ FOODS logo" /><button className="icon-button close-nav" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X /></button></div>
      <div className="workspace"><div className="workspace-avatar">A</div><div><strong>Atelier Studio</strong><span>Business workspace</span></div><ChevronRight className="workspace-chevron" /></div>
      <nav className="nav-list" aria-label="Main navigation">{navGroups.map((group) => <div className="nav-group" key={group.label}><span className="nav-label">{group.label}</span>{group.items.map(({ key, icon: Icon }) => <button key={key} className={`nav-item ${active === key ? 'nav-item-active' : ''}`} onClick={() => selectModule(key as ModuleKey)}><Icon /><span>{moduleLabels[key as ModuleKey]}</span>{key === 'raw-materials' && <b className="nav-count">2</b>}</button>)}</div>)}</nav>
      <div className="sidebar-foot"><div className="offline-card"><div className="offline-icon"><WifiOff /></div><div><strong>{offline ? 'Offline mode' : 'Demo workspace'}</strong><span>{offline ? 'Changes save on device' : 'Ready for live data'}</span></div></div><button className="user-card"><div className="user-avatar">AS</div><div><strong>Ali Siddiqui</strong><span>Owner</span></div><SlidersHorizontal /></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></button><div className="breadcrumb"><span>Workspace</span><ChevronRight /><strong>{moduleLabels[active]}</strong></div><div className="top-actions"><div className="search-box"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search anything" aria-label="Search" /></div><button className="icon-button"><Bell /><i /></button><div className="top-avatar">AS</div></div></header>
      <section className="content">
        {active === 'dashboard' ? <Dashboard onPayment={() => setShowPayment(true)} onNavigate={selectModule} /> : active === 'reports' ? <Reports /> : active === 'settings' ? <SettingsPanel /> : <ModuleView active={active} records={filtered} onAdd={openCreate} onEdit={openEdit} onDelete={removeRecord} />}
      </section>
    </main>
    <nav className="mobile-tabs"><button onClick={() => selectModule('dashboard')} className={active === 'dashboard' ? 'active' : ''}><LayoutDashboard /><span>Home</span></button><button onClick={() => selectModule('products')} className={active === 'products' ? 'active' : ''}><Package /><span>Inventory</span></button><button onClick={() => selectModule('sales')} className={active === 'sales' ? 'active' : ''}><Receipt /><span>Sales</span></button><button onClick={() => setMobileNav(true)}><Menu /><span>More</span></button></nav>
    {showPayment && <PaymentSuccess onClose={() => setShowPayment(false)} />}
    {editor && <RecordEditor active={active} record={editingRecord} onClose={() => { setEditor(null); setEditingRecord(undefined) }} onSave={saveRecord} />}
  </div>
}

function Dashboard({ onPayment, onNavigate }: { onPayment: () => void; onNavigate: (key: ModuleKey) => void }) {
  return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow">Thursday, August 21, 2026</p><h1>Good morning, Ali</h1><p className="subheading">Here&apos;s what&apos;s happening with your business today.</p></div><div className="heading-actions"><button className="button secondary"><FileText /> Export</button><button className="button primary" onClick={() => onNavigate('sales')}><Plus /> New sale</button></div></div>
    <div className="stat-grid">{dashboardStats.map((stat) => <div className="stat-card" key={stat.label}><div className={`stat-icon ${stat.tone}`}><CircleDollarSign /></div><div className="stat-label">{stat.label}</div><strong>{stat.value}</strong><span className="stat-change">{stat.change} <small>vs last month</small></span></div>)}</div>
    <div className="dashboard-grid"><div className="panel sales-panel"><div className="panel-heading"><div><h2>Sales overview</h2><p>Revenue performance this month</p></div><button className="select-button">This month <ChevronRight /></button></div><div className="chart-area"><div className="chart-y"><span>Rs. 50k</span><span>Rs. 25k</span><span>Rs. 0</span></div><div className="chart"><div className="chart-gridlines"><i /><i /><i /></div><svg viewBox="0 0 650 210" preserveAspectRatio="none" aria-label="Sales chart"><path d="M0 182 C40 160, 64 168, 90 142 S150 154, 178 110 S230 135, 270 116 S320 90, 350 112 S406 88, 440 76 S490 88, 522 52 S575 78, 610 32 S635 45, 650 18" fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" /><path d="M0 182 C40 160, 64 168, 90 142 S150 154, 178 110 S230 135, 270 116 S320 90, 350 112 S406 88, 440 76 S490 88, 522 52 S575 78, 610 32 S635 45, 650 18 L650 210 L0 210Z" fill="url(#fill)" opacity=".22" /><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#8C52FF" /><stop offset="1" stopColor="#8C52FF" stopOpacity="0" /></linearGradient></defs></svg><div className="chart-x"><span>Aug 01</span><span>Aug 07</span><span>Aug 14</span><span>Aug 21</span><span>Aug 31</span></div></div></div></div><div className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest updates from your workspace</p></div><button className="link-button">View all</button></div><div className="activity-list"><ActivityItem icon={ShoppingCart} title="New sale recorded" detail="Order #1048 · Rs. 6,896" time="10 min ago" tone="purple" /><ActivityItem icon={Factory} title="Production completed" detail="Canvas Weekend Tote · 180 pcs" time="1 hr ago" tone="olive" /><ActivityItem icon={Package} title="Low stock alert" detail="Relaxed Linen Shirt · 42 pcs left" time="3 hrs ago" tone="rust" /><ActivityItem icon={Truck} title="Purchase order received" detail="Horizon Textiles · 680 kg" time="5 hrs ago" tone="purple" /></div></div></div>
    <div className="bottom-grid"><div className="panel"><div className="panel-heading"><div><h2>Top products</h2><p>Best performing products this month</p></div><button className="link-button" onClick={() => onNavigate('products')}>View products</button></div><div className="top-products">{[['Classic Cotton Tee','Rs. 84,240','32%'],['Relaxed Linen Shirt','Rs. 61,380','24%'],['Canvas Weekend Tote','Rs. 42,120','18%']].map(([name, value, pct], i) => <div className="product-row" key={name}><div className="product-rank">0{i + 1}</div><div className="product-info"><strong>{name}</strong><span>{value} revenue</span></div><div className="progress"><i style={{ width: pct }} /></div><b>{pct}</b></div>)}</div></div><div className="panel payment-card"><div className="payment-art"><div className="check-mark">✓</div></div><div><p className="eyebrow">Latest payment</p><h2>Rs. 1,000.00</h2><p>Successfully sent to<br /><strong>Muhammad Abdullah</strong></p></div><button className="button primary" onClick={onPayment}>View receipt <ChevronRight /></button></div></div>
  </div>
}

function ActivityItem({ icon: Icon, title, detail, time, tone }: { icon: typeof Activity; title: string; detail: string; time: string; tone: string }) { return <div className="activity-item"><div className={`activity-icon ${tone}`}><Icon /></div><div><strong>{title}</strong><span>{detail}</span></div><time>{time}</time></div> }

function ModuleView({ active, records, onAdd, onEdit, onDelete }: { active: ModuleKey; records: RecordItem[]; onAdd: () => void; onEdit: (record: RecordItem) => void; onDelete: (id: string) => void }) {
  const isMoney = ['sales', 'purchases', 'expenses'].includes(active)
  return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow">Workspace / {moduleLabels[active]}</p><h1>{moduleLabels[active]}</h1><p className="subheading">Manage and track your {moduleLabels[active].toLowerCase()} in one place.</p></div><button className="button primary" onClick={onAdd}><Plus /> Add {moduleLabels[active].replace(/s$/, '')}</button></div><div className="module-toolbar"><div className="result-count">{records.length} records <span>·</span> Demo data</div><button className="button secondary"><SlidersHorizontal /> Filters</button></div><div className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Name</th><th>Category</th><th>{isMoney ? 'Amount' : 'Quantity'}</th><th>Status</th><th>Details</th><th aria-label="Actions" /></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><div className="table-name"><div className="row-avatar">{record.name.slice(0, 1)}</div><strong>{record.name}</strong></div></td><td>{record.category || '—'}</td><td>{isMoney ? currency(record.price) : `${record.quantity || 0} ${record.unit || ''}`}</td><td><span className={statusClass(record.status)}>{record.status}</span></td><td className="muted-cell">{record.meta || '—'}</td><td><div className="row-actions"><button className="row-action" onClick={() => onEdit(record)} aria-label={`Edit ${record.name}`}><Pencil /></button><button className="row-action danger" onClick={() => { if (window.confirm(`Delete ${record.name}?`)) onDelete(record.id) }} aria-label={`Delete ${record.name}`}><Trash2 /></button></div></td></tr>)}</tbody></table></div>{records.length === 0 && <div className="empty-state"><Package /><strong>No records found</strong><span>Try a different search or create a new record.</span></div>}</div></div>
}

function Reports() { return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow">Workspace / Insights</p><h1>Reports</h1><p className="subheading">Understand performance and make better decisions.</p></div><button className="button secondary"><FileText /> Export report</button></div><div className="report-grid">{[['Revenue by channel','Rs. 428,650','+12.8%'],['Gross margin','38.4%','+4.2%'],['Inventory value','Rs. 1.84M','+8.6%'],['Average order value','Rs. 2,329','+6.1%']].map(([label,value,change]) => <div className="panel report-card" key={label}><span>{label}</span><strong>{value}</strong><b>{change} this month</b><div className="mini-bars">{quickStats.slice(0, 8).map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div></div>)}</div><div className="panel report-large"><div className="panel-heading"><div><h2>Business health</h2><p>Key operating indicators across your workspace</p></div><button className="select-button">Last 30 days <ChevronRight /></button></div><div className="health-list">{[['Stock coverage','84%','Healthy'],['Order fulfillment','92%','Excellent'],['Supplier reliability','78%','Healthy'],['Expense control','68%','Watch']].map(([label,value,status]) => <div className="health-row" key={label}><span>{label}</span><div className="health-bar"><i style={{ width: value }} /></div><strong>{value}</strong><span className={status === 'Watch' ? 'status status-warning' : 'status status-success'}>{status}</span></div>)}</div></div></div> }

function SettingsPanel() { return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow">Workspace / Preferences</p><h1>Settings</h1><p className="subheading">Configure your workspace and offline preferences.</p></div></div><div className="settings-grid"><div className="panel settings-nav"><button className="settings-active">Workspace profile</button><button>Team & permissions</button><button>Notifications</button><button>Data & integrations</button></div><div className="panel settings-form"><h2>Workspace profile</h2><p>These details appear across receipts, exports, and reports.</p><label>Business name<input defaultValue="AL FAROOQ FOODS" /></label><label>Phone numbers<input defaultValue="0344 9549051, 0346 9829900" /></label><label>Email<input type="email" defaultValue="umarfarooq4847@gmail.com" /></label><label>Currency<select defaultValue="PKR"><option value="PKR">PKR — Pakistani Rupee</option></select></label><label>Offline mode<div className="toggle-row"><span>Save changes locally when offline</span><input type="checkbox" defaultChecked /></div></label><button className="button primary">Save changes</button></div></div></div> }

function PaymentSuccess({ onClose }: { onClose: () => void }) { return <div className="payment-overlay"><div className="receipt-modal"><button className="receipt-close" onClick={onClose} aria-label="Close receipt"><X /></button><div className="receipt-success"><div className="receipt-confetti" aria-hidden="true">•　✦　•<br />✦　　　✦<br />•　✦　•</div><div className="receipt-check"><Check /></div></div><p className="receipt-amount"><small>Rs.</small>1,000<sup>.00</sup></p><h2>Successfully Sent to</h2><div className="recipient-initials">MA</div><h3>Muhammad Abdullah</h3><p className="recipient-phone">◉ 03478496579</p><div className="receipt-actions"><button><FileText /> <span>View Receipt</span><ChevronRight /></button><button><Share2 /> <span>Share</span><ChevronRight /></button></div></div></div> }

function RecordEditor({ active, record, onClose, onSave }: { active: ModuleKey; record?: RecordItem; onClose: () => void; onSave: (record: RecordItem) => void }) {
  const [form, setForm] = useState<RecordItem>(record || { id: `${active}-${crypto.randomUUID()}`, name: '', category: '', quantity: 0, unit: active === 'expenses' ? 'amount' : 'pcs', price: 0, status: active === 'sales' || active === 'purchases' || active === 'expenses' ? 'Pending' : 'Active', meta: '', imageUrl: '', syncStatus: 'pending' })
  const imageEnabled = ['products', 'raw-materials', 'production', 'sales', 'purchases'].includes(active)
  const set = (key: keyof RecordItem, value: string | number) => setForm((current) => ({ ...current, [key]: value }))
  async function uploadImage(file?: File) {
    if (!file) return
    const preview = URL.createObjectURL(file)
    set('imageUrl', preview)
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    if (!cloud || !preset || !navigator.onLine) return
    const body = new FormData(); body.append('file', file); body.append('upload_preset', preset)
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body })
    if (response.ok) { const data = await response.json(); set('imageUrl', data.secure_url) }
  }
  function submit(event: React.FormEvent) { event.preventDefault(); if (!form.name.trim()) return; onSave({ ...form, name: form.name.trim(), syncStatus: 'pending', meta: form.meta || 'Saved locally' }) }
  return <div className="editor-overlay"><form className="editor-modal" onSubmit={submit}><div className="editor-header"><div><p className="eyebrow">{record ? 'Edit record' : 'New record'}</p><h2>{moduleLabels[active].replace(/s$/, '')} details</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close form"><X /></button></div>{imageEnabled && <label className="image-picker">{form.imageUrl ? <img src={form.imageUrl} alt="Record preview" /> : <ImagePlus />}<span>{form.imageUrl ? 'Change image' : 'Add image'}</span><input type="file" accept="image/*" onChange={(event) => uploadImage(event.target.files?.[0])} /></label>}<div className="form-grid"><label>Name *<input required value={form.name} onChange={(event) => set('name', event.target.value)} placeholder={`Enter ${moduleLabels[active].replace(/s$/, '').toLowerCase()} name`} /></label><label>Category<input value={form.category || ''} onChange={(event) => set('category', event.target.value)} /></label><label>Quantity<input type="number" min="0" value={form.quantity || 0} onChange={(event) => set('quantity', Number(event.target.value))} /></label><label>{['sales', 'purchases', 'expenses'].includes(active) ? 'Amount' : 'Price'}<input type="number" min="0" value={form.price || 0} onChange={(event) => set('price', Number(event.target.value))} /></label><label>Status<select value={form.status} onChange={(event) => set('status', event.target.value as Status)}><option>Active</option><option>Pending</option><option>Paid</option><option>Low stock</option><option>In production</option><option>Completed</option></select></label><label>Details<input value={form.meta || ''} onChange={(event) => set('meta', event.target.value)} placeholder="Optional details" /></label></div><div className="editor-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" type="submit">{record ? 'Update record' : 'Create record'}</button></div></form></div>
}
