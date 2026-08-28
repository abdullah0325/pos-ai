'use client'

import React from 'react'
import { Calendar, Clock, AlertTriangle, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { formatPKR } from '@/lib/db'

// Calculate difference in whole calendar days from today
export function getDaysDiffFromToday(dateString?: string): number | null {
  if (!dateString) return null
  const targetDate = new Date(dateString)
  if (isNaN(targetDate.getTime())) return null

  const now = new Date()
  // Reset hours to midnight for date-only comparison
  const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const d2 = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime()

  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
}

/**
 * Expiry Date Badge Component
 * Green = Safe (> 15 days)
 * Orange = Approaching (<= 15 days)
 * Red = Expired or Due Today (<= 0 days)
 */
export function ExpiryDateBadge({
  date,
  showLabel = true,
  className = '',
}: {
  date?: string
  showLabel?: boolean
  className?: string
}) {
  const diffDays = getDaysDiffFromToday(date)
  if (diffDays === null || !date) return null

  let badgeVariant = 'green'
  let text = ''
  let icon = <Clock className="w-3 h-3" />

  if (diffDays < 0) {
    badgeVariant = 'red'
    text = `Expired (${Math.abs(diffDays)}d ago)`
    icon = <AlertCircle className="w-3 h-3" />
  } else if (diffDays === 0) {
    badgeVariant = 'red'
    text = 'Expires Today'
    icon = <AlertCircle className="w-3 h-3" />
  } else if (diffDays <= 15) {
    badgeVariant = 'orange'
    text = `Exp: ${diffDays}d left (${date})`
    icon = <AlertTriangle className="w-3 h-3" />
  } else {
    badgeVariant = 'green'
    text = `Exp: ${date}`
    icon = <CheckCircle2 className="w-3 h-3" />
  }

  const variantStyles = {
    green: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
    orange: 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs font-semibold',
    red: 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs font-bold animate-pulse',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-md border ${
        variantStyles[badgeVariant as keyof typeof variantStyles]
      } ${className}`}
      title={`Expiry Date: ${date} (${diffDays >= 0 ? `${diffDays} days remaining` : `${Math.abs(diffDays)} days expired`})`}
    >
      {icon}
      <span>{text}</span>
    </span>
  )
}

/**
 * Due Date Badge Component for Invoices & Purchase Bills
 * Only flags if balanceDue > 0 or explicitly set
 */
export function DueDateBadge({
  dueDate,
  balanceDue = 1,
  className = '',
}: {
  dueDate?: string
  balanceDue?: number
  className?: string
}) {
  const diffDays = getDaysDiffFromToday(dueDate)
  if (diffDays === null || !dueDate) return null

  // If already fully paid, show clean settled tag
  if (balanceDue <= 0) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-md border bg-stone-50 text-stone-600 border-stone-200 ${className}`}
        title={`Due Date: ${dueDate} (Settled)`}
      >
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>Paid</span>
      </span>
    )
  }

  let badgeVariant = 'green'
  let text = ''
  let icon = <Calendar className="w-3 h-3" />

  if (diffDays < 0) {
    badgeVariant = 'red'
    text = `Overdue by ${Math.abs(diffDays)}d (${dueDate})`
    icon = <AlertCircle className="w-3 h-3" />
  } else if (diffDays === 0) {
    badgeVariant = 'red'
    text = `Due Today (${dueDate})`
    icon = <AlertCircle className="w-3 h-3" />
  } else if (diffDays <= 7) {
    badgeVariant = 'orange'
    text = `Due in ${diffDays}d (${dueDate})`
    icon = <AlertTriangle className="w-3 h-3" />
  } else {
    badgeVariant = 'green'
    text = `Due: ${dueDate}`
    icon = <Calendar className="w-3 h-3" />
  }

  const variantStyles = {
    green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    orange: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
    red: 'bg-rose-50 text-rose-800 border-rose-300 font-bold',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-md border ${
        variantStyles[badgeVariant as keyof typeof variantStyles]
      } ${className}`}
      title={`Payment Due Date: ${dueDate}`}
    >
      {icon}
      <span>{text}</span>
    </span>
  )
}

/**
 * Credit Limit Badge for Customer Profiles & List Cards
 * Green = < 70% of limit
 * Orange = 70% - 95% of limit
 * Red = >= 95% or Exceeded limit
 */
export function CreditLimitBadge({
  currentBalance,
  creditLimit,
  className = '',
}: {
  currentBalance: number
  creditLimit?: number
  className?: string
}) {
  if (!creditLimit || creditLimit <= 0) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-md border bg-stone-50 text-stone-500 border-stone-200 ${className}`}
        title="No specific credit limit defined"
      >
        <span>No Credit Limit</span>
      </span>
    )
  }

  const ratio = currentBalance / creditLimit
  const percent = Math.round(ratio * 100)

  let badgeVariant = 'green'
  let text = `Credit: ${percent}% (${formatPKR(currentBalance)} / ${formatPKR(creditLimit)})`
  let icon = <CheckCircle2 className="w-3 h-3" />

  if (ratio >= 1.0) {
    badgeVariant = 'red'
    text = `Limit Exceeded (${percent}%)`
    icon = <ShieldAlert className="w-3 h-3" />
  } else if (ratio >= 0.7) {
    badgeVariant = 'orange'
    text = `Limit Near (${percent}%)`
    icon = <AlertTriangle className="w-3 h-3" />
  } else {
    badgeVariant = 'green'
    text = `Credit OK (${percent}%)`
    icon = <CheckCircle2 className="w-3 h-3" />
  }

  const variantStyles = {
    green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    orange: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
    red: 'bg-rose-50 text-rose-800 border-rose-300 font-bold',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-md border ${
        variantStyles[badgeVariant as keyof typeof variantStyles]
      } ${className}`}
      title={`Balance: ${formatPKR(currentBalance)} / Limit: ${formatPKR(creditLimit)} (${percent}%)`}
    >
      {icon}
      <span>{text}</span>
    </span>
  )
}
