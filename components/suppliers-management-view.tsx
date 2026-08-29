'use client'

import React, { useState, useMemo } from 'react'
import {
  Truck,
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
  Boxes,
  Package,
  TrendingUp,
  Receipt,
  DollarSign,
  ArrowLeft,
  Eye,
  Image as ImageIcon,
  Printer,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Upload,
  ChevronRight,
  Layers,
  Sparkles,
  Tag,
  Palette,
  Check,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  type AppDatabase,
  type SupplierItem,
  type SupplierSupplyCategory,
  type SupplierPaymentRecord,
  type PurchaseItem,
  type LedgerEntry,
  type RawMaterialItem,
  type ProductItem,
  type CategoryItem,
  defaultSupplierCategories,
} from '@/lib/db'
import {
  generateLedgerPDF,
  generateSupplierDealReceiptPDF,
  exportToCSV,
} from '@/lib/pdf-export'

export const SUPPLIER_CATEGORY_COLORS = [
  { id: 'emerald', label: 'Emerald (Raw Material)', class: 'bg-emerald-600 text-white', dot: 'bg-emerald-600' },
  { id: 'blue', label: 'Blue (Packaging)', class: 'bg-blue-600 text-white', dot: 'bg-blue-600' },
  { id: 'indigo', label: 'Indigo (Finished Goods)', class: 'bg-indigo-600 text-white', dot: 'bg-indigo-600' },
  { id: 'purple', label: 'Purple (Machinery)', class: 'bg-purple-600 text-white', dot: 'bg-purple-600' },
  { id: 'teal', label: 'Teal (Services)', class: 'bg-teal-600 text-white', dot: 'bg-teal-600' },
  { id: 'amber', label: 'Amber / Orange', class: 'bg-amber-600 text-white', dot: 'bg-amber-600' },
  { id: 'rose', label: 'Rose / Red', class: 'bg-rose-600 text-white', dot: 'bg-rose-600' },
  { id: 'sky', label: 'Sky / Cyan', class: 'bg-sky-600 text-white', dot: 'bg-sky-600' },
  { id: 'stone', label: 'Stone / Gray', class: 'bg-stone-700 text-white', dot: 'bg-stone-700' },
]

export function getSupplierCategoryBadgeClass(categoryName?: string, categories?: CategoryItem[]) {
  const cat = (categoryName || '').trim()
  const matched = categories?.find((c) => c.name.toLowerCase() === cat.toLowerCase())
  const color = matched?.color?.toLowerCase()

  if (color === 'emerald' || color === 'green') return 'bg-emerald-600 text-white'
  if (color === 'blue') return 'bg-blue-600 text-white'
  if (color === 'indigo') return 'bg-indigo-600 text-white'
  if (color === 'purple') return 'bg-purple-600 text-white'
  if (color === 'teal') return 'bg-teal-600 text-white'
  if (color === 'amber' || color === 'orange') return 'bg-amber-600 text-white'
  if (color === 'rose' || color === 'red') return 'bg-rose-600 text-white'
  if (color === 'sky' || color === 'cyan') return 'bg-sky-600 text-white'
  if (color === 'stone' || color === 'gray') return 'bg-stone-700 text-white'

  // Fallbacks based on category naming keywords
  const lower = cat.toLowerCase()
  if (lower.includes('raw') || lower.includes('sugar') || lower.includes('ingredient')) return 'bg-emerald-600 text-white'
  if (lower.includes('packag') || lower.includes('preform') || lower.includes('bottle') || lower.includes('carton') || lower.includes('label')) return 'bg-blue-600 text-white'
  if (lower.includes('finish') || lower.includes('trade') || lower.includes('product')) return 'bg-indigo-600 text-white'
  if (lower.includes('machin') || lower.includes('equipment') || lower.includes('compressor')) return 'bg-purple-600 text-white'
  if (lower.includes('service') || lower.includes('maint') || lower.includes('transport')) return 'bg-teal-600 text-white'
  return 'bg-stone-700 text-white'
}

interface SuppliersManagementViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigate?: (module: string, subTab?: string) => void
}

export default function SuppliersManagementView({
  db,
  onSaveDatabase,
  onNavigate,
}: SuppliersManagementViewProps) {
  // Navigation / Selected Supplier
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'deals' | 'ledger' | 'payments' | 'materials'>('deals')

  // Dynamic Supplier Categories
  const supplierCategories: CategoryItem[] = useMemo(() => {
    return db.supplierCategories && db.supplierCategories.length > 0
      ? db.supplierCategories
      : defaultSupplierCategories
  }, [db.supplierCategories])

  // Search & Filters in List View
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'outstanding' | 'settled'>('all')

  // Modals
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null)
  const [isRecordingPayment, setIsRecordingPayment] = useState<SupplierItem | null>(null)
  const [isCreatingDeal, setIsCreatingDeal] = useState<SupplierItem | null>(null)
  const [viewingDeal, setViewingDeal] = useState<PurchaseItem | null>(null)
  const [isManagingCategories, setIsManagingCategories] = useState(false)
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null)

  // Current Selected Supplier Profile
  const selectedSupplier = useMemo(() => {
    if (!selectedSupplierId) return null
    return db.suppliers.find((s) => s.id === selectedSupplierId) || null
  }, [db.suppliers, selectedSupplierId])

  // Normalizes Supply Category for Filter & Display
  const normalizeCategory = (category?: string, supplyCat?: string): 'Raw Material' | 'Product' | 'Both' => {
    const target = (supplyCat || category || '').toLowerCase()
    if (target.includes('both')) return 'Both'
    if (target.includes('product') || target.includes('finished') || target.includes('bottle') || target.includes('cap')) return 'Product'
    return 'Raw Material'
  }

  // Filtered Suppliers List
  const filteredSuppliers = useMemo(() => {
    return db.suppliers.filter((s) => {
      // Category Filter (by dynamic supplier category name or legacy category)
      if (categoryFilter !== 'all') {
        const sCat = (s.category || '').toLowerCase()
        const target = categoryFilter.toLowerCase()
        const normCat = normalizeCategory(s.category, s.supplyCategory).toLowerCase()
        if (sCat !== target && normCat !== target) return false
      }

      // Balance Filter
      if (balanceFilter === 'outstanding' && s.currentBalance <= 0) return false
      if (balanceFilter === 'settled' && s.currentBalance > 0) return false

      // Search Query
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true

      const nameMatch = (s.name || '').toLowerCase().includes(q)
      const contactMatch = (s.contactPerson || '').toLowerCase().includes(q)
      const catMatch = (s.category || '').toLowerCase().includes(q)
      const phoneMatch = (s.phone || '').includes(q) || (s.altPhone || '').includes(q)
      const addressMatch = (s.address || '').toLowerCase().includes(q) || (s.city || '').toLowerCase().includes(q)

      return nameMatch || contactMatch || catMatch || phoneMatch || addressMatch
    })
  }, [db.suppliers, searchQuery, categoryFilter, balanceFilter])

  // Metrics Overview for Suppliers Hub
  const metrics = useMemo(() => {
    const totalCount = db.suppliers.length
    const totalPayables = db.suppliers.reduce((acc, s) => acc + (s.currentBalance > 0 ? s.currentBalance : 0), 0)
    const rawVendors = db.suppliers.filter((s) => normalizeCategory(s.category, s.supplyCategory) === 'Raw Material').length
    const productVendors = db.suppliers.filter((s) => normalizeCategory(s.category, s.supplyCategory) === 'Product').length
    const bothVendors = db.suppliers.filter((s) => normalizeCategory(s.category, s.supplyCategory) === 'Both').length

    return { totalCount, totalPayables, rawVendors, productVendors, bothVendors }
  }, [db.suppliers])

  // Full Deal / Purchase History for Selected Supplier (Auto-pulled from Purchases module)
  const supplierDeals = useMemo(() => {
    if (!selectedSupplier) return []
    return db.purchases
      .filter((p) => p.supplierId === selectedSupplier.id || p.supplierName?.toLowerCase() === selectedSupplier.name.toLowerCase())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [selectedSupplier, db.purchases])

  // Supplier Financial Calculations (Auto-calculated across all deals & payments)
  const supplierFinancials = useMemo(() => {
    if (!selectedSupplier) return { totalDealsValue: 0, totalPaid: 0, balanceDue: 0 }

    const dealsGrandTotal = supplierDeals.reduce((sum, d) => sum + (d.grandTotal || 0), 0)
    const dealsPaid = supplierDeals.reduce((sum, d) => sum + (d.amountPaid || 0), 0)

    const extraPayments = (selectedSupplier.paymentRecords || []).reduce((sum, p) => sum + (p.amount || 0), 0)

    const totalDealsValue = (selectedSupplier.openingBalance || 0) + dealsGrandTotal
    const totalPaid = dealsPaid + extraPayments
    const balanceDue = Math.max(0, selectedSupplier.currentBalance)

    return { totalDealsValue, totalPaid, balanceDue }
  }, [selectedSupplier, supplierDeals])

  // Chronological Running Ledger for Selected Supplier
  const supplierLedgers = useMemo(() => {
    if (!selectedSupplier) return []
    const rawEntries = db.ledgers.filter((l) => l.partyId === selectedSupplier.id)

    if (rawEntries.length > 0) {
      return [...rawEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    // Auto-generate chronological ledger from deals and payments
    const generated: LedgerEntry[] = []
    let runningBalance = selectedSupplier.openingBalance || 0

    if (selectedSupplier.openingBalance > 0) {
      generated.push({
        id: `led-sup-op-${selectedSupplier.id}`,
        partyId: selectedSupplier.id,
        partyType: 'Supplier',
        date: selectedSupplier.createdAt || '2026-08-01',
        referenceType: 'Opening',
        referenceId: 'OP-BAL',
        description: 'Opening Balance Payable Carried Forward',
        debit: 0,
        credit: selectedSupplier.openingBalance,
        balance: runningBalance,
      })
    }

    // Add Deals / Purchases
    supplierDeals.forEach((deal) => {
      runningBalance += deal.grandTotal
      generated.push({
        id: `led-deal-${deal.id}`,
        partyId: selectedSupplier.id,
        partyType: 'Supplier',
        date: deal.date,
        referenceType: 'Purchase',
        referenceId: deal.poNumber || deal.purchaseNumber || 'PO-DEAL',
        description: `Purchase Order / Deal #${deal.poNumber} (${(deal.items || []).length} items)`,
        debit: 0,
        credit: deal.grandTotal,
        balance: runningBalance,
      })

      if (deal.amountPaid > 0) {
        runningBalance -= deal.amountPaid
        generated.push({
          id: `led-pay-deal-${deal.id}`,
          partyId: selectedSupplier.id,
          partyType: 'Supplier',
          date: deal.date,
          referenceType: 'Payment',
          referenceId: `VOUCHER-${deal.poNumber}`,
          description: `Disbursement paid against #${deal.poNumber} via ${deal.paymentMethod || 'Cash'}`,
          debit: deal.amountPaid,
          credit: 0,
          balance: runningBalance,
        })
      }
    })

    // Add standalone payments
    ;(selectedSupplier.paymentRecords || []).forEach((pay) => {
      runningBalance -= pay.amount
      generated.push({
        id: `led-pay-sup-${pay.id}`,
        partyId: selectedSupplier.id,
        partyType: 'Supplier',
        date: pay.date,
        referenceType: 'Payment',
        referenceId: pay.receiptNumber,
        description: `Direct Payment Disbursement #${pay.receiptNumber} (${pay.paymentMethod}) ${pay.notes ? '- ' + pay.notes : ''}`,
        debit: pay.amount,
        credit: 0,
        balance: runningBalance,
      })
    })

    return generated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [selectedSupplier, db.ledgers, supplierDeals])

  // Delete Supplier
  const handleDeleteSupplier = (supplierId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${name}"? All associated local records will be deleted.`)) return

    const updatedSuppliers = db.suppliers.filter((s) => s.id !== supplierId)
    const updatedLedgers = db.ledgers.filter((l) => l.partyId !== supplierId)

    onSaveDatabase({
      ...db,
      suppliers: updatedSuppliers,
      ledgers: updatedLedgers,
    })

    if (selectedSupplierId === supplierId) {
      setSelectedSupplierId(null)
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Supplier / Company', 'Contact Person', 'Supply Category', 'Phone', 'City', 'Opening Bal', 'Outstanding Payable', 'Status']
    const rows = filteredSuppliers.map((s) => [
      s.supplierCode || s.id,
      s.name,
      s.contactPerson,
      normalizeCategory(s.category, s.supplyCategory),
      s.phone,
      s.city,
      s.openingBalance,
      s.currentBalance,
      s.status,
    ])
    exportToCSV(`Suppliers_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  // Save Supplier Payment
  const handleSavePayment = (paymentData: {
    amount: number
    date: string
    paymentMethod: 'Cash' | 'Card' | 'Online' | 'Bank Transfer' | 'Cheque'
    paymentAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank'
    transactionRef: string
    receiptImage?: string
    purchaseId?: string
    notes: string
  }) => {
    if (!isRecordingPayment) return
    const sup = isRecordingPayment

    const receiptNumber = `VOUCH-2026-${String(Math.floor(1000 + Math.random() * 9000))}`
    const newRecord: SupplierPaymentRecord = {
      id: `spay-${Date.now()}`,
      receiptNumber,
      date: paymentData.date,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      paymentAccount: paymentData.paymentAccount,
      transactionRef: paymentData.transactionRef,
      receiptImage: paymentData.receiptImage,
      purchaseId: paymentData.purchaseId,
      notes: paymentData.notes,
      createdAt: new Date().toISOString(),
    }

    const updatedBalance = Math.max(0, sup.currentBalance - paymentData.amount)
    const updatedRecords = [newRecord, ...(sup.paymentRecords || [])]

    // Create Ledger entry
    const newLedgerEntry: LedgerEntry = {
      id: `led-${Date.now()}`,
      partyId: sup.id,
      partyType: 'Supplier',
      date: paymentData.date,
      referenceType: 'Payment',
      referenceId: receiptNumber,
      description: `Payment paid to supplier (${paymentData.paymentMethod}) ${paymentData.transactionRef ? 'Ref: ' + paymentData.transactionRef : ''}`,
      debit: paymentData.amount,
      credit: 0,
      balance: updatedBalance,
    }

    // Update Supplier
    const updatedSuppliers = db.suppliers.map((s) =>
      s.id === sup.id
        ? {
            ...s,
            currentBalance: updatedBalance,
            paymentRecords: updatedRecords,
            updatedAt: new Date().toISOString().slice(0, 10),
          }
        : s
    )

    // Deduct from Cash/Bank Account
    const updatedAccounts = db.accounts.map((acc) => {
      if (acc.id === paymentData.paymentAccount) {
        return { ...acc, balance: acc.balance - paymentData.amount, updatedAt: paymentData.date }
      }
      return acc
    })

    onSaveDatabase({
      ...db,
      suppliers: updatedSuppliers,
      ledgers: [...db.ledgers, newLedgerEntry],
      accounts: updatedAccounts,
    })

    setIsRecordingPayment(null)
  }

  // Record New Deal / Purchase Handler
  const handleSaveDeal = (dealData: {
    dealType: 'Raw Material' | 'Finished Product'
    itemId: string
    itemName: string
    quantity: number
    unit: string
    unitPrice: number
    otherCost: number
    grandTotal: number
    amountPaid: number
    paymentMethod: any
    paymentAccount: any
    transactionRef: string
    paymentScreenshot?: string
    invoiceImage?: string
    notes: string
    date: string
  }) => {
    if (!isCreatingDeal) return
    const sup = isCreatingDeal

    const poNumber = `PO-2026-${String(db.purchases.length + 1010)}`
    const balanceDue = Math.max(0, dealData.grandTotal - dealData.amountPaid)
    const dealStatus = balanceDue === 0 ? 'Paid' : dealData.amountPaid > 0 ? 'Partial' : 'Unpaid'

    const newPurchase: PurchaseItem = {
      id: `pur-${Date.now()}`,
      poNumber,
      purchaseNumber: poNumber,
      purchaseType: dealData.dealType,
      date: dealData.date,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      supplierId: sup.id,
      supplierName: sup.name,
      items: [
        {
          id: `pitem-${Date.now()}`,
          itemId: dealData.itemId,
          itemType: dealData.dealType,
          name: dealData.itemName,
          quantity: dealData.quantity,
          unit: dealData.unit,
          unitPrice: dealData.unitPrice,
          otherCost: dealData.otherCost,
          total: dealData.grandTotal,
        },
      ],
      quantity: dealData.quantity,
      unit: dealData.unit,
      unitPrice: dealData.unitPrice,
      otherCost: dealData.otherCost,
      grandTotal: dealData.grandTotal,
      amountPaid: dealData.amountPaid,
      balanceDue,
      status: dealStatus,
      paymentStatus: dealStatus,
      paymentMethod: dealData.paymentMethod,
      paymentAccount: dealData.paymentAccount,
      transactionRef: dealData.transactionRef,
      paymentScreenshot: dealData.paymentScreenshot,
      invoiceImage: dealData.invoiceImage,
      notes: dealData.notes,
      createdAt: new Date().toISOString(),
    }

    // Auto-update raw material or product inventory
    let updatedRawMaterials = db.rawMaterials
    let updatedProducts = db.products

    if (dealData.dealType === 'Raw Material') {
      updatedRawMaterials = db.rawMaterials.map((r) => {
        if (r.id === dealData.itemId || r.name.toLowerCase() === dealData.itemName.toLowerCase()) {
          const newQty = (r.quantity || 0) + dealData.quantity
          const price = dealData.unitPrice || r.unitPrice || r.unitCost || 0
          return {
            ...r,
            quantity: newQty,
            unitPrice: price,
            totalCost: newQty * price,
            updatedAt: dealData.date,
          }
        }
        return r
      })
    } else {
      updatedProducts = db.products.map((p) => {
        if (p.id === dealData.itemId || p.name.toLowerCase() === dealData.itemName.toLowerCase()) {
          const newQty = (p.quantity || 0) + dealData.quantity
          return {
            ...p,
            quantity: newQty,
            costPrice: dealData.unitPrice || p.costPrice,
            totalCost: newQty * (dealData.unitPrice || p.costPrice),
            status: 'In stock',
            updatedAt: dealData.date,
          }
        }
        return p
      })
    }

    // Update Supplier Balance
    const updatedBalance = sup.currentBalance + balanceDue
    const updatedSuppliers = db.suppliers.map((s) =>
      s.id === sup.id ? { ...s, currentBalance: updatedBalance, updatedAt: dealData.date } : s
    )

    // Deduct Paid Amount from Bank Account
    const updatedAccounts = db.accounts.map((acc) => {
      if (acc.id === dealData.paymentAccount && dealData.amountPaid > 0) {
        return { ...acc, balance: acc.balance - dealData.amountPaid, updatedAt: dealData.date }
      }
      return acc
    })

    // Create Ledger entries
    const ledgerEntries: LedgerEntry[] = [
      {
        id: `led-${Date.now()}-1`,
        partyId: sup.id,
        partyType: 'Supplier',
        date: dealData.date,
        referenceType: 'Purchase',
        referenceId: poNumber,
        description: `Deal / Purchase #${poNumber} (${dealData.quantity} ${dealData.unit} ${dealData.itemName})`,
        debit: 0,
        credit: dealData.grandTotal,
        balance: sup.currentBalance + dealData.grandTotal,
      },
    ]

    if (dealData.amountPaid > 0) {
      ledgerEntries.push({
        id: `led-${Date.now()}-2`,
        partyId: sup.id,
        partyType: 'Supplier',
        date: dealData.date,
        referenceType: 'Payment',
        referenceId: `VOUCHER-${poNumber}`,
        description: `Paid for #${poNumber} via ${dealData.paymentMethod}`,
        debit: dealData.amountPaid,
        credit: 0,
        balance: updatedBalance,
      })
    }

    onSaveDatabase({
      ...db,
      purchases: [newPurchase, ...db.purchases],
      rawMaterials: updatedRawMaterials,
      products: updatedProducts,
      suppliers: updatedSuppliers,
      accounts: updatedAccounts,
      ledgers: [...db.ledgers, ...ledgerEntries],
    })

    setIsCreatingDeal(null)
  }

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* VIEW A: SUPPLIERS LIST VIEW */}
      {/* ========================================================================= */}
      {!selectedSupplier && (
        <>
          {/* Header Card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  <Truck className="w-3.5 h-3.5" /> Vendor & Procurement Hub
                </span>
              </div>
              <h1 className="text-2xl font-black text-stone-900 mt-1">Suppliers & Vendors</h1>
              <p className="text-xs text-stone-600 mt-0.5">
                Manage all suppliers of raw materials and finished products, track running ledgers, deal history, receipts, and offline payments.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="button secondary"
                onClick={() => setIsManagingCategories(true)}
                title="Manage Supplier Type Categories"
              >
                <Tag className="w-4 h-4" /> Manage Categories
              </button>
              <button className="button secondary" onClick={handleExportCSV} title="Export CSV">
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button className="button primary" onClick={() => setIsCreatingSupplier(true)}>
                <Plus className="w-4 h-4 stroke-[3]" /> Add New Supplier
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="metric-card">
              <span className="metric-label">Total Suppliers</span>
              <strong className="metric-value text-stone-900">{metrics.totalCount}</strong>
              <span className="metric-sub">Registered vendors</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Raw Material Vendors</span>
              <strong className="metric-value text-blue-700">{metrics.rawVendors}</strong>
              <span className="metric-sub">Sugar, pulps, chemicals</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Packaging & Products</span>
              <strong className="metric-value text-emerald-700">{metrics.productVendors + metrics.bothVendors}</strong>
              <span className="metric-sub">PET preforms, bottles, boxes</span>
            </div>
            <div className="metric-card col-span-2 md:col-span-1 bg-amber-50/50 border-amber-200">
              <span className="metric-label text-amber-800">Total Outstanding Payables</span>
              <strong className="metric-value text-amber-900">{formatPKR(metrics.totalPayables)}</strong>
              <span className="metric-sub text-amber-700">Payable to suppliers</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="panel p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="search-box max-w-md w-full">
              <Search className="w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search by company name, contact, category, city..."
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
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 focus:outline-none"
              >
                <option value="all">All Vendor Categories ({db.suppliers.length})</option>
                {supplierCategories.map((c) => {
                  const count = db.suppliers.filter(
                    (s) =>
                      (s.category || '').toLowerCase() === c.name.toLowerCase() ||
                      normalizeCategory(s.category, s.supplyCategory).toLowerCase() === c.name.toLowerCase()
                  ).length
                  return (
                    <option key={c.id} value={c.name}>
                      {c.name} ({count})
                    </option>
                  )
                })}
              </select>

              {/* Balance Filter */}
              <select
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value as any)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 focus:outline-none"
              >
                <option value="all">All Payables</option>
                <option value="outstanding">Outstanding Payable (&gt; 0)</option>
                <option value="settled">Settled / Clear (Rs 0)</option>
              </select>
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="panel table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Supplier / Company</th>
                    <th>Contact Person</th>
                    <th>Vendor Category</th>
                    <th>Phone / WhatsApp</th>
                    <th>Address & City</th>
                    <th>Opening Bal.</th>
                    <th>Outstanding Payable</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((s) => {
                    const badgeClass = getSupplierCategoryBadgeClass(s.category, supplierCategories)

                    return (
                      <tr key={s.id} className="hover:bg-stone-50/70 transition-colors">
                        <td>
                          <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => setSelectedSupplierId(s.id)}
                          >
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shadow-2xs">
                              {s.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-stone-900 group-hover:text-primary transition-colors flex items-center gap-1.5">
                                <span>{s.name}</span>
                                {s.supplierCode && (
                                  <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded font-mono font-normal">
                                    {s.supplierCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-500 font-medium">{s.city || 'Supplier'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="font-semibold text-stone-800 text-xs">{s.contactPerson || '—'}</td>
                        <td>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md shadow-2xs ${badgeClass}`}
                          >
                            <Tag className="w-3 h-3 opacity-80" />
                            {s.category || 'Raw Material Supplier'}
                          </span>
                        </td>
                        <td>
                          <div className="text-xs font-mono font-semibold text-stone-800 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-stone-400" />
                            {s.phone}
                          </div>
                        </td>
                        <td>
                          <div className="text-xs text-stone-700 max-w-[180px] truncate" title={s.address}>
                            {s.city && <span className="font-bold text-stone-900">{s.city}, </span>}
                            {s.address || '—'}
                          </div>
                        </td>
                        <td className="text-xs text-stone-600 font-medium">{formatPKR(s.openingBalance)}</td>
                        <td>
                          <strong
                            className={`text-xs ${
                              s.currentBalance > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-semibold'
                            }`}
                          >
                            {formatPKR(s.currentBalance)}
                          </strong>
                        </td>
                        <td>
                          <div className="row-actions justify-end">
                            <button
                              className="row-action text-primary"
                              title="View Profile & Deals"
                              onClick={() => setSelectedSupplierId(s.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="row-action text-emerald-700"
                              title="Record Payment Voucher"
                              onClick={() => setIsRecordingPayment(s)}
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                            <button
                              className="row-action"
                              title="Edit Supplier"
                              onClick={() => setEditingSupplier(s)}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              className="row-action danger"
                              title="Delete Supplier"
                              onClick={() => handleDeleteSupplier(s.id, s.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredSuppliers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-stone-400">
                        <Truck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-stone-600">No suppliers found.</p>
                        <p className="text-xs text-stone-400 mt-0.5">Add a new supplier profile or adjust search criteria.</p>
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
      {/* VIEW B: SUPPLIER DETAIL PAGE (Full Responsive Deal & Ledger View) */}
      {/* ========================================================================= */}
      {selectedSupplier && (
        <div className="space-y-6">
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setSelectedSupplierId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3 py-2 rounded-xl transition-all shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Suppliers List
            </button>

            <div className="flex items-center gap-2">
              <button
                className="button secondary"
                onClick={() => generateLedgerPDF(selectedSupplier, supplierLedgers, false)}
              >
                <Download className="w-4 h-4" /> Supplier Ledger PDF
              </button>
              <button
                className="button secondary"
                onClick={() => setIsCreatingDeal(selectedSupplier)}
              >
                <Plus className="w-4 h-4" /> Record New Deal / Order
              </button>
              <button
                className="button primary"
                onClick={() => setIsRecordingPayment(selectedSupplier)}
              >
                <CreditCard className="w-4 h-4 stroke-[2.5]" /> Record Payment to Supplier
              </button>
              <button
                className="icon-button"
                title="Edit Supplier"
                onClick={() => setEditingSupplier(selectedSupplier)}
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                className="icon-button danger"
                title="Delete Supplier"
                onClick={() => handleDeleteSupplier(selectedSupplier.id, selectedSupplier.name)}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Supplier Master Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-stone-100">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shadow-xs">
                  {selectedSupplier.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-black text-stone-900">{selectedSupplier.name}</h1>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-md shadow-2xs ${getSupplierCategoryBadgeClass(
                        selectedSupplier.category,
                        supplierCategories
                      )}`}
                    >
                      <Tag className="w-3 h-3 opacity-80" />
                      {selectedSupplier.category || 'Raw Material Supplier'}
                    </span>
                    {selectedSupplier.supplierCode && (
                      <span className="text-xs bg-stone-100 text-stone-700 font-mono px-2 py-0.5 rounded-md font-semibold">
                        ID: {selectedSupplier.supplierCode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    Contact: <strong className="text-stone-800">{selectedSupplier.contactPerson || 'Direct Factory'}</strong> · {selectedSupplier.category}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 mt-2">
                    <span className="flex items-center gap-1 font-mono font-semibold">
                      <Phone className="w-3.5 h-3.5 text-stone-400" /> {selectedSupplier.phone}
                    </span>
                    {selectedSupplier.email && (
                      <span className="flex items-center gap-1 text-stone-500">
                        {selectedSupplier.email}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" />
                      {selectedSupplier.city && <strong className="text-stone-900">{selectedSupplier.city}, </strong>}
                      {selectedSupplier.address || 'Address not specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Status Summary Pills */}
              <div className="flex items-center gap-3">
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-right min-w-[130px]">
                  <span className="text-[11px] font-bold text-stone-500 block uppercase tracking-wider">Opening Bal</span>
                  <strong className="text-sm font-black text-stone-800">{formatPKR(selectedSupplier.openingBalance)}</strong>
                </div>
                <div
                  className={`p-3.5 rounded-xl border text-right min-w-[160px] ${
                    selectedSupplier.currentBalance > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <span className="text-[11px] font-bold block uppercase tracking-wider">
                    {selectedSupplier.currentBalance > 0 ? 'Total Payable Due' : 'Account Settled'}
                  </span>
                  <strong className="text-base font-black">{formatPKR(selectedSupplier.currentBalance)}</strong>
                </div>
              </div>
            </div>

            {/* Financial Totals Breakdown Bar */}
            <div className="grid grid-cols-3 gap-4 pt-4 text-center">
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                <span className="text-[11px] text-stone-500 block font-semibold">Total Deals Value (Procured)</span>
                <strong className="text-base font-black text-stone-900">{formatPKR(supplierFinancials.totalDealsValue)}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-[11px] text-emerald-700 block font-semibold">Total Amount Disbursed (Paid)</span>
                <strong className="text-base font-black text-emerald-800">{formatPKR(supplierFinancials.totalPaid)}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                <span className="text-[11px] text-amber-700 block font-semibold">Outstanding Balance Payable</span>
                <strong className="text-base font-black text-amber-800">{formatPKR(selectedSupplier.currentBalance)}</strong>
              </div>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="bg-white rounded-xl border border-stone-200 p-1.5 shadow-xs flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('deals')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'deals' ? 'bg-primary text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <FileText className="w-4 h-4" /> Deals & Purchases History ({supplierDeals.length})
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ledger' ? 'bg-primary text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Running Account Ledger ({supplierLedgers.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'payments' ? 'bg-primary text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <CreditCard className="w-4 h-4" /> Disbursements & Receipts ({selectedSupplier.paymentRecords?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'materials' ? 'bg-primary text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Boxes className="w-4 h-4" /> Supplied Items Catalog
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: FULL DEAL HISTORY & PURCHASES */}
          {/* ========================================================================= */}
          {activeTab === 'deals' && (
            <div className="panel table-panel">
              <div className="p-4 bg-stone-50/50 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Deals, Purchase Orders & Deliveries</h3>
                  <p className="text-xs text-stone-500">Every raw material or product batch purchased from {selectedSupplier.name}</p>
                </div>
                <button
                  className="button primary text-xs"
                  onClick={() => setIsCreatingDeal(selectedSupplier)}
                >
                  <Plus className="w-3.5 h-3.5" /> Record New Deal
                </button>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>PO # / Deal ID</th>
                      <th>Date</th>
                      <th>Item(s) Procured</th>
                      <th>Quantity</th>
                      <th>Total Cost</th>
                      <th>Amount Paid</th>
                      <th>Remaining Balance</th>
                      <th>Status</th>
                      <th>Payment Mode</th>
                      <th>Attachment / Proof</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierDeals.map((deal) => {
                      const isRaw = (deal.purchaseType || 'Raw Material') === 'Raw Material'
                      const itemsStr = (deal.items || []).map((i) => `${i.quantity} ${i.unit} ${i.name}`).join(', ')

                      return (
                        <tr key={deal.id}>
                          <td>
                            <span className="font-mono font-bold text-xs text-stone-900">{deal.poNumber}</span>
                          </td>
                          <td>{formatDate(deal.date)}</td>
                          <td>
                            <div className="text-xs font-bold text-stone-900 max-w-[200px] truncate" title={itemsStr}>
                              {itemsStr || 'Direct Supplies'}
                            </div>
                            <span className="text-[10px] text-stone-500">
                              {isRaw ? 'Raw Material Batch' : 'Finished Goods'}
                            </span>
                          </td>
                          <td className="font-semibold text-stone-800 text-xs">
                            {deal.quantity ? `${deal.quantity} ${deal.unit || 'units'}` : `${(deal.items || []).length} items`}
                          </td>
                          <td className="font-bold text-stone-900">{formatPKR(deal.grandTotal)}</td>
                          <td className="font-semibold text-emerald-700">{formatPKR(deal.amountPaid)}</td>
                          <td className="font-bold text-amber-700">{formatPKR(deal.balanceDue)}</td>
                          <td>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                deal.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : deal.status === 'Partial'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {deal.status}
                            </span>
                          </td>
                          <td>
                            <span className="text-xs font-semibold text-stone-700">{deal.paymentMethod || 'Cash'}</span>
                          </td>
                          <td>
                            {deal.invoiceImage || deal.paymentScreenshot ? (
                              <button
                                onClick={() =>
                                  setPreviewImage({
                                    src: (deal.invoiceImage || deal.paymentScreenshot)!,
                                    title: `Deal #${deal.poNumber} Invoice Photo / Payment Proof`,
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
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
                                title="View Deal Voucher & Receipt"
                                onClick={() => setViewingDeal(deal)}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                className="row-action"
                                title="Download Voucher PDF"
                                onClick={() =>
                                  generateSupplierDealReceiptPDF(selectedSupplier, {
                                    poNumber: deal.poNumber,
                                    date: deal.date,
                                    items: (deal.items || []).map((i) => ({
                                      name: i.name,
                                      quantity: i.quantity,
                                      unit: i.unit,
                                      unitPrice: i.unitPrice,
                                      total: i.total,
                                    })),
                                    grandTotal: deal.grandTotal,
                                    amountPaid: deal.amountPaid,
                                    balanceDue: deal.balanceDue,
                                    status: deal.status,
                                    paymentMethod: deal.paymentMethod,
                                    notes: deal.notes,
                                  })
                                }
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {supplierDeals.length === 0 && (
                      <tr>
                        <td colSpan={11} className="text-center py-8 text-stone-400">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No purchase deals recorded for this supplier yet. Click "Record New Deal" to log a purchase order.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: RUNNING ACCOUNT LEDGER / STATEMENT */}
          {/* ========================================================================= */}
          {activeTab === 'ledger' && (
            <div className="panel table-panel">
              <div className="p-4 bg-stone-50/50 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Chronological Running Balance Statement</h3>
                  <p className="text-xs text-stone-500">Live payable balance statement for {selectedSupplier.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="button secondary text-xs"
                    onClick={() => generateLedgerPDF(selectedSupplier, supplierLedgers, false)}
                  >
                    <Download className="w-3.5 h-3.5" /> Download Supplier Ledger PDF
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
                      <th>Debit (Amount Paid)</th>
                      <th>Credit (Deal / Purchase Value)</th>
                      <th className="text-right">Running Balance Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierLedgers.map((entry, idx) => (
                      <tr key={entry.id || idx}>
                        <td className="text-stone-400 text-xs font-mono">{idx + 1}</td>
                        <td className="text-xs font-semibold text-stone-800">{formatDate(entry.date)}</td>
                        <td>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              entry.referenceType === 'Purchase'
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
                        <td className="font-semibold text-emerald-700">{entry.debit > 0 ? formatPKR(entry.debit) : '—'}</td>
                        <td className="font-semibold text-stone-900">{entry.credit > 0 ? formatPKR(entry.credit) : '—'}</td>
                        <td className="text-right font-black text-stone-900">{formatPKR(entry.balance)}</td>
                      </tr>
                    ))}
                    {supplierLedgers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-stone-400">
                          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
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
          {/* TAB 3: DISBURSEMENTS & PAYMENT RECEIPTS */}
          {/* ========================================================================= */}
          {activeTab === 'payments' && (
            <div className="panel table-panel">
              <div className="p-4 bg-stone-50/50 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Disbursement Vouchers & Proof Attachments</h3>
                  <p className="text-xs text-stone-500">Payments made to {selectedSupplier.name} via Cash, Card, Bank Transfer, or Online</p>
                </div>
                <button
                  className="button primary text-xs"
                  onClick={() => setIsRecordingPayment(selectedSupplier)}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" /> Record Disbursement
                </button>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Voucher #</th>
                      <th>Date</th>
                      <th>Payment Method</th>
                      <th>Amount Disbursed</th>
                      <th>Deducted From Account</th>
                      <th>Transaction Ref</th>
                      <th>Receipt / Screenshot</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSupplier.paymentRecords || []).map((pay) => (
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
                                  title: `Disbursement Voucher #${pay.receiptNumber} Screenshot`,
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                            >
                              <ImageIcon className="w-3.5 h-3.5" /> View Proof
                            </button>
                          ) : (
                            <span className="text-stone-400 text-xs">No screenshot</span>
                          )}
                        </td>
                        <td className="text-xs text-stone-600 max-w-[150px] truncate">{pay.notes || '—'}</td>
                      </tr>
                    ))}
                    {(!selectedSupplier.paymentRecords || selectedSupplier.paymentRecords.length === 0) && (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-stone-400">
                          <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No payment disbursements recorded yet. Click "Record Disbursement" to log a settlement.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: SUPPLIED ITEMS CATALOG */}
          {/* ========================================================================= */}
          {activeTab === 'materials' && (
            <div className="panel table-panel">
              <div className="p-4 bg-stone-50/50 border-b border-stone-200">
                <h3 className="font-bold text-stone-900 text-sm">Supplied Raw Materials & Products Catalog</h3>
                <p className="text-xs text-stone-500">Items frequently supplied by {selectedSupplier.name}</p>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Raw Materials</h4>
                  {db.rawMaterials
                    .filter((r) => r.supplier?.toLowerCase() === selectedSupplier.name.toLowerCase() || (r.description || '').toLowerCase().includes(selectedSupplier.name.toLowerCase()))
                    .map((rm) => (
                      <div key={rm.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                        <div>
                          <strong className="text-xs text-stone-900 block">{rm.name}</strong>
                          <span className="text-[11px] text-stone-500">Rate: {formatPKR(rm.unitPrice)} / {rm.unit}</span>
                        </div>
                        <span className="text-xs font-bold text-stone-800 bg-white px-2 py-1 rounded border border-stone-200">
                          Stock: {rm.quantity} {rm.unit}
                        </span>
                      </div>
                    ))}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Finished Products / Packaging</h4>
                  {db.products
                    .filter((p) => (p.description || '').toLowerCase().includes(selectedSupplier.name.toLowerCase()))
                    .map((prod) => (
                      <div key={prod.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                        <div>
                          <strong className="text-xs text-stone-900 block">{prod.name}</strong>
                          <span className="text-[11px] text-stone-500">Cost: {formatPKR(prod.costPrice)} / {prod.unit}</span>
                        </div>
                        <span className="text-xs font-bold text-stone-800 bg-white px-2 py-1 rounded border border-stone-200">
                          Stock: {prod.quantity} {prod.unit}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT SUPPLIER PROFILE */}
      {/* ========================================================================= */}
      {(isCreatingSupplier || editingSupplier) && (
        <SupplierProfileModal
          supplier={editingSupplier}
          categories={supplierCategories}
          onOpenCategoryManager={() => setIsManagingCategories(true)}
          onClose={() => {
            setIsCreatingSupplier(false)
            setEditingSupplier(null)
          }}
          onSave={(profileData) => {
            if (editingSupplier) {
              const updated = db.suppliers.map((s) =>
                s.id === editingSupplier.id
                  ? {
                      ...s,
                      ...profileData,
                      updatedAt: new Date().toISOString().slice(0, 10),
                    }
                  : s
              )
              onSaveDatabase({ ...db, suppliers: updated })
            } else {
              const newSupplier: SupplierItem = {
                id: `sup-${Date.now()}`,
                supplierCode: profileData.supplierCode || `SUP-${String(db.suppliers.length + 1001)}`,
                name: profileData.name,
                contactPerson: profileData.contactPerson,
                category: profileData.category,
                supplyCategory: profileData.supplyCategory,
                phone: profileData.phone,
                altPhone: profileData.altPhone,
                email: profileData.email,
                address: profileData.address,
                city: profileData.city,
                openingBalance: profileData.openingBalance || 0,
                currentBalance: profileData.openingBalance || 0,
                status: 'Active',
                notes: profileData.notes,
                paymentRecords: [],
                createdAt: new Date().toISOString().slice(0, 10),
                updatedAt: new Date().toISOString().slice(0, 10),
              }
              onSaveDatabase({ ...db, suppliers: [newSupplier, ...db.suppliers] })
            }
            setIsCreatingSupplier(false)
            setEditingSupplier(null)
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: SUPPLIER CATEGORIES MANAGER */}
      {/* ========================================================================= */}
      {isManagingCategories && (
        <SupplierCategoryManagerModal
          categories={supplierCategories}
          suppliers={db.suppliers}
          onClose={() => setIsManagingCategories(false)}
          onSaveCategories={(updatedCats, updatedSuppliers) => {
            onSaveDatabase({
              ...db,
              supplierCategories: updatedCats,
              suppliers: updatedSuppliers || db.suppliers,
            })
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECORD PAYMENT / DISBURSEMENT TO SUPPLIER */}
      {/* ========================================================================= */}
      {isRecordingPayment && (
        <RecordSupplierPaymentModal
          supplier={isRecordingPayment}
          accounts={db.accounts}
          onClose={() => setIsRecordingPayment(null)}
          onSave={handleSavePayment}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RECORD NEW DEAL / PURCHASE FOR SUPPLIER */}
      {/* ========================================================================= */}
      {isCreatingDeal && (
        <CreateSupplierDealModal
          supplier={isCreatingDeal}
          rawMaterials={db.rawMaterials}
          products={db.products}
          accounts={db.accounts}
          onClose={() => setIsCreatingDeal(null)}
          onSave={handleSaveDeal}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DEAL RECEIPT / VOUCHER VIEWER */}
      {/* ========================================================================= */}
      {viewingDeal && (
        <DealReceiptModal
          deal={viewingDeal}
          supplier={db.suppliers.find((s) => s.id === viewingDeal.supplierId || s.name === viewingDeal.supplierName)}
          onClose={() => setViewingDeal(null)}
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
// MODAL: ADD / EDIT SUPPLIER PROFILE
// -----------------------------------------------------------------------------
function SupplierProfileModal({
  supplier,
  categories,
  onOpenCategoryManager,
  onClose,
  onSave,
}: {
  supplier: SupplierItem | null
  categories: CategoryItem[]
  onOpenCategoryManager?: () => void
  onClose: () => void
  onSave: (data: {
    supplierCode?: string
    name: string
    contactPerson: string
    category: string
    supplyCategory: SupplierSupplyCategory
    phone: string
    altPhone?: string
    email?: string
    address: string
    city: string
    openingBalance: number
    notes?: string
  }) => void
}) {
  const [name, setName] = useState(supplier?.name || '')
  const [contactPerson, setContactPerson] = useState(supplier?.contactPerson || '')
  const [supplyCategory, setSupplyCategory] = useState<SupplierSupplyCategory>(
    supplier?.supplyCategory || 'Raw Material'
  )
  const [category, setCategory] = useState(
    supplier?.category || (categories.length > 0 ? categories[0].name : 'Raw Material Supplier')
  )
  const [supplierCode, setSupplierCode] = useState(supplier?.supplierCode || '')
  const [phone, setPhone] = useState(supplier?.phone || '')
  const [altPhone, setAltPhone] = useState(supplier?.altPhone || '')
  const [email, setEmail] = useState(supplier?.email || '')
  const [address, setAddress] = useState(supplier?.address || '')
  const [city, setCity] = useState(supplier?.city || 'Lahore')
  const [openingBalance, setOpeningBalance] = useState(supplier?.openingBalance || 0)
  const [notes, setNotes] = useState(supplier?.notes || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return

    onSave({
      supplierCode: supplierCode.trim() || undefined,
      name: name.trim(),
      contactPerson: contactPerson.trim(),
      category: category.trim(),
      supplyCategory,
      phone: phone.trim(),
      altPhone: altPhone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim(),
      city: city.trim(),
      openingBalance: Number(openingBalance) || 0,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Supplier Directory</p>
            <h2>{supplier ? `Edit ${supplier.name}` : 'Add New Supplier Profile'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="form-grid">
          <label>
            Company / Supplier Name *
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. National Sugar Mills Ltd"
              required
            />
          </label>

          <label>
            Contact Person Name *
            <input
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Tariq Mehmood"
              required
            />
          </label>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-700 mb-0">
                Supplier Type Category *
              </label>
              {onOpenCategoryManager && (
                <button
                  type="button"
                  onClick={onOpenCategoryManager}
                  className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" /> Manage Categories
                </button>
              )}
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
              {categories.length === 0 && <option value="Raw Material Supplier">Raw Material Supplier</option>}
            </select>
          </div>

          <label>
            Supply Scope Type
            <select value={supplyCategory} onChange={(e) => setSupplyCategory(e.target.value as any)} required>
              <option value="Raw Material">Raw Material (Ingredients / Chemicals / Sugar / Pulp)</option>
              <option value="Product">Product (Bottles / Preforms / Packaging / Cartons)</option>
              <option value="Both">Both (Raw Material & Packaging Products)</option>
            </select>
          </label>

          <label>
            Supplier Code / ID (Auto / Manual)
            <input
              value={supplierCode}
              onChange={(e) => setSupplierCode(e.target.value)}
              placeholder="e.g. SUP-1001 or leave blank for auto"
            />
          </label>

          <label>
            Phone / Mobile *
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0300 XXXXXXX"
              required
            />
          </label>

          <label>
            City *
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Faisalabad, Lahore, Karachi"
              required
            />
          </label>

          <label>
            Office / Mill Address *
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Industrial Estate, Mill Complex, Street"
              required
            />
          </label>

          {!supplier && (
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
            Email Address (Optional)
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sales@supplier.com"
            />
          </label>

          <label className="col-span-2">
            Notes / Quality Terms
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 50kg food-grade packaging in truckload batches"
            />
          </label>
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            {supplier ? 'Update Supplier Profile' : 'Save Supplier Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}

// -----------------------------------------------------------------------------
// MODAL: RECORD PAYMENT TO SUPPLIER
// -----------------------------------------------------------------------------
function RecordSupplierPaymentModal({
  supplier,
  accounts,
  onClose,
  onSave,
}: {
  supplier: SupplierItem
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
  const [amount, setAmount] = useState(supplier.currentBalance > 0 ? supplier.currentBalance : 25000)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Online' | 'Bank Transfer' | 'Cheque'>('Bank Transfer')
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
            <p className="eyebrow">Disbursement Voucher</p>
            <h2>Record Payment to {supplier.name}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 mb-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-stone-500 block">Total Balance Due to Supplier:</span>
            <strong className="text-base text-amber-800">{formatPKR(supplier.currentBalance)}</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Contact:</span>
            <strong className="text-sm text-stone-900">{supplier.contactPerson} ({supplier.phone})</strong>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Disbursement Amount (Rs) *
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
              <option value="Bank Transfer">Bank Transfer (IBFT / RTGS)</option>
              <option value="Online">Online Banking (Raast / App)</option>
              <option value="Cash">Cash in Hand</option>
              <option value="Card">Card Payment</option>
              <option value="Cheque">Company Cheque</option>
            </select>
          </label>

          <label>
            Deduct From Account *
            <select value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value as any)}>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (Bal: {formatPKR(acc.balance)})
                </option>
              ))}
            </select>
          </label>

          <label className="col-span-2">
            Transaction Reference / Cheque #
            <input
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. IBFT-984210 or Cheque # 001928"
            />
          </label>

          {/* Screenshot / Photo Attachment */}
          <div className="col-span-2 space-y-2">
            <label className="block text-xs font-bold text-stone-700">
              Attach Bank Transfer Screenshot / Payment Proof
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
            Notes / Description
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared 50% bill against sugar consignment"
            />
          </label>
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Confirm & Deduct Account
          </button>
        </div>
      </form>
    </div>
  )
}

// -----------------------------------------------------------------------------
// MODAL: RECORD NEW DEAL / PURCHASE FROM SUPPLIER
// -----------------------------------------------------------------------------
function CreateSupplierDealModal({
  supplier,
  rawMaterials,
  products,
  accounts,
  onClose,
  onSave,
}: {
  supplier: SupplierItem
  rawMaterials: AppDatabase['rawMaterials']
  products: AppDatabase['products']
  accounts: AppDatabase['accounts']
  onClose: () => void
  onSave: (data: {
    dealType: 'Raw Material' | 'Finished Product'
    itemId: string
    itemName: string
    quantity: number
    unit: string
    unitPrice: number
    otherCost: number
    grandTotal: number
    amountPaid: number
    paymentMethod: any
    paymentAccount: any
    transactionRef: string
    paymentScreenshot?: string
    invoiceImage?: string
    notes: string
    date: string
  }) => void
}) {
  const [dealType, setDealType] = useState<'Raw Material' | 'Finished Product'>('Raw Material')
  const [selectedItemId, setSelectedItemId] = useState(rawMaterials[0]?.id || '')
  const [quantity, setQuantity] = useState(50)
  const [unit, setUnit] = useState('kg')
  const [unitPrice, setUnitPrice] = useState(150)
  const [otherCost, setOtherCost] = useState(0)
  const [isManualTotal, setIsManualTotal] = useState(false)
  const [manualGrandTotal, setManualGrandTotal] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer')
  const [paymentAccount, setPaymentAccount] = useState('meezan-bank')
  const [transactionRef, setTransactionRef] = useState('')
  const [invoiceImage, setInvoiceImage] = useState<string | undefined>(undefined)
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | undefined>(undefined)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  // Handle item selection change
  const handleItemChange = (id: string) => {
    setSelectedItemId(id)
    if (dealType === 'Raw Material') {
      const rm = rawMaterials.find((r) => r.id === id)
      if (rm) {
        setUnit(rm.unit || 'kg')
        setUnitPrice(rm.unitPrice || 0)
      }
    } else {
      const p = products.find((pr) => pr.id === id)
      if (p) {
        setUnit(p.unit || 'Cartons')
        setUnitPrice(p.costPrice || 0)
      }
    }
  }

  const calculatedTotal = quantity * unitPrice + otherCost
  const grandTotal = isManualTotal ? manualGrandTotal : calculatedTotal

  const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setInvoiceImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPaymentScreenshot(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let itemName = 'Supplied Item'
    if (dealType === 'Raw Material') {
      const rm = rawMaterials.find((r) => r.id === selectedItemId)
      if (rm) itemName = rm.name
    } else {
      const p = products.find((pr) => pr.id === selectedItemId)
      if (p) itemName = p.name
    }

    onSave({
      dealType,
      itemId: selectedItemId,
      itemName,
      quantity: Number(quantity),
      unit,
      unitPrice: Number(unitPrice),
      otherCost: Number(otherCost),
      grandTotal: Number(grandTotal),
      amountPaid: Number(amountPaid),
      paymentMethod,
      paymentAccount,
      transactionRef: transactionRef.trim(),
      paymentScreenshot,
      invoiceImage,
      notes: notes.trim(),
      date,
    })
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal large" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Purchase Deal</p>
            <h2>Record Deal with {supplier.name}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="col-span-2 space-y-3">
            <div className="form-grid">
              <label>
                Procurement Type *
                <select
                  value={dealType}
                  onChange={(e) => {
                    const newType = e.target.value as any
                    setDealType(newType)
                    if (newType === 'Raw Material') {
                      setSelectedItemId(rawMaterials[0]?.id || '')
                    } else {
                      setSelectedItemId(products[0]?.id || '')
                    }
                  }}
                >
                  <option value="Raw Material">Raw Material (Sugar / Pulp / Chemical / Caps)</option>
                  <option value="Finished Product">Finished Product (Commercial Re-sale)</option>
                </select>
              </label>

              <label>
                Select Item *
                <select value={selectedItemId} onChange={(e) => handleItemChange(e.target.value)}>
                  {dealType === 'Raw Material'
                    ? rawMaterials.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.category})
                        </option>
                      ))
                    : products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.category})
                        </option>
                      ))}
                </select>
              </label>

              <label>
                Quantity *
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                />
              </label>

              <label>
                Unit *
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="kg">kg</option>
                  <option value="L">L (Liters)</option>
                  <option value="g">g (Grams)</option>
                  <option value="ml">ml (Milliliters)</option>
                  <option value="Cartons">Cartons</option>
                  <option value="Pieces">Pieces</option>
                  <option value="Bags">Bags (50kg)</option>
                  <option value="Rolls">Rolls</option>
                </select>
              </label>

              <label>
                Unit Price / Rate (Rs) *
                <input
                  type="number"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                  required
                />
              </label>

              <label>
                Transport / Other Cost (Rs)
                <input
                  type="number"
                  min="0"
                  value={otherCost}
                  onChange={(e) => setOtherCost(Number(e.target.value))}
                />
              </label>

              <label>
                Deal Date *
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>

              <label>
                Total Value Calculation
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={grandTotal}
                    onChange={(e) => {
                      setIsManualTotal(true)
                      setManualGrandTotal(Number(e.target.value))
                    }}
                    className="font-bold text-stone-900"
                  />
                  {isManualTotal && (
                    <button
                      type="button"
                      onClick={() => setIsManualTotal(false)}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Reset Auto
                    </button>
                  )}
                </div>
              </label>
            </div>

            {/* Attachments Section */}
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-stone-800 block">Offline Image Attachments (OPFS)</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1">Purchase Invoice / Bill Photo</label>
                  <label className="button secondary text-xs cursor-pointer inline-flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" /> Attach Bill
                    <input type="file" accept="image/*" className="hidden" onChange={handleInvoiceUpload} />
                  </label>
                  {invoiceImage && <span className="text-[11px] text-emerald-700 font-bold block mt-1">✓ Bill Attached</span>}
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">Payment Slip / Raast Screenshot</label>
                  <label className="button secondary text-xs cursor-pointer inline-flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" /> Attach Proof
                    <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotUpload} />
                  </label>
                  {paymentScreenshot && (
                    <span className="text-[11px] text-emerald-700 font-bold block mt-1">✓ Screenshot Attached</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Settlement Summary */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider">Payment & Settlement</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-stone-600">
                <span>Total Deal Cost:</span>
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
                <option value="Bank Transfer">Bank Transfer (IBFT / RTGS)</option>
                <option value="Online">Online / Raast</option>
                <option value="Cash">Cash in Hand</option>
                <option value="Card">Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </label>

            <label className="text-xs">
              Deduct Account
              <select value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)}>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="pt-2 border-t border-stone-200 text-xs flex justify-between">
              <span className="font-bold">Remaining Balance Payable:</span>
              <strong className="text-amber-800 font-bold">{formatPKR(Math.max(0, grandTotal - amountPaid))}</strong>
            </div>

            <label className="text-xs">
              Notes
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Batch notes, vehicle #" />
            </label>
          </div>
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Record Deal & Update Inventory
          </button>
        </div>
      </form>
    </div>
  )
}

// -----------------------------------------------------------------------------
// MODAL: DEAL RECEIPT / VOUCHER VIEWER
// -----------------------------------------------------------------------------
function DealReceiptModal({
  deal,
  supplier,
  onClose,
}: {
  deal: PurchaseItem
  supplier?: SupplierItem
  onClose: () => void
}) {
  return (
    <div className="editor-overlay">
      <div className="editor-modal large">
        <div className="editor-header">
          <div>
            <p className="eyebrow">Procurement Voucher</p>
            <h2>Deal #{deal.poNumber}</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-stone-500 block">Supplier Name</span>
            <strong className="text-sm text-stone-900">{deal.supplierName}</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Deal Date</span>
            <strong className="text-sm text-stone-900">{formatDate(deal.date)}</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Payment Mode</span>
            <strong className="text-sm text-stone-900">{deal.paymentMethod || 'Cash'}</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Status</span>
            <span
              className={`inline-block font-bold text-xs px-2 py-0.5 rounded ${
                deal.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {deal.status}
            </span>
          </div>
        </div>

        <div className="table-scroll border border-stone-200 rounded-xl mb-4">
          <table className="text-xs">
            <thead>
              <tr>
                <th>#</th>
                <th>Item Description</th>
                <th>Quantity</th>
                <th>Rate / Unit</th>
                <th className="text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {(deal.items || []).map((item, idx) => (
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
              <span className="text-stone-500">Total Deal Cost: </span>
              <strong className="text-sm font-black">{formatPKR(deal.grandTotal)}</strong>
            </div>
            <div>
              <span className="text-stone-500">Amount Paid: </span>
              <strong className="text-emerald-700">{formatPKR(deal.amountPaid)}</strong>
            </div>
            <div>
              <span className="text-stone-500">Remaining Balance Due: </span>
              <strong className="text-amber-800 font-black">{formatPKR(deal.balanceDue)}</strong>
            </div>
          </div>
        </div>

        <div className="editor-actions flex justify-between items-center mt-4">
          <button
            className="button secondary"
            onClick={() =>
              supplier &&
              generateSupplierDealReceiptPDF(supplier, {
                poNumber: deal.poNumber,
                date: deal.date,
                items: (deal.items || []).map((i) => ({
                  name: i.name,
                  quantity: i.quantity,
                  unit: i.unit,
                  unitPrice: i.unitPrice,
                  total: i.total,
                })),
                grandTotal: deal.grandTotal,
                amountPaid: deal.amountPaid,
                balanceDue: deal.balanceDue,
                status: deal.status,
                paymentMethod: deal.paymentMethod,
                notes: deal.notes,
              })
            }
          >
            <Download className="w-4 h-4" /> Download Deal Voucher PDF
          </button>
          <button className="button primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   SUPPLIER CATEGORIES MANAGEMENT MODAL
========================================================================= */
function SupplierCategoryManagerModal({
  categories,
  suppliers,
  onClose,
  onSaveCategories,
}: {
  categories: CategoryItem[]
  suppliers: SupplierItem[]
  onClose: () => void
  onSaveCategories: (
    updatedCategories: CategoryItem[],
    updatedSuppliers?: SupplierItem[]
  ) => void
}) {
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [catName, setCatName] = useState('')
  const [catColor, setCatColor] = useState('blue')
  const [catDesc, setCatDesc] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Count suppliers using each category
  const counts = useMemo(() => {
    const acc: Record<string, number> = {}
    suppliers.forEach((s) => {
      if (s.category) {
        acc[s.category] = (acc[s.category] || 0) + 1
      }
    })
    return acc
  }, [suppliers])

  const handleStartEdit = (cat: CategoryItem) => {
    setEditingCatId(cat.id)
    setIsAddingNew(false)
    setCatName(cat.name)
    setCatColor(cat.color || 'blue')
    setCatDesc(cat.description || '')
    setError(null)
  }

  const handleDeleteCategory = (cat: CategoryItem) => {
    const inUseCount = counts[cat.name] || 0
    if (inUseCount > 0) {
      if (
        !confirm(
          `"${cat.name}" is currently assigned to ${inUseCount} supplier(s). Are you sure you want to delete this category?`
        )
      ) {
        return
      }
    }
    const updated = categories.filter((c) => c.id !== cat.id)
    onSaveCategories(updated)
    if (editingCatId === cat.id) {
      setEditingCatId(null)
      setCatName('')
      setCatDesc('')
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = catName.trim()
    if (!trimmed) {
      setError('Category name cannot be empty.')
      return
    }

    // Duplicate check
    const isDuplicate = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editingCatId
    )
    if (isDuplicate) {
      setError(`A supplier category named "${trimmed}" already exists.`)
      return
    }

    if (editingCatId) {
      const oldCat = categories.find((c) => c.id === editingCatId)
      const oldName = oldCat?.name

      const updatedCats = categories.map((c) =>
        c.id === editingCatId
          ? {
              ...c,
              name: trimmed,
              color: catColor,
              description: catDesc.trim() || undefined,
            }
          : c
      )

      let updatedSuppliers: SupplierItem[] | undefined
      if (oldName && oldName !== trimmed) {
        updatedSuppliers = suppliers.map((s) =>
          s.category === oldName ? { ...s, category: trimmed } : s
        )
      }

      onSaveCategories(updatedCats, updatedSuppliers)
      setEditingCatId(null)
    } else {
      const newCat: CategoryItem = {
        id: `supcat-${Date.now()}`,
        name: trimmed,
        color: catColor,
        description: catDesc.trim() || undefined,
        createdAt: new Date().toISOString().slice(0, 10),
      }

      onSaveCategories([...categories, newCat])
      setIsAddingNew(false)
    }

    setCatName('')
    setCatColor('blue')
    setCatDesc('')
  }

  const activeColorObj = SUPPLIER_CATEGORY_COLORS.find((c) => c.id === catColor) || SUPPLIER_CATEGORY_COLORS[0]

  return (
    <div className="editor-overlay">
      <div className="editor-modal max-w-lg w-full" id="supplier-category-manager-modal">
        <div className="editor-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <p className="eyebrow">Procurement Settings</p>
              <h2>Manage Supplier Type Categories</h2>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-lg text-xs flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Add / Edit Form */}
        {isAddingNew || editingCatId ? (
          <form
            onSubmit={handleFormSubmit}
            className="mb-4 bg-stone-50/90 p-4 rounded-xl border border-stone-200 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-primary" />
                {isAddingNew ? 'Add New Supplier Category' : 'Edit Supplier Category'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold shadow-xs ${activeColorObj.class}`}>
                {catName.trim() || 'Badge Preview'}
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">
                Category Name *
              </label>
              <input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Raw Material Supplier, Machinery/Equipment Vendor"
                required
                autoFocus
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                id="input-supplier-cat-name"
              />
            </div>

            {/* Color Palette Selector */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1.5 block">
                Badge Color Theme *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                {SUPPLIER_CATEGORY_COLORS.map((col) => {
                  const isSelected = catColor === col.id
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setCatColor(col.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-all ${
                        isSelected
                          ? 'border-stone-900 bg-white ring-2 ring-stone-900/10 font-bold shadow-xs'
                          : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-medium'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${col.dot} flex-shrink-0 flex items-center justify-center`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </span>
                      <span className="truncate text-[11px]">{col.label.split(' ')[0]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">
                Description / Notes <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Brief notes about this type of vendor"
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="button secondary text-xs py-1.5 px-3"
                onClick={() => {
                  setIsAddingNew(false)
                  setEditingCatId(null)
                  setError(null)
                }}
              >
                Cancel
              </button>
              <button type="submit" className="button primary text-xs py-1.5 px-4" id="btn-save-supplier-category">
                {isAddingNew ? 'Create Category' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-4 flex justify-between items-center bg-stone-50 px-4 py-3 rounded-xl border border-stone-200">
            <div>
              <span className="text-xs font-bold text-stone-800">
                {categories.length} Categories Registered
              </span>
              <p className="text-[11px] text-stone-500">Classify suppliers by vendor type & capabilities</p>
            </div>
            <button
              type="button"
              className="button primary text-xs py-1.5 px-3"
              onClick={() => {
                setIsAddingNew(true)
                setCatName('')
                setCatColor('blue')
                setCatDesc('')
                setError(null)
              }}
              id="btn-add-supplier-category-start"
            >
              <Plus className="w-3.5 h-3.5" /> Add Category
            </button>
          </div>
        )}

        {/* Categories List */}
        <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto border border-stone-200 rounded-xl bg-white">
          {categories.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-400">
              No categories found. Click "+ Add Category" above.
            </div>
          ) : (
            categories.map((c) => {
              const count = counts[c.name] || 0
              const badgeClass = getSupplierCategoryBadgeClass(c.name, categories)
              return (
                <div
                  key={c.id}
                  className="p-3.5 flex items-center justify-between hover:bg-stone-50/80 transition-colors"
                >
                  <div className="pr-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md shadow-2xs ${badgeClass}`}>
                        {c.name}
                      </span>
                      <span className="text-[10px] bg-stone-100 text-stone-700 font-semibold px-2 py-0.5 rounded-md">
                        {count} {count === 1 ? 'supplier' : 'suppliers'}
                      </span>
                    </div>
                    {c.description && (
                      <p className="text-[11px] text-stone-500 mt-1">{c.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="p-1.5 text-stone-500 hover:text-blue-600 rounded-md hover:bg-stone-100 transition-colors"
                      title="Edit Category"
                      onClick={() => handleStartEdit(c)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 text-stone-500 hover:text-rose-600 rounded-md hover:bg-stone-100 transition-colors"
                      title="Delete Category"
                      onClick={() => handleDeleteCategory(c)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="editor-actions mt-4">
          <button type="button" className="button secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
