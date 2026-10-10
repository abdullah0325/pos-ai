'use client'

import { confirmAction } from '@/lib/confirmation'

import ModuleHeading from './module-heading'

import CatalogPhoto from './catalog-photo'

import { useState, useRef, useEffect } from 'react'
import {
  Plus,
  Search,
  Boxes,
  Package,
  Edit,
  Trash2,
  Download,
  X,
  AlertTriangle,
  ArrowUpCircle,
  Eye,
  Receipt,
  UploadCloud,
  ImageIcon,
  DollarSign,
  Truck,
  Layers,
  Tag,
  Check,
  Palette,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  fileToBase64,
  defaultRawMaterialCategories,
  type AppDatabase,
  type RawMaterialItem,
  type RawMaterialCategory,
  type CategoryItem,
  type Status,
} from '@/lib/db'
import { exportToCSV } from '@/lib/pdf-export'
import { ExpiryDateBadge } from '@/components/status-badges'

interface RawMaterialsViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigateToSupplier?: (supplierId: string) => void
}

export const RAW_CATEGORY_COLORS = [
  { id: 'blue', label: 'Blue (Packaging)', class: 'bg-blue-600 text-white', dot: 'bg-blue-600' },
  { id: 'emerald', label: 'Emerald / Green (Ingredients)', class: 'bg-emerald-600 text-white', dot: 'bg-emerald-600' },
  { id: 'amber', label: 'Amber / Orange (Chemicals)', class: 'bg-amber-600 text-white', dot: 'bg-amber-600' },
  { id: 'purple', label: 'Purple (Flavors)', class: 'bg-purple-600 text-white', dot: 'bg-purple-600' },
  { id: 'rose', label: 'Rose / Red', class: 'bg-rose-600 text-white', dot: 'bg-rose-600' },
  { id: 'indigo', label: 'Indigo', class: 'bg-indigo-600 text-white', dot: 'bg-indigo-600' },
  { id: 'teal', label: 'Teal', class: 'bg-teal-600 text-white', dot: 'bg-teal-600' },
  { id: 'sky', label: 'Sky / Cyan', class: 'bg-sky-600 text-white', dot: 'bg-sky-600' },
  { id: 'stone', label: 'Stone / Gray', class: 'bg-stone-700 text-white', dot: 'bg-stone-700' },
]

export function getCategoryBadgeClass(categoryName: string, rawCategories?: CategoryItem[]) {
  const cat = (categoryName || '').trim()
  const matched = rawCategories?.find((c) => c.name.toLowerCase() === cat.toLowerCase())
  const color = matched?.color?.toLowerCase()

  if (color === 'blue') return 'bg-blue-600 text-white'
  if (color === 'emerald' || color === 'green') return 'bg-emerald-600 text-white'
  if (color === 'amber' || color === 'orange') return 'bg-amber-600 text-white'
  if (color === 'purple') return 'bg-purple-600 text-white'
  if (color === 'rose' || color === 'red') return 'bg-rose-600 text-white'
  if (color === 'indigo') return 'bg-indigo-600 text-white'
  if (color === 'teal') return 'bg-teal-600 text-white'
  if (color === 'sky' || color === 'cyan') return 'bg-sky-600 text-white'
  if (color === 'stone' || color === 'gray') return 'bg-stone-700 text-white'

  // Fallbacks by naming keywords
  const lower = cat.toLowerCase()
  if (lower.includes('packag')) return 'bg-blue-600 text-white'
  if (lower.includes('chem') || lower.includes('mineral')) return 'bg-amber-600 text-white'
  if (lower.includes('flavor')) return 'bg-purple-600 text-white'
  if (lower.includes('ingred') || lower.includes('sugar') || lower.includes('concentrate') || lower.includes('pulp')) {
    return 'bg-emerald-600 text-white'
  }
  return 'bg-stone-700 text-white'
}

export default function RawMaterialsView({
  db,
  onSaveDatabase,
  onNavigateToSupplier,
}: RawMaterialsViewProps) {
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('All')
  const [supplierFilter, setSupplierFilter] = useState<string>('All')
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'unitCost' | 'totalCost' | 'valuation' | 'consumed'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Modals
  const [selectedRawMaterial, setSelectedRawMaterial] = useState<RawMaterialItem | null>(null)
  const [isCreatingMaterial, setIsCreatingMaterial] = useState(false)
  const [isManagingCategories, setIsManagingCategories] = useState(false)
  const [viewDetailsMaterial, setViewDetailsMaterial] = useState<RawMaterialItem | null>(null)
  const [viewingInvoiceImage, setViewingInvoiceImage] = useState<string | null>(null)
  const [stockAdjustmentItem, setStockAdjustmentItem] = useState<{
    id: string
    name: string
    current: number
  } | null>(null)

  // Dynamic Categories
  const rawCategories: CategoryItem[] =
    db.rawMaterialCategories && db.rawMaterialCategories.length > 0
      ? db.rawMaterialCategories
      : defaultRawMaterialCategories

  // Calculate live consumption from production runs for each raw material
  const getMaterialConsumption = (materialId: string, materialSku: string, materialName: string): number => {
    let total = 0
    db.productionRuns.forEach((run) => {
      if (run.consumedMaterials && Array.isArray(run.consumedMaterials)) {
        run.consumedMaterials.forEach((c) => {
          if (c.rawMaterialId === materialId || c.name.toLowerCase() === materialName.toLowerCase()) {
            total += Number(c.quantity || 0)
          }
        })
      }
    })
    return total
  }

  // Get production batches where this raw material was consumed
  const getMaterialUsageHistory = (materialId: string, materialName: string) => {
    const history: Array<{
      batchNumber: string
      date: string
      productName: string
      quantity: number
      unit: string
      totalCost: number
    }> = []

    db.productionRuns.forEach((run) => {
      if (run.consumedMaterials && Array.isArray(run.consumedMaterials)) {
        run.consumedMaterials.forEach((c) => {
          if (c.rawMaterialId === materialId || c.name.toLowerCase() === materialName.toLowerCase()) {
            history.push({
              batchNumber: run.batchNumber,
              date: run.date,
              productName: run.productName,
              quantity: c.quantity,
              unit: c.unit,
              totalCost: c.totalCost,
            })
          }
        })
      }
    })

    return history
  }

  // Category counts
  const categoryCounts: Record<string, number> = {}
  db.rawMaterials.forEach((r) => {
    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1
  })

  // Filtered materials
  const filteredMaterials = db.rawMaterials
    .filter((r) => {
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        (r.supplierName && r.supplierName.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        r.category.toLowerCase().includes(q)

      const matchesCat = categoryFilter === 'All' || r.category === categoryFilter

      const isLow = r.quantity <= r.reorderLevel && r.quantity > 0
      const isOut = r.quantity <= 0
      const matchesStock =
        stockStatusFilter === 'All' ||
        (stockStatusFilter === 'In stock' && !isLow && !isOut) ||
        (stockStatusFilter === 'Low stock' && isLow) ||
        (stockStatusFilter === 'Out of stock' && isOut)

      const matchesSupplier =
        supplierFilter === 'All' || r.supplierId === supplierFilter || r.supplierName === supplierFilter

      return matchesQuery && matchesCat && matchesStock && matchesSupplier
    })
    .sort((a, b) => {
      const effectiveCostA = a.totalCostPerUnit !== undefined ? a.totalCostPerUnit : a.unitCost + (a.otherCost || 0)
      const effectiveCostB = b.totalCostPerUnit !== undefined ? b.totalCostPerUnit : b.unitCost + (b.otherCost || 0)
      const valA = a.quantity * effectiveCostA
      const valB = b.quantity * effectiveCostB
      const consA = getMaterialConsumption(a.id, a.sku, a.name)
      const consB = getMaterialConsumption(b.id, b.sku, b.name)

      let diff = 0
      if (sortBy === 'name') diff = a.name.localeCompare(b.name)
      else if (sortBy === 'stock') diff = a.quantity - b.quantity
      else if (sortBy === 'unitCost') diff = a.unitCost - b.unitCost
      else if (sortBy === 'totalCost') diff = effectiveCostA - effectiveCostB
      else if (sortBy === 'valuation') diff = valA - valB
      else if (sortBy === 'consumed') diff = consA - consB

      return sortOrder === 'asc' ? diff : -diff
    })

  // Metrics
  const totalItemsCount = db.rawMaterials.length
  const totalValuation = db.rawMaterials.reduce((sum, r) => {
    const eff = r.totalCostPerUnit !== undefined ? r.totalCostPerUnit : r.unitCost + (r.otherCost || 0)
    return sum + r.quantity * eff
  }, 0)
  const lowStockCount = db.rawMaterials.filter((r) => r.quantity <= r.reorderLevel).length
  const outOfStockCount = db.rawMaterials.filter((r) => r.quantity <= 0).length

  // Handlers
  const handleSaveMaterial = (item: RawMaterialItem) => {
    const existingIndex = db.rawMaterials.findIndex((r) => r.id === item.id)
    let updatedList: RawMaterialItem[]
    if (existingIndex >= 0) {
      updatedList = db.rawMaterials.map((r) => (r.id === item.id ? item : r))
    } else {
      updatedList = [item, ...db.rawMaterials]
    }
    onSaveDatabase({ ...db, rawMaterials: updatedList })
    setIsCreatingMaterial(false)
    setSelectedRawMaterial(null)
    if (viewDetailsMaterial && viewDetailsMaterial.id === item.id) {
      setViewDetailsMaterial(item)
    }
  }

  const handleDeleteMaterial = async (id: string, name: string) => {
    const usedCount = db.productionRuns.filter((p) =>
      p.consumedMaterials?.some((c) => c.rawMaterialId === id || c.name === name)
    ).length

    const confirmMsg =
      usedCount > 0
        ? `Raw material "${name}" is referenced in ${usedCount} previous production batch(es). Are you sure you want to permanently delete it?`
        : `Are you sure you want to delete "${name}"?`

    if (!await confirmAction(confirmMsg)) return

    const updated = db.rawMaterials.filter((r) => r.id !== id)
    onSaveDatabase({ ...db, rawMaterials: updated })
    if (viewDetailsMaterial?.id === id) {
      setViewDetailsMaterial(null)
    }
  }

  const handleApplyStockAdjustment = (delta: number, reason: string) => {
    if (!stockAdjustmentItem) return
    const now = new Date().toISOString().slice(0, 10)
    const updatedRaw = db.rawMaterials.map((r) => {
      if (r.id === stockAdjustmentItem.id) {
        const newQty = Math.max(0, r.quantity + delta)
        const status: Status = newQty <= 0 ? 'Out of stock' : newQty <= r.reorderLevel ? 'Low stock' : 'In stock'
        const eff = r.totalCostPerUnit !== undefined ? r.totalCostPerUnit : r.unitCost + (r.otherCost || 0)
        return {
          ...r,
          quantity: newQty,
          status,
          totalCost: newQty * eff,
          updatedAt: now,
        }
      }
      return r
    })

    onSaveDatabase({ ...db, rawMaterials: updatedRaw })
    setStockAdjustmentItem(null)
  }

  const handleExportCSV = () => {
    const headers = [
      'Material Name',
      'SKU Code',
      'Category',
      'Size / Unit',
      'Remaining Stock',
      'Reorder Threshold',
      'Base Price / Unit (Rs)',
      'Other Cost (Rs)',
      'Total Cost / Unit (Rs)',
      'Total Warehouse Valuation (Rs)',
      'Supplier',
      'Consumed in Production',
      'Status',
    ]

    const rows = filteredMaterials.map((r) => {
      const eff = r.totalCostPerUnit !== undefined ? r.totalCostPerUnit : r.unitCost + (r.otherCost || 0)
      const cons = getMaterialConsumption(r.id, r.sku, r.name)
      return [
        r.name,
        r.sku,
        r.category,
        r.size ? `${r.size} ${r.unit}` : r.unit,
        r.quantity,
        r.reorderLevel,
        r.unitCost,
        r.otherCost || 0,
        eff,
        r.quantity * eff,
        r.supplierName || '—',
        cons,
        r.status,
      ]
    })

    exportToCSV(`Raw_Materials_Register_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  const handleQuickImageUpload = async (materialId: string, file: File) => {
    try {
      const base64 = await fileToBase64(file)
      const updated = db.rawMaterials.map((r) =>
        r.id === materialId ? { ...r, imageUrl: base64 } : r
      )
      onSaveDatabase({ ...db, rawMaterials: updated })
      setViewDetailsMaterial((current) => current?.id === materialId ? { ...current, imageUrl: base64 } : current)
    } catch (err) {
      console.error('Failed to upload image:', err)
    }
  }

  return (
    <div className="page-stack" id="raw-materials-management-view">
      {/* Top Heading */}
      <ModuleHeading icon="materials">
        <div>
          <p className="eyebrow">Warehouse & Procurement Core</p>
          <h1>Raw Material Management</h1>
          <p className="subheading">
            Manage factory raw ingredients, packaging preforms, bottling caps, labels, cartons, and chemical minerals.
          </p>
        </div>
        <div className="heading-actions">
          <button data-ui="button"
            className="button secondary"
            onClick={() => setIsManagingCategories(true)}
            id="btn-manage-raw-categories"
          >
            <Tag className="w-4 h-4" /> Manage Categories
          </button>
          <button data-ui="button" className="button secondary" onClick={handleExportCSV} id="btn-export-raw-csv">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button data-ui="button"
            className="button primary"
            onClick={() => {
              setSelectedRawMaterial(null)
              setIsCreatingMaterial(true)
            }}
            id="btn-add-raw-material"
          >
            <Plus className="w-4 h-4" /> Add Raw Material
          </button>
        </div>
      </ModuleHeading>

      {/* KPI Stats Grid */}
      <div className="stat-grid">
        <div className="stat-card relative" id="metric-total-materials">
          <div className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Boxes className="w-4 h-4" />
          </div>
          <div className="stat-label">Total Raw Items</div>
          <strong>{totalItemsCount} Items</strong>
          <span className="stat-change text-blue-700">
            {rawCategories.length} categories across plant storage
          </span>
        </div>

        <div className="stat-card relative" id="metric-raw-valuation">
          <div className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="stat-label">Total Material Valuation</div>
          <strong>{formatPKR(totalValuation)}</strong>
          <span className="stat-change text-emerald-700">Based on landed purchase & handling cost</span>
        </div>

        <div className="stat-card relative" id="metric-raw-alerts">
          <div className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="stat-label">Low Stock Alerts</div>
          <strong className={lowStockCount > 0 ? 'text-amber-700' : 'text-stone-900'}>
            {lowStockCount} Materials
          </strong>
          <span className="stat-change text-amber-700">
            {lowStockCount > 0
              ? `${outOfStockCount > 0 ? `${outOfStockCount} out of stock, ` : ''}${lowStockCount} below safety limit`
              : 'All materials above safety limit'}
          </span>
        </div>

        <div className="stat-card relative" id="metric-total-suppliers">
          <div className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
          <div className="stat-label">Registered Suppliers</div>
          <strong>{db.suppliers.length} Suppliers</strong>
          <span className="stat-change text-purple-700">Vendors supplying packaging & ingredients</span>
        </div>
      </div>

      {/* Toolbar & Multi-Filters */}
      <div data-ui="toolbar"
        className="gradient-card bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3"
        id="raw-materials-toolbar"
      >
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input data-ui="input"
              placeholder="Search raw material by name, SKU, category, supplier, description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-9 pr-8 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518] transition-all"
              id="input-raw-search"
            />
            {query && (
              <button data-ui="button"
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                onClick={() => setQuery('')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Dropdown Filter */}
          <select data-ui="select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-stone-200 rounded-lg px-3 py-2 text-xs bg-white text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
            id="filter-raw-category"
          >
            <option value="All">All Categories ({db.rawMaterials.length})</option>
            {rawCategories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name} {categoryCounts[c.name] ? `(${categoryCounts[c.name]})` : ''}
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <select data-ui="select"
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            className="border border-stone-200 rounded-lg px-3 py-2 text-xs bg-white text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
            id="filter-raw-stock"
          >
            <option value="All">All Stock Levels</option>
            <option value="In stock">In Stock</option>
            <option value="Low stock">Low Stock Alert</option>
            <option value="Out of stock">Out of Stock</option>
          </select>

          {/* Supplier Filter */}
          <select data-ui="select"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="border border-stone-200 rounded-lg px-3 py-2 text-xs bg-white text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
            id="filter-raw-supplier"
          >
            <option value="All">All Suppliers ({db.suppliers.length})</option>
            {db.suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Sorting */}
          <div className="flex items-center gap-1">
            <select data-ui="select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-stone-200 rounded-lg px-3 py-2 text-xs bg-white text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
              id="select-raw-sort"
            >
              <option value="name">Sort: Name</option>
              <option value="stock">Sort: Stock</option>
              <option value="unitCost">Sort: Price / Unit</option>
              <option value="totalCost">Sort: Landed Cost</option>
              <option value="valuation">Sort: Total Value</option>
              <option value="consumed">Sort: Consumed Qty</option>
            </select>
            <button data-ui="button"
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="border border-stone-200 rounded-lg px-2.5 py-2 text-xs bg-white hover:bg-stone-50 text-stone-700 font-bold transition-colors"
              title="Toggle Ascending / Descending"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* RAW MATERIALS CARD GRID */}
      <div id="raw-materials-panel">
        {filteredMaterials.length === 0 ? (
          <div data-ui="surface" className="gradient-card bg-white rounded-2xl p-12 text-center border border-stone-200 shadow-xs">
            <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
                <Boxes className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-stone-800">No raw materials found</h3>
              <p className="text-xs text-stone-500">
                {query || categoryFilter !== 'All' || stockStatusFilter !== 'All' || supplierFilter !== 'All'
                  ? 'Try adjusting your search query or filters to find what you are looking for.'
                  : 'Get started by creating your first raw material item.'}
              </p>
              <button data-ui="button"
                type="button"
                className="button primary text-xs mt-2"
                onClick={() => {
                  setSelectedRawMaterial(null)
                  setIsCreatingMaterial(true)
                }}
              >
                <Plus className="w-4 h-4" /> Add Raw Material
              </button>
            </div>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4.5"
            id="raw-materials-card-grid"
          >
            {filteredMaterials.map((r) => (
              <div
                key={r.id}
                className="raw-material-card group"
                id={`raw-material-card-${r.id}`}
              >
                <button type="button" className="raw-material-card-image"
                  aria-label={`View ${r.name} details`} onClick={() => setViewDetailsMaterial(r)}>
                  <CatalogPhoto item={r} src={r.imageUrl} alt={r.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy" />
                </button>
                <div className="raw-material-card-body">
                <h4 className="raw-material-card-name" title={r.name}>{r.name}</h4>
                <div className="raw-material-card-footer">
                  <span className="raw-material-card-price">{formatPKR(r.unitCost)}</span>
                  <button data-ui="button" type="button" className="raw-material-card-view"
                    aria-label={`View ${r.name}`} onClick={() => setViewDetailsMaterial(r)}>
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT RAW MATERIAL */}
      {(isCreatingMaterial || selectedRawMaterial) && (
        <RawMaterialEditorModal
          material={selectedRawMaterial}
          categories={rawCategories}
          suppliers={db.suppliers}
          existingMaterials={db.rawMaterials}
          onClose={() => {
            setIsCreatingMaterial(false)
            setSelectedRawMaterial(null)
          }}
          onSave={handleSaveMaterial}
          onOpenCategoryManager={() => setIsManagingCategories(true)}
        />
      )}

      {/* MODAL: CATEGORY MANAGER */}
      {isManagingCategories && (
        <RawMaterialCategoryManagerModal
          categories={rawCategories}
          rawMaterials={db.rawMaterials}
          onClose={() => setIsManagingCategories(false)}
          onSaveCategories={(updatedCats, updatedMaterials) => {
            onSaveDatabase({
              ...db,
              rawMaterialCategories: updatedCats,
              rawMaterials: updatedMaterials || db.rawMaterials,
            })
          }}
        />
      )}

      {/* MODAL: MATERIAL SPECIFICATIONS & USAGE DETAILS */}
      {viewDetailsMaterial && (
        <RawMaterialDetailsModal
          material={viewDetailsMaterial}
          consumptionHistory={getMaterialUsageHistory(viewDetailsMaterial.id, viewDetailsMaterial.name)}
          totalConsumed={getMaterialConsumption(
            viewDetailsMaterial.id,
            viewDetailsMaterial.sku,
            viewDetailsMaterial.name
          )}
          rawCategories={rawCategories}
          suppliers={db.suppliers}
          onClose={() => setViewDetailsMaterial(null)}
          onEdit={() => {
            setSelectedRawMaterial(viewDetailsMaterial)
            setIsCreatingMaterial(true)
            setViewDetailsMaterial(null)
          }}
          onDelete={() => handleDeleteMaterial(viewDetailsMaterial.id, viewDetailsMaterial.name)}
          onStockAdjust={() => {
            setStockAdjustmentItem({
              id: viewDetailsMaterial.id,
              name: viewDetailsMaterial.name,
              current: viewDetailsMaterial.quantity,
            })
          }}
          onViewInvoice={(img) => setViewingInvoiceImage(img)}
          onUploadImage={(file) => handleQuickImageUpload(viewDetailsMaterial.id, file)}
        />
      )}

      {/* MODAL: VIEW INVOICE IMAGE PREVIEW */}
      {viewingInvoiceImage && (
        <div className="editor-overlay" onClick={() => setViewingInvoiceImage(null)}>
          <div data-ui="surface"
            className="bg-white p-4 rounded-xl max-w-2xl w-full mx-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">Purchase Invoice Document Copy</h3>
              </div>
              <button data-ui="button"
                type="button"
                className="icon-button"
                onClick={() => setViewingInvoiceImage(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-gray-50 rounded-lg p-2 border border-gray-200">
              <img
                src={viewingInvoiceImage}
                alt="Purchase Invoice"
                className="max-h-[65vh] w-auto object-contain rounded"
              />
            </div>
            <div className="flex justify-end mt-3">
              <button data-ui="button"
                type="button"
                className="button secondary text-xs"
                onClick={() => setViewingInvoiceImage(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUICK STOCK ADJUSTMENT */}
      {stockAdjustmentItem && (
        <StockAdjustmentModal
          item={stockAdjustmentItem}
          onClose={() => setStockAdjustmentItem(null)}
          onApply={handleApplyStockAdjustment}
        />
      )}
    </div>
  )
}

/* =========================================================================
   RAW MATERIAL CATEGORY MANAGER MODAL (Add, Edit, Delete with Colors)
========================================================================= */
function RawMaterialCategoryManagerModal({
  categories,
  rawMaterials,
  onClose,
  onSaveCategories,
}: {
  categories: CategoryItem[]
  rawMaterials: RawMaterialItem[]
  onClose: () => void
  onSaveCategories: (updatedCats: CategoryItem[], updatedMaterials?: RawMaterialItem[]) => void
}) {
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [catName, setCatName] = useState('')
  const [catColor, setCatColor] = useState('blue')
  const [catDesc, setCatDesc] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Count usage per category
  const counts: Record<string, number> = {}
  rawMaterials.forEach((r) => {
    counts[r.category] = (counts[r.category] || 0) + 1
  })

  const handleStartEdit = (cat: CategoryItem) => {
    setEditingCatId(cat.id)
    setCatName(cat.name)
    setCatColor(cat.color || 'blue')
    setCatDesc(cat.description || '')
    setIsAddingNew(false)
    setError(null)
  }

  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (categories.length <= 1) {
      setError('You must maintain at least one raw material category.')
      return
    }

    const linkedCount = counts[cat.name] || 0
    let confirmMsg = `Are you sure you want to delete "${cat.name}" category?`
    if (linkedCount > 0) {
      confirmMsg = `Category "${cat.name}" is currently assigned to ${linkedCount} raw material item(s). If deleted, these items will be reassigned to the default category. Continue?`
    }

    if (!await confirmAction(confirmMsg)) return

    const remainingCats = categories.filter((c) => c.id !== cat.id)
    const fallbackCategoryName = remainingCats[0]?.name || 'Ingredients'

    let updatedMaterials: RawMaterialItem[] | undefined
    if (linkedCount > 0) {
      updatedMaterials = rawMaterials.map((r) =>
        r.category === cat.name ? { ...r, category: fallbackCategoryName } : r
      )
    }

    onSaveCategories(remainingCats, updatedMaterials)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = catName.trim()
    if (!trimmed) {
      setError('Category Name is required.')
      return
    }

    // Check duplicate
    const duplicate = categories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editingCatId
    )
    if (duplicate) {
      setError(`A category named "${trimmed}" already exists.`)
      return
    }

    if (editingCatId && !(await confirmAction({"title":"Save changes?","message":"Apply these edits to the saved record?","confirmLabel":"Save changes","destructive":false}))) return
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

      let updatedMaterials: RawMaterialItem[] | undefined
      if (oldName && oldName !== trimmed) {
        updatedMaterials = rawMaterials.map((r) =>
          r.category === oldName ? { ...r, category: trimmed } : r
        )
      }

      onSaveCategories(updatedCats, updatedMaterials)
      setEditingCatId(null)
    } else {
      const newCat: CategoryItem = {
        id: `rmcat-${Date.now()}`,
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

  const activeColorObj = RAW_CATEGORY_COLORS.find((c) => c.id === catColor) || RAW_CATEGORY_COLORS[0]

  return (
    <div className="editor-overlay">
      <div className="editor-modal max-w-lg w-full" id="raw-category-manager-modal">
        <div className="editor-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7cb518]/15 text-[#7cb518] flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <p className="eyebrow">Inventory Settings</p>
              <h2>Manage Raw Material Categories</h2>
            </div>
          </div>
          <button data-ui="button" type="button" className="icon-button" onClick={onClose}>
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
                <Palette className="w-3.5 h-3.5 text-[#7cb518]" />
                {isAddingNew ? 'Add New Category' : 'Edit Category'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold shadow-xs ${activeColorObj.class}`}>
                {catName.trim() || 'Badge Preview'}
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">
                Category Name *
              </label>
              <input data-ui="input"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Packaging, Ingredients, Preservatives"
                required
                autoFocus
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                id="input-raw-cat-name"
              />
            </div>

            {/* Color Palette Selector */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1.5 block">
                Badge Color Theme *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                {RAW_CATEGORY_COLORS.map((col) => {
                  const isSelected = catColor === col.id
                  return (
                    <button data-ui="button"
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
              <input data-ui="input"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Brief description or usage notes"
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button data-ui="button"
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
              <button data-ui="button" type="submit" className="button primary text-xs py-1.5 px-4" id="btn-save-raw-category">
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
              <p className="text-[11px] text-stone-500">Available in raw material dropdowns & badges</p>
            </div>
            <button data-ui="button"
              type="button"
              className="button primary text-xs py-1.5 px-3"
              onClick={() => {
                setIsAddingNew(true)
                setCatName('')
                setCatColor('blue')
                setCatDesc('')
                setError(null)
              }}
              id="btn-add-raw-category-start"
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
              const badgeClass = getCategoryBadgeClass(c.name, categories)
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
                        {count} {count === 1 ? 'material' : 'materials'}
                      </span>
                    </div>
                    {c.description && (
                      <p className="text-[11px] text-stone-500 mt-1">{c.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button data-ui="button"
                      type="button"
                      className="p-1.5 text-stone-500 hover:text-blue-600 rounded-md hover:bg-stone-100 transition-colors"
                      title="Edit Category"
                      onClick={() => handleStartEdit(c)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button data-ui="button"
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

        <div className="editor-actions mt-5">
          <button data-ui="button" type="button" className="button secondary w-full py-2 text-xs" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   RAW MATERIAL EDITOR MODAL (Cleaned Up UI with Fixed Footer & Better Spacing)
========================================================================= */
function RawMaterialEditorModal({
  material,
  categories,
  suppliers,
  existingMaterials,
  onClose,
  onSave,
  onOpenCategoryManager,
}: {
  material: RawMaterialItem | null
  categories: CategoryItem[]
  suppliers: AppDatabase['suppliers']
  existingMaterials: RawMaterialItem[]
  onClose: () => void
  onSave: (item: RawMaterialItem) => void
  onOpenCategoryManager: () => void
}) {
  const [name, setName] = useState(material?.name || '')
  const [sku, setSku] = useState(material?.sku || `RAW-${Date.now().toString().slice(-4)}`)
  const [category, setCategory] = useState<string>(
    material?.category || categories[0]?.name || 'Ingredients'
  )
  const [description, setDescription] = useState(material?.description || '')
  const [imageUrl, setImageUrl] = useState(material?.imageUrl || '')
  const [size, setSize] = useState(material?.size || '')
  const [unit, setUnit] = useState(material?.unit || 'kg')

  // Pricing fields
  const [unitCost, setUnitCost] = useState<number>(material?.unitCost !== undefined ? material.unitCost : 100)
  const [otherCost, setOtherCost] = useState<number>(material?.otherCost !== undefined ? material.otherCost : 0)
  const [isManualTotalCost, setIsManualTotalCost] = useState<boolean>(!!material?.isManualTotalCost)
  const [manualTotalCostPerUnit, setManualTotalCostPerUnit] = useState<number>(
    material?.totalCostPerUnit !== undefined ? material.totalCostPerUnit : (material?.unitCost || 100) + (material?.otherCost || 0)
  )

  // Invoice image
  const [purchaseInvoiceImage, setPurchaseInvoiceImage] = useState(material?.purchaseInvoiceImage || '')

  // Supplier link
  const [supplierId, setSupplierId] = useState(material?.supplierId || (suppliers[0]?.id || ''))

  // Quantity fields
  const [quantity, setQuantity] = useState<number>(material?.quantity !== undefined ? material.quantity : 500)
  const [reorderLevel, setReorderLevel] = useState<number>(material?.reorderLevel !== undefined ? material.reorderLevel : 100)
  const [expiryDate, setExpiryDate] = useState<string>(material?.expiryDate || '')
  const [manufacturingDate, setManufacturingDate] = useState<string>(material?.manufacturingDate || '')

  const [error, setError] = useState<string | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const invoiceInputRef = useRef<HTMLInputElement>(null)

  // Calculated values
  const autoCalculatedTotalCostPerUnit = Math.round((Number(unitCost) || 0) + (Number(otherCost) || 0))
  const effectiveTotalCostPerUnit = isManualTotalCost ? Number(manualTotalCostPerUnit) || 0 : autoCalculatedTotalCostPerUnit
  const totalValuation = Math.round((Number(quantity) || 0) * effectiveTotalCostPerUnit)

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      setImageUrl(base64)
    } catch (err) {
      console.error('Failed to convert image:', err)
      setError('Could not process image file.')
    }
  }

  const handleInvoiceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      setPurchaseInvoiceImage(base64)
    } catch (err) {
      console.error('Failed to convert invoice:', err)
      setError('Could not process invoice document image.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Material Name is required.')
      return
    }
    if (!sku.trim()) {
      setError('SKU Code is required.')
      return
    }

    // SKU duplicate check
    const duplicate = existingMaterials.find(
      (m) => m.sku.toLowerCase() === sku.trim().toLowerCase() && m.id !== material?.id
    )
    if (duplicate) {
      setError(`SKU "${sku}" is already assigned to "${duplicate.name}". Please use a unique SKU code.`)
      return
    }

    const matchedSupplier = suppliers.find((s) => s.id === supplierId)
    const now = new Date().toISOString().slice(0, 10)
    const numQty = Number(quantity) || 0
    const numReorder = Number(reorderLevel) || 50
    const status: Status = numQty <= 0 ? 'Out of stock' : numQty <= numReorder ? 'Low stock' : 'In stock'

    const saved: RawMaterialItem = {
      id: material?.id || `raw-${Date.now()}`,
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      category: category.trim(),
      description: description.trim() || undefined,
      imageUrl: imageUrl || undefined,
      size: size.trim() || undefined,
      unit,
      unitCost: Number(unitCost) || 0,
      otherCost: Number(otherCost) || 0,
      totalCostPerUnit: effectiveTotalCostPerUnit,
      isManualTotalCost,
      totalCost: totalValuation,
      purchaseInvoiceImage: purchaseInvoiceImage || undefined,
      supplierId: supplierId || undefined,
      supplierName: matchedSupplier?.name || undefined,
      totalReceived: material?.totalReceived !== undefined ? material.totalReceived : numQty,
      totalConsumed: material?.totalConsumed !== undefined ? material.totalConsumed : 0,
      quantity: numQty,
      expiryDate: expiryDate.trim() || undefined,
      manufacturingDate: manufacturingDate.trim() || undefined,
      reorderLevel: numReorder,
      status,
      updatedAt: now,
    }

    if (material && !(await confirmAction({"title":"Save changes?","message":"Apply these edits to the saved record?","confirmLabel":"Save changes","destructive":false}))) return
    onSave(saved)
  }

  return (
    <div className="editor-overlay">
      <form
        className="editor-modal large flex flex-col p-0 overflow-hidden"
        onSubmit={handleSubmit}
        id="raw-material-editor-form"
      >
        {/* Sticky Modal Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#7cb518]/15 text-[#7cb518] flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <p className="eyebrow mb-0">Warehouse Inventory</p>
              <h2 className="text-base font-bold text-stone-900 leading-tight">
                {material ? `Edit Raw Material: ${material.name}` : 'Add New Raw Material'}
              </h2>
            </div>
          </div>
          <button data-ui="button" type="button" className="icon-button" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SECTION 1: MATERIAL IDENTITY & CLASSIFICATION */}
          <div data-ui="surface" className="gradient-card bg-stone-50/80 p-4.5 rounded-xl border border-stone-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-[#7cb518]" /> 1. Material Identity & Classification
              </h3>
              <button data-ui="button"
                type="button"
                className="text-[11px] text-[#7cb518] hover:underline font-semibold flex items-center gap-1"
                onClick={onOpenCategoryManager}
              >
                <Tag className="w-3 h-3" /> Manage Categories
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-stone-700 mb-1 block">
                  Material Name *
                </label>
                <input data-ui="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Refined White Sugar"
                  required
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                  id="input-material-name"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">
                  SKU Code * <span className="text-[10px] text-stone-400 font-normal">(Unique)</span>
                </label>
                <input data-ui="input"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. RAW-SGR-01"
                  required
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 uppercase focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                  id="input-material-sku"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">
                  Category *
                </label>
                <select data-ui="select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                  id="select-material-category"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-stone-700 mb-1 block">
                  Description / Storage Notes <span className="text-[10px] text-stone-400 font-normal">(Optional)</span>
                </label>
                <input data-ui="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Food-grade, stored in dry area"
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                  id="input-material-desc"
                />
              </div>
            </div>

            {/* Size & Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-white p-3 rounded-lg border border-stone-200">
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">
                  Size / Package Capacity <span className="text-[10px] text-stone-400 font-normal">(Optional)</span>
                </label>
                <input data-ui="input"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                  id="input-material-size"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">
                  Unit of Measurement *
                </label>
                <select data-ui="select"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                  required
                  id="select-material-unit"
                >
                  <optgroup label="Standard Metrics">
                    <option value="kg">kg (Kilograms)</option>
                    <option value="g">g (Grams)</option>
                    <option value="L">L (Liters)</option>
                    <option value="ml">ml (Milliliters)</option>
                  </optgroup>
                  <optgroup label="Packaging Units">
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Bags">Bags (Sacks)</option>
                    <option value="Drums">Drums (Barrels)</option>
                    <option value="Rolls">Rolls (Foil/Label Rolls)</option>
                    <option value="Cartons">Cartons (Boxes)</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Optional Dates with Expiry Helper Text */}
            <div className="pt-3 border-t border-stone-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">
                  Batch / Receiving Date <span className="text-[10px] text-stone-400 font-normal">(Optional)</span>
                </label>
                <input data-ui="input"
                  type="date"
                  value={manufacturingDate}
                  onChange={(e) => setManufacturingDate(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                  id="input-material-mfg-date"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-stone-700 mb-0 block">
                    Expiry Date <span className="text-[10px] text-stone-400 font-normal">(Optional)</span>
                  </label>
                  {expiryDate && <ExpiryDateBadge date={expiryDate} />}
                </div>
                <input data-ui="input"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                  id="input-material-expiry-date"
                />
                <span className="text-[10px] text-stone-400 font-normal mt-1 block">
                  Green &gt; 15d, Orange ≤ 15d, Red expired
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: PRICE, OTHER COSTS & LANDED COST RATE */}
          <div data-ui="surface" className="gradient-card bg-stone-50/80 p-4.5 rounded-xl border border-stone-200 space-y-3.5">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#7cb518]" /> 2. Price, Other Costs & Landed Cost Rate
            </h3>

            {/* 2-column or 3-column wrap (no horizontal scroll) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">
                  Base Price per Unit (Rs) *
                </label>
                <input data-ui="input"
                  type="number"
                  min="0"
                  step="any"
                  value={unitCost}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                  placeholder="e.g. 145"
                  required
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                  id="input-material-unit-cost"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">Supplier base rate per {unit}</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">
                  Other Cost (Rs)
                </label>
                <input data-ui="input"
                  type="number"
                  min="0"
                  step="any"
                  value={otherCost}
                  onChange={(e) => setOtherCost(Number(e.target.value))}
                  placeholder="e.g. 15"
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                  id="input-material-other-cost"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">Transport, carriage, unloading</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">
                  Primary Supplier
                </label>
                <select data-ui="select"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                  id="select-material-supplier"
                >
                  <option value="">No Supplier Assigned</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-stone-400 mt-1 block">Linked vendor account</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">
                  Warehouse Stock ({unit}) *
                </label>
                <input data-ui="input"
                  type="number"
                  min="0"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="e.g. 500"
                  required
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                  id="input-material-stock-qty"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">Current physical balance</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">
                  Reorder Alert Threshold *
                </label>
                <input data-ui="input"
                  type="number"
                  min="1"
                  step="any"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(Number(e.target.value))}
                  placeholder="e.g. 100"
                  required
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                  id="input-material-reorder-level"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">Low stock safety minimum</span>
              </div>
            </div>

            {/* Total Landed Cost Result Box (Prominent & Clear) */}
            <div data-ui="surface" className="gradient-card bg-white p-4 rounded-xl border border-stone-200 shadow-2xs mt-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                      Total Landed Cost Rate / {unit}
                    </span>
                    <label className="flex items-center gap-1 text-[11px] text-[#7cb518] font-semibold cursor-pointer select-none">
                      <input data-ui="checkbox"
                        type="checkbox"
                        checked={isManualTotalCost}
                        onChange={(e) => setIsManualTotalCost(e.target.checked)}
                        className="rounded border-stone-300 text-[#7cb518] focus:ring-[#7cb518]"
                      />
                      Manual Override
                    </label>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {isManualTotalCost
                      ? 'Manually set custom rate applied to production recipes'
                      : `Formula: Base (${formatPKR(unitCost)}) + Other (${formatPKR(otherCost)})`}
                  </p>
                </div>

                <div>
                  {isManualTotalCost ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-purple-900">Rs</span>
                      <input data-ui="input"
                        type="number"
                        min="0"
                        step="any"
                        value={manualTotalCostPerUnit}
                        onChange={(e) => setManualTotalCostPerUnit(Number(e.target.value))}
                        className="w-32 py-1.5 px-2.5 text-sm font-extrabold text-purple-900 bg-purple-50 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        id="input-manual-total-cost"
                      />
                      <span className="text-xs text-stone-500 font-medium">/ {unit}</span>
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="text-xl font-extrabold text-[#7cb518]">
                        {formatPKR(autoCalculatedTotalCostPerUnit)}{' '}
                        <span className="text-xs font-normal text-stone-500">/ {unit}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Valuation Footer Strip */}
              <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500">
                  Warehouse Stock Valuation: <strong className="text-stone-800">{quantity} {unit}</strong> × {formatPKR(effectiveTotalCostPerUnit)}
                </span>
                <span className="font-extrabold text-sm text-stone-900">
                  {formatPKR(totalValuation)}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: MEDIA & INVOICE ATTACHMENT */}
          <div data-ui="surface" className="gradient-card bg-stone-50/80 p-4.5 rounded-xl border border-stone-200 space-y-3.5">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-[#7cb518]" /> 3. Material Photo & Purchase Invoice Attachment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Material Image */}
              <div data-ui="surface" className="gradient-card bg-white p-3.5 rounded-xl border border-stone-200 space-y-2">
                <label className="text-xs font-bold text-stone-700 block">Raw Material Photo <span className="text-[10px] text-stone-400 font-normal">(Optional)</span></label>
                <input data-ui="file"
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileChange}
                />

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    <CatalogPhoto item={{ name, category }} src={imageUrl} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <button data-ui="button"
                      type="button"
                      className="button secondary text-xs w-full py-1.5"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> {imageUrl ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {imageUrl && (
                      <button data-ui="button"
                        type="button"
                        className="text-[11px] text-rose-600 hover:underline font-semibold block"
                        onClick={() => setImageUrl('')}
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Purchase Invoice Attachment */}
              <div data-ui="surface" className="gradient-card bg-white p-3.5 rounded-xl border border-stone-200 space-y-2">
                <label className="text-xs font-bold text-stone-700 block">
                  Purchase Invoice / Bill Image <span className="text-[10px] text-stone-400 font-normal">(Optional)</span>
                </label>
                <input data-ui="file"
                  type="file"
                  ref={invoiceInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleInvoiceFileChange}
                />

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {purchaseInvoiceImage ? (
                      <img src={purchaseInvoiceImage} alt="Invoice preview" className="w-full h-full object-cover" />
                    ) : (
                      <Receipt className="w-6 h-6 text-stone-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <button data-ui="button"
                      type="button"
                      className="button secondary text-xs w-full py-1.5"
                      onClick={() => invoiceInputRef.current?.click()}
                    >
                      <Receipt className="w-3.5 h-3.5 text-blue-600" />{' '}
                      {purchaseInvoiceImage ? 'Change Invoice' : 'Attach Invoice'}
                    </button>
                    {purchaseInvoiceImage && (
                      <button data-ui="button"
                        type="button"
                        className="text-[11px] text-rose-600 hover:underline font-semibold block"
                        onClick={() => setPurchaseInvoiceImage('')}
                      >
                        Remove Invoice
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Fixed Bottom Actions (Always visible without scrolling) */}
        <div className="p-4 border-t border-stone-200 bg-stone-50/95 backdrop-blur-xs flex items-center justify-end gap-3 rounded-b-2xl flex-shrink-0">
          <button data-ui="button" type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button data-ui="button" type="submit" className="button primary" id="btn-save-raw-material-submit">
            {material ? 'Update Material' : 'Add Material'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* =========================================================================
   RAW MATERIAL DETAILS & SPECIFICATIONS MODAL
========================================================================= */
function RawMaterialDetailsModal({
  material,
  consumptionHistory,
  totalConsumed,
  rawCategories,
  suppliers,
  onClose,
  onEdit,
  onDelete,
  onStockAdjust,
  onViewInvoice,
  onUploadImage,
}: {
  material: RawMaterialItem
  consumptionHistory: Array<{
    batchNumber: string
    date: string
    productName: string
    quantity: number
    unit: string
    totalCost: number
  }>
  totalConsumed: number
  rawCategories: CategoryItem[]
  suppliers: AppDatabase['suppliers']
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onStockAdjust: () => void
  onViewInvoice: (img: string) => void
  onUploadImage: (file: File) => void
}) {
  const isLow = material.quantity <= material.reorderLevel && material.quantity > 0
  const isOut = material.quantity <= 0
  const effectiveCost =
    material.totalCostPerUnit !== undefined
      ? material.totalCostPerUnit
      : material.unitCost + (material.otherCost || 0)
  const totalVal = material.quantity * effectiveCost
  const supplier = suppliers.find((s) => s.id === material.supplierId)
  const badgeClass = getCategoryBadgeClass(material.category, rawCategories)
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => previousFocus?.focus()
  }, [])

  return (
    <div className="editor-overlay">
      <div className="editor-modal large" id="raw-material-details-modal"
        ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="raw-material-details-title" tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.stopPropagation(); onClose() }
          if (event.key === 'Tab') {
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, input:not(.hidden), [href], [tabindex="0"]'))
            const first = controls[0]
            const last = controls[controls.length - 1]
            if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus() }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
          }
        }}>
        <div className="editor-header">
          <div className="flex items-center gap-3">
            <div className="material-details-photo">
              <CatalogPhoto item={material} src={material.imageUrl} alt={material.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded mr-2">
                {material.sku}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded shadow-2xs ${badgeClass}`}>
                {material.category}
              </span>
              <h2 id="raw-material-details-title">{material.name}</h2>
              <span className={`material-details-status ${isOut ? 'is-out' : isLow ? 'is-low' : ''}`}>
                <span aria-hidden="true" />{isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
              </span>
            </div>
          </div>
          <button data-ui="button" type="button" className="icon-button" aria-label="Close material details" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="material-details-body space-y-4">
          {/* Key Metric Blocks */}
          <div className="material-details-metrics grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
              <div className="text-[11px] text-stone-500 font-medium">Remaining Stock</div>
              <div
                className={`text-lg font-bold ${
                  isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-stone-900'
                }`}
              >
                {material.quantity} {material.unit}
              </div>
              <div className="text-[10px] text-stone-500">Reorder alert at: {material.reorderLevel} {material.unit}</div>
            </div>

            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
              <div className="text-[11px] text-stone-500 font-medium">Base Price / Unit</div>
              <div className="text-lg font-bold text-stone-900">{formatPKR(material.unitCost)}</div>
              <div className="text-[10px] text-stone-500">Per {material.unit}</div>
            </div>

            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200/80">
              <div className="text-[11px] text-purple-800 font-medium">Landed Cost / Unit</div>
              <div className="text-lg font-bold text-purple-900">{formatPKR(effectiveCost)}</div>
              <div className="text-[10px] text-purple-700">
                {material.otherCost ? `Includes +${formatPKR(material.otherCost)} other cost` : 'Direct base price'}
              </div>
            </div>

            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200/80">
              <div className="text-[11px] text-emerald-800 font-medium">Total Warehouse Valuation</div>
              <div className="text-lg font-bold text-[#7cb518]">{formatPKR(totalVal)}</div>
              <div className="text-[10px] text-emerald-700">{material.quantity} {material.unit} in storage</div>
            </div>
          </div>

          {/* Specifications & Supplier Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div data-ui="surface" className="gradient-card bg-white p-4 rounded-xl border border-stone-200 space-y-3">
              <h3>Specifications</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Packaging Size:</span>
                  <span className="font-semibold text-stone-900">
                    {material.size ? `${material.size} ${material.unit}` : 'Standard bulk'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Other Overhead Cost:</span>
                  <span className="font-semibold text-stone-900">{formatPKR(material.otherCost || 0)} / {material.unit}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Total Inflow / Received:</span>
                  <span className="font-semibold text-stone-900">
                    {material.totalReceived !== undefined ? material.totalReceived : material.quantity + totalConsumed} {material.unit}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-500">Consumed in Production Runs:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {totalConsumed} {material.unit}
                  </span>
                </div>
              </div>

              {material.description && (
                <div className="mt-2 pt-2 border-t border-stone-100 text-xs text-stone-600">
                  <span className="font-semibold text-stone-700 block mb-1">Technical Specs / Description:</span>
                  {material.description}
                </div>
              )}
            </div>

            {/* Supplier & Document Copies */}
            <div data-ui="surface" className="gradient-card bg-white p-4 rounded-xl border border-stone-200 space-y-3">
              <h3>Supplier & Documents</h3>

              {supplier ? (
                <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200/70 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900">{supplier.name}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                      {supplier.category}
                    </span>
                  </div>
                  <div className="text-blue-800 text-[11px]">Phone: {supplier.phone} • {supplier.city || 'Pakistan'}</div>
                  <div className="text-blue-700 text-[11px]">Current Ledger Balance: {formatPKR(supplier.currentBalance)}</div>
                </div>
              ) : material.supplierName ? (
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200 text-xs">
                  <span className="text-stone-500">Supplier:</span> <strong>{material.supplierName}</strong>
                </div>
              ) : (
                <div className="text-xs text-stone-400">No supplier linked to this material.</div>
              )}

              {/* Invoice Attachment Preview */}
              <div className="mt-3">
                <div className="text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                  <span>Attached Purchase Invoice</span>
                  {material.purchaseInvoiceImage && (
                    <button data-ui="button"
                      type="button"
                      className="text-[11px] text-blue-600 font-semibold hover:underline"
                      onClick={() => onViewInvoice(material.purchaseInvoiceImage!)}
                    >
                      View Full Size
                    </button>
                  )}
                </div>

                {material.purchaseInvoiceImage ? (
                  <div
                    className="w-full h-28 rounded-lg bg-stone-50 border border-stone-200 overflow-hidden cursor-pointer group relative flex items-center justify-center"
                    onClick={() => onViewInvoice(material.purchaseInvoiceImage!)}
                  >
                    <img
                      src={material.purchaseInvoiceImage}
                      alt="Invoice"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                      <Eye className="w-4 h-4" /> Click to Zoom
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-center text-xs text-stone-400">
                    No purchase invoice attached for this raw material.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Production Usage History Table */}
          <div data-ui="surface" className="gradient-card bg-white p-4 rounded-xl border border-stone-200 space-y-3">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" /> Production Usage
            </h3>

            {consumptionHistory.length === 0 ? (
              <p className="text-xs text-stone-500 py-3 text-center bg-stone-50 rounded-lg border border-stone-200">
                No production runs have logged consumption for this raw material yet.
              </p>
            ) : (
              <div className="table-scroll border border-stone-200 rounded-lg">
                <table data-ui="table" className="w-full text-xs">
                  <thead className="bg-stone-50">
                    <tr>
                      <th>Batch #</th>
                      <th>Date</th>
                      <th>Finished Product</th>
                      <th>Consumed Quantity</th>
                      <th>Total Cost (Rs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumptionHistory.map((h, idx) => (
                      <tr key={idx}>
                        <td className="font-mono font-bold text-stone-900">{h.batchNumber}</td>
                        <td>{formatDate(h.date)}</td>
                        <td className="font-medium text-stone-900">{h.productName}</td>
                        <td className="font-bold text-emerald-800">
                          {h.quantity} {h.unit}
                        </td>
                        <td>{formatPKR(h.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="editor-actions justify-between">
          <button data-ui="button"
            type="button"
            className="button secondary text-rose-600 hover:text-rose-700"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" /> Delete Material
          </button>

          <div className="flex items-center gap-2">
            <label className="button secondary cursor-pointer">
              <ImageIcon className="w-4 h-4" /> Change Image
              <input type="file" accept="image/*" className="hidden" aria-label="Change material image"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) onUploadImage(file)
                  event.target.value = ''
                }} />
            </label>
            <button data-ui="button" type="button" className="button secondary" onClick={onStockAdjust}>
              <ArrowUpCircle className="w-4 h-4" /> Adjust Stock
            </button>
            <button data-ui="button" type="button" className="button primary" onClick={onEdit}>
              <Edit className="w-4 h-4" /> Edit Material
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   QUICK STOCK ADJUSTMENT MODAL
========================================================================= */
function StockAdjustmentModal({
  item,
  onClose,
  onApply,
}: {
  item: { id: string; name: string; current: number }
  onClose: () => void
  onApply: (delta: number, reason: string) => void
}) {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add')
  const [qty, setQty] = useState(50)
  const [reason, setReason] = useState('Manual physical stock audit / warehouse count')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const delta = adjustmentType === 'add' ? qty : -qty
    if (!(await confirmAction({"title":"Apply stock adjustment?","message":"Update the inventory quantity with this adjustment?","confirmLabel":"Apply adjustment","destructive":false}))) return
    onApply(delta, reason)
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Warehouse Physical Audit</p>
            <h2>Adjust Raw Material Stock: {item.name}</h2>
          </div>
          <button data-ui="button" type="button" className="icon-button" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 mb-4 text-xs">
          Current Warehouse Stock: <strong className="text-sm text-stone-900">{item.current} units</strong>
        </div>

        <div className="form-grid single">
          <label>
            Adjustment Action
            <select data-ui="select"
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as any)}
            >
              <option value="add">Add Inflow Stock (+ In)</option>
              <option value="remove">Deduct Stock / Damaged / Wastage (- Out)</option>
            </select>
          </label>

          <label>
            Adjustment Quantity
            <input data-ui="input"
              type="number"
              min="1"
              step="any"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              required
            />
          </label>

          <label>
            Reason / Audit Notes
            <input data-ui="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Physical inventory count correction"
              required
            />
          </label>
        </div>

        <div className="editor-actions">
          <button data-ui="button" type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button data-ui="button" type="submit" className="button primary">
            Apply Stock Adjustment
          </button>
        </div>
      </form>
    </div>
  )
}
