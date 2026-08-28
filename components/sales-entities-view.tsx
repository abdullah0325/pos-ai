'use client'

import { useState } from 'react'
import {
  Plus,
  Search,
  Users,
  Phone,
  MapPin,
  CreditCard,
  Trash2,
  Edit,
  FileText,
  Download,
  X,
  Check,
  ArrowLeft,
  Eye,
  ImageIcon,
  Upload,
  AlertCircle,
  TrendingUp,
  Receipt,
  Filter,
  DollarSign,
  Share2,
  Printer,
  ChevronRight,
  Package,
  Calendar,
  Building2,
  Truck,
  UserCheck,
  Store,
  ShoppingBag,
  FilePlus,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  type AppDatabase,
  type CustomerItem,
  type CustomerType,
  type CustomerPaymentRecord,
  type InvoiceItem,
  type LedgerEntry,
} from '@/lib/db'
import { generateLedgerPDF, generateInvoicePDF, exportToCSV } from '@/lib/pdf-export'

interface SalesEntitiesViewProps {
  db: AppDatabase
  entityType: 'distributors' | 'wholesalers' | 'customers' | 'counter-sales'
  onSaveDatabase: (updated: AppDatabase) => void
}

export default function SalesEntitiesView({ db, entityType, onSaveDatabase }: SalesEntitiesViewProps) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Distributor' | 'Sales Representative' | 'Wholesaler' | 'Retailer' | 'Other'>('all')
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'pending' | 'settled' | 'overlimit'>('all')

  // Active state for profile detail view
  const [activeProfile, setActiveProfile] = useState<CustomerItem | null>(null)
  const [profileTab, setProfileTab] = useState<'products' | 'invoices' | 'ledger' | 'payments'>('products')

  // Modals state
  const [editingProfile, setEditingProfile] = useState<CustomerItem | null>(null)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [paymentModalProfile, setPaymentModalProfile] = useState<CustomerItem | null>(null)
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null)
  const [isCreatingInvoiceForParty, setIsCreatingInvoiceForParty] = useState<CustomerItem | null>(null)

  // Fast POS Counter Sale state
  const [posCart, setPosCart] = useState<{ productId: string; name: string; price: number; qty: number; unit: string }[]>([])
  const [posCustomerName, setPosCustomerName] = useState('Walk-in Counter Customer')
  const [posPaymentAccount, setPosPaymentAccount] = useState<'cash-in-hand' | 'meezan-bank'>('cash-in-hand')
  const [posDiscount, setPosDiscount] = useState(0)

  // Current entity list filtering
  const filteredCustomers = db.customers.filter((c) => {
    // Channel scope
    if (entityType === 'distributors') {
      if (c.type !== 'Distributor' && c.type !== 'Sales Representative') return false
      if (typeFilter !== 'all' && c.type !== typeFilter) return false
    } else if (entityType === 'wholesalers') {
      if (c.type !== 'Wholesaler') return false
    } else if (entityType === 'counter-sales') {
      if (c.type !== 'Counter') return false
    } else if (entityType === 'customers') {
      // In Customers / Shops module, display retail shops, wholesalers, and other commercial delivery accounts
      if (typeFilter !== 'all' && c.type !== typeFilter) return false
    }

    // Balance filter
    if (balanceFilter === 'pending' && c.currentBalance <= 0) return false
    if (balanceFilter === 'settled' && c.currentBalance !== 0) return false
    if (balanceFilter === 'overlimit' && c.currentBalance <= c.creditLimit) return false

    // Search query
    const q = query.toLowerCase().trim()
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      (c.businessName && c.businessName.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.territory && c.territory.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.cnic && c.cnic.includes(q))
    )
  })

  // Quick stats calculations
  const totalReceivables = filteredCustomers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0)
  const totalCreditLimits = filteredCustomers.reduce((sum, c) => sum + (c.creditLimit || 0), 0)
  const distributorCount = filteredCustomers.filter((c) => c.type === 'Distributor').length
  const salesRepCount = filteredCustomers.filter((c) => c.type === 'Sales Representative').length
  const wholesalerCount = filteredCustomers.filter((c) => c.type === 'Wholesaler').length
  const retailerCount = filteredCustomers.filter((c) => c.type === 'Retailer').length
  const otherCount = filteredCustomers.filter((c) => c.type === 'Other').length

  // Delete profile
  const handleDeleteProfile = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete profile "${name}"? All transaction records will remain in master ledgers.`)) return
    const updated = db.customers.filter((c) => c.id !== id)
    onSaveDatabase({ ...db, customers: updated })
    if (activeProfile?.id === id) setActiveProfile(null)
  }

  // Export profiles list to CSV
  const handleExportProfilesCSV = () => {
    const headers = ['ID', 'Channel Type', 'Shop/Business Name', 'Owner/Contact', 'Phone', 'City', 'Territory', 'Credit Limit (Rs)', 'Outstanding Balance (Rs)', 'Status']
    const rows = filteredCustomers.map((c) => [
      c.id,
      c.type,
      c.businessName || '',
      c.name,
      c.phone,
      c.city || '',
      c.territory || '',
      c.creditLimit || 0,
      c.currentBalance || 0,
      c.status,
    ])
    exportToCSV(`Trade_Profiles_${entityType}_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

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

    const newInvoice: InvoiceItem = {
      id: `inv-${Date.now()}`,
      invoiceNumber: nextInvNum,
      date: now,
      customerId: 'cust-6',
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

  // Keep active profile synced if db changes
  const currentActiveProfile = activeProfile ? db.customers.find((c) => c.id === activeProfile.id) || activeProfile : null

  return (
    <div className="page-stack">
      {/* Top Header */}
      <div className="page-heading">
        <div>
          <div className="flex items-center gap-2">
            {currentActiveProfile && (
              <button
                className="button secondary text-xs py-1 px-2.5 flex items-center gap-1 mr-2"
                onClick={() => setActiveProfile(null)}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to List
              </button>
            )}
            <p className="eyebrow">
              {entityType === 'distributors'
                ? 'Commercial Network & Field Reps'
                : entityType === 'customers'
                ? 'Retail & Wholesale Accounts'
                : 'Commerce & Sales'}
            </p>
          </div>
          <h1>
            {currentActiveProfile
              ? `${currentActiveProfile.businessName || currentActiveProfile.name} · Profile & Ledger`
              : entityType === 'distributors'
              ? 'Distributors & Sales Representatives'
              : entityType === 'wholesalers'
              ? 'Wholesaler Accounts'
              : entityType === 'customers'
              ? 'Customers & Retail Shops'
              : entityType === 'counter-sales'
              ? 'Fast Counter POS Sale'
              : 'Commercial Client Accounts'}
          </h1>
          <p className="subheading">
            {currentActiveProfile
              ? `Complete transaction history, supplied products, linked shipment invoices, per-deal pending amounts, and real-time ledger statement.`
              : entityType === 'distributors'
              ? 'Manage commercial distributors and field sales representatives, track stock supplies, invoices, and payment receipts.'
              : entityType === 'customers'
              ? 'Manage retail shops, marts, wholesalers, and commercial delivery accounts receiving bulk food products with offline local persistence.'
              : entityType === 'counter-sales'
              ? 'Rapid point-of-sale terminal for direct factory gate and cash counter buyers.'
              : 'Comprehensive client biodata, authorized trade credit limits, and running account ledgers.'}
          </p>
        </div>

        <div className="heading-actions">
          {entityType !== 'counter-sales' && !currentActiveProfile && (
            <>
              <button className="button secondary" onClick={handleExportProfilesCSV}>
                <Download /> Export CSV
              </button>
              <button className="button primary" onClick={() => setIsCreatingProfile(true)}>
                <Plus /> Add {entityType === 'distributors' ? 'Distributor / Sales Rep' : 'Customer / Shop Profile'}
              </button>
            </>
          )}

          {currentActiveProfile && (
            <div className="flex items-center gap-2">
              <button className="button secondary" onClick={() => setIsCreatingInvoiceForParty(currentActiveProfile)}>
                <FilePlus className="w-4 h-4" /> + New Delivery / Invoice
              </button>
              <button className="button secondary" onClick={() => setEditingProfile(currentActiveProfile)}>
                <Edit className="w-4 h-4" /> Edit Profile
              </button>
              <button className="button primary" onClick={() => setPaymentModalProfile(currentActiveProfile)}>
                <CreditCard className="w-4 h-4" /> Record Payment
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW: COUNTER SALES POS SCREEN */}
      {entityType === 'counter-sales' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

              <div className="space-y-2 max-h-60 overflow-y-auto border-t border-b border-gray-200 py-2">
                {posCart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-gray-800">{item.name}</div>
                      <div className="text-gray-500">
                        {item.qty} x {formatPKR(item.price)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-1.5 py-0.5 bg-gray-200 rounded font-bold"
                        onClick={() =>
                          setPosCart(
                            posCart
                              .map((it) => (it.productId === item.productId ? { ...it, qty: it.qty - 1 } : it))
                              .filter((it) => it.qty > 0)
                          )
                        }
                      >
                        -
                      </button>
                      <span className="font-bold">{item.qty}</span>
                      <button
                        className="px-1.5 py-0.5 bg-gray-200 rounded font-bold"
                        onClick={() =>
                          setPosCart(
                            posCart.map((it) => (it.productId === item.productId ? { ...it, qty: it.qty + 1 } : it))
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
                {posCart.length === 0 && <div className="text-center py-6 text-gray-400 text-xs">No items in cart yet.</div>}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-gray-200">
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
      ) : currentActiveProfile ? (
        /* VIEW: DEDICATED PROFILE DETAIL & HISTORY PAGE */
        <ProfileDetailView
          profile={currentActiveProfile}
          db={db}
          activeTab={profileTab}
          onTabChange={setProfileTab}
          onBack={() => setActiveProfile(null)}
          onEdit={() => setEditingProfile(currentActiveProfile)}
          onRecordPayment={() => setPaymentModalProfile(currentActiveProfile)}
          onCreateInvoice={() => setIsCreatingInvoiceForParty(currentActiveProfile)}
          onOpenLightbox={(url, title) => setLightboxImage({ url, title })}
          onSaveDatabase={onSaveDatabase}
        />
      ) : (
        /* VIEW: PROFILES / SHOPS / DISTRIBUTORS LIST */
        <>
          {/* KPI Summary Cards (Auto-wrap 2x2 on smaller screens) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-stone-500 block">Total Outstanding Receivables</span>
                <strong className="text-xl font-extrabold text-amber-700 block mt-1 tracking-tight">{formatPKR(totalReceivables)}</strong>
              </div>
              <span className="text-[11px] font-medium text-amber-800/80 mt-2 block">
                {entityType === 'distributors' ? 'Due from commercial channels' : 'Pending collection across shops'}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-stone-500 block">Total Credit Limits Authorized</span>
                <strong className="text-xl font-extrabold text-stone-900 block mt-1 tracking-tight">{formatPKR(totalCreditLimits)}</strong>
              </div>
              <span className="text-[11px] font-medium text-stone-500 mt-2 block">Allocated trade credit limits</span>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-stone-500 block">Registered Accounts</span>
                <strong className="text-xl font-extrabold text-stone-900 block mt-1 tracking-tight">{filteredCustomers.length}</strong>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 mt-2 block truncate">
                {entityType === 'distributors'
                  ? `${distributorCount} Distributors · ${salesRepCount} Sales Reps`
                  : entityType === 'wholesalers'
                  ? `${wholesalerCount} Wholesaler Accounts`
                  : `${retailerCount} Retail Shops · ${otherCount} Other`}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-stone-500 block">Zero-Balance (Clear) Accounts</span>
                <strong className="text-xl font-extrabold text-emerald-700 block mt-1 tracking-tight">
                  {filteredCustomers.filter((c) => c.currentBalance <= 0).length}
                </strong>
              </div>
              <span className="text-[11px] font-medium text-stone-500 mt-2 block">Fully settled / 0 dues</span>
            </div>
          </div>

          {/* Search and Filters Toolbar (Grouped Cohesive Container) */}
          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-xs flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder={
                  entityType === 'customers'
                    ? 'Search shop name, owner, ID, phone, city...'
                    : entityType === 'wholesalers'
                    ? 'Search wholesaler, owner, ID, phone, city...'
                    : 'Search distributor, sales rep, agency, ID, city...'
                }
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

            {/* Filter Pills & Dropdown group */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter Pills */}
              {entityType === 'distributors' ? (
                <div className="flex items-center bg-stone-100 p-0.5 rounded-lg text-xs font-medium border border-stone-200/60">
                  <button
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      typeFilter === 'all' ? 'bg-white shadow-xs font-bold text-stone-900' : 'text-stone-600 hover:text-stone-900'
                    }`}
                    onClick={() => setTypeFilter('all')}
                  >
                    All Channels ({db.customers.filter((c) => c.type === 'Distributor' || c.type === 'Sales Representative').length})
                  </button>
                  <button
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      typeFilter === 'Distributor'
                        ? 'bg-white shadow-xs font-bold text-emerald-700'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                    onClick={() => setTypeFilter('Distributor')}
                  >
                    Distributors ({db.customers.filter((c) => c.type === 'Distributor').length})
                  </button>
                  <button
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      typeFilter === 'Sales Representative'
                        ? 'bg-white shadow-xs font-bold text-teal-700'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                    onClick={() => setTypeFilter('Sales Representative')}
                  >
                    Sales Reps ({db.customers.filter((c) => c.type === 'Sales Representative').length})
                  </button>
                </div>
              ) : entityType === 'customers' ? (
                <div className="flex items-center bg-stone-100 p-0.5 rounded-lg text-xs font-medium border border-stone-200/60">
                  <button
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      typeFilter === 'all' ? 'bg-white shadow-xs font-bold text-stone-900' : 'text-stone-600 hover:text-stone-900'
                    }`}
                    onClick={() => setTypeFilter('all')}
                  >
                    All ({retailerCount + otherCount})
                  </button>
                  <button
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      typeFilter === 'Retailer'
                        ? 'bg-white shadow-xs font-bold text-blue-700'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                    onClick={() => setTypeFilter('Retailer')}
                  >
                    Retailers ({retailerCount})
                  </button>
                  <button
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      typeFilter === 'Other'
                        ? 'bg-white shadow-xs font-bold text-amber-700'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                    onClick={() => setTypeFilter('Other')}
                  >
                    Other ({otherCount})
                  </button>
                </div>
              ) : null}

              {/* Balance Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1">
                <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <select
                  value={balanceFilter}
                  onChange={(e) => setBalanceFilter(e.target.value as any)}
                  className="text-xs bg-transparent border-0 text-stone-700 font-medium focus:outline-none cursor-pointer pr-1"
                >
                  <option value="all">All Balance Statuses</option>
                  <option value="pending">With Dues ({'>'} 0)</option>
                  <option value="settled">Fully Settled (0 Due)</option>
                  <option value="overlimit">Exceeded Limit</option>
                </select>
              </div>

              <span className="text-[11px] font-medium text-stone-400 whitespace-nowrap pl-1 hidden xl:inline">
                {filteredCustomers.length} accounts
              </span>
            </div>
          </div>

          {/* Profiles Table (Fit within 1440px desktop with no horizontal scroll) */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 text-[10.5px] uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-3">{entityType === 'customers' ? 'Shop & Owner' : 'Party & Agency Title'}</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Contact & WhatsApp</th>
                    <th className="py-2.5 px-3">City / Location</th>
                    <th className="py-2.5 px-3">Credit Limit</th>
                    <th className="py-2.5 px-3">Outstanding Balance</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredCustomers.map((c) => {
                    const isOverLimit = c.creditLimit > 0 && c.currentBalance > c.creditLimit
                    const creditPct = c.creditLimit > 0 ? Math.min(100, Math.round((c.currentBalance / c.creditLimit) * 100)) : 0

                    return (
                      <tr key={c.id} className="hover:bg-stone-50/70 transition-colors">
                        {/* Party & Business Title with embedded ID badge */}
                        <td className="py-2.5 px-3">
                          <div
                            className="cursor-pointer group"
                            onClick={() => {
                              setActiveProfile(c)
                              setProfileTab('products')
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-stone-900 group-hover:text-primary transition-colors text-xs">
                                {c.businessName || c.name}
                              </span>
                              <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.2 rounded font-normal shrink-0">
                                {c.id}
                              </span>
                              <ChevronRight className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                              <span>Owner: {c.name}</span>
                            </div>
                          </div>
                        </td>

                        {/* Channel Type */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 whitespace-nowrap ${
                              c.type === 'Distributor'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                                : c.type === 'Sales Representative'
                                ? 'bg-teal-50 text-teal-800 border border-teal-200/60'
                                : c.type === 'Wholesaler'
                                ? 'bg-purple-50 text-purple-800 border border-purple-200/60'
                                : c.type === 'Retailer'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200/60'
                                : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                            }`}
                          >
                            {c.type === 'Distributor' ? (
                              <Truck className="w-3 h-3" />
                            ) : c.type === 'Sales Representative' ? (
                              <UserCheck className="w-3 h-3" />
                            ) : c.type === 'Wholesaler' ? (
                              <Building2 className="w-3 h-3" />
                            ) : c.type === 'Retailer' ? (
                              <Store className="w-3 h-3" />
                            ) : (
                              <ShoppingBag className="w-3 h-3" />
                            )}
                            {c.type}
                          </span>
                        </td>

                        {/* Compact Contact & WhatsApp */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <a
                              href={`https://wa.me/92${c.phone.replace(/[^0-9]/g, '').replace(/^0/, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-stone-800 font-mono text-xs hover:text-primary transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{c.phone}</span>
                            </a>
                            {c.altPhone && (
                              <span
                                className="text-[10px] text-stone-500 bg-stone-100 hover:bg-stone-200 px-1 py-0.2 rounded font-mono cursor-help"
                                title={`Alt Phone: ${c.altPhone}`}
                              >
                                +1
                              </span>
                            )}
                          </div>
                        </td>

                        {/* City / Single-line location with hover tooltip */}
                        <td className="py-2.5 px-3">
                          <div
                            className="text-xs text-stone-800 font-medium whitespace-nowrap cursor-help inline-flex items-center gap-1"
                            title={c.address || c.territory || c.city || 'No detailed address'}
                          >
                            <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                            <span>{c.city || c.territory || '—'}</span>
                          </div>
                        </td>

                        {/* Credit Limit */}
                        <td className="py-2.5 px-3">
                          <div className="text-xs whitespace-nowrap">
                            <div className="font-semibold text-stone-700">{formatPKR(c.creditLimit)}</div>
                            {c.creditLimit > 0 && (
                              <div className="w-14 bg-stone-200 rounded-full h-1 mt-1 overflow-hidden">
                                <div
                                  className={`h-full ${isOverLimit ? 'bg-red-600' : creditPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${creditPct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Outstanding Balance */}
                        <td className="py-2.5 px-3">
                          <div className="whitespace-nowrap">
                            <strong
                              className={`text-xs ${
                                isOverLimit
                                  ? 'text-red-700 font-black'
                                  : c.currentBalance > 0
                                  ? 'text-amber-700 font-bold'
                                  : 'text-emerald-700 font-semibold'
                              }`}
                            >
                              {formatPKR(c.currentBalance)}
                            </strong>
                            {isOverLimit && <span className="ml-1 text-[9px] text-red-600 font-bold uppercase">Over!</span>}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 text-center">
                          <span className={c.status === 'Active' ? 'status status-success' : 'status status-danger'}>
                            {c.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="row-actions justify-end">
                            <button
                              className="row-action text-[#7cb518] hover:bg-emerald-50"
                              title="View Full Profile & Ledger"
                              onClick={() => {
                                setActiveProfile(c)
                                setProfileTab('products')
                              }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="row-action text-emerald-600 hover:bg-emerald-50"
                              title="Create Invoice for this party"
                              onClick={() => setIsCreatingInvoiceForParty(c)}
                            >
                              <FilePlus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="row-action text-blue-600 hover:bg-blue-50"
                              title="Record Payment / Collection"
                              onClick={() => setPaymentModalProfile(c)}
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="row-action hover:bg-stone-100"
                              title="Edit Profile"
                              onClick={() => setEditingProfile(c)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="row-action danger"
                              title="Delete Profile"
                              onClick={() => handleDeleteProfile(c.id, c.businessName || c.name)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-stone-400 text-xs">
                        No profiles or shops found matching your search or filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* CREATE / EDIT PROFILE MODAL */}
      {(isCreatingProfile || editingProfile) && (
        <ProfileEditorModal
          profile={editingProfile}
          defaultType={
            entityType === 'distributors'
              ? 'Distributor'
              : entityType === 'wholesalers'
              ? 'Wholesaler'
              : 'Retailer'
          }
          existingCount={db.customers.length}
          onClose={() => {
            setIsCreatingProfile(false)
            setEditingProfile(null)
          }}
          onSave={(savedProfile) => {
            if (editingProfile) {
              const updated = db.customers.map((c) => (c.id === savedProfile.id ? savedProfile : c))
              onSaveDatabase({ ...db, customers: updated })
            } else {
              // Create initial opening balance ledger entry if openingBalance > 0
              let newLedgers = db.ledgers
              if (savedProfile.openingBalance > 0) {
                const opLedger: LedgerEntry = {
                  id: `led-op-${Date.now()}`,
                  partyId: savedProfile.id,
                  partyType: 'Customer',
                  date: new Date().toISOString().slice(0, 10),
                  referenceType: 'Opening',
                  referenceId: `OP-${savedProfile.id}`,
                  description: 'Opening Balance (Brought Forward)',
                  debit: savedProfile.openingBalance,
                  credit: 0,
                  balance: savedProfile.openingBalance,
                }
                newLedgers = [opLedger, ...db.ledgers]
              }

              onSaveDatabase({
                ...db,
                customers: [savedProfile, ...db.customers],
                ledgers: newLedgers,
              })
            }
            setIsCreatingProfile(false)
            setEditingProfile(null)
          }}
        />
      )}

      {/* DIRECT CREATE DELIVERY / INVOICE MODAL */}
      {isCreatingInvoiceForParty && (
        <CreateDeliveryInvoiceModal
          party={isCreatingInvoiceForParty}
          products={db.products}
          accounts={db.accounts}
          onClose={() => setIsCreatingInvoiceForParty(null)}
          onSave={(newInvoice, updatedProducts, updatedAccounts, newLedger, newCustomerBal) => {
            const updatedCustomers = db.customers.map((c) =>
              c.id === isCreatingInvoiceForParty.id ? { ...c, currentBalance: newCustomerBal, updatedAt: newInvoice.date } : c
            )

            onSaveDatabase({
              ...db,
              invoices: [newInvoice, ...db.invoices],
              products: updatedProducts,
              accounts: updatedAccounts,
              customers: updatedCustomers,
              ledgers: [newLedger, ...db.ledgers],
            })

            setIsCreatingInvoiceForParty(null)
            alert(`Delivery invoice ${newInvoice.invoiceNumber} recorded and stock dispatched successfully!`)
          }}
        />
      )}

      {/* RECORD PAYMENT MODAL */}
      {paymentModalProfile && (
        <RecordPaymentModal
          profile={paymentModalProfile}
          accounts={db.accounts}
          onClose={() => setPaymentModalProfile(null)}
          onSave={(paymentRecord, selectedAccount) => {
            const now = new Date().toISOString().slice(0, 10)
            const newBal = (paymentModalProfile.currentBalance || 0) - paymentRecord.amount

            // 1. Update customer with payment record and new balance
            const updatedCustomers = db.customers.map((c) => {
              if (c.id === paymentModalProfile.id) {
                const prevRecords = c.paymentRecords || []
                return {
                  ...c,
                  currentBalance: newBal,
                  paymentRecords: [paymentRecord, ...prevRecords],
                  updatedAt: now,
                }
              }
              return c
            })

            // 2. Add Ledger Entry (Credit)
            const newLedger: LedgerEntry = {
              id: `led-pay-${Date.now()}`,
              partyId: paymentModalProfile.id,
              partyType: 'Customer',
              date: paymentRecord.date,
              referenceType: 'Payment',
              referenceId: paymentRecord.receiptNumber,
              description: `Payment Received (${paymentRecord.paymentMethod}${
                paymentRecord.transactionRef ? ` - Ref: ${paymentRecord.transactionRef}` : ''
              })`,
              debit: 0,
              credit: paymentRecord.amount,
              balance: newBal,
            }

            // 3. Deposit money into company account
            const updatedAccounts = db.accounts.map((acc) => {
              if (acc.id === selectedAccount) {
                return { ...acc, balance: acc.balance + paymentRecord.amount, updatedAt: now }
              }
              return acc
            })

            onSaveDatabase({
              ...db,
              customers: updatedCustomers,
              ledgers: [newLedger, ...db.ledgers],
              accounts: updatedAccounts,
            })

            setPaymentModalProfile(null)
          }}
        />
      )}

      {/* LIGHTBOX MODAL FOR SCREENSHOTS & INVOICE IMAGES */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#7cb518]" /> {lightboxImage.title}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.url}
                  download="Payment_Receipt.png"
                  className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                  title="Download Image"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                  onClick={() => setLightboxImage(null)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="py-4 flex items-center justify-center bg-gray-50 rounded-xl mt-3 max-h-[70vh] overflow-auto">
              <img src={lightboxImage.url} alt={lightboxImage.title} className="max-h-[65vh] object-contain rounded-lg shadow-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------------
// COMPONENT: DEDICATED PROFILE DETAIL & HISTORY VIEW
// ---------------------------------------------------------------------------------

function ProfileDetailView({
  profile,
  db,
  activeTab,
  onTabChange,
  onBack,
  onEdit,
  onRecordPayment,
  onCreateInvoice,
  onOpenLightbox,
  onSaveDatabase,
}: {
  profile: CustomerItem
  db: AppDatabase
  activeTab: 'products' | 'invoices' | 'ledger' | 'payments'
  onTabChange: (tab: 'products' | 'invoices' | 'ledger' | 'payments') => void
  onBack: () => void
  onEdit: () => void
  onRecordPayment: () => void
  onCreateInvoice: () => void
  onOpenLightbox: (url: string, title: string) => void
  onSaveDatabase: (updated: AppDatabase) => void
}) {
  const [productSearch, setProductSearch] = useState('')

  // Linked Invoices
  const linkedInvoices = db.invoices.filter((inv) => inv.customerId === profile.id || inv.partyId === profile.id)
  
  // Lifetime totals
  const totalInvoiced = linkedInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0)
  const totalPaidInInvoices = linkedInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0)
  
  // Payment records
  const paymentRecords = profile.paymentRecords || []
  const totalManualPayments = paymentRecords.reduce((sum, p) => sum + p.amount, 0)
  const lifetimePaid = totalPaidInInvoices + totalManualPayments

  // Ledgers
  const ledgers = db.ledgers.filter((l) => l.partyId === profile.id)

  // Products Given / Sold across all linked deliveries
  const allSuppliedProducts: Array<{
    invoiceId: string
    invoiceNumber: string
    date: string
    productId: string
    name: string
    quantity: number
    unit: string
    unitPrice: number
    total: number
  }> = []

  linkedInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      allSuppliedProducts.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        total: item.total,
      })
    })
  })

  // Filtered Products
  const filteredProducts = allSuppliedProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.invoiceNumber.toLowerCase().includes(productSearch.toLowerCase())
  )

  // Aggregated Product totals (e.g. Total cartons per SKU)
  const productAggregates: Record<string, { name: string; unit: string; totalQty: number; totalAmount: number }> = {}
  allSuppliedProducts.forEach((p) => {
    if (!productAggregates[p.productId]) {
      productAggregates[p.productId] = { name: p.name, unit: p.unit, totalQty: 0, totalAmount: 0 }
    }
    productAggregates[p.productId].totalQty += p.quantity
    productAggregates[p.productId].totalAmount += p.total
  })

  // Credit calculation
  const creditUtilization = profile.creditLimit > 0 ? Math.min(100, Math.round((profile.currentBalance / profile.creditLimit) * 100)) : 0
  const availableCredit = Math.max(0, (profile.creditLimit || 0) - profile.currentBalance)

  // Export Product History CSV
  const handleExportProductHistoryCSV = () => {
    const headers = ['Date', 'Invoice / Delivery #', 'Product Name', 'Quantity Delivered', 'Unit', 'Unit Price (Rs)', 'Total Value (Rs)']
    const rows = filteredProducts.map((p) => [p.date, p.invoiceNumber, p.name, p.quantity, p.unit, p.unitPrice, p.total])
    exportToCSV(`Delivery_History_${(profile.businessName || profile.name).replace(/\s+/g, '_')}`, headers, rows)
  }

  // Share Statement via WhatsApp
  const handleShareWhatsApp = () => {
    const text = `*AL FAROOQ FOODS - ACCOUNT STATEMENT & LEDGER SUMMARY*
🏬 *Shop/Party:* ${profile.businessName || profile.name}
👤 *Proprietor:* ${profile.name}
🆔 *ID:* ${profile.id} | *Type:* ${profile.type}
📞 *Phone:* ${profile.phone}
📍 *Address:* ${profile.address || ''}, ${profile.city || ''}
----------------------------------
💰 *Current Outstanding Balance:* ${formatPKR(profile.currentBalance)}
💳 *Authorized Credit Limit:* ${formatPKR(profile.creditLimit)}
📦 *Total Shipments / Invoices:* ${linkedInvoices.length} (${formatPKR(totalInvoiced)})
✅ *Total Payments Received:* ${formatPKR(lifetimePaid)}
----------------------------------
_Generated offline via AL FAROOQ FOODS ERP on ${formatDate(new Date().toISOString().slice(0, 10))}._`
    window.open(`https://wa.me/92${profile.phone.replace(/[^0-9]/g, '').replace(/^0/, '')}?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Profile Header & Contact Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#7cb518]/10 text-[#7cb518] flex items-center justify-center font-black text-2xl border border-[#7cb518]/20">
              {(profile.businessName || profile.name).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">{profile.businessName || profile.name}</h2>
                <span className="font-mono text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {profile.id}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                    profile.type === 'Distributor'
                      ? 'bg-emerald-100 text-emerald-800'
                      : profile.type === 'Sales Representative'
                      ? 'bg-teal-100 text-teal-800'
                      : profile.type === 'Wholesaler'
                      ? 'bg-purple-100 text-purple-800'
                      : profile.type === 'Retailer'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {profile.type === 'Distributor' ? (
                    <Truck className="w-3 h-3" />
                  ) : profile.type === 'Sales Representative' ? (
                    <UserCheck className="w-3 h-3" />
                  ) : profile.type === 'Wholesaler' ? (
                    <Building2 className="w-3 h-3" />
                  ) : profile.type === 'Retailer' ? (
                    <Store className="w-3 h-3" />
                  ) : (
                    <ShoppingBag className="w-3 h-3" />
                  )}
                  {profile.type}
                </span>
                <span className={profile.status === 'Active' ? 'status status-success' : 'status status-danger'}>
                  {profile.status}
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-600 mt-1">
                Proprietor / Contact: <span className="text-gray-900 font-bold">{profile.name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                <a
                  href={`https://wa.me/92${profile.phone.replace(/[^0-9]/g, '').replace(/^0/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-gray-700 hover:text-[#7cb518] font-mono font-medium"
                >
                  <Phone className="w-3.5 h-3.5 text-[#7cb518]" /> {profile.phone}
                </a>
                {profile.altPhone && <span className="text-gray-400">Alt: {profile.altPhone}</span>}
                {profile.city && (
                  <span className="flex items-center gap-1 text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" /> {profile.city} {profile.territory ? `(${profile.territory})` : ''}
                  </span>
                )}
                {profile.cnic && <span className="text-gray-500">CNIC/NTN: {profile.cnic}</span>}
              </div>
              {profile.address && <div className="text-xs text-gray-500 mt-1">Shop Address: {profile.address}</div>}
              {profile.notes && <div className="text-xs text-gray-600 mt-1 italic">Note: {profile.notes}</div>}
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button className="button secondary text-xs" onClick={handleShareWhatsApp}>
              <Share2 className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Statement
            </button>
            <button className="button secondary text-xs" onClick={() => generateLedgerPDF(profile, ledgers, true)}>
              <Download className="w-3.5 h-3.5 text-gray-600" /> PDF Ledger
            </button>
            <button className="button secondary text-xs" onClick={onCreateInvoice}>
              <FilePlus className="w-3.5 h-3.5 text-[#7cb518]" /> + New Delivery
            </button>
            <button className="button primary text-xs" onClick={onRecordPayment}>
              <CreditCard className="w-3.5 h-3.5" /> + Record Payment
            </button>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-6 text-xs">
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
            <span className="text-gray-500 block mb-1">Total Products Invoiced</span>
            <strong className="text-base text-gray-900">{formatPKR(totalInvoiced)}</strong>
            <span className="text-[10px] text-gray-400 block mt-0.5">{linkedInvoices.length} shipments delivered</span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
            <span className="text-gray-500 block mb-1">Total Payments Received</span>
            <strong className="text-base text-emerald-700">{formatPKR(lifetimePaid)}</strong>
            <span className="text-[10px] text-emerald-600 block mt-0.5">Cleared into company accounts</span>
          </div>

          <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80">
            <span className="text-amber-800 font-semibold block mb-1">Current Balance Due</span>
            <strong className="text-base text-amber-900">{formatPKR(profile.currentBalance)}</strong>
            <span className="text-[10px] text-amber-700 block mt-0.5">Total outstanding receivable</span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
            <span className="text-gray-500 block mb-1">Authorized Credit Limit</span>
            <strong className="text-base text-gray-900">{formatPKR(profile.creditLimit)}</strong>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className={`h-full ${profile.currentBalance > profile.creditLimit ? 'bg-red-600' : 'bg-[#7cb518]'}`}
                style={{ width: `${creditUtilization}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 block mt-1">Available: {formatPKR(availableCredit)}</span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
            <span className="text-gray-500 block mb-1">Opening Balance</span>
            <strong className="text-base text-gray-700">{formatPKR(profile.openingBalance || 0)}</strong>
            <span className="text-[10px] text-gray-400 block mt-0.5">Brought forward</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-px font-medium text-xs">
        <button
          className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'border-[#7cb518] text-[#7cb518] font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
          onClick={() => onTabChange('products')}
        >
          <Package className="w-4 h-4" />
          <span>Deliveries & Shipments (Products) ({allSuppliedProducts.length})</span>
        </button>

        <button
          className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'invoices'
              ? 'border-[#7cb518] text-[#7cb518] font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
          onClick={() => onTabChange('invoices')}
        >
          <FileText className="w-4 h-4" />
          <span>Invoices & Deals ({linkedInvoices.length})</span>
        </button>

        <button
          className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'ledger'
              ? 'border-[#7cb518] text-[#7cb518] font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
          onClick={() => onTabChange('ledger')}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Full Ledger / Account Statement ({ledgers.length})</span>
        </button>

        <button
          className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-[#7cb518] text-[#7cb518] font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
          onClick={() => onTabChange('payments')}
        >
          <Receipt className="w-4 h-4" />
          <span>Payment Records & Receipts ({paymentRecords.length})</span>
        </button>
      </div>

      {/* TAB CONTENT: 1. PRODUCTS GIVEN / DELIVERIES HISTORY */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Aggregated Totals By Product */}
          {Object.keys(productAggregates).length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Cumulative Product Quantities Delivered to this Party / Shop
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(productAggregates).map(([pid, agg]) => (
                  <div key={pid} className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs">
                    <div className="text-xs font-bold text-gray-900 truncate" title={agg.name}>
                      {agg.name}
                    </div>
                    <div className="flex justify-between items-baseline mt-1.5">
                      <span className="text-sm font-black text-[#7cb518]">
                        {agg.totalQty.toLocaleString()} {agg.unit}
                      </span>
                      <span className="text-[11px] text-gray-500 font-semibold">{formatPKR(agg.totalAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search & Export Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by product name or shipment/invoice #..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7cb518]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="button secondary text-xs py-1.5" onClick={onCreateInvoice}>
                <FilePlus className="w-3.5 h-3.5 text-[#7cb518]" /> + Dispatch Delivery
              </button>
              <button className="button secondary text-xs py-1.5" onClick={handleExportProductHistoryCSV}>
                <Download className="w-3.5 h-3.5" /> Export Products CSV
              </button>
            </div>
          </div>

          {/* Products History Table */}
          <div className="panel table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Invoice / Shipment #</th>
                    <th>Product Delivered</th>
                    <th>Quantity Supplied</th>
                    <th>Unit Price</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="text-xs text-gray-600 font-mono">{formatDate(p.date)}</td>
                      <td>
                        <span className="font-mono text-xs font-bold text-[#7cb518] bg-emerald-50 px-2 py-0.5 rounded">
                          {p.invoiceNumber}
                        </span>
                      </td>
                      <td>
                        <div className="font-bold text-gray-900 text-xs">{p.name}</div>
                      </td>
                      <td>
                        <div className="font-bold text-gray-900 text-xs">
                          {p.quantity.toLocaleString()} {p.unit}
                        </div>
                      </td>
                      <td className="text-xs text-gray-700 font-mono">{formatPKR(p.unitPrice)}</td>
                      <td>
                        <strong className="text-xs text-gray-900 font-mono">{formatPKR(p.total)}</strong>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400 text-xs">
                        No product deliveries or shipments recorded for this profile yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. LINKED INVOICES & DEALS (PER-DEAL PENDING AMOUNTS) */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Linked Delivery Invoices & Deal Settlements
            </span>
            <button className="button primary text-xs py-1.5" onClick={onCreateInvoice}>
              <Plus className="w-3.5 h-3.5" /> Create Delivery Invoice
            </button>
          </div>

          <div className="panel table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Invoice / Deal #</th>
                    <th>Date</th>
                    <th>Items Delivered</th>
                    <th>Grand Total</th>
                    <th>Amount Paid</th>
                    <th>Amount Pending on Deal</th>
                    <th>Payment Mode</th>
                    <th>Invoice Proof / Slip</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedInvoices.map((inv) => {
                    const hasImage = !!inv.invoiceImage || !!inv.paymentScreenshot
                    const imgUrl = inv.invoiceImage || inv.paymentScreenshot

                    return (
                      <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                        <td>
                          <span className="font-mono text-xs font-bold text-gray-900">{inv.invoiceNumber}</span>
                        </td>
                        <td className="text-xs text-gray-600 font-mono">{formatDate(inv.date)}</td>
                        <td>
                          <div className="text-xs text-gray-800 max-w-[220px] truncate" title={inv.items.map((i) => `${i.name} (${i.quantity})`).join(', ')}>
                            {inv.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                          </div>
                          <div className="text-[10px] text-gray-400">{inv.items.length} line items</div>
                        </td>
                        <td>
                          <strong className="text-xs text-gray-900">{formatPKR(inv.grandTotal)}</strong>
                        </td>
                        <td>
                          <span className="text-xs text-emerald-700 font-semibold">{formatPKR(inv.amountPaid)}</span>
                        </td>
                        <td>
                          <strong className={inv.balanceDue > 0 ? 'text-amber-700 text-xs font-bold' : 'text-emerald-700 text-xs font-semibold'}>
                            {formatPKR(inv.balanceDue)}
                          </strong>
                          {inv.balanceDue > 0 && <span className="block text-[10px] text-amber-600">Pending Deal</span>}
                        </td>
                        <td>
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium">
                            {inv.paymentMethod}
                          </span>
                        </td>
                        <td>
                          {hasImage ? (
                            <button
                              className="flex items-center gap-1 text-xs text-[#7cb518] hover:underline font-semibold"
                              onClick={() => onOpenLightbox(imgUrl!, `Invoice ${inv.invoiceNumber}`)}
                            >
                              <ImageIcon className="w-3.5 h-3.5" /> View Photo
                            </button>
                          ) : (
                            <label className="cursor-pointer flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700">
                              <Upload className="w-3 h-3" /> Attach Photo
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  const reader = new FileReader()
                                  reader.onload = () => {
                                    const base64 = reader.result as string
                                    const updatedInvoices = db.invoices.map((i) =>
                                      i.id === inv.id ? { ...i, invoiceImage: base64 } : i
                                    )
                                    onSaveDatabase({ ...db, invoices: updatedInvoices })
                                  }
                                  reader.readAsDataURL(file)
                                }}
                              />
                            </label>
                          )}
                        </td>
                        <td>
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
                        <td>
                          <div className="row-actions justify-end">
                            <button
                              className="row-action text-[#7cb518]"
                              title="Download PDF Invoice"
                              onClick={() => generateInvoicePDF(inv, profile)}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {linkedInvoices.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-gray-400 text-xs">
                        No delivery invoices or deals linked to this profile yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. ACCOUNT STATEMENT / LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Chronological Running Balance Statement
            </span>
            <div className="flex items-center gap-2">
              <button className="button secondary text-xs py-1.5" onClick={() => generateLedgerPDF(profile, ledgers, true)}>
                <Download className="w-3.5 h-3.5" /> Download PDF Statement
              </button>
            </div>
          </div>

          <div className="panel table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Ref #</th>
                    <th>Description</th>
                    <th>Debit (Invoiced / Sold)</th>
                    <th>Credit (Payments / Returns)</th>
                    <th>Running Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgers.map((l, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="text-xs text-gray-600 font-mono">{formatDate(l.date)}</td>
                      <td>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                          {l.referenceType}
                        </span>
                      </td>
                      <td className="text-xs font-mono font-bold text-gray-700">{l.referenceId || '—'}</td>
                      <td className="text-xs text-gray-800">{l.description}</td>
                      <td className="text-xs font-semibold text-gray-900 font-mono">
                        {l.debit > 0 ? formatPKR(l.debit) : '—'}
                      </td>
                      <td className="text-xs font-semibold text-emerald-700 font-mono">
                        {l.credit > 0 ? formatPKR(l.credit) : '—'}
                      </td>
                      <td>
                        <strong className="text-xs text-gray-900 font-mono">{formatPKR(l.balance)}</strong>
                      </td>
                    </tr>
                  ))}
                  {ledgers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-400 text-xs">
                        No ledger statement records found for this account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. PAYMENT RECORDS */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Payments & Collections Received Log
            </span>
            <button className="button primary text-xs py-1.5" onClick={onRecordPayment}>
              <Plus className="w-3.5 h-3.5" /> Record Payment
            </button>
          </div>

          <div className="panel table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>Date</th>
                    <th>Amount Received</th>
                    <th>Payment Mode</th>
                    <th>Deposited Account</th>
                    <th>Transaction Ref #</th>
                    <th>Screenshot / Slip</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRecords.map((pay) => (
                    <tr key={pay.id} className="hover:bg-gray-50 transition-colors">
                      <td>
                        <span className="font-mono text-xs font-bold text-[#7cb518] bg-emerald-50 px-2 py-0.5 rounded">
                          {pay.receiptNumber}
                        </span>
                      </td>
                      <td className="text-xs text-gray-600 font-mono">{formatDate(pay.date)}</td>
                      <td>
                        <strong className="text-xs text-emerald-700 font-bold font-mono">{formatPKR(pay.amount)}</strong>
                      </td>
                      <td>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                          {pay.paymentMethod}
                        </span>
                      </td>
                      <td className="text-xs text-gray-700 font-medium">
                        {pay.paymentAccount === 'cash-in-hand'
                          ? 'Cash in Hand'
                          : pay.paymentAccount === 'meezan-bank'
                          ? 'Meezan Bank'
                          : 'HBL Bank'}
                      </td>
                      <td className="text-xs font-mono text-gray-600">{pay.transactionRef || '—'}</td>
                      <td>
                        {pay.receiptImage ? (
                          <button
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold"
                            onClick={() => onOpenLightbox(pay.receiptImage!, `Receipt ${pay.receiptNumber}`)}
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> View Screenshot
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">No image</span>
                        )}
                      </td>
                      <td className="text-xs text-gray-600">{pay.notes || '—'}</td>
                    </tr>
                  ))}
                  {paymentRecords.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-gray-400 text-xs">
                        No direct payment receipts recorded yet for this profile.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------------
// COMPONENT: ADD / EDIT PROFILE MODAL
// ---------------------------------------------------------------------------------

function ProfileEditorModal({
  profile,
  defaultType,
  existingCount,
  onClose,
  onSave,
}: {
  profile: CustomerItem | null
  defaultType: CustomerType
  existingCount: number
  onClose: () => void
  onSave: (item: CustomerItem) => void
}) {
  const prefix = defaultType === 'Distributor' || defaultType === 'Sales Representative' ? 'DIST' : 'SHOP'
  const autoGeneratedId = profile?.id || `${prefix}-${(existingCount + 101).toString()}`
  const [id, setId] = useState(profile?.id || autoGeneratedId)
  const [name, setName] = useState(profile?.name || '')
  const [businessName, setBusinessName] = useState(profile?.businessName || '')
  const [type, setType] = useState<CustomerType>(profile?.type || defaultType)
  const [phone, setPhone] = useState(profile?.phone || '')
  const [altPhone, setAltPhone] = useState(profile?.altPhone || '')
  const [email, setEmail] = useState(profile?.email || '')
  const [cnic, setCnic] = useState(profile?.cnic || '')
  const [city, setCity] = useState(profile?.city || 'Peshawar')
  const [territory, setTerritory] = useState(profile?.territory || '')
  const [address, setAddress] = useState(profile?.address || '')
  const [creditLimit, setCreditLimit] = useState(profile?.creditLimit || 200000)
  const [openingBalance, setOpeningBalance] = useState(profile?.openingBalance || 0)
  const [status, setStatus] = useState<'Active' | 'Blocked'>(profile?.status || 'Active')
  const [notes, setNotes] = useState(profile?.notes || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() && !businessName.trim()) {
      alert('Please enter either a Shop Name or Owner Name.')
      return
    }

    const now = new Date().toISOString().slice(0, 10)
    const saved: CustomerItem = {
      id: id.trim() || `${prefix}-${Date.now().toString().slice(-4)}`,
      name: name.trim() || businessName.trim(),
      businessName: businessName.trim(),
      type,
      phone: phone.trim(),
      altPhone: altPhone.trim() || undefined,
      email: email.trim() || undefined,
      cnic: cnic.trim() || undefined,
      city: city.trim(),
      territory: territory.trim() || undefined,
      address: address.trim(),
      creditLimit: Number(creditLimit) || 0,
      openingBalance: Number(openingBalance) || 0,
      currentBalance: profile ? profile.currentBalance : Number(openingBalance) || 0,
      status,
      notes: notes.trim() || undefined,
      paymentRecords: profile?.paymentRecords || [],
      updatedAt: now,
    }
    onSave(saved)
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal max-w-2xl" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Commerce & Accounts Management</p>
            <h2>{profile ? 'Edit Profile Biodata' : 'Add Customer / Shop Profile'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="form-grid">
          <label>
            Profile ID (Auto or Manual) *
            <input value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. SHOP-101 or DIST-101" required />
          </label>

          <label>
            Account / Client Type *
            <select value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="Retailer">Retail Store / Mart / Baker</option>
              <option value="Wholesaler">City Wholesaler / Bulk Buyer</option>
              <option value="Distributor">Exclusive Regional Distributor</option>
              <option value="Sales Representative">Field Sales Representative (Van/Rep)</option>
              <option value="Other">Other Institutional Buyer / Canteen</option>
            </select>
          </label>

          <label>
            Shop / Business Title *
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Gulberg Supermart & Bakers" required />
          </label>

          <label>
            Owner / Proprietor Name *
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Haji Noor Muhammad" required />
          </label>

          <label>
            Primary Phone / WhatsApp *
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0344 9549051" required />
          </label>

          <label>
            Alternate Phone (Optional)
            <input value={altPhone} onChange={(e) => setAltPhone(e.target.value)} placeholder="0300 XXXXXXX" />
          </label>

          <label>
            City *
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Peshawar, Lahore, Rawalpindi" required />
          </label>

          <label>
            Market / Area / Territory
            <input value={territory} onChange={(e) => setTerritory(e.target.value)} placeholder="e.g. Karkhano Wholesale Market" />
          </label>

          <label className="col-span-2">
            Shop / Warehouse / Delivery Address *
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shop #, Market, Street Address" required />
          </label>

          <label>
            CNIC / Tax NTN (Optional)
            <input value={cnic} onChange={(e) => setCnic(e.target.value)} placeholder="17301-XXXXXXX-X" />
          </label>

          <label>
            Email Address (Optional)
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="shop@gmail.com" />
          </label>

          <label>
            Authorized Trade Credit Limit (Rs)
            <input type="number" min="0" value={creditLimit} onChange={(e) => setCreditLimit(Number(e.target.value))} />
          </label>

          {!profile && (
            <label>
              Opening Balance (Rs)
              <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(Number(e.target.value))} />
            </label>
          )}

          <label>
            Account Status
            <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="Active">Active</option>
              <option value="Blocked">Blocked</option>
            </select>
          </label>

          <label className="col-span-2">
            Commercial Notes / Delivery Instructions
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Weekly Tuesday delivery cycle, payment settlement via Raast."
              className="w-full text-xs border border-gray-300 rounded p-2"
            />
          </label>
        </div>

        <div className="editor-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Save Profile
          </button>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------------
// COMPONENT: DIRECT BULK DELIVERY / INVOICE MODAL
// ---------------------------------------------------------------------------------

function CreateDeliveryInvoiceModal({
  party,
  products,
  accounts,
  onClose,
  onSave,
}: {
  party: CustomerItem
  products: AppDatabase['products']
  accounts: AppDatabase['accounts']
  onClose: () => void
  onSave: (
    newInvoice: InvoiceItem,
    updatedProducts: AppDatabase['products'],
    updatedAccounts: AppDatabase['accounts'],
    newLedger: LedgerEntry,
    newCustomerBal: number
  ) => void
}) {
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10))
  const [items, setItems] = useState<
    Array<{ productId: string; name: string; quantity: number; unit: string; unitPrice: number; costPrice: number; total: number }>
  >([])
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '')
  const [addQty, setAddQty] = useState(10)
  const [discount, setDiscount] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Online' | 'Bank Transfer'>('Cash')
  const [paymentAccount, setPaymentAccount] = useState<'cash-in-hand' | 'meezan-bank' | 'hbl-bank'>('cash-in-hand')
  const [notes, setNotes] = useState('')
  const [invoiceImage, setInvoiceImage] = useState<string | undefined>(undefined)

  const handleAddItem = () => {
    const prod = products.find((p) => p.id === selectedProductId)
    if (!prod) return
    const price = party.type === 'Retailer' ? prod.retailPrice || prod.wholesalePrice : prod.wholesalePrice

    const existingIdx = items.findIndex((i) => i.productId === prod.id)
    if (existingIdx >= 0) {
      const updated = [...items]
      updated[existingIdx].quantity += Number(addQty)
      updated[existingIdx].total = updated[existingIdx].quantity * updated[existingIdx].unitPrice
      setItems(updated)
    } else {
      setItems([
        ...items,
        {
          productId: prod.id,
          name: prod.name,
          quantity: Number(addQty),
          unit: prod.unit,
          unitPrice: price,
          costPrice: prod.costPrice,
          total: Number(addQty) * price,
        },
      ])
    }
  }

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx))
  }

  const subtotal = items.reduce((sum, it) => sum + it.total, 0)
  const grandTotal = Math.max(0, subtotal - discount)
  const balanceDue = Math.max(0, grandTotal - amountPaid)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setInvoiceImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      alert('Please add at least one product item to this delivery shipment.')
      return
    }

    const nextInvNum = `INV-${Date.now().toString().slice(-6)}`
    const newInvoice: InvoiceItem = {
      id: `inv-${Date.now()}`,
      invoiceNumber: nextInvNum,
      date: invoiceDate,
      customerId: party.id,
      customerName: party.businessName || party.name,
      customerType: party.type,
      phone: party.phone,
      address: party.address,
      saleType: party.type === 'Wholesaler' ? 'Wholesale' : party.type === 'Retailer' ? 'Retail' : 'Distributor',
      items,
      subtotal,
      discount,
      tax: 0,
      grandTotal,
      amountPaid,
      balanceDue,
      paymentMethod,
      paymentAccount,
      invoiceImage,
      paymentScreenshot: invoiceImage,
      status: balanceDue === 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid',
      deliveryStatus: 'Delivered',
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    }

    // Deduct stock from warehouse
    const updatedProducts = products.map((p) => {
      const line = items.find((it) => it.productId === p.id)
      if (line) {
        const rem = Math.max(0, p.quantity - line.quantity)
        return {
          ...p,
          quantity: rem,
          status: rem <= 0 ? 'Out of stock' : rem <= p.reorderLevel ? 'Low stock' : 'In stock',
          updatedAt: invoiceDate,
        }
      }
      return p
    })

    // Deposit paid amount if any
    const updatedAccounts = accounts.map((acc) => {
      if (acc.id === paymentAccount && amountPaid > 0) {
        return { ...acc, balance: acc.balance + amountPaid, updatedAt: invoiceDate }
      }
      return acc
    })

    // Update customer outstanding balance: Add unpaid balance
    const newCustomerBal = (party.currentBalance || 0) + balanceDue

    // Create ledger entry
    const newLedger: LedgerEntry = {
      id: `led-inv-${Date.now()}`,
      partyId: party.id,
      partyType: 'Customer',
      date: invoiceDate,
      referenceType: 'Invoice',
      referenceId: nextInvNum,
      description: `Delivery Shipment #${nextInvNum} (${items.map((i) => `${i.quantity}x ${i.name}`).join(', ')})`,
      debit: grandTotal,
      credit: amountPaid,
      balance: newCustomerBal,
    }

    onSave(newInvoice, updatedProducts, updatedAccounts, newLedger, newCustomerBal)
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal max-w-3xl" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Commercial Delivery & Logistics</p>
            <h2>Dispatch Bulk Delivery / Invoice</h2>
            <p className="text-xs text-gray-500">Party: <strong>{party.businessName || party.name}</strong> ({party.city})</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-xs font-semibold text-gray-700">
              Delivery Date *
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required className="w-full text-xs border border-gray-300 rounded p-1.5 mt-1" />
            </label>
            <label className="text-xs font-semibold text-gray-700">
              Payment Mode *
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full text-xs border border-gray-300 rounded p-1.5 mt-1">
                <option value="Cash">Cash (Driver / Counter)</option>
                <option value="Card">Card</option>
                <option value="Online">Online IBFT / Raast</option>
                <option value="Bank Transfer">Bank Deposit / Transfer</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-700">
              Deposit To Company Account
              <select value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value as any)} className="w-full text-xs border border-gray-300 rounded p-1.5 mt-1">
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Add Product Row */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Select Products for Shipment</span>
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1">
                <label className="text-[11px] text-gray-500 font-semibold block mb-1">Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded p-1.5 bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.quantity} {p.unit} · Wholesale: {formatPKR(p.wholesalePrice)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="text-[11px] text-gray-500 font-semibold block mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={addQty}
                  onChange={(e) => setAddQty(Number(e.target.value))}
                  className="w-full text-xs border border-gray-300 rounded p-1.5"
                />
              </div>
              <button type="button" className="button secondary text-xs py-1.5 h-auto whitespace-nowrap" onClick={handleAddItem}>
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-100 text-gray-600 font-semibold">
                <tr>
                  <th className="p-2 text-left">Product</th>
                  <th className="p-2 text-right">Quantity</th>
                  <th className="p-2 text-right">Unit Price</th>
                  <th className="p-2 text-right">Line Total</th>
                  <th className="p-2 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-bold text-gray-800">{it.name}</td>
                    <td className="p-2 text-right">{it.quantity} {it.unit}</td>
                    <td className="p-2 text-right">{formatPKR(it.unitPrice)}</td>
                    <td className="p-2 text-right font-bold text-gray-900">{formatPKR(it.total)}</td>
                    <td className="p-2 text-center">
                      <button type="button" className="text-red-500 hover:text-red-700" onClick={() => handleRemoveItem(idx)}>
                        <X className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-400">No items added to shipment yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals and Payment summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs">
            <div className="space-y-2">
              <label className="block text-gray-700 font-semibold">
                Delivery Notes / Vehicle / Driver
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Dispatched via Suzuki Carry # LEB-9021" className="w-full text-xs border border-gray-300 rounded p-1.5 mt-1 bg-white" />
              </label>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Attach Signed Delivery Receipt / Invoice Photo</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs" />
                {invoiceImage && <span className="text-emerald-600 font-bold block mt-1">✓ Photo attached</span>}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-bold">{formatPKR(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Special Discount (Rs):</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-24 text-right border border-gray-300 rounded p-1 text-xs bg-white"
                />
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold text-gray-900">
                <span>Shipment Grand Total:</span>
                <span className="text-base text-[#7cb518]">{formatPKR(grandTotal)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-200 pt-1.5">
                <span className="text-gray-700 font-bold">Amount Paid on Delivery (Rs):</span>
                <input
                  type="number"
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="w-28 text-right border border-gray-300 rounded p-1 text-xs font-bold bg-white text-emerald-700"
                />
              </div>
              <div className="flex justify-between font-bold text-amber-900 bg-amber-100/60 p-1.5 rounded">
                <span>Pending Balance for this Deal:</span>
                <span>{formatPKR(balanceDue)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="editor-actions mt-4">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            <Check className="w-4 h-4" /> Dispatch & Issue Delivery Invoice
          </button>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------------
// COMPONENT: RECORD PAYMENT MODAL (CASH / CARD / ONLINE WITH SCREENSHOT UPLOAD)
// ---------------------------------------------------------------------------------

function RecordPaymentModal({
  profile,
  accounts,
  onClose,
  onSave,
}: {
  profile: CustomerItem
  accounts: AppDatabase['accounts']
  onClose: () => void
  onSave: (payment: CustomerPaymentRecord, selectedAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank') => void
}) {
  const [amount, setAmount] = useState(profile.currentBalance > 0 ? profile.currentBalance : 50000)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Online' | 'Bank Transfer' | 'Cheque'>('Bank Transfer')
  const [paymentAccount, setPaymentAccount] = useState<'cash-in-hand' | 'meezan-bank' | 'hbl-bank'>('meezan-bank')
  const [transactionRef, setTransactionRef] = useState('')
  const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined)
  const [notes, setNotes] = useState('')

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setReceiptImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount.')
      return
    }

    const receiptNum = `REC-${Date.now().toString().slice(-6)}`
    const paymentRecord: CustomerPaymentRecord = {
      id: `pay-${Date.now()}`,
      receiptNumber: receiptNum,
      date,
      amount: Number(amount),
      paymentMethod: paymentMethod === 'Card' ? 'Online' : paymentMethod,
      paymentAccount,
      transactionRef: transactionRef.trim() || undefined,
      receiptImage,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    }

    onSave(paymentRecord, paymentAccount)
  }

  const newBalance = (profile.currentBalance || 0) - Number(amount || 0)

  return (
    <div className="editor-overlay">
      <form className="editor-modal max-w-lg" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Financial Settlement & Clearance</p>
            <h2>Record Payment Collection</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        {/* Current Balance Summary Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4 text-xs flex justify-between items-center">
          <div>
            <span className="text-amber-800 font-medium block">Party / Shop Name:</span>
            <strong className="text-gray-900 text-sm">{profile.businessName || profile.name}</strong>
          </div>
          <div className="text-right">
            <span className="text-amber-800 font-medium block">Current Outstanding Due:</span>
            <strong className="text-amber-900 text-sm font-black">{formatPKR(profile.currentBalance)}</strong>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Payment Amount Received (Rs) *
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
              className="text-base font-bold text-[#7cb518]"
            />
          </label>

          <label>
            Payment Date *
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>

          <label>
            Payment Method *
            <select
              value={paymentMethod}
              onChange={(e) => {
                const m = e.target.value as any
                setPaymentMethod(m)
                if (m === 'Cash') setPaymentAccount('cash-in-hand')
                else if (m === 'Bank Transfer' || m === 'Online' || m === 'Card') setPaymentAccount('meezan-bank')
              }}
            >
              <option value="Cash">Cash (Factory Counter / Driver Collection)</option>
              <option value="Online">Online IBFT / Raast / Mobile App</option>
              <option value="Bank Transfer">Direct Bank Deposit / Transfer</option>
              <option value="Card">Credit / Debit Card</option>
              <option value="Cheque">Bank Clearing Cheque</option>
            </select>
          </label>

          <label>
            Deposit To Account *
            <select value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value as any)}>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (Current: {formatPKR(acc.balance)})
                </option>
              ))}
            </select>
          </label>

          <label className="col-span-2">
            Transaction Reference / Slip / Cheque #
            <input
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. RAAST-88219 or MZB-IBFT-889123 or Cheque # 049281"
            />
          </label>

          {/* Screenshot Upload for Online / Bank Transfer */}
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 block">
              Attach Online Transaction Screenshot / Bank Slip Photo (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 hover:border-[#7cb518] rounded-xl p-3 text-center transition-colors bg-gray-50 flex flex-col items-center justify-center">
              {receiptImage ? (
                <div className="relative w-full flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <img src={receiptImage} alt="Receipt Preview" className="w-10 h-10 object-cover rounded" />
                    <span className="text-xs font-medium text-gray-800">Payment Screenshot Attached</span>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-red-600 font-bold px-2 py-1 hover:bg-red-50 rounded"
                    onClick={() => setReceiptImage(undefined)}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-1 text-xs text-gray-600">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span>Click to select or drag transaction receipt photo</span>
                  <span className="text-[10px] text-gray-400">Stored locally in offline storage</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>
          </div>

          <label className="col-span-2">
            Notes / Voucher Remarks
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Cleared via Raast online app or cash collection." />
          </label>
        </div>

        {/* Balance After Payment Preview */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mt-4 flex justify-between items-center text-xs">
          <span className="text-gray-600">Remaining Balance After Payment:</span>
          <strong className={newBalance > 0 ? 'text-amber-700 font-black text-sm' : 'text-emerald-700 font-black text-sm'}>
            {formatPKR(newBalance)}
          </strong>
        </div>

        <div className="editor-actions mt-4">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            <Check className="w-4 h-4" /> Save & Issue Receipt
          </button>
        </div>
      </form>
    </div>
  )
}
