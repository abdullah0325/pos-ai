'use client'

import { useState } from 'react'
import { Plus, Search, Users, Phone, MapPin, CreditCard, ShoppingBag, Trash2, Edit, FileText, Download, X, Check, ArrowUpRight } from 'lucide-react'
import { formatPKR, formatDate, type AppDatabase, type CustomerItem, type CustomerType, type InvoiceItem } from '@/lib/db'
import { generateLedgerPDF, generateInvoicePDF, exportToCSV } from '@/lib/pdf-export'

interface SalesEntitiesViewProps {
  db: AppDatabase
  entityType: 'distributors' | 'wholesalers' | 'customers' | 'counter-sales'
  onSaveDatabase: (updated: AppDatabase) => void
}

export default function SalesEntitiesView({ db, entityType, onSaveDatabase }: SalesEntitiesViewProps) {
  const [query, setQuery] = useState('')
  const [selectedParty, setSelectedParty] = useState<CustomerItem | null>(null)
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [viewingLedgerParty, setViewingLedgerParty] = useState<CustomerItem | null>(null)

  // Filter parties by type if specific, or all for customers
  const filteredCustomers = db.customers.filter((c) => {
    if (entityType === 'distributors' && c.type !== 'Distributor') return false
    if (entityType === 'wholesalers' && c.type !== 'Wholesaler') return false
    if (entityType === 'counter-sales' && c.type !== 'Counter') return false

    const matchQ =
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.businessName.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query) ||
      c.city.toLowerCase().includes(query.toLowerCase())
    return matchQ
  })

  // Fast POS Counter Sale state
  const [posCart, setPosCart] = useState<{ productId: string; name: string; price: number; qty: number; unit: string }[]>([])
  const [posCustomerName, setPosCustomerName] = useState('Walk-in Counter Customer')
  const [posPaymentAccount, setPosPaymentAccount] = useState<'cash-in-hand' | 'meezan-bank'>('cash-in-hand')
  const [posDiscount, setPosDiscount] = useState(0)

  // POS Add item
  const handlePosAddToCart = (prodId: string) => {
    const prod = db.products.find((p) => p.id === prodId)
    if (!prod) return
    const existing = posCart.find((item) => item.productId === prodId)
    if (existing) {
      setPosCart(posCart.map((item) => (item.productId === prodId ? { ...item, qty: item.qty + 1 } : item)))
    } else {
      setPosCart([...posCart, { productId: prod.id, name: prod.name, price: prod.wholesalePrice, qty: 1, unit: prod.unit }])
    }
  }

  const handlePosCheckout = () => {
    if (posCart.length === 0) {
      alert('Cart is empty. Click any product to add.')
      return
    }

    const subtotal = posCart.reduce((sum, it) => sum + it.price * it.qty, 0)
    const grandTotal = Math.max(0, subtotal - posDiscount)
    const now = new Date().toISOString().slice(0, 10)
    const nextInvNum = `POS-${Date.now().toString().slice(-6)}`

    // Create POS invoice
    const newInvoice: InvoiceItem = {
      id: `inv-${Date.now()}`,
      invoiceNumber: nextInvNum,
      date: now,
      customerId: 'cust-4', // Walk-in
      customerName: posCustomerName,
      customerType: 'Counter',
      phone: '—',
      address: 'Factory Cash Counter',
      saleType: 'Counter',
      items: posCart.map((it) => ({
        productId: it.productId,
        name: it.name,
        quantity: it.qty,
        unit: it.unit,
        unitPrice: it.price,
        costPrice: it.price * 0.75,
        total: it.price * it.qty,
      })),
      subtotal,
      discount: posDiscount,
      tax: 0,
      grandTotal,
      amountPaid: grandTotal,
      balanceDue: 0,
      paymentMethod: 'Cash',
      paymentAccount: posPaymentAccount,
      status: 'Paid',
      deliveryStatus: 'Delivered',
      notes: 'Counter POS sale instant collection',
      createdAt: new Date().toISOString(),
    }

    // Deduct products stock
    const updatedProducts = db.products.map((p) => {
      const line = posCart.find((it) => it.productId === p.id)
      if (line) {
        const rem = Math.max(0, p.quantity - line.qty)
        return {
          ...p,
          quantity: rem,
          status: rem <= 0 ? 'Out of stock' : rem <= p.reorderLevel ? 'Low stock' : 'In stock',
          updatedAt: now,
        }
      }
      return p
    })

    // Increase cash balance
    const updatedAccounts = db.accounts.map((acc) => {
      if (acc.id === posPaymentAccount) {
        return { ...acc, balance: acc.balance + grandTotal, updatedAt: now }
      }
      return acc
    })

    onSaveDatabase({
      ...db,
      invoices: [newInvoice, ...db.invoices],
      products: updatedProducts,
      accounts: updatedAccounts,
    })

    setPosCart([])
    setPosDiscount(0)
    alert(`Counter sale ${nextInvNum} recorded successfully! Total: Rs. ${grandTotal.toLocaleString()}`)
  }

  // Export Parties to CSV
  const handleExportCSV = () => {
    const headers = ['Account Type', 'Name', 'Business Name', 'Phone', 'City', 'Credit Limit (Rs)', 'Current Balance (Rs)']
    const rows = filteredCustomers.map((c) => [c.type, c.name, c.businessName, c.phone, c.city, c.creditLimit, c.currentBalance])
    exportToCSV(`Accounts_${entityType}_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  // Delete customer
  const handleDeleteCustomer = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return
    onSaveDatabase({ ...db, customers: db.customers.filter((c) => c.id !== id) })
  }

  return (
    <div className="page-stack">
      {/* Heading */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">Commerce & Channels</p>
          <h1>
            {entityType === 'distributors'
              ? 'Distributor Accounts'
              : entityType === 'wholesalers'
              ? 'Wholesaler Accounts'
              : entityType === 'counter-sales'
              ? 'Fast Counter POS Sale'
              : 'Client Biodata & Accounts'}
          </h1>
          <p className="subheading">
            {entityType === 'counter-sales'
              ? 'Rapid point-of-sale terminal for direct factory gate & cash counter buyers.'
              : 'Comprehensive biodata, credit limits, transaction history, and account ledger statements.'}
          </p>
        </div>
        <div className="heading-actions">
          {entityType !== 'counter-sales' && (
            <>
              <button className="button secondary" onClick={handleExportCSV}>
                <Download /> Export CSV
              </button>
              <button className="button primary" onClick={() => setIsCreatingCustomer(true)}>
                <Plus /> Add {entityType === 'distributors' ? 'Distributor' : entityType === 'wholesalers' ? 'Wholesaler' : 'Account'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* COUNTER SALES POS SCREEN */}
      {entityType === 'counter-sales' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Click Product To Add to Cart</span>
              <span className="text-xs text-gray-500">{db.products.length} products available</span>
            </div>

            <div className="pos-grid">
              {db.products.map((prod) => (
                <button key={prod.id} className="pos-card" onClick={() => handlePosAddToCart(prod.id)}>
                  <strong>{prod.name}</strong>
                  <span>{prod.category}</span>
                  <div className="flex justify-between items-center mt-2 w-full">
                    <b>{formatPKR(prod.wholesalePrice)}</b>
                    <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded">
                      Stock: {prod.quantity}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* POS Cart & Checkout */}
          <div className="panel flex flex-col h-full justify-between">
            <div>
              <div className="panel-heading mb-3">
                <div>
                  <h2>Counter Sale Slip</h2>
                  <p>Cash Counter Checkout</p>
                </div>
                <button className="text-xs text-red-600 font-bold" onClick={() => setPosCart([])}>
                  Clear
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <input
                  value={posCustomerName}
                  onChange={(e) => setPosCustomerName(e.target.value)}
                  placeholder="Customer Name (Optional)"
                  className="w-full text-xs border border-gray-300 rounded p-2"
                />

                <select
                  value={posPaymentAccount}
                  onChange={(e) => setPosPaymentAccount(e.target.value as any)}
                  className="w-full text-xs border border-gray-300 rounded p-2"
                >
                  <option value="cash-in-hand">Deposit to: Cash in Hand</option>
                  <option value="meezan-bank">Deposit to: Meezan Bank</option>
                </select>
              </div>

              {/* Cart items */}
              <div className="space-y-2 max-h-60 overflow-y-auto border-t border-b border-gray-200 py-2">
                {posCart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-gray-100 last:border-0">
                    <div className="w-1/2">
                      <div className="font-semibold text-gray-800">{item.name}</div>
                      <div className="text-[10px] text-gray-500">{formatPKR(item.price)} each</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => {
                          const q = Math.max(1, Number(e.target.value))
                          setPosCart(posCart.map((it, i) => (i === idx ? { ...it, qty: q } : it)))
                        }}
                        className="w-12 text-center border border-gray-300 rounded p-1 text-xs"
                      />
                      <button
                        className="text-red-500 text-xs px-1"
                        onClick={() => setPosCart(posCart.filter((_, i) => i !== idx))}
                      >
                        ×
                      </button>
                    </div>
                    <div className="font-bold text-gray-900">{formatPKR(item.price * item.qty)}</div>
                  </div>
                ))}
                {posCart.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-6">No items in cart yet</p>
                )}
              </div>
            </div>

            {/* Total and Checkout */}
            <div className="pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Subtotal:</span>
                <span>{formatPKR(posCart.reduce((sum, it) => sum + it.price * it.qty, 0))}</span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span>Discount (Rs):</span>
                <input
                  type="number"
                  min="0"
                  value={posDiscount}
                  onChange={(e) => setPosDiscount(Number(e.target.value))}
                  className="w-20 text-right border border-gray-300 rounded p-1 text-xs"
                />
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2">
                <span>Total Due:</span>
                <span className="text-[#7cb518]">
                  {formatPKR(Math.max(0, posCart.reduce((sum, it) => sum + it.price * it.qty, 0) - posDiscount))}
                </span>
              </div>

              <button className="button primary w-full mt-3 py-3 h-auto" onClick={handlePosCheckout}>
                <Check className="w-4 h-4" /> Complete Sale & Receive Cash
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* PARTIES LIST VIEW (Distributors, Wholesalers, Customers) */
        <>
          {/* Stats */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Total Outstanding Receivables</div>
              <strong className="text-amber-700">
                {formatPKR(filteredCustomers.reduce((sum, c) => sum + c.currentBalance, 0))}
              </strong>
              <span className="stat-change">From active trade accounts</span>
            </div>

            <div className="stat-card">
              <div className="stat-label">Total Credit Limits Authorized</div>
              <strong>
                {formatPKR(filteredCustomers.reduce((sum, c) => sum + c.creditLimit, 0))}
              </strong>
              <span className="stat-change">Allocated trade credit</span>
            </div>

            <div className="stat-card">
              <div className="stat-label">Registered Accounts</div>
              <strong>{filteredCustomers.length}</strong>
              <span className="stat-change text-emerald-700">Verified commercial buyers</span>
            </div>

            <div className="stat-card">
              <div className="stat-label">Zero-Balance (Clear) Accounts</div>
              <strong className="text-emerald-700">
                {filteredCustomers.filter((c) => c.currentBalance <= 0).length}
              </strong>
              <span className="stat-change">Fully settled</span>
            </div>
          </div>

          {/* Search toolbar */}
          <div className="module-toolbar">
            <div className="search-box">
              <Search />
              <input
                placeholder="Search account name, business, phone or city..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="result-count">
              Showing {filteredCustomers.length} accounts
            </div>
          </div>

          {/* Accounts Table */}
          <div className="panel table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Account Name & Business</th>
                    <th>Type</th>
                    <th>Phone / WhatsApp</th>
                    <th>City & Address</th>
                    <th>Credit Limit</th>
                    <th>Current Balance</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="row-avatar">{c.name.slice(0, 2).toUpperCase()}</div>
                          <div>
                            <div className="font-bold text-gray-900">{c.name}</div>
                            <div className="text-[11px] text-gray-500">{c.businessName}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-700">{c.type}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-gray-700 font-mono text-xs">
                          <Phone className="w-3 h-3 text-[#7cb518]" />
                          <span>{c.phone}</span>
                        </div>
                      </td>
                      <td>
                        <div className="text-gray-700 text-xs">
                          <span className="font-semibold">{c.city}</span> · {c.address}
                        </div>
                      </td>
                      <td>{formatPKR(c.creditLimit)}</td>
                      <td>
                        <strong className={c.currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                          {formatPKR(c.currentBalance)}
                        </strong>
                      </td>
                      <td>
                        <span className={c.status === 'Active' ? 'status status-success' : 'status status-danger'}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="row-action text-[#7cb518]"
                            title="View / Download Account Statement Ledger"
                            onClick={() => setViewingLedgerParty(c)}
                          >
                            <FileText />
                          </button>
                          <button className="row-action" title="Edit Biodata" onClick={() => setSelectedParty(c)}>
                            <Edit />
                          </button>
                          <button className="row-action danger" title="Delete account" onClick={() => handleDeleteCustomer(c.id)}>
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
        </>
      )}

      {/* Customer Create/Edit Modal */}
      {(isCreatingCustomer || selectedParty) && (
        <CustomerEditorModal
          party={selectedParty}
          defaultType={entityType === 'distributors' ? 'Distributor' : entityType === 'wholesalers' ? 'Wholesaler' : 'Retailer'}
          onClose={() => {
            setIsCreatingCustomer(false)
            setSelectedParty(null)
          }}
          onSave={(item) => {
            if (selectedParty) {
              onSaveDatabase({
                ...db,
                customers: db.customers.map((c) => (c.id === item.id ? item : c)),
              })
            } else {
              onSaveDatabase({
                ...db,
                customers: [item, ...db.customers],
              })
            }
            setIsCreatingCustomer(false)
            setSelectedParty(null)
          }}
        />
      )}

      {/* Party Ledger Statement Modal */}
      {viewingLedgerParty && (
        <PartyLedgerModal
          party={viewingLedgerParty}
          ledgers={db.ledgers.filter((l) => l.partyId === viewingLedgerParty.id)}
          onClose={() => setViewingLedgerParty(null)}
        />
      )}
    </div>
  )
}

function CustomerEditorModal({
  party,
  defaultType,
  onClose,
  onSave,
}: {
  party: CustomerItem | null
  defaultType: CustomerType
  onClose: () => void
  onSave: (item: CustomerItem) => void
}) {
  const [name, setName] = useState(party?.name || '')
  const [businessName, setBusinessName] = useState(party?.businessName || '')
  const [type, setType] = useState<CustomerType>(party?.type || defaultType)
  const [phone, setPhone] = useState(party?.phone || '')
  const [email, setEmail] = useState(party?.email || '')
  const [cnic, setCnic] = useState(party?.cnic || '')
  const [city, setCity] = useState(party?.city || 'Lahore')
  const [address, setAddress] = useState(party?.address || '')
  const [creditLimit, setCreditLimit] = useState(party?.creditLimit || 200000)
  const [openingBalance, setOpeningBalance] = useState(party?.openingBalance || 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const now = new Date().toISOString().slice(0, 10)
    const saved: CustomerItem = {
      id: party?.id || `cust-${Date.now()}`,
      name,
      businessName,
      type,
      phone,
      email,
      cnic,
      city,
      address,
      creditLimit,
      openingBalance,
      currentBalance: party ? party.currentBalance : openingBalance,
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
            <p className="eyebrow">Commercial Account</p>
            <h2>{party ? 'Edit Account Biodata' : 'Add New Trade Account'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="form-grid">
          <label>
            Proprietor / Contact Name *
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Haji Noor Muhammad" required />
          </label>

          <label>
            Agency / Business Name *
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Noor Beverage Traders" required />
          </label>

          <label>
            Account Type *
            <select value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="Distributor">Exclusive Regional Distributor</option>
              <option value="Wholesaler">City Wholesaler</option>
              <option value="Retailer">Retail Store / Mart</option>
              <option value="Counter">Counter Cash Customer</option>
            </select>
          </label>

          <label>
            Phone / WhatsApp Number *
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0344 XXXXXXX" required />
          </label>

          <label>
            CNIC Number
            <input value={cnic} onChange={(e) => setCnic(e.target.value)} placeholder="35202-XXXXXXX-X" />
          </label>

          <label>
            City *
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lahore / Faisalabad" required />
          </label>

          <label className="col-span-2">
            Warehouse / Shop Delivery Address
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, Market, District" />
          </label>

          <label>
            Trade Credit Limit (Rs)
            <input type="number" min="0" value={creditLimit} onChange={(e) => setCreditLimit(Number(e.target.value))} />
          </label>

          {!party && (
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
            Save Account
          </button>
        </div>
      </form>
    </div>
  )
}

function PartyLedgerModal({
  party,
  ledgers,
  onClose,
}: {
  party: CustomerItem
  ledgers: AppDatabase['ledgers']
  onClose: () => void
}) {
  return (
    <div className="editor-overlay">
      <div className="editor-modal large">
        <div className="editor-header">
          <div>
            <p className="eyebrow">Financial Statement</p>
            <h2>{party.name} · Account Statement</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-500 block">Business Agency</span>
            <strong className="text-sm text-gray-900">{party.businessName || '—'}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Phone & City</span>
            <strong className="text-sm text-gray-900">{party.phone} ({party.city})</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Authorized Credit Limit</span>
            <strong className="text-sm text-gray-900">{formatPKR(party.creditLimit)}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Current Outstanding Due</span>
            <strong className="text-sm text-amber-700">{formatPKR(party.currentBalance)}</strong>
          </div>
        </div>

        <div className="table-scroll border border-gray-200 rounded-lg mb-4">
          <table className="w-full text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Debit (Invoice Sale)</th>
                <th>Credit (Payment Recv)</th>
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
                  <td className="font-semibold text-gray-900">{l.debit > 0 ? formatPKR(l.debit) : '—'}</td>
                  <td className="font-semibold text-emerald-700">{l.credit > 0 ? formatPKR(l.credit) : '—'}</td>
                  <td className="font-bold text-gray-900">{formatPKR(l.balance)}</td>
                </tr>
              ))}
              {ledgers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-6">
                    No ledger entries recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="editor-actions flex justify-between items-center">
          <button className="button secondary" onClick={() => generateLedgerPDF(party, ledgers, true)}>
            <Download /> Download Official PDF Statement
          </button>
          <button className="button primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
