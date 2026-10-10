'use client'

import { confirmAction } from '@/lib/confirmation'

import React, { useState, useMemo, useEffect } from 'react'
import {
  FileText,
  Search,
  X,
  Download,
  Trash2,
  Edit3,
  Eye,
  TrendingUp,
  Calendar,
  Filter,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Store,
  Truck,
  Building2,
  Users,
  ArrowUpRight,
  ShoppingBag,
  Receipt,
  ExternalLink,
  Clock,
  RotateCcw,
  Package,
  Printer,
  ChevronRight,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  type AppDatabase,
  type InvoiceItem,
  type InvoiceLineItem,
  type CustomerItem,
  type ModuleKey,
  type CustomerType,
} from '@/lib/db'
import { generateInvoicePDF, exportToCSV } from '@/lib/pdf-export'
import { DueDateBadge } from '@/components/status-badges'

export type SalesSubTab =
  | 'invoices'
  | 'pos'
  | 'distributors'
  | 'customers'
  | 'wholesalers'
  | string

interface SalesViewProps {
  db: AppDatabase
  initialTab?: SalesSubTab
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigate: (key: ModuleKey) => void
}

type ChannelType =
  | 'POS / Counter'
  | 'Distributor'
  | 'Wholesaler'
  | 'Retailer'
  | 'Direct / Walk-in'

export default function SalesView({
  db,
  initialTab,
  onSaveDatabase,
  onNavigate,
}: SalesViewProps) {
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  // Filters State
  const [dateRangePreset, setDateRangePreset] = useState<
    'all' | 'today' | 'yesterday' | 'this-week' | 'this-month' | 'last-30-days' | 'custom'
  >('all')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [channelFilter, setChannelFilter] = useState<string>('All')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('All')
  const [partyFilter, setPartyFilter] = useState<string>('All')
  const [productFilter, setProductFilter] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Modals & Notifications
  const [detailInvoice, setDetailInvoice] = useState<InvoiceItem | null>(null)
  const [editInvoice, setEditInvoice] = useState<InvoiceItem | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Auto-dismiss toast
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  // Helper to determine normalized channel for any invoice
  const getInvoiceChannel = (inv: InvoiceItem): ChannelType => {
    if (inv.saleType === 'Counter' || inv.customerType === 'Counter') {
      return 'POS / Counter'
    }
    if (
      inv.saleType === 'Distributor' ||
      inv.customerType === 'Distributor' ||
      inv.customerType === 'Sales Representative'
    ) {
      return 'Distributor'
    }
    if (inv.saleType === 'Wholesale' || inv.customerType === 'Wholesaler') {
      return 'Wholesaler'
    }
    if (inv.saleType === 'Retail' || inv.customerType === 'Retailer') {
      return 'Retailer'
    }
    if (
      inv.customerType === 'Walk-in' ||
      inv.customerName.toLowerCase().includes('walk-in') ||
      inv.customerName.toLowerCase().includes('direct')
    ) {
      return 'Direct / Walk-in'
    }
    return 'Distributor'
  }

  // Check if date falls in selected preset
  const isDateInRange = (dateStr: string): boolean => {
    if (dateRangePreset === 'all') return true
    if (!dateStr) return false

    const invDate = new Date(dateStr.slice(0, 10))
    invDate.setHours(0, 0, 0, 0)

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (dateRangePreset === 'today') {
      return invDate.getTime() === today.getTime()
    }
    if (dateRangePreset === 'yesterday') {
      const yest = new Date(today)
      yest.setDate(yest.getDate() - 1)
      return invDate.getTime() === yest.getTime()
    }
    if (dateRangePreset === 'this-week') {
      const day = today.getDay() || 7
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - day + 1)
      return invDate >= startOfWeek && invDate <= today
    }
    if (dateRangePreset === 'this-month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return invDate >= startOfMonth && invDate <= today
    }
    if (dateRangePreset === 'last-30-days') {
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(today.getDate() - 30)
      return invDate >= thirtyDaysAgo && invDate <= today
    }
    if (dateRangePreset === 'custom') {
      if (customStartDate && customEndDate) {
        const s = new Date(customStartDate)
        s.setHours(0, 0, 0, 0)
        const e = new Date(customEndDate)
        e.setHours(23, 59, 59, 999)
        return invDate >= s && invDate <= e
      }
      if (customStartDate) {
        const s = new Date(customStartDate)
        s.setHours(0, 0, 0, 0)
        return invDate >= s
      }
      if (customEndDate) {
        const e = new Date(customEndDate)
        e.setHours(23, 59, 59, 999)
        return invDate <= e
      }
    }
    return true
  }

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (dateRangePreset !== 'all') count++
    if (channelFilter !== 'All') count++
    if (paymentStatusFilter !== 'All') count++
    if (partyFilter !== 'All') count++
    if (productFilter !== 'All') count++
    if (searchQuery.trim() !== '') count++
    return count
  }, [
    dateRangePreset,
    channelFilter,
    paymentStatusFilter,
    partyFilter,
    productFilter,
    searchQuery,
  ])

  const resetAllFilters = () => {
    setDateRangePreset('all')
    setCustomStartDate('')
    setCustomEndDate('')
    setChannelFilter('All')
    setPaymentStatusFilter('All')
    setPartyFilter('All')
    setProductFilter('All')
    setSearchQuery('')
  }

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return db.invoices
      .filter((inv) => {
        // Date filter
        if (!isDateInRange(inv.date)) return false

        // Channel filter
        if (channelFilter !== 'All') {
          const invChannel = getInvoiceChannel(inv)
          if (invChannel !== channelFilter) return false
        }

        // Payment status filter
        if (paymentStatusFilter !== 'All') {
          if (inv.status !== paymentStatusFilter) return false
        }

        // Customer / Party filter
        if (partyFilter !== 'All') {
          const matchesParty =
            inv.customerId === partyFilter ||
            inv.customerName.toLowerCase() === partyFilter.toLowerCase()
          if (!matchesParty) return false
        }

        // Product filter
        if (productFilter !== 'All') {
          const containsProduct = inv.items.some(
            (it) => it.productId === productFilter || it.name === productFilter
          )
          if (!containsProduct) return false
        }

        // Text search
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase().trim()
          const matchInvNum = inv.invoiceNumber.toLowerCase().includes(q)
          const matchCustomer = inv.customerName.toLowerCase().includes(q)
          const matchPhone = inv.phone && inv.phone.toLowerCase().includes(q)
          const matchNotes = inv.notes && inv.notes.toLowerCase().includes(q)
          const matchItems = inv.items.some((it) => it.name.toLowerCase().includes(q))
          if (!matchInvNum && !matchCustomer && !matchPhone && !matchNotes && !matchItems) {
            return false
          }
        }

        return true
      })
      .sort((a, b) => {
        // Sort descending by date, then invoiceNumber
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        if (dateB !== dateA) return dateB - dateA
        return b.invoiceNumber.localeCompare(a.invoiceNumber)
      })
  }, [
    db.invoices,
    dateRangePreset,
    customStartDate,
    customEndDate,
    channelFilter,
    paymentStatusFilter,
    partyFilter,
    productFilter,
    searchQuery,
  ])

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0)
    const totalCollected = filteredInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0)
    const totalOutstanding = filteredInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0)
    const count = filteredInvoices.length
    const avgOrder = count > 0 ? Math.round(totalAmount / count) : 0
    const collectionRate = totalAmount > 0 ? Math.round((totalCollected / totalAmount) * 100) : 0

    return {
      totalAmount,
      totalCollected,
      totalOutstanding,
      count,
      avgOrder,
      collectionRate,
    }
  }, [filteredInvoices])

  // Channel Breakdown
  const channelBreakdown = useMemo(() => {
    const channels: ChannelType[] = [
      'Distributor',
      'Wholesaler',
      'Retailer',
      'POS / Counter',
      'Direct / Walk-in',
    ]

    const map: Record<
      ChannelType,
      { count: number; totalAmount: number; collected: number; outstanding: number }
    > = {
      Distributor: { count: 0, totalAmount: 0, collected: 0, outstanding: 0 },
      Wholesaler: { count: 0, totalAmount: 0, collected: 0, outstanding: 0 },
      Retailer: { count: 0, totalAmount: 0, collected: 0, outstanding: 0 },
      'POS / Counter': { count: 0, totalAmount: 0, collected: 0, outstanding: 0 },
      'Direct / Walk-in': { count: 0, totalAmount: 0, collected: 0, outstanding: 0 },
    }

    filteredInvoices.forEach((inv) => {
      const ch = getInvoiceChannel(inv)
      if (map[ch]) {
        map[ch].count += 1
        map[ch].totalAmount += inv.grandTotal
        map[ch].collected += inv.amountPaid
        map[ch].outstanding += inv.balanceDue
      }
    })

    return channels.map((ch) => ({
      channel: ch,
      ...map[ch],
      pct:
        metrics.totalAmount > 0
          ? Math.round((map[ch].totalAmount / metrics.totalAmount) * 100)
          : 0,
    }))
  }, [filteredInvoices, metrics.totalAmount])

  // Daily Trend Data (Sorted chronological)
  const trendData = useMemo(() => {
    const dayMap: Record<string, { date: string; amount: number; count: number }> = {}

    filteredInvoices.forEach((inv) => {
      const d = inv.date.slice(0, 10)
      if (!dayMap[d]) {
        dayMap[d] = { date: d, amount: 0, count: 0 }
      }
      dayMap[d].amount += inv.grandTotal
      dayMap[d].count += 1
    })

    const points = Object.values(dayMap).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return points
  }, [filteredInvoices])

  // Unique Customer list for filter dropdown
  const uniqueParties = useMemo(() => {
    const list: Array<{ id: string; name: string; type?: string }> = []
    const seen = new Set<string>()

    // Priority 1: db.customers
    db.customers.forEach((c) => {
      if (!seen.has(c.name)) {
        seen.add(c.name)
        list.push({ id: c.id, name: c.businessName || c.name, type: c.type })
      }
    })

    // Priority 2: any other names in invoices
    db.invoices.forEach((inv) => {
      if (inv.customerName && !seen.has(inv.customerName)) {
        seen.add(inv.customerName)
        list.push({ id: inv.customerId, name: inv.customerName, type: inv.customerType })
      }
    })

    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [db.customers, db.invoices])

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Invoice #',
      'Date',
      'Time',
      'Customer / Party',
      'Party Type',
      'Sale Channel',
      'Products Summary',
      'Gross Total (PKR)',
      'Discount (PKR)',
      'Grand Total (PKR)',
      'Amount Paid (PKR)',
      'Balance Due (PKR)',
      'Payment Status',
      'Payment Method',
      'Payment Account',
      'Delivery Status',
      'Notes',
    ]

    const rows = filteredInvoices.map((inv) => [
      inv.invoiceNumber,
      formatDate(inv.date),
      inv.time || '—',
      inv.customerName,
      inv.customerType || '—',
      getInvoiceChannel(inv),
      inv.items.map((i) => `${i.quantity}x ${i.name}`).join('; '),
      inv.subtotal,
      inv.discount,
      inv.grandTotal,
      inv.amountPaid,
      inv.balanceDue,
      inv.status,
      inv.paymentMethod,
      inv.paymentAccount,
      inv.deliveryStatus || '—',
      inv.notes || '',
    ])

    const filename = `Sales_Records_AL_FAROOQ_FOODS_${new Date().toISOString().slice(0, 10)}`
    exportToCSV(filename, headers, rows)
    setSuccessToast(`Exported ${filteredInvoices.length} sales records to CSV`)
  }

  // Delete / Void Invoice Handler
  const handleDeleteInvoice = async (inv: InvoiceItem) => {
    const confirmMsg = `Are you sure you want to VOID and DELETE record "${inv.invoiceNumber}" for ${inv.customerName}?\n\nAmount: ${formatPKR(inv.grandTotal)}\nBalance: ${formatPKR(inv.balanceDue)}\n\nThis will remove it from the sales transaction ledger and adjust the customer balance if pending.`
    if (!await confirmAction(confirmMsg)) return

    // Update customer balance if pending
    let updatedCustomers = db.customers
    if (inv.customerId && inv.balanceDue > 0) {
      updatedCustomers = db.customers.map((c) => {
        if (c.id === inv.customerId) {
          return {
            ...c,
            currentBalance: Math.max(0, c.currentBalance - inv.balanceDue),
            updatedAt: new Date().toISOString().slice(0, 10),
          }
        }
        return c
      })
    }

    const updatedInvoices = db.invoices.filter((i) => i.id !== inv.id)
    onSaveDatabase({
      ...db,
      invoices: updatedInvoices,
      customers: updatedCustomers,
    })

    setSuccessToast(`Invoice ${inv.invoiceNumber} was voided and deleted successfully.`)
  }

  // Save Edit Corrections Handler
  const handleSaveEdit = (corrected: InvoiceItem) => {
    const original = db.invoices.find((i) => i.id === corrected.id)

    // Calculate customer balance differential
    let updatedCustomers = db.customers
    if (corrected.customerId && original) {
      const balanceDiff = corrected.balanceDue - original.balanceDue
      if (balanceDiff !== 0) {
        updatedCustomers = db.customers.map((c) => {
          if (c.id === corrected.customerId) {
            return {
              ...c,
              currentBalance: Math.max(0, c.currentBalance + balanceDiff),
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          }
          return c
        })
      }
    }

    const updatedInvoices = db.invoices.map((inv) =>
      inv.id === corrected.id ? corrected : inv
    )

    onSaveDatabase({
      ...db,
      invoices: updatedInvoices,
      customers: updatedCustomers,
    })

    setEditInvoice(null)
    setSuccessToast(`Sale record ${corrected.invoiceNumber} corrections saved.`)
  }

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full pb-16">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
          <button data-ui="button"
            onClick={() => setSuccessToast(null)}
            className="text-stone-400 hover:text-white ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner - Strictly Reporting & Analytics UI */}
      <div data-ui="toolbar" className="page-title-banner gradient-card bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 uppercase tracking-wider">
              Audit & Reporting Ledger
            </span>
            <span className="text-xs text-stone-400 font-medium">
              {db.invoices.length} Lifetime Transactions
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight mt-1">
            Sales Records & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5 max-w-2xl">
            Audit past transactions, filter across distribution channels, analyze revenue
            trends, and correct sales records.
          </p>
        </div>

        {/* Header Right Actions - Clear Distinction from POS */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0 w-full md:w-auto">
          <button data-ui="button"
            id="sales-export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Download currently filtered sales records as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Quick link to POS for selling */}
          <button data-ui="button"
            id="sales-goto-pos-btn"
            onClick={() => onNavigate('pos')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="New sales, billing, and checkout are handled in the POS Terminal"
          >
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            <span>New Sale? Go to POS Terminal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lightweight Summary & Analytics Section */}
      <div className="sales-metrics grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Sales */}
        <div data-ui="toolbar" className="gradient-card bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500">Total Sales Invoiced</span>
              <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <strong className="text-2xl font-extrabold text-stone-900 block mt-1 tracking-tight">
              {formatPKR(metrics.totalAmount)}
            </strong>
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-3 pt-2.5 border-t border-stone-100">
            <span>{metrics.count} transactions in view</span>
            <span className="font-medium">Avg {formatPKR(metrics.avgOrder)}</span>
          </div>
        </div>

        {/* Metric 2: Payments Collected */}
        <div data-ui="toolbar" className="gradient-card bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500">Payments Collected</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <strong className="text-2xl font-extrabold text-emerald-700 block mt-1 tracking-tight">
              {formatPKR(metrics.totalCollected)}
            </strong>
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-3 pt-2.5 border-t border-stone-100">
            <span className="text-emerald-700 font-medium">{metrics.collectionRate}% collected</span>
            <span>Deposited to Accounts</span>
          </div>
        </div>

        {/* Metric 3: Outstanding Receivables */}
        <div data-ui="toolbar" className="gradient-card bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500">Outstanding Receivables</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <strong className="text-2xl font-extrabold text-amber-700 block mt-1 tracking-tight">
              {formatPKR(metrics.totalOutstanding)}
            </strong>
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-3 pt-2.5 border-t border-stone-100">
            <span className="text-amber-800 font-medium">
              {filteredInvoices.filter((i) => i.balanceDue > 0).length} parties with pending dues
            </span>
            <button data-ui="button"
              onClick={() => onNavigate('customer-management')}
              className="text-stone-500 hover:text-stone-900 underline text-[10px]"
            >
              Ledgers
            </button>
          </div>
        </div>

        {/* Metric 4: Channels Active */}
        <div data-ui="toolbar" className="gradient-card bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500">Top Revenue Channel</span>
              <div className="w-7 h-7 rounded-lg bg-lime-50 flex items-center justify-center text-primary">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            {channelBreakdown.length > 0 && (
              <>
                <strong className="text-xl font-extrabold text-stone-900 block mt-1 tracking-tight truncate">
                  {[...channelBreakdown].sort((a, b) => b.totalAmount - a.totalAmount)[0]?.channel ||
                    'All Channels'}
                </strong>
                <span className="text-xs font-semibold text-primary block mt-0.5">
                  {formatPKR(
                    [...channelBreakdown].sort((a, b) => b.totalAmount - a.totalAmount)[0]?.totalAmount || 0
                  )}{' '}
                  (
                  {[...channelBreakdown].sort((a, b) => b.totalAmount - a.totalAmount)[0]?.pct || 0}
                  %)
                </span>
              </>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-3 pt-2.5 border-t border-stone-100">
            <span>5 channels monitored</span>
            <span className="text-stone-400">POS & Distribution</span>
          </div>
        </div>
      </div>

      {/* Analytics Breakdown & Trend Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Channel Breakdown Card */}
        <div data-ui="toolbar" className="gradient-card bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                <Layers className="w-4 h-4 text-stone-500" />
                <span>Sales Breakdown by Channel</span>
              </div>
              <span className="text-[11px] text-stone-400 font-medium">Selected Period</span>
            </div>

            <div className="space-y-3">
              {channelBreakdown.map((item) => {
                const badgeColor =
                  item.channel === 'POS / Counter'
                    ? 'bg-emerald-500'
                    : item.channel === 'Distributor'
                    ? 'bg-[#7cb518]'
                    : item.channel === 'Wholesaler'
                    ? 'bg-purple-500'
                    : item.channel === 'Retailer'
                    ? 'bg-amber-500'
                    : 'bg-sky-500'

                return (
                  <div key={item.channel} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${badgeColor}`} />
                        <span className="font-semibold text-stone-800">{item.channel}</span>
                        <span className="text-[10px] text-stone-400">({item.count} orders)</span>
                      </div>
                      <div className="font-bold text-stone-900">
                        {formatPKR(item.totalAmount)}{' '}
                        <span className="text-[10px] font-normal text-stone-500">
                          ({item.pct}%)
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full ${badgeColor} transition-all duration-300`}
                        style={{ width: `${Math.max(item.pct > 0 ? 3 : 0, item.pct)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span>Filter channel from toolbar below</span>
            <button data-ui="button"
              onClick={() => setChannelFilter('All')}
              className="text-stone-600 hover:text-stone-900 font-medium"
            >
              Reset Channel
            </button>
          </div>
        </div>

        {/* Sales Trend Chart Card */}
        <div data-ui="toolbar" className="gradient-card bg-white rounded-xl border border-stone-200 p-4 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>Sales Revenue Trend</span>
              </div>
              <span className="text-[11px] text-stone-400">
                {trendData.length} active sales dates
              </span>
            </div>

            {/* SVG Chart */}
            <div className="w-full h-44 mt-2">
              <SalesTrendChart data={trendData} />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-400 mt-2 pt-2 border-t border-stone-100">
            <span>Hover on data points to view daily sales totals</span>
            <span>All amounts in PKR</span>
          </div>
        </div>
      </div>

      {/* CORE FILTERS SECTION */}
      <div className="sales-filter-panel">
        <div className="sales-filter-main">
                    <div className="sales-filter-search relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input data-ui="input"
              type="text"
              aria-label="Search sales records" placeholder="Search sales records?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 text-xs bg-stone-50 hover:bg-white focus:bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button data-ui="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                aria-label="Clear search" onClick={() => setSearchQuery('')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>


          <label className="sales-filter-date"><span className="sr-only">Date range</span>
            <select data-ui="select" value={dateRangePreset} onChange={(event) => setDateRangePreset(event.target.value as typeof dateRangePreset)}>
              <option value="all">All time</option><option value="today">Today</option><option value="this-week">This week</option><option value="this-month">This month</option><option value="last-30-days">Last 30 days</option><option value="custom">Custom range</option>
            </select>
          </label>
          <button type="button" className="sales-filter-toggle" aria-expanded={showMoreFilters} aria-controls="sales-extra-filters" onClick={() => setShowMoreFilters(!showMoreFilters)}>
            <Filter size={15} /> Filters {(channelFilter !== 'All' || paymentStatusFilter !== 'All' || partyFilter !== 'All' || productFilter !== 'All') && <span>{[channelFilter, paymentStatusFilter, partyFilter, productFilter].filter(value => value !== 'All').length}</span>}
          </button>
          {activeFiltersCount > 0 && <button type="button" className="sales-filter-reset" onClick={resetAllFilters}>Reset</button>}
        </div>
                {dateRangePreset === 'custom' && (
          <div className="sales-custom-dates flex flex-wrap items-center gap-3 bg-stone-50 p-2.5 rounded-lg border border-stone-200 text-xs">
            <span className="font-semibold text-stone-700">Custom Date Range:</span>
            <div className="flex items-center gap-1.5">
              <label htmlFor="sales-date-from" className="text-stone-500">From:</label>
              <input data-ui="input"
                type="date"
                id="sales-date-from" value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-stone-200 rounded px-2 py-1 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="sales-date-to" className="text-stone-500">To:</label>
              <input data-ui="input"
                type="date"
                id="sales-date-to" value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-stone-200 rounded px-2 py-1 text-xs"
              />
            </div>
          </div>
        )}


        {showMoreFilters && <div id="sales-extra-filters" className="sales-extra-filters">
          <label className="sales-filter-field"><span>Channel</span><select data-ui="select"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs bg-stone-50 text-stone-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="All">All Channels</option>
              <option value="POS / Counter">POS / Counter</option>
              <option value="Distributor">Distributor</option>
              <option value="Wholesaler">Wholesaler</option>
              <option value="Retailer">Retailer</option>
              <option value="Direct / Walk-in">Direct / Walk-in</option>
            </select></label>
          <label className="sales-filter-field"><span>Payment status</span><select data-ui="select"
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs bg-stone-50 text-stone-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="All">All Payment Statuses</option>
              <option value="Paid">Paid (Cleared)</option>
              <option value="Partial">Partial (Pending Balance)</option>
              <option value="Unpaid">Unpaid (Full Due)</option>
            </select></label>
          <label className="sales-filter-field"><span>Product</span><select data-ui="select"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs bg-stone-50 text-stone-700 font-medium focus:outline-none cursor-pointer truncate"
            >
              <option value="All">All Finished Products</option>
              {db.products.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.name}
                </option>
              ))}
            </select></label>
          <label className="sales-filter-field"><span>Customer / party</span><select data-ui="select"
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className="flex-1 max-w-xs border border-stone-200 rounded-lg px-2.5 py-1 text-xs bg-stone-50 text-stone-700 font-medium focus:outline-none cursor-pointer truncate"
            >
              <option value="All">All Parties & Customers</option>
              {uniqueParties.map((p) => (
                <option key={p.id || p.name} value={p.id}>
                  {p.name} {p.type ? `(${p.type})` : ''}
                </option>
              ))}
            </select></label>
        </div>}
        <div className="sales-filter-count" aria-live="polite">Showing {filteredInvoices.length} of {db.invoices.length} transactions{activeFiltersCount > 0 && <span> ? {activeFiltersCount} active {activeFiltersCount === 1 ? 'filter' : 'filters'}</span>}</div>
      </div>

      {/* UNIFIED SALES RECORDS TABLE */}
      <div data-ui="surface" className="gradient-card bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table data-ui="table" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 text-[10.5px] uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Invoice / Sale ID</th>
                <th className="py-2.5 px-3">Customer / Party Name</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3">Products Summary</th>
                <th className="py-2.5 px-3">Grand Total</th>
                <th className="py-2.5 px-3">Paid</th>
                <th className="py-2.5 px-3">Balance</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredInvoices.map((inv) => {
                const channel = getInvoiceChannel(inv)
                const channelBadgeStyle =
                  channel === 'POS / Counter'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : channel === 'Distributor'
                    ? 'bg-lime-50 text-[#547a11] border-lime-200'
                    : channel === 'Wholesaler'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : channel === 'Retailer'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200'

                // Check if customer exists in customer management
                const linkedCustomer = db.customers.find((c) => c.id === inv.customerId)

                const totalUnits = inv.items.reduce((s, it) => s + it.quantity, 0)
                const primaryUnit = inv.items[0]?.unit || 'pk'

                return (
                  <tr key={inv.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* 1. Date & Time */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-stone-900 text-xs">
                        {formatDate(inv.date)}
                      </div>
                      <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{inv.time || '—'}</span>
                      </div>
                    </td>

                    {/* 2. Invoice ID */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <button data-ui="button"
                        onClick={() => setDetailInvoice(inv)}
                        className="flex items-center gap-1.5 font-bold text-stone-900 hover:text-primary text-xs transition-colors cursor-pointer"
                        title="Click to view details"
                      >
                        <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{inv.invoiceNumber}</span>
                      </button>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        {inv.paymentMethod} · {inv.paymentAccount}
                      </div>
                    </td>

                    {/* 3. Customer / Party Name */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-stone-900 text-xs">
                        {inv.customerName}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-stone-500">
                        <span>{inv.phone || 'No phone'}</span>
                        {linkedCustomer && (
                          <button data-ui="button"
                            onClick={() => onNavigate('customer-management')}
                            className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline font-medium"
                            title="Jump to customer ledger profile"
                          >
                            <span>Profile</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 4. Channel Type */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10.5px] px-2 py-0.5 rounded-md font-bold border ${channelBadgeStyle}`}
                      >
                        {channel}
                      </span>
                    </td>

                    {/* 5. Products Summary */}
                    <td className="py-2.5 px-3 text-xs text-stone-700 max-w-[200px]">
                      <div
                        className="truncate font-medium"
                        title={inv.items.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join(', ')}
                      >
                        {inv.items.length === 1
                          ? `${inv.items[0].quantity} ${inv.items[0].unit} ${inv.items[0].name}`
                          : `${totalUnits} ${primaryUnit} (${inv.items.length} products)`}
                      </div>
                      {inv.items.length > 1 && (
                        <div className="text-[10px] text-stone-400 truncate">
                          {inv.items.map((i) => i.name).join(', ')}
                        </div>
                      )}
                    </td>

                    {/* 6. Grand Total */}
                    <td className="py-2.5 px-3 font-bold text-stone-900 text-xs whitespace-nowrap">
                      {formatPKR(inv.grandTotal)}
                    </td>

                    {/* 7. Paid */}
                    <td className="py-2.5 px-3 text-emerald-700 font-semibold text-xs whitespace-nowrap">
                      {formatPKR(inv.amountPaid)}
                    </td>

                    {/* 8. Balance */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={
                          inv.balanceDue > 0
                            ? 'text-amber-700 font-semibold text-xs'
                            : 'text-stone-400 text-xs'
                        }
                      >
                        {inv.balanceDue > 0 ? formatPKR(inv.balanceDue) : 'Rs. 0'}
                      </span>
                      {inv.dueDate && inv.balanceDue > 0 && (
                        <div className="mt-1">
                          <DueDateBadge dueDate={inv.dueDate} balanceDue={inv.balanceDue} />
                        </div>
                      )}
                    </td>

                    {/* 9. Status */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={
                          inv.status === 'Paid'
                            ? 'status status-success'
                            : inv.status === 'Partial'
                            ? 'status status-warning'
                            : 'status status-danger'
                        }
                      >
                        {inv.status}
                      </span>
                    </td>

                    {/* 10. Actions (View details, Edit record, Void/Delete, Download PDF) */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="row-actions justify-end">
                        {/* 1-click PDF download */}
                        <button data-ui="button"
                          className="row-action text-[#7cb518] hover:bg-emerald-50"
                          title="Download Tax Invoice PDF"
                          onClick={() => {
                            const cust = db.customers.find((c) => c.id === inv.customerId)
                            generateInvoicePDF(inv, cust)
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* View details */}
                        <button data-ui="button"
                          className="row-action hover:bg-stone-100"
                          title="View sale transaction details"
                          onClick={() => setDetailInvoice(inv)}
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-700" />
                        </button>

                        {/* Edit record */}
                        <button data-ui="button"
                          className="row-action hover:bg-blue-50 text-blue-600"
                          title="Correct sale information"
                          onClick={() => setEditInvoice(inv)}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Void / Delete record */}
                        <button data-ui="button"
                          className="row-action danger"
                          title="Void and delete sale record"
                          onClick={() => handleDeleteInvoice(inv)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredInvoices.length === 0 && (
          <div className="empty-state py-12 flex flex-col items-center justify-center text-center">
            <ShoppingBag className="w-10 h-10 text-stone-300 mb-2" />
            <strong className="text-sm text-stone-800">No Sales Records Found</strong>
            <span className="text-xs text-stone-500 max-w-sm mt-1">
              No transactions matched the current filters or date range. Try clearing your search
              filters.
            </span>
            {activeFiltersCount > 0 && (
              <button data-ui="button"
                onClick={resetAllFilters}
                className="mt-3 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* DETAIL INSPECTION MODAL */}
      {detailInvoice && (
        <InvoiceDetailModal
          invoice={detailInvoice}
          customer={db.customers.find((c) => c.id === detailInvoice.customerId)}
          onClose={() => setDetailInvoice(null)}
          onEdit={() => {
            const target = detailInvoice
            setDetailInvoice(null)
            setEditInvoice(target)
          }}
        />
      )}

      {/* EDIT / CORRECT RECORD MODAL */}
      {editInvoice && (
        <EditSaleModal
          invoice={editInvoice}
          customers={db.customers}
          onClose={() => setEditInvoice(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Simple, Crisp SVG Sales Trend Chart
// ----------------------------------------------------------------------------
function SalesTrendChart({
  data,
}: {
  data: Array<{ date: string; amount: number; count: number }>
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 text-xs">
        <TrendingUp className="w-6 h-6 mb-1 text-stone-300" />
        <span>No sales revenue recorded for selected period</span>
      </div>
    )
  }

  // If only 1 data point, show a neat single-day badge
  if (data.length === 1) {
    const point = data[0]
    return (
      <div data-ui="surface" className="gradient-card w-full h-full flex flex-col items-center justify-center bg-stone-50 rounded-xl border border-stone-100 p-4">
        <span className="text-xs text-stone-500 font-semibold">{formatDate(point.date)}</span>
        <strong className="text-2xl font-black text-stone-900 mt-1">
          {formatPKR(point.amount)}
        </strong>
        <span className="text-xs text-stone-400 mt-0.5">{point.count} transactions completed</span>
      </div>
    )
  }

  const width = 700
  const height = 160
  const padLeft = 60
  const padRight = 30
  const padTop = 20
  const padBottom = 30

  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom

  const maxAmount = Math.max(...data.map((d) => d.amount), 5000)

  // Coordinate mapper
  const points = data.map((d, idx) => {
    const x = padLeft + (idx / (data.length - 1)) * chartW
    const y = padTop + chartH - (d.amount / maxAmount) * chartH
    return { ...d, x, y }
  })

  // Build SVG path
  const linePath = points.reduce((acc, pt, i) => {
    return `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
  }, '')

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(
    padTop + chartH
  ).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`

  // Grid levels (0, 50%, 100%)
  const gridLevels = [0, 0.5, 1]

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible select-none"
      >
        <defs>
          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7cb518" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7cb518" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLevels.map((lvl) => {
          const y = padTop + chartH - lvl * chartH
          return (
            <g key={lvl}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#e7e5e4"
                strokeDasharray="3,3"
              />
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                className="text-[9.5px] fill-stone-400 font-medium"
              >
                {formatPKR(Math.round(maxAmount * lvl))}
              </text>
            </g>
          )
        })}

        {/* Area */}
        <path d={areaPath} fill="url(#salesGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />

        {/* Data points & Interaction triggers */}
        {points.map((pt, idx) => {
          const isHovered = hoveredIdx === idx
          return (
            <g
              key={pt.date}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 6 : 3.5}
                fill={isHovered ? '#2b2b2b' : 'var(--primary)'}
                stroke="#ffffff"
                strokeWidth={isHovered ? 2.5 : 1.5}
                className="transition-all duration-150"
              />
              {/* Invisible large hit target */}
              <circle cx={pt.x} cy={pt.y} r={14} fill="transparent" />
            </g>
          )
        })}

        {/* X Axis dates (first, middle, last) */}
        {points.length > 0 && (
          <text
            x={points[0].x}
            y={height - 10}
            textAnchor="start"
            className="text-[10px] fill-stone-500 font-medium"
          >
            {formatDate(points[0].date)}
          </text>
        )}
        {points.length > 2 && (
          <text
            x={points[Math.floor(points.length / 2)].x}
            y={height - 10}
            textAnchor="middle"
            className="text-[10px] fill-stone-500 font-medium"
          >
            {formatDate(points[Math.floor(points.length / 2)].date)}
          </text>
        )}
        {points.length > 1 && (
          <text
            x={points[points.length - 1].x}
            y={height - 10}
            textAnchor="end"
            className="text-[10px] fill-stone-500 font-medium"
          >
            {formatDate(points[points.length - 1].date)}
          </text>
        )}
      </svg>

      {/* Floating Hover Tooltip */}
      {activePoint && (
        <div
          className="absolute z-10 pointer-events-none bg-stone-900 text-white rounded-lg px-2.5 py-1.5 text-xs shadow-lg transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(activePoint.x / width) * 100}%`,
            top: `${(activePoint.y / height) * 100 - 10}%`,
          }}
        >
          <div className="text-[10px] text-stone-400 font-medium">
            {formatDate(activePoint.date)}
          </div>
          <div className="font-bold text-emerald-400">{formatPKR(activePoint.amount)}</div>
          <div className="text-[10px] text-stone-300">{activePoint.count} invoices issued</div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Invoice Detail Inspection Modal (Read-only + PDF download)
// ----------------------------------------------------------------------------
function InvoiceDetailModal({
  invoice,
  customer,
  onClose,
  onEdit,
}: {
  invoice: InvoiceItem
  customer?: CustomerItem
  onClose: () => void
  onEdit: () => void
}) {
  return (
    <div className="editor-overlay">
      <div className="editor-modal large max-w-3xl">
        <div className="editor-header">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 uppercase">
                {invoice.saleType} Order
              </span>
              <span
                className={
                  invoice.status === 'Paid'
                    ? 'status status-success'
                    : invoice.status === 'Partial'
                    ? 'status status-warning'
                    : 'status status-danger'
                }
              >
                {invoice.status}
              </span>
            </div>
            <h2 className="text-xl font-bold text-stone-900 mt-1">{invoice.invoiceNumber}</h2>
          </div>
          <button data-ui="button" className="icon-button" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Party and Transaction Summary */}
        <div data-ui="surface" className="gradient-card bg-stone-50 border border-stone-200 rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-stone-500 block">Customer / Buyer</span>
            <strong className="text-sm text-stone-900 block mt-0.5">{invoice.customerName}</strong>
            <span className="text-stone-500 block">{invoice.phone || 'No phone'}</span>
          </div>
          <div>
            <span className="text-stone-500 block">Date & Time</span>
            <strong className="text-sm text-stone-900 block mt-0.5">
              {formatDate(invoice.date)}
            </strong>
            <span className="text-stone-500 block">{invoice.time || '—'}</span>
          </div>
          <div>
            <span className="text-stone-500 block">Payment Account</span>
            <strong className="text-sm text-stone-900 block mt-0.5">{invoice.paymentMethod}</strong>
            <span className="text-stone-500 block capitalize">
              {invoice.paymentAccount.replace('-', ' ')}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block">Delivery Status</span>
            <strong className="text-sm text-stone-900 block mt-0.5">
              {invoice.deliveryStatus || 'Delivered'}
            </strong>
            <span className="text-stone-500 block truncate">{invoice.address || 'Standard'}</span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-stone-200 rounded-lg overflow-hidden mb-4">
          <table data-ui="table" className="w-full text-xs">
            <thead className="bg-stone-100 text-stone-600 font-bold border-b border-stone-200">
              <tr>
                <th className="py-2 px-3 text-left">#</th>
                <th className="py-2 px-3 text-left">Product Description</th>
                <th className="py-2 px-3 text-center">Quantity</th>
                <th className="py-2 px-3 text-right">Unit Rate</th>
                <th className="py-2 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {invoice.items.map((item, i) => (
                <tr key={i} className="hover:bg-stone-50">
                  <td className="py-2 px-3 text-stone-400">{i + 1}</td>
                  <td className="py-2 px-3 font-semibold text-stone-900">{item.name}</td>
                  <td className="py-2 px-3 text-center">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-2 px-3 text-right text-stone-700">
                    {formatPKR(item.unitPrice)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-stone-900">
                    {formatPKR(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5">
          <div className="text-xs text-stone-500 max-w-sm">
            {invoice.notes && (
              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200 mb-2">
                <strong className="block text-stone-700 font-semibold mb-0.5">Order Notes:</strong>
                <span>{invoice.notes}</span>
              </div>
            )}
            <span className="text-[11px]">
              Internal Record ID: <span className="font-mono text-stone-400">{invoice.id}</span>
            </span>
          </div>

          <div className="w-full sm:w-64 space-y-1.5 text-xs bg-stone-50 p-3 rounded-lg border border-stone-200">
            <div className="flex justify-between text-stone-600">
              <span>Gross Subtotal:</span>
              <span>{formatPKR(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Total Discount:</span>
                <span>- {formatPKR(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-stone-900 border-t border-stone-200 pt-1.5">
              <span>Grand Total:</span>
              <span className="text-primary">{formatPKR(invoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Amount Paid:</span>
              <span>{formatPKR(invoice.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-amber-800 font-semibold">
              <span>Balance Due:</span>
              <span>{formatPKR(invoice.balanceDue)}</span>
            </div>
            {invoice.dueDate && invoice.balanceDue > 0 && (
              <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                <span className="text-stone-500 font-medium">Due Date:</span>
                <DueDateBadge dueDate={invoice.dueDate} balanceDue={invoice.balanceDue} />
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="editor-actions flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-stone-200">
          <button data-ui="button"
            className="button secondary text-xs"
            onClick={() => generateInvoicePDF(invoice, customer)}
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Download Tax Invoice PDF
          </button>
          <div className="flex items-center gap-2">
            <button data-ui="button" className="button secondary text-xs" onClick={onEdit}>
              <Edit3 className="w-3.5 h-3.5 mr-1" /> Correct Record
            </button>
            <button data-ui="button" className="button primary text-xs" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Edit / Correct Sale Record Modal
// ----------------------------------------------------------------------------
function EditSaleModal({
  invoice,
  customers,
  onClose,
  onSave,
}: {
  invoice: InvoiceItem
  customers: CustomerItem[]
  onClose: () => void
  onSave: (corrected: InvoiceItem) => void
}) {
  const [date, setDate] = useState(invoice.date)
  const [time, setTime] = useState(invoice.time || '')
  const [customerName, setCustomerName] = useState(invoice.customerName)
  const [phone, setPhone] = useState(invoice.phone || '')
  const [address, setAddress] = useState(invoice.address || '')
  const [saleType, setSaleType] = useState(invoice.saleType)
  const [paymentStatus, setPaymentStatus] = useState(invoice.status)
  const [amountPaid, setAmountPaid] = useState<number>(invoice.amountPaid)
  const [paymentMethod, setPaymentMethod] = useState(invoice.paymentMethod)
  const [paymentAccount, setPaymentAccount] = useState(invoice.paymentAccount)
  const [deliveryStatus, setDeliveryStatus] = useState(invoice.deliveryStatus || 'Delivered')
  const [dueDate, setDueDate] = useState(invoice.dueDate || '')
  const [notes, setNotes] = useState(invoice.notes || '')

  // Recalculate balance
  const balanceDue = Math.max(0, invoice.grandTotal - (Number(amountPaid) || 0))

  const handleStatusChange = (newStatus: 'Paid' | 'Partial' | 'Unpaid') => {
    setPaymentStatus(newStatus)
    if (newStatus === 'Paid') {
      setAmountPaid(invoice.grandTotal)
    } else if (newStatus === 'Unpaid') {
      setAmountPaid(0)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const effectivePaid =
      paymentStatus === 'Paid'
        ? invoice.grandTotal
        : paymentStatus === 'Unpaid'
        ? 0
        : Math.min(invoice.grandTotal, Math.max(0, Number(amountPaid) || 0))

    const finalBalance = Math.max(0, invoice.grandTotal - effectivePaid)

    const correctedInvoice: InvoiceItem = {
      ...invoice,
      date,
      time: time || undefined,
      dueDate: finalBalance > 0 && dueDate ? dueDate : undefined,
      customerName: customerName.trim() || invoice.customerName,
      phone: phone.trim(),
      address: address.trim(),
      saleType,
      status: paymentStatus,
      amountPaid: effectivePaid,
      balanceDue: finalBalance,
      paymentMethod,
      paymentAccount,
      deliveryStatus,
      notes: notes.trim() || undefined,
    }

    if (!(await confirmAction({"title":"Save changes?","message":"Apply these edits to the saved record?","confirmLabel":"Save changes","destructive":false}))) return
    onSave(correctedInvoice)
  }

  return (
    <div className="editor-overlay">
      <div className="editor-modal max-w-xl">
        <div className="editor-header">
          <div>
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
              Correct Sale Record
            </span>
            <h2 className="text-lg font-bold text-stone-900 mt-0.5">
              Edit {invoice.invoiceNumber}
            </h2>
          </div>
          <button data-ui="button" className="icon-button" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-600 font-semibold mb-1">Invoice Date</label>
              <input data-ui="input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-stone-200 rounded-lg p-2 bg-stone-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-stone-600 font-semibold mb-1">Time Stamp</label>
              <input data-ui="input"
                type="text"
                placeholder="e.g. 02:45 PM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full border border-stone-200 rounded-lg p-2 bg-stone-50 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-600 font-semibold mb-1">
                Customer / Party Name
              </label>
              <input data-ui="input"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-stone-200 rounded-lg p-2 bg-stone-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-stone-600 font-semibold mb-1">Phone Number</label>
              <input data-ui="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-stone-200 rounded-lg p-2 bg-stone-50 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-600 font-semibold mb-1">Sale Channel Type</label>
              <select data-ui="select"
                value={saleType}
                onChange={(e) => setSaleType(e.target.value as any)}
                className="w-full border border-stone-200 rounded-lg p-2 bg-stone-50 focus:bg-white"
              >
                <option value="Counter">Counter (POS Sale)</option>
                <option value="Distributor">Distributor Sale</option>
                <option value="Wholesale">Wholesale Account</option>
                <option value="Retail">Retail Shop</option>
              </select>
            </div>
            <div>
              <label className="block text-stone-600 font-semibold mb-1">Delivery Status</label>
              <select data-ui="select"
                value={deliveryStatus}
                onChange={(e) => setDeliveryStatus(e.target.value as any)}
                className="w-full border border-stone-200 rounded-lg p-2 bg-stone-50 focus:bg-white"
              >
                <option value="Delivered">Delivered</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Payment Status & Accounting */}
          <div data-ui="surface" className="gradient-card bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-3">
            <span className="font-bold text-stone-800 block text-xs">
              Payment & Balance Corrections
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-stone-500 font-medium mb-1">Grand Total</label>
                <div className="font-bold text-stone-900 py-1.5">{formatPKR(invoice.grandTotal)}</div>
              </div>
              <div>
                <label className="block text-stone-500 font-medium mb-1">Payment Status</label>
                <select data-ui="select"
                  value={paymentStatus}
                  onChange={(e) => handleStatusChange(e.target.value as any)}
                  className="w-full border border-stone-200 rounded p-1.5 bg-white font-semibold"
                >
                  <option value="Paid">Paid (Full)</option>
                  <option value="Partial">Partial</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>
              <div>
                <label className="block text-stone-500 font-medium mb-1">Amount Paid (PKR)</label>
                <input data-ui="input"
                  type="number"
                  min="0"
                  max={invoice.grandTotal}
                  value={amountPaid}
                  disabled={paymentStatus === 'Paid' || paymentStatus === 'Unpaid'}
                  onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                  className="w-full border border-stone-200 rounded p-1.5 bg-white disabled:bg-stone-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-200">
              <span className="text-stone-600">Calculated Balance Due:</span>
              <strong className={balanceDue > 0 ? 'text-amber-800 font-bold' : 'text-stone-500'}>
                {formatPKR(balanceDue)}
              </strong>
            </div>

            {(balanceDue > 0 || paymentMethod === 'Credit') && (
              <div className="pt-2 border-t border-amber-200 flex items-center justify-between gap-2 bg-amber-50/60 p-2 rounded-lg">
                <label className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Payment Due Date:</span>
                </label>
                <input data-ui="input"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="border border-amber-300 rounded px-2 py-1 text-xs bg-white text-stone-800 font-medium focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-stone-500 font-medium mb-1">Payment Method</label>
                <select data-ui="select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full border border-stone-200 rounded p-1.5 bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online">Online</option>
                  <option value="Card">Card</option>
                  <option value="Credit">Credit</option>
                </select>
              </div>
              <div>
                <label className="block text-stone-500 font-medium mb-1">Deposit Account</label>
                <select data-ui="select"
                  value={paymentAccount}
                  onChange={(e) => setPaymentAccount(e.target.value as any)}
                  className="w-full border border-stone-200 rounded p-1.5 bg-white"
                >
                  <option value="cash-in-hand">Cash in Hand</option>
                  <option value="meezan-bank">Meezan Bank</option>
                  <option value="hbl-bank">HBL Bank</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-stone-600 font-semibold mb-1">
              Correction Notes / Audit Remarks
            </label>
            <textarea data-ui="textarea"
              rows={2}
              placeholder="Reason for correction or special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-stone-200 rounded-lg p-2 bg-stone-50 focus:bg-white"
            />
          </div>

          <div className="editor-actions flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button data-ui="button" type="button" className="button secondary text-xs" onClick={onClose}>
              Cancel
            </button>
            <button data-ui="button" type="submit" className="button primary text-xs">
              Save Corrections
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
