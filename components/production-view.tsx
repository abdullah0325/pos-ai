'use client'

import { confirmAction } from '@/lib/confirmation'

import ModuleHeading from './module-heading'

import { useState } from 'react'
import { Plus, Factory, CheckCircle2, Clock, AlertCircle, ArrowRight, Boxes, Package, Trash2, X, Download } from 'lucide-react'
import { formatPKR, formatDate, type AppDatabase, type ProductionRun, type ProductionConsumedItem, type Status } from '@/lib/db'
import { exportToCSV } from '@/lib/pdf-export'

interface ProductionViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
}

// Preset Recipe Templates for AL FAROOQ FOODS manufacturing
const DEFAULT_RECIPES: Record<string, { materialSku: string; qtyPerBatch100: number }[]> = {
  'prod-1': [ // Mineral Water 500ml (24-pack)
    { materialSku: 'RAW-MIN-01', qtyPerBatch100: 2 }, // 2kg RO Minerals
    { materialSku: 'RAW-PET-500', qtyPerBatch100: 2400 }, // 2400 Preforms
    { materialSku: 'RAW-CAP-28', qtyPerBatch100: 2400 }, // 2400 Caps
    { materialSku: 'RAW-LBL-500', qtyPerBatch100: 2400 }, // 2400 Labels
    { materialSku: 'RAW-BOX-WTR', qtyPerBatch100: 100 }, // 100 Cartons
  ],
  'prod-2': [ // Mineral Water 1.5L (12-pack)
    { materialSku: 'RAW-MIN-01', qtyPerBatch100: 1.5 },
    { materialSku: 'RAW-PET-1500', qtyPerBatch100: 1200 },
    { materialSku: 'RAW-CAP-28', qtyPerBatch100: 1200 },
    { materialSku: 'RAW-BOX-WTR', qtyPerBatch100: 100 },
  ],
  'prod-5': [ // Chaunsa Mango Nectar 250ml (24-pack)
    { materialSku: 'RAW-MNG-02', qtyPerBatch100: 120 }, // 120kg Mango Pulp
    { materialSku: 'RAW-SGR-01', qtyPerBatch100: 90 }, // 90kg Sugar
    { materialSku: 'RAW-CIT-01', qtyPerBatch100: 2.5 }, // 2.5kg Citric Acid
    { materialSku: 'RAW-PET-500', qtyPerBatch100: 2400 },
    { materialSku: 'RAW-CAP-28', qtyPerBatch100: 2400 },
    { materialSku: 'RAW-BOX-JCE', qtyPerBatch100: 100 },
  ],
  'prod-6': [ // Apple Juice 250ml (24-pack)
    { materialSku: 'RAW-APL-03', qtyPerBatch100: 80 }, // 80kg Apple Concentrate
    { materialSku: 'RAW-SGR-01', qtyPerBatch100: 85 },
    { materialSku: 'RAW-CIT-01', qtyPerBatch100: 2 },
    { materialSku: 'RAW-PET-500', qtyPerBatch100: 2400 },
    { materialSku: 'RAW-CAP-28', qtyPerBatch100: 2400 },
    { materialSku: 'RAW-BOX-JCE', qtyPerBatch100: 100 },
  ],
  'prod-10': [ // Potato Chips Salted 40g (30-pack)
    { materialSku: 'RAW-POT-01', qtyPerBatch100: 150 }, // 150kg Potato slices
    { materialSku: 'RAW-OIL-01', qtyPerBatch100: 60 }, // 60L Oil
  ],
  'prod-11': [ // Masala Crinkle Chips 40g (30-pack)
    { materialSku: 'RAW-POT-01', qtyPerBatch100: 150 },
    { materialSku: 'RAW-OIL-01', qtyPerBatch100: 60 },
    { materialSku: 'RAW-MSL-01', qtyPerBatch100: 15 }, // 15kg Seasoning
  ],
}

export default function ProductionView({ db, onSaveDatabase }: ProductionViewProps) {
  const [showRunModal, setShowRunModal] = useState(false)
  const [selectedRun, setSelectedRun] = useState<ProductionRun | null>(null)

  // Total completed production batches
  const completedRuns = db.productionRuns.filter((r) => r.status === 'Completed')
  const totalProducedUnits = completedRuns.reduce((sum, r) => sum + r.targetQuantity, 0)
  const totalProductionSpend = completedRuns.reduce((sum, r) => sum + r.totalProductionCost, 0)

  const handleExportCSV = () => {
    const headers = ['Batch #', 'Date', 'Product', 'Target Qty', 'Unit', 'Total Cost (Rs)', 'Unit Cost (Rs)', 'Status', 'Supervisor']
    const rows = db.productionRuns.map((r) => [
      r.batchNumber,
      formatDate(r.date),
      r.productName,
      r.targetQuantity,
      r.unit,
      r.totalProductionCost,
      r.unitCost.toFixed(1),
      r.status,
      r.supervisor,
    ])
    exportToCSV(`Production_Batches_AL_FAROOQ_FOODS_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  const handleDeleteRun = async (id: string) => {
    if (!await confirmAction('Delete this production run record? Note: This will not automatically reverse stock.')) return
    const updatedRuns = db.productionRuns.filter((r) => r.id !== id)
    onSaveDatabase({ ...db, productionRuns: updatedRuns })
  }

  return (
    <div className="page-stack">
      <ModuleHeading icon="production">
        <div>
          <p className="eyebrow">Manufacturing Core / Factory Runs</p>
          <h1>Production Management</h1>
          <p className="subheading">
            Connective engine: Raw Material Consumption → Production Batch → Automatic Finished Goods Stock Inflow.
          </p>
        </div>
        <div className="heading-actions">
          <button data-ui="button" className="button secondary" onClick={handleExportCSV}>
            <Download /> Export CSV
          </button>
          <button data-ui="button" className="button primary" onClick={() => setShowRunModal(true)}>
            <Plus /> Launch Production Run
          </button>
        </div>
      </ModuleHeading>

      {/* Production KPIs */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon olive"><Package aria-hidden="true" /></div>
          <div className="stat-label">Finished Goods Produced</div>
          <strong>{totalProducedUnits.toLocaleString()} Cartons/Units</strong>
          <span className="stat-change text-emerald-700">From {completedRuns.length} completed plant batches</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue"><Factory aria-hidden="true" /></div>
          <div className="stat-label">Total Manufacturing Spend</div>
          <strong>{formatPKR(totalProductionSpend)}</strong>
          <span className="stat-change">Includes raw materials, labor & power</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange"><Clock aria-hidden="true" /></div>
          <div className="stat-label">Active / In-Progress Batches</div>
          <strong>{db.productionRuns.filter((r) => r.status === 'In production').length} Line Runs</strong>
          <span className="stat-change text-purple-700">Currently on bottling/frying floor</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple"><Boxes aria-hidden="true" /></div>
          <div className="stat-label">Raw Material Consumption Sync</div>
          <strong className="text-emerald-700">100% Automated</strong>
          <span className="stat-change">Real-time inventory deduction</span>
        </div>
      </div>

      {/* Production Run Table */}
      <div className="panel table-panel">
        <div className="table-scroll">
          <table data-ui="table">
            <thead>
              <tr>
                <th>Batch #</th>
                <th>Date</th>
                <th>Finished Product</th>
                <th>Batch Quantity</th>
                <th>Raw Materials Consumed</th>
                <th>Total Batch Cost</th>
                <th>Unit Cost</th>
                <th>Status</th>
                <th>Supervisor</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {db.productionRuns.map((run) => (
                <tr key={run.id}>
                  <td>
                    <div className="flex items-center gap-2 font-bold text-gray-800">
                      <Factory className="w-4 h-4 text-[#7cb518]" />
                      <span>{run.batchNumber}</span>
                    </div>
                  </td>
                  <td>{formatDate(run.date)}</td>
                  <td className="font-semibold text-gray-900">{run.productName}</td>
                  <td>
                    <span className="font-bold text-gray-800">
                      {run.targetQuantity} {run.unit}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium">
                      {run.consumedMaterials.length} items consumed
                    </span>
                  </td>
                  <td className="font-bold text-gray-900">{formatPKR(run.totalProductionCost)}</td>
                  <td className="text-[#7cb518] font-bold">{formatPKR(run.unitCost)} / {run.unit.replace(/s$/, '')}</td>
                  <td>
                    <span
                      className={
                        run.status === 'Completed'
                          ? 'status status-success'
                          : run.status === 'In production'
                          ? 'status status-purple'
                          : 'status status-warning'
                      }
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="text-gray-500 text-xs">{run.supervisor}</td>
                  <td>
                    <div className="row-actions">
                      <button data-ui="button" className="row-action" title="View Bill of Materials" onClick={() => setSelectedRun(run)}>
                        <Boxes />
                      </button>
                      <button data-ui="button" className="row-action danger" title="Delete run" onClick={() => handleDeleteRun(run.id)}>
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

      {/* Production Run Detail Modal */}
      {selectedRun && (
        <div className="editor-overlay">
          <div className="editor-modal large">
            <div className="editor-header">
              <div>
                <p className="eyebrow">Production Batch Details</p>
                <h2>{selectedRun.batchNumber}</h2>
              </div>
              <button data-ui="button" className="icon-button" onClick={() => setSelectedRun(null)}>
                <X />
              </button>
            </div>

            <div data-ui="surface" className="gradient-card bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-xs">
              <div>
                <span className="text-gray-500 block">Finished Product</span>
                <strong className="text-sm text-gray-900">{selectedRun.productName}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Batch Output</span>
                <strong className="text-sm text-gray-900">
                  {selectedRun.targetQuantity} {selectedRun.unit}
                </strong>
              </div>
              <div>
                <span className="text-gray-500 block">Unit Manufacturing Cost</span>
                <strong className="text-sm text-[#7cb518]">{formatPKR(selectedRun.unitCost)} / {selectedRun.unit}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Supervisor</span>
                <strong className="text-sm text-gray-900">{selectedRun.supervisor}</strong>
              </div>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Consumed Raw Materials (BOM)</h3>
            <div className="table-scroll border border-gray-200 rounded-lg mb-4">
              <table data-ui="table" className="w-full text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th>#</th>
                    <th>Raw Material</th>
                    <th>Quantity Consumed</th>
                    <th>Unit Rate</th>
                    <th>Total Material Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRun.consumedMaterials.map((mat, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td className="font-medium text-gray-900">{mat.name}</td>
                      <td>
                        {mat.quantity} {mat.unit}
                      </td>
                      <td>{formatPKR(mat.unitCost)}</td>
                      <td className="font-bold text-gray-900">{formatPKR(mat.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1.5 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Total Raw Material Cost:</span>
                <span className="font-semibold">
                  {formatPKR(selectedRun.consumedMaterials.reduce((s, m) => s + m.totalCost, 0))}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Plant Labor & Wages:</span>
                <span className="font-semibold">{formatPKR(selectedRun.laborCost)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Electricity & Factory Overhead:</span>
                <span className="font-semibold">{formatPKR(selectedRun.overheadCost)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-300 pt-1.5">
                <span>Total Production Cost:</span>
                <span className="text-[#7cb518]">{formatPKR(selectedRun.totalProductionCost)}</span>
              </div>
            </div>

            {selectedRun.notes && (
              <p className="text-xs text-gray-500 bg-white p-3 border border-gray-200 rounded-md">
                <strong>QA / Line Notes:</strong> {selectedRun.notes}
              </p>
            )}

            <div className="editor-actions">
              <button data-ui="button" className="button primary" onClick={() => setSelectedRun(null)}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Launch Production Run Modal */}
      {showRunModal && (
        <LaunchProductionModal db={db} onClose={() => setShowRunModal(false)} onSaveDatabase={onSaveDatabase} />
      )}
    </div>
  )
}

function LaunchProductionModal({
  db,
  onClose,
  onSaveDatabase,
}: {
  db: AppDatabase
  onClose: () => void
  onSaveDatabase: (updated: AppDatabase) => void
}) {
  const [productId, setProductId] = useState(db.products[0]?.id || '')
  const [targetQuantity, setTargetQuantity] = useState(100)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [supervisor, setSupervisor] = useState('Engr. Sanaullah')
  const [laborCost, setLaborCost] = useState(6000)
  const [overheadCost, setOverheadCost] = useState(3000)
  const [notes, setNotes] = useState('Line inspection verified. Refractometer Brix test passed.')

  const selectedProduct = db.products.find((p) => p.id === productId)

  // Derive initial materials from recipe
  const [consumedMaterials, setConsumedMaterials] = useState<ProductionConsumedItem[]>(() => {
    return buildRecipeMaterials(db, productId, targetQuantity)
  })

  // Whenever product or target quantity changes, update recipe materials
  const handleProductSelect = (pId: string) => {
    setProductId(pId)
    setConsumedMaterials(buildRecipeMaterials(db, pId, targetQuantity))
  }

  const handleQtyChange = (qty: number) => {
    const validQty = Math.max(1, qty)
    setTargetQuantity(validQty)
    setConsumedMaterials(buildRecipeMaterials(db, productId, validQty))
  }

  function buildRecipeMaterials(database: AppDatabase, pId: string, batchQty: number): ProductionConsumedItem[] {
    const recipe = DEFAULT_RECIPES[pId]
    if (!recipe) {
      // Default: consume sugar or packaging if available
      return database.rawMaterials.slice(0, 3).map((r) => ({
        rawMaterialId: r.id,
        name: r.name,
        quantity: Math.round(batchQty * 1.5),
        unit: r.unit,
        unitCost: r.unitCost,
        totalCost: Math.round(batchQty * 1.5 * r.unitCost),
      }))
    }

    const ratio = batchQty / 100
    const items: ProductionConsumedItem[] = []

    recipe.forEach((rec) => {
      const raw = database.rawMaterials.find((r) => r.sku === rec.materialSku)
      if (raw) {
        const neededQty = Math.round(rec.qtyPerBatch100 * ratio * 10) / 10
        items.push({
          rawMaterialId: raw.id,
          name: raw.name,
          quantity: neededQty,
          unit: raw.unit,
          unitCost: raw.unitCost,
          totalCost: Math.round(neededQty * raw.unitCost),
        })
      }
    })

    return items
  }

  // Cost calculations
  const rawMaterialTotalCost = consumedMaterials.reduce((sum, m) => sum + m.totalCost, 0)
  const totalBatchCost = rawMaterialTotalCost + laborCost + overheadCost
  const unitCost = targetQuantity > 0 ? totalBatchCost / targetQuantity : 0

  // Check if any raw material exceeds available stock
  const stockWarnings = consumedMaterials.map((mat) => {
    const raw = db.rawMaterials.find((r) => r.id === mat.rawMaterialId)
    const available = raw?.quantity || 0
    return {
      name: mat.name,
      needed: mat.quantity,
      available,
      isShort: mat.quantity > available,
    }
  })
  const hasShortage = stockWarnings.some((w) => w.isShort)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return

    if (hasShortage) {
      if (!await confirmAction('Warning: Some raw material stocks are lower than required for this batch. Proceed anyway?')) {
        return
      }
    }

    const batchNumber = `BATCH-2026-${String(db.productionRuns.length + 1).padStart(4, '0')}`

    const newRun: ProductionRun = {
      id: `pr-${Date.now()}`,
      batchNumber,
      date,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      targetQuantity,
      unit: selectedProduct.unit,
      consumedMaterials,
      laborCost,
      overheadCost,
      totalProductionCost: totalBatchCost,
      unitCost,
      status: 'Completed',
      supervisor,
      notes,
    }

    // 1. AUTOMATICALLY DEDUCT CONSUMED RAW MATERIALS FROM STOCK
    const updatedRawMaterials = db.rawMaterials.map((raw) => {
      const consumed = consumedMaterials.find((c) => c.rawMaterialId === raw.id)
      if (consumed) {
        const remaining = Math.max(0, raw.quantity - consumed.quantity)
        return {
          ...raw,
          quantity: remaining,
          status: (remaining <= 0 ? 'Out of stock' : remaining <= raw.reorderLevel ? 'Low stock' : 'In stock') as Status,
          updatedAt: date,
        }
      }
      return raw
    })

    // 2. AUTOMATICALLY INCREASE FINISHED GOODS PRODUCT STOCK
    const updatedProducts = db.products.map((prod) => {
      if (prod.id === selectedProduct.id) {
        const newQty = prod.quantity + targetQuantity
        return {
          ...prod,
          quantity: newQty,
          costPrice: Math.round(unitCost), // Update unit manufacturing cost price
          status: 'In stock' as const,
          updatedAt: date,
        }
      }
      return prod
    })

    const updatedDb: AppDatabase = {
      ...db,
      productionRuns: [newRun, ...db.productionRuns],
      rawMaterials: updatedRawMaterials,
      products: updatedProducts,
    }

    onSaveDatabase(updatedDb)
    onClose()
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal large" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Factory Execution</p>
            <h2>Launch New Production Batch</h2>
          </div>
          <button data-ui="button" type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        {/* Product & Quantity Grid */}
        <div className="form-grid three mb-4">
          <label>
            Finished Product to Manufacture *
            <select data-ui="select" value={productId} onChange={(e) => handleProductSelect(e.target.value)} required>
              {db.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Current Stock: {p.quantity} {p.unit})
                </option>
              ))}
            </select>
          </label>

          <label>
            Batch Target Quantity ({selectedProduct?.unit || 'Cartons'}) *
            <input data-ui="input"
              type="number"
              min="1"
              value={targetQuantity}
              onChange={(e) => handleQtyChange(Number(e.target.value))}
              required
            />
          </label>

          <label>
            Production Date
            <input data-ui="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
        </div>

        {/* Consumed Raw Materials & Bill of Materials */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-[#7cb518]" />
              Bill of Materials (Raw Materials Automatically Deducted)
            </span>
          </div>

          <div className="table-scroll border border-gray-200 rounded-lg">
            <table data-ui="table" className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th>Raw Material</th>
                  <th>Required Qty</th>
                  <th>Available in Warehouse</th>
                  <th>Unit Rate (Rs)</th>
                  <th>Total Cost (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {consumedMaterials.map((mat, idx) => {
                  const raw = db.rawMaterials.find((r) => r.id === mat.rawMaterialId)
                  const isShort = mat.quantity > (raw?.quantity || 0)
                  return (
                    <tr key={idx} className={isShort ? 'bg-red-50' : ''}>
                      <td className="font-semibold text-gray-900">{mat.name}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <input data-ui="input"
                            type="number"
                            min="0"
                            step="0.1"
                            value={mat.quantity}
                            onChange={(e) => {
                              const updated = [...consumedMaterials]
                              const q = Number(e.target.value)
                              updated[idx].quantity = q
                              updated[idx].totalCost = Math.round(q * updated[idx].unitCost)
                              setConsumedMaterials(updated)
                            }}
                            className="w-24 border border-gray-300 rounded p-1 text-xs"
                          />
                          <span>{mat.unit}</span>
                        </div>
                      </td>
                      <td>
                        <span className={isShort ? 'text-red-700 font-bold' : 'text-gray-600 font-medium'}>
                          {raw?.quantity || 0} {raw?.unit}
                        </span>
                      </td>
                      <td>{formatPKR(mat.unitCost)}</td>
                      <td className="font-bold text-gray-900">{formatPKR(mat.totalCost)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost and Overheads Grid */}
        <div data-ui="surface" className="gradient-card grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 text-xs">
          <div className="space-y-3">
            <label className="block font-bold text-gray-700">
              Shift Supervisor & Line QA
              <input data-ui="input"
                value={supervisor}
                onChange={(e) => setSupervisor(e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded-md p-2 bg-white text-xs"
                placeholder="Supervisor Name"
              />
            </label>

            <label className="block font-bold text-gray-700">
              Direct Labor & Bottling Line Wages (Rs)
              <input data-ui="input"
                type="number"
                min="0"
                value={laborCost}
                onChange={(e) => setLaborCost(Number(e.target.value))}
                className="w-full mt-1 border border-gray-300 rounded-md p-2 bg-white text-xs"
              />
            </label>

            <label className="block font-bold text-gray-700">
              Electricity & Factory Overheads (Rs)
              <input data-ui="input"
                type="number"
                min="0"
                value={overheadCost}
                onChange={(e) => setOverheadCost(Number(e.target.value))}
                className="w-full mt-1 border border-gray-300 rounded-md p-2 bg-white text-xs"
              />
            </label>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-gray-200 space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex justify-between text-gray-600">
                <span>Raw Materials Consumed:</span>
                <span className="font-semibold">{formatPKR(rawMaterialTotalCost)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Labor + Factory Overheads:</span>
                <span className="font-semibold">{formatPKR(laborCost + overheadCost)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-1.5">
                <span>Total Production Batch Cost:</span>
                <span className="text-[#7cb518] text-base">{formatPKR(totalBatchCost)}</span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center mt-2">
              <span className="text-[11px] text-emerald-800 font-medium block">Calculated Unit Manufacturing Cost</span>
              <strong className="text-lg text-emerald-900">{formatPKR(unitCost)} / {selectedProduct?.unit || 'Carton'}</strong>
            </div>
          </div>
        </div>

        <div className="editor-actions">
          <button data-ui="button" type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button data-ui="button" type="submit" className="button primary">
            Execute Run & Inflow Finished Goods Stock
          </button>
        </div>
      </form>
    </div>
  )
}
