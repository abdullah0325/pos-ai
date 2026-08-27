'use client'

import { useState, useMemo, useRef } from 'react'
import Image from 'next/image'
import {
  Plus,
  Search,
  Package,
  Boxes,
  AlertTriangle,
  Edit,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  Download,
  FileText,
  Tag,
  Eye,
  ImageIcon,
  Receipt,
  Check,
  Layers,
  TrendingUp,
  Percent,
  SlidersHorizontal,
  FolderPlus,
  UploadCloud,
  CheckCircle2,
  ShoppingBag,
  Factory,
  Building2,
  Sparkles,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  fileToBase64,
  type AppDatabase,
  type ProductItem,
  type RawMaterialItem,
  type CategoryItem,
  type RawMaterialCategory,
  type Status,
} from '@/lib/db'
import { exportToCSV, generateStockReportPDF } from '@/lib/pdf-export'

interface InventoryViewProps {
  db: AppDatabase
  activeSubView: 'products' | 'raw-materials' | 'stock'
  onSaveDatabase: (updated: AppDatabase) => void
}

export default function InventoryView({ db, activeSubView, onSaveDatabase }: InventoryViewProps) {
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [stockStatusFilter, setStockStatusFilter] = useState<'All' | 'In stock' | 'Low stock' | 'Out of stock'>('All')
  const [sourceFilter, setSourceFilter] = useState<'All' | 'Manufactured' | 'Purchased'>('All')
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'costPrice' | 'wholesalePrice' | 'retailPrice' | 'valuation'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null)
  const [viewProductDetails, setViewProductDetails] = useState<ProductItem | null>(null)
  const [selectedRawMaterial, setSelectedRawMaterial] = useState<RawMaterialItem | null>(null)
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)
  const [isCreatingRaw, setIsCreatingRaw] = useState(false)
  const [isManagingCategories, setIsManagingCategories] = useState(false)
  const [stockAdjustmentItem, setStockAdjustmentItem] = useState<{
    id: string
    name: string
    current: number
    type: 'product' | 'raw'
  } | null>(null)

  const categories = db.categories || []

  // Products filtering & sorting
  const filteredProducts = useMemo(() => {
    let result = db.products.filter((p) => {
      const matchQ =
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku.toLowerCase().includes(query.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(query.toLowerCase())) ||
        p.category.toLowerCase().includes(query.toLowerCase())

      const matchCat = categoryFilter === 'All' || p.category === categoryFilter

      const matchStock =
        stockStatusFilter === 'All' ||
        (stockStatusFilter === 'In stock' && p.quantity > p.reorderLevel) ||
        (stockStatusFilter === 'Low stock' && p.quantity > 0 && p.quantity <= p.reorderLevel) ||
        (stockStatusFilter === 'Out of stock' && p.quantity <= 0)

      const matchSource =
        sourceFilter === 'All' ||
        (sourceFilter === 'Purchased' && p.isPurchasedProduct) ||
        (sourceFilter === 'Manufactured' && !p.isPurchasedProduct)

      return matchQ && matchCat && matchStock && matchSource
    })

    result.sort((a, b) => {
      let valA: any = a.name.toLowerCase()
      let valB: any = b.name.toLowerCase()

      if (sortBy === 'stock') {
        valA = a.quantity
        valB = b.quantity
      } else if (sortBy === 'costPrice') {
        valA = a.costPrice
        valB = b.costPrice
      } else if (sortBy === 'wholesalePrice') {
        valA = a.wholesalePrice
        valB = b.wholesalePrice
      } else if (sortBy === 'retailPrice') {
        valA = a.retailPrice
        valB = b.retailPrice
      } else if (sortBy === 'valuation') {
        valA = a.totalCost !== undefined ? a.totalCost : a.quantity * a.costPrice
        valB = b.totalCost !== undefined ? b.totalCost : b.quantity * b.costPrice
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [db.products, query, categoryFilter, stockStatusFilter, sourceFilter, sortBy, sortOrder])

  // Raw materials filter
  const filteredRaw = useMemo(() => {
    return db.rawMaterials.filter((r) => {
      const matchQ =
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.sku.toLowerCase().includes(query.toLowerCase())
      const matchCat = categoryFilter === 'All' || r.category === categoryFilter
      return matchQ && matchCat
    })
  }, [db.rawMaterials, query, categoryFilter])

  // Export CSV helpers
  const exportProductsCSV = () => {
    const headers = [
      'SKU',
      'Product Name',
      'Category',
      'Size/Unit',
      'Packing Unit',
      'Stock Qty',
      'Cost Price (Rs)',
      'Wholesale Price (Rs)',
      'Wholesale Min Qty',
      'Retail Price (Rs)',
      'Total Valuation (Rs)',
      'Sourcing',
      'Status',
    ]
    const rows = db.products.map((p) => [
      p.sku,
      p.name,
      p.category,
      p.size ? `${p.size} ${p.sizeUnit || ''}`.trim() : '—',
      p.unit,
      p.quantity,
      p.costPrice,
      p.wholesalePrice,
      p.wholesaleMinQty || '—',
      p.retailPrice,
      p.totalCost !== undefined ? p.totalCost : p.quantity * p.costPrice,
      p.isPurchasedProduct ? 'Purchased (Trading)' : 'Manufactured In-house',
      p.status,
    ])
    exportToCSV(`Finished_Products_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  const exportRawCSV = () => {
    const headers = [
      'SKU',
      'Material Name',
      'Category',
      'Stock Qty',
      'Unit',
      'Unit Cost (Rs)',
      'Total Value (Rs)',
      'Supplier',
      'Status',
    ]
    const rows = db.rawMaterials.map((r) => [
      r.sku,
      r.name,
      r.category,
      r.quantity,
      r.unit,
      r.unitCost,
      r.quantity * r.unitCost,
      r.supplierName || '—',
      r.status,
    ])
    exportToCSV(`Raw_Materials_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  // Delete product
  const handleDeleteProduct = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"?`)) return
    onSaveDatabase({
      ...db,
      products: db.products.filter((p) => p.id !== id),
    })
    if (viewProductDetails?.id === id) setViewProductDetails(null)
  }

  // Delete raw material
  const handleDeleteRaw = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this raw material?')) return
    onSaveDatabase({ ...db, rawMaterials: db.rawMaterials.filter((r) => r.id !== id) })
  }

  // Handle Quick Stock In / Out Adjustment
  const handleApplyStockAdjustment = (delta: number, reason: string) => {
    if (!stockAdjustmentItem) return
    const now = new Date().toISOString().slice(0, 10)

    if (stockAdjustmentItem.type === 'product') {
      const updatedProducts = db.products.map((p) => {
        if (p.id === stockAdjustmentItem.id) {
          const newQty = Math.max(0, p.quantity + delta)
          const newTotal = p.isManualTotalCost && p.totalCost !== undefined
            ? p.totalCost
            : newQty * p.costPrice
          return {
            ...p,
            quantity: newQty,
            totalCost: newTotal,
            status: (newQty <= 0 ? 'Out of stock' : newQty <= p.reorderLevel ? 'Low stock' : 'In stock') as Status,
            updatedAt: now,
          }
        }
        return p
      })
      onSaveDatabase({ ...db, products: updatedProducts })
    } else {
      const updatedRaw = db.rawMaterials.map((r) => {
        if (r.id === stockAdjustmentItem.id) {
          const newQty = Math.max(0, r.quantity + delta)
          return {
            ...r,
            quantity: newQty,
            status: (newQty <= 0 ? 'Out of stock' : newQty <= r.reorderLevel ? 'Low stock' : 'In stock') as Status,
            updatedAt: now,
          }
        }
        return r
      })
      onSaveDatabase({ ...db, rawMaterials: updatedRaw })
    }
    setStockAdjustmentItem(null)
  }

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    db.products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1
    })
    return counts
  }, [db.products])

  const totalFinishedStockValuation = db.products.reduce(
    (sum, p) => sum + (p.totalCost !== undefined ? p.totalCost : p.quantity * p.costPrice),
    0
  )

  const lowStockCount = db.products.filter((p) => p.quantity <= p.reorderLevel).length

  return (
    <div className="page-stack" id="inventory-view-module">
      {/* Heading */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">Inventory & Product Catalog</p>
          <h1>
            {activeSubView === 'products'
              ? 'Products & Categories'
              : activeSubView === 'raw-materials'
              ? 'Raw Materials Management'
              : 'Warehouse Stock Ledger'}
          </h1>
          <p className="subheading">
            {activeSubView === 'products'
              ? 'Manage finished products catalog, categories, pricing rates, images, and stock inventory.'
              : activeSubView === 'raw-materials'
              ? 'Sugar, concentrates, packaging boxes, PET preforms, and flavorings.'
              : 'Comprehensive inventory ledger, low-stock reorder triggers, and manual batch adjustments.'}
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="button secondary"
            onClick={() => generateStockReportPDF(db.products, db.rawMaterials)}
            id="btn-stock-pdf"
          >
            <FileText className="w-4 h-4" /> Stock PDF
          </button>
          {activeSubView === 'products' && (
            <>
              <button
                className="button secondary"
                onClick={() => setIsManagingCategories(true)}
                id="btn-manage-categories"
              >
                <Tag className="w-4 h-4" /> Manage Categories
              </button>
              <button className="button secondary" onClick={exportProductsCSV} id="btn-export-products-csv">
                <Download className="w-4 h-4" /> CSV
              </button>
              <button
                className="button primary"
                onClick={() => setIsCreatingProduct(true)}
                id="btn-add-product"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </>
          )}
          {activeSubView === 'raw-materials' && (
            <>
              <button className="button secondary" onClick={exportRawCSV} id="btn-export-raw-csv">
                <Download className="w-4 h-4" /> CSV
              </button>
              <button
                className="button primary"
                onClick={() => setIsCreatingRaw(true)}
                id="btn-add-raw-material"
              >
                <Plus className="w-4 h-4" /> Add Raw Material
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stat-grid">
        <div className="stat-card" id="kpi-total-valuation">
          <div className="stat-label">Finished Products Valuation</div>
          <strong>{formatPKR(totalFinishedStockValuation)}</strong>
          <span className="stat-change text-emerald-700">{db.products.length} registered products</span>
        </div>

        <div className="stat-card" id="kpi-categories-stat">
          <div className="stat-label">Active Categories</div>
          <strong>{categories.length} Categories</strong>
          <span className="stat-change text-blue-700">Juices, Water, Confectionery & more</span>
        </div>

        <div className="stat-card" id="kpi-low-stock-alert">
          <div className="stat-label">Low Stock Alerts</div>
          <strong className={lowStockCount > 0 ? 'text-amber-700' : 'text-gray-900'}>
            {lowStockCount} Products
          </strong>
          <span className="stat-change text-amber-700">
            {lowStockCount > 0 ? 'Below safety reorder threshold' : 'All SKUs above safety limit'}
          </span>
        </div>

        <div className="stat-card" id="kpi-sourcing-stat">
          <div className="stat-label">Product Sourcing Breakdown</div>
          <strong className="text-emerald-700">
            {db.products.filter((p) => !p.isPurchasedProduct).length} In-House / {db.products.filter((p) => p.isPurchasedProduct).length} Outsourced
          </strong>
          <span className="stat-change">100% offline database synchronized</span>
        </div>
      </div>

      {/* Toolbar & Multi-Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3" id="products-toolbar">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              placeholder="Search products by name, SKU, category..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-9 pr-8 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518] transition-all"
              id="input-product-search"
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
            id="filter-category"
          >
            <option value="All">All Categories ({db.products.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name} {categoryCounts[c.name] ? `(${categoryCounts[c.name]})` : ''}
              </option>
            ))}
          </select>

          {activeSubView === 'products' && (
            <>
              {/* Stock Status Filter */}
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="border border-stone-200 rounded-lg px-3 py-2 text-xs bg-white text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                id="filter-stock-status"
              >
                <option value="All">All Stock Levels</option>
                <option value="In stock">In Stock</option>
                <option value="Low stock">Low Stock Alert</option>
                <option value="Out of stock">Out of Stock</option>
              </select>

              {/* Sourcing Filter */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
                className="border border-stone-200 rounded-lg px-3 py-2 text-xs bg-white text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                id="filter-sourcing"
              >
                <option value="All">All Sources</option>
                <option value="Manufactured">In-House</option>
                <option value="Purchased">Outsourced</option>
              </select>

              {/* Sorting */}
              <div className="flex items-center gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border border-stone-200 rounded-lg px-3 py-2 text-xs bg-white text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                  id="sort-by-select"
                >
                  <option value="name">Sort: Name</option>
                  <option value="stock">Sort: Stock</option>
                  <option value="costPrice">Sort: Cost Price</option>
                  <option value="wholesalePrice">Sort: Wholesale Price</option>
                  <option value="retailPrice">Sort: Retail Price</option>
                  <option value="valuation">Sort: Total Value</option>
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
            </>
          )}
        </div>
      </div>

      {/* VIEW: FINISHED PRODUCTS (CARD GRID) */}
      {activeSubView === 'products' && (
        <div id="finished-products-panel">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 shadow-xs">
              <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
                  <Package className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-stone-800">No products found</h3>
                <p className="text-xs text-stone-500">
                  {query || categoryFilter !== 'All' || stockStatusFilter !== 'All' || sourceFilter !== 'All'
                    ? 'Try adjusting your search query or filters to find what you are looking for.'
                    : 'Get started by creating your first finished product SKU.'}
                </p>
                <button
                  className="button primary text-xs mt-2"
                  onClick={() => setIsCreatingProduct(true)}
                >
                  <Plus className="w-4 h-4" /> Add Product
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4.5" id="products-card-grid">
              {filteredProducts.map((p) => {
                const isLow = p.quantity <= p.reorderLevel && p.quantity > 0
                const isOut = p.quantity <= 0
                const sizeLabel = p.size ? `${p.size} ${p.sizeUnit || ''}`.trim() : null

                return (
                  <div
                    key={p.id}
                    className="group bg-white rounded-2xl p-3.5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
                    id={`product-card-${p.id}`}
                  >
                    {/* Top Section: Image & Overlaid Badges */}
                    <div>
                      <div className="w-full aspect-[4/3] rounded-xl bg-stone-100 overflow-hidden relative flex items-center justify-center mb-3">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 gap-1">
                            <Package className="w-10 h-10 stroke-[1.5]" />
                            <span className="text-[10px] font-medium text-stone-400">No Image</span>
                          </div>
                        )}

                        {/* Top-Right Action Buttons */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-xs p-1 rounded-lg shadow-xs opacity-90 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            className="p-1.5 text-stone-500 hover:text-[#7cb518] hover:bg-stone-100 rounded-md transition-colors"
                            title="Quick Stock Adjust"
                            onClick={() =>
                              setStockAdjustmentItem({
                                id: p.id,
                                name: p.name,
                                current: p.quantity,
                                type: 'product',
                              })
                            }
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 text-stone-500 hover:text-blue-600 hover:bg-stone-100 rounded-md transition-colors"
                            title="Edit Product"
                            onClick={() => setSelectedProduct(p)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-stone-100 rounded-md transition-colors"
                            title="Delete Product"
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Top-Left Source Tag */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                          {p.isPurchasedProduct ? (
                            <span className="inline-flex items-center gap-1 bg-blue-600/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs">
                              Outsourced
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-[#7cb518]/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs">
                              In-House
                            </span>
                          )}

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

                      {/* Category Pill & SKU */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="inline-block bg-emerald-50 text-emerald-800 font-semibold text-[10px] px-2 py-0.5 rounded-md">
                          {p.category}
                        </span>
                        <span className="font-mono text-[10px] text-stone-400">
                          {p.sku}
                        </span>
                      </div>

                      {/* Product Name */}
                      <h4
                        className="font-bold text-stone-900 text-sm leading-snug line-clamp-1 group-hover:text-[#7cb518] transition-colors cursor-pointer"
                        title={p.name}
                        onClick={() => setViewProductDetails(p)}
                      >
                        {p.name}
                      </h4>

                      {/* Size / Unit & Available Stock */}
                      <div className="flex items-center justify-between text-xs text-stone-500 mt-1">
                        <span>
                          {sizeLabel ? `${sizeLabel} • ` : ''}
                          <strong className="text-stone-700">{p.unit}</strong>
                        </span>
                        <span
                          className={`font-bold ${
                            isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-stone-800'
                          }`}
                        >
                          {p.quantity} {p.unit}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Pricing Bar */}
                    <div className="mt-3.5 pt-3 border-t border-stone-100 flex items-end justify-between">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">
                          Cost / Retail
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs text-stone-500 font-medium">
                            {formatPKR(p.costPrice)}
                          </span>
                          <span className="text-stone-300 font-light">/</span>
                          <span className="text-sm font-extrabold text-stone-900">
                            {formatPKR(p.retailPrice)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setViewProductDetails(p)}
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
      )}

      {/* VIEW: RAW MATERIALS */}
      {activeSubView === 'raw-materials' && (
        <div className="panel table-panel" id="raw-materials-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Material SKU & Name</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Unit Cost Rate</th>
                  <th>Total Valuation</th>
                  <th>Primary Supplier</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRaw.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-purple-600" />
                        <div>
                          <div className="font-bold text-gray-900">{r.name}</div>
                          <div className="text-[11px] text-gray-500 font-mono">{r.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{r.category}</span>
                    </td>
                    <td>
                      <span className="font-bold text-gray-900">
                        {r.quantity} {r.unit}
                      </span>
                      {r.quantity <= r.reorderLevel && (
                        <span className="text-[10px] text-amber-600 font-bold block">
                          Low threshold: {r.reorderLevel} {r.unit}
                        </span>
                      )}
                    </td>
                    <td>{formatPKR(r.unitCost)}</td>
                    <td className="font-bold text-gray-900">{formatPKR(r.quantity * r.unitCost)}</td>
                    <td className="text-gray-700 text-xs">{r.supplierName || '—'}</td>
                    <td>
                      <span
                        className={
                          r.status === 'In stock'
                            ? 'status status-success'
                            : r.status === 'Low stock'
                            ? 'status status-warning'
                            : 'status status-danger'
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="row-action text-purple-600"
                          title="Quick Stock Adjust"
                          onClick={() =>
                            setStockAdjustmentItem({
                              id: r.id,
                              name: r.name,
                              current: r.quantity,
                              type: 'raw',
                            })
                          }
                        >
                          <ArrowUpCircle />
                        </button>
                        <button
                          className="row-action"
                          title="Edit material"
                          onClick={() => setSelectedRawMaterial(r)}
                        >
                          <Edit />
                        </button>
                        <button
                          className="row-action danger"
                          title="Delete material"
                          onClick={() => handleDeleteRaw(r.id)}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: STOCK OVERVIEW & MOVEMENTS */}
      {activeSubView === 'stock' && (
        <div className="space-y-6" id="stock-ledger-panel">
          <div className="panel">
            <div className="panel-heading mb-3">
              <div>
                <h2>Finished Goods Stock Register</h2>
                <p>Real-time count of completed manufacturing and trading inventory</p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Current Quantity</th>
                    <th>Safety Reorder Level</th>
                    <th>Valuation (Cost)</th>
                    <th>Status</th>
                    <th className="text-right">Stock Adjust</th>
                  </tr>
                </thead>
                <tbody>
                  {db.products.map((p) => (
                    <tr key={p.id}>
                      <td className="font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-[#7cb518]" />
                          <div>
                            <div>{p.name}</div>
                            <div className="text-[11px] text-gray-500 font-mono">{p.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td>{p.category}</td>
                      <td className="font-bold text-gray-900">
                        {p.quantity} {p.unit}
                      </td>
                      <td className="text-gray-500">
                        {p.reorderLevel} {p.unit}
                      </td>
                      <td className="font-bold">
                        {formatPKR(p.totalCost !== undefined ? p.totalCost : p.quantity * p.costPrice)}
                      </td>
                      <td>
                        <span
                          className={
                            p.quantity <= 0
                              ? 'status status-danger'
                              : p.quantity <= p.reorderLevel
                              ? 'status status-warning'
                              : 'status status-success'
                          }
                        >
                          {p.quantity <= 0 ? 'Out of stock' : p.quantity <= p.reorderLevel ? 'Low stock' : 'In stock'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          className="button secondary text-xs py-1 h-auto"
                          onClick={() =>
                            setStockAdjustmentItem({
                              id: p.id,
                              name: p.name,
                              current: p.quantity,
                              type: 'product',
                            })
                          }
                        >
                          Adjust Qty
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading mb-3">
              <div>
                <h2>Raw Materials Stock Register</h2>
                <p>Factory stock ready for next bottling & processing runs</p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Raw Material</th>
                    <th>Category</th>
                    <th>Current Quantity</th>
                    <th>Safety Reorder Level</th>
                    <th>Valuation (Cost)</th>
                    <th>Status</th>
                    <th className="text-right">Stock Adjust</th>
                  </tr>
                </thead>
                <tbody>
                  {db.rawMaterials.map((r) => (
                    <tr key={r.id}>
                      <td className="font-semibold text-gray-900">{r.name}</td>
                      <td>{r.category}</td>
                      <td className="font-bold text-gray-900">
                        {r.quantity} {r.unit}
                      </td>
                      <td className="text-gray-500">
                        {r.reorderLevel} {r.unit}
                      </td>
                      <td className="font-bold">{formatPKR(r.quantity * r.unitCost)}</td>
                      <td>
                        <span
                          className={
                            r.quantity <= r.reorderLevel ? 'status status-warning' : 'status status-success'
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          className="button secondary text-xs py-1 h-auto"
                          onClick={() =>
                            setStockAdjustmentItem({
                              id: r.id,
                              name: r.name,
                              current: r.quantity,
                              type: 'raw',
                            })
                          }
                        >
                          Adjust Qty
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Product Create/Edit Modal */}
      {(isCreatingProduct || selectedProduct) && (
        <ProductEditorModal
          product={selectedProduct}
          categories={categories}
          existingProducts={db.products}
          onClose={() => {
            setIsCreatingProduct(false)
            setSelectedProduct(null)
          }}
          onSave={(item) => {
            if (selectedProduct) {
              onSaveDatabase({
                ...db,
                products: db.products.map((p) => (p.id === item.id ? item : p)),
              })
            } else {
              onSaveDatabase({
                ...db,
                products: [item, ...db.products],
              })
            }
            setIsCreatingProduct(false)
            setSelectedProduct(null)
          }}
          onOpenCategoryManager={() => setIsManagingCategories(true)}
        />
      )}

      {/* Product Details Drawer/Modal */}
      {viewProductDetails && (
        <ProductDetailsModal
          product={viewProductDetails}
          onClose={() => setViewProductDetails(null)}
          onEdit={() => {
            setSelectedProduct(viewProductDetails)
            setViewProductDetails(null)
          }}
          onDelete={() => {
            handleDeleteProduct(viewProductDetails.id, viewProductDetails.name)
          }}
          onStockAdjust={() => {
            setStockAdjustmentItem({
              id: viewProductDetails.id,
              name: viewProductDetails.name,
              current: viewProductDetails.quantity,
              type: 'product',
            })
            setViewProductDetails(null)
          }}
        />
      )}

      {/* Raw Material Create/Edit Modal */}
      {(isCreatingRaw || selectedRawMaterial) && (
        <RawMaterialEditorModal
          material={selectedRawMaterial}
          suppliers={db.suppliers}
          onClose={() => {
            setIsCreatingRaw(false)
            setSelectedRawMaterial(null)
          }}
          onSave={(item) => {
            if (selectedRawMaterial) {
              onSaveDatabase({
                ...db,
                rawMaterials: db.rawMaterials.map((r) => (r.id === item.id ? item : r)),
              })
            } else {
              onSaveDatabase({
                ...db,
                rawMaterials: [item, ...db.rawMaterials],
              })
            }
            setIsCreatingRaw(false)
            setSelectedRawMaterial(null)
          }}
        />
      )}

      {/* Quick Stock Adjustment Modal */}
      {stockAdjustmentItem && (
        <StockAdjustmentModal
          item={stockAdjustmentItem}
          onClose={() => setStockAdjustmentItem(null)}
          onApply={handleApplyStockAdjustment}
        />
      )}

      {/* Category Manager Modal */}
      {isManagingCategories && (
        <CategoryManagerModal
          categories={categories}
          products={db.products}
          onClose={() => setIsManagingCategories(false)}
          onSaveCategories={(updatedCats, updatedProds) => {
            onSaveDatabase({
              ...db,
              categories: updatedCats,
              products: updatedProds || db.products,
            })
          }}
        />
      )}
    </div>
  )
}

/* =========================================================================
   PRODUCT EDITOR MODAL (Add / Edit Product with all requested fields)
========================================================================= */
function ProductEditorModal({
  product,
  categories,
  existingProducts,
  onClose,
  onSave,
  onOpenCategoryManager,
}: {
  product: ProductItem | null
  categories: CategoryItem[]
  existingProducts: ProductItem[]
  onClose: () => void
  onSave: (item: ProductItem) => void
  onOpenCategoryManager: () => void
}) {
  // Required fields
  const [name, setName] = useState(product?.name || '')
  const [sku, setSku] = useState(product?.sku || `AF-${Date.now().toString().slice(-4)}`)

  // Optional fields
  const [category, setCategory] = useState<string>(
    product?.category || categories[0]?.name || 'Mineral Water'
  )
  const [description, setDescription] = useState(product?.description || '')
  const [size, setSize] = useState(product?.size || '')
  const [sizeUnit, setSizeUnit] = useState(product?.sizeUnit || 'ml')
  const [unit, setUnit] = useState(product?.unit || 'Cartons')
  const [quantity, setQuantity] = useState<number>(product?.quantity ?? 100)
  const [reorderLevel, setReorderLevel] = useState<number>(product?.reorderLevel ?? 20)

  // Pricing & Valuation
  const [costPrice, setCostPrice] = useState<number>(product?.costPrice ?? 350)
  const [wholesalePrice, setWholesalePrice] = useState<number>(product?.wholesalePrice ?? 480)
  const [wholesaleMinQty, setWholesaleMinQty] = useState<number>(product?.wholesaleMinQty ?? 12)
  const [retailPrice, setRetailPrice] = useState<number>(product?.retailPrice ?? 600)

  // Total cost auto-calculated vs manual override
  const [isManualTotalCost, setIsManualTotalCost] = useState(product?.isManualTotalCost || false)
  const [manualTotalCost, setManualTotalCost] = useState<number>(
    product?.totalCost !== undefined ? product.totalCost : (product?.quantity || 100) * (product?.costPrice || 350)
  )

  // Product Image
  const [imageUrl, setImageUrl] = useState<string>(product?.imageUrl || '')
  const imageFileInputRef = useRef<HTMLInputElement>(null)

  // Sourcing & Purchase Invoice
  const [isPurchasedProduct, setIsPurchasedProduct] = useState(product?.isPurchasedProduct || false)
  const [purchaseCost, setPurchaseCost] = useState<number>(product?.purchaseCost || product?.costPrice || 0)
  const [purchaseInvoiceImage, setPurchaseInvoiceImage] = useState<string>(product?.purchaseInvoiceImage || '')
  const invoiceFileInputRef = useRef<HTMLInputElement>(null)

  // Validation errors
  const [error, setError] = useState<string | null>(null)

  // Auto calculated total cost
  const calculatedTotalCost = quantity * costPrice
  const finalTotalCost = isManualTotalCost ? manualTotalCost : calculatedTotalCost

  // Handle image upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      setImageUrl(base64)
    } catch (err) {
      console.error('Failed to convert image:', err)
    }
  }

  // Handle invoice image upload
  const handleInvoiceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      setPurchaseInvoiceImage(base64)
    } catch (err) {
      console.error('Failed to convert invoice image:', err)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Product Name is required.')
      return
    }

    if (!sku.trim()) {
      setError('SKU / Code is required.')
      return
    }

    // Check SKU uniqueness (excluding current editing product)
    const duplicate = existingProducts.find(
      (p) => p.sku.toLowerCase() === sku.trim().toLowerCase() && p.id !== product?.id
    )
    if (duplicate) {
      setError(`SKU "${sku}" is already assigned to "${duplicate.name}". Please use a unique SKU.`)
      return
    }

    const now = new Date().toISOString().slice(0, 10)
    const status: Status =
      quantity <= 0 ? 'Out of stock' : quantity <= reorderLevel ? 'Low stock' : 'In stock'

    const saved: ProductItem = {
      id: product?.id || `prod-${Date.now()}`,
      name: name.trim(),
      sku: sku.trim(),
      category: category.trim(),
      description: description.trim() || undefined,
      size: size.trim() || undefined,
      sizeUnit: size.trim() ? sizeUnit : undefined,
      unit: unit.trim() || 'Cartons',
      quantity: Number(quantity) || 0,
      reorderLevel: Number(reorderLevel) || 0,
      costPrice: Number(costPrice) || 0,
      wholesalePrice: Number(wholesalePrice) || 0,
      wholesaleMinQty: wholesaleMinQty ? Number(wholesaleMinQty) : undefined,
      retailPrice: Number(retailPrice) || 0,
      totalCost: Number(finalTotalCost) || 0,
      isManualTotalCost,
      imageUrl: imageUrl || undefined,
      isPurchasedProduct,
      purchaseCost: isPurchasedProduct ? Number(purchaseCost) || Number(costPrice) : undefined,
      purchaseInvoiceImage: isPurchasedProduct ? purchaseInvoiceImage || undefined : undefined,
      status,
      updatedAt: now,
    }

    onSave(saved)
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal large" onSubmit={handleSubmit} id="product-editor-form">
        <div className="editor-header">
          <div>
            <p className="eyebrow">Product Management</p>
            <h2>{product ? `Edit Product: ${product.name}` : 'Add New Product'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-5">
          {/* SECTION 1: ESSENTIAL IDENTIFIERS */}
          <div className="bg-stone-50/80 p-4 rounded-xl border border-stone-200">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#7cb518]" /> 1. Essential Product Information
            </h3>
            <div className="form-grid">
              <label className="col-span-2">
                Product Name *
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Al-Farooq Mineral Water 500ml (24-pack)"
                  required
                  id="input-product-name"
                />
              </label>

              <label>
                SKU / Item Code * <span className="text-[11px] text-stone-400">(Must be unique)</span>
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. AFW-500-24"
                  required
                  id="input-product-sku"
                />
              </label>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="mb-0 text-xs font-semibold text-stone-700">Category *</label>
                  <button
                    type="button"
                    className="text-[11px] text-[#7cb518] hover:underline font-semibold"
                    onClick={onOpenCategoryManager}
                  >
                    + Manage Categories
                  </button>
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                  id="select-product-category"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Size & Size/Unit */}
              <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-stone-200">
                <div>
                  <label className="text-xs font-semibold text-stone-700 mb-1 block">
                    Product Size / Volume <span className="text-[11px] text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="e.g. 500, 1.5, 250, 100, 19"
                    id="input-product-size"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 mb-1 block">
                    Size Unit <span className="text-[11px] text-stone-400 font-normal">(Dropdown)</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={sizeUnit}
                      onChange={(e) => setSizeUnit(e.target.value)}
                      className="border border-stone-200 rounded-lg px-3 py-2 text-xs bg-white text-stone-900 w-full focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                      id="select-product-size-unit"
                    >
                      <option value="ml">ml (Milliliters)</option>
                      <option value="L">L (Liters)</option>
                      <option value="g">g (Grams)</option>
                      <option value="kg">kg (Kilograms)</option>
                      <option value="oz">oz (Ounces)</option>
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="pack">pack</option>
                    </select>
                  </div>
                </div>
              </div>

              <label>
                Packaging / Dispatch Unit *
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                >
                  <option value="Cartons">Cartons</option>
                  <option value="Bottles">Bottles</option>
                  <option value="Packs">Packs</option>
                  <option value="Pcs">Pcs</option>
                  <option value="Jars">Jars</option>
                  <option value="Boxes">Boxes</option>
                  <option value="Bags">Bags</option>
                  <option value="Trays">Trays</option>
                  <option value="Crates">Crates</option>
                </select>
              </label>

              <label>
                Reorder Threshold Limit (Alert)
                <input
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(Number(e.target.value))}
                  placeholder="20"
                />
              </label>

              <label className="col-span-2">
                Description & Specifications <span className="text-[11px] text-stone-400 font-normal">(Optional)</span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 24 x 500ml shrink-wrapped bottles, pure mineral source, shelf life 12 months."
                  id="input-product-desc"
                />
              </label>
            </div>
          </div>

          {/* SECTION 2: STOCK & PRICING TIERS */}
          <div className="bg-stone-50/80 p-4 rounded-xl border border-stone-200">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#7cb518]" /> 2. Stock Quantities & Wholesale Pricing Structure
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <label className="text-xs font-semibold text-stone-700 mb-1 block">
                  Current Stock in Warehouse *
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                  id="input-product-qty"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">Unit: {unit}</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <label className="text-xs font-semibold text-stone-700 mb-1 block">
                  Actual / Base Cost Price (Rs) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  required
                  id="input-product-cost-price"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">Production / Base unit cost</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <label className="text-xs font-semibold text-stone-700 mb-1 block">
                  Retail Selling Price (Rs) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(Number(e.target.value))}
                  required
                  id="input-product-retail-price"
                />
                <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                  Margin: {costPrice > 0 ? `${Math.round(((retailPrice - costPrice) / costPrice) * 100)}%` : '—'}
                </span>
              </div>
            </div>

            {/* Wholesale Price & Minimum Limit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5 bg-white p-3.5 rounded-xl border border-stone-200">
              <div>
                <label className="text-xs font-semibold text-stone-800 mb-1 block">
                  Wholesale Price (Rs) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(Number(e.target.value))}
                  required
                  id="input-product-wholesale-price"
                />
                <span className="text-[11px] text-emerald-700 mt-1 block font-medium">
                  Wholesale Margin: {costPrice > 0 ? `${Math.round(((wholesalePrice - costPrice) / costPrice) * 100)}%` : '—'}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-800 mb-1 block">
                  Wholesale Minimum Quantity Limit <span className="text-[11px] text-stone-400 font-normal">(Threshold)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={wholesaleMinQty}
                  onChange={(e) => setWholesaleMinQty(Number(e.target.value))}
                  placeholder="e.g. 12, 24, 50"
                  id="input-product-wholesale-min-qty"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Applied when order is ≥ {wholesaleMinQty || 1} {unit}
                </span>
              </div>
            </div>

            {/* Total Cost: Auto vs Manual */}
            <div className="mt-3.5 bg-white p-3.5 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-stone-850">
                  Total Valuation: {formatPKR(finalTotalCost)}
                </div>
                <div className="text-[11px] text-stone-500">
                  Auto: {quantity} {unit} × {formatPKR(costPrice)} = {formatPKR(calculatedTotalCost)}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer font-medium select-none">
                  <input
                    type="checkbox"
                    checked={isManualTotalCost}
                    onChange={(e) => {
                      setIsManualTotalCost(e.target.checked)
                      if (!e.target.checked) setManualTotalCost(calculatedTotalCost)
                    }}
                    className="rounded border-stone-300 text-[#7cb518] focus:ring-[#7cb518]"
                  />
                  Manual Total Cost Override
                </label>

                {isManualTotalCost && (
                  <input
                    type="number"
                    min="0"
                    value={manualTotalCost}
                    onChange={(e) => setManualTotalCost(Number(e.target.value))}
                    className="w-32 py-1 px-2 text-xs border border-purple-300 rounded-lg font-bold text-purple-900 bg-purple-50"
                    placeholder="Manual Total"
                  />
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: PRODUCT IMAGE (OFFLINE PERSISTED) */}
          <div className="bg-stone-50/80 p-4 rounded-xl border border-stone-200">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#7cb518]" /> 3. Product Image <span className="text-[11px] text-stone-400 font-normal">(Offline Stored)</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-stone-200">
              <div className="w-24 h-24 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden relative flex-shrink-0">
                {imageUrl ? (
                  <img src={imageUrl} alt="Product Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-stone-300" />
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="text-xs text-stone-700">
                  {imageUrl ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1 justify-center sm:justify-start">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Product photo attached
                    </span>
                  ) : (
                    'Upload high-resolution bottle, packaging or carton photo (saved offline).'
                  )}
                </div>

                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <input
                    type="file"
                    ref={imageFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileChange}
                  />
                  <button
                    type="button"
                    className="button secondary text-xs py-1.5"
                    onClick={() => imageFileInputRef.current?.click()}
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> {imageUrl ? 'Change Image' : 'Select Image File'}
                  </button>
                  {imageUrl && (
                    <button
                      type="button"
                      className="button secondary text-xs py-1.5 text-rose-600 hover:text-rose-700"
                      onClick={() => setImageUrl('')}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: SOURCING & PURCHASE INVOICE */}
          <div className="bg-stone-50/80 p-4 rounded-xl border border-stone-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-[#7cb518]" /> 4. Sourcing & Purchase Invoice Attachment
              </h3>
              <label className="flex items-center gap-2 text-xs font-semibold text-stone-900 cursor-pointer bg-white px-3 py-1 rounded-lg border border-stone-300 select-none">
                <input
                  type="checkbox"
                  checked={isPurchasedProduct}
                  onChange={(e) => setIsPurchasedProduct(e.target.checked)}
                  className="rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                  id="checkbox-is-purchased"
                />
                Product was Purchased / Outsourced (Not manufactured in-house)
              </label>
            </div>

            {isPurchasedProduct ? (
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200/80 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-blue-900 mb-1 block">
                      Purchase Cost from Supplier (Rs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(Number(e.target.value))}
                      placeholder="e.g. 320"
                      className="bg-white"
                      id="input-purchase-cost"
                    />
                    <span className="text-[11px] text-blue-800 mt-1 block">
                      Acquisition cost per unit paid to vendor.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-blue-900 mb-1 block">
                      Attach Purchase Invoice / Receipt Image
                    </label>
                    <input
                      type="file"
                      ref={invoiceFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleInvoiceFileChange}
                    />
                    <button
                      type="button"
                      className="button secondary text-xs w-full py-2 bg-white flex items-center justify-center gap-2"
                      onClick={() => invoiceFileInputRef.current?.click()}
                    >
                      <Receipt className="w-4 h-4 text-blue-600" />
                      {purchaseInvoiceImage ? 'Replace Invoice Image' : 'Upload Purchase Invoice / Bill'}
                    </button>
                  </div>
                </div>

                {purchaseInvoiceImage && (
                  <div className="bg-white p-3 rounded-xl border border-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden border border-stone-200">
                        <img src={purchaseInvoiceImage} alt="Invoice" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">Purchase Invoice Attached</div>
                        <div className="text-[11px] text-emerald-700">Offline document copy verified</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-rose-600 hover:underline font-semibold"
                      onClick={() => setPurchaseInvoiceImage('')}
                    >
                      Remove Invoice
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-500 bg-white p-3 rounded-xl border border-stone-200">
                This SKU is manufactured in-house at the AL FAROOQ FOODS plant using raw materials & production recipes.
              </p>
            )}
          </div>
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary" id="btn-save-product-submit">
            {product ? 'Update Product' : 'Create Product SKU'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* =========================================================================
   PRODUCT DETAILS MODAL / DRAWER
========================================================================= */
function ProductDetailsModal({
  product,
  onClose,
  onEdit,
  onDelete,
  onStockAdjust,
}: {
  product: ProductItem
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onStockAdjust: () => void
}) {
  const isLow = product.quantity <= product.reorderLevel
  const isOut = product.quantity <= 0
  const totalVal = product.totalCost !== undefined ? product.totalCost : product.quantity * product.costPrice
  const retailMarginPct = product.costPrice > 0 ? Math.round(((product.retailPrice - product.costPrice) / product.costPrice) * 100) : 0
  const wholesaleMarginPct = product.costPrice > 0 ? Math.round(((product.wholesalePrice - product.costPrice) / product.costPrice) * 100) : 0

  return (
    <div className="editor-overlay">
      <div className="editor-modal large" id="product-details-modal">
        <div className="editor-header">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-6 h-6 text-[#7cb518]" />
              )}
            </div>
            <div>
              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded mr-2">
                {product.sku}
              </span>
              <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                {product.category}
              </span>
              <h2 className="text-lg font-bold text-gray-900 mt-1">{product.name}</h2>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Main Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="text-[11px] text-gray-500 font-medium">Available Stock</div>
              <div className={`text-lg font-bold ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                {product.quantity} {product.unit}
              </div>
              <div className="text-[10px] text-gray-500">Reorder threshold: {product.reorderLevel}</div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="text-[11px] text-gray-500 font-medium">Cost Price</div>
              <div className="text-lg font-bold text-gray-900">{formatPKR(product.costPrice)}</div>
              <div className="text-[10px] text-gray-500">Base / production rate</div>
            </div>

            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200/70">
              <div className="text-[11px] text-emerald-800 font-medium">Wholesale Rate</div>
              <div className="text-lg font-bold text-[#7cb518]">{formatPKR(product.wholesalePrice)}</div>
              <div className="text-[10px] text-emerald-700">
                Min: {product.wholesaleMinQty || 1} {product.unit} (+{wholesaleMarginPct}%)
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="text-[11px] text-gray-500 font-medium">Retail Rate</div>
              <div className="text-lg font-bold text-gray-900">{formatPKR(product.retailPrice)}</div>
              <div className="text-[10px] text-emerald-700">+{retailMarginPct}% Profit Margin</div>
            </div>
          </div>

          {/* Details & Sourcing Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Product Specifications</h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Size / Volume:</span>
                  <span className="font-semibold text-gray-900">
                    {product.size ? `${product.size} ${product.sizeUnit || ''}` : 'Not Specified'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Packaging Unit:</span>
                  <span className="font-semibold text-gray-900">{product.unit}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Total Stock Value:</span>
                  <span className="font-bold text-gray-900">{formatPKR(totalVal)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Sourcing Origin:</span>
                  <span className="font-semibold text-gray-900">
                    {product.isPurchasedProduct ? 'Purchased (Trading / External)' : 'In-House Plant Manufactured'}
                  </span>
                </div>
              </div>

              {product.description && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
                  <span className="font-semibold text-gray-700 block mb-1">Description:</span>
                  {product.description}
                </div>
              )}
            </div>

            {/* Image / Invoice Preview */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Attached Media & Invoices</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 text-center">
                  <div className="text-[11px] font-semibold text-gray-600 mb-1">Product Photo</div>
                  <div className="w-full h-28 rounded bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[11px] text-gray-400">No Image</span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 text-center">
                  <div className="text-[11px] font-semibold text-gray-600 mb-1">Purchase Invoice</div>
                  <div className="w-full h-28 rounded bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
                    {product.purchaseInvoiceImage ? (
                      <img src={product.purchaseInvoiceImage} alt="Invoice" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[11px] text-gray-400">No Invoice Attached</span>
                    )}
                  </div>
                </div>
              </div>

              {product.isPurchasedProduct && product.purchaseCost && (
                <div className="text-xs text-blue-800 bg-blue-50 p-2 rounded border border-blue-200">
                  Supplier Purchase Cost: <strong>{formatPKR(product.purchaseCost)}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="editor-actions justify-between">
          <button
            type="button"
            className="button secondary text-rose-600 hover:text-rose-700"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" /> Delete Product
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="button secondary"
              onClick={onStockAdjust}
            >
              <ArrowUpCircle className="w-4 h-4" /> Adjust Stock
            </button>
            <button
              type="button"
              className="button primary"
              onClick={onEdit}
            >
              <Edit className="w-4 h-4" /> Edit Product
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   CATEGORY MANAGER MODAL (Add, Edit, Delete Categories with real product counts)
========================================================================= */
function CategoryManagerModal({
  categories,
  products,
  onClose,
  onSaveCategories,
}: {
  categories: CategoryItem[]
  products: ProductItem[]
  onClose: () => void
  onSaveCategories: (cats: CategoryItem[], updatedProducts?: ProductItem[]) => void
}) {
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [catName, setCatName] = useState('')
  const [catDesc, setCatDesc] = useState('')
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Compute product count per category
  const counts: Record<string, number> = {}
  products.forEach((p) => {
    counts[p.category] = (counts[p.category] || 0) + 1
  })

  // Start edit
  const handleStartEdit = (cat: CategoryItem) => {
    setEditingCatId(cat.id)
    setCatName(cat.name)
    setCatDesc(cat.description || '')
    setIsAddingNew(false)
    setError(null)
  }

  // Save new / edited category
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!catName.trim()) {
      setError('Please enter a category name.')
      return
    }

    if (isAddingNew) {
      // Check duplicate name
      if (categories.some((c) => c.name.toLowerCase() === catName.trim().toLowerCase())) {
        setError('A category with this name already exists.')
        return
      }
      const newCat: CategoryItem = {
        id: `cat-${Date.now()}`,
        name: catName.trim(),
        description: catDesc.trim() || undefined,
        createdAt: new Date().toISOString().slice(0, 10),
      }
      onSaveCategories([...categories, newCat])
      setIsAddingNew(false)
      setCatName('')
      setCatDesc('')
    } else if (editingCatId) {
      const oldCat = categories.find((c) => c.id === editingCatId)
      if (!oldCat) return

      const oldName = oldCat.name
      const newName = catName.trim()

      if (
        oldName.toLowerCase() !== newName.toLowerCase() &&
        categories.some((c) => c.name.toLowerCase() === newName.toLowerCase())
      ) {
        setError('Another category with this name already exists.')
        return
      }

      const updatedCats = categories.map((c) =>
        c.id === editingCatId ? { ...c, name: newName, description: catDesc.trim() || undefined } : c
      )

      // Also update products if category name changed
      let updatedProds = products
      if (oldName !== newName) {
        updatedProds = products.map((p) => (p.category === oldName ? { ...p, category: newName } : p))
      }

      onSaveCategories(updatedCats, updatedProds)
      setEditingCatId(null)
      setCatName('')
      setCatDesc('')
    }
  }

  // Delete category
  const handleDeleteCategory = (cat: CategoryItem) => {
    const pCount = counts[cat.name] || 0
    if (categories.length <= 1) {
      alert('You must keep at least one category in the database.')
      return
    }

    if (pCount > 0) {
      const proceed = window.confirm(
        `Category "${cat.name}" is currently assigned to ${pCount} product(s).\n\nIf you delete this category, these products will be reassigned to "General". Do you want to proceed?`
      )
      if (!proceed) return
    } else {
      if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return
    }

    const fallbackCat = categories.find((c) => c.id !== cat.id)?.name || 'General'
    const updatedCats = categories.filter((c) => c.id !== cat.id)
    const updatedProds = products.map((p) => (p.category === cat.name ? { ...p, category: fallbackCat } : p))

    onSaveCategories(updatedCats, updatedProds)
  }

  return (
    <div className="editor-overlay">
      <div className="editor-modal" id="category-manager-modal" style={{ maxWidth: '560px' }}>
        {/* Header */}
        <div className="editor-header">
          <div>
            <p className="eyebrow">Product Catalog</p>
            <h2 className="text-lg font-bold text-stone-900">Manage Categories</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Create, rename, and organize categories for your finished products.
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Add / Edit Form Box */}
        {isAddingNew || editingCatId ? (
          <form
            onSubmit={handleSaveCategory}
            className="bg-stone-50 border border-stone-200 p-4 rounded-xl mb-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                {isAddingNew ? 'New Category' : 'Edit Category'}
              </span>
              <button
                type="button"
                className="text-xs text-stone-400 hover:text-stone-700"
                onClick={() => {
                  setIsAddingNew(false)
                  setEditingCatId(null)
                  setError(null)
                }}
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">
                Category Name *
              </label>
              <input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Mineral Water, Juices, Confectionery"
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">
                Description / Notes <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Brief description or packaging notes"
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7cb518]/20 focus:border-[#7cb518]"
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
              <button type="submit" className="button primary text-xs py-1.5 px-4">
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
              <p className="text-[11px] text-stone-500">Available in product creation dropdowns</p>
            </div>
            <button
              type="button"
              className="button primary text-xs py-1.5 px-3"
              onClick={() => {
                setIsAddingNew(true)
                setCatName('')
                setCatDesc('')
                setError(null)
              }}
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
              return (
                <div
                  key={c.id}
                  className="p-3.5 flex items-center justify-between hover:bg-stone-50/80 transition-colors"
                >
                  <div className="pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-stone-900">{c.name}</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-md border border-emerald-200/50">
                        {count} {count === 1 ? 'product' : 'products'}
                      </span>
                    </div>
                    {c.description && (
                      <p className="text-[11px] text-stone-500 mt-0.5">{c.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="p-1.5 text-stone-500 hover:text-blue-600 rounded-md hover:bg-stone-100 transition-colors"
                      title="Edit Category Name"
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

        <div className="editor-actions mt-5">
          <button type="button" className="button secondary w-full py-2 text-xs" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   RAW MATERIAL EDITOR MODAL
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
  const [sku, setSku] = useState(material?.sku || `RAW-${Date.now().toString().slice(-4)}`)
  const [name, setName] = useState(material?.name || '')
  const [category, setCategory] = useState<RawMaterialCategory>(material?.category || 'Ingredients')
  const [unit, setUnit] = useState(material?.unit || 'Kg')
  const [quantity, setQuantity] = useState(material?.quantity || 500)
  const [reorderLevel, setReorderLevel] = useState(material?.reorderLevel || 100)
  const [unitCost, setUnitCost] = useState(material?.unitCost || 150)
  const [supplierId, setSupplierId] = useState(material?.supplierId || suppliers[0]?.id || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const supp = suppliers.find((s) => s.id === supplierId)
    const now = new Date().toISOString().slice(0, 10)
    const status: Status = quantity <= 0 ? 'Out of stock' : quantity <= reorderLevel ? 'Low stock' : 'In stock'

    const saved: RawMaterialItem = {
      id: material?.id || `raw-${Date.now()}`,
      sku,
      name,
      category,
      unit,
      quantity,
      reorderLevel,
      unitCost,
      supplierId,
      supplierName: supp?.name || '',
      status,
      updatedAt: now,
    }
    onSave(saved)
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Factory Raw Materials</p>
            <h2>{material ? 'Edit Raw Material' : 'Add New Raw Material'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="form-grid">
          <label>
            SKU Code *
            <input value={sku} onChange={(e) => setSku(e.target.value)} required />
          </label>

          <label>
            Raw Material Name *
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Refined Sugar" required />
          </label>

          <label>
            Category *
            <select value={category} onChange={(e) => setCategory(e.target.value as any)}>
              <option value="Ingredients">Ingredients</option>
              <option value="Packaging">Packaging (Preforms, Caps, Boxes)</option>
              <option value="Flavors">Flavor & Concentrate</option>
              <option value="Chemicals & Minerals">Chemicals & Minerals</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label>
            Measurement Unit *
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. Kg, Pieces, Liters, Bags" required />
          </label>

          <label>
            Stock Quantity
            <input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </label>

          <label>
            Reorder Alert Threshold
            <input type="number" min="1" value={reorderLevel} onChange={(e) => setReorderLevel(Number(e.target.value))} />
          </label>

          <label>
            Purchase Unit Cost (Rs)
            <input type="number" min="0" step="any" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} />
          </label>

          <label>
            Primary Supplier
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Save Material
          </button>
        </div>
      </form>
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
  item: { id: string; name: string; current: number; type: 'product' | 'raw' }
  onClose: () => void
  onApply: (delta: number, reason: string) => void
}) {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add')
  const [qty, setQty] = useState(10)
  const [reason, setReason] = useState('Manual physical count adjustment / audit')

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
            <p className="eyebrow">Warehouse Adjustment</p>
            <h2>Adjust Stock: {item.name}</h2>
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
            <select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value as any)}>
              <option value="add">Add Inflow Stock (+ In)</option>
              <option value="remove">Deduct Stock / Damaged (- Out)</option>
            </select>
          </label>

          <label>
            Quantity
            <input type="number" min="1" value={qty} onChange={(e) => setQty(Number(e.target.value))} required />
          </label>

          <label>
            Reason / Reference Note
            <input value={reason} onChange={(e) => setReason(e.target.value)} required />
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
