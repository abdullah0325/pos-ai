'use client'

import { useState } from 'react'
import { Plus, Search, FileText, Download, Trash2, Printer, CheckCircle, Clock, AlertCircle, ShoppingCart, X } from 'lucide-react'
import { formatPKR, formatDate, type AppDatabase, type InvoiceItem, type InvoiceLineItem, type CustomerItem } from '@/lib/db'
import { generateInvoicePDF, exportToCSV } from '@/lib/pdf-export'

interface InvoicesViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
}

export default function InvoicesView({ db, onSaveDatabase }: InvoicesViewProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Partial' | 'Unpaid'>('All')
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Filtered invoices
  const filteredInvoices = db.invoices.filter((inv) => {
    const matchQuery =
      inv.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(query.toLowerCase()) ||
      inv.saleType.toLowerCase().includes(query.toLowerCase())
    const matchStatus = statusFilter === 'All' || inv.status === statusFilter
    return matchQuery && matchStatus
  })

  // Total invoice summary
  const totalSales = db.invoices.reduce((sum, i) => sum + i.grandTotal, 0)
  const totalReceived = db.invoices.reduce((sum, i) => sum + i.amountPaid, 0)
  const totalReceivable = db.invoices.reduce((sum, i) => sum + i.balanceDue, 0)

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Invoice #', 'Date', 'Customer', 'Sale Type', 'Grand Total', 'Amount Paid', 'Balance Due', 'Status', 'Payment Method']
    const rows = db.invoices.map((inv) => [
      inv.invoiceNumber,
      formatDate(inv.date),
      inv.customerName,
      inv.saleType,
      inv.grandTotal,
      inv.amountPaid,
      inv.balanceDue,
      inv.status,
      inv.paymentMethod,
    ])
    exportToCSV(`Invoices_AL_FAROOQ_FOODS_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  // Delete invoice
  const handleDelete = (invId: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return
    const updatedInvoices = db.invoices.filter((i) => i.id !== invId)
    onSaveDatabase({ ...db, invoices: updatedInvoices })
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Commerce / Billing & Sales</p>
          <h1>Invoice Management</h1>
          <p className="subheading">Create, track, and print customer tax invoices with automatic inventory and ledger deduction.</p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={handleExportCSV}>
            <Download /> Export CSV
          </button>
          <button className="button primary" onClick={() => setShowCreateModal(true)}>
            <Plus /> Create Invoice
          </button>
        </div>
      </div>

      {/* KPI Cards (Auto-wrap 2x2 on smaller screens) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-500 block">Total Invoiced Sales</span>
            <strong className="text-xl font-extrabold text-stone-900 block mt-1 tracking-tight">{formatPKR(totalSales)}</strong>
          </div>
          <span className="text-[11px] font-medium text-stone-500 mt-2 block">{db.invoices.length} total invoices issued</span>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-500 block">Payments Collected</span>
            <strong className="text-xl font-extrabold text-emerald-700 block mt-1 tracking-tight">{formatPKR(totalReceived)}</strong>
          </div>
          <span className="text-[11px] font-medium text-emerald-700 mt-2 block">Deposited into Cash & Bank</span>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-500 block">Outstanding Receivables</span>
            <strong className="text-xl font-extrabold text-amber-700 block mt-1 tracking-tight">{formatPKR(totalReceivable)}</strong>
          </div>
          <span className="text-[11px] font-medium text-amber-800/80 mt-2 block">Pending customer recovery</span>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-500 block">Unpaid / Partial Invoices</span>
            <strong className="text-xl font-extrabold text-stone-900 block mt-1 tracking-tight">
              {db.invoices.filter((i) => i.status !== 'Paid').length}
            </strong>
          </div>
          <span className="text-[11px] font-medium text-stone-500 mt-2 block">Requires follow-up</span>
        </div>
      </div>

      {/* Filter toolbar (Grouped Cohesive Container) */}
      <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              placeholder="Search invoice # or customer..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-stone-50 hover:bg-white focus:bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
            />
            {query && (
              <button
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                onClick={() => setQuery('')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs bg-stone-50 text-stone-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
        <div className="text-[11px] font-medium text-stone-400 whitespace-nowrap pl-1">
          Showing {filteredInvoices.length} of {db.invoices.length} invoices
        </div>
      </div>

      {/* Invoices Table (Fit within 1440px desktop with no horizontal scroll) */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 text-[10.5px] uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3">Invoice & Date</th>
                <th className="py-2.5 px-3">Customer / Buyer</th>
                <th className="py-2.5 px-3">Sale Type</th>
                <th className="py-2.5 px-3">Items</th>
                <th className="py-2.5 px-3">Grand Total</th>
                <th className="py-2.5 px-3">Paid</th>
                <th className="py-2.5 px-3">Balance</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-2.5 px-3">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-stone-900 text-xs">
                        <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{inv.invoiceNumber}</span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5">{formatDate(inv.date)}</div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div>
                      <div className="font-semibold text-stone-900 text-xs">{inv.customerName}</div>
                      <div className="text-[11px] text-stone-500">{inv.phone || 'No phone'}</div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[11px] bg-stone-100 px-2 py-0.5 rounded font-medium text-stone-700 whitespace-nowrap">
                      {inv.saleType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-stone-700 whitespace-nowrap">
                    {inv.items.reduce((s, it) => s + it.quantity, 0)} {inv.items[0]?.unit || 'pk'}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-stone-900 text-xs whitespace-nowrap">
                    {formatPKR(inv.grandTotal)}
                  </td>
                  <td className="py-2.5 px-3 text-emerald-700 font-semibold text-xs whitespace-nowrap">
                    {formatPKR(inv.amountPaid)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={inv.balanceDue > 0 ? 'text-amber-700 font-semibold text-xs' : 'text-stone-400 text-xs'}>
                      {inv.balanceDue > 0 ? formatPKR(inv.balanceDue) : 'Rs. 0'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={
                        inv.status === 'Paid'
                          ? 'status status-success'
                          : inv.status === 'Partial'
                          ? 'status status-warning'
                          : 'status status-danger'
                      }
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="row-actions justify-end">
                      <button
                        className="row-action text-[#7cb518] hover:bg-emerald-50"
                        title="Download / Print PDF"
                        onClick={() => {
                          const cust = db.customers.find((c) => c.id === inv.customerId)
                          generateInvoicePDF(inv, cust)
                        }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button className="row-action hover:bg-stone-100" title="View details" onClick={() => setSelectedInvoice(inv)}>
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button className="row-action danger" title="Delete invoice" onClick={() => handleDelete(inv.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredInvoices.length === 0 && (
          <div className="empty-state">
            <ShoppingCart className="w-8 h-8 text-stone-300" />
            <strong>No Invoices Found</strong>
            <span>Create a new invoice or adjust your search filter.</span>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          customer={db.customers.find((c) => c.id === selectedInvoice.customerId)}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <CreateInvoiceModal db={db} onClose={() => setShowCreateModal(false)} onSaveDatabase={onSaveDatabase} />
      )}
    </div>
  )
}

function InvoiceDetailModal({
  invoice,
  customer,
  onClose,
}: {
  invoice: InvoiceItem
  customer?: CustomerItem
  onClose: () => void
}) {
  return (
    <div className="editor-overlay">
      <div className="editor-modal large">
        <div className="editor-header">
          <div>
            <p className="eyebrow">Tax Invoice Detail</p>
            <h2>{invoice.invoiceNumber}</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-500 block">Customer Name</span>
            <strong className="text-sm text-gray-900">{invoice.customerName}</strong>
            <span className="text-gray-500 block mt-1">{invoice.phone}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Invoice Date</span>
            <strong className="text-sm text-gray-900">{formatDate(invoice.date)}</strong>
            <span className="text-gray-500 block mt-1">Sale Type: {invoice.saleType}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Payment Method</span>
            <strong className="text-sm text-gray-900">{invoice.paymentMethod}</strong>
            <span className="text-gray-500 block mt-1">Account: {invoice.paymentAccount}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Status</span>
            <span
              className={`mt-1 inline-block ${
                invoice.status === 'Paid'
                  ? 'status status-success'
                  : invoice.status === 'Partial'
                  ? 'status status-warning'
                  : 'status status-danger'
              }`}
            >
              {invoice.status}
            </span>
          </div>
        </div>

        <div className="table-scroll border border-gray-200 rounded-lg mb-4">
          <table className="w-full text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th>#</th>
                <th>Product Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td className="font-medium text-gray-900">{item.name}</td>
                  <td>
                    {item.quantity} {item.unit}
                  </td>
                  <td>{formatPKR(item.unitPrice)}</td>
                  <td className="font-bold text-gray-900">{formatPKR(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-1.5 text-xs bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span>{formatPKR(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>- {formatPKR(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-300 pt-1.5">
              <span>Grand Total:</span>
              <span className="text-[#7cb518]">{formatPKR(invoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Amount Paid:</span>
              <span>{formatPKR(invoice.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-amber-700 font-semibold">
              <span>Balance Due:</span>
              <span>{formatPKR(invoice.balanceDue)}</span>
            </div>
          </div>
        </div>

        <div className="editor-actions flex justify-between items-center">
          <button className="button secondary" onClick={() => generateInvoicePDF(invoice, customer)}>
            <Download /> Download Official PDF
          </button>
          <button className="button primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateInvoiceModal({
  db,
  onClose,
  onSaveDatabase,
}: {
  db: AppDatabase
  onClose: () => void
  onSaveDatabase: (updated: AppDatabase) => void
}) {
  const [customerId, setCustomerId] = useState(db.customers[0]?.id || '')
  const [saleType, setSaleType] = useState<'Distributor' | 'Wholesale' | 'Retail' | 'Counter'>('Distributor')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit'>('Cash')
  const [paymentAccount, setPaymentAccount] = useState<'cash-in-hand' | 'meezan-bank' | 'hbl-bank'>('cash-in-hand')

  // Line items
  const [lines, setLines] = useState<InvoiceLineItem[]>([
    {
      productId: db.products[0]?.id || '',
      name: db.products[0]?.name || '',
      quantity: 10,
      unit: db.products[0]?.unit || 'Cartons',
      unitPrice: db.products[0]?.wholesalePrice || 500,
      costPrice: db.products[0]?.costPrice || 380,
      total: (db.products[0]?.wholesalePrice || 500) * 10,
    },
  ])

  // Selected customer
  const selectedCustomer = db.customers.find((c) => c.id === customerId)

  // Handle Product change on a line
  const handleProductChange = (index: number, prodId: string) => {
    const prod = db.products.find((p) => p.id === prodId)
    if (!prod) return
    const rate =
      saleType === 'Distributor' || saleType === 'Wholesale' ? prod.wholesalePrice : prod.retailPrice
    const updated = [...lines]
    updated[index] = {
      ...updated[index],
      productId: prod.id,
      name: prod.name,
      unit: prod.unit,
      unitPrice: rate,
      costPrice: prod.costPrice,
      total: rate * updated[index].quantity,
    }
    setLines(updated)
  }

  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...lines]
    updated[index].quantity = Math.max(1, qty)
    updated[index].total = updated[index].unitPrice * updated[index].quantity
    setLines(updated)
  }

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...lines]
    updated[index].unitPrice = Math.max(0, price)
    updated[index].total = updated[index].unitPrice * updated[index].quantity
    setLines(updated)
  }

  const addLine = () => {
    const firstProd = db.products[0]
    if (!firstProd) return
    const rate =
      saleType === 'Distributor' || saleType === 'Wholesale' ? firstProd.wholesalePrice : firstProd.retailPrice
    setLines([
      ...lines,
      {
        productId: firstProd.id,
        name: firstProd.name,
        quantity: 1,
        unit: firstProd.unit,
        unitPrice: rate,
        costPrice: firstProd.costPrice,
        total: rate * 1,
      },
    ])
  }

  const removeLine = (index: number) => {
    if (lines.length === 1) return
    setLines(lines.filter((_, i) => i !== index))
  }

  // Calculations
  const subtotal = lines.reduce((sum, it) => sum + it.total, 0)
  const grandTotal = Math.max(0, subtotal - discount)
  const balanceDue = Math.max(0, grandTotal - amountPaid)

  // Submit invoice
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) {
      alert('Please select a customer.')
      return
    }

    const nextInvNum = `INV-2026-${1049 + db.invoices.length}`
    const status: 'Paid' | 'Partial' | 'Unpaid' =
      amountPaid >= grandTotal ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid'

    const newInvoice: InvoiceItem = {
      id: `inv-${Date.now()}`,
      invoiceNumber: nextInvNum,
      date: invoiceDate,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.businessName || selectedCustomer.name,
      customerType: selectedCustomer.type,
      phone: selectedCustomer.phone,
      address: selectedCustomer.address,
      saleType,
      items: lines,
      subtotal,
      discount,
      tax: 0,
      grandTotal,
      amountPaid,
      balanceDue,
      paymentMethod,
      paymentAccount,
      status,
      deliveryStatus: 'Delivered',
      notes,
      createdAt: new Date().toISOString(),
    }

    // 1. Deduct finished goods stock
    const updatedProducts = db.products.map((prod) => {
      const line = lines.find((l) => l.productId === prod.id)
      if (line) {
        const remaining = Math.max(0, prod.quantity - line.quantity)
        return {
          ...prod,
          quantity: remaining,
          status: remaining <= 0 ? 'Out of stock' : remaining <= prod.reorderLevel ? 'Low stock' : 'In stock',
          updatedAt: invoiceDate,
        }
      }
      return prod
    })

    // 2. Update Cash/Bank account balance with amountPaid
    const updatedAccounts = db.accounts.map((acc) => {
      if (acc.id === paymentAccount && amountPaid > 0) {
        return { ...acc, balance: acc.balance + amountPaid, updatedAt: invoiceDate }
      }
      return acc
    })

    // 3. Update customer balance with balanceDue
    const updatedCustomers = db.customers.map((c) => {
      if (c.id === selectedCustomer.id && balanceDue > 0) {
        return { ...c, currentBalance: c.currentBalance + balanceDue, updatedAt: invoiceDate }
      }
      return c
    })

    // 4. Create customer ledger entries
    const newLedgerEntries = [
      {
        id: `led-${Date.now()}-1`,
        partyId: selectedCustomer.id,
        partyType: 'Customer' as const,
        date: invoiceDate,
        referenceType: 'Invoice' as const,
        referenceId: nextInvNum,
        description: `Invoice #${nextInvNum} (${lines.length} items)`,
        debit: grandTotal,
        credit: 0,
        balance: selectedCustomer.currentBalance + grandTotal,
      },
    ]

    if (amountPaid > 0) {
      newLedgerEntries.push({
        id: `led-${Date.now()}-2`,
        partyId: selectedCustomer.id,
        partyType: 'Customer' as const,
        date: invoiceDate,
        referenceType: 'Payment' as const,
        referenceId: `REC-${nextInvNum}`,
        description: `Payment received via ${paymentMethod}`,
        debit: 0,
        credit: amountPaid,
        balance: selectedCustomer.currentBalance + grandTotal - amountPaid,
      })
    }

    const updatedDb: AppDatabase = {
      ...db,
      invoices: [newInvoice, ...db.invoices],
      products: updatedProducts,
      accounts: updatedAccounts,
      customers: updatedCustomers,
      ledgers: [...newLedgerEntries, ...db.ledgers],
    }

    onSaveDatabase(updatedDb)
    onClose()

    // Automatically prompt PDF generation
    setTimeout(() => {
      if (window.confirm('Invoice created successfully! Would you like to download the PDF invoice?')) {
        generateInvoicePDF(newInvoice, selectedCustomer)
      }
    }, 150)
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal large" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">New Transaction</p>
            <h2>Create Customer Invoice</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        {/* Customer and Sale Type */}
        <div className="form-grid three mb-4">
          <label>
            Customer / Distributor *
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              {db.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type} - {c.city})
                </option>
              ))}
            </select>
          </label>

          <label>
            Sale Channel
            <select value={saleType} onChange={(e) => setSaleType(e.target.value as any)}>
              <option value="Distributor">Distributor Rate</option>
              <option value="Wholesale">Wholesale Rate</option>
              <option value="Retail">Retail Rate</option>
              <option value="Counter">Counter Sale</option>
            </select>
          </label>

          <label>
            Invoice Date
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
          </label>
        </div>

        {/* Line Items Table */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase text-gray-500">Products & Quantities</span>
            <button type="button" className="button secondary text-xs py-1 h-auto" onClick={addLine}>
              <Plus className="w-3.5 h-3.5" /> Add Product Row
            </button>
          </div>

          <div className="table-scroll border border-gray-200 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th style={{ width: '45%' }}>Finished Product</th>
                  <th style={{ width: '18%' }}>Quantity</th>
                  <th style={{ width: '20%' }}>Unit Price (Rs)</th>
                  <th style={{ width: '17%' }}>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        value={line.productId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded p-1.5"
                      >
                        {db.products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock: {p.quantity} {p.unit})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                        className="w-full text-xs border border-gray-300 rounded p-1.5"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={line.unitPrice}
                        onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                        className="w-full text-xs border border-gray-300 rounded p-1.5"
                      />
                    </td>
                    <td className="font-bold text-gray-800">{formatPKR(line.total)}</td>
                    <td>
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700 p-1"
                        onClick={() => removeLine(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment and Totals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-700">
              Payment Method
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full mt-1 border border-gray-300 rounded-md p-2 bg-white text-xs"
              >
                <option value="Cash">Cash on Delivery</option>
                <option value="Bank Transfer">Bank Online Transfer</option>
                <option value="Cheque">Bank Cheque</option>
                <option value="Credit">Credit (Pay Later)</option>
              </select>
            </label>

            <label className="block text-xs font-bold text-gray-700">
              Deposit Account
              <select
                value={paymentAccount}
                onChange={(e) => setPaymentAccount(e.target.value as any)}
                className="w-full mt-1 border border-gray-300 rounded-md p-2 bg-white text-xs"
              >
                {db.accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Bal: {formatPKR(acc.balance)})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold text-gray-700">
              Notes & Dispatch Info
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Driver, vehicle #, dispatch comments"
                className="w-full mt-1 border border-gray-300 rounded-md p-2 bg-white text-xs"
              />
            </label>
          </div>

          <div className="space-y-2 bg-white p-3.5 rounded-lg border border-gray-200 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatPKR(subtotal)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>Special Discount (Rs):</span>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-28 text-right border border-gray-300 rounded p-1"
              />
            </div>

            <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-2">
              <span>Net Grand Total:</span>
              <span className="text-[#7cb518] text-base">{formatPKR(grandTotal)}</span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="font-bold text-emerald-800">Amount Received Now:</span>
              <input
                type="number"
                min="0"
                max={grandTotal}
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                className="w-28 text-right border border-emerald-500 rounded p-1 font-bold text-emerald-700 bg-emerald-50"
              />
            </div>

            <div className="flex justify-between text-xs font-bold pt-1 border-t border-gray-200">
              <span className="text-amber-800">Remaining Balance Due:</span>
              <span className={balanceDue > 0 ? 'text-amber-700 text-sm' : 'text-gray-400'}>
                {formatPKR(balanceDue)}
              </span>
            </div>
          </div>
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Save Invoice & Update Stock
          </button>
        </div>
      </form>
    </div>
  )
}
