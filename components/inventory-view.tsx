'use client'

import { useState } from 'react'
import { Plus, Search, Package, Boxes, AlertTriangle, Edit, Trash2, ArrowDownCircle, ArrowUpCircle, X, Download, FileText } from 'lucide-react'
import { formatPKR, formatDate, type AppDatabase, type ProductItem, type RawMaterialItem, type ProductCategory, type RawMaterialCategory, type Status } from '@/lib/db'
import { exportToCSV, generateStockReportPDF } from '@/lib/pdf-export'

interface InventoryViewProps {
  db: AppDatabase
  activeSubView: 'products' | 'raw-materials' | 'stock'
  onSaveDatabase: (updated: AppDatabase) => void
}

export default function InventoryView({ db, activeSubView, onSaveDatabase }: InventoryViewProps) {
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null)
  const [selectedRawMaterial, setSelectedRawMaterial] = useState<RawMaterialItem | null>(null)
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)
  const [isCreatingRaw, setIsCreatingRaw] = useState(false)
  const [stockAdjustmentItem, setStockAdjustmentItem] = useState<{ id: string; name: string; current: number; type: 'product' | 'raw' } | null>(null)

  // Products filter
  const filteredProducts = db.products.filter((p) => {
    const matchQ = p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase())
    const matchCat = categoryFilter === 'All' || p.category === categoryFilter
    return matchQ && matchCat
  })

  // Raw materials filter
  const filteredRaw = db.rawMaterials.filter((r) => {
    const matchQ = r.name.toLowerCase().includes(query.toLowerCase()) || r.sku.toLowerCase().includes(query.toLowerCase())
    const matchCat = categoryFilter === 'All' || r.category === categoryFilter
    return matchQ && matchCat
  })

  // Export CSV helpers
  const exportProductsCSV = () => {
    const headers = ['SKU', 'Product Name', 'Category', 'Unit', 'Stock Qty', 'Cost Price (Rs)', 'Wholesale Price (Rs)', 'Retail Price (Rs)', 'Stock Value (Rs)', 'Status']
    const rows = db.products.map((p) => [
      p.sku,
      p.name,
      p.category,
      p.unit,
      p.quantity,
      p.costPrice,
      p.wholesalePrice,
      p.retailPrice,
      p.quantity * p.costPrice,
      p.status,
    ])
    exportToCSV(`Finished_Products_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  const exportRawCSV = () => {
    const headers = ['SKU', 'Material Name', 'Category', 'Stock Qty', 'Unit', 'Unit Cost (Rs)', 'Total Value (Rs)', 'Supplier', 'Status']
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
  const handleDeleteProduct = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return
    onSaveDatabase({ ...db, products: db.products.filter((p) => p.id !== id) })
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
          return {
            ...p,
            quantity: newQty,
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

  return (
    <div className="page-stack">
      {/* Heading */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">Inventory & Warehousing</p>
          <h1>
            {activeSubView === 'products'
              ? 'Finished Goods Inventory'
              : activeSubView === 'raw-materials'
              ? 'Raw Materials Management'
              : 'Warehouse Stock In & Out'}
          </h1>
          <p className="subheading">
            {activeSubView === 'products'
              ? 'Bottled mineral water, fruit juices, candy, toffee & snack packs ready for dispatch.'
              : activeSubView === 'raw-materials'
              ? 'Sugar, concentrates, packaging boxes, PET preforms, and flavorings.'
              : 'Comprehensive inventory ledger, low-stock reorder triggers, and manual batch adjustments.'}
          </p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={() => generateStockReportPDF(db.products, db.rawMaterials)}>
            <FileText /> Stock PDF
          </button>
          {activeSubView === 'products' && (
            <>
              <button className="button secondary" onClick={exportProductsCSV}>
                <Download /> CSV
              </button>
              <button className="button primary" onClick={() => setIsCreatingProduct(true)}>
                <Plus /> Add Product SKU
              </button>
            </>
          )}
          {activeSubView === 'raw-materials' && (
            <>
              <button className="button secondary" onClick={exportRawCSV}>
                <Download /> CSV
              </button>
              <button className="button primary" onClick={() => setIsCreatingRaw(true)}>
                <Plus /> Add Raw Material
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Finished Product Stock Value</div>
          <strong>
            {formatPKR(db.products.reduce((sum, p) => sum + p.quantity * p.costPrice, 0))}
          </strong>
          <span className="stat-change text-emerald-700">{db.products.length} registered SKUs</span>
        </div>

        <div className="stat-card">
          <div className="stat-label">Raw Material Inventory Value</div>
          <strong>
            {formatPKR(db.rawMaterials.reduce((sum, r) => sum + r.quantity * r.unitCost, 0))}
          </strong>
          <span className="stat-change text-purple-700">{db.rawMaterials.length} essential materials</span>
        </div>

        <div className="stat-card">
          <div className="stat-label">Critical Low Stock SKUs</div>
          <strong className="text-amber-700">
            {db.products.filter((p) => p.quantity <= p.reorderLevel).length +
              db.rawMaterials.filter((r) => r.quantity <= r.reorderLevel).length}
          </strong>
          <span className="stat-change text-amber-700">Below plant reorder safety limit</span>
        </div>

        <div className="stat-card">
          <div className="stat-label">Factory Stock Status</div>
          <strong className="text-emerald-700">Operational</strong>
          <span className="stat-change">Real-time sync verified</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="module-toolbar">
        <div className="flex items-center gap-3">
          <div className="search-box">
            <Search />
            <input
              placeholder="Search by name or SKU..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-[var(--border)] rounded-md px-3 py-1.5 text-xs bg-white"
          >
            <option value="All">All Categories</option>
            {activeSubView === 'products' || activeSubView === 'stock' ? (
              <>
                <option value="Mineral Water">Mineral Water</option>
                <option value="Fruit Juice">Fruit Juice</option>
                <option value="Candy & Toffee">Candy & Toffee</option>
                <option value="Potato Chips">Potato Chips</option>
                <option value="Snacks">Snacks</option>
              </>
            ) : (
              <>
                <option value="Ingredients">Ingredients</option>
                <option value="Packaging">Packaging</option>
                <option value="Flavor & Concentrate">Flavor & Concentrate</option>
                <option value="Chemicals & Minerals">Chemicals & Minerals</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* VIEW: FINISHED PRODUCTS */}
      {activeSubView === 'products' && (
        <div className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product SKU & Name</th>
                  <th>Category</th>
                  <th>Available Stock</th>
                  <th>Cost Price</th>
                  <th>Wholesale Rate</th>
                  <th>Retail Rate</th>
                  <th>Total Stock Value</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#7cb518]" />
                        <div>
                          <div className="font-bold text-gray-900">{p.name}</div>
                          <div className="text-[11px] text-gray-500 font-mono">{p.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">{p.category}</span>
                    </td>
                    <td>
                      <span className="font-bold text-gray-900">
                        {p.quantity} {p.unit}
                      </span>
                      {p.quantity <= p.reorderLevel && (
                        <span className="text-[10px] text-amber-600 font-bold block">Reorder at {p.reorderLevel}</span>
                      )}
                    </td>
                    <td>{formatPKR(p.costPrice)}</td>
                    <td className="font-semibold text-[#7cb518]">{formatPKR(p.wholesalePrice)}</td>
                    <td className="font-semibold text-gray-800">{formatPKR(p.retailPrice)}</td>
                    <td className="font-bold text-gray-900">{formatPKR(p.quantity * p.costPrice)}</td>
                    <td>
                      <span
                        className={
                          p.status === 'In stock'
                            ? 'status status-success'
                            : p.status === 'Low stock'
                            ? 'status status-warning'
                            : 'status status-danger'
                        }
                      >
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="row-action text-[#7cb518]"
                          title="Quick Stock Adjust"
                          onClick={() => setStockAdjustmentItem({ id: p.id, name: p.name, current: p.quantity, type: 'product' })}
                        >
                          <ArrowUpCircle />
                        </button>
                        <button className="row-action" title="Edit product" onClick={() => setSelectedProduct(p)}>
                          <Edit />
                        </button>
                        <button className="row-action danger" title="Delete product" onClick={() => handleDeleteProduct(p.id)}>
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

      {/* VIEW: RAW MATERIALS */}
      {activeSubView === 'raw-materials' && (
        <div className="panel table-panel">
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
                        <span className="text-[10px] text-amber-600 font-bold block">Low threshold: {r.reorderLevel} {r.unit}</span>
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
                          onClick={() => setStockAdjustmentItem({ id: r.id, name: r.name, current: r.quantity, type: 'raw' })}
                        >
                          <ArrowUpCircle />
                        </button>
                        <button className="row-action" title="Edit material" onClick={() => setSelectedRawMaterial(r)}>
                          <Edit />
                        </button>
                        <button className="row-action danger" title="Delete material" onClick={() => handleDeleteRaw(r.id)}>
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
        <div className="space-y-6">
          <div className="panel">
            <div className="panel-heading mb-3">
              <div>
                <h2>Finished Goods Stock Register</h2>
                <p>Real-time count of completed manufacturing inventory</p>
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
                      <td className="font-semibold text-gray-900">{p.name}</td>
                      <td>{p.category}</td>
                      <td className="font-bold text-gray-900">
                        {p.quantity} {p.unit}
                      </td>
                      <td className="text-gray-500">{p.reorderLevel} {p.unit}</td>
                      <td className="font-bold">{formatPKR(p.quantity * p.costPrice)}</td>
                      <td>
                        <span className={p.quantity <= p.reorderLevel ? 'status status-warning' : 'status status-success'}>
                          {p.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          className="button secondary text-xs py-1 h-auto"
                          onClick={() => setStockAdjustmentItem({ id: p.id, name: p.name, current: p.quantity, type: 'product' })}
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
                      <td className="text-gray-500">{r.reorderLevel} {r.unit}</td>
                      <td className="font-bold">{formatPKR(r.quantity * r.unitCost)}</td>
                      <td>
                        <span className={r.quantity <= r.reorderLevel ? 'status status-warning' : 'status status-success'}>
                          {r.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          className="button secondary text-xs py-1 h-auto"
                          onClick={() => setStockAdjustmentItem({ id: r.id, name: r.name, current: r.quantity, type: 'raw' })}
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
    </div>
  )
}

function ProductEditorModal({
  product,
  onClose,
  onSave,
}: {
  product: ProductItem | null
  onClose: () => void
  onSave: (item: ProductItem) => void
}) {
  const [sku, setSku] = useState(product?.sku || `PROD-${Date.now().toString().slice(-4)}`)
  const [name, setName] = useState(product?.name || '')
  const [category, setCategory] = useState<ProductCategory>(product?.category || 'Mineral Water')
  const [unit, setUnit] = useState(product?.unit || 'Cartons (24x500ml)')
  const [quantity, setQuantity] = useState(product?.quantity || 100)
  const [reorderLevel, setReorderLevel] = useState(product?.reorderLevel || 20)
  const [costPrice, setCostPrice] = useState(product?.costPrice || 350)
  const [wholesalePrice, setWholesalePrice] = useState(product?.wholesalePrice || 480)
  const [retailPrice, setRetailPrice] = useState(product?.retailPrice || 600)
  const [description, setDescription] = useState(product?.description || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const now = new Date().toISOString().slice(0, 10)
    const status: Status = quantity <= 0 ? 'Out of stock' : quantity <= reorderLevel ? 'Low stock' : 'In stock'

    const saved: ProductItem = {
      id: product?.id || `prod-${Date.now()}`,
      sku,
      name,
      category,
      unit,
      quantity,
      reorderLevel,
      costPrice,
      wholesalePrice,
      retailPrice,
      status,
      description,
      updatedAt: now,
    }
    onSave(saved)
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Finished Goods</p>
            <h2>{product ? 'Edit Finished Product' : 'Add New Finished Product SKU'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="form-grid">
          <label>
            SKU / Item Code *
            <input value={sku} onChange={(e) => setSku(e.target.value)} required />
          </label>

          <label>
            Product Name *
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mineral Water 500ml" required />
          </label>

          <label>
            Category *
            <select value={category} onChange={(e) => setCategory(e.target.value as any)}>
              <option value="Mineral Water">Mineral Water</option>
              <option value="Fruit Juice">Fruit Juice</option>
              <option value="Candy & Toffee">Candy & Toffee</option>
              <option value="Potato Chips">Potato Chips</option>
              <option value="Snacks">Snacks</option>
            </select>
          </label>

          <label>
            Unit Packing *
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. Cartons (24 bottles)" required />
          </label>

          <label>
            Initial Stock Quantity
            <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </label>

          <label>
            Reorder Level (Alert)
            <input type="number" min="1" value={reorderLevel} onChange={(e) => setReorderLevel(Number(e.target.value))} />
          </label>

          <label>
            Unit Cost Price (Rs)
            <input type="number" min="0" value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} />
          </label>

          <label>
            Wholesale / Distributor Rate (Rs) *
            <input type="number" min="0" value={wholesalePrice} onChange={(e) => setWholesalePrice(Number(e.target.value))} required />
          </label>

          <label>
            Retail Rate (Rs) *
            <input type="number" min="0" value={retailPrice} onChange={(e) => setRetailPrice(Number(e.target.value))} required />
          </label>

          <label className="col-span-2">
            Description & Formulation Notes
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Bottle size, shelf life, specifications" />
          </label>
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Save Product
          </button>
        </div>
      </form>
    </div>
  )
}

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
            <X />
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
              <option value="Flavor & Concentrate">Flavor & Concentrate</option>
              <option value="Chemicals & Minerals">Chemicals & Minerals</option>
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
            <X />
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
