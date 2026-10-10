'use client'

import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react'

const SESSION_KEY = 'al-farooq-unlocked-at'
const IDLE_LIMIT = 15 * 60 * 1000
const AppLockContext = createContext<{ lock: () => void } | undefined>(undefined)

export function useAppLock() {
  const controls = useContext(AppLockContext)
  if (!controls) throw new Error('App lock must be used inside PinGate')
  return controls.lock
}


export default function PinGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'locking' | 'locked' | 'unlocking' | 'unlocked'>('checking')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const lastActivity = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current)
  }, [])


  const lock = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
    lastActivity.current = 0
    if (transitionTimer.current) clearTimeout(transitionTimer.current)
    setStatus('locked')
    setPin('')
    setError('')
  }, [])

  useEffect(() => {
    let saved = 0
    try { saved = Number(sessionStorage.getItem(SESSION_KEY)) } catch {}
    const now = Date.now()
    if (saved > 0 && saved <= now && now - saved < IDLE_LIMIT) {
      lastActivity.current = saved
      setStatus('unlocked')
    } else {
      lock()
    }
  }, [lock])

  useEffect(() => {
    if (status === 'locked') inputRef.current?.focus()
    if (status !== 'unlocked') return
    const check = () => {
      if (Date.now() - lastActivity.current >= IDLE_LIMIT) lock()
    }
    const activity = () => {
      const now = Date.now()
      if (now - lastActivity.current >= IDLE_LIMIT) { lock(); return }
      lastActivity.current = now
      try { sessionStorage.setItem(SESSION_KEY, String(now)) } catch {}
    }
    const interval = window.setInterval(check, 1000)
    window.addEventListener('pointerdown', activity)
    window.addEventListener('keydown', activity)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('pointerdown', activity)
      window.removeEventListener('keydown', activity)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [status, lock])

  function unlock(enteredPin: string) {
    if (status !== 'locked' || enteredPin.length !== 5) return
    const valid = enteredPin === '12345'
    setStatus('unlocking')
    setError('')
    transitionTimer.current = setTimeout(() => {
      if (!valid) {
        setError('Incorrect PIN. Please try again.')
        setPin('')
        setStatus('locked')
        return
      }
      lastActivity.current = Date.now()
      try { sessionStorage.setItem(SESSION_KEY, String(lastActivity.current)) } catch {}
      setPin('')
      setStatus('unlocked')
    }, 650)
  }

  if (status === 'unlocked') return <AppLockContext.Provider value={{ lock }}>{children}</AppLockContext.Provider>

  return (
    <div className="pin-lock-screen">
      <section className="pin-lock-card" role="dialog" aria-modal="true" aria-busy={status !== 'locked'} aria-labelledby="pin-lock-title" aria-describedby="pin-lock-description">
        <div className="pin-lock-icon">{status === 'checking' || status === 'locking' || status === 'unlocking' ? <LoaderCircle className="pin-processing-spinner" size={25} /> : <ShieldCheck size={25} />}</div>
        <p className="pin-lock-brand">AL FAROOQ FOODS</p>
        <h1 id="pin-lock-title">{status === 'checking' ? 'Checking access…' : status === 'locking' ? 'Locking workspace…' : status === 'unlocking' ? 'Verifying PIN…' : 'Unlock your workspace'}</h1>
        <p id="pin-lock-description" role="status">{status === 'locking' ? 'Securing your workspace.' : status === 'unlocking' ? 'Please wait while we check your PIN.' : 'Enter your five-digit PIN to access the app.'}</p>
        {(status === 'locked' || status === 'unlocking') && <form onSubmit={event => event.preventDefault()}>
          <label htmlFor="access-pin">Access PIN</label>
          <input ref={inputRef} id="access-pin" type="password" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} autoComplete="off" required disabled={status === 'unlocking'}
            value={pin} onChange={(event) => {
              const enteredPin = event.target.value.replace(/\D/g, '').slice(0, 5)
              setPin(enteredPin)
              setError('')
              if (enteredPin.length === 5) unlock(enteredPin)
            }}
            aria-invalid={Boolean(error)} aria-describedby={error ? 'pin-error' : undefined} placeholder="•••••" />
          <p className="pin-error" id="pin-error" role="status">{error}</p>
        </form>}
        <p className="pin-lock-note"><LockKeyhole size={12} /> Locks after 15 minutes of inactivity</p>
      </section>
    </div>
  )
}
