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
  Boxes,
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
import PurchasesView from './purchases-view'

export type PurchaseSubTab = 'suppliers' | 'purchases' | 'returns' | 'expenses'

interface ProcurementViewProps {
  db: AppDatabase
  activeSubView?: 'suppliers' | 'purchases' | 'expenses' | 'returns'
  onSaveDatabase: (updated: AppDatabase) => void
}

export default function ProcurementView({
  db,
  activeSubView = 'purchases',
  onSaveDatabase,
}: ProcurementViewProps) {
  const [tab, setTab] = useState<PurchaseSubTab>(activeSubView)
  const [query, setQuery] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null)
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false)
  const [isCreatingExpense, setIsCreatingExpense] = useState(false)
  const [isCreatingReturn, setIsCreatingReturn] = useState(false)
  const [viewingSupplierLedger, setViewingSupplierLedger] = useState<SupplierItem | null>(null)

  useEffect(() => {
    if (activeSubView) {
      setTab(activeSubView)
    }
  }, [activeSubView])

  const currentView = tab

  // Filters with safe property fallbacks
  const filteredSuppliers = (db.suppliers || []).filter((s) => {
    const name = (s.name || '').toLowerCase()
    const phone = s.phone || ''
    const q = query.toLowerCase()
    return name.includes(q) || phone.includes(q)
  })

  const filteredExpenses = (db.expenses || []).filter((e) => {
    const desc = (e.description || e.title || '').toLowerCase()
    const cat = (e.category || '').toLowerCase()
    const q = query.toLowerCase()
    return desc.includes(q) || cat.includes(q)
  })

  const filteredReturns = (db.returns || []).filter((r) => {
    const party = (r.partyName || '').toLowerCase()
    const prod = (r.productName || '').toLowerCase()
    const q = query.toLowerCase()
    return party.includes(q) || prod.includes(q)
  })

  // Export CSV
  const handleExportSuppliers = () => {
    const headers = ['Supplier Name', 'Category', 'Phone', 'City', 'Opening Balance', 'Current Payable']
    const rows = db.suppliers.map((s) => [s.name, s.category, s.phone, s.city, s.openingBalance, s.currentBalance])
    exportToCSV(`Suppliers_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  const handleExportExpenses = () => {
    const headers = ['Voucher #', 'Date', 'Title', 'Category', 'Amount (Rs)', 'Payment Method', 'Paid To']
    const rows = db.expenses.map((e) => [
      e.voucherNumber || e.expenseNumber,
      formatDate(e.date),
      e.description || e.title,
      e.category,
      e.amount,
      e.paymentMethod,
      e.paidTo,
    ])
    exportToCSV(`Expenses_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  const tabs: Array<{
    id: PurchaseSubTab
    label: string
    icon: React.ReactNode
    count?: number
  }> = [
    {
      id: 'purchases',
      label: 'Purchases & Stock In',
      icon: <Truck className="w-4 h-4" />,
      count: db.purchases?.length || 0,
    },
    {
      id: 'suppliers',
      label: 'Supplier Accounts & Ledgers',
      icon: <Briefcase className="w-4 h-4" />,
      count: db.suppliers?.length || 0,
    },
    {
      id: 'expenses',
      label: 'Factory Expenses',
      icon: <CircleDollarSign className="w-4 h-4" />,
      count: db.expenses?.length || 0,
    },
    {
      id: 'returns',
      label: 'Returns & Defects',
      icon: <RotateCcw className="w-4 h-4" />,
      count: db.returns?.length || 0,
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

      {/* VIEW 1: PURCHASES (FULL MODULE WITH CRUD, INVOICES, AUTO STOCK & FINANCIAL SYNC) */}
      {currentView === 'purchases' && (
        <PurchasesView
          db={db}
          onSaveDatabase={onSaveDatabase}
          onNavigateToSupplier={(supplierId) => {
            setTab('suppliers')
            if (supplierId) {
              const sup = db.suppliers.find((s) => s.id === supplierId)
              if (sup) setViewingSupplierLedger(sup)
            }
          }}
        />
      )}

      {/* VIEW 2: SUPPLIERS */}
      {currentView === 'suppliers' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <p className="text-[11px] font-bold tracking-wide uppercase text-stone-500">Vendor Directory</p>
              <h1 className="text-2xl font-black text-stone-900 mt-0.5">Supplier Accounts & Ledgers</h1>
              <p className="text-xs text-stone-600 mt-0.5">
                Manage raw material suppliers, packaging vendors, and track real-time payable balances.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="button secondary" onClick={handleExportSuppliers}>
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button className="button primary" onClick={() => setIsCreatingSupplier(true)}>
                <Plus className="w-4 h-4 stroke-[3]" /> Add Supplier
              </button>
            </div>
          </div>

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
                            <FileText className="w-4 h-4" />
                          </button>
                          <button className="row-action" title="Edit supplier" onClick={() => setSelectedSupplier(s)}>
                            <Edit className="w-4 h-4" />
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
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: FACTORY EXPENSES */}
      {currentView === 'expenses' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <p className="text-[11px] font-bold tracking-wide uppercase text-stone-500">Factory Overheads</p>
              <h1 className="text-2xl font-black text-stone-900 mt-0.5">Factory Expenses & Operational Costs</h1>
              <p className="text-xs text-stone-600 mt-0.5">
                Record factory electricity, labor wages, diesel generator fuel, transport, and maintenance.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="button secondary" onClick={handleExportExpenses}>
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button className="button primary" onClick={() => setIsCreatingExpense(true)}>
                <Plus className="w-4 h-4 stroke-[3]" /> Record Expense
              </button>
            </div>
          </div>

          <div className="panel table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Voucher #</th>
                    <th>Date</th>
                    <th>Expense Description</th>
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
                      <td className="font-bold text-gray-900">{e.voucherNumber || e.expenseNumber}</td>
                      <td>{formatDate(e.date)}</td>
                      <td className="font-semibold text-gray-900">{e.description || e.title}</td>
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
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: RETURNS & DEFECTS */}
      {currentView === 'returns' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <p className="text-[11px] font-bold tracking-wide uppercase text-stone-500">Quality & Loss Tracking</p>
              <h1 className="text-2xl font-black text-stone-900 mt-0.5">Returns & Defective Goods</h1>
              <p className="text-xs text-stone-600 mt-0.5">
                Log distributor leakage returns, defective bottles, and warehouse damaged adjustments.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="button primary" onClick={() => setIsCreatingReturn(true)}>
                <Plus className="w-4 h-4 stroke-[3]" /> Record Return / Defect
              </button>
            </div>
          </div>

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
                    <th>Value / Loss</th>
                    <th>Reason</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReturns.map((r) => (
                    <tr key={r.id}>
                      <td className="font-bold text-gray-900">{r.returnNumber}</td>
                      <td>{formatDate(r.date)}</td>
                      <td className="font-semibold text-gray-800">{r.partyName}</td>
                      <td>
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">{r.type}</span>
                      </td>
                      <td className="font-medium text-gray-900">{r.productName}</td>
                      <td className="font-bold text-gray-900">
                        {r.quantity} {r.unit}
                      </td>
                      <td className="font-bold text-rose-700">{formatPKR(r.totalLoss)}</td>
                      <td className="text-xs text-gray-600">{r.reason}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="row-action danger"
                            title="Delete return entry"
                            onClick={() => {
                              if (window.confirm('Delete return record?')) {
                                onSaveDatabase({ ...db, returns: db.returns.filter((ret) => ret.id !== r.id) })
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUPPLIER MODAL */}
      {(selectedSupplier || isCreatingSupplier) && (
        <CreateSupplierModal
          supplier={selectedSupplier}
          onClose={() => {
            setSelectedSupplier(null)
            setIsCreatingSupplier(false)
          }}
          onSaveDatabase={onSaveDatabase}
          db={db}
        />
      )}

      {/* EXPENSE MODAL */}
      {isCreatingExpense && (
        <CreateExpenseModal
          db={db}
          onClose={() => setIsCreatingExpense(false)}
          onSaveDatabase={onSaveDatabase}
        />
      )}

      {/* RETURN MODAL */}
      {isCreatingReturn && (
        <CreateReturnModal
          db={db}
          onClose={() => setIsCreatingReturn(false)}
          onSaveDatabase={onSaveDatabase}
        />
      )}

      {/* SUPPLIER LEDGER MODAL */}
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

function CreateSupplierModal({
  supplier,
  onClose,
  onSaveDatabase,
  db,
}: {
  supplier: SupplierItem | null
  onClose: () => void
  onSaveDatabase: (updated: AppDatabase) => void
  db: AppDatabase
}) {
  const [name, setName] = useState(supplier?.name || '')
  const [category, setCategory] = useState(supplier?.category || 'Sugar & Sweeteners')
  const [contactPerson, setContactPerson] = useState(supplier?.contactPerson || '')
  const [phone, setPhone] = useState(supplier?.phone || '')
  const [city, setCity] = useState(supplier?.city || 'Lahore')
  const [address, setAddress] = useState(supplier?.address || '')
  const [openingBalance, setOpeningBalance] = useState(supplier?.openingBalance || 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (supplier) {
      const updated = db.suppliers.map((s) =>
        s.id === supplier.id
          ? {
              ...s,
              name,
              category,
              contactPerson,
              phone,
              city,
              address,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : s
      )
      onSaveDatabase({ ...db, suppliers: updated })
    } else {
      const newSupplier: SupplierItem = {
        id: `sup-${Date.now()}`,
        name,
        category,
        contactPerson,
        phone,
        city,
        address,
        openingBalance,
        currentBalance: openingBalance,
        totalPurchases: 0,
        totalPaid: 0,
        status: 'Active',
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
      }
      onSaveDatabase({ ...db, suppliers: [...db.suppliers, newSupplier] })
    }
    onClose()
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
      expenseNumber: voucherNumber,
      voucherNumber,
      date,
      description: title,
      title,
      category,
      amount,
      paymentMethod,
      paymentAccount,
      paidTo,
      status: 'Paid',
      notes,
      createdAt: new Date().toISOString(),
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
            <Download className="w-4 h-4" /> Download Vendor Statement PDF
          </button>
          <button className="button primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
