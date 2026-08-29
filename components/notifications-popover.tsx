'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Clock,
  DollarSign,
  Package,
  Boxes,
  Users,
  ChevronRight,
  X,
  CheckCircle2,
  Calendar,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingDown,
  Building2,
  FileText,
} from 'lucide-react'
import {
  formatPKR,
  type AppDatabase,
  type ModuleKey,
  type ProductItem,
  type RawMaterialItem,
  type InvoiceItem,
  type PurchaseItem,
  type EmployeeItem,
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

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissedIds((prev) => new Set([...prev, id]))
  }

  const handleClearAll = () => {
    const allIds = activeAlerts.map((a) => a.id)
    setDismissedIds((prev) => new Set([...prev, ...allIds]))
  }

  const handleAlertClick = (alert: SystemAlert) => {
    setIsOpen(false)
    onNavigate(alert.targetModule, alert.targetSubTab)
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button Trigger in Topbar */}
      <button
        type="button"
        id="topbar-notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        className={`icon-button relative transition-all duration-200 ${
          isOpen ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-100' : ''
        }`}
        title={`Action Alerts & Notifications (${counts.all} active)`}
        aria-label="Action Alerts"
        aria-expanded={isOpen}
      >
        <Bell className={`w-4 h-4 ${counts.critical > 0 ? 'text-rose-600 animate-pulse' : 'text-stone-700'}`} />

        {/* Badge Count */}
        {counts.all > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs ${
              counts.critical > 0
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {counts.all > 99 ? '99+' : counts.all}
          </span>
        )}
      </button>

      {/* Popover Dropdown Drawer */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-[390px] sm:w-[460px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-xl border border-stone-200/90 z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150"
          id="notification-alerts-popover"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-stone-50/90 border-b border-stone-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-stone-900 text-sm">Action Alerts</h3>
                  <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                    {counts.all} Active
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 font-medium">
                  Real-time operational & financial notifications
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {counts.all > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-medium text-stone-500 hover:text-stone-800 px-2 py-1 rounded-md hover:bg-stone-200/60 transition-colors"
                  title="Dismiss all current alerts"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/60 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 bg-stone-50/40 border-b border-stone-100 flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] shrink-0 transition-colors ${
                activeFilter === 'all'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/70'
              }`}
            >
              All ({counts.all})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('low_stock')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] shrink-0 transition-colors flex items-center gap-1 ${
                activeFilter === 'low_stock'
                  ? 'bg-amber-700 text-white shadow-2xs'
                  : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200/80'
              }`}
            >
              <Boxes className="w-3 h-3" />
              <span>Stock ({counts.lowStock})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('payment_due_sales')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] shrink-0 transition-colors flex items-center gap-1 ${
                activeFilter === 'payment_due_sales'
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'bg-white text-blue-800 hover:bg-blue-50 border border-blue-200/80'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Sales Due ({counts.salesDue})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('payment_due_purchases')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] shrink-0 transition-colors flex items-center gap-1 ${
                activeFilter === 'payment_due_purchases'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'bg-white text-purple-800 hover:bg-purple-50 border border-purple-200/80'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              <span>Purchases Due ({counts.purchasesDue})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('salary')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] shrink-0 transition-colors flex items-center gap-1 ${
                activeFilter === 'salary'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200/80'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Salaries ({counts.salaries})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('expiry')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] shrink-0 transition-colors flex items-center gap-1 ${
                activeFilter === 'expiry'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-white text-rose-800 hover:bg-rose-50 border border-rose-200/80'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Expiry ({counts.expiry})</span>
            </button>
          </div>

          {/* Alert List Container */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-stone-100 p-1.5" id="notification-alerts-list">
            {displayedAlerts.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-stone-800">All Clear!</h4>
                <p className="text-xs text-stone-500 max-w-[260px] mx-auto mt-1">
                  {activeFilter === 'all'
                    ? 'No pending critical alerts, low stock warnings, or overdue payments.'
                    : `No active alerts under the "${activeFilter.replace(/_/g, ' ')}" category.`}
                </p>
              </div>
            ) : (
              displayedAlerts.map((alert) => {
                // Icon & Theme mapping
                let icon = <AlertTriangle className="w-4 h-4" />
                let avatarClass = 'bg-amber-100 text-amber-800 border-amber-200'
                let badgeClass = 'bg-amber-50 text-amber-800 border-amber-200'

                if (alert.type === 'low_stock') {
                  icon = alert.severity === 'critical' ? <AlertCircle className="w-4 h-4" /> : <Boxes className="w-4 h-4" />
                  avatarClass = alert.severity === 'critical' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                  badgeClass = alert.severity === 'critical' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                } else if (alert.type === 'payment_due_sales') {
                  icon = <FileText className="w-4 h-4" />
                  avatarClass =
                    alert.severity === 'critical'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : alert.severity === 'warning'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  badgeClass =
                    alert.severity === 'critical'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : alert.severity === 'warning'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                } else if (alert.type === 'payment_due_purchases') {
                  icon = <DollarSign className="w-4 h-4" />
                  avatarClass =
                    alert.severity === 'critical'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : alert.severity === 'warning'
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  badgeClass =
                    alert.severity === 'critical'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : alert.severity === 'warning'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                } else if (alert.type === 'salary') {
                  icon = <Users className="w-4 h-4" />
                  avatarClass = 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'
                } else if (alert.type === 'expiry') {
                  icon = <Clock className="w-4 h-4" />
                  avatarClass = 'bg-rose-100 text-rose-800 border-rose-200'
                  badgeClass = 'bg-rose-50 text-rose-700 border-rose-200'
                }

                return (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className="p-2.5 rounded-xl hover:bg-stone-50/90 transition-all cursor-pointer group flex items-start gap-3 relative border border-transparent hover:border-stone-200/80"
                    role="button"
                    tabIndex={0}
                  >
                    {/* Category Avatar */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs mt-0.5 ${avatarClass}`}
                    >
                      {icon}
                    </div>

                    {/* Alert Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className="font-bold text-stone-900 text-xs group-hover:text-emerald-800 transition-colors truncate">
                          {alert.title}
                        </h4>
                        {alert.value && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${badgeClass}`}>
                            {alert.value}
                          </span>
                        )}
                      </div>

                      <p className="text-[11.5px] text-stone-600 font-medium leading-snug mt-0.5">
                        {alert.subtitle}
                      </p>

                      {alert.details && (
                        <p className="text-[10.5px] text-stone-400 font-normal truncate mt-0.5">
                          {alert.details}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-100/80 text-[10.5px]">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Resolve in {String(alert.targetModule).replace('-', ' ')}</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleDismiss(alert.id, e)}
                          className="text-stone-400 hover:text-stone-600 p-0.5 rounded hover:bg-stone-200/60 transition-colors"
                          title="Dismiss this notification"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Quick Links */}
          <div className="px-4 py-2.5 bg-stone-50/80 border-t border-stone-200/70 flex items-center justify-between text-xs">
            <span className="text-[11px] text-stone-500 font-medium">
              {activeAlerts.length} total active issues detected
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onNavigate('dashboard')
              }}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
            >
              <span>View Dashboard</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
