'use client'

import { useState, useRef } from 'react'
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
  FileText,
  DollarSign,
  Truck,
  TrendingDown,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  fileToBase64,
  type AppDatabase,
  type RawMaterialItem,
  type RawMaterialCategory,
  type Status,
} from '@/lib/db'
import { exportToCSV } from '@/lib/pdf-export'

interface RawMaterialsViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigateToSupplier?: (supplierId: string) => void
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
  const [viewDetailsMaterial, setViewDetailsMaterial] = useState<RawMaterialItem | null>(null)
  const [viewingInvoiceImage, setViewingInvoiceImage] = useState<string | null>(null)
  const [stockAdjustmentItem, setStockAdjustmentItem] = useState<{
    id: string
    name: string
    current: number
  } | null>(null)

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

  // Categories list
  const categories: RawMaterialCategory[] = [
    'Ingredients',
    'Packaging',
    'Flavors',
    'Chemicals & Minerals',
    'Other',
  ]

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

  const handleDeleteMaterial = (id: string, name: string) => {
    // Check if raw material is used in any recipe / production runs
    const usedCount = db.productionRuns.filter((p) =>
      p.consumedMaterials?.some((c) => c.rawMaterialId === id || c.name === name)
    ).length

    const confirmMsg =
      usedCount > 0
        ? `Raw material "${name}" is referenced in ${usedCount} previous production batch(es). Are you sure you want to permanently delete it?`
        : `Are you sure you want to delete "${name}"?`

    if (!window.confirm(confirmMsg)) return

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
    } catch (err) {
      console.error('Failed to upload image:', err)
    }
  }

  const getCategoryBadgeClass = (category: string) => {
    const cat = (category || '').toLowerCase()
    if (cat.includes('packag')) {
      return 'bg-blue-600/90 text-white'
    }
    if (cat.includes('chem') || cat.includes('mineral')) {
      return 'bg-amber-600/90 text-white'
    }
    if (cat.includes('flavor')) {
      return 'bg-purple-600/90 text-white'
    }
    if (cat.includes('ingred') || cat.includes('sugar') || cat.includes('concentrate')) {
      return 'bg-[#7cb518]/90 text-white'
    }
    return 'bg-stone-700/90 text-white'
  }

  return (
    <div className="page-stack" id="raw-materials-management-view">
      {/* Top Heading */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">Warehouse & Procurement Core</p>
          <h1>Raw Material Management</h1>
          <p className="subheading">
            Manage factory raw ingredients, packaging preforms, bottling caps, labels, cartons, and chemical minerals.
          </p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={handleExportCSV} id="btn-export-raw-csv">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
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
      </div>

      {/* KPI Stats Grid */}
      <div className="stat-grid">
        <div className="stat-card" id="metric-total-materials">
          <div className="stat-label">Total Raw Items</div>
          <strong>{totalItemsCount} Items</strong>
          <span className="stat-change text-blue-700">
            {categories.length} categories across plant storage
          </span>
        </div>

        <div className="stat-card" id="metric-raw-valuation">
          <div className="stat-label">Total Material Valuation</div>
          <strong>{formatPKR(totalValuation)}</strong>
          <span className="stat-change text-emerald-700">Based on landed purchase & handling cost</span>
        </div>

        <div className="stat-card" id="metric-raw-alerts">
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

        <div className="stat-card" id="metric-total-suppliers">
          <div className="stat-label">Registered Suppliers</div>
          <strong>{db.suppliers.length} Suppliers</strong>
          <span className="stat-change text-purple-700">Vendors supplying packaging & ingredients</span>
        </div>
      </div>

      {/* Toolbar & Multi-Filters */}
      <div
        className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3"
        id="raw-materials-toolbar"
      >
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              placeholder="Search raw material by name, SKU, category, supplier, description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-9 pr-8 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518] transition-all"
              id="input-raw-search"
            />
            {query && (
              <button
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
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-stone-200 rounded-lg px-3 py-2 text-xs bg-white text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
            id="filter-raw-category"
          >
            <option value="All">All Categories ({db.rawMaterials.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c} {categoryCounts[c] ? `(${categoryCounts[c]})` : ''}
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <select
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
          <select
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
            <select
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
            <button
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
          <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 shadow-xs">
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
              <button
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
            {filteredMaterials.map((r) => {
              const isLow = r.quantity <= r.reorderLevel && r.quantity > 0
              const isOut = r.quantity <= 0
              const effectiveCost =
                r.totalCostPerUnit !== undefined ? r.totalCostPerUnit : r.unitCost + (r.otherCost || 0)
              const sizeLabel = r.size ? `${r.size} ${r.unit}`.trim() : null

              return (
                <div
                  key={r.id}
                  className="group bg-white rounded-2xl p-3.5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
                  id={`raw-material-card-${r.id}`}
                >
                  {/* Top Section: Image & Overlaid Badges */}
                  <div>
                    <div className="w-full aspect-[4/3] rounded-xl bg-stone-100 overflow-hidden relative flex items-center justify-center mb-3">
                      {r.imageUrl ? (
                        <img
                          src={r.imageUrl}
                          alt={r.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 gap-1">
                          <Boxes className="w-10 h-10 stroke-[1.5]" />
                          <span className="text-[10px] font-medium text-stone-400">No Image</span>
                        </div>
                      )}

                      {/* Top-Right Action Buttons (Edit, Delete, Upload Image, Stock Adjust) */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-xs p-1 rounded-lg shadow-xs opacity-90 group-hover:opacity-100 transition-opacity">
                        <label
                          className="p-1.5 text-stone-500 hover:text-indigo-600 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                          title="Upload / Change Image"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleQuickImageUpload(r.id, file)
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className="p-1.5 text-stone-500 hover:text-[#7cb518] hover:bg-stone-100 rounded-md transition-colors"
                          title="Quick Stock Adjust"
                          onClick={() =>
                            setStockAdjustmentItem({
                              id: r.id,
                              name: r.name,
                              current: r.quantity,
                            })
                          }
                        >
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 text-stone-500 hover:text-blue-600 hover:bg-stone-100 rounded-md transition-colors"
                          title="Edit Raw Material"
                          onClick={() => {
                            setSelectedRawMaterial(r)
                            setIsCreatingMaterial(true)
                          }}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-stone-100 rounded-md transition-colors"
                          title="Delete Raw Material"
                          onClick={() => handleDeleteMaterial(r.id, r.name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Top-Left Category Badge & Status Overlays */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs ${getCategoryBadgeClass(
                            r.category
                          )}`}
                        >
                          {r.category}
                        </span>

                        {isOut ? (
                          <span className="inline-flex items-center gap-0.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-0.5 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                            <AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Category Pill & SKU Label Row */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="inline-block bg-stone-100 text-stone-700 font-semibold text-[10px] px-2 py-0.5 rounded-md truncate max-w-[130px]">
                        {r.supplierName || r.category}
                      </span>
                      <span className="font-mono text-[10px] text-stone-400">
                        {r.sku}
                      </span>
                    </div>

                    {/* Material Name */}
                    <h4
                      className="font-bold text-stone-900 text-sm leading-snug line-clamp-1 group-hover:text-[#7cb518] transition-colors cursor-pointer"
                      title={r.name}
                      onClick={() => setViewDetailsMaterial(r)}
                    >
                      {r.name}
                    </h4>

                    {/* Unit & Quantity / Stock Info */}
                    <div className="flex items-center justify-between text-xs text-stone-500 mt-1">
                      <span>
                        {sizeLabel ? `${sizeLabel} • ` : ''}
                        <strong className="text-stone-700">{r.unit}</strong>
                      </span>
                      <span
                        className={`font-bold ${
                          isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-stone-800'
                        }`}
                      >
                        {r.quantity} {r.unit} in stock
                      </span>
                    </div>
                  </div>

                  {/* Bottom Pricing Bar */}
                  <div className="mt-3.5 pt-3 border-t border-stone-100 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">
                        Price / Unit
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-extrabold text-stone-900">
                          {formatPKR(r.unitCost)}
                        </span>
                        {effectiveCost !== r.unitCost && (
                          <span className="text-[10px] text-stone-400 font-medium">
                            (Landed: {formatPKR(effectiveCost)})
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewDetailsMaterial(r)}
                      className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-0.5 hover:underline"
                    >
                      <Eye className="w-3 h-3" /> View
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT RAW MATERIAL */}
      {isCreatingMaterial && (
        <RawMaterialEditorModal
          material={selectedRawMaterial}
          suppliers={db.suppliers}
          onClose={() => {
            setIsCreatingMaterial(false)
            setSelectedRawMaterial(null)
          }}
          onSave={handleSaveMaterial}
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
        />
      )}

      {/* MODAL: VIEW INVOICE IMAGE PREVIEW */}
      {viewingInvoiceImage && (
        <div className="editor-overlay" onClick={() => setViewingInvoiceImage(null)}>
          <div
            className="bg-white p-4 rounded-xl max-w-2xl w-full mx-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">Purchase Invoice Document Copy</h3>
              </div>
              <button
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
              <button
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
   RAW MATERIAL EDITOR MODAL (Add / Edit with all specified fields)
========================================================================= */
function RawMaterialEditorModal({
  material,
  suppliers,
  onClose,
  onSave,
}: {
  material: RawMaterialItem | null
  suppliers: AppDatabase['suppliers']
  onClose: () => void
  onSave: (item: RawMaterialItem) => void
}) {
  const [name, setName] = useState(material?.name || '')
  const [sku, setSku] = useState(material?.sku || `RAW-${Date.now().toString().slice(-4)}`)
  const [category, setCategory] = useState<RawMaterialCategory>(material?.category || 'Ingredients')
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

  const handleSubmit = (e: React.FormEvent) => {
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

    const matchedSupplier = suppliers.find((s) => s.id === supplierId)
    const now = new Date().toISOString().slice(0, 10)
    const numQty = Number(quantity) || 0
    const numReorder = Number(reorderLevel) || 50
    const status: Status = numQty <= 0 ? 'Out of stock' : numQty <= numReorder ? 'Low stock' : 'In stock'

    const saved: RawMaterialItem = {
      id: material?.id || `raw-${Date.now()}`,
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      category,
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
      reorderLevel: numReorder,
      status,
      updatedAt: now,
    }

    onSave(saved)
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal large" onSubmit={handleSubmit} id="raw-material-editor-form">
        <div className="editor-header">
          <div className="flex items-center gap-2">
            <Boxes className="w-6 h-6 text-purple-600" />
            <div>
              <p className="eyebrow">Warehouse Inventory</p>
              <h2>{material ? 'Edit Raw Material' : 'Add New Raw Material'}</h2>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-lg text-xs mb-3">
            {error}
          </div>
        )}

        <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
          {/* SECTION 1: PRIMARY IDENTIFICATION */}
          <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-purple-600" /> 1. Material Identity & Classification
            </h3>

            <div className="form-grid three">
              <label>
                Material Name *
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Refined White Sugar / PET Preforms 500ml"
                  required
                  id="input-material-name"
                />
              </label>

              <label>
                SKU Code *
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. RAW-SGR-01"
                  required
                  id="input-material-sku"
                />
              </label>

              <label>
                Category *
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as RawMaterialCategory)}
                  id="select-material-category"
                >
                  <option value="Ingredients">Ingredients (Sugar, Pulp, Concentrates, Salt)</option>
                  <option value="Packaging">Packaging (Preforms, Caps, Labels, Boxes)</option>
                  <option value="Flavors">Flavors & Seasoning (Mango, Apple, Masala)</option>
                  <option value="Chemicals & Minerals">Chemicals & Minerals (RO Minerals, Citric Acid)</option>
                  <option value="Other">Other Miscellaneous Supplies</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <label>
                Description / Technical Specifications (Optional)
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Grade A specification, mesh size, food safety certificate, storage instructions..."
                  className="w-full text-xs"
                  id="input-material-desc"
                />
              </label>

              {/* Size & Unit selection with dropdown */}
              <div className="grid grid-cols-2 gap-2">
                <label>
                  Size / Package Capacity
                  <input
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="e.g. 50, 25, 500"
                    id="input-material-size"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Net weight or pack volume</span>
                </label>

                <label>
                  Unit of Measurement *
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="bg-white"
                    required
                    id="select-material-unit"
                  >
                    <optgroup label="Weight & Volume (Standard)">
                      <option value="kg">kg (Kilograms)</option>
                      <option value="g">g (Grams)</option>
                      <option value="L">L (Liters)</option>
                      <option value="ml">ml (Milliliters)</option>
                    </optgroup>
                    <optgroup label="Packaging & Discrete Units">
                      <option value="Pcs">Pcs (Pieces / Units)</option>
                      <option value="Bags">Bags (50kg / 25kg Sacks)</option>
                      <option value="Drums">Drums (200L Barrels)</option>
                      <option value="Rolls">Rolls (Label / Foil Rolls)</option>
                      <option value="Cartons">Cartons (Master Boxes)</option>
                    </optgroup>
                  </select>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Standard inventory metric</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 2: COSTING & EXPENSE BREAKDOWN */}
          <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[#7cb518]" /> 2. Price, Other Costs & Landed Cost Rate
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label>
                Base Price per Unit (Rs) *
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={unitCost}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                  placeholder="e.g. 145"
                  required
                  id="input-material-unit-cost"
                />
                <span className="text-[10px] text-gray-500 mt-0.5 block">Direct supplier invoice rate per {unit}</span>
              </label>

              <label>
                Other Cost (Rs) (Transport, Handling, Loading)
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={otherCost}
                  onChange={(e) => setOtherCost(Number(e.target.value))}
                  placeholder="e.g. 15"
                  id="input-material-other-cost"
                />
                <span className="text-[10px] text-gray-500 mt-0.5 block">Freight, carriage, unloading expense</span>
              </label>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">Total Landed Cost / {unit}</label>
                  <label className="flex items-center gap-1 text-[11px] text-purple-700 font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isManualTotalCost}
                      onChange={(e) => setIsManualTotalCost(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    Manual Override
                  </label>
                </div>

                {isManualTotalCost ? (
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={manualTotalCostPerUnit}
                    onChange={(e) => setManualTotalCostPerUnit(Number(e.target.value))}
                    className="bg-purple-50 border-purple-300 font-bold text-purple-900"
                    id="input-manual-total-cost"
                  />
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-md p-2 text-emerald-900 font-bold text-base">
                    {formatPKR(autoCalculatedTotalCostPerUnit)} <span className="text-xs font-normal text-emerald-700">/ {unit}</span>
                  </div>
                )}
                <span className="text-[10px] text-gray-500 mt-0.5 block">
                  {isManualTotalCost
                    ? 'Manually set landed rate applied to BOM production runs'
                    : 'Auto-calculated: Base Rate + Other Handling Cost'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: WAREHOUSE STOCK & SUPPLIER REFERENCE */}
          <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600" /> 3. Warehouse Stock & Supplier Reference
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label>
                Current Warehouse Stock ({unit}) *
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                  id="input-material-stock-qty"
                />
                <span className="text-[10px] text-gray-500 mt-0.5 block">Available quantity in factory storage</span>
              </label>

              <label>
                Reorder Alert Threshold ({unit}) *
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(Number(e.target.value))}
                  required
                  id="input-material-reorder-level"
                />
                <span className="text-[10px] text-gray-500 mt-0.5 block">Warn when stock falls to or below this level</span>
              </label>

              <label>
                Primary Supplier Reference
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="bg-white"
                  id="select-material-supplier"
                >
                  <option value="">No Supplier Assigned</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category} - {s.city || 'Pakistan'})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-500 mt-0.5 block">Linked to Supplier accounts module</span>
              </label>
            </div>

            {/* Total Valuation Card */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 mt-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-600 block">Total Material Warehouse Valuation:</span>
                <span className="text-[11px] text-gray-500">
                  {quantity} {unit} × {formatPKR(effectiveTotalCostPerUnit)} / {unit}
                </span>
              </div>
              <div className="text-lg font-bold text-[#7cb518]">{formatPKR(totalValuation)}</div>
            </div>
          </div>

          {/* SECTION 4: MEDIA & INVOICE ATTACHMENT */}
          <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <UploadCloud className="w-3.5 h-3.5 text-purple-600" /> 4. Material Photo & Purchase Invoice Attachment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Material Image */}
              <div className="bg-white p-3.5 rounded-lg border border-gray-200 space-y-2">
                <label className="text-xs font-bold text-gray-700 block">Raw Material Photo (Optional)</label>
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileChange}
                />

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Material preview" className="w-full h-full object-cover" />
                    ) : (
                      <Boxes className="w-6 h-6 text-gray-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <button
                      type="button"
                      className="button secondary text-xs w-full py-1.5"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> {imageUrl ? 'Change Photo' : 'Upload Material Photo'}
                    </button>
                    {imageUrl && (
                      <button
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
              <div className="bg-white p-3.5 rounded-lg border border-gray-200 space-y-2">
                <label className="text-xs font-bold text-gray-700 block">
                  Purchase Invoice / Bill Image (Optional)
                </label>
                <input
                  type="file"
                  ref={invoiceInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleInvoiceFileChange}
                />

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {purchaseInvoiceImage ? (
                      <img src={purchaseInvoiceImage} alt="Invoice preview" className="w-full h-full object-cover" />
                    ) : (
                      <Receipt className="w-6 h-6 text-gray-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <button
                      type="button"
                      className="button secondary text-xs w-full py-1.5"
                      onClick={() => invoiceInputRef.current?.click()}
                    >
                      <Receipt className="w-3.5 h-3.5 text-blue-600" />{' '}
                      {purchaseInvoiceImage ? 'Change Invoice' : 'Attach Purchase Invoice'}
                    </button>
                    {purchaseInvoiceImage && (
                      <button
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

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary" id="btn-save-raw-material-submit">
            {material ? 'Update Raw Material' : 'Create Raw Material'}
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
  suppliers,
  onClose,
  onEdit,
  onDelete,
  onStockAdjust,
  onViewInvoice,
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
  suppliers: AppDatabase['suppliers']
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onStockAdjust: () => void
  onViewInvoice: (img: string) => void
}) {
  const isLow = material.quantity <= material.reorderLevel && material.quantity > 0
  const isOut = material.quantity <= 0
  const effectiveCost =
    material.totalCostPerUnit !== undefined
      ? material.totalCostPerUnit
      : material.unitCost + (material.otherCost || 0)
  const totalVal = material.quantity * effectiveCost
  const supplier = suppliers.find((s) => s.id === material.supplierId)

  return (
    <div className="editor-overlay">
      <div className="editor-modal large" id="raw-material-details-modal">
        <div className="editor-header">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 overflow-hidden flex items-center justify-center flex-shrink-0">
              {material.imageUrl ? (
                <img src={material.imageUrl} alt={material.name} className="w-full h-full object-cover" />
              ) : (
                <Boxes className="w-6 h-6 text-purple-600" />
              )}
            </div>
            <div>
              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded mr-2">
                {material.sku}
              </span>
              <span className="text-xs bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded">
                {material.category}
              </span>
              <h2 className="text-lg font-bold text-gray-900 mt-1">{material.name}</h2>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="text-[11px] text-gray-500 font-medium">Remaining Stock</div>
              <div
                className={`text-lg font-bold ${
                  isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-gray-900'
                }`}
              >
                {material.quantity} {material.unit}
              </div>
              <div className="text-[10px] text-gray-500">Reorder alert at: {material.reorderLevel} {material.unit}</div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="text-[11px] text-gray-500 font-medium">Base Price / Unit</div>
              <div className="text-lg font-bold text-gray-900">{formatPKR(material.unitCost)}</div>
              <div className="text-[10px] text-gray-500">Per {material.unit}</div>
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
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Specifications & Metrics</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Packaging Size:</span>
                  <span className="font-semibold text-gray-900">
                    {material.size ? `${material.size} ${material.unit}` : 'Standard bulk'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Other Overhead Cost:</span>
                  <span className="font-semibold text-gray-900">{formatPKR(material.otherCost || 0)} / {material.unit}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Total Inflow / Received:</span>
                  <span className="font-semibold text-gray-900">
                    {material.totalReceived !== undefined ? material.totalReceived : material.quantity + totalConsumed} {material.unit}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Consumed in Production Runs:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {totalConsumed} {material.unit}
                  </span>
                </div>
              </div>

              {material.description && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                  <span className="font-semibold text-gray-700 block mb-1">Technical Specs / Description:</span>
                  {material.description}
                </div>
              )}
            </div>

            {/* Supplier & Document Copies */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Supplier & Attached Documents</h3>

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
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs">
                  <span className="text-gray-500">Supplier:</span> <strong>{material.supplierName}</strong>
                </div>
              ) : (
                <div className="text-xs text-gray-400">No supplier linked to this material.</div>
              )}

              {/* Invoice Attachment Preview */}
              <div className="mt-3">
                <div className="text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>Attached Purchase Invoice</span>
                  {material.purchaseInvoiceImage && (
                    <button
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
                    className="w-full h-28 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden cursor-pointer group relative flex items-center justify-center"
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
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center text-xs text-gray-400">
                    No purchase invoice attached for this raw material.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Production Usage History Table */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" /> Linked Production Engine Consumption History
            </h3>

            {consumptionHistory.length === 0 ? (
              <p className="text-xs text-gray-500 py-3 text-center bg-gray-50 rounded-lg border border-gray-200">
                No production runs have logged consumption for this raw material yet.
              </p>
            ) : (
              <div className="table-scroll border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
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
                        <td className="font-mono font-bold text-gray-900">{h.batchNumber}</td>
                        <td>{formatDate(h.date)}</td>
                        <td className="font-medium text-gray-900">{h.productName}</td>
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
          <button
            type="button"
            className="button secondary text-rose-600 hover:text-rose-700"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" /> Delete Material
          </button>

          <div className="flex items-center gap-2">
            <button type="button" className="button secondary" onClick={onStockAdjust}>
              <ArrowUpCircle className="w-4 h-4" /> Adjust Stock
            </button>
            <button type="button" className="button primary" onClick={onEdit}>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const delta = adjustmentType === 'add' ? qty : -qty
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
          <button type="button" className="icon-button" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4 text-xs">
          Current Warehouse Stock: <strong className="text-sm text-gray-900">{item.current} units</strong>
        </div>

        <div className="form-grid single">
          <label>
            Adjustment Action
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as any)}
            >
              <option value="add">Add Inflow Stock (+ In)</option>
              <option value="remove">Deduct Stock / Damaged / Wastage (- Out)</option>
            </select>
          </label>

          <label>
            Adjustment Quantity
            <input
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
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Physical inventory count correction"
              required
            />
          </label>
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Apply Stock Adjustment
          </button>
        </div>
      </form>
    </div>
  )
}
