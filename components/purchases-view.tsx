'use client'

import React, { useState, useMemo, useRef } from 'react'
import {
  Plus,
  Search,
  Truck,
  DollarSign,
  Trash2,
  Edit,
  Eye,
  FileText,
  Download,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  Filter,
  Image as ImageIcon,
  Printer,
  ChevronDown,
  ArrowUpDown,
  Boxes,
  Package,
  Layers,
  CreditCard,
  Building2,
  Phone,
  Maximize2,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  type AppDatabase,
  type PurchaseItem,
  type PurchaseLineItem,
  type PurchaseType,
  type RawMaterialItem,
  type ProductItem,
  type SupplierItem,
  type AccountItem,
} from '@/lib/db'
import { exportToCSV } from '@/lib/pdf-export'

interface PurchasesViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigateToSupplier?: (supplierId?: string) => void
}

export default function PurchasesView({
  db,
  onSaveDatabase,
  onNavigateToSupplier,
}: PurchasesViewProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'Raw Material' | 'Finished Product'>('all')
  const [filterSupplier, setFilterSupplier] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'Paid' | 'Partial' | 'Unpaid'>('all')
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc')

  // Modals
  const [isCreatingPurchase, setIsCreatingPurchase] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<PurchaseItem | null>(null)
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseItem | null>(null)
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null)

  // Current Month String (e.g. "2026-08")
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), [])
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // Categories list across raw materials and products
  const allCategories = useMemo(() => {
    const rawCats = Array.from(new Set(db.rawMaterials.map((r) => r.category).filter(Boolean)))
    const prodCats = Array.from(new Set(db.products.map((p) => p.category).filter(Boolean)))
    return Array.from(new Set([...rawCats, ...prodCats]))
  }, [db.rawMaterials, db.products])

  // Key KPI Calculations
  const stats = useMemo(() => {
    const thisMonthPurchases = db.purchases.filter((p) => (p.date || '').startsWith(currentMonthStr))
    const totalThisMonth = thisMonthPurchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0)
    const countThisMonth = thisMonthPurchases.length

    const totalPayableDue = db.purchases.reduce((sum, p) => sum + (p.balanceDue || 0), 0)
    const pendingCount = db.purchases.filter((p) => p.balanceDue > 0).length

    const rawPurchases = db.purchases.filter((p) => (p.purchaseType || 'Raw Material') === 'Raw Material')
    const rawTotal = rawPurchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0)

    const finishedPurchases = db.purchases.filter((p) => p.purchaseType === 'Finished Product')
    const finishedTotal = finishedPurchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0)

    return {
      totalThisMonth,
      countThisMonth,
      totalPayableDue,
      pendingCount,
      rawTotal,
      rawCount: rawPurchases.length,
      finishedTotal,
      finishedCount: finishedPurchases.length,
      totalAllTime: db.purchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0),
      totalCount: db.purchases.length,
    }
  }, [db.purchases, currentMonthStr])

  // Filtered & Sorted Purchases List
  const filteredPurchases = useMemo(() => {
    return db.purchases
      .filter((p) => {
        // Safe accessors
        const poNumber = (p.poNumber || p.purchaseNumber || '').toLowerCase()
        const supplierName = (p.supplierName || '').toLowerCase()
        const notes = (p.notes || '').toLowerCase()
        const type = p.purchaseType || 'Raw Material'
        const status = p.status || 'Paid'
        const date = p.date || ''

        // Search text matching
        const itemsText = (p.items || []).map((it) => `${it.name} ${it.category || ''}`).join(' ').toLowerCase()
        const q = searchQuery.toLowerCase().trim()
        if (q) {
          const matches =
            poNumber.includes(q) ||
            supplierName.includes(q) ||
            notes.includes(q) ||
            itemsText.includes(q)
          if (!matches) return false
        }

        // Filter: Type
        if (filterType !== 'all' && type !== filterType) return false

        // Filter: Supplier
        if (filterSupplier !== 'all' && p.supplierId !== filterSupplier && p.supplierName !== filterSupplier) return false

        // Filter: Category
        if (filterCategory !== 'all') {
          const hasCat = (p.items || []).some((it) => it.category === filterCategory)
          if (!hasCat) return false
        }

        // Filter: Status
        if (filterStatus !== 'all' && status !== filterStatus) return false

        // Filter: Date Range
        if (filterDateRange === 'today') {
          if (date !== todayStr) return false
        } else if (filterDateRange === 'this_month') {
          if (!date.startsWith(currentMonthStr)) return false
        } else if (filterDateRange === 'this_week') {
          const pDate = new Date(date)
          const now = new Date()
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (pDate < weekAgo) return false
        } else if (filterDateRange === 'custom') {
          if (customStartDate && date < customStartDate) return false
          if (customEndDate && date > customEndDate) return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')
        if (sortBy === 'date-asc') return (a.date || '').localeCompare(b.date || '')
        if (sortBy === 'amount-desc') return (b.grandTotal || 0) - (a.grandTotal || 0)
        if (sortBy === 'amount-asc') return (a.grandTotal || 0) - (b.grandTotal || 0)
        return 0
      })
  }, [
    db.purchases,
    searchQuery,
    filterType,
    filterSupplier,
    filterCategory,
    filterStatus,
    filterDateRange,
    customStartDate,
    customEndDate,
    sortBy,
    todayStr,
    currentMonthStr,
  ])

  // Handle Delete Purchase
  const handleDeletePurchase = (purchase: PurchaseItem) => {
    const poNum = purchase.poNumber || purchase.purchaseNumber || 'this PO'
    if (!window.confirm(`Are you sure you want to delete purchase order ${poNum}? This will reverse the stock addition and supplier balances.`)) {
      return
    }

    // 1. Reverse Stock addition
    let updatedRawMaterials = [...db.rawMaterials]
    let updatedProducts = [...db.products]

    const pType = purchase.purchaseType || 'Raw Material'
    const items = purchase.items || []

    items.forEach((item) => {
      const targetId = item.itemId || item.rawMaterialId || item.productId
      const qty = item.quantity || 0

      if (pType === 'Raw Material' || item.itemType === 'Raw Material') {
        updatedRawMaterials = updatedRawMaterials.map((r) => {
          if (r.id === targetId || r.name.toLowerCase() === item.name.toLowerCase()) {
            const newQty = Math.max(0, r.quantity - qty)
            const newRec = Math.max(0, (r.totalReceived || r.quantity) - qty)
            return {
              ...r,
              quantity: newQty,
              totalReceived: newRec,
              status: (newQty === 0 ? 'Out of stock' : newQty <= r.reorderLevel ? 'Low stock' : 'In stock') as any,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          }
          return r
        })
      } else {
        updatedProducts = updatedProducts.map((p) => {
          if (p.id === targetId || p.name.toLowerCase() === item.name.toLowerCase()) {
            const newQty = Math.max(0, p.quantity - qty)
            return {
              ...p,
              quantity: newQty,
              status: (newQty === 0 ? 'Out of stock' : newQty <= p.reorderLevel ? 'Low stock' : 'In stock') as any,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          }
          return p
        })
      }
    })

    // 2. Reverse Supplier balance if due balance existed
    let updatedSuppliers = [...db.suppliers]
    if (purchase.supplierId && purchase.balanceDue > 0) {
      updatedSuppliers = updatedSuppliers.map((s) => {
        if (s.id === purchase.supplierId) {
          return {
            ...s,
            currentBalance: Math.max(0, s.currentBalance - purchase.balanceDue),
            updatedAt: new Date().toISOString().slice(0, 10),
          }
        }
        return s
      })
    }

    // 3. Reverse Cash/Bank account payment if paid
    let updatedAccounts = [...db.accounts]
    if (purchase.amountPaid > 0 && purchase.paymentAccount) {
      updatedAccounts = updatedAccounts.map((acc) => {
        if (acc.id === purchase.paymentAccount) {
          return {
            ...acc,
            balance: acc.balance + purchase.amountPaid,
            updatedAt: new Date().toISOString().slice(0, 10),
          }
        }
        return acc
      })
    }

    // 4. Remove Purchase and associated Ledger entries
    const updatedPurchases = db.purchases.filter((p) => p.id !== purchase.id)
    const updatedLedgers = db.ledgers.filter((l) => l.referenceId !== (purchase.poNumber || purchase.purchaseNumber))

    onSaveDatabase({
      ...db,
      purchases: updatedPurchases,
      rawMaterials: updatedRawMaterials,
      products: updatedProducts,
      suppliers: updatedSuppliers,
      accounts: updatedAccounts,
      ledgers: updatedLedgers,
    })

    if (viewingPurchase?.id === purchase.id) {
      setViewingPurchase(null)
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'PO Number',
      'Date',
      'Purchase Type',
      'Supplier',
      'Item Purchased',
      'Quantity',
      'Unit',
      'Unit Price (Rs)',
      'Other Cost (Rs)',
      'Grand Total (Rs)',
      'Amount Paid (Rs)',
      'Balance Due (Rs)',
      'Payment Status',
      'Payment Method',
      'Notes',
    ]

    const rows = filteredPurchases.map((p) => {
      const itemsStr = (p.items || []).map((it) => it.name).join('; ')
      const qtyStr = (p.items || []).map((it) => `${it.quantity} ${it.unit}`).join('; ')
      const unitPriceStr = (p.items || []).map((it) => it.unitPrice).join('; ')
      const otherCostStr = (p.items || []).map((it) => it.otherCost || 0).reduce((a, b) => a + b, 0) || p.otherCost || 0

      return [
        p.poNumber || p.purchaseNumber,
        formatDate(p.date),
        p.purchaseType || 'Raw Material',
        p.supplierName,
        itemsStr,
        qtyStr,
        p.unit || (p.items?.[0]?.unit || 'kg'),
        unitPriceStr,
        otherCostStr,
        p.grandTotal,
        p.amountPaid,
        p.balanceDue,
        p.status,
        p.paymentMethod,
        p.notes || '',
      ]
    })

    exportToCSV(`Purchases_Register_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  return (
    <div className="space-y-6">
      {/* Header with Title and Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 rounded-md">
              Inward Procurement & Stock In
            </span>
            <span className="text-xs text-stone-500 font-medium">· Local Offline SQLite (OPFS)</span>
          </div>
          <h1 className="text-2xl font-black text-stone-900 mt-1 flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-emerald-600" />
            Purchase Management
          </h1>
          <p className="text-xs text-stone-600 mt-0.5 max-w-2xl">
            Record raw material & outsourced finished product purchases, attach invoice bills, track supplier payable balances, and automatically synchronize inventory stock levels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 transition-all cursor-pointer shadow-2xs"
            title="Export filtered purchases to CSV spreadsheet"
          >
            <Download className="w-4 h-4 text-stone-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              setEditingPurchase(null)
              setIsCreatingPurchase(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition-all cursor-pointer shadow-xs"
            id="btn-add-new-purchase"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Purchase Order</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Month Purchases */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Purchases This Month (MTD)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-stone-900">{formatPKR(stats.totalThisMonth)}</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-emerald-700">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{stats.countThisMonth} purchase orders this month</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pending Payables */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Pending Supplier Payables</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-700">{formatPKR(stats.totalPayableDue)}</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-amber-800">
              <span>{stats.pendingCount} POs awaiting balance settlement</span>
            </div>
          </div>
        </div>

        {/* Card 3: Raw Materials Sourced */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Raw Materials Sourced</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-stone-900">{formatPKR(stats.rawTotal)}</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-blue-700">
              <span>{stats.rawCount} raw material shipments</span>
            </div>
          </div>
        </div>

        {/* Card 4: Finished Goods Sourced */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Finished Goods Sourced</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-stone-900">{formatPKR(stats.finishedTotal)}</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-purple-700">
              <span>{stats.finishedCount} finished cartons / batches</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters, Search & View Controls */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Bar */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by PO #, Supplier, Item, Notes..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden transition-all text-stone-800 placeholder-stone-400 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter: Purchase Type */}
          <div className="md:col-span-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 focus:bg-white focus:border-emerald-500 outline-hidden text-stone-800 font-medium cursor-pointer"
            >
              <option value="all">All Purchase Types</option>
              <option value="Raw Material">Raw Material Purchases</option>
              <option value="Finished Product">Finished Products (Outsourced)</option>
            </select>
          </div>

          {/* Filter: Supplier */}
          <div className="md:col-span-2">
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 focus:bg-white focus:border-emerald-500 outline-hidden text-stone-800 font-medium cursor-pointer"
            >
              <option value="all">All Suppliers / Vendors</option>
              {db.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: Payment Status */}
          <div className="md:col-span-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 focus:bg-white focus:border-emerald-500 outline-hidden text-stone-800 font-medium cursor-pointer"
            >
              <option value="all">All Payment Statuses</option>
              <option value="Paid">Paid Full</option>
              <option value="Partial">Partial / Balance Due</option>
              <option value="Unpaid">Unpaid / Full Credit</option>
            </select>
          </div>

          {/* Filter: Date Range */}
          <div className="md:col-span-2">
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 focus:bg-white focus:border-emerald-500 outline-hidden text-stone-800 font-medium cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">Past 7 Days</option>
              <option value="this_month">This Month (MTD)</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>
        </div>

        {/* Optional Custom Date Pickers & Sorting Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {filterDateRange === 'custom' && (
              <div className="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
                <span className="text-[11px] text-stone-500 font-bold">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent border-0 text-xs text-stone-800 font-semibold outline-hidden"
                />
                <span className="text-[11px] text-stone-500 font-bold">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent border-0 text-xs text-stone-800 font-semibold outline-hidden"
                />
              </div>
            )}

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] text-stone-400 font-bold mr-1">Category:</span>
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  filterCategory === 'all'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                All
              </button>
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterCategory === cat
                      ? 'bg-emerald-700 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Selector & Result Count */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-stone-500">
              Showing <span className="text-stone-900 font-extrabold">{filteredPurchases.length}</span> of {db.purchases.length} records
            </span>
            <div className="flex items-center gap-1.5 bg-stone-50 px-2 py-1 rounded-lg border border-stone-200">
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-0 text-xs text-stone-800 font-semibold outline-hidden cursor-pointer"
              >
                <option value="date-desc">Newest Date First</option>
                <option value="date-asc">Oldest Date First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Purchases Table Panel */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold tracking-wider uppercase text-[10px]">
                <th className="py-3 px-4">PO # & Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Supplier / Vendor</th>
                <th className="py-3 px-4">Purchased Item(s)</th>
                <th className="py-3 px-4">Rate & Other Costs</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Docs</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredPurchases.map((purchase) => {
                const poNumber = purchase.poNumber || purchase.purchaseNumber || 'PO-' + purchase.id
                const pType = purchase.purchaseType || 'Raw Material'
                const isPaid = purchase.status === 'Paid'
                const isPartial = purchase.status === 'Partial'

                return (
                  <tr
                    key={purchase.id}
                    className="hover:bg-stone-50/80 transition-colors group"
                  >
                    {/* 1. PO Number & Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-stone-900">{poNumber}</div>
                      <div className="text-[11px] text-stone-500 font-medium">
                        {formatDate(purchase.date)} {purchase.time ? `· ${purchase.time}` : ''}
                      </div>
                    </td>

                    {/* 2. Type Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold ${
                          pType === 'Raw Material'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-purple-100 text-purple-900 border border-purple-200'
                        }`}
                      >
                        {pType === 'Raw Material' ? <Boxes className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                        <span>{pType}</span>
                      </span>
                    </td>

                    {/* 3. Supplier Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-stone-900">{purchase.supplierName}</div>
                      {purchase.supplierId && onNavigateToSupplier ? (
                        <button
                          onClick={() => onNavigateToSupplier(purchase.supplierId)}
                          className="text-[10px] text-emerald-700 hover:text-emerald-800 font-semibold underline underline-offset-2 cursor-pointer"
                        >
                          View Vendor Ledger
                        </button>
                      ) : (
                        <div className="text-[10px] text-stone-400">Direct Purchase</div>
                      )}
                    </td>

                    {/* 4. Purchased Items */}
                    <td className="py-3.5 px-4 max-w-xs">
                      {(purchase.items && purchase.items.length > 0) ? (
                        <div className="space-y-1">
                          {purchase.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-stone-800 truncate mr-2">{item.name}</span>
                              <span className="font-bold text-stone-900 shrink-0 bg-stone-100 px-1.5 py-0.5 rounded text-[11px]">
                                {item.quantity} {item.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-stone-400 italic">No item details</span>
                      )}
                    </td>

                    {/* 5. Rate & Other Cost */}
                    <td className="py-3.5 px-4 text-xs">
                      {purchase.items?.[0] ? (
                        <div>
                          <div className="font-semibold text-stone-800">
                            Rs. {purchase.items[0].unitPrice?.toLocaleString()} / {purchase.items[0].unit}
                          </div>
                          {(purchase.otherCost || purchase.items[0].otherCost) ? (
                            <div className="text-[10px] text-stone-500 font-medium">
                              + Transport/Other: {formatPKR(purchase.otherCost || purchase.items[0].otherCost || 0)}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>

                    {/* 6. Grand Total */}
                    <td className="py-3.5 px-4 text-right font-black text-stone-900 text-sm">
                      {formatPKR(purchase.grandTotal)}
                    </td>

                    {/* 7. Amount Paid */}
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                      {formatPKR(purchase.amountPaid)}
                      <div className="text-[10px] text-stone-400 font-medium">{purchase.paymentMethod || 'Bank'}</div>
                    </td>

                    {/* 8. Balance Due */}
                    <td className="py-3.5 px-4 text-right font-bold">
                      {purchase.balanceDue > 0 ? (
                        <span className="text-amber-700">{formatPKR(purchase.balanceDue)}</span>
                      ) : (
                        <span className="text-stone-400 font-normal">Rs. 0</span>
                      )}
                    </td>

                    {/* 9. Payment Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isPartial
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {isPaid ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        <span>{purchase.status}</span>
                      </span>
                    </td>

                    {/* 10. Attached Document Indicators */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {purchase.invoiceImage ? (
                          <button
                            onClick={() =>
                              setPreviewImage({
                                src: purchase.invoiceImage!,
                                title: `Supplier Invoice: ${poNumber}`,
                              })
                            }
                            className="p-1 rounded-md bg-stone-100 hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 transition-colors"
                            title="View Attached Supplier Invoice Slip"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                        {purchase.paymentScreenshot ? (
                          <button
                            onClick={() =>
                              setPreviewImage({
                                src: purchase.paymentScreenshot!,
                                title: `Payment Slip: ${poNumber}`,
                              })
                            }
                            className="p-1 rounded-md bg-stone-100 hover:bg-blue-50 text-stone-600 hover:text-blue-700 transition-colors"
                            title="View Attached Payment Screenshot"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                        {!purchase.invoiceImage && !purchase.paymentScreenshot && (
                          <span className="text-stone-300">—</span>
                        )}
                      </div>
                    </td>

                    {/* 11. Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingPurchase(purchase)}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="View PO Details & Voucher"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingPurchase(purchase)
                            setIsCreatingPurchase(true)
                          }}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Purchase Record"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePurchase(purchase)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Purchase Record & Reverse Stock"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-stone-400">
                    <Truck className="w-10 h-10 mx-auto mb-2 text-stone-300 opacity-60" />
                    <p className="font-bold text-sm text-stone-600">No purchase records found</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                        ? 'Try clearing the search or filters'
                        : 'Create your first purchase order to stock raw materials or finished products.'}
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setFilterType('all')
                        setFilterSupplier('all')
                        setFilterStatus('all')
                        setFilterCategory('all')
                        setFilterDateRange('all')
                      }}
                      className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE & EDIT PURCHASE MODAL */}
      {isCreatingPurchase && (
        <PurchaseEditorModal
          db={db}
          purchase={editingPurchase}
          onClose={() => {
            setIsCreatingPurchase(false)
            setEditingPurchase(null)
          }}
          onSave={(updatedPurchase, updatedDb) => {
            onSaveDatabase(updatedDb)
            setIsCreatingPurchase(false)
            setEditingPurchase(null)
          }}
        />
      )}

      {/* VIEW PURCHASE DETAIL MODAL */}
      {viewingPurchase && (
        <PurchaseDetailModal
          purchase={viewingPurchase}
          supplier={db.suppliers.find((s) => s.id === viewingPurchase.supplierId)}
          onClose={() => setViewingPurchase(null)}
          onEdit={() => {
            setEditingPurchase(viewingPurchase)
            setViewingPurchase(null)
            setIsCreatingPurchase(true)
          }}
          onDelete={() => handleDeletePurchase(viewingPurchase)}
          onOpenImage={(src, title) => setPreviewImage({ src, title })}
        />
      )}

      {/* FULLSCREEN IMAGE VIEWER MODAL */}
      {previewImage && (
        <ImageViewerModal
          src={previewImage.src}
          title={previewImage.title}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  )
}

/* ==========================================================================
   PURCHASE EDITOR MODAL (ADD & EDIT WITH AUTO STOCK & LEDGER SYNC)
   ========================================================================== */

function PurchaseEditorModal({
  db,
  purchase,
  onClose,
  onSave,
}: {
  db: AppDatabase
  purchase: PurchaseItem | null
  onClose: () => void
  onSave: (savedPurchase: PurchaseItem, updatedDb: AppDatabase) => void
}) {
  const isEditing = Boolean(purchase)

  // 1. Purchase Type & PO Number
  const [purchaseType, setPurchaseType] = useState<PurchaseType>(purchase?.purchaseType || 'Raw Material')
  const [poNumber, setPoNumber] = useState(
    purchase?.poNumber || purchase?.purchaseNumber || `PO-2026-${String(db.purchases.length + 1).padStart(4, '0')}`
  )
  const [date, setDate] = useState(purchase?.date || new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState(
    purchase?.time ||
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  )

  // 2. Supplier Selection
  const [supplierId, setSupplierId] = useState<string>(purchase?.supplierId || db.suppliers[0]?.id || '')
  const [supplierName, setSupplierName] = useState<string>(purchase?.supplierName || db.suppliers[0]?.name || '')
  const [isCustomSupplier, setIsCustomSupplier] = useState(!purchase?.supplierId && Boolean(purchase?.supplierName))

  // 3. Item Selection
  const initialItem = purchase?.items?.[0]
  const [selectedItemId, setSelectedItemId] = useState<string>(
    initialItem?.itemId || initialItem?.rawMaterialId || initialItem?.productId || (purchaseType === 'Raw Material' ? db.rawMaterials[0]?.id : db.products[0]?.id) || ''
  )
  const [itemName, setItemName] = useState<string>(
    initialItem?.name || (purchaseType === 'Raw Material' ? db.rawMaterials[0]?.name : db.products[0]?.name) || ''
  )
  const [itemCategory, setItemCategory] = useState<string>(
    initialItem?.category || (purchaseType === 'Raw Material' ? db.rawMaterials[0]?.category : db.products[0]?.category) || 'Ingredients'
  )

  // 4. Quantity, Unit & Price
  const [quantity, setQuantity] = useState<number>(initialItem?.quantity || purchase?.quantity || 100)
  const [unit, setUnit] = useState<string>(
    initialItem?.unit || purchase?.unit || (purchaseType === 'Raw Material' ? db.rawMaterials[0]?.unit : db.products[0]?.unit) || 'kg'
  )
  const [unitPrice, setUnitPrice] = useState<number>(
    initialItem?.unitPrice || purchase?.unitPrice || (purchaseType === 'Raw Material' ? db.rawMaterials[0]?.unitCost : db.products[0]?.costPrice) || 100
  )
  const [otherCost, setOtherCost] = useState<number>(initialItem?.otherCost || purchase?.otherCost || 0)

  // 5. Total Cost & Manual Override
  const computedTotal = useMemo(() => {
    return Math.max(0, quantity * unitPrice + otherCost)
  }, [quantity, unitPrice, otherCost])

  const [isManualTotal, setIsManualTotal] = useState<boolean>(purchase?.isManualTotalCost || false)
  const [manualGrandTotal, setManualGrandTotal] = useState<number>(purchase?.grandTotal || computedTotal)

  const finalGrandTotal = isManualTotal ? manualGrandTotal : computedTotal

  // 6. Payment Settlement
  const [amountPaid, setAmountPaid] = useState<number>(
    purchase ? purchase.amountPaid : finalGrandTotal // default full payment or previous
  )
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Online' | 'Bank Transfer' | 'Cheque' | 'Credit'>(
    purchase?.paymentMethod || 'Bank Transfer'
  )
  const [paymentAccount, setPaymentAccount] = useState<'cash-in-hand' | 'meezan-bank' | 'hbl-bank'>(
    purchase?.paymentAccount || 'meezan-bank'
  )
  const [transactionRef, setTransactionRef] = useState(purchase?.transactionRef || '')
  const [notes, setNotes] = useState(purchase?.notes || '')

  // 7. Image Attachments (Stored locally in Base64 / OPFS)
  const [invoiceImage, setInvoiceImage] = useState<string>(purchase?.invoiceImage || purchase?.purchaseInvoiceImage || '')
  const [paymentScreenshot, setPaymentScreenshot] = useState<string>(purchase?.paymentScreenshot || '')

  // 8. Inline New Item Quick Creator State
  const [showInlineItemCreator, setShowInlineItemCreator] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('Ingredients')
  const [newItemUnit, setNewItemUnit] = useState('kg')
  const [newItemRate, setNewItemRate] = useState(100)

  // Sync item selection details when item changes
  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId)
    if (purchaseType === 'Raw Material') {
      const raw = db.rawMaterials.find((r) => r.id === itemId)
      if (raw) {
        setItemName(raw.name)
        setItemCategory(raw.category)
        setUnit(raw.unit)
        setUnitPrice(raw.unitCost)
      }
    } else {
      const prod = db.products.find((p) => p.id === itemId)
      if (prod) {
        setItemName(prod.name)
        setItemCategory(prod.category)
        setUnit(prod.unit)
        setUnitPrice(prod.costPrice || prod.purchaseCost || 0)
      }
    }
  }

  // Switch between Raw Material and Finished Product
  const handleTypeChange = (newType: PurchaseType) => {
    setPurchaseType(newType)
    if (newType === 'Raw Material') {
      const first = db.rawMaterials[0]
      if (first) {
        setSelectedItemId(first.id)
        setItemName(first.name)
        setItemCategory(first.category)
        setUnit(first.unit)
        setUnitPrice(first.unitCost)
      }
    } else {
      const first = db.products[0]
      if (first) {
        setSelectedItemId(first.id)
        setItemName(first.name)
        setItemCategory(first.category)
        setUnit(first.unit)
        setUnitPrice(first.costPrice || first.purchaseCost || 0)
      }
    }
  }

  // Handle Supplier Select
  const handleSupplierChange = (supId: string) => {
    if (supId === 'custom') {
      setIsCustomSupplier(true)
      setSupplierId('')
    } else {
      setIsCustomSupplier(false)
      setSupplierId(supId)
      const found = db.suppliers.find((s) => s.id === supId)
      if (found) setSupplierName(found.name)
    }
  }

  // File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'invoice' | 'payment') => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (target === 'invoice') setInvoiceImage(reader.result)
        else setPaymentScreenshot(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  // Quick Pay All
  const handlePayFull = () => {
    setAmountPaid(finalGrandTotal)
  }

  // Inline Quick Add Item Handler
  const handleCreateInlineItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    const now = new Date().toISOString().slice(0, 10)
    if (purchaseType === 'Raw Material') {
      const newRaw: RawMaterialItem = {
        id: `raw-${Date.now()}`,
        name: newItemName.trim(),
        category: newItemCategory as any,
        sku: `RAW-${newItemName.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        unit: newItemUnit,
        unitCost: newItemRate,
        otherCost: 0,
        totalCostPerUnit: newItemRate,
        totalCost: 0,
        totalReceived: 0,
        totalConsumed: 0,
        quantity: 0,
        reorderLevel: 50,
        status: 'Out of stock',
        updatedAt: now,
      }
      db.rawMaterials.unshift(newRaw)
      setSelectedItemId(newRaw.id)
      setItemName(newRaw.name)
      setItemCategory(newRaw.category)
      setUnit(newRaw.unit)
      setUnitPrice(newRaw.unitCost)
    } else {
      const newProd: ProductItem = {
        id: `prod-${Date.now()}`,
        name: newItemName.trim(),
        category: newItemCategory,
        sku: `AFP-${newItemName.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        unit: newItemUnit,
        costPrice: newItemRate,
        wholesalePrice: Math.round(newItemRate * 1.3),
        wholesaleMinQty: 12,
        retailPrice: Math.round(newItemRate * 1.5),
        totalCost: 0,
        isPurchasedProduct: true,
        purchaseCost: newItemRate,
        quantity: 0,
        reorderLevel: 20,
        status: 'Out of stock',
        updatedAt: now,
      }
      db.products.unshift(newProd)
      setSelectedItemId(newProd.id)
      setItemName(newProd.name)
      setItemCategory(newProd.category)
      setUnit(newProd.unit)
      setUnitPrice(newProd.costPrice)
    }
    setShowInlineItemCreator(false)
    setNewItemName('')
  }

  // Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!itemName.trim() || quantity <= 0) {
      alert('Please select a valid item and enter a quantity greater than 0.')
      return
    }

    const nowIso = new Date().toISOString()
    const finalBalanceDue = Math.max(0, finalGrandTotal - amountPaid)
    const status: 'Paid' | 'Partial' | 'Unpaid' =
      amountPaid >= finalGrandTotal ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid'

    // Construct Line Item
    const lineItem: PurchaseLineItem = {
      id: initialItem?.id || `item-po-${Date.now()}`,
      itemId: selectedItemId,
      itemType: purchaseType,
      rawMaterialId: purchaseType === 'Raw Material' ? selectedItemId : undefined,
      productId: purchaseType === 'Finished Product' ? selectedItemId : undefined,
      name: itemName,
      category: itemCategory,
      quantity,
      unit,
      unitPrice,
      otherCost,
      total: finalGrandTotal,
      isManualTotal,
    }

    const savedPurchase: PurchaseItem = {
      id: purchase?.id || `po-${Date.now()}`,
      poNumber,
      purchaseNumber: poNumber,
      purchaseType,
      date,
      time,
      supplierId: isCustomSupplier ? undefined : supplierId,
      supplierName: isCustomSupplier ? supplierName : (db.suppliers.find((s) => s.id === supplierId)?.name || supplierName),
      items: [lineItem],
      quantity,
      unit,
      unitPrice,
      otherCost,
      grandTotal: finalGrandTotal,
      isManualTotalCost: isManualTotal,
      amountPaid,
      balanceDue: finalBalanceDue,
      status,
      paymentMethod,
      paymentAccount: amountPaid > 0 ? paymentAccount : undefined,
      transactionRef,
      invoiceImage,
      purchaseInvoiceImage: invoiceImage,
      paymentScreenshot,
      notes,
      createdAt: purchase?.createdAt || nowIso,
    }

    // -------------------------------------------------------------
    // DATABASE SYNCHRONIZATION (Stock, Supplier Balance, Accounts)
    // -------------------------------------------------------------
    let updatedRawMaterials = [...db.rawMaterials]
    let updatedProducts = [...db.products]
    let updatedSuppliers = [...db.suppliers]
    let updatedAccounts = [...db.accounts]
    let updatedLedgers = [...db.ledgers]

    // If Editing, first revert the previous effect of this purchase
    if (isEditing && purchase) {
      const prevType = purchase.purchaseType || 'Raw Material'
      const prevItem = purchase.items?.[0]
      const prevQty = prevItem?.quantity || purchase.quantity || 0
      const prevId = prevItem?.itemId || prevItem?.rawMaterialId || prevItem?.productId

      if (prevType === 'Raw Material') {
        updatedRawMaterials = updatedRawMaterials.map((r) => {
          if (r.id === prevId) {
            const revertedQty = Math.max(0, r.quantity - prevQty)
            return {
              ...r,
              quantity: revertedQty,
              totalReceived: Math.max(0, (r.totalReceived || r.quantity) - prevQty),
            }
          }
          return r
        })
      } else {
        updatedProducts = updatedProducts.map((p) => {
          if (p.id === prevId) {
            return { ...p, quantity: Math.max(0, p.quantity - prevQty) }
          }
          return p
        })
      }

      // Revert previous supplier balance
      if (purchase.supplierId && purchase.balanceDue > 0) {
        updatedSuppliers = updatedSuppliers.map((s) => {
          if (s.id === purchase.supplierId) {
            return { ...s, currentBalance: Math.max(0, s.currentBalance - purchase.balanceDue) }
          }
          return s
        })
      }

      // Revert previous cash account deduction
      if (purchase.amountPaid > 0 && purchase.paymentAccount) {
        updatedAccounts = updatedAccounts.map((acc) => {
          if (acc.id === purchase.paymentAccount) {
            return { ...acc, balance: acc.balance + purchase.amountPaid }
          }
          return acc
        })
      }

      // Remove previous ledger entry
      updatedLedgers = updatedLedgers.filter((l) => l.referenceId !== (purchase.poNumber || purchase.purchaseNumber))
    }

    // 1. APPLY NEW STOCK ADDITION
    if (purchaseType === 'Raw Material') {
      let matched = false
      updatedRawMaterials = updatedRawMaterials.map((r) => {
        if (r.id === selectedItemId || r.name.toLowerCase() === itemName.toLowerCase()) {
          matched = true
          const newQty = r.quantity + quantity
          const newReceived = (r.totalReceived || r.quantity) + quantity
          const costPerUnit = unitPrice + (quantity > 0 ? (otherCost / quantity) : 0)
          return {
            ...r,
            quantity: newQty,
            totalReceived: newReceived,
            unitCost,
            otherCost: otherCost > 0 ? (otherCost / quantity) : r.otherCost,
            totalCostPerUnit: costPerUnit,
            totalCost: costPerUnit * newQty,
            purchaseInvoiceImage: invoiceImage || r.purchaseInvoiceImage,
            status: 'In stock' as const,
            updatedAt: date,
          }
        }
        return r
      })

      // If raw material doesn't exist, create it
      if (!matched) {
        const newRaw: RawMaterialItem = {
          id: selectedItemId || `raw-${Date.now()}`,
          name: itemName,
          category: itemCategory as any,
          sku: `RAW-${itemName.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          unit,
          unitCost,
          otherCost: quantity > 0 ? (otherCost / quantity) : 0,
          totalCostPerUnit: unitPrice + (quantity > 0 ? (otherCost / quantity) : 0),
          totalCost: finalGrandTotal,
          totalReceived: quantity,
          totalConsumed: 0,
          quantity,
          reorderLevel: 50,
          purchaseInvoiceImage: invoiceImage,
          supplierId: isCustomSupplier ? undefined : supplierId,
          supplierName,
          status: 'In stock',
          updatedAt: date,
        }
        updatedRawMaterials.push(newRaw)
      }
    } else {
      // Finished Product
      let matched = false
      updatedProducts = updatedProducts.map((p) => {
        if (p.id === selectedItemId || p.name.toLowerCase() === itemName.toLowerCase()) {
          matched = true
          const newQty = p.quantity + quantity
          return {
            ...p,
            quantity: newQty,
            costPrice: unitPrice,
            purchaseCost: unitPrice,
            isPurchasedProduct: true,
            purchaseInvoiceImage: invoiceImage || p.purchaseInvoiceImage,
            status: 'In stock' as const,
            updatedAt: date,
          }
        }
        return p
      })

      if (!matched) {
        const newProd: ProductItem = {
          id: selectedItemId || `prod-${Date.now()}`,
          name: itemName,
          category: itemCategory,
          sku: `AFP-${itemName.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          unit,
          quantity,
          costPrice: unitPrice,
          wholesalePrice: Math.round(unitPrice * 1.3),
          wholesaleMinQty: 12,
          retailPrice: Math.round(unitPrice * 1.5),
          isPurchasedProduct: true,
          purchaseCost: unitPrice,
          purchaseInvoiceImage: invoiceImage,
          reorderLevel: 20,
          status: 'In stock',
          updatedAt: date,
        }
        updatedProducts.push(newProd)
      }
    }

    // 2. APPLY SUPPLIER PAYABLE BALANCE & LEDGER
    const currentSupplierObj = db.suppliers.find((s) => s.id === supplierId)
    if (!isCustomSupplier && currentSupplierObj) {
      if (finalBalanceDue > 0) {
        updatedSuppliers = updatedSuppliers.map((s) => {
          if (s.id === supplierId) {
            return {
              ...s,
              currentBalance: s.currentBalance + finalBalanceDue,
              updatedAt: date,
            }
          }
          return s
        })
      }

      // Add Supplier Ledger entry
      const newLedgerEntry = {
        id: `led-${Date.now()}`,
        partyId: currentSupplierObj.id,
        partyType: 'Supplier' as const,
        date,
        referenceType: 'Purchase' as const,
        referenceId: poNumber,
        description: `PO ${poNumber}: Received ${quantity} ${unit} ${itemName}`,
        debit: amountPaid,
        credit: finalGrandTotal,
        balance: currentSupplierObj.currentBalance + finalBalanceDue,
      }
      updatedLedgers.push(newLedgerEntry)
    }

    // 3. APPLY PAYMENT ACCOUNT DEDUCTION
    if (amountPaid > 0 && paymentAccount) {
      updatedAccounts = updatedAccounts.map((acc) => {
        if (acc.id === paymentAccount) {
          return {
            ...acc,
            balance: Math.max(0, acc.balance - amountPaid),
            updatedAt: date,
          }
        }
        return acc
      })
    }

    // 4. SAVE PURCHASE ORDER
    const updatedPurchases = isEditing
      ? db.purchases.map((p) => (p.id === savedPurchase.id ? savedPurchase : p))
      : [savedPurchase, ...db.purchases]

    onSave(savedPurchase, {
      ...db,
      purchases: updatedPurchases,
      rawMaterials: updatedRawMaterials,
      products: updatedProducts,
      suppliers: updatedSuppliers,
      accounts: updatedAccounts,
      ledgers: updatedLedgers,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded">
                {isEditing ? 'Update Purchase Record' : 'Inward Stock Voucher'}
              </span>
              <span className="text-xs font-mono font-bold text-stone-500">{poNumber}</span>
            </div>
            <h2 className="text-lg font-black text-stone-900 mt-0.5">
              {isEditing ? `Edit Purchase Order (${poNumber})` : 'New Purchase Order & Stock In'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* 1. Purchase Type Switcher */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              Purchase Classification *
            </label>
            <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1.5 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => handleTypeChange('Raw Material')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  purchaseType === 'Raw Material'
                    ? 'bg-white text-amber-900 shadow-xs border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Boxes className="w-4 h-4 text-amber-600" />
                <span>Raw Material (Sugar, Pulp, Preforms, Caps)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('Finished Product')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  purchaseType === 'Finished Product'
                    ? 'bg-white text-purple-900 shadow-xs border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Package className="w-4 h-4 text-purple-600" />
                <span>Finished Product (Purchased / Outsourced)</span>
              </button>
            </div>
          </div>

          {/* 2. PO Meta: PO Number, Date, Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Purchase Order (PO #) *
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 focus:bg-white focus:border-emerald-500 font-mono font-bold text-stone-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 focus:bg-white focus:border-emerald-500 font-semibold text-stone-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Delivery Time
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="10:30 AM"
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 focus:bg-white focus:border-emerald-500 font-medium text-stone-800"
              />
            </div>
          </div>

          {/* 3. Supplier Selection */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Supplier / Vendor *</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomSupplier(!isCustomSupplier)}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline"
              >
                {isCustomSupplier ? 'Select Registered Supplier' : '+ Custom / Direct Vendor Name'}
              </button>
            </div>

            {!isCustomSupplier ? (
              <select
                value={supplierId}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-stone-300 focus:border-emerald-500 font-medium text-stone-800"
                required
              >
                {db.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category}) · Bal Due: {formatPKR(s.currentBalance)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Haji Shafi Sugar Agency / Open Market Vendor"
                className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-stone-300 focus:border-emerald-500 font-medium text-stone-800"
                required
              />
            )}
          </div>

          {/* 4. Item Selection & Pricing Grid */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                {purchaseType === 'Raw Material' ? <Boxes className="w-4 h-4 text-amber-600" /> : <Package className="w-4 h-4 text-purple-600" />}
                <span>Select {purchaseType === 'Raw Material' ? 'Raw Material' : 'Product'} to Inward *</span>
              </label>
              <button
                type="button"
                onClick={() => setShowInlineItemCreator(!showInlineItemCreator)}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline"
              >
                + Create New {purchaseType === 'Raw Material' ? 'Material' : 'Product'} Inline
              </button>
            </div>

            {/* Inline Quick Item Creator Modal */}
            {showInlineItemCreator && (
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span>Quick Add New {purchaseType}</span>
                  <button type="button" onClick={() => setShowInlineItemCreator(false)} className="text-emerald-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Item Name (e.g. PET Preforms 1.5L)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Unit (kg, Cartons, Pcs)"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 font-medium"
                  />
                  <input
                    type="number"
                    placeholder="Unit Rate (Rs)"
                    value={newItemRate}
                    onChange={(e) => setNewItemRate(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 font-medium"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateInlineItem}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold"
                >
                  Save Item & Select
                </button>
              </div>
            )}

            {/* Dropdown of existing items */}
            <select
              value={selectedItemId}
              onChange={(e) => handleItemSelect(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-stone-300 focus:border-emerald-500 font-medium text-stone-800"
              required
            >
              {purchaseType === 'Raw Material'
                ? db.rawMaterials.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · ({r.category}) · In Stock: {r.quantity} {r.unit} · Last Cost: Rs. {r.unitCost}
                    </option>
                  ))
                : db.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · ({p.category}) · Stock: {p.quantity} {p.unit} · Cost: Rs. {p.costPrice || p.purchaseCost || 0}
                    </option>
                  ))}
            </select>

            {/* Quantity, Unit, Price, Other Costs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Quantity Purchased *
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-stone-300 focus:border-emerald-500 font-bold text-stone-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Unit Measurement *
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-stone-300 focus:border-emerald-500 font-bold text-stone-800"
                >
                  <option value="kg">kg (Kilograms)</option>
                  <option value="g">g (Grams)</option>
                  <option value="L">L (Liters)</option>
                  <option value="ml">ml (Milliliters)</option>
                  <option value="Cartons">Cartons</option>
                  <option value="Pcs">Pcs / Pieces</option>
                  <option value="Bottles">Bottles</option>
                  <option value="Boxes">Boxes</option>
                  <option value="Jars">Jars</option>
                  <option value="Packs">Packs</option>
                  <option value="Bags">Bags (50kg / 25kg)</option>
                  <option value="Drums">Drums (200L)</option>
                  <option value="Rolls">Rolls</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Rate / Unit (Rs) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-stone-300 focus:border-emerald-500 font-bold text-stone-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Other / Transport Cost (Rs)
                </label>
                <input
                  type="number"
                  min="0"
                  value={otherCost}
                  onChange={(e) => setOtherCost(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-stone-300 focus:border-emerald-500 font-medium text-stone-800"
                />
              </div>
            </div>
          </div>

          {/* 5. Total Cost Calculation & Manual Override Toggle */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-stone-600">Calculated Purchase Total:</div>
              <div className="text-xl font-black text-emerald-800">{formatPKR(finalGrandTotal)}</div>
              <div className="text-[11px] text-stone-500">
                ({quantity} {unit} × Rs. {unitPrice}) + Rs. {otherCost || 0} other costs
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isManualTotal}
                  onChange={(e) => {
                    setIsManualTotal(e.target.checked)
                    if (!e.target.checked) setManualGrandTotal(computedTotal)
                  }}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                <span>Override Total Manually</span>
              </label>

              {isManualTotal && (
                <input
                  type="number"
                  value={manualGrandTotal}
                  onChange={(e) => setManualGrandTotal(Number(e.target.value))}
                  className="w-32 px-2.5 py-1 rounded-lg text-xs bg-white border border-emerald-400 font-bold text-emerald-900"
                  placeholder="Total Rs"
                />
              )}
            </div>
          </div>

          {/* 6. Payment Settlement & Mode */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Payment Settlement & Mode</span>
              </label>
              <button
                type="button"
                onClick={handlePayFull}
                className="px-2 py-0.5 rounded text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 cursor-pointer"
              >
                Pay Full (Rs. {finalGrandTotal.toLocaleString()})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Amount Paid Now (Rs) *
                </label>
                <input
                  type="number"
                  min="0"
                  max={finalGrandTotal}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-stone-300 focus:border-emerald-500 font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-stone-300 focus:border-emerald-500 font-medium text-stone-800"
                >
                  <option value="Bank Transfer">Bank Transfer / IBFT</option>
                  <option value="Cash">Cash in Hand</option>
                  <option value="Card">Corporate Debit Card</option>
                  <option value="Online">Online / Raast QR</option>
                  <option value="Cheque">Bank Clearing Cheque</option>
                  <option value="Credit">100% Credit (Pay Later)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Disbursed From Account
                </label>
                <select
                  value={paymentAccount}
                  onChange={(e) => setPaymentAccount(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-stone-300 focus:border-emerald-500 font-medium text-stone-800"
                >
                  {db.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Bal: {formatPKR(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Remaining Payable Due Notice */}
            <div className="flex items-center justify-between text-xs pt-1 px-1">
              <span className="font-bold text-stone-600">Remaining Balance Payable:</span>
              <span className={`font-bold ${finalGrandTotal - amountPaid > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatPKR(Math.max(0, finalGrandTotal - amountPaid))}
              </span>
            </div>
          </div>

          {/* 7. Image Attachments: Invoice Slip & Payment Screenshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Purchase Invoice Attachment */}
            <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                Supplier Invoice / Bilty Image
              </label>
              {invoiceImage ? (
                <div className="relative group rounded-lg overflow-hidden border border-stone-300 h-28 bg-white flex items-center justify-center">
                  <img src={invoiceImage} alt="Invoice" className="h-full w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setInvoiceImage('')}
                    className="absolute top-1 right-1 p-1 rounded bg-rose-600 text-white opacity-90 hover:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
                  <ImageIcon className="w-6 h-6 text-stone-400 mb-1" />
                  <span className="text-[11px] font-bold text-stone-600">Attach Invoice Bill Photo</span>
                  <span className="text-[9px] text-stone-400">Stored offline in local database</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'invoice')}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Payment Proof Attachment */}
            <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                Payment Proof / Screenshot
              </label>
              {paymentScreenshot ? (
                <div className="relative group rounded-lg overflow-hidden border border-stone-300 h-28 bg-white flex items-center justify-center">
                  <img src={paymentScreenshot} alt="Payment Receipt" className="h-full w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setPaymentScreenshot('')}
                    className="absolute top-1 right-1 p-1 rounded bg-rose-600 text-white opacity-90 hover:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
                  <CreditCard className="w-6 h-6 text-stone-400 mb-1" />
                  <span className="text-[11px] font-bold text-stone-600">Attach Online / Bank Slip</span>
                  <span className="text-[9px] text-stone-400">Stored offline in local database</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'payment')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* 8. Transaction Ref & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Transaction / Cheque / Raast Ref #
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. RAAST-88219 / CHQ-00192"
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 focus:bg-white focus:border-emerald-500 font-mono font-medium text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Vehicle / Driver / Remarks
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Bedford Truck # LE-8812, Quality approved"
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 border border-stone-200 focus:bg-white focus:border-emerald-500 font-medium text-stone-800"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition-all shadow-xs cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 stroke-[3]" />
              <span>{isEditing ? 'Save Changes & Sync Stock' : 'Receive Materials & Inflow Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ==========================================================================
   PURCHASE DETAIL MODAL (PRINTABLE PO VOUCHER)
   ========================================================================== */

function PurchaseDetailModal({
  purchase,
  supplier,
  onClose,
  onEdit,
  onDelete,
  onOpenImage,
}: {
  purchase: PurchaseItem
  supplier?: SupplierItem
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onOpenImage: (src: string, title: string) => void
}) {
  const poNum = purchase.poNumber || purchase.purchaseNumber || 'PO-' + purchase.id
  const pType = purchase.purchaseType || 'Raw Material'

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-emerald-100 text-emerald-900 uppercase">
              Purchase Voucher
            </span>
            <span className="font-mono font-bold text-stone-600 text-xs">{poNum}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-stone-700 bg-stone-200/70 hover:bg-stone-300 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print PO</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto" id="printable-purchase-voucher">
          {/* Brand & Supplier Heading */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 pb-4 border-b border-stone-200">
            <div>
              <h3 className="text-base font-black text-stone-900 tracking-tight">AL FAROOQ FOODS (PVT) LTD</h3>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                Beverage & Confectionery Plant, Sheikhupura Road, Lahore
              </p>
              <p className="text-xs text-stone-500 font-medium">NTN: 8821934-1 · STRN: 3277876123456</p>
            </div>
            <div className="sm:text-right">
              <div className="text-xs text-stone-400 font-bold uppercase tracking-wider">Purchase Order No</div>
              <div className="text-base font-black text-stone-900 font-mono">{poNum}</div>
              <div className="text-xs text-stone-600 font-semibold mt-0.5">
                Date: {formatDate(purchase.date)} {purchase.time ? `· ${purchase.time}` : ''}
              </div>
            </div>
          </div>

          {/* Supplier Info & Purchase Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Supplier Details
              </span>
              <strong className="text-sm font-bold text-stone-900 block">{purchase.supplierName}</strong>
              {supplier ? (
                <div className="text-stone-600 space-y-0.5 mt-1 font-medium">
                  <div>Contact: {supplier.contactPerson || 'Sales Agent'}</div>
                  <div>Phone: {supplier.phone} · City: {supplier.city}</div>
                  <div>Address: {supplier.address}</div>
                </div>
              ) : (
                <div className="text-stone-500 mt-1">Direct Procurement</div>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Shipment Information
              </span>
              <div className="space-y-1 font-medium text-stone-700">
                <div className="flex justify-between">
                  <span>Purchase Type:</span>
                  <span className="font-bold text-stone-900">{pType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Mode:</span>
                  <span className="font-bold text-stone-900">{purchase.paymentMethod}</span>
                </div>
                {purchase.transactionRef && (
                  <div className="flex justify-between">
                    <span>Reference / Cheque:</span>
                    <span className="font-mono font-bold text-stone-900">{purchase.transactionRef}</span>
                  </div>
                )}
                {purchase.notes && (
                  <div className="flex justify-between">
                    <span>Vehicle / Remarks:</span>
                    <span className="font-semibold text-stone-800">{purchase.notes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Itemized Breakdown</h4>
            <div className="rounded-xl border border-stone-200 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-100 text-stone-600 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate</th>
                    <th className="py-2.5 px-3 text-right">Other Costs</th>
                    <th className="py-2.5 px-3 text-right">Total (Rs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {(purchase.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-stone-900">{item.name}</div>
                        <div className="text-[10px] text-stone-500">{item.category || pType}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-stone-900">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-stone-800">
                        Rs. {item.unitPrice?.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-stone-600">
                        {item.otherCost ? formatPKR(item.otherCost) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-stone-900">
                        {formatPKR(item.total || item.quantity * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600 font-medium">
              <span>Grand Total Amount:</span>
              <span className="font-bold text-stone-900 text-sm">{formatPKR(purchase.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Amount Paid:</span>
              <span>{formatPKR(purchase.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-amber-800 font-bold border-t border-stone-200 pt-1.5 text-sm">
              <span>Balance Payable:</span>
              <span>{formatPKR(purchase.balanceDue)}</span>
            </div>
          </div>

          {/* Attached Images */}
          {(purchase.invoiceImage || purchase.paymentScreenshot) && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                Attached Digital Records
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {purchase.invoiceImage && (
                  <div
                    onClick={() => onOpenImage(purchase.invoiceImage!, `Invoice: ${poNum}`)}
                    className="group relative h-32 rounded-xl border border-stone-300 overflow-hidden bg-stone-100 flex items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors"
                  >
                    <img src={purchase.invoiceImage} alt="Invoice" className="h-full w-full object-contain" />
                    <div className="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white text-xs font-bold transition-opacity">
                      <Maximize2 className="w-4 h-4" />
                      <span>View Invoice Slip</span>
                    </div>
                  </div>
                )}
                {purchase.paymentScreenshot && (
                  <div
                    onClick={() => onOpenImage(purchase.paymentScreenshot!, `Payment Slip: ${poNum}`)}
                    className="group relative h-32 rounded-xl border border-stone-300 overflow-hidden bg-stone-100 flex items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors"
                  >
                    <img src={purchase.paymentScreenshot} alt="Payment" className="h-full w-full object-contain" />
                    <div className="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white text-xs font-bold transition-opacity">
                      <Maximize2 className="w-4 h-4" />
                      <span>View Payment Slip</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-stone-50">
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Record</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-stone-700 bg-stone-200 hover:bg-stone-300 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Record</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   IMAGE VIEWER MODAL (FULL RESOLUTION ZOOM)
   ========================================================================== */

function ImageViewerModal({
  src,
  title,
  onClose,
}: {
  src: string
  title: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative max-w-4xl max-h-[90vh] bg-stone-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-stone-700">
        <div className="flex items-center justify-between px-4 py-3 bg-stone-950 border-b border-stone-800 text-white">
          <span className="text-xs font-bold truncate">{title}</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 flex items-center justify-center overflow-auto max-h-[80vh]">
          <img src={src} alt={title} className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-lg" />
        </div>
      </div>
    </div>
  )
}
