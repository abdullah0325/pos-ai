'use client'

import { confirmAction } from '@/lib/confirmation'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Bell, AlertCircle, Clock, Boxes, Users, ChevronRight, X, CheckCircle2, FileText, DollarSign } from 'lucide-react'
import {
  formatPKR,
  type AppDatabase,
  type ModuleKey,
} from '@/lib/db'

interface NotificationsPopoverProps {
  db: AppDatabase
  onNavigate: (module: ModuleKey | string, subTab?: string) => void
}

export type AlertType = 'low_stock' | 'expiry' | 'payment_due_sales' | 'payment_due_purchases' | 'salary'
export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface SystemAlert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  subtitle: string
  details?: string
  value?: string | number
  date?: string
  targetModule: ModuleKey | string
  targetSubTab?: string
  entityId?: string
}

export default function NotificationsPopover({ db, onNavigate }: NotificationsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | AlertType>('all')
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) closeRef.current?.focus()
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        bellRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Compute all live alerts from db
  const allAlerts = useMemo<SystemAlert[]>(() => {
    const alerts: SystemAlert[] = []

    // 1. Finished Products Low Stock
    db.products.forEach((p) => {
      const reorder = p.reorderLevel || 10
      if (p.quantity <= 0) {
        alerts.push({
          id: `prod-out-${p.id}`,
          type: 'low_stock',
          severity: 'critical',
          title: `${p.name} is Out of Stock`,
          subtitle: `0 ${p.unit} remaining in finished goods warehouse (SKU: ${p.sku})`,
          details: `Reorder threshold is ${reorder} ${p.unit}`,
          value: '0 Stock',
          targetModule: 'products',
          targetSubTab: 'catalog',
          entityId: p.id,
        })
      } else if (p.quantity <= reorder) {
        alerts.push({
          id: `prod-low-${p.id}`,
          type: 'low_stock',
          severity: 'warning',
          title: `Low Stock: ${p.name}`,
          subtitle: `${p.quantity} ${p.unit} left (Below reorder level of ${reorder} ${p.unit})`,
          details: `Category: ${p.category} | SKU: ${p.sku}`,
          value: `${p.quantity} ${p.unit}`,
          targetModule: 'products',
          targetSubTab: 'catalog',
          entityId: p.id,
        })
      }
    })

    // 2. Raw Materials Low Stock
    db.rawMaterials.forEach((r) => {
      const reorder = r.reorderLevel || 50
      if (r.quantity <= 0) {
        alerts.push({
          id: `raw-out-${r.id}`,
          type: 'low_stock',
          severity: 'critical',
          title: `Critical: ${r.name} Depleted`,
          subtitle: `0 ${r.unit} left for factory production lines (SKU: ${r.sku})`,
          details: `Supplier: ${r.supplierName || r.supplier || 'Standard Vendor'}`,
          value: '0 Stock',
          targetModule: 'raw-materials',
          entityId: r.id,
        })
      } else if (r.quantity <= reorder) {
        alerts.push({
          id: `raw-low-${r.id}`,
          type: 'low_stock',
          severity: 'warning',
          title: `Low Material: ${r.name}`,
          subtitle: `Only ${r.quantity} ${r.unit} remaining (Reorder point: ${reorder} ${r.unit})`,
          details: `Category: ${r.category} | ${r.supplierName || 'Vendor Sourcing Required'}`,
          value: `${r.quantity} ${r.unit}`,
          targetModule: 'raw-materials',
          entityId: r.id,
        })
      }
    })

    // 3. Products & Batches Nearing Expiry / Manufacturing Shelf-Life
    // Perishable items: juices, nectars, syrups, and production runs
    db.productionRuns.forEach((run) => {
      if (run.status === 'Completed') {
        const runDate = new Date(run.date)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - runDate.getTime()) / (1000 * 60 * 60 * 24))
        // If batch was manufactured more than 150 days ago (approaching standard 180-day shelf life)
        if (diffDays > 150) {
          alerts.push({
            id: `expiry-run-${run.id}`,
            type: 'expiry',
            severity: 'warning',
            title: `Batch Nearing Expiry: ${run.productName}`,
            subtitle: `Batch #${run.batchNumber} manufactured ${diffDays} days ago (${run.date})`,
            details: `Target Qty: ${run.targetQuantity} ${run.unit} | Supervisor: ${run.supervisor}`,
            value: `Batch #${run.batchNumber}`,
            targetModule: 'products',
            targetSubTab: 'production',
            entityId: run.id,
          })
        }
      }
    })

    // Raw materials perishable check (Flavors, Food Colors, Concentrates)
    db.rawMaterials
      .filter((r) => r.category === 'Flavors' || r.category === 'Ingredients')
      .forEach((r) => {
        if (r.updatedAt) {
          const updDate = new Date(r.updatedAt)
          const now = new Date()
          const diffDays = Math.floor((now.getTime() - updDate.getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays > 90 && r.quantity > 0) {
            alerts.push({
              id: `expiry-raw-${r.id}`,
              type: 'expiry',
              severity: 'info',
              title: `Ingredient Freshness Check: ${r.name}`,
              subtitle: `Stock on hand (${r.quantity} ${r.unit}) in warehouse over ${diffDays} days`,
              details: `Category: ${r.category} | Verify packaging seal & flavor potency`,
              value: `${r.quantity} ${r.unit}`,
              targetModule: 'raw-materials',
              entityId: r.id,
            })
          }
        }
      })

    // 4. Payments Due — Sales (Invoices with Outstanding Customer Balances & Due Dates)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    db.invoices.forEach((inv) => {
      const due = inv.balanceDue ?? (inv.grandTotal - (inv.amountPaid || 0))
      if ((inv.status === 'Unpaid' || inv.status === 'Partial') && due > 0) {
        let severity: AlertSeverity = 'warning'
        let title = `Invoice Payment Due: #${inv.invoiceNumber}`
        let subtitle = `${inv.customerName} has ${formatPKR(due)} unpaid balance`
        let details = `Invoice Date: ${inv.date} | Total: ${formatPKR(inv.grandTotal)}`

        if (inv.dueDate) {
          const dueDateObj = new Date(inv.dueDate)
          dueDateObj.setHours(0, 0, 0, 0)
          const diffDays = Math.round((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          if (diffDays < 0) {
            severity = 'critical'
            title = `Overdue Invoice: #${inv.invoiceNumber}`
            subtitle = `${inv.customerName} owes ${formatPKR(due)} (Overdue by ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'day' : 'days'})`
            details = `Due Date: ${inv.dueDate} | Invoice Date: ${inv.date}`
          } else if (diffDays <= 7) {
            severity = 'warning'
            title = `Payment Due Soon: #${inv.invoiceNumber}`
            subtitle = `${inv.customerName} owes ${formatPKR(due)} (Due in ${diffDays === 0 ? 'Today' : `${diffDays} days`})`
            details = `Due Date: ${inv.dueDate} | Total: ${formatPKR(inv.grandTotal)}`
          } else {
            severity = 'info'
            title = `Upcoming Invoice Payment: #${inv.invoiceNumber}`
            subtitle = `${inv.customerName} balance: ${formatPKR(due)}`
            details = `Due Date: ${inv.dueDate} (in ${diffDays} days)`
          }
        }

        alerts.push({
          id: `inv-due-${inv.id}`,
          type: 'payment_due_sales',
          severity,
          title,
          subtitle,
          details,
          value: formatPKR(due),
          date: inv.dueDate || inv.date,
          targetModule: 'sales',
          targetSubTab: 'invoices',
          entityId: inv.id,
        })
      }
    })

    // Customers exceeding credit limit (Under Sales Due)
    db.customers.forEach((c) => {
      if (c.creditLimit > 0 && c.currentBalance > c.creditLimit) {
        alerts.push({
          id: `cust-limit-${c.id}`,
          type: 'payment_due_sales',
          severity: 'critical',
          title: `Credit Limit Exceeded: ${c.name}`,
          subtitle: `Balance ${formatPKR(c.currentBalance)} exceeds credit limit of ${formatPKR(c.creditLimit)}`,
          details: `Contact: ${c.phone} | Category: ${c.type}`,
          value: formatPKR(c.currentBalance),
          targetModule: 'customer-management',
          entityId: c.id,
        })
      }
    })

    // 5. Payments Due — Purchases (Supplier Payables & PO Due Dates)
    db.purchases.forEach((po) => {
      const due = po.balanceDue ?? (po.grandTotal - (po.amountPaid || 0))
      if ((po.status === 'Unpaid' || po.status === 'Partial') && due > 0) {
        let severity: AlertSeverity = 'warning'
        let title = `Supplier Bill Due: ${po.poNumber || po.purchaseNumber || 'Purchase Bill'}`
        let subtitle = `Payable to ${po.supplierName}: ${formatPKR(due)}`
        let details = `PO Date: ${po.date} | Grand Total: ${formatPKR(po.grandTotal)}`

        if (po.dueDate) {
          const dueDateObj = new Date(po.dueDate)
          dueDateObj.setHours(0, 0, 0, 0)
          const diffDays = Math.round((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          if (diffDays < 0) {
            severity = 'critical'
            title = `Supplier Bill Overdue: ${po.poNumber || 'PO'}`
            subtitle = `Payable to ${po.supplierName}: ${formatPKR(due)} (Overdue by ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'day' : 'days'})`
            details = `Due Date: ${po.dueDate} | PO Date: ${po.date}`
          } else if (diffDays <= 7) {
            severity = 'warning'
            title = `Supplier Bill Due Soon: ${po.poNumber || 'PO'}`
            subtitle = `Payable to ${po.supplierName}: ${formatPKR(due)} (Due in ${diffDays === 0 ? 'Today' : `${diffDays} days`})`
            details = `Due Date: ${po.dueDate} | Total: ${formatPKR(po.grandTotal)}`
          } else {
            severity = 'info'
            title = `Upcoming Supplier Bill: ${po.poNumber || 'PO'}`
            subtitle = `Payable to ${po.supplierName}: ${formatPKR(due)}`
            details = `Due Date: ${po.dueDate} (in ${diffDays} days)`
          }
        }

        alerts.push({
          id: `po-due-${po.id}`,
          type: 'payment_due_purchases',
          severity,
          title,
          subtitle,
          details,
          value: formatPKR(due),
          date: po.dueDate || po.date,
          targetModule: 'purchase',
          targetSubTab: 'purchases',
          entityId: po.id,
        })
      }
    })

    // 6. Pending Staff Salaries
    db.employees.forEach((emp) => {
      if (emp.status === 'Active' && emp.currentSalaryStatus === 'Pending') {
        const totalPay = (emp.baseSalary || 0) + (emp.totalAllowances || 0)
        alerts.push({
          id: `sal-pending-${emp.id}`,
          type: 'salary',
          severity: 'warning',
          title: `Pending Salary: ${emp.name}`,
          subtitle: `${emp.role} (${emp.department}) — Base wage: ${formatPKR(totalPay)}`,
          details: `Duty: ${emp.dutyTiming} | Phone: ${emp.phone || 'No phone'}`,
          value: formatPKR(totalPay),
          targetModule: 'employees',
          entityId: emp.id,
        })
      }
    })

    return alerts
  }, [db])

  // Filter out dismissed alerts
  const activeAlerts = useMemo(() => {
    return allAlerts.filter((a) => !dismissedIds.has(a.id))
  }, [allAlerts, dismissedIds])

  // Filtered by selected category tab
  const displayedAlerts = useMemo(() => {
    if (activeFilter === 'all') return activeAlerts
    return activeAlerts.filter((a) => a.type === activeFilter)
  }, [activeAlerts, activeFilter])

  // Counts by category
  const counts = useMemo(() => {
    const lowStock = activeAlerts.filter((a) => a.type === 'low_stock').length
    const expiry = activeAlerts.filter((a) => a.type === 'expiry').length
    const salesDue = activeAlerts.filter((a) => a.type === 'payment_due_sales').length
    const purchasesDue = activeAlerts.filter((a) => a.type === 'payment_due_purchases').length
    const salaries = activeAlerts.filter((a) => a.type === 'salary').length
    const critical = activeAlerts.filter((a) => a.severity === 'critical').length
    return {
      all: activeAlerts.length,
      lowStock,
      expiry,
      salesDue,
      purchasesDue,
      salaries,
      critical,
    }
  }, [activeAlerts])

  const handleDismiss = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!(await confirmAction({"title":"Dismiss notification?","message":"This hides the notification for this session. The underlying record will remain unchanged.","confirmLabel":"Dismiss","destructive":true}))) return
    setDismissedIds((prev) => new Set([...prev, id]))
  }

  const handleClearAll = async () => {
    const allIds = activeAlerts.map((a) => a.id)
    if (!(await confirmAction({"title":"Clear all notifications?","message":"Hide all current notifications for this session? Business records will remain unchanged.","confirmLabel":"Clear notifications","destructive":true}))) return
    setDismissedIds((prev) => new Set([...prev, ...allIds]))
  }

  const handleAlertClick = (alert: SystemAlert) => {
    setIsOpen(false)
    onNavigate(alert.targetModule, alert.targetSubTab)
  }

  const filters: { value: 'all' | AlertType; label: string; count: number }[] = [
    { value: 'all', label: 'All notifications', count: counts.all },
    { value: 'low_stock', label: 'Stock', count: counts.lowStock },
    { value: 'payment_due_sales', label: 'Sales payments', count: counts.salesDue },
    { value: 'payment_due_purchases', label: 'Supplier payments', count: counts.purchasesDue },
    { value: 'salary', label: 'Salaries', count: counts.salaries },
    { value: 'expiry', label: 'Expiry & freshness', count: counts.expiry },
  ]

  const alertIcons = { low_stock: Boxes, payment_due_sales: FileText, payment_due_purchases: DollarSign, salary: Users, expiry: Clock }

  // Keep the original alert data; shorten only its presentation.
  const compactTitle = (title: string) => title
    .replace(' is Out of Stock', ' · Out of stock')
    .replace(/^Critical: (.*) Depleted$/, '$1 · Out of stock')
    .replace(/^Low Stock: |^Low Material: /, 'Low stock · ')
    .replace('Batch Nearing Expiry: ', 'Expiry check · ')
    .replace('Ingredient Freshness Check: ', 'Freshness check · ')
    .replace('Invoice Payment Due: ', 'Payment due · ')
    .replace('Overdue Invoice: ', 'Overdue · ')
    .replace('Payment Due Soon: ', 'Due soon · ')
    .replace('Upcoming Invoice Payment: ', 'Upcoming · ')
    .replace('Credit Limit Exceeded: ', 'Credit limit exceeded · ')
    .replace('Supplier Bill Due: ', 'Bill due · ')
    .replace('Supplier Bill Overdue: ', 'Bill overdue · ')
    .replace('Supplier Bill Due Soon: ', 'Bill due soon · ')
    .replace('Upcoming Supplier Bill: ', 'Upcoming bill · ')
    .replace('Pending Salary: ', 'Salary pending · ')

  const compactSummary = (text: string) => text
    .replace(/ remaining in finished goods warehouse \(SKU: .*\)/, ' left')
    .replace(/ left for factory production lines \(SKU: .*\)/, ' left')
    .replace('Only ', '')
    .replace(' remaining (Reorder point: ', ' left · reorder at ')
    .replace(' (Below reorder level of ', ' · reorder at ')
    .replace(' has ', ' · ')
    .replace(' unpaid balance', ' due')
    .replace('Payable to ', '')
    .replace(' owes ', ' · ')
    .replace(' (Overdue by ', ' · overdue ')
    .replace(' (Due in Today)', ' · due today')
    .replace(' (Due in ', ' · due in ')
    .replace('Base wage: ', '')
    .replace(/(reorder at [^)]*| · overdue [^)]*| · due in [^)]*)\)/, '$1')

  return (
    <div className="notifications" ref={dropdownRef}>
      <button data-ui="button"
        ref={bellRef}
        type="button"
        id="topbar-notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        className={'icon-button notification-trigger ' + (isOpen ? 'notification-trigger-active' : '')}
        aria-label={'Notifications, ' + counts.all + ' active' + (counts.critical ? ', ' + counts.critical + ' urgent' : '')}
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'notification-alerts-popover' : undefined}
        aria-haspopup="dialog"
      >
        <Bell aria-hidden="true" />
        {counts.all > 0 && <span className={'notification-count ' + (counts.critical ? 'notification-count-urgent' : '')} aria-hidden="true">{counts.all > 99 ? '99+' : counts.all}</span>}
      </button>

      {isOpen && (
        <section className="notification-popover" id="notification-alerts-popover" role="dialog" aria-labelledby="notification-heading">
          <header className="notification-header">
            <h3 id="notification-heading">Notifications <span>{counts.all}</span></h3>
            <div className="notification-header-actions">
              {counts.all > 0 && <button data-ui="button" type="button" className="notification-text-action" onClick={handleClearAll}>Clear all</button>}
              <button data-ui="button" ref={closeRef} type="button" className="icon-button" aria-label="Close notifications" onClick={() => { setIsOpen(false); bellRef.current?.focus() }}><X aria-hidden="true" /></button>
            </div>
          </header>

          <div className="notification-filter">
            <label htmlFor="notification-filter" className="sr-only">Filter notifications</label>
            <select data-ui="select" id="notification-filter" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as 'all' | AlertType)}>
              {filters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label} ({filter.count})</option>)}
            </select>
          </div>

          <div className="notification-list" id="notification-alerts-list">
            {displayedAlerts.length === 0 ? (
              <div className="notification-empty" role="status">
                <CheckCircle2 aria-hidden="true" />
                <p>{activeFilter === 'all' ? "You're all caught up" : 'No notifications here'}</p>
              </div>
            ) : (
              <ul>
                {displayedAlerts.map((alert) => {
                  const Icon = alert.severity === 'critical' ? AlertCircle : alertIcons[alert.type]
                  return (
                    <li key={alert.id} className={'notification-row notification-' + alert.severity}>
                      <button data-ui="button" type="button" className="notification-open" onClick={() => handleAlertClick(alert)} title={alert.details}>
                        <span className="notification-icon"><Icon aria-hidden="true" /></span>
                        <span className="notification-copy">
                          <span className="notification-title">{compactTitle(alert.title)}</span>
                          <span className="notification-summary">{compactSummary(alert.subtitle)}</span>
                          <span className="sr-only">{alert.severity === 'critical' ? 'Urgent. ' : ''}{alert.details}. Open related record.</span>
                        </span>
                        <ChevronRight className="notification-arrow" aria-hidden="true" />
                      </button>
                      <button data-ui="button" type="button" className="notification-dismiss" onClick={(event) => handleDismiss(alert.id, event)} aria-label={'Dismiss: ' + compactTitle(alert.title)}><X aria-hidden="true" /></button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <footer className="notification-footer">
            <button data-ui="button" type="button" className="notification-text-action" onClick={() => { setIsOpen(false); onNavigate('dashboard') }}>Dashboard <ChevronRight aria-hidden="true" /></button>
          </footer>
        </section>
      )}
    </div>
  )
}
