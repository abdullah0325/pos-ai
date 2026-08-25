'use client'

import { useState, useMemo, useRef } from 'react'
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  FileText,
  Download,
  Share2,
  UploadCloud,
  X,
  CreditCard,
  Building2,
  Truck,
  User,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  Receipt,
  Phone,
  MapPin,
  Check,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  fileToBase64,
  type AppDatabase,
  type ProductItem,
  type CustomerItem,
  type InvoiceItem,
  type InvoiceLineItem,
  type LedgerEntry,
  type CustomerType,
} from '@/lib/db'
import { generateInvoicePDF } from '@/lib/pdf-export'

interface PosViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigate?: (module: string) => void
}

export type SaleType = 'Retail' | 'Distributor' | 'Wholesale'

export interface CartItem {
  product: ProductItem
  quantity: number
  unitPrice: number
  pricingTier: 'Retail' | 'Wholesale'
  discountType: 'percent' | 'fixed'
  discountValue: number
  discountAmount: number
  lineTotal: number
}

export default function PosView({ db, onSaveDatabase, onNavigate }: PosViewProps) {
  // 1. Sale Type Selection: Retail / Distributor / Wholesaler
  const [saleType, setSaleType] = useState<SaleType>('Retail')

  // Selected profile for Distributor / Wholesaler
  const [selectedPartyId, setSelectedPartyId] = useState<string>('')
  const [partySearchQuery, setPartySearchQuery] = useState('')
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false)

  // Retail customer details
  const [retailCustomerName, setRetailCustomerName] = useState('Walk-in Retail Customer')
  const [retailCustomerPhone, setRetailCustomerPhone] = useState('')
  const [retailCustomerAddress, setRetailCustomerAddress] = useState('Factory Gate Counter')

  // 2. Product Search and Category Filter
  const [productQuery, setProductQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // 3. Cart State
  const [cart, setCart] = useState<CartItem[]>([])

  // 4. Cart-Level Discount
  const [cartDiscountType, setCartDiscountType] = useState<'percent' | 'fixed'>('fixed')
  const [cartDiscountValue, setCartDiscountValue] = useState<number>(0)

  // 5. Checkout & Payment Modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Unpaid'>('Paid')
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Online'>('Cash')
  const [paymentAccount, setPaymentAccount] = useState<'cash-in-hand' | 'meezan-bank' | 'hbl-bank'>('cash-in-hand')
  const [amountPaid, setAmountPaid] = useState<number>(0)
  const [paymentScreenshot, setPaymentScreenshot] = useState<string>('')
  const [orderNotes, setOrderNotes] = useState('')

  // 6. Post-Checkout Confirmation & Print Modal
  const [completedInvoice, setCompletedInvoice] = useState<InvoiceItem | null>(null)
  const [viewingScreenshotModal, setViewingScreenshotModal] = useState<string | null>(null)
  const [printMode, setPrintMode] = useState<'thermal' | 'a4'>('thermal')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filtered distributor/wholesaler customer list
  const partyList = useMemo(() => {
    if (saleType === 'Distributor') {
      return db.customers.filter((c) => c.type === 'Distributor')
    }
    if (saleType === 'Wholesale') {
      return db.customers.filter((c) => c.type === 'Wholesaler')
    }
    return []
  }, [db.customers, saleType])

  // Filtered party list for searchable dropdown
  const filteredPartyList = useMemo(() => {
    const q = partySearchQuery.trim().toLowerCase()
    if (!q) return partyList
    return partyList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.businessName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.city.toLowerCase().includes(q)
    )
  }, [partyList, partySearchQuery])

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (saleType === 'Retail') {
      return null
    }
    return db.customers.find((c) => c.id === selectedPartyId) || null
  }, [db.customers, saleType, selectedPartyId])

  // Extract all categories from products & categories db
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    db.products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    db.categories.forEach((c) => {
      if (c.name) set.add(c.name)
    })
    return ['All', ...Array.from(set)]
  }, [db.products, db.categories])

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    return db.products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [db.products, selectedCategory, productQuery])

  // Helper: determine unit price based on qty, product limits, and saleType
  const getProductPriceForQty = (
    product: ProductItem,
    qty: number,
    currentSaleType: SaleType
  ): { price: number; tier: 'Retail' | 'Wholesale' } => {
    const wholesaleLimit = product.wholesaleMinQty && product.wholesaleMinQty > 0 ? product.wholesaleMinQty : 12

    // If sale type is Distributor or Wholesale, or if quantity meets wholesale limit
    if (currentSaleType === 'Distributor' || currentSaleType === 'Wholesale' || qty >= wholesaleLimit) {
      return { price: product.wholesalePrice, tier: 'Wholesale' }
    }
    return { price: product.retailPrice, tier: 'Retail' }
  }

  // Calculate line item discount & total
  const calculateItemLine = (
    product: ProductItem,
    qty: number,
    currentSaleType: SaleType,
    discountType: 'percent' | 'fixed' = 'fixed',
    discountValue: number = 0,
    forcedTier?: 'Retail' | 'Wholesale'
  ): CartItem => {
    let tier: 'Retail' | 'Wholesale'
    let unitPrice: number

    if (forcedTier) {
      tier = forcedTier
      unitPrice = forcedTier === 'Wholesale' ? product.wholesalePrice : product.retailPrice
    } else {
      const calculated = getProductPriceForQty(product, qty, currentSaleType)
      tier = calculated.tier
      unitPrice = calculated.price
    }

    const grossTotal = unitPrice * qty
    let discountAmount = 0

    if (discountType === 'percent') {
      const pct = Math.min(100, Math.max(0, Number(discountValue) || 0))
      discountAmount = Math.round((grossTotal * pct) / 100)
    } else {
      discountAmount = Math.min(grossTotal, Math.max(0, Number(discountValue) || 0))
    }

    const lineTotal = Math.max(0, grossTotal - discountAmount)

    return {
      product,
      quantity: qty,
      unitPrice,
      pricingTier: tier,
      discountType,
      discountValue,
      discountAmount,
      lineTotal,
    }
  }

  // Handle adding product to cart
  const handleAddToCart = (product: ProductItem) => {
    const existingIndex = cart.findIndex((item) => item.product.id === product.id)
    if (existingIndex >= 0) {
      const existing = cart[existingIndex]
      const newQty = existing.quantity + 1
      const updatedItem = calculateItemLine(
        product,
        newQty,
        saleType,
        existing.discountType,
        existing.discountValue
      )
      const newCart = [...cart]
      newCart[existingIndex] = updatedItem
      setCart(newCart)
    } else {
      const newItem = calculateItemLine(product, 1, saleType, 'fixed', 0)
      setCart([...cart, newItem])
    }
  }

  // Handle updating quantity
  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index)
      return
    }
    const current = cart[index]
    const updated = calculateItemLine(
      current.product,
      newQty,
      saleType,
      current.discountType,
      current.discountValue
    )
    const newCart = [...cart]
    newCart[index] = updated
    setCart(newCart)
  }

  // Handle updating per-item discount
  const handleUpdateItemDiscount = (
    index: number,
    type: 'percent' | 'fixed',
    val: number
  ) => {
    const current = cart[index]
    const updated = calculateItemLine(
      current.product,
      current.quantity,
      saleType,
      type,
      val
    )
    const newCart = [...cart]
    newCart[index] = updated
    setCart(newCart)
  }

  // Handle manual toggle of pricing tier on an item
  const handleToggleItemTier = (index: number) => {
    const current = cart[index]
    const nextTier: 'Retail' | 'Wholesale' = current.pricingTier === 'Retail' ? 'Wholesale' : 'Retail'
    const updated = calculateItemLine(
      current.product,
      current.quantity,
      saleType,
      current.discountType,
      current.discountValue,
      nextTier
    )
    const newCart = [...cart]
    newCart[index] = updated
    setCart(newCart)
  }

  // Remove item from cart
  const handleRemoveItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  // Recalculate cart when Sale Type changes
  const handleSaleTypeChange = (newType: SaleType) => {
    setSaleType(newType)
    setSelectedPartyId('')
    setPartySearchQuery('')
    setIsPartyDropdownOpen(false)

    // Re-evaluate pricing for items in cart
    const reevaluatedCart = cart.map((item) =>
      calculateItemLine(
        item.product,
        item.quantity,
        newType,
        item.discountType,
        item.discountValue
      )
    )
    setCart(reevaluatedCart)
  }

  // Calculations
  const grossSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  }, [cart])

  const totalItemDiscounts = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.discountAmount, 0)
  }, [cart])

  const subtotalAfterItemDiscounts = Math.max(0, grossSubtotal - totalItemDiscounts)

  const overallCartDiscountAmount = useMemo(() => {
    if (cartDiscountType === 'percent') {
      const pct = Math.min(100, Math.max(0, Number(cartDiscountValue) || 0))
      return Math.round((subtotalAfterItemDiscounts * pct) / 100)
    }
    return Math.min(subtotalAfterItemDiscounts, Math.max(0, Number(cartDiscountValue) || 0))
  }, [cartDiscountType, cartDiscountValue, subtotalAfterItemDiscounts])

  const totalDiscountsCombined = totalItemDiscounts + overallCartDiscountAmount
  const grandTotal = Math.max(0, grossSubtotal - totalDiscountsCombined)
  const totalUnitsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Open checkout drawer
  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      alert('Your cart is empty. Please select products from the catalog.')
      return
    }

    if ((saleType === 'Distributor' || saleType === 'Wholesale') && !selectedCustomer) {
      alert(`Please select an existing ${saleType} profile from the dropdown before checkout.`)
      return
    }

    // Default amount paid based on status
    if (paymentStatus === 'Paid') {
      setAmountPaid(grandTotal)
    } else if (paymentStatus === 'Unpaid') {
      setAmountPaid(0)
    } else {
      setAmountPaid(Math.round(grandTotal / 2))
    }

    setShowCheckoutModal(true)
  }

  // Screenshot upload handler
  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const b64 = await fileToBase64(file)
      setPaymentScreenshot(b64)
    } catch (err) {
      console.error('Failed to read image:', err)
      alert('Could not attach screenshot file.')
    }
  }

  // Handle completing sale and generating invoice
  const handleCompleteSale = () => {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    const nextInvoiceNumber = `POS-${now.getFullYear()}-${1000 + db.invoices.length + 1}`

    const customerId =
      saleType === 'Retail'
        ? 'cust-retail-walkin'
        : selectedCustomer?.id || `cust-${Date.now()}`

    const customerName =
      saleType === 'Retail'
        ? retailCustomerName.trim() || 'Walk-in Retail Customer'
        : selectedCustomer?.businessName || selectedCustomer?.name || 'Commercial Client'

    const customerType: CustomerType =
      saleType === 'Distributor'
        ? 'Distributor'
        : saleType === 'Wholesale'
        ? 'Wholesaler'
        : 'Counter'

    const phone =
      saleType === 'Retail'
        ? retailCustomerPhone || '—'
        : selectedCustomer?.phone || '—'

    const address =
      saleType === 'Retail'
        ? retailCustomerAddress || 'Factory Gate Counter'
        : selectedCustomer?.address || 'Pakistan'

    const effectiveAmountPaid =
      paymentStatus === 'Paid'
        ? grandTotal
        : paymentStatus === 'Unpaid'
        ? 0
        : Math.min(grandTotal, Math.max(0, Number(amountPaid) || 0))

    const balanceDue = Math.max(0, grandTotal - effectiveAmountPaid)

    // Build Invoice Line Items
    const invoiceLines: InvoiceLineItem[] = cart.map((c) => ({
      productId: c.product.id,
      name: c.product.name,
      quantity: c.quantity,
      unit: c.product.unit,
      unitPrice: c.unitPrice,
      costPrice: c.product.costPrice,
      discount: c.discountAmount,
      discountType: c.discountType,
      discountValue: c.discountValue,
      pricingTier: c.pricingTier,
      total: c.lineTotal,
    }))

    // Build Invoice Object
    const newInvoice: InvoiceItem = {
      id: `inv-${Date.now()}`,
      invoiceNumber: nextInvoiceNumber,
      date: dateStr,
      time: timeStr,
      customerId,
      customerName,
      customerType,
      partyId: selectedCustomer?.id || undefined,
      phone,
      address,
      saleType: saleType === 'Distributor' ? 'Distributor' : saleType === 'Wholesale' ? 'Wholesale' : 'Counter',
      items: invoiceLines,
      subtotal: grossSubtotal,
      discount: totalDiscountsCombined,
      cartDiscountType,
      cartDiscountValue,
      tax: 0,
      grandTotal,
      amountPaid: effectiveAmountPaid,
      balanceDue,
      paymentMethod,
      paymentScreenshot: paymentScreenshot || undefined,
      paymentAccount,
      status: paymentStatus,
      deliveryStatus: 'Delivered',
      notes: orderNotes.trim() || `POS Point-of-Sale (${saleType})`,
      createdAt: now.toISOString(),
    }

    // 1. Deduct Product Stock from Product Management
    const updatedProducts = db.products.map((p) => {
      const matched = cart.find((item) => item.product.id === p.id)
      if (matched) {
        const remaining = Math.max(0, p.quantity - matched.quantity)
        return {
          ...p,
          quantity: remaining,
          status: remaining <= 0 ? 'Out of stock' : remaining <= p.reorderLevel ? 'Low stock' : 'In stock',
          updatedAt: dateStr,
        }
      }
      return p
    })

    // 2. Update Customer Balance (Distributor / Wholesaler)
    let updatedCustomers = [...db.customers]
    const newLedgerEntries: LedgerEntry[] = []

    if (selectedCustomer) {
      updatedCustomers = db.customers.map((c) => {
        if (c.id === selectedCustomer.id) {
          return {
            ...c,
            currentBalance: c.currentBalance + balanceDue,
            updatedAt: dateStr,
          }
        }
        return c
      })

      // Add Ledger Entry for Invoice Debit
      newLedgerEntries.push({
        id: `led-${Date.now()}-inv`,
        partyId: selectedCustomer.id,
        partyType: 'Customer',
        date: dateStr,
        referenceType: 'Invoice',
        referenceId: nextInvoiceNumber,
        description: `POS Invoice #${nextInvoiceNumber} (${cart.length} items)`,
        debit: grandTotal,
        credit: 0,
        balance: selectedCustomer.currentBalance + grandTotal,
      })

      // Add Ledger Entry for Payment Credit if any paid
      if (effectiveAmountPaid > 0) {
        newLedgerEntries.push({
          id: `led-${Date.now()}-pay`,
          partyId: selectedCustomer.id,
          partyType: 'Customer',
          date: dateStr,
          referenceType: 'Payment',
          referenceId: `REC-${nextInvoiceNumber}`,
          description: `POS Payment received via ${paymentMethod} (${paymentAccount})`,
          debit: 0,
          credit: effectiveAmountPaid,
          balance: selectedCustomer.currentBalance + grandTotal - effectiveAmountPaid,
        })
      }
    }

    // 3. Update Deposit Account Balance with amountPaid
    const updatedAccounts = db.accounts.map((acc) => {
      if (acc.id === paymentAccount && effectiveAmountPaid > 0) {
        return {
          ...acc,
          balance: acc.balance + effectiveAmountPaid,
          updatedAt: dateStr,
        }
      }
      return acc
    })

    // 4. Save Database
    const updatedDb: AppDatabase = {
      ...db,
      invoices: [newInvoice, ...db.invoices],
      products: updatedProducts,
      customers: updatedCustomers,
      accounts: updatedAccounts,
      ledgers: [...newLedgerEntries, ...db.ledgers],
    }

    onSaveDatabase(updatedDb)

    // Set completed invoice for immediate printing and summary
    setCompletedInvoice(newInvoice)
    setShowCheckoutModal(false)

    // Reset checkout form fields
    setPaymentScreenshot('')
    setOrderNotes('')
  }

  // Reset POS for next sale
  const handleResetPOS = () => {
    setCart([])
    setCartDiscountValue(0)
    setCompletedInvoice(null)
    setPaymentStatus('Paid')
    setPaymentMethod('Cash')
    setAmountPaid(0)
    setPaymentScreenshot('')
  }

  // Trigger printer
  const handleDirectPrint = () => {
    window.print()
  }

  // Download PDF
  const handleDownloadPDF = () => {
    if (!completedInvoice) return
    generateInvoicePDF(completedInvoice, selectedCustomer || undefined)
  }

  // Copy WhatsApp receipt text
  const handleCopyWhatsApp = () => {
    if (!completedInvoice) return
    const lines = completedInvoice.items
      .map(
        (it) =>
          `• ${it.name} x ${it.quantity} ${it.unit} @ ${formatPKR(it.unitPrice)} = ${formatPKR(it.total)}`
      )
      .join('\n')

    const text = `*AL FAROOQ FOODS - SALE RECEIPT*\n` +
      `*Invoice #:* ${completedInvoice.invoiceNumber}\n` +
      `*Date:* ${formatDate(completedInvoice.date)} ${completedInvoice.time || ''}\n` +
      `*Customer:* ${completedInvoice.customerName}\n` +
      `--------------------------------\n` +
      `${lines}\n` +
      `--------------------------------\n` +
      `*Subtotal:* ${formatPKR(completedInvoice.subtotal)}\n` +
      (completedInvoice.discount > 0 ? `*Discount:* -${formatPKR(completedInvoice.discount)}\n` : '') +
      `*Grand Total:* ${formatPKR(completedInvoice.grandTotal)}\n` +
      `*Paid:* ${formatPKR(completedInvoice.amountPaid)} (${completedInvoice.paymentMethod})\n` +
      `*Balance Due:* ${formatPKR(completedInvoice.balanceDue)}\n` +
      `*Status:* ${completedInvoice.status}\n\n` +
      `_Thank you for choosing Al-Farooq Foods!_`

    navigator.clipboard.writeText(text)
    alert('Receipt slip copied to clipboard! You can paste it into WhatsApp.')
  }

  return (
    <div className="page-stack" id="pos-terminal-module">
      {/* 1. TOP HEADER & SALE TYPE SELECTOR */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm space-y-4 pos-no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#7cb518]/15 text-[#5e8c10] text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Point of Sale Terminal
              </span>
              <span className="text-xs text-gray-500 font-medium">100% Offline SQLite Local Engine</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 mt-1">Direct Sales & POS Counter</h1>
          </div>

          {/* Action reset / view invoices */}
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                type="button"
                className="button secondary text-xs text-rose-600 hover:text-rose-700"
                onClick={() => {
                  if (confirm('Are you sure you want to clear the current cart?')) {
                    setCart([])
                    setCartDiscountValue(0)
                  }
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Cart ({cart.length})
              </button>
            )}
            {onNavigate && (
              <button
                type="button"
                className="button secondary text-xs"
                onClick={() => onNavigate('invoices')}
              >
                <FileText className="w-3.5 h-3.5" /> View Sales History
              </button>
            )}
          </div>
        </div>

        {/* SALE TYPE PILLS SELECTOR */}
        <div className="pt-2 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Retail Button */}
          <button
            type="button"
            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              saleType === 'Retail'
                ? 'border-[#7cb518] bg-[#7cb518]/10 text-gray-900 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 text-gray-600'
            }`}
            onClick={() => handleSaleTypeChange('Retail')}
            id="sale-type-retail"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                saleType === 'Retail' ? 'bg-[#7cb518] text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Tier 1</div>
              <div className="text-sm font-black">Retail Customer</div>
              <div className="text-[11px] text-gray-500">Counter walk-in & retail pricing</div>
            </div>
          </button>

          {/* Distributor Button */}
          <button
            type="button"
            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              saleType === 'Distributor'
                ? 'border-[#7cb518] bg-[#7cb518]/10 text-gray-900 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 text-gray-600'
            }`}
            onClick={() => handleSaleTypeChange('Distributor')}
            id="sale-type-distributor"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                saleType === 'Distributor' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Tier 2</div>
              <div className="text-sm font-black">Distributor Account</div>
              <div className="text-[11px] text-gray-500">Area distributors & bulk supply</div>
            </div>
          </button>

          {/* Wholesaler Button */}
          <button
            type="button"
            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              saleType === 'Wholesale'
                ? 'border-[#7cb518] bg-[#7cb518]/10 text-gray-900 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 text-gray-600'
            }`}
            onClick={() => handleSaleTypeChange('Wholesale')}
            id="sale-type-wholesale"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                saleType === 'Wholesale' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Tier 3</div>
              <div className="text-sm font-black">Wholesaler Account</div>
              <div className="text-[11px] text-gray-500">Market wholesale buyers & traders</div>
            </div>
          </button>
        </div>

        {/* CUSTOMER / DISTRIBUTOR / WHOLESALER PROFILE SELECTION */}
        <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
          {saleType === 'Retail' ? (
            /* Retail Walk-in Customer Fields */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Retail Customer Name
                </label>
                <input
                  value={retailCustomerName}
                  onChange={(e) => setRetailCustomerName(e.target.value)}
                  placeholder="e.g. Walk-in Retail Customer"
                  className="w-full text-xs bg-white border border-gray-300 rounded-lg p-2 font-medium"
                  id="input-retail-customer-name"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  value={retailCustomerPhone}
                  onChange={(e) => setRetailCustomerPhone(e.target.value)}
                  placeholder="e.g. 0300-1234567"
                  className="w-full text-xs bg-white border border-gray-300 rounded-lg p-2 font-medium"
                  id="input-retail-customer-phone"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Delivery / Counter Note
                </label>
                <input
                  value={retailCustomerAddress}
                  onChange={(e) => setRetailCustomerAddress(e.target.value)}
                  placeholder="e.g. Factory Gate Counter"
                  className="w-full text-xs bg-white border border-gray-300 rounded-lg p-2 font-medium"
                  id="input-retail-customer-address"
                />
              </div>
            </div>
          ) : (
            /* Searchable Dropdown for Distributor / Wholesaler */
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#7cb518]" />
                  Select Registered {saleType} Profile (Name + ID shown):
                </span>
                <span className="text-[11px] text-gray-500 font-medium">
                  {partyList.length} registered {saleType.toLowerCase()}s in system
                </span>
              </div>

              <div className="relative">
                {/* Select button / search input */}
                <div
                  className="bg-white border-2 border-gray-300 rounded-xl p-2.5 flex items-center justify-between cursor-pointer hover:border-[#7cb518] transition-colors"
                  onClick={() => setIsPartyDropdownOpen(!isPartyDropdownOpen)}
                  id="btn-select-party-dropdown"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {selectedCustomer ? (
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-xs font-black bg-purple-100 text-purple-900 px-2 py-0.5 rounded">
                          {selectedCustomer.id.toUpperCase()}
                        </span>
                        <strong className="text-xs text-gray-900 truncate">
                          {selectedCustomer.businessName} ({selectedCustomer.name})
                        </strong>
                        <span className="text-[11px] text-gray-500 hidden md:inline">
                          — {selectedCustomer.city} • {selectedCustomer.phone}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">
                        Click to search and select {saleType} profile (ID & Name)...
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isPartyDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Dropdown Menu */}
                {isPartyDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-gray-300 rounded-xl shadow-xl p-2 max-h-72 overflow-y-auto">
                    <div className="p-1 mb-2 sticky top-0 bg-white">
                      <div className="search-box">
                        <Search className="w-3.5 h-3.5 text-gray-400" />
                        <input
                          autoFocus
                          placeholder={`Search ${saleType.toLowerCase()} by ID, name, business, phone or city...`}
                          value={partySearchQuery}
                          onChange={(e) => setPartySearchQuery(e.target.value)}
                          className="text-xs"
                          id="input-party-search-query"
                        />
                        {partySearchQuery && (
                          <button
                            type="button"
                            className="text-xs text-gray-400 hover:text-gray-600"
                            onClick={() => setPartySearchQuery('')}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      {filteredPartyList.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-500">
                          No {saleType.toLowerCase()} profiles found matching &ldquo;{partySearchQuery}&rdquo;.
                        </div>
                      ) : (
                        filteredPartyList.map((p) => {
                          const isSelected = p.id === selectedPartyId
                          return (
                            <div
                              key={p.id}
                              className={`p-2.5 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                                isSelected ? 'bg-[#7cb518]/15 border border-[#7cb518]' : 'hover:bg-gray-100'
                              }`}
                              onClick={() => {
                                setSelectedPartyId(p.id)
                                setIsPartyDropdownOpen(false)
                              }}
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-bold bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded">
                                    {p.id.toUpperCase()}
                                  </span>
                                  <span className="font-bold text-xs text-gray-900 truncate">
                                    {p.businessName || p.name}
                                  </span>
                                  {p.businessName && (
                                    <span className="text-[11px] text-gray-500 truncate">
                                      ({p.name})
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                                  <span><Phone className="w-3 h-3 inline mr-0.5" />{p.phone}</span>
                                  <span>•</span>
                                  <span><MapPin className="w-3 h-3 inline mr-0.5" />{p.city}</span>
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                <div className="text-xs font-bold text-gray-900">
                                  Bal: <span className={p.currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}>{formatPKR(p.currentBalance)}</span>
                                </div>
                                <div className="text-[10px] text-gray-500">
                                  Limit: {formatPKR(p.creditLimit)}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Profile Banner */}
              {selectedCustomer && (
                <div className="bg-white p-3 rounded-lg border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-bold block">Party ID & Name</span>
                    <strong className="text-gray-900 block font-mono">{selectedCustomer.id.toUpperCase()}</strong>
                    <span className="text-gray-600 truncate block">{selectedCustomer.businessName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-bold block">Contact Person</span>
                    <strong className="text-gray-900 block">{selectedCustomer.name}</strong>
                    <span className="text-gray-600 block">{selectedCustomer.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-bold block">Credit Limit</span>
                    <strong className="text-gray-900 block">{formatPKR(selectedCustomer.creditLimit)}</strong>
                    <span className="text-[10px] text-gray-500">{selectedCustomer.city}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-bold block">Outstanding Balance</span>
                    <strong
                      className={`text-sm block font-black ${
                        selectedCustomer.currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {formatPKR(selectedCustomer.currentBalance)}
                    </strong>
                    <span className="text-[10px] text-gray-500">
                      {selectedCustomer.currentBalance > selectedCustomer.creditLimit * 0.9
                        ? '⚠️ Near Credit Limit'
                        : 'Account in Good Standing'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN POS WORKSPACE: PRODUCTS CATALOG (LEFT) + CART SUMMARY (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pos-no-print">
        {/* LEFT COLUMN: PRODUCT CATALOG */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Filter */}
          <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="search-box">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                placeholder="Search products by name, SKU code, package size, category..."
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                id="input-pos-product-search"
              />
              {productQuery && (
                <button
                  type="button"
                  className="text-xs text-gray-400 hover:text-gray-600 mr-2"
                  onClick={() => setProductQuery('')}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {availableCategories.map((cat) => {
                const isActive = selectedCategory === cat
                const count =
                  cat === 'All'
                    ? db.products.length
                    : db.products.filter((p) => p.category === cat).length

                return (
                  <button
                    key={cat}
                    type="button"
                    className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#7cb518] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="font-bold text-sm text-gray-800">No products found</p>
                <p className="text-xs text-gray-400">Try changing your search terms or category filter.</p>
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const inCart = cart.find((item) => item.product.id === prod.id)
                const isOutOfStock = prod.quantity <= 0
                const isLowStock = prod.quantity <= prod.reorderLevel && prod.quantity > 0
                const wholesaleLimit = prod.wholesaleMinQty || 12

                return (
                  <div
                    key={prod.id}
                    className={`bg-white border rounded-xl p-3.5 flex flex-col justify-between transition-all hover:shadow-md cursor-pointer relative group ${
                      inCart
                        ? 'border-[#7cb518] ring-1 ring-[#7cb518] bg-[#7cb518]/5'
                        : isOutOfStock
                        ? 'border-gray-200 opacity-60 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => !isOutOfStock && handleAddToCart(prod)}
                  >
                    {/* In-cart count badge */}
                    {inCart && (
                      <div className="absolute -top-2 -right-2 bg-[#7cb518] text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow">
                        {inCart.quantity}
                      </div>
                    )}

                    <div>
                      {/* Product Header & Image */}
                      <div className="flex items-start gap-2.5 mb-2">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-gray-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-mono text-gray-500 uppercase block">
                            {prod.sku}
                          </span>
                          <h3 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">
                            {prod.name}
                          </h3>
                        </div>
                      </div>

                      {/* Category & Unit */}
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-2">
                        <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-medium">
                          {prod.category}
                        </span>
                        <span className="font-semibold text-gray-700">
                          {prod.size ? `${prod.size} ${prod.sizeUnit || ''} ` : ''}({prod.unit})
                        </span>
                      </div>

                      {/* Stock Indicator */}
                      <div className="flex items-center justify-between text-[11px] mb-3">
                        <span
                          className={`font-bold ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {isOutOfStock
                            ? 'Out of Stock'
                            : `Stock: ${prod.quantity} ${prod.unit}`}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          MOQ: ≥{wholesaleLimit}
                        </span>
                      </div>
                    </div>

                    {/* Price & Add Button */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">
                          {saleType === 'Retail' ? 'Retail Price' : 'Wholesale Price'}
                        </div>
                        <div className="text-sm font-black text-gray-900">
                          {formatPKR(saleType === 'Retail' ? prod.retailPrice : prod.wholesalePrice)}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {saleType === 'Retail'
                            ? `Wholesale: ${formatPKR(prod.wholesalePrice)} (≥${wholesaleLimit})`
                            : `Retail: ${formatPKR(prod.retailPrice)}`}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isOutOfStock}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          isOutOfStock
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-[#7cb518] hover:bg-[#6fa315] text-white shadow-sm'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!isOutOfStock) handleAddToCart(prod)
                        }}
                        title="Add to cart"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: POS CART & LIVE CHECKOUT CALCULATOR */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm flex flex-col h-full justify-between">
            <div>
              {/* Cart Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#7cb518]" />
                  <div>
                    <h2 className="text-base font-black text-gray-900">Active Sale Cart</h2>
                    <p className="text-[11px] text-gray-500">
                      {cart.length} item(s) • {totalUnitsCount} total units
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold bg-[#7cb518]/15 text-[#5e8c10] px-2.5 py-1 rounded-full uppercase">
                    {saleType} Sale
                  </span>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="divide-y divide-gray-100 max-h-[48vh] overflow-y-auto my-2 pr-1 space-y-2">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-600">Your sale cart is empty</p>
                    <p className="text-[11px] text-gray-400">Click any product from the catalog on the left.</p>
                  </div>
                ) : (
                  cart.map((item, idx) => {
                    const wholesaleMin = item.product.wholesaleMinQty || 12
                    const meetsWholesale = item.quantity >= wholesaleMin

                    return (
                      <div key={item.product.id} className="pt-2.5 pb-2">
                        {/* Item Row 1: Title & Remove */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-gray-900 truncate">
                              {item.product.name}
                            </h4>
                            <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono">{item.product.sku}</span>
                              <span>•</span>
                              <button
                                type="button"
                                className={`font-bold px-1.5 py-0.2 rounded text-[10px] transition-colors ${
                                  item.pricingTier === 'Wholesale'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                                onClick={() => handleToggleItemTier(idx)}
                                title="Click to switch between Retail & Wholesale tier"
                              >
                                {item.pricingTier} Tier ({formatPKR(item.unitPrice)}/{item.product.unit})
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="text-gray-400 hover:text-rose-600 p-1 transition-colors"
                            onClick={() => handleRemoveItem(idx)}
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Item Row 2: Quantity Controls & Price */}
                        <div className="flex items-center justify-between gap-2 mt-2">
                          {/* Quantity Counter */}
                          <div className="flex items-center border border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
                            <button
                              type="button"
                              className="px-2.5 py-1 text-gray-600 hover:bg-gray-200 text-xs font-bold"
                              onClick={() => handleUpdateQty(idx, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQty(idx, Number(e.target.value))}
                              className="w-14 text-center text-xs font-bold bg-white border-0 py-1 focus:ring-0"
                            />
                            <button
                              type="button"
                              className="px-2.5 py-1 text-gray-600 hover:bg-gray-200 text-xs font-bold"
                              onClick={() => handleUpdateQty(idx, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="text-right">
                            <div className="text-xs font-black text-gray-900">
                              {formatPKR(item.lineTotal)}
                            </div>
                            {item.discountAmount > 0 && (
                              <div className="text-[10px] text-rose-600 font-semibold">
                                -{formatPKR(item.discountAmount)} off
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Item Row 3: Manual Item Discount Drawer */}
                        <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-dashed border-gray-100 text-[11px]">
                          <span className="text-gray-500">Item Discount:</span>
                          <div className="flex items-center gap-1">
                            <select
                              value={item.discountType}
                              onChange={(e) =>
                                handleUpdateItemDiscount(idx, e.target.value as any, item.discountValue)
                              }
                              className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-gray-50"
                            >
                              <option value="fixed">Rs.</option>
                              <option value="percent">%</option>
                            </select>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.discountValue || ''}
                              onChange={(e) =>
                                handleUpdateItemDiscount(idx, item.discountType, Number(e.target.value))
                              }
                              placeholder="0"
                              className="w-14 text-right text-[11px] border border-gray-200 rounded px-1 py-0.5 bg-white font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* CART TOTALS & CHECKOUT FOOTER */}
            <div className="pt-3 border-t border-gray-200 space-y-2.5">
              {/* Cart-level Discount Input */}
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-700">Extra Cart Discount:</span>
                <div className="flex items-center gap-1.5">
                  <select
                    value={cartDiscountType}
                    onChange={(e) => setCartDiscountType(e.target.value as any)}
                    className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white font-medium"
                  >
                    <option value="fixed">Fixed (Rs.)</option>
                    <option value="percent">Percentage (%)</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={cartDiscountValue || ''}
                    onChange={(e) => setCartDiscountValue(Number(e.target.value))}
                    placeholder="0"
                    className="w-20 text-right text-xs border border-gray-300 rounded-md px-2 py-1 bg-white font-bold"
                  />
                </div>
              </div>

              {/* Subtotals breakdown */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Gross Subtotal</span>
                  <span className="font-semibold">{formatPKR(grossSubtotal)}</span>
                </div>

                {totalDiscountsCombined > 0 && (
                  <div className="flex justify-between text-rose-600 font-medium">
                    <span>Total Discounts (Items + Cart)</span>
                    <span>- {formatPKR(totalDiscountsCombined)}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2 border-t border-gray-200">
                  <div>
                    <span className="text-sm font-black text-gray-900 block">Net Grand Total</span>
                    <span className="text-[10px] text-gray-400">All taxes included</span>
                  </div>
                  <div className="text-xl font-black text-[#7cb518]">
                    {formatPKR(grandTotal)}
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                disabled={cart.length === 0}
                className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                  cart.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                    : 'bg-[#7cb518] hover:bg-[#6ea115] text-white shadow-[#7cb518]/30 active:scale-[0.99]'
                }`}
                onClick={handleOpenCheckout}
                id="btn-pos-checkout"
              >
                <CheckCircle2 className="w-4 h-4" /> Proceed to Checkout & Invoice
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CHECKOUT & PAYMENT MODAL */}
      {showCheckoutModal && (
        <div className="editor-overlay pos-no-print">
          <div className="editor-modal large">
            <div className="editor-header">
              <div className="flex items-center gap-2">
                <Receipt className="w-6 h-6 text-[#7cb518]" />
                <div>
                  <p className="eyebrow">POS Sale Checkout</p>
                  <h2>Finalize & Generate Invoice</h2>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowCheckoutModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              {/* SUMMARY BOX */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Customer / Buyer</span>
                  <strong className="text-gray-900 text-xs block truncate">
                    {saleType === 'Retail' ? retailCustomerName : selectedCustomer?.businessName || selectedCustomer?.name}
                  </strong>
                  <span className="text-[10px] text-gray-500">{saleType} Sale</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Items & Packs</span>
                  <strong className="text-gray-900 text-xs block">{cart.length} distinct item(s)</strong>
                  <span className="text-[10px] text-gray-500">{totalUnitsCount} units total</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Total Savings</span>
                  <strong className="text-rose-600 text-xs block">{formatPKR(totalDiscountsCombined)}</strong>
                  <span className="text-[10px] text-gray-500">Discounts applied</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Total Payable</span>
                  <strong className="text-base font-black text-[#7cb518] block">{formatPKR(grandTotal)}</strong>
                </div>
              </div>

              {/* PAYMENT STATUS SELECTOR */}
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2">
                <label className="text-xs font-bold text-gray-800 block">
                  1. Payment Status *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className={`py-2 rounded-lg font-bold text-xs border transition-all ${
                      paymentStatus === 'Paid'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      setPaymentStatus('Paid')
                      setAmountPaid(grandTotal)
                    }}
                  >
                    Paid (Full Rs. {grandTotal.toLocaleString()})
                  </button>

                  <button
                    type="button"
                    className={`py-2 rounded-lg font-bold text-xs border transition-all ${
                      paymentStatus === 'Partial'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      setPaymentStatus('Partial')
                      setAmountPaid(Math.round(grandTotal / 2))
                    }}
                  >
                    Partial Payment
                  </button>

                  <button
                    type="button"
                    className={`py-2 rounded-lg font-bold text-xs border transition-all ${
                      paymentStatus === 'Unpaid'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      setPaymentStatus('Unpaid')
                      setAmountPaid(0)
                    }}
                  >
                    Unpaid (Book to Ledger)
                  </button>
                </div>

                {/* Amount Paid input if partial / paid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Amount Received (Rs) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      step="any"
                      value={paymentStatus === 'Paid' ? grandTotal : amountPaid}
                      disabled={paymentStatus === 'Paid' || paymentStatus === 'Unpaid'}
                      onChange={(e) => setAmountPaid(Number(e.target.value))}
                      className="w-full text-xs font-bold bg-white border border-gray-300 rounded-lg p-2"
                      id="input-pos-amount-paid"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Remaining Balance Due (Rs)
                    </label>
                    <div className="bg-gray-100 border border-gray-200 rounded-lg p-2 font-black text-xs text-amber-800">
                      {formatPKR(Math.max(0, grandTotal - (paymentStatus === 'Paid' ? grandTotal : paymentStatus === 'Unpaid' ? 0 : amountPaid)))}
                    </div>
                  </div>
                </div>
              </div>

              {/* PAYMENT METHOD & SCREENSHOT ATTACHMENT */}
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-3">
                <label className="text-xs font-bold text-gray-800 block">
                  2. Payment Method & Destination Account *
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className={`py-2 rounded-lg font-bold text-xs border transition-all flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'Cash'
                        ? 'bg-[#7cb518] text-white border-[#7cb518]'
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                    onClick={() => {
                      setPaymentMethod('Cash')
                      setPaymentAccount('cash-in-hand')
                    }}
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Cash
                  </button>

                  <button
                    type="button"
                    className={`py-2 rounded-lg font-bold text-xs border transition-all flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'Card'
                        ? 'bg-[#7cb518] text-white border-[#7cb518]'
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                    onClick={() => {
                      setPaymentMethod('Card')
                      setPaymentAccount('meezan-bank')
                    }}
                  >
                    <CreditCard className="w-3.5 h-3.5" /> POS Card
                  </button>

                  <button
                    type="button"
                    className={`py-2 rounded-lg font-bold text-xs border transition-all flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'Online'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                    onClick={() => {
                      setPaymentMethod('Online')
                      setPaymentAccount('meezan-bank')
                    }}
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Online / Transfer
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Deposit Into Account *
                    </label>
                    <select
                      value={paymentAccount}
                      onChange={(e) => setPaymentAccount(e.target.value as any)}
                      className="w-full text-xs bg-white border border-gray-300 rounded-lg p-2"
                      id="select-pos-payment-account"
                    >
                      <option value="cash-in-hand">Cash in Hand (Factory Register)</option>
                      <option value="meezan-bank">Meezan Bank Ltd (A/C: 010203040510)</option>
                      <option value="hbl-bank">Habib Bank Ltd - HBL (A/C: 998877665520)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Order Reference / Notes (Optional)
                    </label>
                    <input
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="e.g. Gate pass #, PO ref, check #"
                      className="w-full text-xs bg-white border border-gray-300 rounded-lg p-2"
                      id="input-pos-notes"
                    />
                  </div>
                </div>

                {/* ONLINE PAYMENT TRANSACTION SCREENSHOT ATTACHMENT */}
                {paymentMethod === 'Online' && (
                  <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <UploadCloud className="w-4 h-4 text-blue-600" />
                        Attach Online Transaction Screenshot / Proof
                      </span>
                      {paymentScreenshot && (
                        <button
                          type="button"
                          className="text-[11px] text-rose-600 font-bold hover:underline"
                          onClick={() => setPaymentScreenshot('')}
                        >
                          Remove Image
                        </button>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleScreenshotChange}
                    />

                    <div className="flex items-center gap-3">
                      {paymentScreenshot ? (
                        <div className="w-16 h-16 rounded-lg bg-white border border-blue-300 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
                          <img
                            src={paymentScreenshot}
                            alt="Payment Proof"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-blue-100/70 border border-blue-200 flex items-center justify-center flex-shrink-0 text-blue-400">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                      )}

                      <div className="flex-1 space-y-1">
                        <button
                          type="button"
                          className="button secondary text-xs w-full py-1.5 bg-white border-blue-300 text-blue-900"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {paymentScreenshot ? 'Change Screenshot' : 'Upload Payment Slip / Receipt'}
                        </button>
                        <p className="text-[10px] text-blue-600">
                          Screenshots are saved locally offline in SQLite (OPFS) database.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MODAL ACTIONS */}
            <div className="editor-actions">
              <button
                type="button"
                className="button secondary text-xs"
                onClick={() => setShowCheckoutModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button primary text-xs"
                onClick={handleCompleteSale}
                id="btn-confirm-complete-sale"
              >
                <Check className="w-4 h-4" /> Complete Sale & Generate Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. POST-CHECKOUT CONFIRMATION & PRINT MODAL */}
      {completedInvoice && (
        <div className="editor-overlay pos-no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full mx-4 shadow-2xl p-5 border border-gray-200 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-gray-900">Sale Completed Successfully!</h2>
              <p className="text-xs text-gray-500">
                Invoice <strong className="font-mono text-gray-800">{completedInvoice.invoiceNumber}</strong> generated & stock deducted.
              </p>
            </div>

            {/* Quick Details Slip Preview */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between border-b pb-1 text-gray-600">
                <span>Date & Time:</span>
                <span className="font-bold text-gray-900">{formatDate(completedInvoice.date)} {completedInvoice.time || ''}</span>
              </div>
              <div className="flex justify-between border-b pb-1 text-gray-600">
                <span>Customer:</span>
                <span className="font-bold text-gray-900 truncate max-w-[200px]">{completedInvoice.customerName}</span>
              </div>
              <div className="flex justify-between border-b pb-1 text-gray-600">
                <span>Items Sold:</span>
                <span className="font-bold text-gray-900">{completedInvoice.items.length} lines</span>
              </div>
              <div className="flex justify-between border-b pb-1 text-gray-600">
                <span>Grand Total:</span>
                <span className="font-bold text-gray-900">{formatPKR(completedInvoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between border-b pb-1 text-emerald-800 font-bold">
                <span>Amount Paid ({completedInvoice.paymentMethod}):</span>
                <span>{formatPKR(completedInvoice.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-amber-800 font-bold">
                <span>Balance Due:</span>
                <span>{formatPKR(completedInvoice.balanceDue)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                className="button primary text-xs w-full py-2.5 bg-[#7cb518] hover:bg-[#6fa115] shadow-md flex items-center justify-center gap-1.5"
                onClick={handleDirectPrint}
                id="btn-print-pos-receipt"
              >
                <Printer className="w-4 h-4" /> Print Thermal Slip (Direct)
              </button>

              <button
                type="button"
                className="button secondary text-xs w-full py-2.5 flex items-center justify-center gap-1.5"
                onClick={handleDownloadPDF}
                id="btn-download-pos-pdf"
              >
                <Download className="w-4 h-4" /> Download PDF Invoice
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                className="button secondary text-xs w-full py-2 flex items-center justify-center gap-1.5 text-gray-700"
                onClick={handleCopyWhatsApp}
              >
                <Share2 className="w-3.5 h-3.5" /> Copy WhatsApp Receipt
              </button>

              <button
                type="button"
                className="button secondary text-xs w-full py-2 font-bold text-[#7cb518] hover:bg-[#7cb518]/10"
                onClick={handleResetPOS}
                id="btn-pos-new-sale"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Start New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. PRINT-ONLY THERMAL RECEIPT SLIP (Triggered via window.print()) */}
      {completedInvoice && (
        <div className="pos-print-only" id="pos-thermal-print-slip">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <h2 style={{ margin: '0', fontSize: '15px', fontWeight: 'bold' }}>AL FAROOQ FOODS</h2>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>Factory Sales Counter & Cash Desk</p>
            <p style={{ margin: '2px 0', fontSize: '9px' }}>Ph: 0344 9549051, 0346 9829900</p>
            <p style={{ margin: '4px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '3px 0', fontSize: '10px' }}>
              TAX INVOICE / CASH MEMO
            </p>
          </div>

          <div style={{ fontSize: '9.5px', marginBottom: '6px', lineHeight: '1.4' }}>
            <div><strong>Inv #:</strong> {completedInvoice.invoiceNumber}</div>
            <div><strong>Date/Time:</strong> {completedInvoice.date} {completedInvoice.time || ''}</div>
            <div><strong>Customer:</strong> {completedInvoice.customerName}</div>
            {completedInvoice.partyId && <div><strong>Party ID:</strong> {completedInvoice.partyId.toUpperCase()}</div>}
            <div><strong>Sale Type:</strong> {completedInvoice.saleType}</div>
          </div>

          <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse', marginBottom: '8px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                <th style={{ textAlign: 'left', padding: '2px 0' }}>Item</th>
                <th style={{ textAlign: 'center', padding: '2px 0' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '2px 0' }}>Rate</th>
                <th style={{ textAlign: 'right', padding: '2px 0' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {completedInvoice.items.map((it, idx) => (
                <tr key={idx} style={{ borderBottom: '0.5px dashed #ccc' }}>
                  <td style={{ padding: '3px 0' }}>
                    <div>{it.name}</div>
                    {it.discount && it.discount > 0 ? (
                      <div style={{ fontSize: '8px', color: '#444' }}>Disc: -{formatPKR(it.discount)}</div>
                    ) : null}
                  </td>
                  <td style={{ textAlign: 'center', padding: '3px 0' }}>{it.quantity} {it.unit}</td>
                  <td style={{ textAlign: 'right', padding: '3px 0' }}>{it.unitPrice}</td>
                  <td style={{ textAlign: 'right', padding: '3px 0' }}>{it.total}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: '10px', borderTop: '1px dashed #000', paddingTop: '4px', lineHeight: '1.5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span>Rs. {completedInvoice.subtotal.toLocaleString()}</span>
            </div>
            {completedInvoice.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Discount:</span>
                <span>- Rs. {completedInvoice.discount.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11px', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 0', margin: '3px 0' }}>
              <span>NET TOTAL:</span>
              <span>Rs. {completedInvoice.grandTotal.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Paid ({completedInvoice.paymentMethod}):</span>
              <span>Rs. {completedInvoice.amountPaid.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Balance Due:</span>
              <span>Rs. {completedInvoice.balanceDue.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '8.5px', borderTop: '1px dashed #000', paddingTop: '6px' }}>
            <p style={{ margin: '0' }}>Thank you for your business!</p>
            <p style={{ margin: '2px 0' }}>Software by Al-Farooq Foods (100% Offline)</p>
          </div>
        </div>
      )}
    </div>
  )
}
