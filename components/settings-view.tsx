'use client'

import { confirmAction } from '@/lib/confirmation'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Building2, Database, Download, Upload, Shield, HardDrive, RotateCcw, Save, Check, AlertTriangle, Clock, FileJson, LockKeyhole } from 'lucide-react'
import { defaultCompanyProfile, exportDatabaseJSON, importDatabaseJSON, initialDatabase, type AppDatabase, type CompanyProfile } from '@/lib/db'

type Section = 'company' | 'backup' | 'access' | 'storage'
interface SettingsViewProps {
  db: AppDatabase
  isOwner: boolean
  setIsOwner: (value: boolean) => void
  onSaveDatabase: (updated: AppDatabase) => void
}
const sections = [
  { id: 'company' as const, label: 'Company profile', description: 'Business & billing details', icon: Building2 },
  { id: 'backup' as const, label: 'Backup & restore', description: 'Export and recover records', icon: Database },
  { id: 'access' as const, label: 'Access & security', description: 'Session and view modes', icon: Shield },
  { id: 'storage' as const, label: 'Data & storage', description: 'Usage and maintenance', icon: HardDrive },
]
function recordCount(db: AppDatabase) {
  return Object.values(db).reduce<number>((total, value) => total + (Array.isArray(value) ? value.length : 0), 0)
}
function sizeLabel(bytes: number) { return bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB` }
function dateLabel(value?: string) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }) : 'No backup recorded'
}

export default function SettingsView({ db, isOwner, setIsOwner, onSaveDatabase }: SettingsViewProps) {
  const [section, setSection] = useState<Section>('company')
  const [profile, setProfile] = useState<CompanyProfile>({ ...defaultCompanyProfile, ...db.companyProfile })
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)
  const [preview, setPreview] = useState<{ db: AppDatabase; name: string; size: number } | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const serialized = JSON.stringify(db)
  const bytes = new Blob([serialized]).size
  const savedProfile = { ...defaultCompanyProfile, ...db.companyProfile }
  const dirty = JSON.stringify(profile) !== JSON.stringify(savedProfile)
  const current = sections.find(item => item.id === section)!

  useEffect(() => { setProfile({ ...defaultCompanyProfile, ...db.companyProfile }) }, [db.companyProfile])
  useEffect(() => {
    let active = true
    navigator.storage?.estimate?.().then(result => {
      if (active) setUsage({ usage: result.usage || 0, quota: result.quota || 0 })
    }).catch(() => {})
    return () => { active = false }
  }, [serialized])

  function backup() {
    try {
      const updated = { ...db, lastBackupDate: new Date().toISOString() }
      exportDatabaseJSON(updated)
      onSaveDatabase(updated)
      setNotice({ text: 'Backup download started. Keep a copy outside this device.' })
    } catch { setNotice({ text: 'Could not create the backup. Please try again.', error: true }) }
  }
  async function chooseFile(file?: File) {
    if (!file) return
    setBusy(true)
    setNotice(null)
    setPreview(null)
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('Choose a backup smaller than 50 MB.')
      const parsed = await importDatabaseJSON(file)
      setPreview({ db: parsed, name: file.name, size: file.size })
      setConfirmation('')
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : 'Unable to read this backup.', error: true })
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }
  async function restore() {
    if (!isOwner || !preview || confirmation !== 'RESTORE') return
    if (!(await confirmAction({"title":"Restore this backup?","message":"Replace current business records with the reviewed backup? A safety backup will download first.","confirmLabel":"Restore backup","destructive":true}))) return
    try {
      exportDatabaseJSON(db)
      onSaveDatabase(preview.db)
      setPreview(null)
      setConfirmation('')
      setNotice({ text: 'Backup restored. A safety backup of the previous data was also downloaded.' })
    } catch { setNotice({ text: 'Restore failed. Check your available browser storage.', error: true }) }
  }
  async function reset() {
    if (!isOwner || confirmation !== 'RESET') return
    if (!(await confirmAction({"title":"Reset business records?","message":"Replace business records with starter data? A safety backup will download first.","confirmLabel":"Reset database","destructive":true}))) return
    try {
      exportDatabaseJSON(db)
      onSaveDatabase({ ...initialDatabase, companyProfile: db.companyProfile, adminProfile: db.adminProfile })
      setResetOpen(false)
      setConfirmation('')
      setNotice({ text: 'Starter data restored. Your company profile was kept and a safety backup was downloaded.' })
    } catch { setNotice({ text: 'Reset could not be completed.', error: true }) }
  }
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isOwner) return
    const cleaned = Object.fromEntries(Object.entries(profile).map(([key, value]) => [key, value.trim()])) as unknown as CompanyProfile
    if (!cleaned.name) { setNotice({ text: 'Company name is required.', error: true }); return }
    if (!(await confirmAction({"title":"Save company profile?","message":"Update the company details used in billing documents and backups?","confirmLabel":"Save changes","destructive":false}))) return
    try {
      onSaveDatabase({ ...db, companyProfile: cleaned })
      setProfile(cleaned)
      setNotice({ text: 'Company profile saved on this device and included in future backups.' })
    } catch { setNotice({ text: 'Could not save your profile. Check browser storage and try again.', error: true }) }
  }
  function field(key: keyof CompanyProfile, label: string, type = 'text') {
    return <label>{label}<input data-ui="input" type={type} value={profile[key]} disabled={!isOwner} required={key === 'name'} maxLength={key === 'address' ? 240 : 120} onChange={event => setProfile({ ...profile, [key]: event.target.value })} /></label>
  }

  return (
    <div className="page-stack professional-settings">
      <header className="settings-page-heading">
        <div><p className="eyebrow">Workspace administration</p><h1>Settings & Backup Controls</h1><p className="subheading">Company details, data protection, and workspace preferences.</p></div>
        <span className="settings-device-badge"><HardDrive size={14} /> Stored on this device</span>
      </header>
      {notice && <div className={`settings-notice ${notice.error ? 'is-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.error ? <AlertTriangle size={17} /> : <Check size={17} />}<span>{notice.text}</span><button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button></div>}
      <div className="settings-workspace">
        <nav className="settings-menu" aria-label="Settings sections">
          <p>Workspace settings</p>
          {sections.map(item => <button key={item.id} type="button" aria-current={section === item.id ? 'page' : undefined} onClick={() => { setSection(item.id); setNotice(null); setPreview(null); setResetOpen(false); setConfirmation('') }}><item.icon size={18} /><span><strong>{item.label}</strong><small>{item.description}</small></span></button>)}
          <div className="settings-menu-footer"><Shield size={16} /><span>{isOwner ? 'Owner session' : 'Staff session'}<small>Offline workspace</small></span></div>
        </nav>
        <section className="settings-content" aria-label={current.label}>
          <div className="settings-section-heading"><h2>{current.label}</h2><p>{current.description}</p></div>
          {!isOwner && section !== 'access' && <p className="settings-muted">Staff view: exporting backups is available; profile changes, restore, and reset require owner view.</p>}
          {section === 'company' && <form className="settings-profile-form" onSubmit={saveProfile}>
            <div data-ui="surface" className="settings-detail-card"><h3>Business information</h3><p>Keep your company identity and contact information up to date.</p><div className="settings-field-grid">{field('name', 'Company name')}{field('taxNumber', 'NTN / tax registration (optional)')}<div className="settings-field-wide">{field('tagline', 'Business description')}</div>{field('phone1', 'Primary phone', 'tel')}{field('phone2', 'Secondary phone', 'tel')}{field('email', 'Business email', 'email')}<div className="settings-field-wide">{field('address', 'Business address')}</div></div></div>
            <div data-ui="surface" className="settings-detail-card settings-profile-preview"><span>Document header preview</span><h3>{profile.name || 'Company name'}</h3><p>{profile.tagline}</p><p>{[profile.phone1, profile.phone2, profile.email].filter(Boolean).join(' · ')}</p><p>{profile.address}</p>{profile.taxNumber && <p>NTN: {profile.taxNumber}</p>}</div>
            <footer className="settings-save-bar"><span>{dirty ? 'You have unsaved changes' : 'All changes saved'}</span><div><button type="button" className="button secondary" disabled={!dirty} onClick={() => setProfile(savedProfile)}>Discard changes</button><button data-ui="button" type="submit" className="button primary" disabled={!dirty || !isOwner}><Save size={15} /> Save changes</button></div></footer>
          </form>}
          {section === 'backup' && <div className="settings-section-stack">
            <div className="settings-overview-grid"><div data-ui="surface" className="settings-detail-card"><Clock size={18} /><span>Last backup requested</span><strong>{dateLabel(db.lastBackupDate)}</strong></div><div data-ui="surface" className="settings-detail-card"><FileJson size={18} /><span>Backup size</span><strong>{sizeLabel(bytes)}</strong><small>{recordCount(db).toLocaleString()} records</small></div></div>
            <div data-ui="surface" className="settings-detail-card settings-action-row"><div><h3>Download a full backup</h3><p>Includes records, images, ledgers, and your company profile. Save a copy to another device or drive.</p></div><button data-ui="button" className="button primary" onClick={backup}><Download size={16} /> Download JSON</button></div>
            <div data-ui="surface" className="settings-detail-card"><h3>Restore from a backup</h3><p>Choose a JSON file to validate and review before replacing current records. Maximum file size: 50 MB.</p><input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={event => chooseFile(event.target.files?.[0])} /><button data-ui="button" className="button secondary" disabled={busy || !isOwner} onClick={() => fileInput.current?.click()}><Upload size={16} />{busy ? 'Checking backup…' : 'Choose backup file'}</button>
              {preview && <div className="settings-restore-preview"><h4>Backup ready to review</h4><p>{preview.name} · {sizeLabel(preview.size)} · Version {preview.db.version}</p><div className="settings-record-summary">{[['Products', preview.db.products.length], ['Invoices', preview.db.invoices.length], ['Purchases', preview.db.purchases.length], ['Expenses', preview.db.expenses.length]].map(([label, count]) => <span key={label}>{label}<strong>{count}</strong></span>)}</div><p>This replaces your current {recordCount(db).toLocaleString()} records. A safety backup will download first.</p><label>Type RESTORE to confirm<input data-ui="input" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" /></label><div className="settings-inline-actions"><button data-ui="button" className="button primary" disabled={confirmation !== 'RESTORE' || !isOwner} onClick={restore}>Restore database</button><button className="button secondary" onClick={() => { setPreview(null); setConfirmation('') }}>Cancel</button></div></div>}
            </div>
          </div>}
          {section === 'access' && <div className="settings-section-stack">
            <div data-ui="surface" className="settings-detail-card settings-action-row"><div><h3>Current view mode</h3><p>{isOwner ? 'Owner view shows financial summaries and administration controls.' : 'Staff view simplifies the workspace for daily operations.'}</p></div><select data-ui="select" aria-label="Session view mode" value={isOwner ? 'owner' : 'staff'} onChange={event => setIsOwner(event.target.value === 'owner')}><option value="owner">Owner view</option><option value="staff">Staff view</option></select></div>
            <div data-ui="surface" className="settings-detail-card"><h3><LockKeyhole size={17} /> Workspace PIN lock</h3><p>Use the lock icon beside Settings in the header to lock immediately. The app checks the session before displaying business data and locks after 15 minutes of inactivity.</p></div>
            <div className="settings-info"><Shield size={18} /><p>Owner and staff are view modes, not separate user accounts. The browser PIN is a local privacy lock. Server authentication is required for enforced user permissions.</p></div>
          </div>}
          {section === 'storage' && <div className="settings-section-stack">
            <div className="settings-overview-grid"><div data-ui="surface" className="settings-detail-card"><HardDrive size={18} /><span>Database payload</span><strong>{sizeLabel(bytes)}</strong><small>JSON size; browser storage overhead varies</small></div><div data-ui="surface" className="settings-detail-card"><Database size={18} /><span>Total records</span><strong>{recordCount(db).toLocaleString()}</strong><small>Database version {db.version}</small></div></div>
            <div data-ui="surface" className="settings-detail-card"><h3>Record overview</h3><div className="settings-record-summary">{[['Products', db.products.length], ['Raw materials', db.rawMaterials.length], ['Customers', db.customers.length], ['Suppliers', db.suppliers.length], ['Invoices', db.invoices.length], ['Purchases', db.purchases.length], ['Expenses', db.expenses.length], ['Employees', db.employees.length]].map(([label, count]) => <span key={label}>{label}<strong>{count}</strong></span>)}</div>{usage && <p>Browser-reported origin storage: {sizeLabel(usage.usage)} used of {sizeLabel(usage.quota)}. This estimate includes caches and may exclude localStorage.</p>}</div>
            <div className="settings-danger-zone"><h3>Reset to starter data</h3><p>Replaces business records with the default sample database. Your saved company profile is preserved.</p>{!resetOpen ? <button data-ui="button" className="button secondary" disabled={!isOwner} onClick={() => { setResetOpen(true); setConfirmation('') }}><RotateCcw size={15} /> Reset database</button> : <div><label>Type RESET to confirm<input data-ui="input" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" /></label><div className="settings-inline-actions"><button data-ui="button" className="button rust" disabled={confirmation !== 'RESET' || !isOwner} onClick={reset}>Download safety backup & reset</button><button className="button secondary" onClick={() => { setResetOpen(false); setConfirmation('') }}>Cancel</button></div></div>}</div>
          </div>}
        </section>
      </div>
    </div>
  )
}
