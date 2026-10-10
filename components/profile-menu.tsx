'use client'

import { confirmAction } from '@/lib/confirmation'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { UserRound, Settings, LockKeyhole, X, Save, ShieldCheck } from 'lucide-react'
import { defaultAdminProfile, type AdminProfile, type AppDatabase } from '@/lib/db'

export default function ProfileMenu({ db, isOwner, onSave, onSettings, onLock }: {
  db: AppDatabase
  isOwner: boolean
  onSave: (db: AppDatabase) => void
  onSettings: () => void
  onLock: () => void
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<AdminProfile>(defaultAdminProfile)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const profile = { ...defaultAdminProfile, ...db.adminProfile }
  const name = isOwner ? profile.name : 'Floor Supervisor'
  const initials = name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])

  useEffect(() => {
    if (editing) dialog.current?.showModal()
    else if (dialog.current?.open) { dialog.current.close(); trigger.current?.focus() }
  }, [editing])

  useEffect(() => {
    if (!isOwner) setEditing(false)
  }, [isOwner])

  function edit() {
    setDraft(profile)
    setError('')
    setOpen(false)
    setEditing(true)
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isOwner) return
    const cleaned = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()])) as unknown as AdminProfile
    if (!cleaned.name) { setError('Please enter your name.'); return }
    if (!(await confirmAction({"title":"Save profile changes?","message":"Update your admin profile details on this device?","confirmLabel":"Save changes","destructive":false}))) return
    try {
      onSave({ ...db, adminProfile: cleaned })
      setEditing(false)
      setMessage('Profile updated successfully.')
    } catch { setError('Could not save your profile. Check browser storage and try again.') }
  }
  async function closeEditor() {
    if (JSON.stringify(draft) !== JSON.stringify(profile) && !(await confirmAction({ title: 'Discard profile changes?', message: 'Your unsaved profile edits will be lost.', confirmLabel: 'Discard changes', destructive: true }))) return
    setEditing(false)
    trigger.current?.focus()
  }

  return (
    <div className="header-profile" ref={container} onBlur={event => { if (!editing && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false) }}>
      <button ref={trigger} type="button" className="top-avatar profile-trigger" aria-label={`Open profile options for ${name}`} aria-expanded={open} aria-controls="header-profile-options" onClick={() => { setOpen(!open); setMessage('') }}>{initials || 'AF'}</button>
      <span className="sr-only" role="status">{message}</span>
      {open && <div id="header-profile-options" className="profile-dropdown" aria-label="Profile options">
        <div className="profile-dropdown-identity"><div className="profile-identity-avatar">{initials}</div><div><strong>{name}</strong><span>{isOwner ? profile.title || 'Administrator' : 'Operator'}</span>{isOwner && profile.email && <small>{profile.email}</small>}</div></div>
        <span className="profile-role-label"><ShieldCheck size={13} />{isOwner ? 'Owner session' : 'Staff session'}</span>
        {isOwner && <button type="button" onClick={edit}><UserRound size={16} /><span>Edit my profile<small>Name, contact details & title</small></span></button>}
        <button type="button" onClick={() => { setOpen(false); onSettings() }}><Settings size={16} /><span>Workspace settings<small>Company, backups & preferences</small></span></button>
        <button type="button" className="profile-lock-action" onClick={() => { setOpen(false); onLock() }}><LockKeyhole size={16} /><span>Lock workspace<small>Require PIN to continue</small></span></button>
      </div>}
      <dialog ref={dialog} className="profile-edit-dialog" aria-labelledby="profile-edit-title" onCancel={event => { event.preventDefault(); closeEditor() }} onClose={() => setEditing(false)} onClick={event => { if (event.target === dialog.current) { const box = dialog.current.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeEditor() } }}>
        <form onSubmit={save}>
          <header><div><p>Personal information</p><h2 id="profile-edit-title">Edit your profile</h2></div><button type="button" className="icon-button" aria-label="Close profile editor" onClick={closeEditor}><X size={18} /></button></header>
          <p className="profile-editor-description">Update your admin details. Changes are saved on this device and included in backups.</p>
          <div className="profile-editor-fields">
            {([{ key: 'name', label: 'Full name', type: 'text' }, { key: 'title', label: 'Job title', type: 'text' }, { key: 'email', label: 'Email address', type: 'email' }, { key: 'phone', label: 'Phone number', type: 'tel' }] as const).map(field => <label key={field.key}>{field.label}<input data-ui="input" type={field.type} value={draft[field.key]} required={field.key === 'name'} maxLength={120} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} /></label>)}
          </div>
          {error && <p className="profile-editor-error" role="alert">{error}</p>}
          <footer><button type="button" className="button secondary" onClick={closeEditor}>Cancel</button><button data-ui="button" type="submit" className="button primary" disabled={!isOwner}><Save size={15} /> Save profile</button></footer>
        </form>
      </dialog>
    </div>
  )
}
