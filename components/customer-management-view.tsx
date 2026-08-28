'use client'

import React, { useState, useMemo } from 'react'
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  MapPin,
  FileText,
  Download,
  X,
  CreditCard,
  Building2,
  Store,
  UserCheck,
  Briefcase,
  TrendingUp,
  Receipt,
  DollarSign,
  ArrowLeft,
  Eye,
  Image as ImageIcon,
  Printer,
  Calendar,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  ChevronRight,
  FolderTree,
  AlertTriangle,
  ShoppingBag,
  ExternalLink,
  Layers,
  Sparkles,
  MessageCircle,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  type AppDatabase,
  type CustomerItem,
  type CustomerType,
  type CustomerCategoryItem,
  type CustomerPaymentRecord,
  type InvoiceItem,
  type LedgerEntry,
  defaultCustomerCategories,
} from '@/lib/db'
import {
  generateLedgerPDF,
  generateInvoicePDF,
  generateCustomerPaymentReceiptPDF,
  exportToCSV,
} from '@/lib/pdf-export'

interface CustomerManagementViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigate?: (module: string, subTab?: string) => void
}

export default function CustomerManagementView({
  db,
  onSaveDatabase,
  onNavigate,
}: CustomerManagementViewProps) {
  // Navigation / Selected Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'ledger' | 'invoices' | 'products' | 'payments'>('ledger')

  // Search & Filter Toolbar State
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'outstanding' | 'settled' | 'overlimit'>('all')

  // Modals State
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null)
  const [isManagingCategories, setIsManagingCategories] = useState(false)
  const [isRecordingPayment, setIsRecordingPayment] = useState<CustomerItem | null>(null)
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceItem | null>(null)
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null)
  const [deleteWarningCustomer, setDeleteWarningCustomer] = useState<{ customer: CustomerItem; invoiceCount: number; ledgerCount: number } | null>(null)

  // Safe Customer Categories
  const customerCategories = useMemo(() => {
    return db.customerCategories && db.customerCategories.length > 0
      ? db.customerCategories
      : defaultCustomerCategories
  }, [db.customerCategories])

  // Current Selected Customer Profile
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null
    return db.customers.find((c) => c.id === selectedCustomerId) || null
  }, [db.customers, selectedCustomerId])

  // Helper to get Category / Parent classification
  const getCustomerCategoryInfo = (cust: CustomerItem) => {
    const rawType = cust.type || 'Retailer'
    const matchedCategory = customerCategories.find(
      (cat) => cat.name.toLowerCase() === rawType.toLowerCase() || cat.id === rawType
    )
    if (matchedCategory) {
      return {
        name: matchedCategory.name,
        parentType: matchedCategory.parentType,
      }
    }
    if (rawType === 'Distributor' || rawType === 'Sales Man' || rawType === 'Sales Representative' || rawType === 'Wholesaler' || rawType === 'Van Sales') {
      return { name: rawType, parentType: 'Wholesaler' as const }
    }
    if (rawType === 'Walk-in' || rawType === 'Walk-in Customer' || rawType === 'Counter') {
      return { name: 'Walk-in Customer', parentType: 'Walk-in' as const }
    }
    return { name: rawType, parentType: 'Retailer' as const }
  }

  // Filtered Customers List
  const filteredCustomers = useMemo(() => {
    return db.customers.filter((c) => {
      const catInfo = getCustomerCategoryInfo(c)

      // Type Filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'Wholesaler') {
          if (catInfo.parentType !== 'Wholesaler' && catInfo.name !== 'Wholesaler') return false
        } else if (typeFilter === 'Retailer') {
          if (catInfo.parentType !== 'Retailer' && catInfo.name !== 'Retailer') return false
        } else if (typeFilter === 'Walk-in') {
          if (catInfo.parentType !== 'Walk-in' && catInfo.name !== 'Walk-in Customer') return false
        } else {
          if (catInfo.name.toLowerCase() !== typeFilter.toLowerCase()) return false
        }
      }

      // Balance Filter
      if (balanceFilter === 'outstanding' && c.currentBalance <= 0) return false
      if (balanceFilter === 'settled' && c.currentBalance > 0) return false
      if (balanceFilter === 'overlimit' && (c.creditLimit <= 0 || c.currentBalance <= c.creditLimit)) return false

      // Search Query
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true

      const nameMatch = (c.name || '').toLowerCase().includes(q)
      const businessMatch = (c.businessName || '').toLowerCase().includes(q)
      const phoneMatch = (c.phone || '').includes(q) || (c.altPhone || '').includes(q)
      const idMatch = (c.customerId || c.id || '').toLowerCase().includes(q)
      const addressMatch = (c.address || '').toLowerCase().includes(q) || (c.city || '').toLowerCase().includes(q)

      return nameMatch || businessMatch || phoneMatch || idMatch || addressMatch
    })
  }, [db.customers, searchQuery, typeFilter, balanceFilter, customerCategories])

  // Top Metrics Data
  const metrics = useMemo(() => {
    const totalCount = db.customers.length
    const totalReceivables = db.customers.reduce((acc, c) => acc + (c.currentBalance > 0 ? c.currentBalance : 0), 0)

    let distributors = 0
    let retailers = 0
    let salesMen = 0
    let walkIns = 0

    db.customers.forEach((c) => {
      const catInfo = getCustomerCategoryInfo(c)
      if (catInfo.name === 'Distributor') distributors++
      else if (catInfo.name === 'Sales Man' || catInfo.name === 'Sales Representative') salesMen++
      else if (catInfo.parentType === 'Retailer' || catInfo.name === 'Retailer') retailers++
      else if (catInfo.parentType === 'Walk-in' || catInfo.name === 'Walk-in Customer') walkIns++
    })

    return { totalCount, totalReceivables, distributors, retailers, salesMen, walkIns }
  }, [db.customers, customerCategories])

  // Customer Invoices
  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return []
    return db.invoices
      .filter((inv) => inv.customerId === selectedCustomer.id || inv.partyId === selectedCustomer.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [selectedCustomer, db.invoices])

  // Chronological Running Ledger
  const customerLedgers = useMemo(() => {
    if (!selectedCustomer) return []
    const rawEntries = db.ledgers.filter((l) => l.partyId === selectedCustomer.id)

    if (rawEntries.length > 0) {
      return [...rawEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    // Auto-generate if not pre-populated
    const generated: LedgerEntry[] = []
    let runningBalance = selectedCustomer.openingBalance || 0

    if (selectedCustomer.openingBalance > 0) {
      generated.push({
        id: `led-op-${selectedCustomer.id}`,
        partyId: selectedCustomer.id,
        partyType: 'Customer',
        date: selectedCustomer.createdAt || '2026-08-01',
        referenceType: 'Opening',
        referenceId: 'OP-BAL',
        description: 'Opening Balance Carried Forward',
        debit: selectedCustomer.openingBalance,
        credit: 0,
        balance: runningBalance,
      })
    }

    // Invoices
    customerInvoices.forEach((inv) => {
      runningBalance += inv.grandTotal
      generated.push({
        id: `led-inv-${inv.id}`,
        partyId: selectedCustomer.id,
        partyType: 'Customer',
        date: inv.date,
        referenceType: 'Invoice',
        referenceId: inv.invoiceNumber,
        description: `Commercial Invoice #${inv.invoiceNumber} (${(inv.items || []).length} items)`,
        debit: inv.grandTotal,
        credit: 0,
        balance: runningBalance,
      })

      if (inv.amountPaid > 0) {
        runningBalance -= inv.amountPaid
        generated.push({
          id: `led-pay-inv-${inv.id}`,
          partyId: selectedCustomer.id,
          partyType: 'Customer',
          date: inv.date,
          referenceType: 'Payment',
          referenceId: `REC-${inv.invoiceNumber}`,
          description: `Payment received against #${inv.invoiceNumber} via ${inv.paymentMethod}`,
          debit: 0,
          credit: inv.amountPaid,
          balance: runningBalance,
        })
      }
    })

    // Manual / Profile Payments
    ;(selectedCustomer.paymentRecords || []).forEach((pay) => {
      runningBalance -= pay.amount
      generated.push({
        id: `led-rec-${pay.id}`,
        partyId: selectedCustomer.id,
        partyType: 'Customer',
        date: pay.date,
        referenceType: 'Payment',
        referenceId: pay.receiptNumber,
        description: `Direct Payment Receipt #${pay.receiptNumber} (${pay.paymentMethod}) ${pay.notes ? '- ' + pay.notes : ''}`,
        debit: 0,
        credit: pay.amount,
        balance: runningBalance,
      })
    })

    return generated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [selectedCustomer, db.ledgers, customerInvoices])

  // Financial Stats for Selected Customer Profile
  const profileFinancials = useMemo(() => {
    if (!selectedCustomer) {
      return {
        totalInvoiced: 0,
        totalPaid: 0,
        currentOutstanding: 0,
        lastTransactionDate: '—',
      }
    }

    const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0)
    const invoicePayments = customerInvoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0)
    const directPayments = (selectedCustomer.paymentRecords || []).reduce((sum, p) => sum + (p.amount || 0), 0)
    const totalPaid = invoicePayments + directPayments
    const currentOutstanding = selectedCustomer.currentBalance

    // Determine last transaction date
    let lastDate = selectedCustomer.updatedAt || selectedCustomer.createdAt || ''
    if (customerInvoices.length > 0) {
      lastDate = customerInvoices[0].date
    }
    if (selectedCustomer.paymentRecords && selectedCustomer.paymentRecords.length > 0) {
      const lastPayDate = selectedCustomer.paymentRecords[0].date
      if (!lastDate || new Date(lastPayDate).getTime() > new Date(lastDate).getTime()) {
        lastDate = lastPayDate
      }
    }

    return {
      totalInvoiced,
      totalPaid,
      currentOutstanding,
      lastTransactionDate: lastDate ? formatDate(lastDate) : 'No transactions',
    }
  }, [selectedCustomer, customerInvoices])

  // Aggregated Products Purchased Summary (Top Products bought)
  const productsPurchasedSummary = useMemo(() => {
    if (!selectedCustomer) return []
    const map = new Map<
      string,
      {
        productId: string
        name: string
        unit: string
        totalQuantity: number
        totalSpent: number
        lastUnitPrice: number
        lastDate: string
        orderCount: number
      }
    >()

    customerInvoices.forEach((inv) => {
      ;(inv.items || []).forEach((item) => {
        const existing = map.get(item.productId || item.name)
        const lineTotal = item.total || item.quantity * item.unitPrice
        if (existing) {
          existing.totalQuantity += item.quantity
          existing.totalSpent += lineTotal
          existing.orderCount += 1
          if (new Date(inv.date).getTime() > new Date(existing.lastDate).getTime()) {
            existing.lastDate = inv.date
            existing.lastUnitPrice = item.unitPrice
          }
        } else {
          map.set(item.productId || item.name, {
            productId: item.productId,
            name: item.name,
            unit: item.unit || 'Cartons',
            totalQuantity: item.quantity,
            totalSpent: lineTotal,
            lastUnitPrice: item.unitPrice,
            lastDate: inv.date,
            orderCount: 1,
          })
        }
      })
    })

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent)
  }, [selectedCustomer, customerInvoices])

  // Export Customer List CSV
  const handleExportCSV = () => {
    const headers = [
      'Customer ID',
      'Name',
      'Business Name',
      'Category',
      'Parent Type',
      'Phone',
      'Address',
      'City',
      'Opening Balance',
      'Current Balance',
      'Credit Limit',
      'Status',
    ]
    const rows = filteredCustomers.map((c) => {
      const cat = getCustomerCategoryInfo(c)
      return [
        c.customerId || c.id,
        c.name,
        c.businessName || '—',
        cat.name,
        cat.parentType,
        c.phone,
        c.address,
        c.city || '—',
        c.openingBalance,
        c.currentBalance,
        c.creditLimit,
        c.status,
      ]
    })
    exportToCSV(`Customers_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  // Delete Customer Handler with transaction history safety check
  const requestDeleteCustomer = (customer: CustomerItem) => {
    const linkedInvoices = db.invoices.filter((i) => i.customerId === customer.id || i.partyId === customer.id)
    const linkedLedgers = db.ledgers.filter((l) => l.partyId === customer.id)
    setDeleteWarningCustomer({
      customer,
      invoiceCount: linkedInvoices.length,
      ledgerCount: linkedLedgers.length,
    })
  }

  const confirmDeleteCustomer = () => {
    if (!deleteWarningCustomer) return
    const customerId = deleteWarningCustomer.customer.id
    const updatedCustomers = db.customers.filter((c) => c.id !== customerId)
    const updatedLedgers = db.ledgers.filter((l) => l.partyId !== customerId)

    onSaveDatabase({
      ...db,
      customers: updatedCustomers,
      ledgers: updatedLedgers,
    })

    if (selectedCustomerId === customerId) {
      setSelectedCustomerId(null)
    }
    setDeleteWarningCustomer(null)
  }

  // Record Payment Handler
  const handleSavePayment = (paymentData: {
    amount: number
    date: string
    paymentMethod: 'Cash' | 'Card' | 'Online' | 'Bank Transfer' | 'Cheque'
    paymentAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank'
    transactionRef: string
    receiptImage?: string
    notes: string
  }) => {
    if (!isRecordingPayment) return
    const cust = isRecordingPayment

    const receiptNumber = `REC-2026-${String(Math.floor(1000 + Math.random() * 9000))}`
    const newRecord: CustomerPaymentRecord = {
      id: `cpay-${Date.now()}`,
      receiptNumber,
      date: paymentData.date,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      paymentAccount: paymentData.paymentAccount,
      transactionRef: paymentData.transactionRef,
      receiptImage: paymentData.receiptImage,
      notes: paymentData.notes,
      createdAt: new Date().toISOString(),
    }

    const updatedBalance = Math.max(0, cust.currentBalance - paymentData.amount)
    const updatedRecords = [newRecord, ...(cust.paymentRecords || [])]

    // Create Ledger entry
    const newLedgerEntry: LedgerEntry = {
      id: `led-${Date.now()}`,
      partyId: cust.id,
      partyType: 'Customer',
      date: paymentData.date,
      referenceType: 'Payment',
      referenceId: receiptNumber,
      description: `Manual Payment Received (${paymentData.paymentMethod}) ${
        paymentData.transactionRef ? 'Ref: ' + paymentData.transactionRef : ''
      }`,
      debit: 0,
      credit: paymentData.amount,
      balance: updatedBalance,
    }

    // Update Customer in DB
    const updatedCustomers = db.customers.map((c) =>
      c.id === cust.id
        ? {
            ...c,
            currentBalance: updatedBalance,
            paymentRecords: updatedRecords,
            updatedAt: new Date().toISOString().slice(0, 10),
          }
        : c
    )

    // Update Accounts Balance
    const updatedAccounts = db.accounts.map((acc) => {
      if (acc.id === paymentData.paymentAccount) {
        return { ...acc, balance: acc.balance + paymentData.amount, updatedAt: paymentData.date }
      }
      return acc
    })

    onSaveDatabase({
      ...db,
      customers: updatedCustomers,
      ledgers: [...db.ledgers, newLedgerEntry],
      accounts: updatedAccounts,
    })

    setIsRecordingPayment(null)
  }

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. LIST VIEW (When no customer profile is open) */}
      {/* ========================================================================= */}
      {!selectedCustomer && (
        <>
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  <Users className="w-3.5 h-3.5" /> Customer Accounts
                </span>
              </div>
              <h1 className="text-2xl font-black text-stone-900 mt-1">Customer Management</h1>
              <p className="text-xs text-stone-500 mt-0.5">
                Maintain directory of Retailers, Wholesalers, Distributors, Sales Men, and Walk-in customers with live ledgers & dues.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                className="button secondary text-xs"
                onClick={() => setIsManagingCategories(true)}
                title="Manage Customer Categories & Sub-types"
              >
                <FolderTree className="w-3.5 h-3.5 text-stone-600" /> Manage Categories
              </button>
              <button className="button secondary text-xs" onClick={handleExportCSV} title="Export CSV">
                <Download className="w-3.5 h-3.5 text-stone-600" /> Export CSV
              </button>
              <button className="button primary text-xs" onClick={() => setIsCreatingCustomer(true)}>
                <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add New Customer
              </button>
            </div>
          </div>

          {/* Top Stats Bar — Evenly Spaced Structured Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Total Accounts</span>
                <Users className="w-4 h-4 text-stone-400" />
              </div>
              <div className="mt-2">
                <strong className="text-2xl font-black text-stone-900 block">{metrics.totalCount}</strong>
                <span className="text-[11px] text-stone-500 font-medium">All registered profiles</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Distributors</span>
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2">
                <strong className="text-2xl font-black text-blue-700 block">{metrics.distributors}</strong>
                <span className="text-[11px] text-stone-500 font-medium">Wholesale hub accounts</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Retailers (Shops)</span>
                <Store className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2">
                <strong className="text-2xl font-black text-emerald-700 block">{metrics.retailers}</strong>
                <span className="text-[11px] text-stone-500 font-medium">Direct retail shops & marts</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Sales Men / Reps</span>
                <UserCheck className="w-4 h-4 text-purple-600" />
              </div>
              <div className="mt-2">
                <strong className="text-2xl font-black text-purple-700 block">{metrics.salesMen}</strong>
                <span className="text-[11px] text-stone-500 font-medium">Route order bookers</span>
              </div>
            </div>

            <div className="col-span-2 md:col-span-1 bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Outstanding</span>
                <DollarSign className="w-4 h-4 text-amber-700" />
              </div>
              <div className="mt-2">
                <strong className="text-2xl font-black text-amber-900 block">{formatPKR(metrics.totalReceivables)}</strong>
                <span className="text-[11px] text-amber-700 font-semibold">Total receivable dues</span>
              </div>
            </div>
          </div>

          {/* Unified Filter & Search Toolbar */}
          <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, business, phone, ID, city, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-stone-50 rounded-lg border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs & Balance Dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-stone-200 p-1 bg-stone-50">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    typeFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  All ({db.customers.length})
                </button>
                <button
                  onClick={() => setTypeFilter('Retailer')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    typeFilter === 'Retailer' ? 'bg-white text-emerald-800 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Retailers ({metrics.retailers})
                </button>
                <button
                  onClick={() => setTypeFilter('Wholesaler')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    typeFilter === 'Wholesaler' ? 'bg-white text-blue-800 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Wholesalers ({metrics.distributors + metrics.salesMen})
                </button>
                <button
                  onClick={() => setTypeFilter('Walk-in')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    typeFilter === 'Walk-in' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Walk-in ({metrics.walkIns})
                </button>
              </div>

              <select
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value as any)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">All Balances</option>
                <option value="outstanding">Outstanding Receivable (&gt; 0)</option>
                <option value="settled">Settled / Clear (Rs 0)</option>
                <option value="overlimit">Over Credit Limit</option>
              </select>
            </div>
          </div>

          {/* Customers Cards Grid */}
          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 shadow-xs">
              <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-stone-800">No customers found</h3>
                <p className="text-xs text-stone-500">
                  {searchQuery || typeFilter !== 'all' || balanceFilter !== 'all'
                    ? 'Try adjusting your search query or filters to find the customer you are looking for.'
                    : 'Get started by adding your first customer account.'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {(searchQuery || typeFilter !== 'all' || balanceFilter !== 'all') && (
                    <button
                      className="button secondary text-xs"
                      onClick={() => {
                        setSearchQuery('')
                        setTypeFilter('all')
                        setBalanceFilter('all')
                      }}
                    >
                      Reset Filters
                    </button>
                  )}
                  <button
                    className="button primary text-xs"
                    onClick={() => setIsCreatingCustomer(true)}
                  >
                    <Plus className="w-4 h-4" /> Add Customer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5" id="customers-card-grid">
              {filteredCustomers.map((c) => {
                const cat = getCustomerCategoryInfo(c)
                const isOverLimit = c.creditLimit > 0 && c.currentBalance > c.creditLimit
                const initials = (c.name || 'CU')
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()

                // Category style & icon
                let catBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'
                let catAvatarClass = 'bg-emerald-100 text-emerald-800 border-emerald-200'
                let catIcon = <Store className="w-3 h-3 shrink-0" />

                if (cat.name === 'Distributor') {
                  catBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200'
                  catAvatarClass = 'bg-blue-100 text-blue-800 border-blue-200'
                  catIcon = <Building2 className="w-3 h-3 shrink-0" />
                } else if (cat.name === 'Sales Man' || cat.name === 'Sales Representative') {
                  catBadgeClass = 'bg-purple-50 text-purple-700 border-purple-200'
                  catAvatarClass = 'bg-purple-100 text-purple-800 border-purple-200'
                  catIcon = <UserCheck className="w-3 h-3 shrink-0" />
                } else if (cat.parentType === 'Wholesaler' || cat.name === 'Wholesaler') {
                  catBadgeClass = 'bg-sky-50 text-sky-700 border-sky-200'
                  catAvatarClass = 'bg-sky-100 text-sky-800 border-sky-200'
                  catIcon = <Building2 className="w-3 h-3 shrink-0" />
                } else if (cat.parentType === 'Walk-in' || cat.name === 'Walk-in Customer' || cat.name === 'Counter') {
                  catBadgeClass = 'bg-stone-100 text-stone-700 border-stone-200'
                  catAvatarClass = 'bg-stone-100 text-stone-700 border-stone-200'
                  catIcon = <Users className="w-3 h-3 shrink-0" />
                } else if (cat.parentType !== 'Retailer' && cat.name !== 'Retailer') {
                  catBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200'
                  catAvatarClass = 'bg-amber-100 text-amber-800 border-amber-200'
                  catIcon = <Briefcase className="w-3 h-3 shrink-0" />
                }

                // Phone clean & URL
                const cleanPhone = (c.phone || '').replace(/[^0-9+]/g, '')
                const telUrl = cleanPhone ? `tel:${cleanPhone}` : undefined

                // WhatsApp clean & URL
                const waRaw = (c.altPhone || c.phone || '').replace(/[^0-9]/g, '')
                const waFormatted = waRaw.startsWith('0') ? '92' + waRaw.slice(1) : waRaw.startsWith('92') ? waRaw : '92' + waRaw
                const waUrl = waRaw ? `https://wa.me/${waFormatted}` : undefined
                const waDisplay = c.altPhone || c.phone

                return (
                  <div
                    key={c.id}
                    className="group bg-white rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative border border-stone-200/90 hover:border-stone-300"
                    id={`customer-card-${c.id}`}
                  >
                    <div>
                      {/* Top Row: Initials Avatar Circle & Category Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center shadow-2xs border shrink-0 transition-transform group-hover:scale-105 ${catAvatarClass}`}
                          title={`${c.name} (${cat.name})`}
                        >
                          {initials}
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-md border shadow-2xs shrink-0 ${catBadgeClass}`}
                        >
                          {catIcon}
                          <span>{cat.name}</span>
                        </span>
                      </div>

                      {/* Middle Section: Customer Name, Business Subtitle, City & Address */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between gap-1.5">
                          <h3
                            className="font-bold text-stone-900 text-[13.5px] leading-snug group-hover:text-emerald-700 transition-colors truncate"
                            title={c.name}
                          >
                            {c.name}
                          </h3>
                          {c.customerId && (
                            <span className="text-[9.5px] font-mono font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded shrink-0">
                              {c.customerId}
                            </span>
                          )}
                        </div>

                        <p
                          className="text-[11.5px] text-stone-500 font-medium truncate mt-0.5"
                          title={c.businessName || `${cat.name} Account`}
                        >
                          {c.businessName || `${cat.name} Account`}
                        </p>

                        <div className="flex items-center gap-1 text-stone-500 mt-1.5">
                          <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                          <span
                            className="truncate text-[11px]"
                            title={`${c.city ? c.city + ' · ' : ''}${c.address || 'Address not specified'}`}
                          >
                            {c.city && <strong className="text-stone-700">{c.city} · </strong>}
                            {c.address || 'Address not set'}
                          </span>
                        </div>
                      </div>

                      {/* Balance Row (Positioned Above Contact Number) */}
                      <div
                        className={`rounded-xl p-2.5 mt-3 border flex items-center justify-between transition-colors ${
                          c.currentBalance > 0
                            ? 'bg-amber-50/60 border-amber-200/70 text-amber-900'
                            : 'bg-stone-50/80 border-stone-200/70 text-stone-800'
                        }`}
                      >
                        <div>
                          <span className="text-[9.5px] font-bold uppercase tracking-wider block text-stone-500">
                            {c.currentBalance > 0 ? 'Outstanding Due' : 'Balance Settled'}
                          </span>
                          <span className="text-[10px] text-stone-400 font-medium block mt-0.5">
                            Open: {formatPKR(c.openingBalance)}
                          </span>
                        </div>
                        <div className="text-right">
                          <strong
                            className={`text-[13px] font-bold block ${
                              c.currentBalance > 0 ? 'text-rose-700 font-extrabold' : 'text-emerald-700'
                            }`}
                          >
                            {formatPKR(c.currentBalance)}
                          </strong>
                          {isOverLimit && (
                            <span className="text-[9px] text-rose-600 font-bold flex items-center justify-end gap-0.5">
                              <AlertCircle className="w-2.5 h-2.5" /> Over Limit
                            </span>
                          )}
                          {c.currentBalance <= 0 && (
                            <span className="text-[9px] text-emerald-700 font-medium">Clear</span>
                          )}
                        </div>
                      </div>

                      {/* Contact Row (Positioned Below Balance with Compact Buttons) */}
                      <div className="flex items-center gap-1.5 mt-2.5">
                        <a
                          href={telUrl}
                          onClick={(e) => e.stopPropagation()}
                          className={`flex-1 inline-flex items-center gap-1.5 text-[11px] font-mono py-1 px-2 rounded-lg border transition-all truncate ${
                            c.phone
                              ? 'bg-stone-50/80 text-stone-700 border-stone-200/80 hover:bg-stone-100 hover:text-stone-900 active:scale-98'
                              : 'bg-stone-50/40 text-stone-300 border-stone-100 pointer-events-none'
                          }`}
                          title={c.phone ? `Call ${c.name} (${c.phone})` : 'No phone number'}
                        >
                          <Phone className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                          <span className="truncate">{c.phone || 'No phone'}</span>
                        </a>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center gap-1 text-[10.5px] font-medium py-1 px-2 rounded-lg border transition-all shrink-0 ${
                            waUrl
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100 active:scale-98'
                              : 'bg-stone-50/40 text-stone-300 border-stone-100 pointer-events-none'
                          }`}
                          title={waDisplay ? `WhatsApp ${c.name} (${waDisplay})` : 'No WhatsApp number'}
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>

                    {/* Bottom Action Row (Compact & Proportional) */}
                    <div
                      className="pt-2 mt-3 border-t border-stone-100 flex items-center justify-between gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="flex-1 py-1 px-2.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 rounded-lg border border-emerald-200/80 transition-colors flex items-center justify-center gap-1 shadow-2xs"
                        onClick={() => setSelectedCustomerId(c.id)}
                        title="Open Customer Profile (Ledger, Transactions, Invoices)"
                      >
                        <Eye className="w-3 h-3 text-emerald-700" />
                        <span>View Profile</span>
                      </button>
                      <button
                        type="button"
                        className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg border border-stone-200/80 transition-colors"
                        title="Edit Customer Details"
                        onClick={() => setEditingCustomer(c)}
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-stone-200/80 hover:border-rose-200 transition-colors"
                        title="Delete Customer Profile"
                        onClick={() => requestDeleteCustomer(c)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. DEDICATED INDIVIDUAL CUSTOMER PROFILE PAGE */}
      {/* ========================================================================= */}
      {selectedCustomer && (
        <div className="space-y-6">
          {/* Back Button & Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={() => setSelectedCustomerId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 bg-white border border-stone-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs hover:bg-stone-50"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Customer List
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                className="button secondary text-xs"
                onClick={() => generateLedgerPDF(selectedCustomer, customerLedgers, true)}
              >
                <Download className="w-3.5 h-3.5" /> Download Statement PDF
              </button>
              <button
                className="button primary text-xs"
                onClick={() => setIsRecordingPayment(selectedCustomer)}
              >
                <CreditCard className="w-3.5 h-3.5 stroke-[2.5]" /> Record Payment / Settlement
              </button>
              <button
                className="p-2 bg-white border border-stone-200 rounded-xl text-stone-700 hover:bg-stone-50 shadow-2xs transition-colors"
                title="Edit Customer Profile"
                onClick={() => setEditingCustomer(selectedCustomer)}
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                className="p-2 bg-white border border-stone-200 rounded-xl text-rose-600 hover:bg-rose-50 shadow-2xs transition-colors"
                title="Delete Customer Profile"
                onClick={() => requestDeleteCustomer(selectedCustomer)}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Profile Header Master Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-5 border-b border-stone-100">
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-2xs flex-shrink-0 ${
                    getCustomerCategoryInfo(selectedCustomer).parentType === 'Wholesaler'
                      ? 'bg-blue-100 text-blue-800'
                      : getCustomerCategoryInfo(selectedCustomer).parentType === 'Walk-in'
                      ? 'bg-stone-100 text-stone-700'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-black text-stone-900">{selectedCustomer.name}</h1>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        getCustomerCategoryInfo(selectedCustomer).parentType === 'Wholesaler'
                          ? 'bg-blue-100 text-blue-800'
                          : getCustomerCategoryInfo(selectedCustomer).parentType === 'Walk-in'
                          ? 'bg-stone-100 text-stone-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {getCustomerCategoryInfo(selectedCustomer).name}
                    </span>
                    {selectedCustomer.customerId && (
                      <span className="text-xs bg-stone-100 text-stone-700 font-mono px-2 py-0.5 rounded-md font-semibold">
                        ID: {selectedCustomer.customerId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    {selectedCustomer.businessName || 'Direct Commercial Client'}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 mt-2">
                    <span className="flex items-center gap-1 font-mono font-semibold">
                      <Phone className="w-3.5 h-3.5 text-stone-400" /> {selectedCustomer.phone || 'No phone'}
                    </span>
                    {selectedCustomer.altPhone && (
                      <span className="flex items-center gap-1 font-mono text-stone-500">
                        WA: {selectedCustomer.altPhone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" />
                      {selectedCustomer.city && <strong className="text-stone-900">{selectedCustomer.city}, </strong>}
                      {selectedCustomer.address || 'Address not specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Opening & Credit Limits */}
              <div className="flex items-center gap-3">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-right min-w-[120px]">
                  <span className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Opening Bal</span>
                  <strong className="text-sm font-black text-stone-800">{formatPKR(selectedCustomer.openingBalance)}</strong>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-right min-w-[120px]">
                  <span className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Credit Limit</span>
                  <strong className="text-sm font-black text-stone-800">
                    {selectedCustomer.creditLimit > 0 ? formatPKR(selectedCustomer.creditLimit) : 'No Limit'}
                  </strong>
                </div>
              </div>
            </div>

            {/* 4 Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-5">
              <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200">
                <span className="text-[11px] text-stone-500 block font-semibold">Total Invoiced (Lifetime)</span>
                <strong className="text-lg font-black text-stone-900 block mt-0.5">
                  {formatPKR(profileFinancials.totalInvoiced)}
                </strong>
                <span className="text-[10px] text-stone-400">{customerInvoices.length} POS sales recorded</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                <span className="text-[11px] text-emerald-800 block font-semibold">Total Paid</span>
                <strong className="text-lg font-black text-emerald-800 block mt-0.5">
                  {formatPKR(profileFinancials.totalPaid)}
                </strong>
                <span className="text-[10px] text-emerald-700">Invoices & direct settlements</span>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  profileFinancials.currentOutstanding > 0
                    ? 'bg-rose-50/70 border-rose-200/80'
                    : 'bg-emerald-50/70 border-emerald-200/80'
                }`}
              >
                <span
                  className={`text-[11px] block font-semibold ${
                    profileFinancials.currentOutstanding > 0 ? 'text-rose-800' : 'text-emerald-800'
                  }`}
                >
                  Current Outstanding Balance
                </span>
                <strong
                  className={`text-lg font-black block mt-0.5 ${
                    profileFinancials.currentOutstanding > 0 ? 'text-rose-800' : 'text-emerald-800'
                  }`}
                >
                  {formatPKR(profileFinancials.currentOutstanding)}
                </strong>
                <span
                  className={`text-[10px] ${
                    profileFinancials.currentOutstanding > 0 ? 'text-rose-700 font-semibold' : 'text-emerald-700'
                  }`}
                >
                  {profileFinancials.currentOutstanding > 0 ? 'Pending receivable' : 'Account all clear'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200">
                <span className="text-[11px] text-stone-500 block font-semibold">Last Transaction Date</span>
                <strong className="text-sm font-bold text-stone-900 block mt-1">
                  {profileFinancials.lastTransactionDate}
                </strong>
                <span className="text-[10px] text-stone-400">Most recent activity</span>
              </div>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="bg-white rounded-xl border border-stone-200 p-1.5 shadow-2xs flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ledger'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Ledger / Transaction History ({customerLedgers.length})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'invoices'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" /> Invoices ({customerInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'products'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Package className="w-3.5 h-3.5" /> Products Purchased ({productsPurchasedSummary.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'payments'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> Payments & Receipts ({selectedCustomer.paymentRecords?.length || 0})
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: LEDGER / TRANSACTION HISTORY */}
          {/* ========================================================================= */}
          {activeTab === 'ledger' && (
            <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
              <div className="p-4 bg-stone-50/60 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Statement of Account & Running Balance</h3>
                  <p className="text-xs text-stone-500">
                    Chronological audit ledger of all debits (sales invoices) and credits (payments received)
                  </p>
                </div>
                <button
                  className="button secondary text-xs"
                  onClick={() => generateLedgerPDF(selectedCustomer, customerLedgers, true)}
                >
                  <Download className="w-3.5 h-3.5" /> Export Statement PDF
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[11px]">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Ref Type</th>
                      <th className="py-3 px-4">Voucher / Invoice #</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Debit (Billed)</th>
                      <th className="py-3 px-4">Credit (Paid)</th>
                      <th className="py-3 px-4 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {customerLedgers.map((entry, idx) => (
                      <tr key={entry.id || idx} className="hover:bg-stone-50/50">
                        <td className="py-3 px-4 text-stone-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-stone-800">{formatDate(entry.date)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              entry.referenceType === 'Invoice'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : entry.referenceType === 'Payment'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {entry.referenceType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-stone-900">
                          {entry.referenceId ? `#${entry.referenceId}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-stone-700 font-medium">{entry.description}</td>
                        <td className="py-3 px-4 font-bold text-stone-900">
                          {entry.debit > 0 ? formatPKR(entry.debit) : '—'}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          {entry.credit > 0 ? formatPKR(entry.credit) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-stone-900">
                          {formatPKR(entry.balance)}
                        </td>
                      </tr>
                    ))}

                    {customerLedgers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-stone-400">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No ledger history recorded for this customer yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: INVOICES LIST (From POS) */}
          {/* ========================================================================= */}
          {activeTab === 'invoices' && (
            <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
              <div className="p-4 bg-stone-50/60 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Commercial Invoices from POS</h3>
                  <p className="text-xs text-stone-500">Every sales invoice generated against {selectedCustomer.name}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[11px]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Items Summary</th>
                      <th className="py-3 px-4">Grand Total</th>
                      <th className="py-3 px-4">Amount Paid</th>
                      <th className="py-3 px-4">Balance Due</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Attachment</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {customerInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4 text-stone-800 font-medium">{formatDate(inv.date)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-stone-900">
                          <button
                            onClick={() => setViewingInvoice(inv)}
                            className="text-emerald-800 hover:underline font-bold"
                          >
                            #{inv.invoiceNumber}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs text-stone-700 max-w-[220px] truncate" title={inv.items?.map((i) => `${i.quantity}x ${i.name}`).join(', ')}>
                            {inv.items?.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                          </div>
                          <span className="text-[10px] text-stone-400">{inv.items?.length || 0} line items</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-stone-900">{formatPKR(inv.grandTotal)}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-700">{formatPKR(inv.amountPaid)}</td>
                        <td className="py-3 px-4 font-bold text-rose-700">{formatPKR(inv.balanceDue)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              inv.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'Partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {inv.invoiceImage || inv.paymentScreenshot ? (
                            <button
                              onClick={() =>
                                setPreviewImage({
                                  src: (inv.invoiceImage || inv.paymentScreenshot)!,
                                  title: `Invoice #${inv.invoiceNumber} Attachment`,
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                            >
                              <ImageIcon className="w-3.5 h-3.5" /> View Photo
                            </button>
                          ) : (
                            <span className="text-stone-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              className="px-2 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1"
                              title="View Invoice"
                              onClick={() => setViewingInvoice(inv)}
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            <button
                              className="p-1 text-stone-600 hover:text-stone-900"
                              title="Download PDF"
                              onClick={() => generateInvoicePDF(inv, selectedCustomer)}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {customerInvoices.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-stone-400">
                          <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No sales invoices created against this customer profile yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PRODUCTS PURCHASED (Reorder summary & pattern) */}
          {/* ========================================================================= */}
          {activeTab === 'products' && (
            <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
              <div className="p-4 bg-stone-50/60 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Product Buying & Reorder Summary</h3>
                  <p className="text-xs text-stone-500">
                    Aggregated view of products and quantities this customer purchases most
                  </p>
                </div>
                <button
                  className="button secondary text-xs"
                  onClick={() => {
                    const headers = ['Product Name', 'Total Qty Bought', 'Unit', 'Total Spend (Rs)', 'Last Unit Price', 'Last Purchased Date', 'Total Orders']
                    const rows = productsPurchasedSummary.map((p) => [
                      p.name,
                      p.totalQuantity,
                      p.unit,
                      p.totalSpent,
                      p.lastUnitPrice,
                      p.lastDate,
                      p.orderCount,
                    ])
                    exportToCSV(`Purchased_Products_${selectedCustomer.name}_${new Date().toISOString().slice(0, 10)}`, headers, rows)
                  }}
                >
                  <Download className="w-3.5 h-3.5" /> Export Products CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[11px]">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Total Quantity Bought</th>
                      <th className="py-3 px-4">Total Amount Spent</th>
                      <th className="py-3 px-4">Last Unit Price</th>
                      <th className="py-3 px-4">Last Purchased Date</th>
                      <th className="py-3 px-4 text-right">Orders Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {productsPurchasedSummary.map((prod, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50">
                        <td className="py-3 px-4 text-stone-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-stone-900">{prod.name}</td>
                        <td className="py-3 px-4 font-black text-emerald-800 text-sm">
                          {prod.totalQuantity} {prod.unit}
                        </td>
                        <td className="py-3 px-4 font-bold text-stone-900">{formatPKR(prod.totalSpent)}</td>
                        <td className="py-3 px-4 font-medium text-stone-700">{formatPKR(prod.lastUnitPrice)}</td>
                        <td className="py-3 px-4 text-stone-600">{formatDate(prod.lastDate)}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-stone-700">
                          {prod.orderCount} times
                        </td>
                      </tr>
                    ))}

                    {productsPurchasedSummary.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-stone-400">
                          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No product purchase records found for this customer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: PAYMENTS & MANUAL SETTLEMENTS */}
          {/* ========================================================================= */}
          {activeTab === 'payments' && (
            <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
              <div className="p-4 bg-stone-50/60 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Direct Payment Receipts & Dues Clearance</h3>
                  <p className="text-xs text-stone-500">Record cash / online payments received against outstanding dues</p>
                </div>
                <button
                  className="button primary text-xs"
                  onClick={() => setIsRecordingPayment(selectedCustomer)}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" /> Record New Payment
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[11px]">
                      <th className="py-3 px-4">Receipt #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Amount Received</th>
                      <th className="py-3 px-4">Account Credited</th>
                      <th className="py-3 px-4">Transaction Ref</th>
                      <th className="py-3 px-4">Slip / Proof</th>
                      <th className="py-3 px-4">Notes</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {(selectedCustomer.paymentRecords || []).map((pay) => (
                      <tr key={pay.id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-stone-900">#{pay.receiptNumber}</td>
                        <td className="py-3 px-4 text-stone-800 font-medium">{formatDate(pay.date)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              pay.paymentMethod === 'Cash'
                                ? 'bg-emerald-100 text-emerald-800'
                                : pay.paymentMethod === 'Online'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {pay.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-emerald-700 text-sm">{formatPKR(pay.amount)}</td>
                        <td className="py-3 px-4 font-mono text-stone-600 text-[11px]">{pay.paymentAccount}</td>
                        <td className="py-3 px-4 font-mono text-stone-800">{pay.transactionRef || '—'}</td>
                        <td className="py-3 px-4">
                          {pay.receiptImage ? (
                            <button
                              onClick={() =>
                                setPreviewImage({
                                  src: pay.receiptImage!,
                                  title: `Payment Receipt #${pay.receiptNumber} Slip`,
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                            >
                              <ImageIcon className="w-3.5 h-3.5" /> View Slip
                            </button>
                          ) : (
                            <span className="text-stone-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-stone-600 max-w-[160px] truncate">{pay.notes || '—'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            className="p-1 text-stone-600 hover:text-stone-900"
                            title="Download Payment Voucher PDF"
                            onClick={() => generateCustomerPaymentReceiptPDF(selectedCustomer, pay)}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {(!selectedCustomer.paymentRecords || selectedCustomer.paymentRecords.length === 0) && (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-stone-400">
                          <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No direct payment entries recorded yet. Click "Record New Payment" to log cash received against dues.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT CUSTOMER PROFILE */}
      {/* ========================================================================= */}
      {(isCreatingCustomer || editingCustomer) && (
        <CustomerFormModal
          customer={editingCustomer}
          categories={customerCategories}
          onClose={() => {
            setIsCreatingCustomer(false)
            setEditingCustomer(null)
          }}
          onSave={(formData) => {
            if (editingCustomer) {
              const updated = db.customers.map((c) =>
                c.id === editingCustomer.id
                  ? {
                      ...c,
                      ...formData,
                      updatedAt: new Date().toISOString().slice(0, 10),
                    }
                  : c
              )
              onSaveDatabase({ ...db, customers: updated })
            } else {
              const newCustomer: CustomerItem = {
                id: `cust-${Date.now()}`,
                customerId: formData.customerId || `CUST-${String(db.customers.length + 1001)}`,
                name: formData.name,
                businessName: formData.businessName,
                type: formData.type,
                phone: formData.phone,
                altPhone: formData.altPhone,
                address: formData.address,
                city: formData.city,
                openingBalance: formData.openingBalance || 0,
                currentBalance: formData.openingBalance || 0,
                creditLimit: formData.creditLimit || 0,
                status: 'Active',
                notes: formData.notes,
                paymentRecords: [],
                createdAt: new Date().toISOString().slice(0, 10),
                updatedAt: new Date().toISOString().slice(0, 10),
              }
              onSaveDatabase({ ...db, customers: [newCustomer, ...db.customers] })
            }
            setIsCreatingCustomer(false)
            setEditingCustomer(null)
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CATEGORY MANAGEMENT (CRUD) */}
      {/* ========================================================================= */}
      {isManagingCategories && (
        <CategoryManagementModal
          categories={customerCategories}
          customers={db.customers}
          onClose={() => setIsManagingCategories(false)}
          onSaveCategories={(updatedCategories) => {
            onSaveDatabase({
              ...db,
              customerCategories: updatedCategories,
            })
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RECORD PAYMENT */}
      {/* ========================================================================= */}
      {isRecordingPayment && (
        <RecordPaymentModal
          customer={isRecordingPayment}
          accounts={db.accounts}
          onClose={() => setIsRecordingPayment(null)}
          onSave={handleSavePayment}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: INVOICE RECEIPT VIEWER */}
      {/* ========================================================================= */}
      {viewingInvoice && (
        <InvoiceReceiptModal
          invoice={viewingInvoice}
          customer={db.customers.find((c) => c.id === viewingInvoice.customerId)}
          onClose={() => setViewingInvoice(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DELETE SAFETY WARNING WITH TRANSACTION HISTORY CHECK */}
      {/* ========================================================================= */}
      {deleteWarningCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-stone-900">Delete Customer Profile?</h3>
              <p className="text-xs text-stone-600 mt-1">
                You are about to delete <strong>{deleteWarningCustomer.customer.name}</strong>.
              </p>
            </div>

            {deleteWarningCustomer.invoiceCount > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-4 h-4" /> Transaction History Detected
                </div>
                <p>
                  This customer has <strong>{deleteWarningCustomer.invoiceCount} commercial invoices</strong> and{' '}
                  <strong>{deleteWarningCustomer.ledgerCount} ledger entries</strong>. Deleting will unbind this customer profile.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="button secondary flex-1"
                onClick={() => setDeleteWarningCustomer(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button bg-rose-600 hover:bg-rose-700 text-white font-bold flex-1"
                onClick={confirmDeleteCustomer}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: IMAGE LIGHTBOX PREVIEW */}
      {/* ========================================================================= */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl p-4 max-w-2xl w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-stone-900 text-sm">{previewImage.title}</h3>
              <button onClick={() => setPreviewImage(null)} className="p-1 rounded-lg hover:bg-stone-100 text-stone-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 flex justify-center bg-stone-100 rounded-xl p-2 max-h-[75vh] overflow-auto">
              <img src={previewImage.src} alt={previewImage.title} className="max-h-[70vh] rounded object-contain" />
            </div>
            <div className="mt-4 flex justify-end">
              <button className="button primary text-xs" onClick={() => setPreviewImage(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// MODAL: ADD / EDIT CUSTOMER (Clean & Non-Cramped)
// -----------------------------------------------------------------------------
function CustomerFormModal({
  customer,
  categories,
  onClose,
  onSave,
}: {
  customer: CustomerItem | null
  categories: CustomerCategoryItem[]
  onClose: () => void
  onSave: (data: {
    customerId?: string
    name: string
    businessName: string
    type: CustomerType
    phone: string
    altPhone?: string
    address: string
    city: string
    openingBalance: number
    creditLimit: number
    notes?: string
  }) => void
}) {
  const [name, setName] = useState(customer?.name || '')
  const [businessName, setBusinessName] = useState(customer?.businessName || '')
  const [type, setType] = useState<CustomerType>(customer?.type || 'Retailer')
  const [customerId, setCustomerId] = useState(customer?.customerId || '')
  const [phone, setPhone] = useState(customer?.phone || '')
  const [altPhone, setAltPhone] = useState(customer?.altPhone || '')
  const [address, setAddress] = useState(customer?.address || '')
  const [city, setCity] = useState(customer?.city || 'Lahore')
  const [openingBalance, setOpeningBalance] = useState(customer?.openingBalance || 0)
  const [creditLimit, setCreditLimit] = useState(customer?.creditLimit || 0)
  const [notes, setNotes] = useState(customer?.notes || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return

    onSave({
      customerId: customerId.trim() || undefined,
      name: name.trim(),
      businessName: businessName.trim(),
      type,
      phone: phone.trim(),
      altPhone: altPhone.trim() || undefined,
      address: address.trim(),
      city: city.trim(),
      openingBalance: Number(openingBalance) || 0,
      creditLimit: Number(creditLimit) || 0,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Customer Directory</span>
            <h2 className="text-lg font-black text-stone-900">
              {customer ? `Edit ${customer.name}` : 'Add New Customer Profile'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Section 1: Basic Info */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-700" /> 1. Basic Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Haji Noor Muhammad"
                  required
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">Business / Shop Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Noor Beverages & Distribution"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">Customer Type / Category *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                >
                  <optgroup label="Wholesaler (Bulk)">
                    {categories
                      .filter((c) => c.parentType === 'Wholesaler')
                      .map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} (Wholesaler)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Retailer (Shops & Marts)">
                    {categories
                      .filter((c) => c.parentType === 'Retailer')
                      .map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Walk-in & Counter">
                    {categories
                      .filter((c) => c.parentType === 'Walk-in')
                      .map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">Customer ID (Auto/Manual)</label>
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="Leave blank for auto CUST-xxxx"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">Primary Phone *</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0344 XXXXXXX"
                  required
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">WhatsApp / Alt Phone</label>
                <input
                  type="text"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  placeholder="0300 XXXXXXX (Optional)"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Location */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" /> 2. Location & Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">City *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Peshawar / Lahore"
                  required
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-stone-700 mb-1 block">Address / Market Location *</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Shop #, Street, Market Name"
                  required
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financials */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-700" /> 3. Financials & Credit Terms
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {!customer && (
                <div>
                  <label className="text-xs font-semibold text-stone-700 mb-1 block">Opening Balance (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-bold"
                  />
                  <span className="text-[10px] text-stone-400 mt-1 block">Initial balance carried forward</span>
                </div>
              )}
              <div className={customer ? 'sm:col-span-2' : ''}>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">Credit Limit (Rs - Optional)</label>
                <input
                  type="number"
                  min="0"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(Number(e.target.value))}
                  placeholder="e.g. 500000 (0 for no limit)"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-bold"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">Alert when balance exceeds this amount</span>
              </div>
            </div>
          </div>

          {/* Section 4: Notes */}
          <div>
            <label className="text-xs font-semibold text-stone-700 mb-1 block">Special Notes / Route Info</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery route, preferred payment days, or van driver instructions"
              rows={2}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Fixed Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
          <button type="button" onClick={onClose} className="button secondary text-xs">
            Cancel
          </button>
          <button type="submit" className="button primary text-xs">
            {customer ? 'Save Changes' : 'Create Customer Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}

// -----------------------------------------------------------------------------
// MODAL: CATEGORY MANAGEMENT (CRUD with Safety Warning on Delete)
// -----------------------------------------------------------------------------
function CategoryManagementModal({
  categories,
  customers,
  onClose,
  onSaveCategories,
}: {
  categories: CustomerCategoryItem[]
  customers: CustomerItem[]
  onClose: () => void
  onSaveCategories: (cats: CustomerCategoryItem[]) => void
}) {
  const [list, setList] = useState<CustomerCategoryItem[]>(categories)
  const [newCatName, setNewCatName] = useState('')
  const [newCatParent, setNewCatParent] = useState<'Wholesaler' | 'Retailer' | 'Walk-in'>('Wholesaler')
  const [newCatDescription, setNewCatDescription] = useState('')
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null)

  const getCountForCategory = (catName: string) => {
    return customers.filter((c) => (c.type || '').toLowerCase() === catName.toLowerCase()).length
  }

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return

    const newCategory: CustomerCategoryItem = {
      id: `ccat-${Date.now()}`,
      name: newCatName.trim(),
      parentType: newCatParent,
      description: newCatDescription.trim() || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    }

    const updated = [...list, newCategory]
    setList(updated)
    onSaveCategories(updated)

    setNewCatName('')
    setNewCatDescription('')
  }

  const handleStartEdit = (cat: CustomerCategoryItem) => {
    setEditingCatId(cat.id)
    setEditName(cat.name)
    setEditDesc(cat.description || '')
  }

  const handleSaveEdit = (catId: string) => {
    if (!editName.trim()) return
    const updated = list.map((c) => (c.id === catId ? { ...c, name: editName.trim(), description: editDesc.trim() || undefined } : c))
    setList(updated)
    onSaveCategories(updated)
    setEditingCatId(null)
  }

  const handleDeleteCategory = (cat: CustomerCategoryItem) => {
    const assignedCount = getCountForCategory(cat.name)
    if (assignedCount > 0) {
      setDeleteWarning(
        `Cannot delete category "${cat.name}". There are currently ${assignedCount} customer profiles assigned to it. Please reassign those customers to another category first.`
      )
      return
    }

    const updated = list.filter((c) => c.id !== cat.id)
    setList(updated)
    onSaveCategories(updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Account Classification</span>
            <h2 className="text-lg font-black text-stone-900">Manage Customer Categories</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {deleteWarning && (
          <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold">Deletion Blocked</strong>
              <span>{deleteWarning}</span>
            </div>
            <button onClick={() => setDeleteWarning(null)} className="text-rose-600 hover:text-rose-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Existing Categories List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {list.map((cat) => {
            const count = getCountForCategory(cat.name)
            const isEditing = editingCatId === cat.id

            return (
              <div
                key={cat.id}
                className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-3 text-xs"
              >
                {isEditing ? (
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2.5 py-1 border border-stone-300 rounded-lg text-xs bg-white font-bold flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(cat.id)}
                        className="button primary text-xs py-1 px-3"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCatId(null)}
                        className="button secondary text-xs py-1 px-2"
                      >
                        Cancel
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Category description"
                      className="w-full px-2.5 py-1 border border-stone-300 rounded-lg text-[11px] bg-white"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-stone-900 font-bold">{cat.name}</strong>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-200/70 text-stone-700">
                          {cat.parentType}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {count} {count === 1 ? 'customer' : 'customers'}
                        </span>
                      </div>
                      {cat.description && <p className="text-[11px] text-stone-500 mt-0.5">{cat.description}</p>}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className="p-1 text-stone-600 hover:text-stone-900 rounded"
                        title="Edit category"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1 text-rose-600 hover:text-rose-800 rounded"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Add New Category Form */}
        <form onSubmit={handleAddCategory} className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
          <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-emerald-700" /> Add New Sub-Category
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Category Name *</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Van Sales / Modern Trade"
                required
                className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Main Type Hierarchy *</label>
              <select
                value={newCatParent}
                onChange={(e) => setNewCatParent(e.target.value as any)}
                className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
              >
                <option value="Wholesaler">Wholesaler (Distributor / Reps / Van Sales)</option>
                <option value="Retailer">Retailer (Shop / Mart / Bakery)</option>
                <option value="Walk-in">Walk-in Customer (Counter / Occasional)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Description (Optional)</label>
              <input
                type="text"
                value={newCatDescription}
                onChange={(e) => setNewCatDescription(e.target.value)}
                placeholder="Brief description of this customer category"
                className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="button primary text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Category
            </button>
          </div>
        </form>

        <div className="flex justify-end pt-2 border-t border-stone-200">
          <button type="button" onClick={onClose} className="button secondary text-xs">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// MODAL: RECORD PAYMENT AGAINST CUSTOMER DUES
// -----------------------------------------------------------------------------
function RecordPaymentModal({
  customer,
  accounts,
  onClose,
  onSave,
}: {
  customer: CustomerItem
  accounts: AppDatabase['accounts']
  onClose: () => void
  onSave: (data: {
    amount: number
    date: string
    paymentMethod: 'Cash' | 'Card' | 'Online' | 'Bank Transfer' | 'Cheque'
    paymentAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank'
    transactionRef: string
    receiptImage?: string
    notes: string
  }) => void
}) {
  const [amount, setAmount] = useState(customer.currentBalance > 0 ? customer.currentBalance : 10000)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Online' | 'Bank Transfer' | 'Cheque'>('Cash')
  const [paymentAccount, setPaymentAccount] = useState<'cash-in-hand' | 'meezan-bank' | 'hbl-bank'>('cash-in-hand')
  const [transactionRef, setTransactionRef] = useState('')
  const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined)
  const [notes, setNotes] = useState('')

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setReceiptImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (amount <= 0) return

    onSave({
      amount: Number(amount),
      date,
      paymentMethod,
      paymentAccount,
      transactionRef: transactionRef.trim(),
      receiptImage,
      notes: notes.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Payment Collection</span>
            <h2 className="text-lg font-black text-stone-900">Record Payment from {customer.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-stone-500 block font-semibold">Current Balance Due:</span>
            <strong className="text-base text-rose-700 font-black">{formatPKR(customer.currentBalance)}</strong>
          </div>
          <div>
            <span className="text-stone-500 block font-semibold">Contact Phone:</span>
            <strong className="text-xs text-stone-900 font-mono">{customer.phone}</strong>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Amount Received (Rs) *</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Payment Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
              >
                <option value="Cash">Cash in Hand</option>
                <option value="Online">Online / Raast App</option>
                <option value="Bank Transfer">Bank Transfer / IBFT</option>
                <option value="Card">Card POS</option>
                <option value="Cheque">Cross Cheque</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Deposit Account *</label>
              <select
                value={paymentAccount}
                onChange={(e) => setPaymentAccount(e.target.value as any)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatPKR(acc.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 mb-1 block">
              Transaction Reference / Cheque # (Optional)
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. Raast Ref / IBFT # / Cheque # 8829"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 mb-1 block">Attach Payment Receipt / Slip</label>
            <div className="flex items-center gap-3">
              <label className="button secondary cursor-pointer text-xs py-1.5 px-3">
                <Upload className="w-3.5 h-3.5" /> Choose Image
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              {receiptImage && (
                <div className="flex items-center gap-2">
                  <img src={receiptImage} alt="Receipt" className="w-8 h-8 object-cover rounded-lg border border-stone-200" />
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Slip Attached
                  </span>
                  <button type="button" onClick={() => setReceiptImage(undefined)} className="text-rose-600 text-xs hover:underline">
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 mb-1 block">Remarks / Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Full settlement against previous month ledger"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
          <button type="button" onClick={onClose} className="button secondary text-xs">
            Cancel
          </button>
          <button type="submit" className="button primary text-xs">
            Save Payment Receipt
          </button>
        </div>
      </form>
    </div>
  )
}

// -----------------------------------------------------------------------------
// MODAL: INVOICE RECEIPT VIEWER
// -----------------------------------------------------------------------------
function InvoiceReceiptModal({
  invoice,
  customer,
  onClose,
}: {
  invoice: InvoiceItem
  customer?: CustomerItem
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Commercial Invoice</span>
            <h2 className="text-lg font-black text-stone-900">Invoice #{invoice.invoiceNumber}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-stone-500 block font-semibold">Customer</span>
            <strong className="text-stone-900 block font-bold mt-0.5">{invoice.customerName}</strong>
          </div>
          <div>
            <span className="text-stone-500 block font-semibold">Date</span>
            <strong className="text-stone-900 block font-bold mt-0.5">{formatDate(invoice.date)}</strong>
          </div>
          <div>
            <span className="text-stone-500 block font-semibold">Payment Method</span>
            <strong className="text-stone-900 block font-bold mt-0.5">{invoice.paymentMethod}</strong>
          </div>
          <div>
            <span className="text-stone-500 block font-semibold">Status</span>
            <span
              className={`inline-block font-bold text-xs px-2 py-0.5 rounded mt-0.5 ${
                invoice.status === 'Paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : invoice.status === 'Partial'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {invoice.status}
            </span>
          </div>
        </div>

        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[11px]">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Qty</th>
                <th className="py-2.5 px-3">Rate</th>
                <th className="py-2.5 px-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {(invoice.items || []).map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-3 text-stone-400 font-mono">{idx + 1}</td>
                  <td className="py-2 px-3 font-bold text-stone-900">{item.name}</td>
                  <td className="py-2 px-3">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-2 px-3">{formatPKR(item.unitPrice)}</td>
                  <td className="py-2 px-3 text-right font-bold text-stone-900">{formatPKR(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end text-xs border-t border-stone-200 pt-3">
          <div className="text-right space-y-1 min-w-[200px]">
            <div className="flex justify-between">
              <span className="text-stone-500">Grand Total:</span>
              <strong className="font-bold text-stone-900">{formatPKR(invoice.grandTotal)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Amount Paid:</span>
              <strong className="font-bold text-emerald-700">{formatPKR(invoice.amountPaid)}</strong>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-stone-100">
              <span className="font-bold text-stone-700">Balance Due:</span>
              <strong className="font-black text-rose-700">{formatPKR(invoice.balanceDue)}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-stone-200">
          <button
            type="button"
            className="button secondary text-xs"
            onClick={() => generateInvoicePDF(invoice, customer)}
          >
            <Download className="w-3.5 h-3.5" /> Download Tax Invoice PDF
          </button>
          <button type="button" className="button primary text-xs" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
