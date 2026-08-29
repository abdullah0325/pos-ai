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
  AlertTriangle,
  Clock,
  Calendar,
  Filter,
  Image as ImageIcon,
  Printer,
  ChevronDown,
  ChevronUp,
  Layers,
  CreditCard,
  Building2,
  Phone,
  Sparkles,
  RotateCcw,
  Check,
  Tag,
  Package,
  Boxes,
  HelpCircle,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  ExternalLink,
  BookOpen,
  Palette,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  type AppDatabase,
  type PurchaseItem,
  type PurchaseLineItem,
  type PurchaseType,
  type PurchaseCategoryItem,
  type RawMaterialItem,
  type ProductItem,
  type SupplierItem,
  type ExpenseItem,
  type LedgerEntry,
  defaultPurchaseCategories,
} from '@/lib/db'
import { DueDateBadge } from '@/components/status-badges'
import { exportToCSV, generatePurchaseVoucherPDF } from '@/lib/pdf-export'

interface PurchasesViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigate?: (module: string, subTab?: string) => void
  onNavigateToSupplier?: (supplierId?: string) => void
}

export const PURCHASE_CATEGORY_COLORS = [
  { id: 'emerald', label: 'Emerald (Raw Materials)', class: 'bg-emerald-600 text-white', dot: 'bg-emerald-600' },
  { id: 'blue', label: 'Blue (Packaging)', class: 'bg-blue-600 text-white', dot: 'bg-blue-600' },
  { id: 'purple', label: 'Purple (Machinery / Equipment)', class: 'bg-purple-600 text-white', dot: 'bg-purple-600' },
  { id: 'amber', label: 'Amber (Supplies & Spares)', class: 'bg-amber-600 text-white', dot: 'bg-amber-600' },
  { id: 'teal', label: 'Teal (Maintenance & Tools)', class: 'bg-teal-600 text-white', dot: 'bg-teal-600' },
  { id: 'indigo', label: 'Indigo (Finished Goods)', class: 'bg-indigo-600 text-white', dot: 'bg-indigo-600' },
  { id: 'rose', label: 'Rose (Chemicals & Flavors)', class: 'bg-rose-600 text-white', dot: 'bg-rose-600' },
  { id: 'sky', label: 'Sky / Cyan (Transport & Logistics)', class: 'bg-sky-600 text-white', dot: 'bg-sky-600' },
  { id: 'stone', label: 'Stone / Gray (General / Other)', class: 'bg-stone-700 text-white', dot: 'bg-stone-700' },
]

export function getPurchaseCategoryBadgeClass(categoryName?: string, categories?: PurchaseCategoryItem[]) {
  const cat = (categoryName || '').trim()
  const matched = categories?.find((c) => c.name.toLowerCase() === cat.toLowerCase())
  const color = matched?.color?.toLowerCase()

  if (color === 'emerald' || color === 'green') return 'bg-emerald-600 text-white'
  if (color === 'blue') return 'bg-blue-600 text-white'
  if (color === 'purple') return 'bg-purple-600 text-white'
  if (color === 'amber' || color === 'orange') return 'bg-amber-600 text-white'
  if (color === 'teal') return 'bg-teal-600 text-white'
  if (color === 'indigo') return 'bg-indigo-600 text-white'
  if (color === 'rose' || color === 'red') return 'bg-rose-600 text-white'
  if (color === 'sky' || color === 'cyan') return 'bg-sky-600 text-white'
  if (color === 'stone' || color === 'gray') return 'bg-stone-700 text-white'

  // Keyword fallbacks
  const lower = cat.toLowerCase()
  if (lower.includes('raw') || lower.includes('sugar') || lower.includes('ingredient')) return 'bg-emerald-600 text-white'
  if (lower.includes('packag') || lower.includes('carton') || lower.includes('label') || lower.includes('bottle') || lower.includes('preform')) return 'bg-blue-600 text-white'
  if (lower.includes('machin') || lower.includes('equip')) return 'bg-purple-600 text-white'
  if (lower.includes('spare') || lower.includes('maint')) return 'bg-teal-600 text-white'
  if (lower.includes('finish') || lower.includes('product')) return 'bg-indigo-600 text-white'
  if (lower.includes('chem') || lower.includes('flavor')) return 'bg-rose-600 text-white'
  if (lower.includes('transp') || lower.includes('freight')) return 'bg-sky-600 text-white'
  return 'bg-stone-700 text-white'
}

// Category color mappings and icons
const getCategoryStyle = (categoryName?: string, categories?: PurchaseCategoryItem[]) => {
  const cat = (categoryName || '').toLowerCase()
  const badgeClass = getPurchaseCategoryBadgeClass(categoryName, categories)

  if (cat.includes('raw') || cat.includes('ingredient')) {
    return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: Boxes, badgeClass }
  }
  if (cat.includes('packag') || cat.includes('carton') || cat.includes('label')) {
    return { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', icon: Package, badgeClass }
  }
  if (cat.includes('equip') || cat.includes('machin')) {
    return { bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500', icon: Layers, badgeClass }
  }
  if (cat.includes('chem') || cat.includes('flavor')) {
    return { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', icon: Sparkles, badgeClass }
  }
  if (cat.includes('maint') || cat.includes('spare')) {
    return { bg: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500', icon: RotateCcw, badgeClass }
  }
  if (cat.includes('transp') || cat.includes('logist')) {
    return { bg: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500', icon: Truck, badgeClass }
  }
  if (cat.includes('finish') || cat.includes('product')) {
    return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', icon: Package, badgeClass }
  }
  return { bg: 'bg-stone-100 text-stone-700 border-stone-200', dot: 'bg-stone-500', icon: Tag, badgeClass }
}

export default function PurchasesView({
  db,
  onSaveDatabase,
  onNavigate,
}: PurchasesViewProps) {
  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterSupplier, setFilterSupplier] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'Paid' | 'Partial' | 'Pending' | 'Overdue'>('all')
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [filterReturnOrDefect, setFilterReturnOrDefect] = useState<boolean | null>(null) // null = all, true = returns only

  // Section collapse state for compact analytics
  const [showAnalytics, setShowAnalytics] = useState(true)

  // Modals
  const [isCreatingPurchase, setIsCreatingPurchase] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<PurchaseItem | null>(null)
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseItem | null>(null)
  const [isManagingCategories, setIsManagingCategories] = useState(false)
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null)

  // Quick Inline New Supplier Drawer/Modal inside Purchase Form
  const [isAddingNewSupplierInline, setIsAddingNewSupplierInline] = useState(false)
  const [newSupplierForm, setNewSupplierForm] = useState({
    name: '',
    phone: '',
    city: 'Lahore',
    category: 'Raw Material',
    openingBalance: 0,
  })

  // Inline New Category creation inside Purchase Form
  const [isAddingNewCategoryInline, setIsAddingNewCategoryInline] = useState(false)
  const [inlineCategoryName, setInlineCategoryName] = useState('')

  // Dates
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), [])
  const lastMonthStr = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 7)
  }, [])

  // Categories list
  const purchaseCategories = useMemo(() => {
    return db.purchaseCategories && db.purchaseCategories.length > 0
      ? db.purchaseCategories
      : defaultPurchaseCategories
  }, [db.purchaseCategories])

  // --- KPI CALCULATIONS ---
  const kpis = useMemo(() => {
    const all = db.purchases || []
    const thisMonth = all.filter((p) => (p.date || '').startsWith(currentMonthStr))
    const lastMonth = all.filter((p) => (p.date || '').startsWith(lastMonthStr))

    const totalThisMonth = thisMonth.reduce((sum, p) => sum + (p.grandTotal || 0), 0)
    const totalLastMonth = lastMonth.reduce((sum, p) => sum + (p.grandTotal || 0), 0)

    const thisMonthCount = thisMonth.length
    const monthTrendPct = totalLastMonth > 0
      ? Math.round(((totalThisMonth - totalLastMonth) / totalLastMonth) * 100)
      : totalThisMonth > 0 ? 100 : 0

    const totalPaidAll = all.reduce((sum, p) => sum + (p.amountPaid || 0), 0)
    const totalGrandAll = all.reduce((sum, p) => sum + (p.grandTotal || 0), 0)
    const paidPct = totalGrandAll > 0 ? Math.round((totalPaidAll / totalGrandAll) * 100) : 100

    const pendingPurchases = all.filter((p) => (p.balanceDue || 0) > 0)
    const totalPendingPayables = pendingPurchases.reduce((sum, p) => sum + (p.balanceDue || 0), 0)

    // Overdue purchases: balanceDue > 0 AND dueDate < today
    const overduePurchases = all.filter((p) => {
      if ((p.balanceDue || 0) <= 0) return false
      if (!p.dueDate) return false
      return p.dueDate < todayStr
    })
    const totalOverdue = overduePurchases.reduce((sum, p) => sum + (p.balanceDue || 0), 0)

    return {
      totalThisMonth,
      thisMonthCount,
      monthTrendPct,
      totalPaidAll,
      paidPct,
      totalPendingPayables,
      pendingCount: pendingPurchases.length,
      totalOverdue,
      overdueCount: overduePurchases.length,
      totalCount: all.length,
    }
  }, [db.purchases, currentMonthStr, lastMonthStr, todayStr])

  // --- FILTERING & SORTING PURCHASES ---
  const filteredPurchases = useMemo(() => {
    return (db.purchases || []).filter((p) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchPo = (p.poNumber || p.purchaseNumber || '').toLowerCase().includes(q)
        const matchSupplier = (p.supplierName || '').toLowerCase().includes(q)
        const matchNotes = (p.notes || '').toLowerCase().includes(q)
        const matchRef = (p.referenceNumber || p.transactionRef || '').toLowerCase().includes(q)
        const matchItems = (p.items || []).some((item) => (item.name || '').toLowerCase().includes(q))
        if (!matchPo && !matchSupplier && !matchNotes && !matchRef && !matchItems) return false
      }

      // 2. Category Filter
      if (filterCategory !== 'all') {
        const pCat = (p.category || (p.purchaseType === 'Finished Product' ? 'Finished Product' : 'Raw Material')).toLowerCase()
        if (filterCategory === 'Custom') {
          if (!p.isCustomCategory && !pCat.includes('custom')) return false
        } else {
          if (!pCat.includes(filterCategory.toLowerCase())) return false
        }
      }

      // 3. Supplier Filter
      if (filterSupplier !== 'all') {
        if (p.supplierId !== filterSupplier && p.supplierName !== filterSupplier) return false
      }

      // 4. Payment Status Filter
      if (filterStatus !== 'all') {
        const isOverdue = (p.balanceDue || 0) > 0 && !!p.dueDate && p.dueDate < todayStr
        if (filterStatus === 'Overdue') {
          if (!isOverdue) return false
        } else if (filterStatus === 'Paid') {
          if (p.status !== 'Paid' && (p.balanceDue || 0) > 0) return false
        } else if (filterStatus === 'Partial') {
          if (p.status !== 'Partial' || (p.balanceDue || 0) === 0) return false
        } else if (filterStatus === 'Pending') {
          if ((p.balanceDue || 0) === 0) return false
        }
      }

      // 5. Date Range Filter
      if (filterDateRange !== 'all') {
        const pDate = p.date || ''
        if (filterDateRange === 'today') {
          if (pDate !== todayStr) return false
        } else if (filterDateRange === 'this_week') {
          const now = new Date()
          const dayOfWeek = now.getDay() || 7
          const monday = new Date(now)
          monday.setDate(now.getDate() - dayOfWeek + 1)
          const mondayStr = monday.toISOString().slice(0, 10)
          if (pDate < mondayStr || pDate > todayStr) return false
        } else if (filterDateRange === 'this_month') {
          if (!pDate.startsWith(currentMonthStr)) return false
        } else if (filterDateRange === 'this_quarter') {
          const m = new Date().getMonth()
          const qStartMonth = Math.floor(m / 3) * 3 + 1
          const qStartStr = `${new Date().getFullYear()}-${String(qStartMonth).padStart(2, '0')}-01`
          if (pDate < qStartStr) return false
        } else if (filterDateRange === 'this_year') {
          const yStr = `${new Date().getFullYear()}`
          if (!pDate.startsWith(yStr)) return false
        } else if (filterDateRange === 'custom') {
          if (customStartDate && pDate < customStartDate) return false
          if (customEndDate && pDate > customEndDate) return false
        }
      }

      // 6. Returns & Defects Filter Chip
      if (filterReturnOrDefect !== null) {
        if (filterReturnOrDefect === true && !p.isReturnOrDefect) return false
      }

      return true
    }).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.poNumber || '').localeCompare(a.poNumber || ''))
  }, [
    db.purchases,
    searchQuery,
    filterCategory,
    filterSupplier,
    filterStatus,
    filterDateRange,
    customStartDate,
    customEndDate,
    filterReturnOrDefect,
    todayStr,
    currentMonthStr,
  ])

  // --- ANALYTICS BREAKDOWNS (Respecting active filters) ---
  const analyticsData = useMemo(() => {
    const list = filteredPurchases

    // 1. Spend by Category
    const catMap: Record<string, number> = {}
    list.forEach((p) => {
      const c = p.category || (p.purchaseType === 'Finished Product' ? 'Finished Product' : 'Raw Material')
      catMap[c] = (catMap[c] || 0) + (p.grandTotal || 0)
    })
    const totalSpend = Object.values(catMap).reduce((a, b) => a + b, 0)
    const categorySpendList = Object.entries(catMap)
      .map(([name, amount]) => ({
        name,
        amount,
        pct: totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    // 2. Trend (Last 6 Months)
    const months: Array<{ key: string; label: string; amount: number }> = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('en-GB', { month: 'short' })
      const amount = (db.purchases || [])
        .filter((p) => (p.date || '').startsWith(key))
        .reduce((sum, p) => sum + (p.grandTotal || 0), 0)
      months.push({ key, label, amount })
    }
    const maxTrendAmount = Math.max(...months.map((m) => m.amount), 1)

    // 3. Payment Status Breakdown
    const paidAmount = list.reduce((sum, p) => sum + (p.amountPaid || 0), 0)
    const pendingAmount = list
      .filter((p) => {
        const isOverdue = (p.balanceDue || 0) > 0 && !!p.dueDate && p.dueDate < todayStr
        return (p.balanceDue || 0) > 0 && !isOverdue
      })
      .reduce((sum, p) => sum + (p.balanceDue || 0), 0)
    const overdueAmount = list
      .filter((p) => (p.balanceDue || 0) > 0 && !!p.dueDate && p.dueDate < todayStr)
      .reduce((sum, p) => sum + (p.balanceDue || 0), 0)
    const totalStatusAmount = paidAmount + pendingAmount + overdueAmount

    return {
      totalSpend,
      categorySpendList,
      months,
      maxTrendAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      paidPct: totalStatusAmount > 0 ? Math.round((paidAmount / totalStatusAmount) * 100) : 100,
      pendingPct: totalStatusAmount > 0 ? Math.round((pendingAmount / totalStatusAmount) * 100) : 0,
      overduePct: totalStatusAmount > 0 ? Math.round((overdueAmount / totalStatusAmount) * 100) : 0,
    }
  }, [filteredPurchases, db.purchases, todayStr])

  // --- ACTIONS ---
  const handleExportPurchasesCSV = () => {
    const headers = [
      'PO #',
      'Date',
      'Supplier',
      'Category',
      'Items Summary',
      'Grand Total (Rs)',
      'Amount Paid (Rs)',
      'Balance Due (Rs)',
      'Payment Status',
      'Due Date',
      'Payment Method',
      'Account',
      'Reference #',
      'Notes',
    ]
    const rows = filteredPurchases.map((p) => [
      p.poNumber || p.id,
      p.date,
      p.supplierName,
      p.category || p.purchaseType || 'Raw Material',
      (p.items || []).map((i) => `${i.name} (${i.quantity} ${i.unit})`).join('; '),
      p.grandTotal,
      p.amountPaid,
      p.balanceDue,
      p.status,
      p.dueDate || '—',
      p.paymentMethod,
      p.paymentAccount || 'cash-in-hand',
      p.referenceNumber || p.transactionRef || '—',
      p.notes || '—',
    ])
    exportToCSV(`Purchases_Register_${todayStr}`, headers, rows)
  }

  const handleDeletePurchase = (purchaseId: string) => {
    if (!confirm('Are you sure you want to delete this purchase order? Associated inventory and ledger balances will be retained.')) {
      return
    }
    const updatedPurchases = db.purchases.filter((p) => p.id !== purchaseId)
    // Remove linked auto-expense if exists
    const updatedExpenses = db.expenses.filter((e) => e.expenseNumber !== `EXP-${purchaseId}`)
    const updatedDb: AppDatabase = {
      ...db,
      purchases: updatedPurchases,
      expenses: updatedExpenses,
    }
    onSaveDatabase(updatedDb)
  }

  // --- CATEGORY MANAGEMENT STATE & ACTIONS ---
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('emerald')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')

  const handleAddCategory = () => {
    if (!newCatName.trim()) return
    const newCat: PurchaseCategoryItem = {
      id: `pcat-${Date.now()}`,
      name: newCatName.trim(),
      description: newCatDesc.trim() || undefined,
      color: newCatColor,
      isCustom: true,
      createdAt: todayStr,
    }
    const updatedCategories = [...purchaseCategories, newCat]
    const updatedDb: AppDatabase = {
      ...db,
      purchaseCategories: updatedCategories,
    }
    onSaveDatabase(updatedDb)
    setNewCatName('')
    setNewCatDesc('')
  }

  const handleRenameCategory = (catId: string, currentName: string) => {
    if (!editingCatName.trim() || editingCatName.trim() === currentName) {
      setEditingCatId(null)
      return
    }
    const newName = editingCatName.trim()
    const updatedCategories = purchaseCategories.map((c) => (c.id === catId ? { ...c, name: newName } : c))
    // Update all existing purchase records with old category name
    const updatedPurchases = db.purchases.map((p) => (p.category === currentName ? { ...p, category: newName } : p))
    const updatedDb: AppDatabase = {
      ...db,
      purchaseCategories: updatedCategories,
      purchases: updatedPurchases,
    }
    onSaveDatabase(updatedDb)
    setEditingCatId(null)
    setEditingCatName('')
  }

  const handleDeleteCategory = (catId: string, catName: string) => {
    if (!confirm(`Delete category "${catName}"? Existing purchases will be marked as Raw Material.`)) return
    const updatedCategories = purchaseCategories.filter((c) => c.id !== catId)
    const updatedPurchases = db.purchases.map((p) => (p.category === catName ? { ...p, category: 'Raw Material' } : p))
    const updatedDb: AppDatabase = {
      ...db,
      purchaseCategories: updatedCategories,
      purchases: updatedPurchases,
    }
    onSaveDatabase(updatedDb)
  }

  return (
    <div className="space-y-6 pb-12" id="purchases-module-root">
      {/* 1. SIMPLIFIED HEADER (Clean & Minimal: Page Title + New Purchase CTA) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Purchases</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                {filteredPurchases.length} of {db.purchases?.length || 0} Orders
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">Procurement, supplier billing & automatic inventory sync</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-sm"
            title="Toggle Analytics & Breakdown Charts"
          >
            <BarChart3 className="w-3.5 h-3.5 text-stone-500" />
            <span>{showAnalytics ? 'Hide Trends' : 'View Trends'}</span>
            {showAnalytics ? <ChevronUp className="w-3 h-3 text-stone-400" /> : <ChevronDown className="w-3 h-3 text-stone-400" />}
          </button>

          <button
            onClick={() => setIsManagingCategories(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-sm"
            id="btn-manage-categories"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Manage Categories</span>
          </button>

          <button
            onClick={handleExportPurchasesCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-sm"
            title="Export filtered records as CSV/Excel spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingPurchase(null)
              setIsCreatingPurchase(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all transform active:scale-95"
            id="btn-new-purchase"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Purchase</span>
          </button>
        </div>
      </div>

      {/* 2. VISUAL STAT CARDS (3-4 Key Metrics Max with bold icons & trend indicators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="purchase-kpi-cards">
        {/* Metric 1: Total Purchases This Month */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">This Month's Purchases</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{formatPKR(kpis.totalThisMonth)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-stone-500">{kpis.thisMonthCount} order{kpis.thisMonthCount !== 1 ? 's' : ''} logged</span>
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium ${
                kpis.monthTrendPct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'
              }`}
            >
              {kpis.monthTrendPct >= 0 ? <TrendingUp className="w-3 h-3" /> : null}
              {kpis.monthTrendPct >= 0 ? `+${kpis.monthTrendPct}%` : `${kpis.monthTrendPct}%`} vs last mo
            </span>
          </div>
        </div>

        {/* Metric 2: Total Paid */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Paid Out</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-900">{formatPKR(kpis.totalPaidAll)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-stone-500">{kpis.paidPct}% settlement rate</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-700">
              Synced to Cash & Bank
            </span>
          </div>
        </div>

        {/* Metric 3: Pending Payables */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Pending Payables</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900">{formatPKR(kpis.totalPendingPayables)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-stone-500">{kpis.pendingCount} unpaid / partial POs</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-800">
              Supplier Credit
            </span>
          </div>
        </div>

        {/* Metric 4: Overdue Payments */}
        <div
          className={`bg-white rounded-xl border p-4 shadow-sm relative overflow-hidden ${
            kpis.totalOverdue > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-700 uppercase tracking-wider">Overdue Payments</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                kpis.totalOverdue > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-stone-100 text-stone-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${kpis.totalOverdue > 0 ? 'text-rose-700' : 'text-stone-700'}`}>
              {formatPKR(kpis.totalOverdue)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className={kpis.totalOverdue > 0 ? 'text-rose-600 font-medium' : 'text-stone-500'}>
              {kpis.overdueCount} bill{kpis.overdueCount !== 1 ? 's' : ''} past due date
            </span>
            {kpis.totalOverdue > 0 ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded font-bold bg-rose-100 text-rose-800 text-[10px]">
                ACTION REQUIRED
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700 text-[10px]">
                All Clear
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. COMPACT CHARTS / ANALYTICS ROW (Collapsible, Glanceable, respects active filters) */}
      {showAnalytics && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 shadow-sm transition-all" id="purchase-analytics-row">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Chart 1: Spend by Category */}
            <div className="bg-white p-3.5 rounded-lg border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-emerald-600" />
                  Spend by Category
                </span>
                <span className="text-[11px] text-stone-400 font-medium">Total: {formatPKR(analyticsData.totalSpend)}</span>
              </div>

              {analyticsData.categorySpendList.length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center">No purchases match active filter</p>
              ) : (
                <div className="space-y-2 pt-1">
                  {analyticsData.categorySpendList.slice(0, 4).map((c) => {
                    const style = getCategoryStyle(c.name)
                    return (
                      <div key={c.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-stone-700 flex items-center gap-1.5 truncate max-w-[140px]">
                            <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                            {c.name}
                          </span>
                          <span className="text-stone-500 font-mono text-[11px]">
                            {formatPKR(c.amount)} <span className="text-stone-400 font-sans">({c.pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full ${style.dot}`} style={{ width: `${c.pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Chart 2: Procurement Trend (Last 6 Months) */}
            <div className="bg-white p-3.5 rounded-lg border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                  6-Month Purchase Trend
                </span>
                <span className="text-[11px] text-stone-400">Monthly Volume</span>
              </div>
              <div className="h-28 flex items-end justify-between gap-2 pt-2 px-1">
                {analyticsData.months.map((m) => {
                  const heightPct = Math.max(8, Math.round((m.amount / analyticsData.maxTrendAmount) * 100))
                  const isCurrent = m.key === currentMonthStr
                  return (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="w-full bg-stone-100 rounded-t h-20 flex items-end overflow-hidden">
                        <div
                          className={`w-full rounded-t transition-all ${
                            isCurrent ? 'bg-emerald-600' : 'bg-stone-400 group-hover:bg-emerald-500'
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className={`text-[10px] ${isCurrent ? 'font-bold text-emerald-700' : 'text-stone-500'}`}>
                        {m.label}
                      </span>

                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 bg-stone-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {formatPKR(m.amount)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Chart 3: Settlement Distribution */}
            <div className="bg-white p-3.5 rounded-lg border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                  Payment Status Distribution
                </span>
                <span className="text-[11px] text-stone-400">Settled vs Due</span>
              </div>

              {/* Segmented Horizontal Bar */}
              <div className="w-full h-4 bg-stone-100 rounded-full overflow-hidden flex my-3">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${analyticsData.paidPct}%` }}
                  title={`Paid: ${formatPKR(analyticsData.paidAmount)} (${analyticsData.paidPct}%)`}
                />
                <div
                  className="bg-amber-500 h-full transition-all"
                  style={{ width: `${analyticsData.pendingPct}%` }}
                  title={`Pending: ${formatPKR(analyticsData.pendingAmount)} (${analyticsData.pendingPct}%)`}
                />
                <div
                  className="bg-rose-500 h-full transition-all"
                  style={{ width: `${analyticsData.overduePct}%` }}
                  title={`Overdue: ${formatPKR(analyticsData.overdueAmount)} (${analyticsData.overduePct}%)`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-1 rounded bg-emerald-50 border border-emerald-100">
                  <span className="block text-[10px] text-emerald-800 font-medium">Paid</span>
                  <span className="text-xs font-bold text-emerald-700">{analyticsData.paidPct}%</span>
                  <span className="block text-[9px] text-emerald-600 truncate">{formatPKR(analyticsData.paidAmount)}</span>
                </div>
                <div className="p-1 rounded bg-amber-50 border border-amber-100">
                  <span className="block text-[10px] text-amber-800 font-medium">Pending</span>
                  <span className="text-xs font-bold text-amber-700">{analyticsData.pendingPct}%</span>
                  <span className="block text-[9px] text-amber-600 truncate">{formatPKR(analyticsData.pendingAmount)}</span>
                </div>
                <div className="p-1 rounded bg-rose-50 border border-rose-100">
                  <span className="block text-[10px] text-rose-800 font-medium">Overdue</span>
                  <span className="text-xs font-bold text-rose-700">{analyticsData.overduePct}%</span>
                  <span className="block text-[9px] text-rose-600 truncate">{formatPKR(analyticsData.overdueAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. CLEAN SINGLE-ROW TOOLBAR FOR FILTERS */}
      <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm space-y-3" id="purchase-filters-toolbar">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search PO #, supplier name, raw material, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-stone-900 placeholder:text-stone-400"
              id="input-purchase-search"
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

          {/* Supplier Dropdown */}
          <div className="w-full sm:w-48">
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="w-full py-2 px-2.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-700"
            >
              <option value="all">All Suppliers ({db.suppliers.length})</option>
              {db.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Dropdown */}
          <div className="w-full sm:w-36">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full py-2 px-2.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-700"
            >
              <option value="all">All Statuses</option>
              <option value="Paid">Paid in Full</option>
              <option value="Partial">Partial Paid</option>
              <option value="Pending">Pending Due</option>
              <option value="Overdue">Overdue Only</option>
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="w-full sm:w-36">
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value as any)}
              className="w-full py-2 px-2.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-700"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Returns & Defects Filter Toggle Chip */}
          <button
            onClick={() => setFilterReturnOrDefect(filterReturnOrDefect === true ? null : true)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all shrink-0 ${
              filterReturnOrDefect === true
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
            title="Filter orders with returns or defect reports"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Returns & Defects</span>
            {filterReturnOrDefect === true && <Check className="w-3 h-3 ml-0.5" />}
          </button>
        </div>

        {/* Category Filter Pills (Icon + Label Pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mr-1 shrink-0">Category:</span>
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-all shrink-0 ${
              filterCategory === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Categories
          </button>

          {purchaseCategories.map((cat) => {
            const style = getCategoryStyle(cat.name)
            const Icon = style.icon
            const isSelected = filterCategory.toLowerCase() === cat.name.toLowerCase()
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(isSelected ? 'all' : cat.name)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Icon className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-stone-500'}`} />
                <span>{cat.name}</span>
              </button>
            )
          })}
        </div>

        {/* Custom Date Range Row (Shown when custom is selected) */}
        {filterDateRange === 'custom' && (
          <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
            <span className="text-xs text-stone-500">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="text-xs py-1 px-2 border border-stone-200 rounded"
            />
            <span className="text-xs text-stone-500">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="text-xs py-1 px-2 border border-stone-200 rounded"
            />
          </div>
        )}
      </div>

      {/* 5. REDESIGNED RECORDS LIST (Card-Style Row Layout) */}
      <div className="space-y-3" id="purchases-records-container">
        {filteredPurchases.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-stone-800">No Purchase Records Found</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
              No purchase orders match your active search or filter criteria. Create a new purchase order or reset filters.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterCategory('all')
                  setFilterSupplier('all')
                  setFilterStatus('all')
                  setFilterDateRange('all')
                  setFilterReturnOrDefect(null)
                }}
                className="px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
              >
                Reset All Filters
              </button>
              <button
                onClick={() => {
                  setEditingPurchase(null)
                  setIsCreatingPurchase(true)
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                Create New Purchase
              </button>
            </div>
          </div>
        ) : (
          filteredPurchases.map((purchase) => {
            const style = getCategoryStyle(purchase.category)
            const CategoryIcon = style.icon
            const isOverdue = (purchase.balanceDue || 0) > 0 && !!purchase.dueDate && purchase.dueDate < todayStr
            const isPaid = purchase.status === 'Paid' || (purchase.balanceDue || 0) === 0
            const isPartial = !isPaid && (purchase.amountPaid || 0) > 0

            return (
              <div
                key={purchase.id}
                className="bg-white rounded-xl border border-stone-200 hover:border-emerald-300 hover:shadow-md transition-all p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
              >
                {/* Left: Category Icon + PO # + Date */}
                <div className="flex items-start gap-3 min-w-[200px]">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${style.bg}`}
                    title={purchase.category || 'Raw Material'}
                  >
                    <CategoryIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-900">{purchase.poNumber || purchase.purchaseNumber}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${style.bg}`}>
                        {purchase.category || purchase.purchaseType || 'Raw Material'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        {formatDate(purchase.date)}
                      </span>
                      {purchase.time && <span className="text-stone-400">• {purchase.time}</span>}
                    </div>
                  </div>
                </div>

                {/* Middle: Supplier Name, Item Chips, and Defect/Return Tags */}
                <div className="flex-1 min-w-[220px] max-w-xl space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-stone-900">{purchase.supplierName}</span>
                    {purchase.supplierPhone && (
                      <span className="text-xs text-stone-400 flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3" />
                        {purchase.supplierPhone}
                      </span>
                    )}
                    {purchase.isReturnOrDefect && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800 border border-rose-200">
                        <AlertCircle className="w-3 h-3" />
                        RETURN / DEFECT
                      </span>
                    )}
                  </div>

                  {/* Line Item Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(purchase.items && purchase.items.length > 0 ? purchase.items : [
                      {
                        name: purchase.purchaseType || 'Procured Item',
                        quantity: purchase.quantity || 1,
                        unit: purchase.unit || 'Units',
                        unitPrice: purchase.unitPrice || purchase.grandTotal,
                      },
                    ]).map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200"
                      >
                        <span className="text-stone-900 font-semibold">{item.name}</span>
                        <span className="text-stone-500 text-[11px]">
                          ({item.quantity} {item.unit} @ Rs.{item.unitPrice})
                        </span>
                      </span>
                    ))}
                  </div>

                  {purchase.notes && (
                    <p className="text-xs text-stone-500 truncate max-w-md italic">
                      "{purchase.notes}"
                    </p>
                  )}
                </div>

                {/* Right: Amounts & Payment Status Badge */}
                <div className="flex flex-col md:items-end gap-1 shrink-0 min-w-[170px]">
                  <div className="text-right">
                    <span className="text-base font-bold text-stone-900 block font-mono">
                      {formatPKR(purchase.grandTotal)}
                    </span>
                    <span className="text-[11px] text-stone-500 block">
                      Paid: <span className="text-emerald-700 font-medium">{formatPKR(purchase.amountPaid)}</span>
                      {purchase.balanceDue > 0 && (
                        <> • Due: <span className="text-amber-700 font-medium">{formatPKR(purchase.balanceDue)}</span></>
                      )}
                    </span>
                  </div>

                  {/* Status Badge & Due Date */}
                  <div className="mt-0.5 flex flex-col items-end gap-1">
                    <div>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Paid in Full
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Overdue ({formatDate(purchase.dueDate)})
                        </span>
                      ) : isPartial ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Partial Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                          <Clock className="w-3 h-3 text-stone-500" />
                          Pending Bill
                        </span>
                      )}
                    </div>
                    {purchase.dueDate && purchase.balanceDue > 0 && (
                      <DueDateBadge dueDate={purchase.dueDate} balanceDue={purchase.balanceDue} />
                    )}
                  </div>
                </div>

                {/* Actions: Small Icon Buttons */}
                <div className="flex items-center gap-1 border-t md:border-t-0 md:border-l border-stone-100 pt-2 md:pt-0 md:pl-3 shrink-0">
                  {/* Small Vendor Ledger Icon Button */}
                  <button
                    onClick={() => {
                      if (onNavigate) {
                        onNavigate('suppliers-management')
                      }
                    }}
                    className="p-1.5 text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="View Supplier Ledger & Balance"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>

                  {/* View Details / PDF */}
                  <button
                    onClick={() => setViewingPurchase(purchase)}
                    className="p-1.5 text-stone-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Purchase Voucher & Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => {
                      setEditingPurchase(purchase)
                      setIsCreatingPurchase(true)
                    }}
                    className="p-1.5 text-stone-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Edit Purchase Order"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeletePurchase(purchase.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Purchase"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. NEW / EDIT PURCHASE ORDER MODAL (Guided, Smart, 3 Sections) */}
      {/* ========================================================================= */}
      {isCreatingPurchase && (
        <PurchaseOrderModal
          db={db}
          editingPurchase={editingPurchase}
          purchaseCategories={purchaseCategories}
          onClose={() => {
            setIsCreatingPurchase(false)
            setEditingPurchase(null)
          }}
          onSave={(savedPurchase, autoSyncOpts) => {
            // Auto-sync engine execution:
            let updatedPurchases = [...(db.purchases || [])]
            if (editingPurchase) {
              updatedPurchases = updatedPurchases.map((p) => (p.id === savedPurchase.id ? savedPurchase : p))
            } else {
              updatedPurchases = [savedPurchase, ...updatedPurchases]
            }

            // 1. Supplier Update (or auto-create new supplier if created inline)
            let updatedSuppliers = [...(db.suppliers || [])]
            const existingSupIdx = updatedSuppliers.findIndex((s) => s.id === savedPurchase.supplierId || s.name === savedPurchase.supplierName)
            if (existingSupIdx >= 0) {
              // Update supplier balance
              const cur = updatedSuppliers[existingSupIdx]
              const balanceDelta = savedPurchase.balanceDue - (editingPurchase?.balanceDue || 0)
              updatedSuppliers[existingSupIdx] = {
                ...cur,
                currentBalance: Math.max(0, (cur.currentBalance || 0) + balanceDelta),
                updatedAt: todayStr,
              }
            } else if (savedPurchase.supplierName) {
              // Auto-create new supplier
              const newSup: SupplierItem = {
                id: savedPurchase.supplierId || `sup-${Date.now()}`,
                name: savedPurchase.supplierName,
                contactPerson: savedPurchase.supplierName,
                address: 'Main Market',
                phone: savedPurchase.supplierPhone || '',
                category: savedPurchase.category || 'Raw Material',
                city: 'Lahore',
                openingBalance: 0,
                currentBalance: savedPurchase.balanceDue,
                status: 'Active',
                notes: `Auto-created from purchase ${savedPurchase.poNumber}`,
                updatedAt: todayStr,
              }
              updatedSuppliers.push(newSup)
            }

            // 2. Inventory / Stock Levels Update
            let updatedRawMaterials = [...(db.rawMaterials || [])]
            let updatedProducts = [...(db.products || [])]

            if (autoSyncOpts.syncInventory) {
              savedPurchase.items?.forEach((item) => {
                // Check if item exists in Raw Materials
                const rawIdx = updatedRawMaterials.findIndex((r) => r.id === item.itemId || r.name.toLowerCase() === item.name.toLowerCase())
                if (rawIdx >= 0) {
                  const r = updatedRawMaterials[rawIdx]
                  updatedRawMaterials[rawIdx] = {
                    ...r,
                    quantity: (r.quantity || 0) + (item.quantity || 0),
                    unitCost: item.unitPrice || r.unitCost,
                    updatedAt: todayStr,
                  }
                }

                // Check if item exists in Products
                const prodIdx = updatedProducts.findIndex((p) => p.id === item.itemId || p.name.toLowerCase() === item.name.toLowerCase())
                if (prodIdx >= 0) {
                  const p = updatedProducts[prodIdx]
                  updatedProducts[prodIdx] = {
                    ...p,
                    quantity: (p.quantity || 0) + (item.quantity || 0),
                    costPrice: item.unitPrice || p.costPrice,
                    updatedAt: todayStr,
                  }
                }
              })
            }

            // 3. Auto-Create / Update Expense Entry (When amountPaid > 0)
            let updatedExpenses = [...(db.expenses || [])]
            let updatedAccounts = [...(db.accounts || [])]

            if (savedPurchase.amountPaid > 0) {
              const expenseId = `exp-po-${savedPurchase.id}`
              const expIdx = updatedExpenses.findIndex((e) => e.id === expenseId || e.expenseNumber === `EXP-${savedPurchase.poNumber}`)
              const newExp: ExpenseItem = {
                id: expenseId,
                expenseNumber: `EXP-${savedPurchase.poNumber}`,
                date: savedPurchase.date,
                category: 'Raw Materials / Ingredients',
                description: `Procurement: PO ${savedPurchase.poNumber} (${savedPurchase.supplierName})`,
                amount: savedPurchase.amountPaid,
                paidTo: savedPurchase.supplierName,
                paymentMethod: savedPurchase.paymentMethod as any,
                paymentAccount: savedPurchase.paymentAccount || 'cash-in-hand',
                status: 'Paid',
                transactionRef: savedPurchase.transactionRef,
                notes: `Auto-synced from Purchase ${savedPurchase.poNumber}`,
                createdAt: new Date().toISOString(),
              }

              if (expIdx >= 0) {
                updatedExpenses[expIdx] = newExp
              } else {
                updatedExpenses = [newExp, ...updatedExpenses]
              }

              // Deduct from Accounts
              const acctId = savedPurchase.paymentAccount || 'cash-in-hand'
              const acctIdx = updatedAccounts.findIndex((a) => a.id === acctId)
              if (acctIdx >= 0) {
                const acct = updatedAccounts[acctIdx]
                const paidDelta = savedPurchase.amountPaid - (editingPurchase?.amountPaid || 0)
                updatedAccounts[acctIdx] = {
                  ...acct,
                  balance: Math.max(0, acct.balance - paidDelta),
                  updatedAt: todayStr,
                }
              }
            }

            const updatedDb: AppDatabase = {
              ...db,
              purchases: updatedPurchases,
              suppliers: updatedSuppliers,
              rawMaterials: updatedRawMaterials,
              products: updatedProducts,
              expenses: updatedExpenses,
              accounts: updatedAccounts,
            }

            onSaveDatabase(updatedDb)
            setIsCreatingPurchase(false)
            setEditingPurchase(null)
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 7. MANAGE CATEGORIES MODAL */}
      {/* ========================================================================= */}
      {isManagingCategories && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Manage Purchase Categories</h3>
                  <p className="text-xs text-stone-500">Create, rename, or merge procurement categories</p>
                </div>
              </div>
              <button
                onClick={() => setIsManagingCategories(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Category Input */}
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
              <span className="text-xs font-semibold text-stone-700 block">Add New Category</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Laboratory Supplies, Boiler Fuel..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!newCatName.trim()}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shrink-0"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Existing Categories List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
                Existing Categories ({purchaseCategories.length})
              </span>
              {purchaseCategories.map((cat) => {
                const count = (db.purchases || []).filter(
                  (p) => (p.category || '').toLowerCase() === cat.name.toLowerCase()
                ).length
                const isEditing = editingCatId === cat.id

                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="px-2 py-1 bg-white border border-stone-300 rounded text-xs w-full"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenameCategory(cat.id, cat.name)}
                          className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCatId(null)}
                          className="px-2 py-1 bg-stone-200 text-stone-700 rounded text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-800">{cat.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-stone-200 text-stone-700">
                            {count} order{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCatId(cat.id)
                              setEditingCatName(cat.name)
                            }}
                            className="p-1 text-stone-400 hover:text-stone-700"
                            title="Rename"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="p-1 text-stone-400 hover:text-rose-600"
                            title="Delete"
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

            <div className="flex justify-end pt-2 border-t border-stone-100">
              <button
                onClick={() => setIsManagingCategories(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. VIEW PURCHASE DETAILS / VOUCHER MODAL */}
      {/* ========================================================================= */}
      {viewingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-stone-900">Purchase Voucher: {viewingPurchase.poNumber}</h3>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                    {viewingPurchase.category || 'Raw Material'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Issued on {formatDate(viewingPurchase.date)} {viewingPurchase.time ? `at ${viewingPurchase.time}` : ''}
                </p>
              </div>
              <button
                onClick={() => setViewingPurchase(null)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Supplier & Financial Overview */}
            <div className="grid grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
              <div>
                <span className="text-stone-400 block uppercase tracking-wider text-[10px] font-bold">Supplier Information</span>
                <span className="text-sm font-bold text-stone-900 block mt-1">{viewingPurchase.supplierName}</span>
                {viewingPurchase.supplierPhone && (
                  <span className="text-stone-600 block mt-0.5">Phone: {viewingPurchase.supplierPhone}</span>
                )}
                {viewingPurchase.referenceNumber && (
                  <span className="text-stone-500 block mt-0.5">Vendor Ref #: {viewingPurchase.referenceNumber}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-stone-400 block uppercase tracking-wider text-[10px] font-bold">Payment & Settlement</span>
                <span className="text-sm font-bold text-stone-900 block mt-1 font-mono">{formatPKR(viewingPurchase.grandTotal)}</span>
                <span className="text-emerald-700 block font-medium">Paid: {formatPKR(viewingPurchase.amountPaid)}</span>
                {viewingPurchase.balanceDue > 0 && (
                  <span className="text-rose-700 block font-bold">
                    Balance Due: {formatPKR(viewingPurchase.balanceDue)} (Due {formatDate(viewingPurchase.dueDate)})
                  </span>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <span className="text-xs font-semibold text-stone-700 block mb-2">Procured Line Items</span>
              <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                    <tr>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3 text-right">Unit Rate</th>
                      <th className="py-2 px-3 text-right">Total (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {(viewingPurchase.items || []).map((item, i) => (
                      <tr key={i} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3 font-medium text-stone-900">{item.name}</td>
                        <td className="py-2.5 px-3 text-right text-stone-600">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right text-stone-600 font-mono">
                          {formatPKR(item.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-stone-900 font-mono">
                          {formatPKR(item.total || (item.quantity * item.unitPrice + (item.otherCost || 0)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attached Scanned Invoice / Payment Screenshot */}
            {(viewingPurchase.invoiceImage || viewingPurchase.paymentScreenshot) && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-stone-700 block">Attached Verification Receipts</span>
                <div className="flex gap-4">
                  {viewingPurchase.invoiceImage && (
                    <div className="border border-stone-200 rounded-lg p-2 bg-stone-50 text-center">
                      <span className="text-[11px] font-medium text-stone-600 block mb-1">Supplier Bill / Invoice</span>
                      <img
                        src={viewingPurchase.invoiceImage}
                        alt="Bill receipt"
                        className="max-h-32 rounded border border-stone-200 mx-auto cursor-pointer hover:opacity-90"
                        onClick={() => setPreviewImage({ src: viewingPurchase.invoiceImage!, title: 'Supplier Bill' })}
                      />
                    </div>
                  )}
                  {viewingPurchase.paymentScreenshot && (
                    <div className="border border-stone-200 rounded-lg p-2 bg-stone-50 text-center">
                      <span className="text-[11px] font-medium text-stone-600 block mb-1">Payment IBFT Screenshot</span>
                      <img
                        src={viewingPurchase.paymentScreenshot}
                        alt="Payment screenshot"
                        className="max-h-32 rounded border border-stone-200 mx-auto cursor-pointer hover:opacity-90"
                        onClick={() => setPreviewImage({ src: viewingPurchase.paymentScreenshot!, title: 'Payment IBFT Receipt' })}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <button
                onClick={() => {
                  const sup = db.suppliers.find((s) => s.id === viewingPurchase.supplierId || s.name === viewingPurchase.supplierName)
                  generatePurchaseVoucherPDF(viewingPurchase, sup)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Voucher PDF</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const toEdit = viewingPurchase
                    setViewingPurchase(null)
                    setEditingPurchase(toEdit)
                    setIsCreatingPurchase(true)
                  }}
                  className="px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                >
                  Edit Order
                </button>
                <button
                  onClick={() => setViewingPurchase(null)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-black rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-4 max-w-2xl w-full text-center space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="font-semibold text-sm text-stone-800">{previewImage.title}</span>
              <button onClick={() => setPreviewImage(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={previewImage.src} alt={previewImage.title} className="max-h-[75vh] mx-auto rounded-lg" />
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// GUIDED NEW PURCHASE ORDER MODAL COMPONENT (Smart, Multi-Item, Inline Creation)
// =========================================================================
interface PurchaseOrderModalProps {
  db: AppDatabase
  editingPurchase: PurchaseItem | null
  purchaseCategories: PurchaseCategoryItem[]
  onClose: () => void
  onSave: (purchase: PurchaseItem, autoSyncOpts: { syncInventory: boolean }) => void
}

function PurchaseOrderModal({
  db,
  editingPurchase,
  purchaseCategories,
  onClose,
  onSave,
}: PurchaseOrderModalProps) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // Section 1: Vendor & General Details
  const [supplierId, setSupplierId] = useState(editingPurchase?.supplierId || (db.suppliers[0]?.id || ''))
  const [supplierName, setSupplierName] = useState(editingPurchase?.supplierName || (db.suppliers[0]?.name || ''))
  const [supplierPhone, setSupplierPhone] = useState(editingPurchase?.supplierPhone || '')
  const [category, setCategory] = useState(editingPurchase?.category || 'Raw Material')
  const [isCustomCategory, setIsCustomCategory] = useState(editingPurchase?.isCustomCategory || false)
  const [customCategoryLabel, setCustomCategoryLabel] = useState(editingPurchase?.customCategoryLabel || '')
  const [poNumber, setPoNumber] = useState(
    editingPurchase?.poNumber || `PO-${new Date().getFullYear()}-${3000 + (db.purchases?.length || 0) + 1}`
  )
  const [date, setDate] = useState(editingPurchase?.date || todayStr)
  const [time, setTime] = useState(editingPurchase?.time || '10:00 AM')
  const [referenceNumber, setReferenceNumber] = useState(editingPurchase?.referenceNumber || '')

  // Inline Quick Add Supplier Drawer
  const [showInlineSupplierForm, setShowInlineSupplierForm] = useState(false)
  const [inlineSupplierName, setInlineSupplierName] = useState('')
  const [inlineSupplierPhone, setInlineSupplierPhone] = useState('')
  const [inlineSupplierCity, setInlineSupplierCity] = useState('Lahore')

  // Section 2: Line Items
  const [items, setItems] = useState<PurchaseLineItem[]>(
    editingPurchase?.items && editingPurchase.items.length > 0
      ? editingPurchase.items
      : [
          {
            id: `item-1`,
            itemId: db.rawMaterials[0]?.id || '',
            name: db.rawMaterials[0]?.name || 'Refined White Sugar',
            quantity: 1000,
            unit: 'kg',
            unitPrice: 145,
            otherCost: 0,
            total: 145000,
          },
        ]
  )

  // Section 3: Payment & Settlement
  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
  }, [items])

  const [paymentStatusType, setPaymentStatusType] = useState<'Paid' | 'Pending' | 'Partial'>(
    editingPurchase ? (editingPurchase.status === 'Unpaid' ? 'Pending' : (editingPurchase.status as 'Paid' | 'Partial')) : 'Paid'
  )
  const [amountPaid, setAmountPaid] = useState<number>(
    editingPurchase ? editingPurchase.amountPaid : grandTotal
  )
  const [dueDate, setDueDate] = useState<string>(
    editingPurchase?.dueDate ||
      new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  )
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Online' | 'Card' | 'Cheque'>(
    editingPurchase?.paymentMethod as any || 'Bank Transfer'
  )
  const [paymentAccount, setPaymentAccount] = useState<'cash-in-hand' | 'meezan-bank' | 'hbl-bank'>(
    editingPurchase?.paymentAccount || 'meezan-bank'
  )
  const [transactionRef, setTransactionRef] = useState(editingPurchase?.transactionRef || '')
  const [notes, setNotes] = useState(editingPurchase?.notes || '')
  const [isReturnOrDefect, setIsReturnOrDefect] = useState(editingPurchase?.isReturnOrDefect || false)
  const [defectNote, setDefectNote] = useState(editingPurchase?.defectNote || '')
  const [invoiceImage, setInvoiceImage] = useState(editingPurchase?.invoiceImage || '')
  const [paymentScreenshot, setPaymentScreenshot] = useState(editingPurchase?.paymentScreenshot || '')

  // Sync Option
  const [syncInventory, setSyncInventory] = useState(true)

  // Selected Supplier Smart Hint Info
  const selectedSupplierObj = useMemo(() => {
    return db.suppliers.find((s) => s.id === supplierId || s.name === supplierName)
  }, [db.suppliers, supplierId, supplierName])

  // Last purchase from this supplier hint
  const lastPurchaseFromSupplier = useMemo(() => {
    return (db.purchases || []).find((p) => p.supplierId === supplierId || p.supplierName === supplierName)
  }, [db.purchases, supplierId, supplierName])

  // Filter suppliers based on selected Category
  const filteredSuppliersForForm = useMemo(() => {
    if (isCustomCategory || !category || category === 'All Categories') return db.suppliers
    const catLower = category.toLowerCase()
    const matching = db.suppliers.filter((s) => {
      if (!s.category) return true
      const sc = s.category.toLowerCase()
      return (
        sc.includes(catLower) ||
        catLower.includes(sc) ||
        sc.includes('general') ||
        sc.includes('all')
      )
    })
    return matching.length > 0 ? matching : db.suppliers
  }, [db.suppliers, category, isCustomCategory])

  // Filter item suggestions based on selected Category
  const filteredItemSuggestions = useMemo(() => {
    const activeCat = isCustomCategory ? customCategoryLabel : category
    const catLower = (activeCat || '').toLowerCase()
    const raw = db.rawMaterials || []
    const prods = db.products || []

    if (catLower.includes('product') || catLower.includes('finished')) {
      return prods.map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit || 'Cartons',
        unitPrice: p.costPrice || 0,
        type: 'product',
      }))
    }
    if (catLower.includes('packag')) {
      const pkgRaw = raw.filter(
        (r) =>
          r.category?.toLowerCase().includes('packag') ||
          r.name.toLowerCase().includes('box') ||
          r.name.toLowerCase().includes('carton') ||
          r.name.toLowerCase().includes('roll') ||
          r.name.toLowerCase().includes('pouch') ||
          r.name.toLowerCase().includes('film') ||
          r.name.toLowerCase().includes('label')
      )
      return (pkgRaw.length > 0 ? pkgRaw : raw).map((r) => ({
        id: r.id,
        name: r.name,
        unit: r.unit || 'Rolls',
        unitPrice: r.unitCost || 0,
        type: 'raw',
      }))
    }
    if (
      catLower.includes('raw') ||
      catLower.includes('grain') ||
      catLower.includes('flour') ||
      catLower.includes('spice') ||
      catLower.includes('oil')
    ) {
      return raw.map((r) => ({
        id: r.id,
        name: r.name,
        unit: r.unit || 'kg',
        unitPrice: r.unitCost || 0,
        type: 'raw',
      }))
    }
    return [
      ...raw.map((r) => ({ id: r.id, name: r.name, unit: r.unit || 'kg', unitPrice: r.unitCost || 0, type: 'raw' })),
      ...prods.map((p) => ({ id: p.id, name: p.name, unit: p.unit || 'Cartons', unitPrice: p.costPrice || 0, type: 'product' })),
    ]
  }, [db.rawMaterials, db.products, category, customCategoryLabel, isCustomCategory])

  // Update line item
  const handleItemChange = (index: number, field: keyof PurchaseLineItem, val: any) => {
    const updated = [...items]
    const item = { ...updated[index], [field]: val }

    if (field === 'quantity' || field === 'unitPrice' || field === 'otherCost') {
      const q = Number(field === 'quantity' ? val : item.quantity) || 0
      const p = Number(field === 'unitPrice' ? val : item.unitPrice) || 0
      const o = Number(field === 'otherCost' ? val : item.otherCost) || 0
      item.total = q * p + o
    }

    // Auto populate unit & price if selecting from raw material or product
    if (field === 'itemId') {
      const rawMatch = db.rawMaterials.find((r) => r.id === val)
      if (rawMatch) {
        item.name = rawMatch.name
        item.unit = rawMatch.unit || 'kg'
        item.unitPrice = rawMatch.unitCost || 0
        item.total = item.quantity * item.unitPrice + (item.otherCost || 0)
      } else {
        const prodMatch = db.products.find((p) => p.id === val)
        if (prodMatch) {
          item.name = prodMatch.name
          item.unit = prodMatch.unit || 'Cartons'
          item.unitPrice = prodMatch.costPrice || 0
          item.total = item.quantity * item.unitPrice + (item.otherCost || 0)
        }
      }
    }

    updated[index] = item
    setItems(updated)
  }

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        name: '',
        quantity: 1,
        unit: 'kg',
        unitPrice: 0,
        otherCost: 0,
        total: 0,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  // Handle supplier change
  const handleSupplierSelect = (id: string) => {
    setSupplierId(id)
    const sup = db.suppliers.find((s) => s.id === id)
    if (sup) {
      setSupplierName(sup.name)
      setSupplierPhone(sup.phone || '')
    }
  }

  // Handle Inline Add Supplier
  const handleSaveInlineSupplier = () => {
    if (!inlineSupplierName.trim()) return
    const newId = `sup-${Date.now()}`
    setSupplierId(newId)
    setSupplierName(inlineSupplierName.trim())
    setSupplierPhone(inlineSupplierPhone.trim())
    setShowInlineSupplierForm(false)
  }

  // Adjust amountPaid when payment status type changes
  const handleStatusTypeChange = (type: 'Paid' | 'Pending' | 'Partial') => {
    setPaymentStatusType(type)
    if (type === 'Paid') {
      setAmountPaid(grandTotal)
    } else if (type === 'Pending') {
      setAmountPaid(0)
    } else if (type === 'Partial') {
      setAmountPaid(Math.round(grandTotal / 2))
    }
  }

  const balanceDue = Math.max(0, grandTotal - (paymentStatusType === 'Pending' ? 0 : amountPaid))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierName.trim()) {
      alert('Please select or enter a supplier name.')
      return
    }
    if (items.length === 0 || !items[0].name.trim()) {
      alert('Please add at least one line item with a name and quantity.')
      return
    }

    const finalStatus: 'Paid' | 'Partial' | 'Unpaid' =
      balanceDue === 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid'

    const saved: PurchaseItem = {
      id: editingPurchase?.id || `po-${Date.now()}`,
      poNumber: poNumber.trim(),
      purchaseNumber: poNumber.trim(),
      purchaseType: (category.includes('Product') ? 'Finished Product' : 'Raw Material') as PurchaseType,
      category: isCustomCategory ? customCategoryLabel.trim() || 'Custom' : category,
      isCustomCategory,
      customCategoryLabel: isCustomCategory ? customCategoryLabel.trim() : undefined,
      date,
      time,
      supplierId,
      supplierName: supplierName.trim(),
      supplierPhone: supplierPhone.trim() || undefined,
      items,
      grandTotal,
      amountPaid: paymentStatusType === 'Pending' ? 0 : amountPaid,
      balanceDue,
      status: finalStatus,
      paymentStatus: finalStatus,
      dueDate: balanceDue > 0 ? dueDate : undefined,
      paymentMethod,
      paymentAccount,
      transactionRef: transactionRef.trim() || undefined,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      isReturnOrDefect,
      defectNote: isReturnOrDefect ? defectNote.trim() : undefined,
      invoiceImage: invoiceImage || undefined,
      paymentScreenshot: paymentScreenshot || undefined,
      createdAt: editingPurchase?.createdAt || new Date().toISOString(),
    }

    onSave(saved, { syncInventory })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto" id="purchase-order-modal">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900">
                  {editingPurchase ? 'Edit Purchase Order' : 'Create New Purchase Order'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {poNumber}
                </span>
              </div>
              <p className="text-[11px] text-stone-500">Guided procurement flow • Category → Supplier → Items → Terms</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ========================================================================= */}
          {/* SECTION 1: 3-STEP DROPDOWN-DRIVEN VENDOR & GENERAL DETAILS */}
          {/* ========================================================================= */}
          <div className="bg-stone-50/80 p-3.5 rounded-xl border border-stone-200 space-y-3">
            <span className="text-[11px] font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              1. Category, Supplier & Date
            </span>

            {/* Inline Add Supplier Drawer */}
            {showInlineSupplierForm && (
              <div className="bg-white p-3 rounded-lg border border-emerald-300 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">Quick Add Custom Supplier</span>
                  <button
                    type="button"
                    onClick={() => setShowInlineSupplierForm(false)}
                    className="text-stone-400 hover:text-stone-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Business Name *"
                    value={inlineSupplierName}
                    onChange={(e) => setInlineSupplierName(e.target.value)}
                    className="h-9 px-2.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Phone (0300...)"
                    value={inlineSupplierPhone}
                    onChange={(e) => setInlineSupplierPhone(e.target.value)}
                    className="h-9 px-2.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="City (e.g. Lahore)"
                    value={inlineSupplierCity}
                    onChange={(e) => setInlineSupplierCity(e.target.value)}
                    className="h-9 px-2.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowInlineSupplierForm(false)}
                    className="px-2.5 py-1 text-xs text-stone-500 hover:text-stone-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveInlineSupplier}
                    className="px-3 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-2xs"
                  >
                    Use This Supplier
                  </button>
                </div>
              </div>
            )}

            {/* Dropdown Grid: Category, Supplier, Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Step 1: Procurement Category Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-stone-700">Category *</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(!isCustomCategory)}
                    className="text-[10px] font-semibold text-emerald-700 hover:underline"
                  >
                    {isCustomCategory ? 'Standard' : '+ Custom'}
                  </button>
                </div>
                {isCustomCategory ? (
                  <input
                    type="text"
                    placeholder="Custom Category Name..."
                    value={customCategoryLabel}
                    onChange={(e) => setCustomCategoryLabel(e.target.value)}
                    className="h-9 w-full px-2.5 text-xs bg-white border border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 text-stone-900"
                    required
                  />
                ) : (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-9 w-full px-2.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-stone-900 cursor-pointer"
                  >
                    {purchaseCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Step 2: Select Supplier Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-stone-700">Supplier *</label>
                  <button
                    type="button"
                    onClick={() => setShowInlineSupplierForm(!showInlineSupplierForm)}
                    className="text-[10px] font-semibold text-emerald-700 hover:underline"
                  >
                    {showInlineSupplierForm ? 'Close' : '+ New Supplier'}
                  </button>
                </div>
                <select
                  value={supplierId}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                  className="h-9 w-full px-2.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-stone-900 cursor-pointer"
                  required
                >
                  <option value="">-- Select Supplier --</option>
                  {filteredSuppliersForForm.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city || 'Punjab'}) {s.category ? `• ${s.category}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 3: Purchase Date */}
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">Purchase Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 w-full px-2.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-stone-900"
                  required
                />
              </div>
            </div>

            {/* Smart Supplier Hint Info Strip */}
            {selectedSupplierObj && (
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg px-3 py-1.5 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="font-bold">{selectedSupplierObj.name}</span>
                  <span className="text-emerald-700 font-mono">• Current Balance: {formatPKR(selectedSupplierObj.currentBalance || 0)}</span>
                </div>
                {lastPurchaseFromSupplier && (
                  <span className="text-[10.5px] text-emerald-700 font-medium">
                    Last PO: #{lastPurchaseFromSupplier.poNumber} ({formatDate(lastPurchaseFromSupplier.date)})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: COMPACT LINE ITEMS BUILDER */}
          {/* ========================================================================= */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                2. Items & Quantities ({isCustomCategory ? customCategoryLabel : category})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item Row</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => {
                const lastItemMatch = (db.purchases || [])
                  .flatMap((p) => p.items || [])
                  .find((i) => i.name.toLowerCase() === item.name.toLowerCase())

                return (
                  <div
                    key={index}
                    className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5"
                  >
                    <div className="grid grid-cols-12 gap-2 items-center">
                      {/* Item Description / Selection */}
                      <div className="col-span-12 sm:col-span-5">
                        <label className="text-[10px] font-semibold text-stone-500 uppercase block mb-0.5">
                          Item Description / Material
                        </label>
                        <input
                          type="text"
                          placeholder="Type or pick material..."
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          list={`item-suggestions-${index}`}
                          className="h-9 w-full px-2.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-stone-900"
                          required
                        />
                        <datalist id={`item-suggestions-${index}`}>
                          {filteredItemSuggestions.map((s) => (
                            <option key={s.id} value={s.name} />
                          ))}
                        </datalist>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] font-semibold text-stone-500 uppercase block mb-0.5">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-9 w-full px-2.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-stone-900 text-right font-mono font-bold"
                          required
                        />
                      </div>

                      {/* Unit */}
                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] font-semibold text-stone-500 uppercase block mb-0.5">
                          Unit
                        </label>
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="h-9 w-full px-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-stone-700"
                        >
                          <option value="kg">kg</option>
                          <option value="Cartons">Cartons</option>
                          <option value="Liters">Liters</option>
                          <option value="Bags">Bags (50kg)</option>
                          <option value="Rolls">Rolls</option>
                          <option value="Pieces">Pieces</option>
                          <option value="Boxes">Boxes</option>
                          <option value="Tons">Tons</option>
                        </select>
                      </div>

                      {/* Rate (PKR) */}
                      <div className="col-span-3 sm:col-span-2">
                        <label className="text-[10px] font-semibold text-stone-500 uppercase block mb-0.5">
                          Rate (PKR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="h-9 w-full px-2.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-stone-900 text-right font-mono font-bold"
                          required
                        />
                      </div>

                      {/* Delete */}
                      <div className="col-span-1 flex justify-center items-end pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length <= 1}
                          className="h-9 w-8 flex items-center justify-center text-stone-400 hover:text-rose-600 disabled:opacity-20 transition-colors"
                          title="Remove Line Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Line total & Previous Price Helper */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-100">
                      {lastItemMatch ? (
                        <span className="text-stone-500">
                          💡 Prev rate: Rs. {lastItemMatch.unitPrice} / {lastItemMatch.unit}
                        </span>
                      ) : (
                        <span className="text-stone-400 italic text-[10px]">
                          Enter quantity and unit rate
                        </span>
                      )}
                      <div className="font-mono font-bold text-stone-900">
                        Line Total: {formatPKR(item.total)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: PAYMENT, SETTLEMENT, DUE DATE & TERMS */}
          {/* ========================================================================= */}
          <div className="bg-stone-50/80 p-3.5 rounded-xl border border-stone-200 space-y-3">
            <span className="text-[11px] font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              3. Payment Settlement & Terms
            </span>

            {/* Total Display */}
            <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-lg border border-stone-200">
              <span className="text-xs font-semibold text-stone-700">Order Grand Total:</span>
              <span className="text-lg font-bold text-stone-900 font-mono">{formatPKR(grandTotal)}</span>
            </div>

            {/* Payment Terms Segmented Control */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-stone-700 block">Payment Terms *</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusTypeChange('Paid')}
                  className={`h-9 px-3 rounded-lg text-xs font-bold transition-all border ${
                    paymentStatusType === 'Paid'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  ✓ Paid in Full
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusTypeChange('Partial')}
                  className={`h-9 px-3 rounded-lg text-xs font-bold transition-all border ${
                    paymentStatusType === 'Partial'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  ◑ Partial Paid
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusTypeChange('Pending')}
                  className={`h-9 px-3 rounded-lg text-xs font-bold transition-all border ${
                    paymentStatusType === 'Pending'
                      ? 'bg-stone-800 text-white border-stone-800 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  ⏳ Pending (100% Credit)
                </button>
              </div>
            </div>

            {/* Amount Paid & Due Date Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {paymentStatusType !== 'Pending' && (
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">Amount Paid Now (PKR) *</label>
                  <input
                    type="number"
                    min="0"
                    max={grandTotal}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    className="h-9 w-full px-2.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-stone-900 font-bold"
                    required
                  />
                  {paymentStatusType === 'Partial' && (
                    <div className="flex gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => setAmountPaid(Math.round(grandTotal * 0.25))}
                        className="px-2 py-0.5 text-[10px] bg-stone-200 rounded font-bold text-stone-700 hover:bg-stone-300"
                      >
                        25%
                      </button>
                      <button
                        type="button"
                        onClick={() => setAmountPaid(Math.round(grandTotal * 0.5))}
                        className="px-2 py-0.5 text-[10px] bg-stone-200 rounded font-bold text-stone-700 hover:bg-stone-300"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => setAmountPaid(Math.round(grandTotal * 0.75))}
                        className="px-2 py-0.5 text-[10px] bg-stone-200 rounded font-bold text-stone-700 hover:bg-stone-300"
                      >
                        75%
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Due Date with Color-Coded Due Date Badge */}
              <div className={paymentStatusType === 'Pending' ? 'col-span-full' : ''}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-stone-700">
                    Payment Due Date {balanceDue > 0 ? '*' : '(Optional)'}
                  </label>
                  {dueDate && (
                    <DueDateBadge dueDate={dueDate} balanceDue={balanceDue} />
                  )}
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 w-full px-2.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-stone-900"
                />
                {balanceDue > 0 && (
                  <div className="text-[10.5px] text-stone-500 mt-1 flex items-center justify-between">
                    <span>Payable Balance: <strong className="text-amber-700 font-mono">{formatPKR(balanceDue)}</strong></span>
                    <span className="text-stone-400">Color-coded alerts</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method & Deduct Account (if amountPaid > 0) */}
            {amountPaid > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-stone-200">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="h-9 w-full px-2.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-stone-900"
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="Bank Transfer">Bank Transfer (IBFT)</option>
                    <option value="Online">Online (Raast ID)</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="Card">Corporate Debit Card</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">Deduct From Account</label>
                  <select
                    value={paymentAccount}
                    onChange={(e) => setPaymentAccount(e.target.value as any)}
                    className="h-9 w-full px-2.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-stone-900"
                  >
                    <option value="cash-in-hand">Cash Register (Factory Cash)</option>
                    <option value="meezan-bank">Meezan Bank Ltd (010203040510)</option>
                    <option value="hbl-bank">Habib Bank Ltd (998877665520)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Return / Defect Flag & Notes */}
            <div className="pt-2 border-t border-stone-200 space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReturnOrDefect}
                  onChange={(e) => setIsReturnOrDefect(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>Flag shipment as Return / Defect / Quality Issue</span>
              </label>

              {isReturnOrDefect && (
                <input
                  type="text"
                  placeholder="Explain defect reason (e.g. 5 bags torn, high moisture content)..."
                  value={defectNote}
                  onChange={(e) => setDefectNote(e.target.value)}
                  className="h-9 w-full px-2.5 text-xs bg-rose-50 border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-rose-900"
                />
              )}

              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">Optional Notes / PO Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Delivery truck # LEB-4920, driver contact, bill ref..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 w-full px-2.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-stone-900"
                />
              </div>
            </div>

            {/* Multi-Module Sync Summary */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-2.5 text-xs text-emerald-900 space-y-0.5">
              <span className="font-bold flex items-center gap-1 text-[11px] text-emerald-800">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Automatic Multi-Module Sync:
              </span>
              <p className="text-[11px] text-emerald-700">
                Records PO to <strong>{supplierName || 'supplier'}</strong> ledger (+{formatPKR(balanceDue)} payable), updates raw material inventory, and generates expense voucher for paid amount.
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all transform active:scale-95"
              id="btn-save-purchase-order"
            >
              {editingPurchase ? 'Update Purchase Order' : 'Save & Sync Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
