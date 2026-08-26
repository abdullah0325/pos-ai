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
  CheckCircle,
  AlertCircle,
  Upload,
  ChevronRight,
  Sparkles,
  ShoppingBag,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  type AppDatabase,
  type CustomerItem,
  type CustomerType,
  type CustomerPaymentRecord,
  type InvoiceItem,
  type LedgerEntry,
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
  // Navigation / Active View
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'products' | 'invoices' | 'ledger' | 'payments'>('products')

  // Search and Filter in List View
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Retailer' | 'Distributor' | 'Sales Man'>('all')
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'outstanding' | 'settled' | 'overlimit'>('all')

  // Modals
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null)
  const [isRecordingPayment, setIsRecordingPayment] = useState<CustomerItem | null>(null)
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceItem | null>(null)
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null)
  const [quickNewSaleCustomer, setQuickNewSaleCustomer] = useState<CustomerItem | null>(null)

  // Current Selected Customer Profile
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null
    return db.customers.find((c) => c.id === selectedCustomerId) || null
  }, [db.customers, selectedCustomerId])

  // Normalizes Customer Type for Filtering and Display
  const normalizeType = (type: CustomerType): 'Retailer' | 'Distributor' | 'Sales Man' => {
    if (type === 'Retailer') return 'Retailer'
    if (type === 'Distributor') return 'Distributor'
    if (type === 'Sales Man' || type === 'Sales Representative') return 'Sales Man'
    if (type === 'Wholesaler') return 'Retailer'
    return 'Retailer'
  }

  // Filtered Customers List
  const filteredCustomers = useMemo(() => {
    return db.customers.filter((c) => {
      const normType = normalizeType(c.type)

      // Type Filter
      if (typeFilter !== 'all' && normType !== typeFilter) return false

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
  }, [db.customers, searchQuery, typeFilter, balanceFilter])

  // Summary Metrics for Customer Directory
  const metrics = useMemo(() => {
    const totalCount = db.customers.length
    const totalReceivables = db.customers.reduce((acc, c) => acc + (c.currentBalance > 0 ? c.currentBalance : 0), 0)
    const retailers = db.customers.filter((c) => normalizeType(c.type) === 'Retailer').length
    const distributors = db.customers.filter((c) => normalizeType(c.type) === 'Distributor').length
    const salesMen = db.customers.filter((c) => normalizeType(c.type) === 'Sales Man').length

    return { totalCount, totalReceivables, retailers, distributors, salesMen }
  }, [db.customers])

  // Products Given/Sold to Selected Customer (Aggregated from all linked invoices)
  const customerProducts = useMemo(() => {
    if (!selectedCustomer) return []
    const invoices = db.invoices.filter((inv) => inv.customerId === selectedCustomer.id || inv.partyId === selectedCustomer.id)

    const list: Array<{
      productId: string
      name: string
      quantity: number
      unit: string
      unitPrice: number
      total: number
      invoiceNumber: string
      date: string
      time?: string
      pricingTier?: string
    }> = []

    invoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        list.push({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit || 'Cartons',
          unitPrice: item.unitPrice,
          total: item.total || item.quantity * item.unitPrice,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          time: inv.time || '10:00 AM',
          pricingTier: item.pricingTier || (inv.saleType === 'Distributor' ? 'Wholesale' : 'Retail'),
        })
      })
    })

    // Sort newest date first
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [selectedCustomer, db.invoices])

  // Invoices & Receipts Linked to Selected Customer
  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return []
    return db.invoices
      .filter((inv) => inv.customerId === selectedCustomer.id || inv.partyId === selectedCustomer.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [selectedCustomer, db.invoices])

  // Customer Financials Calculations (Auto-calculated)
  const customerFinancials = useMemo(() => {
    if (!selectedCustomer) return { totalOwed: 0, totalPaid: 0, pendingBalance: 0 }

    const invoiceGrandTotals = customerInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0)
    const invoicePaidTotals = customerInvoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0)

    // Payments recorded directly in customer profile
    const extraPayments = (selectedCustomer.paymentRecords || []).reduce((sum, p) => sum + (p.amount || 0), 0)

    const totalOwed = (selectedCustomer.openingBalance || 0) + invoiceGrandTotals
    const totalPaid = invoicePaidTotals + extraPayments
    const pendingBalance = Math.max(0, selectedCustomer.currentBalance)

    return { totalOwed, totalPaid, pendingBalance }
  }, [selectedCustomer, customerInvoices])

  // Chronological Running Ledger for Selected Customer
  const customerLedgers = useMemo(() => {
    if (!selectedCustomer) return []
    const rawEntries = db.ledgers.filter((l) => l.partyId === selectedCustomer.id)

    // If db.ledgers has entries, sort them chronologically
    if (rawEntries.length > 0) {
      return [...rawEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    // Auto-generate ledger if empty
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

    // Add Invoices
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

    // Add standalone payments
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

  // Export Customer List CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Customer Name', 'Business / Agency', 'Type', 'Phone', 'Address', 'Opening Balance', 'Current Balance', 'Credit Limit', 'Status']
    const rows = filteredCustomers.map((c) => [
      c.customerId || c.id,
      c.name,
      c.businessName || '—',
      normalizeType(c.type),
      c.phone,
      c.address,
      c.openingBalance,
      c.currentBalance,
      c.creditLimit,
      c.status,
    ])
    exportToCSV(`Customers_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  // Delete Customer
  const handleDeleteCustomer = (customerId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete customer profile "${name}"? All associated local records will be deleted.`)) return

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
  }

  // Record Customer Payment Handler
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
      description: `Payment received (${paymentData.paymentMethod}) ${paymentData.transactionRef ? 'Ref: ' + paymentData.transactionRef : ''}`,
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

    // Update Account Balance (Cash / Bank)
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

  // Quick New Sale Creation from Customer Profile
  const handleQuickSaleSubmit = (items: Array<{ productId: string; name: string; qty: number; unitPrice: number; unit: string }>, amountPaid: number, paymentMethod: any, paymentAccount: any) => {
    if (!quickNewSaleCustomer) return
    const cust = quickNewSaleCustomer

    const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0)
    const grandTotal = subtotal
    const balanceDue = Math.max(0, grandTotal - amountPaid)

    const invoiceNumber = `INV-2026-${String(db.invoices.length + 1049)}`
    const today = new Date().toISOString().slice(0, 10)

    const newInvoice: InvoiceItem = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      date: today,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      customerId: cust.id,
      customerName: cust.name,
      customerType: cust.type,
      phone: cust.phone,
      address: cust.address,
      saleType: cust.type === 'Distributor' ? 'Distributor' : cust.type === 'Sales Man' ? 'Retail' : 'Retail',
      items: items.map((i) => ({
        productId: i.productId,
        name: i.name,
        quantity: i.qty,
        unit: i.unit,
        unitPrice: i.unitPrice,
        costPrice: 0,
        total: i.qty * i.unitPrice,
      })),
      subtotal,
      discount: 0,
      tax: 0,
      grandTotal,
      amountPaid,
      balanceDue,
      paymentMethod,
      paymentAccount,
      status: balanceDue === 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid',
      deliveryStatus: 'Delivered',
      createdAt: new Date().toISOString(),
    }

    // Deduct inventory products
    const updatedProducts = db.products.map((p) => {
      const sold = items.find((i) => i.productId === p.id)
      if (sold) {
        const remaining = Math.max(0, p.quantity - sold.qty)
        return {
          ...p,
          quantity: remaining,
          status: (remaining <= 0 ? 'Out of stock' : remaining <= p.reorderLevel ? 'Low stock' : 'In stock') as any,
          updatedAt: today,
        }
      }
      return p
    })

    // Update customer current balance
    const updatedBalance = cust.currentBalance + balanceDue
    const updatedCustomers = db.customers.map((c) => (c.id === cust.id ? { ...c, currentBalance: updatedBalance, updatedAt: today } : c))

    // Update Accounts
    const updatedAccounts = db.accounts.map((acc) => {
      if (acc.id === paymentAccount && amountPaid > 0) {
        return { ...acc, balance: acc.balance + amountPaid, updatedAt: today }
      }
      return acc
    })

    // Create Ledger entries
    const ledgerEntries: LedgerEntry[] = [
      {
        id: `led-${Date.now()}-1`,
        partyId: cust.id,
        partyType: 'Customer',
        date: today,
        referenceType: 'Invoice',
        referenceId: invoiceNumber,
        description: `Invoice #${invoiceNumber} (${items.length} items)`,
        debit: grandTotal,
        credit: 0,
        balance: cust.currentBalance + grandTotal,
      },
    ]

    if (amountPaid > 0) {
      ledgerEntries.push({
        id: `led-${Date.now()}-2`,
        partyId: cust.id,
        partyType: 'Customer',
        date: today,
        referenceType: 'Payment',
        referenceId: `REC-${invoiceNumber}`,
        description: `Payment received against #${invoiceNumber} (${paymentMethod})`,
        debit: 0,
        credit: amountPaid,
        balance: updatedBalance,
      })
    }

    onSaveDatabase({
      ...db,
      invoices: [newInvoice, ...db.invoices],
      products: updatedProducts,
      customers: updatedCustomers,
      accounts: updatedAccounts,
      ledgers: [...db.ledgers, ...ledgerEntries],
    })

    setQuickNewSaleCustomer(null)
  }

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* VIEW A: LIST VIEW (When no customer is selected) */}
      {/* ========================================================================= */}
      {!selectedCustomer && (
        <>
          {/* Header Card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  <Users className="w-3.5 h-3.5" /> Unified Customer Center
                </span>
              </div>
              <h1 className="text-2xl font-black text-stone-900 mt-1">Customer Management</h1>
              <p className="text-xs text-stone-600 mt-0.5">
                Manage all customer profiles (Retailers, Distributors, Sales Men), track running ledgers, sales, invoices, and payments offline.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="button secondary" onClick={handleExportCSV} title="Export CSV">
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button className="button primary" onClick={() => setIsCreatingCustomer(true)}>
                <Plus className="w-4 h-4 stroke-[3]" /> Add New Customer
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="metric-card">
              <span className="metric-label">Total Accounts</span>
              <strong className="metric-value text-stone-900">{metrics.totalCount}</strong>
              <span className="metric-sub">Active profiles</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Distributors</span>
              <strong className="metric-value text-blue-700">{metrics.distributors}</strong>
              <span className="metric-sub">Regional wholesale hubs</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Retailers & Shops</span>
              <strong className="metric-value text-emerald-700">{metrics.retailers}</strong>
              <span className="metric-sub">Retail store accounts</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Sales Men / Reps</span>
              <strong className="metric-value text-purple-700">{metrics.salesMen}</strong>
              <span className="metric-sub">Route order-bookers</span>
            </div>
            <div className="metric-card col-span-2 md:col-span-1 bg-amber-50/50 border-amber-200">
              <span className="metric-label text-amber-800">Total Outstanding</span>
              <strong className="metric-value text-amber-900">{formatPKR(metrics.totalReceivables)}</strong>
              <span className="metric-sub text-amber-700">Receivable balance</span>
            </div>
          </div>

          {/* Search, Filter & Tabs Bar */}
          <div className="panel p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="search-box max-w-md w-full">
              <Search className="w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search by name, ID, phone, city, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-medium focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-stone-400 hover:text-stone-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter Buttons */}
              <div className="inline-flex rounded-lg border border-stone-200 p-1 bg-stone-50">
                {(['all', 'Retailer', 'Distributor', 'Sales Man'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                      typeFilter === t ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {t === 'all' ? 'All Types' : t}
                  </button>
                ))}
              </div>

              {/* Balance Filter Dropdown */}
              <select
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value as any)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 focus:outline-none"
              >
                <option value="all">All Balances</option>
                <option value="outstanding">Outstanding Receivable (&gt; 0)</option>
                <option value="settled">Settled / Clear (Rs 0)</option>
                <option value="overlimit">Over Credit Limit</option>
              </select>
            </div>
          </div>

          {/* Customers Data Table */}
          <div className="panel table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Customer Name & ID</th>
                    <th>Customer Type</th>
                    <th>Phone / WhatsApp</th>
                    <th>Address & City</th>
                    <th>Opening Bal.</th>
                    <th>Credit Limit</th>
                    <th>Outstanding Receivable</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c) => {
                    const normType = normalizeType(c.type)
                    const isOverLimit = c.creditLimit > 0 && c.currentBalance > c.creditLimit

                    return (
                      <tr key={c.id} className="hover:bg-stone-50/70 transition-colors">
                        <td>
                          <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => setSelectedCustomerId(c.id)}
                          >
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs ${
                                normType === 'Distributor'
                                  ? 'bg-blue-100 text-blue-800'
                                  : normType === 'Sales Man'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {c.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-stone-900 group-hover:text-primary transition-colors flex items-center gap-1.5">
                                <span>{c.name}</span>
                                {c.customerId && (
                                  <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded font-mono font-normal">
                                    {c.customerId}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-500 font-medium">
                                {c.businessName || `${normType} Account`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              normType === 'Distributor'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : normType === 'Sales Man'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {normType === 'Distributor' && <Building2 className="w-3 h-3" />}
                            {normType === 'Sales Man' && <UserCheck className="w-3 h-3" />}
                            {normType === 'Retailer' && <Store className="w-3 h-3" />}
                            {normType}
                          </span>
                        </td>
                        <td>
                          <div className="text-xs font-mono font-semibold text-stone-800 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-stone-400" />
                            {c.phone}
                          </div>
                          {c.altPhone && <div className="text-[10px] text-stone-400 font-mono">{c.altPhone}</div>}
                        </td>
                        <td>
                          <div className="text-xs text-stone-700 max-w-[200px] truncate" title={c.address}>
                            {c.city && <span className="font-bold text-stone-900">{c.city} · </span>}
                            {c.address || '—'}
                          </div>
                        </td>
                        <td className="text-xs text-stone-600 font-medium">{formatPKR(c.openingBalance)}</td>
                        <td className="text-xs text-stone-600 font-medium">
                          {c.creditLimit > 0 ? formatPKR(c.creditLimit) : <span className="text-stone-400">No limit</span>}
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <strong
                              className={`text-xs ${
                                c.currentBalance > 0
                                  ? isOverLimit
                                    ? 'text-rose-700 font-black'
                                    : 'text-amber-700 font-bold'
                                  : 'text-emerald-700 font-semibold'
                              }`}
                            >
                              {formatPKR(c.currentBalance)}
                            </strong>
                            {isOverLimit && (
                              <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5">
                                <AlertCircle className="w-3 h-3" /> Over Limit
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="row-actions justify-end">
                            <button
                              className="row-action text-primary"
                              title="View Full Profile & Ledgers"
                              onClick={() => setSelectedCustomerId(c.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="row-action text-emerald-700"
                              title="Record Payment"
                              onClick={() => setIsRecordingPayment(c)}
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                            <button
                              className="row-action"
                              title="Edit Customer Profile"
                              onClick={() => setEditingCustomer(c)}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              className="row-action danger"
                              title="Delete Customer"
                              onClick={() => handleDeleteCustomer(c.id, c.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-stone-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-stone-600">No customer profiles found.</p>
                        <p className="text-xs text-stone-400 mt-0.5">Try adjusting your filters or click Add New Customer.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: PROFILE DETAIL PAGE (Full Responsive Record View) */}
      {/* ========================================================================= */}
      {selectedCustomer && (
        <div className="space-y-6">
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setSelectedCustomerId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3 py-2 rounded-xl transition-all shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Customers List
            </button>

            <div className="flex items-center gap-2">
              <button
                className="button secondary"
                onClick={() => generateLedgerPDF(selectedCustomer, customerLedgers, true)}
              >
                <Download className="w-4 h-4" /> Account Statement PDF
              </button>
              <button
                className="button secondary"
                onClick={() => setQuickNewSaleCustomer(selectedCustomer)}
              >
                <ShoppingBag className="w-4 h-4" /> New Sale / Invoice
              </button>
              <button
                className="button primary"
                onClick={() => setIsRecordingPayment(selectedCustomer)}
              >
                <CreditCard className="w-4 h-4 stroke-[2.5]" /> Record Payment
              </button>
              <button
                className="icon-button"
                title="Edit Profile"
                onClick={() => setEditingCustomer(selectedCustomer)}
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                className="icon-button danger"
                title="Delete Profile"
                onClick={() => handleDeleteCustomer(selectedCustomer.id, selectedCustomer.name)}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Profile Master Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-stone-100">
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-xs ${
                    normalizeType(selectedCustomer.type) === 'Distributor'
                      ? 'bg-blue-100 text-blue-800'
                      : normalizeType(selectedCustomer.type) === 'Sales Man'
                      ? 'bg-purple-100 text-purple-800'
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
                        normalizeType(selectedCustomer.type) === 'Distributor'
                          ? 'bg-blue-100 text-blue-800'
                          : normalizeType(selectedCustomer.type) === 'Sales Man'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {normalizeType(selectedCustomer.type)}
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
                      <Phone className="w-3.5 h-3.5 text-stone-400" /> {selectedCustomer.phone}
                    </span>
                    {selectedCustomer.altPhone && (
                      <span className="flex items-center gap-1 font-mono text-stone-400">
                        Alt: {selectedCustomer.altPhone}
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

              {/* Financial Status Summary Pills */}
              <div className="flex items-center gap-3">
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-right min-w-[130px]">
                  <span className="text-[11px] font-bold text-stone-500 block uppercase tracking-wider">Opening Bal</span>
                  <strong className="text-sm font-black text-stone-800">{formatPKR(selectedCustomer.openingBalance)}</strong>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-right min-w-[130px]">
                  <span className="text-[11px] font-bold text-stone-500 block uppercase tracking-wider">Credit Limit</span>
                  <strong className="text-sm font-black text-stone-800">
                    {selectedCustomer.creditLimit > 0 ? formatPKR(selectedCustomer.creditLimit) : 'None'}
                  </strong>
                </div>
                <div
                  className={`p-3.5 rounded-xl border text-right min-w-[150px] ${
                    selectedCustomer.currentBalance > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <span className="text-[11px] font-bold block uppercase tracking-wider">
                    {selectedCustomer.currentBalance > 0 ? 'Pending Balance' : 'Account Balance'}
                  </span>
                  <strong className="text-base font-black">{formatPKR(selectedCustomer.currentBalance)}</strong>
                </div>
              </div>
            </div>

            {/* Financial Totals Breakdown Bar */}
            <div className="grid grid-cols-3 gap-4 pt-4 text-center">
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                <span className="text-[11px] text-stone-500 block font-semibold">Total Amount Billed / Owed</span>
                <strong className="text-base font-black text-stone-900">{formatPKR(customerFinancials.totalOwed)}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-[11px] text-emerald-700 block font-semibold">Total Amount Paid</span>
                <strong className="text-base font-black text-emerald-800">{formatPKR(customerFinancials.totalPaid)}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                <span className="text-[11px] text-amber-700 block font-semibold">Remaining Outstanding Balance</span>
                <strong className="text-base font-black text-amber-800">{formatPKR(selectedCustomer.currentBalance)}</strong>
              </div>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="bg-white rounded-xl border border-stone-200 p-1.5 shadow-xs flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'products' ? 'bg-primary text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Package className="w-4 h-4" /> Products Given / Sold ({customerProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'invoices' ? 'bg-primary text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Receipt className="w-4 h-4" /> Invoices & Receipts ({customerInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ledger' ? 'bg-primary text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <FileText className="w-4 h-4" /> Running Account Ledger ({customerLedgers.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'payments' ? 'bg-primary text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <CreditCard className="w-4 h-4" /> Payment History & Receipts ({selectedCustomer.paymentRecords?.length || 0})
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: ALL PRODUCTS GIVEN / SOLD TO CUSTOMER */}
          {/* ========================================================================= */}
          {activeTab === 'products' && (
            <div className="panel table-panel">
              <div className="p-4 bg-stone-50/50 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Product Dispatch & Sales Log</h3>
                  <p className="text-xs text-stone-500">Every product line delivered or sold to {selectedCustomer.name}</p>
                </div>
                <button
                  className="button secondary text-xs"
                  onClick={() => {
                    const headers = ['Date', 'Invoice #', 'Product Name', 'Quantity', 'Unit', 'Unit Price', 'Total']
                    const rows = customerProducts.map((p) => [p.date, p.invoiceNumber, p.name, p.quantity, p.unit, p.unitPrice, p.total])
                    exportToCSV(`Products_${selectedCustomer.name}_${new Date().toISOString().slice(0, 10)}`, headers, rows)
                  }}
                >
                  <Download className="w-3.5 h-3.5" /> Export Products CSV
                </button>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>Linked Invoice #</th>
                      <th>Product Name</th>
                      <th>Pricing Tier</th>
                      <th>Quantity Delivered</th>
                      <th>Unit Price</th>
                      <th className="text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerProducts.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className="text-xs font-bold text-stone-900">{formatDate(item.date)}</div>
                          <div className="text-[10px] text-stone-400">{item.time}</div>
                        </td>
                        <td>
                          <span
                            className="font-mono text-xs font-bold text-primary hover:underline cursor-pointer"
                            onClick={() => {
                              const inv = db.invoices.find((i) => i.invoiceNumber === item.invoiceNumber)
                              if (inv) setViewingInvoice(inv)
                            }}
                          >
                            #{item.invoiceNumber}
                          </span>
                        </td>
                        <td className="font-semibold text-stone-900">{item.name}</td>
                        <td>
                          <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-medium">
                            {item.pricingTier}
                          </span>
                        </td>
                        <td className="font-bold text-stone-900">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="text-xs font-semibold text-stone-800">{formatPKR(item.unitPrice)}</td>
                        <td className="text-right font-black text-stone-900">{formatPKR(item.total)}</td>
                      </tr>
                    ))}
                    {customerProducts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-stone-400">
                          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No product deliveries recorded yet. Click "New Sale / Invoice" to create a delivery.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: LINKED INVOICES & RECEIPTS */}
          {/* ========================================================================= */}
          {activeTab === 'invoices' && (
            <div className="panel table-panel">
              <div className="p-4 bg-stone-50/50 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Commercial Invoices & Sales Receipts</h3>
                  <p className="text-xs text-stone-500">Auto-generated invoices linked to {selectedCustomer.name}</p>
                </div>
                <button
                  className="button primary text-xs"
                  onClick={() => setQuickNewSaleCustomer(selectedCustomer)}
                >
                  <Plus className="w-3.5 h-3.5" /> Create New Invoice
                </button>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Date</th>
                      <th>Items Summary</th>
                      <th>Grand Total</th>
                      <th>Amount Paid</th>
                      <th>Balance Due</th>
                      <th>Payment Status</th>
                      <th>Proof / Attachment</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <span className="font-mono font-bold text-xs text-stone-900">{inv.invoiceNumber}</span>
                        </td>
                        <td>{formatDate(inv.date)}</td>
                        <td>
                          <div className="text-xs text-stone-700 max-w-[200px] truncate">
                            {inv.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                          </div>
                          <span className="text-[10px] text-stone-400">{inv.items.length} items</span>
                        </td>
                        <td className="font-bold text-stone-900">{formatPKR(inv.grandTotal)}</td>
                        <td className="font-semibold text-emerald-700">{formatPKR(inv.amountPaid)}</td>
                        <td className="font-bold text-amber-700">{formatPKR(inv.balanceDue)}</td>
                        <td>
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
                        <td>
                          {inv.invoiceImage || inv.paymentScreenshot ? (
                            <button
                              onClick={() =>
                                setPreviewImage({
                                  src: (inv.invoiceImage || inv.paymentScreenshot)!,
                                  title: `Invoice #${inv.invoiceNumber} Proof`,
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                            >
                              <ImageIcon className="w-3.5 h-3.5" /> View Photo
                            </button>
                          ) : (
                            <span className="text-stone-400 text-xs">—</span>
                          )}
                        </td>
                        <td>
                          <div className="row-actions justify-end">
                            <button
                              className="row-action text-primary"
                              title="View Invoice Receipt"
                              onClick={() => setViewingInvoice(inv)}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="row-action"
                              title="Download PDF"
                              onClick={() => generateInvoicePDF(inv, selectedCustomer)}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {customerInvoices.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-stone-400">
                          <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No invoices generated for this customer yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: RUNNING ACCOUNT LEDGER / STATEMENT */}
          {/* ========================================================================= */}
          {activeTab === 'ledger' && (
            <div className="panel table-panel">
              <div className="p-4 bg-stone-50/50 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Chronological Running Balance Statement</h3>
                  <p className="text-xs text-stone-500">Live running balance for {selectedCustomer.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="button secondary text-xs"
                    onClick={() => generateLedgerPDF(selectedCustomer, customerLedgers, true)}
                  >
                    <Download className="w-3.5 h-3.5" /> Download Ledger PDF
                  </button>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Ref Type</th>
                      <th>Voucher / Ref #</th>
                      <th>Description</th>
                      <th>Debit (Sale / Bill)</th>
                      <th>Credit (Payment Received)</th>
                      <th className="text-right">Running Balance Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerLedgers.map((entry, idx) => (
                      <tr key={entry.id || idx}>
                        <td className="text-stone-400 text-xs font-mono">{idx + 1}</td>
                        <td className="text-xs font-semibold text-stone-800">{formatDate(entry.date)}</td>
                        <td>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              entry.referenceType === 'Invoice'
                                ? 'bg-blue-50 text-blue-700'
                                : entry.referenceType === 'Payment'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {entry.referenceType}
                          </span>
                        </td>
                        <td className="font-mono text-xs font-bold text-stone-900">{entry.referenceId || '—'}</td>
                        <td className="text-xs text-stone-800 font-medium">{entry.description}</td>
                        <td className="font-semibold text-stone-900">{entry.debit > 0 ? formatPKR(entry.debit) : '—'}</td>
                        <td className="font-semibold text-emerald-700">{entry.credit > 0 ? formatPKR(entry.credit) : '—'}</td>
                        <td className="text-right font-black text-stone-900">{formatPKR(entry.balance)}</td>
                      </tr>
                    ))}
                    {customerLedgers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-stone-400">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No ledger transactions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: PAYMENT RECORDS & PROOF SCREENSHOTS */}
          {/* ========================================================================= */}
          {activeTab === 'payments' && (
            <div className="panel table-panel">
              <div className="p-4 bg-stone-50/50 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Payment Receipts & Screenshot Attachments</h3>
                  <p className="text-xs text-stone-500">Payments recorded across Cash, Card, Online (Raast/IBFT), and Cheque</p>
                </div>
                <button
                  className="button primary text-xs"
                  onClick={() => setIsRecordingPayment(selectedCustomer)}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" /> Record New Payment
                </button>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Date</th>
                      <th>Payment Method</th>
                      <th>Amount Received</th>
                      <th>Account Credited</th>
                      <th>Transaction Ref</th>
                      <th>Receipt / Screenshot</th>
                      <th>Notes</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedCustomer.paymentRecords || []).map((pay) => (
                      <tr key={pay.id}>
                        <td className="font-mono font-bold text-xs text-stone-900">{pay.receiptNumber}</td>
                        <td>{formatDate(pay.date)}</td>
                        <td>
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
                        <td className="font-black text-emerald-700 text-xs">{formatPKR(pay.amount)}</td>
                        <td className="text-xs font-mono text-stone-600">{pay.paymentAccount}</td>
                        <td className="font-mono text-xs text-stone-800">{pay.transactionRef || '—'}</td>
                        <td>
                          {pay.receiptImage ? (
                            <button
                              onClick={() =>
                                setPreviewImage({
                                  src: pay.receiptImage!,
                                  title: `Payment Receipt #${pay.receiptNumber} Screenshot`,
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                            >
                              <ImageIcon className="w-3.5 h-3.5" /> View Proof
                            </button>
                          ) : (
                            <span className="text-stone-400 text-xs">No image</span>
                          )}
                        </td>
                        <td className="text-xs text-stone-600 max-w-[150px] truncate">{pay.notes || '—'}</td>
                        <td>
                          <div className="row-actions justify-end">
                            <button
                              className="row-action text-primary"
                              title="Download Payment Voucher PDF"
                              onClick={() => generateCustomerPaymentReceiptPDF(selectedCustomer, pay)}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!selectedCustomer.paymentRecords || selectedCustomer.paymentRecords.length === 0) && (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-stone-400">
                          <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No payment entries recorded yet. Click "Record New Payment" to log a settlement.
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
        <CustomerProfileModal
          customer={editingCustomer}
          onClose={() => {
            setIsCreatingCustomer(false)
            setEditingCustomer(null)
          }}
          onSave={(profileData) => {
            if (editingCustomer) {
              const updated = db.customers.map((c) =>
                c.id === editingCustomer.id
                  ? {
                      ...c,
                      ...profileData,
                      updatedAt: new Date().toISOString().slice(0, 10),
                    }
                  : c
              )
              onSaveDatabase({ ...db, customers: updated })
            } else {
              const newCustomer: CustomerItem = {
                id: `cust-${Date.now()}`,
                customerId: profileData.customerId || `CUST-${String(db.customers.length + 1001)}`,
                name: profileData.name,
                businessName: profileData.businessName || '',
                type: profileData.type,
                phone: profileData.phone,
                altPhone: profileData.altPhone,
                address: profileData.address,
                city: profileData.city,
                openingBalance: profileData.openingBalance || 0,
                currentBalance: profileData.openingBalance || 0,
                creditLimit: profileData.creditLimit || 0,
                status: 'Active',
                notes: profileData.notes,
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
      {/* MODAL 2: RECORD PAYMENT MODAL (WITH ONLINE SCREENSHOT ATTACHMENT) */}
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
      {/* MODAL 3: INVOICE RECEIPT MODAL VIEWER & PRINT */}
      {/* ========================================================================= */}
      {viewingInvoice && (
        <InvoiceReceiptModal
          invoice={viewingInvoice}
          customer={db.customers.find((c) => c.id === viewingInvoice.customerId)}
          onClose={() => setViewingInvoice(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: QUICK NEW SALE FOR THIS CUSTOMER */}
      {/* ========================================================================= */}
      {quickNewSaleCustomer && (
        <QuickSaleModal
          customer={quickNewSaleCustomer}
          products={db.products}
          accounts={db.accounts}
          onClose={() => setQuickNewSaleCustomer(null)}
          onSubmit={handleQuickSaleSubmit}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: FULLSCREEN LIGHTBOX IMAGE PREVIEW */}
      {/* ========================================================================= */}
      {previewImage && (
        <div className="editor-overlay z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-4 max-w-2xl w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-stone-900 text-sm">{previewImage.title}</h3>
              <button onClick={() => setPreviewImage(null)} className="icon-button">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 flex justify-center bg-stone-100 rounded-xl p-2 max-h-[75vh] overflow-auto">
              <img src={previewImage.src} alt={previewImage.title} className="max-h-[70vh] rounded object-contain" />
            </div>
            <div className="mt-4 flex justify-end">
              <button className="button primary text-xs" onClick={() => setPreviewImage(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// MODAL: ADD / EDIT CUSTOMER PROFILE
// -----------------------------------------------------------------------------
function CustomerProfileModal({
  customer,
  onClose,
  onSave,
}: {
  customer: CustomerItem | null
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
    <div className="editor-overlay">
      <form className="editor-modal" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Customer Directory</p>
            <h2>{customer ? `Edit ${customer.name}` : 'Add New Customer Profile'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="form-grid">
          <label>
            Full Name *
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Haji Noor Muhammad / Kashif Mehmood"
              required
            />
          </label>

          <label>
            Customer Type (Selectable) *
            <select value={type} onChange={(e) => setType(e.target.value as any)} required>
              <option value="Retailer">Retailer (Grocery Mart / Bakery / General Store)</option>
              <option value="Distributor">Distributor (Bulk Regional Wholesale Hub)</option>
              <option value="Sales Man">Sales Man / Field Sales Representative</option>
            </select>
          </label>

          <label>
            Customer ID (Auto / Manual)
            <input
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="e.g. CUST-1048 or leave blank for auto"
            />
          </label>

          <label>
            Shop / Business / Agency Name
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Noor Beverages & Distribution Hub"
            />
          </label>

          <label>
            Primary Phone / WhatsApp *
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0344 XXXXXXX"
              required
            />
          </label>

          <label>
            Secondary Phone (Optional)
            <input
              value={altPhone}
              onChange={(e) => setAltPhone(e.target.value)}
              placeholder="0300 XXXXXXX"
            />
          </label>

          <label>
            City *
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Peshawar, Lahore, Rawalpindi"
              required
            />
          </label>

          <label>
            Address / Location *
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Shop #, Street, Market Name"
              required
            />
          </label>

          {!customer && (
            <label>
              Opening Balance (Rs)
              <input
                type="number"
                min="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                placeholder="0"
              />
            </label>
          )}

          <label>
            Credit Limit (Rs - Optional)
            <input
              type="number"
              min="0"
              value={creditLimit}
              onChange={(e) => setCreditLimit(Number(e.target.value))}
              placeholder="e.g. 500000"
            />
          </label>

          <label className="col-span-2">
            Special Notes / Route Information
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, delivery route, or van assignment"
            />
          </label>
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            {customer ? 'Update Customer Profile' : 'Save Customer Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}

// -----------------------------------------------------------------------------
// MODAL: RECORD PAYMENT (WITH OFFLINE SCREENSHOT ATTACHMENT)
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
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Online' | 'Bank Transfer' | 'Cheque'>('Online')
  const [paymentAccount, setPaymentAccount] = useState<'cash-in-hand' | 'meezan-bank' | 'hbl-bank'>('meezan-bank')
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
    <div className="editor-overlay">
      <form className="editor-modal" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Payment Collection</p>
            <h2>Record Payment from {customer.name}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 mb-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-stone-500 block">Current Balance Due:</span>
            <strong className="text-base text-amber-800">{formatPKR(customer.currentBalance)}</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Customer Phone:</span>
            <strong className="text-sm text-stone-900 font-mono">{customer.phone}</strong>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Amount Received (Rs) *
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />
          </label>

          <label>
            Payment Date *
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>

          <label>
            Payment Mode *
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
              <option value="Online">Online (Raast / Bank App Transfer)</option>
              <option value="Cash">Cash in Hand</option>
              <option value="Card">Credit / Debit Card POS</option>
              <option value="Bank Transfer">Bank Cheque / IBFT</option>
              <option value="Cheque">Cross Cheque</option>
            </select>
          </label>

          <label>
            Deposit Account *
            <select value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value as any)}>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (Bal: {formatPKR(acc.balance)})
                </option>
              ))}
            </select>
          </label>

          <label className="col-span-2">
            Transaction Reference / Bank Ref / Cheque #
            <input
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. MZB-IBFT-889123 or Raast Ref"
            />
          </label>

          {/* Screenshot / Photo Attachment for Online / Bank Transfer */}
          <div className="col-span-2 space-y-2">
            <label className="block text-xs font-bold text-stone-700">
              Attach Payment Receipt / Screenshot {paymentMethod === 'Online' && '(Recommended for Online)'}
            </label>
            <div className="flex items-center gap-4">
              <label className="button secondary cursor-pointer text-xs">
                <Upload className="w-3.5 h-3.5" /> Upload Screenshot / Slip
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              {receiptImage && (
                <div className="flex items-center gap-2">
                  <img src={receiptImage} alt="Proof" className="w-10 h-10 object-cover rounded-lg border border-stone-200" />
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Screenshot Attached
                  </span>
                  <button type="button" onClick={() => setReceiptImage(undefined)} className="text-rose-600 text-xs hover:underline">
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          <label className="col-span-2">
            Notes / Remarks
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Partial advance against invoice clearance"
            />
          </label>
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Record Payment Voucher
          </button>
        </div>
      </form>
    </div>
  )
}

// -----------------------------------------------------------------------------
// MODAL: QUICK SALE / INVOICE CREATION FOR CUSTOMER
// -----------------------------------------------------------------------------
function QuickSaleModal({
  customer,
  products,
  accounts,
  onClose,
  onSubmit,
}: {
  customer: CustomerItem
  products: AppDatabase['products']
  accounts: AppDatabase['accounts']
  onClose: () => void
  onSubmit: (items: Array<{ productId: string; name: string; qty: number; unitPrice: number; unit: string }>, amountPaid: number, paymentMethod: any, paymentAccount: any) => void
}) {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '')
  const [qty, setQty] = useState(10)
  const [cart, setCart] = useState<Array<{ productId: string; name: string; qty: number; unitPrice: number; unit: string }>>([])
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Online')
  const [paymentAccount, setPaymentAccount] = useState('meezan-bank')

  const currentProduct = products.find((p) => p.id === selectedProductId)
  const priceToUse = customer.type === 'Distributor' ? currentProduct?.wholesalePrice || 0 : currentProduct?.retailPrice || 0

  const handleAddToCart = () => {
    if (!currentProduct || qty <= 0) return
    const existing = cart.find((i) => i.productId === currentProduct.id)
    if (existing) {
      setCart(cart.map((i) => (i.productId === currentProduct.id ? { ...i, qty: i.qty + qty } : i)))
    } else {
      setCart([...cart, { productId: currentProduct.id, name: currentProduct.name, qty, unitPrice: priceToUse, unit: currentProduct.unit }])
    }
  }

  const grandTotal = cart.reduce((sum, i) => sum + i.qty * i.unitPrice, 0)

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (cart.length === 0) return
    onSubmit(cart, amountPaid, paymentMethod, paymentAccount)
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal large" onSubmit={handleFormSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Commercial Invoice</p>
            <h2>Create Sale for {customer.name}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="col-span-2 space-y-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-end gap-3">
              <label className="flex-1">
                Select Product
                <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.quantity} {p.unit})
                    </option>
                  ))}
                </select>
              </label>
              <label className="w-24">
                Qty ({currentProduct?.unit || 'Units'})
                <input type="number" min="1" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
              </label>
              <button type="button" className="button primary text-xs h-10" onClick={handleAddToCart}>
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {/* Cart Table */}
            <div className="table-scroll border border-stone-200 rounded-xl max-h-56">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-bold">{item.name}</td>
                      <td>
                        {item.qty} {item.unit}
                      </td>
                      <td>{formatPKR(item.unitPrice)}</td>
                      <td className="font-bold">{formatPKR(item.qty * item.unitPrice)}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                          className="text-rose-600 hover:text-rose-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-stone-400">
                        Add products from the selector above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment & Settlement Column */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-stone-900 text-xs">Payment & Settlement</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-stone-600">
                <span>Invoice Total:</span>
                <strong className="text-stone-900">{formatPKR(grandTotal)}</strong>
              </div>
            </div>

            <label className="text-xs">
              Amount Paid Now (Rs)
              <input
                type="number"
                min="0"
                max={grandTotal}
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
              />
            </label>

            <label className="text-xs">
              Payment Method
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="Online">Online / Raast</option>
                <option value="Cash">Cash in Hand</option>
                <option value="Card">Card POS</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </label>

            <label className="text-xs">
              Deposit Account
              <select value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)}>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="pt-2 border-t border-stone-200 text-xs flex justify-between">
              <span className="font-bold">Remaining Added to Balance:</span>
              <strong className="text-amber-800 font-bold">{formatPKR(Math.max(0, grandTotal - amountPaid))}</strong>
            </div>
          </div>
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary" disabled={cart.length === 0}>
            Issue Invoice & Update Stock
          </button>
        </div>
      </form>
    </div>
  )
}

// -----------------------------------------------------------------------------
// MODAL: INVOICE RECEIPT MODAL VIEWER
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
    <div className="editor-overlay">
      <div className="editor-modal large">
        <div className="editor-header">
          <div>
            <p className="eyebrow">Commercial Invoice</p>
            <h2>Invoice #{invoice.invoiceNumber}</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-stone-500 block">Customer Name</span>
            <strong className="text-sm text-stone-900">{invoice.customerName}</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Invoice Date</span>
            <strong className="text-sm text-stone-900">{formatDate(invoice.date)}</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Payment Mode & Account</span>
            <strong className="text-sm text-stone-900">{invoice.paymentMethod} ({invoice.paymentAccount})</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Payment Status</span>
            <span
              className={`inline-block font-bold text-xs px-2 py-0.5 rounded ${
                invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {invoice.status}
            </span>
          </div>
        </div>

        <div className="table-scroll border border-stone-200 rounded-xl mb-4">
          <table className="text-xs">
            <thead>
              <tr>
                <th>#</th>
                <th>Product Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th className="text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td className="font-bold">{item.name}</td>
                  <td>
                    {item.quantity} {item.unit}
                  </td>
                  <td>{formatPKR(item.unitPrice)}</td>
                  <td className="text-right font-bold">{formatPKR(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-6 text-xs border-t border-stone-200 pt-3">
          <div className="text-right space-y-1">
            <div>
              <span className="text-stone-500">Grand Total: </span>
              <strong className="text-sm font-black">{formatPKR(invoice.grandTotal)}</strong>
            </div>
            <div>
              <span className="text-stone-500">Amount Paid: </span>
              <strong className="text-emerald-700">{formatPKR(invoice.amountPaid)}</strong>
            </div>
            <div>
              <span className="text-stone-500">Balance Due: </span>
              <strong className="text-amber-800 font-black">{formatPKR(invoice.balanceDue)}</strong>
            </div>
          </div>
        </div>

        <div className="editor-actions flex justify-between items-center mt-4">
          <button className="button secondary" onClick={() => generateInvoicePDF(invoice, customer)}>
            <Download className="w-4 h-4" /> Download Tax Invoice PDF
          </button>
          <button className="button primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
