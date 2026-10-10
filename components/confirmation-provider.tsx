'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, ShieldCheck, X } from 'lucide-react'
import { registerConfirmationReceiver, type ConfirmationRequest } from '@/lib/confirmation'

export default function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null)
  const pending = useRef<ConfirmationRequest | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const unregister = registerConfirmationReceiver(next => {
      // Ignore repeated clicks while a decision is already pending.
      if (pending.current) { next.resolve(false); return }
      pending.current = next
      setRequest(next)
    })
    return () => { unregister(); pending.current?.resolve(false); pending.current = null }
  }, [])
  useEffect(() => {
    if (request) { dialog.current?.showModal(); cancel.current?.focus() }
  }, [request])
  function finish(accepted: boolean) {
    const current = pending.current
    pending.current = null
    dialog.current?.close()
    setRequest(null)
    current?.resolve(accepted)
  }
  const destructive = request?.destructive ?? /delete|reset|clear|remove|overwrite|replace/i.test(request?.message || '')
  return <>{children}{request && <dialog ref={dialog} className={`confirmation-dialog ${destructive ? 'confirmation-danger' : ''}`} aria-labelledby="confirmation-title" aria-describedby="confirmation-message" onCancel={event => { event.preventDefault(); finish(false) }}>
    <header><div className="confirmation-icon">{destructive ? <AlertTriangle size={23} /> : <ShieldCheck size={23} />}</div><button type="button" className="icon-button" aria-label="Cancel action" onClick={() => finish(false)}><X size={18} /></button></header>
    <h2 id="confirmation-title">{request.title || (destructive ? 'Confirm this action' : 'Please confirm')}</h2>
    <p id="confirmation-message">{request.message}</p>
    <footer><button ref={cancel} type="button" className="button secondary" onClick={() => finish(false)}>Cancel</button><button type="button" className="confirmation-accept" onClick={() => finish(true)}>{request.confirmLabel || (destructive ? 'Yes, continue' : 'Confirm')}</button></footer>
  </dialog>}</>
}
