'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Truck,
  DollarSign,
  RotateCcw,
  Trash2,
  Edit,
  FileText,
  Download,
  X,
  AlertTriangle,
  Briefcase,
  ShoppingBag,
  CircleDollarSign,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  type AppDatabase,
  type SupplierItem,
  type PurchaseItem,
  type ExpenseItem,
  type ReturnItem,
  type ExpenseCategory,
} from '@/lib/db'
import { generateLedgerPDF, exportToCSV } from '@/lib/pdf-export'

export type PurchaseSubTab = 'suppliers' | 'purchases' | 'returns' | 'expenses'

interface ProcurementViewProps {
  db: AppDatabase
  activeSubView?: 'suppliers' | 'purchases' | 'expenses' | 'returns'
  onSaveDatabase: (updated: AppDatabase) => void
}

export default function ProcurementView({
  db,
  activeSubView = 'suppliers',
  onSaveDatabase,
}: ProcurementViewProps) {
  const [tab, setTab] = useState<PurchaseSubTab>(activeSubView)
  const [query, setQuery] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null)
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false)
  const [isCreatingPurchase, setIsCreatingPurchase] = useState(false)
  const [isCreatingExpense, setIsCreatingExpense] = useState(false)
  const [isCreatingReturn, setIsCreatingReturn] = useState(false)
  const [viewingSupplierLedger, setViewingSupplierLedger] = useState<SupplierItem | null>(null)

  useEffect(() => {
    if (activeSubView) {
      setTab(activeSubView)
    }
  }, [activeSubView])

  const currentView = tab

  // Filters
  const filteredSuppliers = db.suppliers.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()) || s.phone.includes(query))
  const filteredPurchases = db.purchases.filter((p) => p.supplierName.toLowerCase().includes(query.toLowerCase()) || p.purchaseNumber.toLowerCase().includes(query.toLowerCase()))
  const filteredExpenses = db.expenses.filter((e) => e.title.toLowerCase().includes(query.toLowerCase()) || e.category.toLowerCase().includes(query.toLowerCase()))
  const filteredReturns = db.returns.filter((r) => r.partyName.toLowerCase().includes(query.toLowerCase()) || r.productName.toLowerCase().includes(query.toLowerCase()))

  // Export CSV
  const handleExportSuppliers = () => {
    const headers = ['Supplier Name', 'Category', 'Phone', 'City', 'Opening Balance', 'Current Payable']
    const rows = db.suppliers.map((s) => [s.name, s.category, s.phone, s.city, s.openingBalance, s.currentBalance])
    exportToCSV(`Suppliers_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  const handleExportPurchases = () => {
    const headers = ['Purchase #', 'Date', 'Supplier', 'Grand Total', 'Amount Paid', 'Balance Due', 'Status']
    const rows = db.purchases.map((p) => [p.purchaseNumber, formatDate(p.date), p.supplierName, p.grandTotal, p.amountPaid, p.balanceDue, p.status])
    exportToCSV(`Purchases_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  const handleExportExpenses = () => {
    const headers = ['Voucher #', 'Date', 'Title', 'Category', 'Amount (Rs)', 'Payment Method', 'Paid To']
    const rows = db.expenses.map((e) => [e.voucherNumber, formatDate(e.date), e.title, e.category, e.amount, e.paymentMethod, e.paidTo])
    exportToCSV(`Expenses_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  const tabs: Array<{
    id: PurchaseSubTab
    label: string
    icon: React.ReactNode
    count?: number
  }> = [
    {
      id: 'suppliers',
      label: 'Supplier Accounts & Ledgers',
      icon: <Briefcase className="w-4 h-4" />,
      count: db.suppliers.length,
    },
    {
      id: 'purchases',
      label: 'Raw Material Purchases',
      icon: <ShoppingBag className="w-4 h-4" />,
      count: db.purchases.length,
    },
    {
      id: 'returns',
      label: 'Returns & Defects',
      icon: <RotateCcw className="w-4 h-4" />,
      count: db.returns.length,
    },
    {
      id: 'expenses',
      label: 'Factory Expenses',
      icon: <CircleDollarSign className="w-4 h-4" />,
      count: db.expenses.length,
    },
  ]

  return (
    <div className="page-stack">
      {/* Top Purchase Horizontal Navigation Bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-2 shadow-xs sticky top-[71px] z-20">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {tabs.map((t) => {
            const isActive = currentView === t.id
            return (
              <button
                key={t.id}
                id={`purchase-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                {t.count !== undefined && (
                  <span
                    className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                      isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="page-heading">
        <div>
          <p className="eyebrow">Procurement & Expenditures</p>
          <h1>
            {currentView === 'suppliers'
              ? 'Supplier Accounts & Ledgers'
              : currentView === 'purchases'
              ? 'Raw Material Purchases'
              : currentView === 'expenses'
              ? 'Factory Expenses & Overheads'
              : 'Returns & Damaged Goods'}
          </h1>
          <p className="subheading">
            {currentView === 'suppliers'
              ? 'Vendors supplying sugar, preforms, labels, juice concentrates, and packaging.'
              : currentView === 'purchases'
              ? 'Purchase orders automatically increment raw material stock and update vendor payable ledgers.'
              : currentView === 'expenses'
              ? 'Direct factory utilities, bottling wages, diesel generator fuel, transport, and maintenance.'
              : 'Log and track distributor defective bottle returns and warehouse batch adjustments.'}
          </p>
        </div>
        <div className="heading-actions">
          {currentView === 'suppliers' && (
            <>
              <button className="button secondary" onClick={handleExportSuppliers}>
                <Download /> Export CSV
              </button>
              <button className="button primary" onClick={() => setIsCreatingSupplier(true)}>
                <Plus /> Add Supplier
              </button>
            </>
          )}
          {currentView === 'purchases' && (
            <>
              <button className="button secondary" onClick={handleExportPurchases}>
                <Download /> Export CSV
              </button>
              <button className="button primary" onClick={() => setIsCreatingPurchase(true)}>
                <Plus /> New Purchase Order
              </button>
            </>
          )}
          {currentView === 'expenses' && (
            <>
              <button className="button secondary" onClick={handleExportExpenses}>
                <Download /> Export CSV
              </button>
              <button className="button primary" onClick={() => setIsCreatingExpense(true)}>
                <Plus /> Record Expense
              </button>
            </>
          )}
          {currentView === 'returns' && (
            <button className="button primary" onClick={() => setIsCreatingReturn(true)}>
              <Plus /> Record Return / Defect
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Outstanding Vendor Payables</div>
          <strong className="text-amber-700">
            {formatPKR(db.suppliers.reduce((sum, s) => sum + s.currentBalance, 0))}
          </strong>
          <span className="stat-change text-amber-700">Owed to {db.suppliers.filter((s) => s.currentBalance > 0).length} suppliers</span>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Raw Material Purchases (MTD)</div>
          <strong>
            {formatPKR(db.purchases.reduce((sum, p) => sum + p.grandTotal, 0))}
          </strong>
          <span className="stat-change text-emerald-700">{db.purchases.length} purchase orders logged</span>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Factory Expenses (MTD)</div>
          <strong>
            {formatPKR(db.expenses.reduce((sum, e) => sum + e.amount, 0))}
          </strong>
          <span className="stat-change">Includes utilities, wages & fuel</span>
        </div>

        <div className="stat-card">
          <div className="stat-label">Returns & Damaged Goods</div>
          <strong>
            {formatPKR(db.returns.reduce((sum, r) => sum + r.totalLoss, 0))}
          </strong>
          <span className="stat-change">{db.returns.length} return entries</span>
        </div>
      </div>

      {/* VIEW: SUPPLIERS */}
      {currentView === 'suppliers' && (
        <div className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Supplier Name & Agency</th>
                  <th>Supply Category</th>
                  <th>Phone / WhatsApp</th>
                  <th>City & Address</th>
                  <th>Opening Balance</th>
                  <th>Current Payable Balance</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="row-avatar bg-amber-50 text-amber-800">{s.name.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div className="font-bold text-gray-900">{s.name}</div>
                          <div className="text-[11px] text-gray-500">{s.contactPerson || 'Vendor'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">{s.category}</span>
                    </td>
                    <td className="font-mono text-xs">{s.phone}</td>
                    <td className="text-xs text-gray-700">
                      <span className="font-semibold">{s.city}</span> · {s.address}
                    </td>
                    <td>{formatPKR(s.openingBalance)}</td>
                    <td>
                      <strong className={s.currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                        {formatPKR(s.currentBalance)}
                      </strong>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="row-action text-[#7cb518]"
                          title="View / Download Supplier Ledger"
                          onClick={() => setViewingSupplierLedger(s)}
                        >
                          <FileText />
                        </button>
                        <button className="row-action" title="Edit supplier" onClick={() => setSelectedSupplier(s)}>
                          <Edit />
                        </button>
                        <button
                          className="row-action danger"
                          title="Delete supplier"
                          onClick={() => {
                            if (window.confirm('Delete supplier?')) {
                              onSaveDatabase({ ...db, suppliers: db.suppliers.filter((sup) => sup.id !== s.id) })
                            }
                          }}
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

      {/* VIEW: PURCHASES */}
      {currentView === 'purchases' && (
        <div className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Date</th>
                  <th>Supplier Name</th>
                  <th>Items Purchased</th>
                  <th>Grand Total</th>
                  <th>Paid Amount</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((p) => (
                  <tr key={p.id}>
                    <td className="font-bold text-gray-900">{p.purchaseNumber}</td>
                    <td>{formatDate(p.date)}</td>
                    <td className="font-semibold text-gray-800">{p.supplierName}</td>
                    <td>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                        {p.items.map((it) => `${it.name} (${it.quantity} ${it.unit})`).join(', ')}
                      </span>
                    </td>
                    <td className="font-bold text-gray-900">{formatPKR(p.grandTotal)}</td>
                    <td className="font-semibold text-emerald-700">{formatPKR(p.amountPaid)}</td>
                    <td className={p.balanceDue > 0 ? 'font-semibold text-amber-700' : 'text-gray-400'}>
                      {p.balanceDue > 0 ? formatPKR(p.balanceDue) : 'Rs. 0'}
                    </td>
                    <td>
                      <span className={p.status === 'Paid' ? 'status status-success' : p.status === 'Partial' ? 'status status-warning' : 'status status-danger'}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="row-action danger"
                          title="Delete PO"
                          onClick={() => {
                            if (window.confirm('Delete purchase order?')) {
                              onSaveDatabase({ ...db, purchases: db.purchases.filter((po) => po.id !== p.id) })
                            }
                          }}
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

      {/* VIEW: EXPENSES */}
      {currentView === 'expenses' && (
        <div className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Voucher #</th>
                  <th>Date</th>
                  <th>Expense Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Payment Account</th>
                  <th>Paid To Person</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e) => (
                  <tr key={e.id}>
                    <td className="font-bold text-gray-900">{e.voucherNumber}</td>
                    <td>{formatDate(e.date)}</td>
                    <td className="font-semibold text-gray-900">{e.title}</td>
                    <td>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium">{e.category}</span>
                    </td>
                    <td className="font-bold text-gray-900">{formatPKR(e.amount)}</td>
                    <td className="text-xs text-gray-600 font-mono">{e.paymentAccount}</td>
                    <td className="text-xs text-gray-700">{e.paidTo || '—'}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="row-action danger"
                          title="Delete expense"
                          onClick={() => {
                            if (window.confirm('Delete expense voucher?')) {
                              onSaveDatabase({ ...db, expenses: db.expenses.filter((exp) => exp.id !== e.id) })
                            }
                          }}
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

      {/* VIEW: RETURNS */}
      {currentView === 'returns' && (
        <div className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Return #</th>
                  <th>Date</th>
                  <th>Party Name</th>
                  <th>Type</th>
                  <th>Product / Material</th>
                  <th>Quantity</th>
                  <th>Estimated Value</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturns.map((r) => (
                  <tr key={r.id}>
                    <td className="font-bold text-gray-900">{r.returnNumber}</td>
                    <td>{formatDate(r.date)}</td>
                    <td className="font-semibold text-gray-800">{r.partyName}</td>
                    <td>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">{r.type}</span>
                    </td>
                    <td className="font-semibold text-gray-900">{r.productName}</td>
                    <td className="font-bold">
                      {r.quantity} {r.unit}
                    </td>
                    <td className="font-bold text-red-600">{formatPKR(r.totalLoss)}</td>
                    <td className="text-xs text-gray-600">{r.reason}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="row-action danger"
                          title="Delete return"
                          onClick={() => {
                            if (window.confirm('Delete return record?')) {
                              onSaveDatabase({ ...db, returns: db.returns.filter((ret) => ret.id !== r.id) })
                            }
                          }}
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

      {/* CREATE SUPPLIER MODAL */}
      {(isCreatingSupplier || selectedSupplier) && (
        <SupplierEditorModal
          supplier={selectedSupplier}
          onClose={() => {
            setIsCreatingSupplier(false)
            setSelectedSupplier(null)
          }}
          onSave={(item) => {
            if (selectedSupplier) {
              onSaveDatabase({
                ...db,
                suppliers: db.suppliers.map((s) => (s.id === item.id ? item : s)),
              })
            } else {
              onSaveDatabase({
                ...db,
                suppliers: [item, ...db.suppliers],
              })
            }
            setIsCreatingSupplier(false)
            setSelectedSupplier(null)
          }}
        />
      )}

      {/* CREATE PURCHASE MODAL (AUTO INCREMENTS RAW MATERIAL STOCK) */}
      {isCreatingPurchase && (
        <CreatePurchaseModal
          db={db}
          onClose={() => setIsCreatingPurchase(false)}
          onSaveDatabase={onSaveDatabase}
        />
      )}

      {/* CREATE EXPENSE MODAL */}
      {isCreatingExpense && (
        <CreateExpenseModal
          db={db}
          onClose={() => setIsCreatingExpense(false)}
          onSaveDatabase={onSaveDatabase}
        />
      )}

      {/* CREATE RETURN MODAL */}
      {isCreatingReturn && (
        <CreateReturnModal
          db={db}
          onClose={() => setIsCreatingReturn(false)}
          onSaveDatabase={onSaveDatabase}
        />
      )}

      {/* SUPPLIER LEDGER STATEMENT MODAL */}
      {viewingSupplierLedger && (
        <SupplierLedgerModal
          supplier={viewingSupplierLedger}
          ledgers={db.ledgers.filter((l) => l.partyId === viewingSupplierLedger.id)}
          onClose={() => setViewingSupplierLedger(null)}
        />
      )}
    </div>
  )
}

function SupplierEditorModal({
  supplier,
  onClose,
  onSave,
}: {
  supplier: SupplierItem | null
  onClose: () => void
  onSave: (item: SupplierItem) => void
}) {
  const [name, setName] = useState(supplier?.name || '')
  const [category, setCategory] = useState(supplier?.category || 'Sugar')
  const [contactPerson, setContactPerson] = useState(supplier?.contactPerson || '')
  const [phone, setPhone] = useState(supplier?.phone || '')
  const [email, setEmail] = useState(supplier?.email || '')
  const [city, setCity] = useState(supplier?.city || 'Lahore')
  const [address, setAddress] = useState(supplier?.address || '')
  const [openingBalance, setOpeningBalance] = useState(supplier?.openingBalance || 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const now = new Date().toISOString().slice(0, 10)
    const saved: SupplierItem = {
      id: supplier?.id || `supp-${Date.now()}`,
      name,
      category,
      contactPerson,
      phone,
      email,
      city,
      address,
      openingBalance,
      currentBalance: supplier ? supplier.currentBalance : openingBalance,
      status: 'Active',
      updatedAt: now,
    }
    onSave(saved)
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Vendor Directory</p>
            <h2>{supplier ? 'Edit Supplier' : 'Add New Raw Material Supplier'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="form-grid">
          <label>
            Company / Supplier Name *
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. National Sugar Mills" required />
          </label>

          <label>
            Supply Category *
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Sugar, Preforms, Cartons" required />
          </label>

          <label>
            Contact Person
            <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Sales Manager Name" />
          </label>

          <label>
            Phone Number *
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300 XXXXXXX" required />
          </label>

          <label>
            City *
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lahore" required />
          </label>

          <label>
            Address
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Mill / Office Address" />
          </label>

          {!supplier && (
            <label>
              Opening Balance (Rs)
              <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(Number(e.target.value))} />
            </label>
          )}
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Save Supplier
          </button>
        </div>
      </form>
    </div>
  )
}

function CreatePurchaseModal({
  db,
  onClose,
  onSaveDatabase,
}: {
  db: AppDatabase
  onClose: () => void
  onSaveDatabase: (updated: AppDatabase) => void
}) {
  const [supplierId, setSupplierId] = useState(db.suppliers[0]?.id || '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [rawMaterialId, setRawMaterialId] = useState(db.rawMaterials[0]?.id || '')
  const [quantity, setQuantity] = useState(1000)
  const [unitCost, setUnitCost] = useState(db.rawMaterials[0]?.unitCost || 140)
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentAccount, setPaymentAccount] = useState<'cash-in-hand' | 'meezan-bank' | 'hbl-bank'>('meezan-bank')
  const [notes, setNotes] = useState('')

  const selectedSupplier = db.suppliers.find((s) => s.id === supplierId)
  const selectedRawMaterial = db.rawMaterials.find((r) => r.id === rawMaterialId)

  const handleRawChange = (rId: string) => {
    setRawMaterialId(rId)
    const raw = db.rawMaterials.find((r) => r.id === rId)
    if (raw) setUnitCost(raw.unitCost)
  }

  const grandTotal = quantity * unitCost
  const balanceDue = Math.max(0, grandTotal - amountPaid)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSupplier || !selectedRawMaterial) return

    const poNum = `PO-2026-${String(db.purchases.length + 1).padStart(4, '0')}`
    const status: 'Paid' | 'Partial' | 'Unpaid' = amountPaid >= grandTotal ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid'

    const newPurchase: PurchaseItem = {
      id: `po-${Date.now()}`,
      purchaseNumber: poNum,
      date,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      items: [
        {
          rawMaterialId: selectedRawMaterial.id,
          name: selectedRawMaterial.name,
          quantity,
          unit: selectedRawMaterial.unit,
          unitCost,
          total: grandTotal,
        },
      ],
      grandTotal,
      amountPaid,
      balanceDue,
      paymentMethod: amountPaid > 0 ? 'Bank Transfer' : 'Credit',
      paymentAccount: amountPaid > 0 ? paymentAccount : 'meezan-bank',
      status,
      notes,
    }

    // 1. AUTOMATICALLY INCREASE RAW MATERIAL STOCK
    const updatedRawMaterials = db.rawMaterials.map((r) => {
      if (r.id === selectedRawMaterial.id) {
        const newQty = r.quantity + quantity
        return {
          ...r,
          quantity: newQty,
          unitCost, // update latest purchasing rate
          status: 'In stock' as const,
          updatedAt: date,
        }
      }
      return r
    })

    // 2. DEDUCT CASH/BANK BALANCE IF PAID
    const updatedAccounts = db.accounts.map((acc) => {
      if (acc.id === paymentAccount && amountPaid > 0) {
        return { ...acc, balance: Math.max(0, acc.balance - amountPaid), updatedAt: date }
      }
      return acc
    })

    // 3. UPDATE SUPPLIER PAYABLE BALANCE
    const updatedSuppliers = db.suppliers.map((s) => {
      if (s.id === selectedSupplier.id && balanceDue > 0) {
        return { ...s, currentBalance: s.currentBalance + balanceDue, updatedAt: date }
      }
      return s
    })

    // 4. ADD LEDGER ENTRY
    const newLedger = {
      id: `led-${Date.now()}`,
      partyId: selectedSupplier.id,
      partyType: 'Supplier' as const,
      date,
      referenceType: 'Purchase' as const,
      referenceId: poNum,
      description: `Purchase of ${quantity} ${selectedRawMaterial.unit} ${selectedRawMaterial.name}`,
      debit: amountPaid,
      credit: grandTotal,
      balance: selectedSupplier.currentBalance + balanceDue,
    }

    onSaveDatabase({
      ...db,
      purchases: [newPurchase, ...db.purchases],
      rawMaterials: updatedRawMaterials,
      accounts: updatedAccounts,
      suppliers: updatedSuppliers,
      ledgers: [newLedger, ...db.ledgers],
    })

    onClose()
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Procurement PO</p>
            <h2>Create Raw Material Purchase</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="form-grid">
          <label>
            Supplier *
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              {db.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </label>

          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>

          <label>
            Raw Material to Purchase *
            <select value={rawMaterialId} onChange={(e) => handleRawChange(e.target.value)} required>
              {db.rawMaterials.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (Current Stock: {r.quantity} {r.unit})
                </option>
              ))}
            </select>
          </label>

          <label>
            Quantity ({selectedRawMaterial?.unit || 'Kg'}) *
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
          </label>

          <label>
            Purchase Rate per Unit (Rs) *
            <input type="number" min="0" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} required />
          </label>

          <label>
            Amount Paid Now (Rs)
            <input type="number" min="0" max={grandTotal} value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} />
          </label>

          <label>
            Paid From Account
            <select value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value as any)}>
              {db.accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (Bal: {formatPKR(acc.balance)})
                </option>
              ))}
            </select>
          </label>

          <label>
            Notes / Truck Bilty #
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bilty number, driver contact" />
          </label>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1.5 my-4 border border-gray-200">
          <div className="flex justify-between font-bold text-sm">
            <span>Total Purchase Amount:</span>
            <span className="text-[#7cb518]">{formatPKR(grandTotal)}</span>
          </div>
          <div className="flex justify-between text-amber-700 font-semibold">
            <span>Payable Balance Remaining:</span>
            <span>{formatPKR(balanceDue)}</span>
          </div>
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Receive Materials & Inflow Stock
          </button>
        </div>
      </form>
    </div>
  )
}

function CreateExpenseModal({
  db,
  onClose,
  onSaveDatabase,
}: {
  db: AppDatabase
  onClose: () => void
  onSaveDatabase: (updated: AppDatabase) => void
}) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('Factory Electricity')
  const [amount, setAmount] = useState(15000)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque'>('Cash')
  const [paymentAccount, setPaymentAccount] = useState<'cash-in-hand' | 'meezan-bank' | 'hbl-bank'>('cash-in-hand')
  const [paidTo, setPaidTo] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || amount <= 0) return

    const voucherNumber = `EXP-2026-${String(db.expenses.length + 1).padStart(4, '0')}`

    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      voucherNumber,
      date,
      title,
      category,
      amount,
      paymentMethod,
      paymentAccount,
      paidTo,
      notes,
    }

    // Deduct cash/bank
    const updatedAccounts = db.accounts.map((acc) => {
      if (acc.id === paymentAccount) {
        return { ...acc, balance: Math.max(0, acc.balance - amount), updatedAt: date }
      }
      return acc
    })

    onSaveDatabase({
      ...db,
      expenses: [newExpense, ...db.expenses],
      accounts: updatedAccounts,
    })

    onClose()
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Voucher Entry</p>
            <h2>Record Factory / Admin Expense</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="form-grid">
          <label>
            Expense Description *
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bottling Line Wages" required />
          </label>

          <label>
            Expense Category *
            <select value={category} onChange={(e) => setCategory(e.target.value as any)}>
              <option value="Factory Electricity">Factory Electricity (LESCO)</option>
              <option value="Labor & Wages">Labor & Wages</option>
              <option value="Fuel & Diesel">Fuel & Diesel Generator</option>
              <option value="Machinery Maintenance">Machinery Maintenance & Parts</option>
              <option value="Packaging & Printing">Packaging & Printing</option>
              <option value="Factory Rent">Factory Rent</option>
              <option value="Office & Tea">Office, Food & Tea</option>
              <option value="Freight & Transport">Freight & Transport</option>
              <option value="Other Expenses">Other Expenses</option>
            </select>
          </label>

          <label>
            Amount (Rs) *
            <input type="number" min="1" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
          </label>

          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>

          <label>
            Payment Mode
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </label>

          <label>
            Paid From Account
            <select value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value as any)}>
              {db.accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (Bal: {formatPKR(acc.balance)})
                </option>
              ))}
            </select>
          </label>

          <label className="col-span-2">
            Paid To Person / Vendor
            <input value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder="Recipient name" />
          </label>
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Record Expense Voucher
          </button>
        </div>
      </form>
    </div>
  )
}

function CreateReturnModal({
  db,
  onClose,
  onSaveDatabase,
}: {
  db: AppDatabase
  onClose: () => void
  onSaveDatabase: (updated: AppDatabase) => void
}) {
  const [partyName, setPartyName] = useState(db.customers[0]?.name || '')
  const [type, setType] = useState<'Customer Return' | 'Supplier Return' | 'Damaged in Factory'>('Customer Return')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [productName, setProductName] = useState(db.products[0]?.name || '')
  const [quantity, setQuantity] = useState(10)
  const [unit, setUnit] = useState('Cartons')
  const [totalLoss, setTotalLoss] = useState(4800)
  const [reason, setReason] = useState('Cap seal leakage during road transit')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newReturn: ReturnItem = {
      id: `ret-${Date.now()}`,
      returnNumber: `RET-2026-${String(db.returns.length + 1).padStart(4, '0')}`,
      date,
      partyName,
      type,
      productName,
      quantity,
      unit,
      totalLoss,
      reason,
      status: 'Processed',
    }

    onSaveDatabase({
      ...db,
      returns: [newReturn, ...db.returns],
    })

    onClose()
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Defects & Adjustments</p>
            <h2>Log Return / Damaged Goods</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="form-grid">
          <label>
            Return Type *
            <select value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="Customer Return">Customer Return</option>
              <option value="Supplier Return">Supplier Return</option>
              <option value="Damaged in Factory">Damaged in Factory / Transit</option>
            </select>
          </label>

          <label>
            Party / Customer / Vendor Name
            <input value={partyName} onChange={(e) => setPartyName(e.target.value)} required />
          </label>

          <label>
            Product / Material Name *
            <input value={productName} onChange={(e) => setProductName(e.target.value)} required />
          </label>

          <label>
            Quantity *
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
          </label>

          <label>
            Unit Packing
            <input value={unit} onChange={(e) => setUnit(e.target.value)} required />
          </label>

          <label>
            Estimated Value / Loss (Rs) *
            <input type="number" min="0" value={totalLoss} onChange={(e) => setTotalLoss(Number(e.target.value))} required />
          </label>

          <label className="col-span-2">
            Reason for Return / Defect *
            <input value={reason} onChange={(e) => setReason(e.target.value)} required />
          </label>
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Record Return
          </button>
        </div>
      </form>
    </div>
  )
}

function SupplierLedgerModal({
  supplier,
  ledgers,
  onClose,
}: {
  supplier: SupplierItem
  ledgers: AppDatabase['ledgers']
  onClose: () => void
}) {
  return (
    <div className="editor-overlay">
      <div className="editor-modal large">
        <div className="editor-header">
          <div>
            <p className="eyebrow">Supplier Statement</p>
            <h2>{supplier.name} · Vendor Ledger</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-500 block">Supply Category</span>
            <strong className="text-sm text-gray-900">{supplier.category}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Phone & City</span>
            <strong className="text-sm text-gray-900">{supplier.phone} ({supplier.city})</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Opening Balance</span>
            <strong className="text-sm text-gray-900">{formatPKR(supplier.openingBalance)}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Current Payable Due</span>
            <strong className="text-sm text-amber-700">{formatPKR(supplier.currentBalance)}</strong>
          </div>
        </div>

        <div className="table-scroll border border-gray-200 rounded-lg mb-4">
          <table className="w-full text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Debit (Paid to Vendor)</th>
                <th>Credit (Purchase Bill)</th>
                <th>Balance Due</th>
              </tr>
            </thead>
            <tbody>
              {ledgers.map((l, i) => (
                <tr key={i}>
                  <td>{formatDate(l.date)}</td>
                  <td>
                    <span className="bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-700">{l.referenceType}</span>
                  </td>
                  <td className="text-gray-800">{l.description}</td>
                  <td className="font-semibold text-emerald-700">{l.debit > 0 ? formatPKR(l.debit) : '—'}</td>
                  <td className="font-semibold text-gray-900">{l.credit > 0 ? formatPKR(l.credit) : '—'}</td>
                  <td className="font-bold text-gray-900">{formatPKR(l.balance)}</td>
                </tr>
              ))}
              {ledgers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-6">
                    No supplier ledger entries recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="editor-actions flex justify-between items-center">
          <button className="button secondary" onClick={() => generateLedgerPDF(supplier, ledgers, false)}>
            <Download /> Download Vendor Statement PDF
          </button>
          <button className="button primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
