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
  Upload,
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
  UserPlus,
  PauseCircle,
  PlayCircle,
  TrendingUp,
  Banknote,
  Clock,
  Eye,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  type AppDatabase,
  type ProductItem,
  type CustomerItem,
  type InvoiceItem,
  type InvoiceLineItem,
  type LedgerEntry,
  type CustomerType,
  fileToBase64,
} from '@/lib/db'
import { generateInvoicePDF } from '@/lib/pdf-export'

interface PosViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigate?: (module: string, subTab?: string) => void
}

export type CustomerCategoryType = 'Retail' | 'Distributor' | 'Sales Man'

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

export interface PosDraft {
  id: string
  savedAt: string
  customerCategory: CustomerCategoryType
  selectedCustomerId?: string
  customerName: string
  cart: CartItem[]
  cartDiscountType: 'percent' | 'fixed'
  cartDiscountValue: number
  notes?: string
}

export default function PosView({ db, onSaveDatabase, onNavigate }: PosViewProps) {
  // 1. Customer Category Selection: Retail (Walk-in) / Distributor / Sales Man
  const [customerCategory, setCustomerCategory] = useState<CustomerCategoryType>('Retail')

  // Selected Profile for Distributor / Sales Man
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false)

  // Retail walk-in customer details
  const [retailCustomerName, setRetailCustomerName] = useState('Walk-in Retail Customer')
  const [retailCustomerPhone, setRetailCustomerPhone] = useState('')
  const [retailCustomerAddress, setRetailCustomerAddress] = useState('Factory Gate Counter')

  // On-the-fly New Customer Creation Modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [newCustName, setNewCustName] = useState('')
  const [newCustType, setNewCustType] = useState<CustomerType>('Distributor')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustAddress, setNewCustAddress] = useState('')
  const [newCustCity, setNewCustCity] = useState('')
  const [newCustOpeningBalance, setNewCustOpeningBalance] = useState<number>(0)

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
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Online' | 'Bank Transfer' | 'Cheque'>('Cash')
  const [paymentAccount, setPaymentAccount] = useState<'cash-in-hand' | 'meezan-bank' | 'hbl-bank'>('cash-in-hand')
  const [amountPaid, setAmountPaid] = useState<number>(0)
  const [paymentScreenshot, setPaymentScreenshot] = useState<string>('')
  const [orderNotes, setOrderNotes] = useState('')

  // 6. Post-Checkout Confirmation & Print Modal
  const [completedInvoice, setCompletedInvoice] = useState<InvoiceItem | null>(null)
  const [printMode, setPrintMode] = useState<'thermal' | 'a4'>('thermal')
  const [viewingScreenshotModal, setViewingScreenshotModal] = useState<string | null>(null)

  // 7. Drafts / Hold Sales
  const [drafts, setDrafts] = useState<PosDraft[]>([])
  const [showDraftsModal, setShowDraftsModal] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filtered customer profiles for Distributor / Sales Man dropdown
  const filteredProfiles = useMemo(() => {
    let pool: CustomerItem[] = []
    if (customerCategory === 'Distributor') {
      pool = db.customers.filter((c) => c.type === 'Distributor')
    } else if (customerCategory === 'Sales Man') {
      pool = db.customers.filter((c) => c.type === 'Sales Man' || c.type === 'Sales Representative')
    } else {
      pool = db.customers
    }

    const q = customerSearchQuery.trim().toLowerCase()
    if (!q) return pool
    return pool.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.businessName && c.businessName.toLowerCase().includes(q)) ||
        (c.customerId && c.customerId.toLowerCase().includes(q)) ||
        c.id.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.city && c.city.toLowerCase().includes(q))
    )
  }, [db.customers, customerCategory, customerSearchQuery])

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (customerCategory === 'Retail') return null
    return db.customers.find((c) => c.id === selectedCustomerId) || null
  }, [db.customers, customerCategory, selectedCustomerId])

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

  // Filtered products list
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

  // POS Top Bar Metrics (Today's sales count, total revenue, pending payments)
  const posMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    let todayCount = 0
    let todayRevenue = 0
    let todayCollected = 0
    let todayPending = 0

    db.invoices.forEach((inv) => {
      if (inv.date === todayStr) {
        todayCount += 1
        todayRevenue += inv.grandTotal || 0
        todayCollected += inv.amountPaid || 0
        todayPending += inv.balanceDue || 0
      }
    })

    return {
      todayCount,
      todayRevenue,
      todayCollected,
      todayPending,
    }
  }, [db.invoices])

  // Helper: determine unit price based on qty, product limits, and customer category
  const getProductPriceForQty = (
    product: ProductItem,
    qty: number,
    currentCat: CustomerCategoryType
  ): { price: number; tier: 'Retail' | 'Wholesale' } => {
    const wholesaleLimit = product.wholesaleMinQty && product.wholesaleMinQty > 0 ? product.wholesaleMinQty : 12

    // Auto-apply wholesale price when qty >= wholesaleMinQty OR if Distributor / Sales Man category
    if (currentCat === 'Distributor' || currentCat === 'Sales Man' || qty >= wholesaleLimit) {
      return { price: product.wholesalePrice, tier: 'Wholesale' }
    }
    return { price: product.retailPrice, tier: 'Retail' }
  }

  // Calculate line item discount & total
  const calculateItemLine = (
    product: ProductItem,
    qty: number,
    currentCat: CustomerCategoryType,
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
      const calculated = getProductPriceForQty(product, qty, currentCat)
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

  // Add product to cart (or increment qty) with stock check
  const handleAddToCart = (product: ProductItem) => {
    const existingIndex = cart.findIndex((item) => item.product.id === product.id)
    if (existingIndex >= 0) {
      const existing = cart[existingIndex]
      const newQty = existing.quantity + 1

      // Stock check warning / cap
      if (newQty > product.quantity) {
        alert(`Stock limit reached! Only ${product.quantity} ${product.unit} available in warehouse.`)
        return
      }

      const updatedItem = calculateItemLine(
        product,
        newQty,
        customerCategory,
        existing.discountType,
        existing.discountValue
      )
      const newCart = [...cart]
      newCart[existingIndex] = updatedItem
      setCart(newCart)
    } else {
      if (product.quantity <= 0) {
        alert(`Product is currently Out of Stock (${product.quantity} in inventory).`)
        return
      }
      const newItem = calculateItemLine(product, 1, customerCategory, 'fixed', 0)
      setCart([...cart, newItem])
    }
  }

  // Update quantity directly or via +/-
  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index)
      return
    }
    const current = cart[index]
    if (newQty > current.product.quantity) {
      alert(`Warning: Quantity (${newQty}) exceeds available warehouse stock of ${current.product.quantity} ${current.product.unit}.`)
    }

    const updated = calculateItemLine(
      current.product,
      newQty,
      customerCategory,
      current.discountType,
      current.discountValue
    )
    const newCart = [...cart]
    newCart[index] = updated
    setCart(newCart)
  }

  // Update per-line discount
  const handleUpdateItemDiscount = (
    index: number,
    type: 'percent' | 'fixed',
    val: number
  ) => {
    const current = cart[index]
    const updated = calculateItemLine(
      current.product,
      current.quantity,
      customerCategory,
      type,
      val
    )
    const newCart = [...cart]
    newCart[index] = updated
    setCart(newCart)
  }

  // Toggle Pricing Tier manually
  const handleToggleItemTier = (index: number) => {
    const current = cart[index]
    const nextTier: 'Retail' | 'Wholesale' = current.pricingTier === 'Retail' ? 'Wholesale' : 'Retail'
    const updated = calculateItemLine(
      current.product,
      current.quantity,
      customerCategory,
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

  // Switch Customer Category
  const handleCategoryChange = (newCat: CustomerCategoryType) => {
    setCustomerCategory(newCat)
    setSelectedCustomerId('')
    setCustomerSearchQuery('')
    setIsCustomerDropdownOpen(false)

    // Re-evaluate pricing for items in cart
    const reevaluatedCart = cart.map((item) =>
      calculateItemLine(
        item.product,
        item.quantity,
        newCat,
        item.discountType,
        item.discountValue
      )
    )
    setCart(reevaluatedCart)
  }

  // On-the-fly Save New Customer and Continue Sale
  const handleSaveNewCustomer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustName.trim()) {
      alert('Please enter a customer or business name.')
      return
    }

    const newId = `cust-${Date.now()}`
    const displayId = `CUST-${1000 + db.customers.length + 1}`

    const newCustomer: CustomerItem = {
      id: newId,
      customerId: displayId,
      name: newCustName.trim(),
      type: newCustType,
      phone: newCustPhone.trim() || '0300 0000000',
      address: newCustAddress.trim() || 'Direct Market',
      city: newCustCity.trim() || 'Pakistan',
      openingBalance: Number(newCustOpeningBalance) || 0,
      currentBalance: Number(newCustOpeningBalance) || 0,
      creditLimit: 200000,
      status: 'Active',
      updatedAt: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    }

    // Add to DB
    onSaveDatabase({
      ...db,
      customers: [newCustomer, ...db.customers],
    })

    // Auto-select this newly created customer
    if (newCustType === 'Distributor') {
      setCustomerCategory('Distributor')
    } else if (newCustType === 'Sales Man' || newCustType === 'Sales Representative') {
      setCustomerCategory('Sales Man')
    }
    setSelectedCustomerId(newId)
    setShowNewCustomerModal(false)

    // Reset fields
    setNewCustName('')
    setNewCustPhone('')
    setNewCustAddress('')
    setNewCustCity('')
    setNewCustOpeningBalance(0)
  }

  // Cart Calculations
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

  // Hold Sale as Draft
  const handleHoldSale = () => {
    if (cart.length === 0) {
      alert('Cart is empty. Nothing to hold.')
      return
    }

    const draftName =
      customerCategory === 'Retail'
        ? retailCustomerName
        : selectedCustomer?.name || `${customerCategory} Sale`

    const newDraft: PosDraft = {
      id: `draft-${Date.now()}`,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerCategory,
      selectedCustomerId: selectedCustomerId || undefined,
      customerName: draftName,
      cart: [...cart],
      cartDiscountType,
      cartDiscountValue,
      notes: orderNotes,
    }

    setDrafts([newDraft, ...drafts])
    setCart([])
    setCartDiscountValue(0)
    alert(`Sale held as Draft for "${draftName}". You can resume it anytime.`)
  }

  // Resume Draft Sale
  const handleResumeDraft = (draft: PosDraft) => {
    setCustomerCategory(draft.customerCategory)
    if (draft.selectedCustomerId) {
      setSelectedCustomerId(draft.selectedCustomerId)
    }
    setCart(draft.cart)
    setCartDiscountType(draft.cartDiscountType)
    setCartDiscountValue(draft.cartDiscountValue)
    if (draft.notes) setOrderNotes(draft.notes)

    // Remove resumed draft from drafts list
    setDrafts(drafts.filter((d) => d.id !== draft.id))
    setShowDraftsModal(false)
  }

  // Open checkout modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      alert('Your cart is empty. Please select products from the catalog.')
      return
    }

    if ((customerCategory === 'Distributor' || customerCategory === 'Sales Man') && !selectedCustomer) {
      alert(`Please select an existing ${customerCategory} profile from the dropdown before checkout.`)
      return
    }

    if (paymentStatus === 'Paid') {
      setAmountPaid(grandTotal)
    } else if (paymentStatus === 'Unpaid') {
      setAmountPaid(0)
    } else {
      setAmountPaid(Math.round(grandTotal / 2))
    }

    setShowCheckoutModal(true)
  }

  // Handle Screenshot Upload
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Complete Sale & Post-Sale Automation
  const handleCompleteSale = () => {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    const nextInvoiceNumber = `INV-${now.getFullYear()}-${1000 + db.invoices.length + 1}`

    const customerId =
      customerCategory === 'Retail'
        ? 'cust-retail-walkin'
        : selectedCustomer?.id || `cust-${Date.now()}`

    const customerName =
      customerCategory === 'Retail'
        ? retailCustomerName.trim() || 'Walk-in Retail Customer'
        : selectedCustomer?.businessName || selectedCustomer?.name || 'Commercial Client'

    const customerType: CustomerType =
      customerCategory === 'Distributor'
        ? 'Distributor'
        : customerCategory === 'Sales Man'
        ? 'Sales Man'
        : 'Counter'

    const phone =
      customerCategory === 'Retail'
        ? retailCustomerPhone || '—'
        : selectedCustomer?.phone || '—'

    const address =
      customerCategory === 'Retail'
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
      saleType: customerCategory === 'Distributor' ? 'Distributor' : customerCategory === 'Sales Man' ? 'Retail' : 'Counter',
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
      notes: orderNotes.trim() || `POS Point-of-Sale (${customerCategory})`,
      createdAt: now.toISOString(),
    }

    // 1. Post-Sale Automation: Auto-deduct sold quantities from Product Management
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

    // 2. Post-Sale Automation: Update Customer Outstanding Balance & Running Ledger (Universal Profile)
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

    // 3. Post-Sale Automation: Update Cash/Bank Account Balance
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

    // 4. Save entire database state
    const updatedDb: AppDatabase = {
      ...db,
      invoices: [newInvoice, ...db.invoices],
      products: updatedProducts,
      customers: updatedCustomers,
      accounts: updatedAccounts,
      ledgers: [...newLedgerEntries, ...db.ledgers],
    }

    onSaveDatabase(updatedDb)

    // Set completed invoice for immediate printing and confirmation
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

  // Print invoice directly
  const handleDirectPrint = () => {
    window.print()
  }

  // Download PDF invoice
  const handleDownloadPDF = () => {
    if (!completedInvoice) return
    generateInvoicePDF(completedInvoice, selectedCustomer || undefined)
  }

  // Copy WhatsApp Receipt text
  const handleCopyWhatsApp = () => {
    if (!completedInvoice) return
    const lines = completedInvoice.items
      .map(
        (it) =>
          `• ${it.name} x ${it.quantity} ${it.unit} @ ${formatPKR(it.unitPrice)} = ${formatPKR(it.total)}`
      )
      .join('\n')

    const text =
      `*AL FAROOQ FOODS - SALE RECEIPT*\n` +
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
    alert('Receipt text copied to clipboard! You can paste it directly into WhatsApp.')
  }

  return (
    <div className="space-y-6" id="pos-terminal-root">
      {/* 1. TOP POS DASHBOARD BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        {/* Metric 1: Today's Sales Count */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
          <div className="w-10 h-10 rounded-xl bg-lime-100 flex items-center justify-center text-lime-700 shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Today&apos;s Sales</span>
            <span className="text-xl font-bold text-stone-900">{posMetrics.todayCount} Invoices</span>
          </div>
        </div>

        {/* Metric 2: Today's Total Revenue */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Today&apos;s Revenue</span>
            <span className="text-xl font-bold text-stone-900">{formatPKR(posMetrics.todayRevenue)}</span>
          </div>
        </div>

        {/* Metric 3: Cash Collected */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Cash Collected</span>
            <span className="text-xl font-bold text-emerald-800">{formatPKR(posMetrics.todayCollected)}</span>
          </div>
        </div>

        {/* Metric 4: Pending Receivables / Drafts */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100">
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Pending Receivables</span>
            <span className="text-xl font-bold text-amber-800">{formatPKR(posMetrics.todayPending)}</span>
          </div>
          {drafts.length > 0 && (
            <button
              onClick={() => setShowDraftsModal(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shadow-sm flex items-center gap-1 transition"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              Drafts ({drafts.length})
            </button>
          )}
        </div>
      </div>

      {/* 2. CUSTOMER SELECTION & SALE TYPE BAR */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <User className="w-4 h-4 text-lime-600" />
              1. Customer Selection
            </h2>
            <p className="text-xs text-stone-500">Choose customer category or link to customer profile ledger</p>
          </div>

          <div className="flex items-center gap-2">
            {drafts.length > 0 && (
              <button
                onClick={() => setShowDraftsModal(true)}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Clock className="w-3.5 h-3.5" />
                Resume Draft ({drafts.length})
              </button>
            )}
            <button
              onClick={() => setShowNewCustomerModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-lime-600 hover:bg-lime-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              id="btn-pos-add-customer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              + Add New Customer
            </button>
          </div>
        </div>

        {/* Category Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Retail Button */}
          <button
            type="button"
            onClick={() => handleCategoryChange('Retail')}
            className={`p-3.5 rounded-xl border-2 text-left transition flex items-center gap-3 ${
              customerCategory === 'Retail'
                ? 'border-lime-600 bg-lime-50/70 text-stone-900 shadow-sm'
                : 'border-stone-200 hover:border-stone-300 bg-stone-50 text-stone-600'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${customerCategory === 'Retail' ? 'bg-lime-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Immediate Sale</span>
              <strong className="text-xs font-bold text-stone-900 block">Retail (Walk-in)</strong>
              <span className="text-[11px] text-stone-500">Counter walk-in, retail rate</span>
            </div>
          </button>

          {/* Distributor Button */}
          <button
            type="button"
            onClick={() => handleCategoryChange('Distributor')}
            className={`p-3.5 rounded-xl border-2 text-left transition flex items-center gap-3 ${
              customerCategory === 'Distributor'
                ? 'border-lime-600 bg-lime-50/70 text-stone-900 shadow-sm'
                : 'border-stone-200 hover:border-stone-300 bg-stone-50 text-stone-600'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${customerCategory === 'Distributor' ? 'bg-blue-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Account Ledger</span>
              <strong className="text-xs font-bold text-stone-900 block">Distributor Profile</strong>
              <span className="text-[11px] text-stone-500">Wholesale pricing & balance ledger</span>
            </div>
          </button>

          {/* Sales Man Button */}
          <button
            type="button"
            onClick={() => handleCategoryChange('Sales Man')}
            className={`p-3.5 rounded-xl border-2 text-left transition flex items-center gap-3 ${
              customerCategory === 'Sales Man'
                ? 'border-lime-600 bg-lime-50/70 text-stone-900 shadow-sm'
                : 'border-stone-200 hover:border-stone-300 bg-stone-50 text-stone-600'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${customerCategory === 'Sales Man' ? 'bg-purple-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Route Dispatch</span>
              <strong className="text-xs font-bold text-stone-900 block">Sales Man / Rep</strong>
              <span className="text-[11px] text-stone-500">Stock distribution & sales reps</span>
            </div>
          </button>
        </div>

        {/* Category Specific Input Fields */}
        {customerCategory === 'Retail' ? (
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-1/2">
              <label className="block text-[11px] font-bold text-stone-600 mb-1">Customer / Buyer Name (Optional)</label>
              <input
                type="text"
                value={retailCustomerName}
                onChange={(e) => setRetailCustomerName(e.target.value)}
                placeholder="Walk-in Retail Customer"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
              />
            </div>
            <div className="w-full sm:w-1/2">
              <label className="block text-[11px] font-bold text-stone-600 mb-1">Contact Phone (Optional)</label>
              <input
                type="text"
                value={retailCustomerPhone}
                onChange={(e) => setRetailCustomerPhone(e.target.value)}
                placeholder="0300 0000000"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
              />
            </div>
          </div>
        ) : (
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <label className="text-xs font-bold text-stone-700">
                Select {customerCategory} Profile (Search by Name, Business, or ID):
              </label>
              <span className="text-[11px] text-stone-500">{filteredProfiles.length} registered profiles available</span>
            </div>

            <div className="relative">
              <div
                onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white cursor-pointer flex items-center justify-between shadow-sm"
              >
                {selectedCustomer ? (
                  <div className="flex items-center gap-2 font-medium text-stone-900">
                    <span className="font-bold text-lime-700">{selectedCustomer.customerId || selectedCustomer.id}:</span>
                    <span>{selectedCustomer.name}</span>
                    {selectedCustomer.businessName && <span className="text-stone-500 text-[11px]">({selectedCustomer.businessName})</span>}
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px]">
                      Balance Due: {formatPKR(selectedCustomer.currentBalance)}
                    </span>
                  </div>
                ) : (
                  <span className="text-stone-400">Click to search and select {customerCategory}...</span>
                )}
                <ChevronDown className="w-4 h-4 text-stone-400" />
              </div>

              {/* Dropdown Menu */}
              {isCustomerDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-40 mt-1 bg-white rounded-xl shadow-xl border border-stone-200 max-h-60 overflow-y-auto p-2 space-y-1">
                  <div className="sticky top-0 bg-white pb-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                      <input
                        type="text"
                        autoFocus
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        placeholder={`Search ${customerCategory} name, phone, city...`}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-lime-500"
                      />
                    </div>
                  </div>

                  {filteredProfiles.length === 0 ? (
                    <div className="p-3 text-center text-xs text-stone-500">
                      No matching {customerCategory} found.
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomerDropdownOpen(false)
                          setShowNewCustomerModal(true)
                        }}
                        className="block mx-auto mt-1.5 text-lime-700 font-bold hover:underline"
                      >
                        + Create &quot;{customerSearchQuery}&quot; Now
                      </button>
                    </div>
                  ) : (
                    filteredProfiles.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => {
                          setSelectedCustomerId(cust.id)
                          setIsCustomerDropdownOpen(false)
                        }}
                        className={`p-2 rounded-lg cursor-pointer text-xs flex items-center justify-between transition ${
                          selectedCustomerId === cust.id ? 'bg-lime-50 text-lime-900 font-bold' : 'hover:bg-stone-50 text-stone-800'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-stone-900">{cust.name}</span>
                          {cust.businessName && <span className="text-stone-500 text-[11px] ml-1">({cust.businessName})</span>}
                          <span className="text-[10px] block text-stone-400">
                            {cust.customerId || cust.id} • {cust.phone} • {cust.city || cust.address}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-stone-400 block uppercase">Outstanding</span>
                          <span className={`font-bold ${cust.currentBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {formatPKR(cust.currentBalance)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedCustomer && (
              <div className="flex flex-wrap items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-stone-200">
                <div className="space-x-3 text-stone-600">
                  <span><strong>Territory / City:</strong> {selectedCustomer.city || selectedCustomer.address}</span>
                  <span><strong>Phone:</strong> {selectedCustomer.phone}</span>
                </div>
                <div className="font-semibold text-stone-800">
                  Current Ledger Balance: <span className="text-stone-900 font-bold">{formatPKR(selectedCustomer.currentBalance)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. MAIN WORKSPACE: PRODUCT CATALOG (LEFT) + LIVE CART (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: PRODUCT CATALOG BROWSER */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-lime-600" />
                2. Product Selection
              </h2>
              <span className="text-xs text-stone-500 font-medium">{filteredProducts.length} items available</span>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Search products by title, SKU, beverage size, candy..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
              />
              {productQuery && (
                <button onClick={() => setProductQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-lime-600 text-white shadow-sm'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const inCartItem = cart.find((item) => item.product.id === p.id)
              const isOut = p.quantity <= 0
              const isLow = p.quantity > 0 && p.quantity <= p.reorderLevel

              return (
                <div
                  key={p.id}
                  className={`bg-white p-3.5 rounded-2xl border transition flex flex-col justify-between ${
                    inCartItem ? 'border-lime-500 ring-1 ring-lime-500 bg-lime-50/20' : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider bg-stone-100 px-2 py-0.5 rounded-md">
                        {p.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isOut
                            ? 'bg-red-100 text-red-700'
                            : isLow
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isOut ? 'Out of stock' : `${p.quantity} ${p.unit} in stock`}
                      </span>
                    </div>

                    {/* Title & SKU */}
                    <h3 className="font-bold text-xs text-stone-900 line-clamp-2 leading-tight">{p.name}</h3>
                    <span className="text-[10px] font-mono text-stone-400 block mt-0.5">{p.sku}</span>

                    {/* Pricing Tiers Display */}
                    <div className="mt-3 grid grid-cols-2 gap-2 bg-stone-50 p-2 rounded-xl border border-stone-100 text-[11px]">
                      <div>
                        <span className="text-[10px] text-stone-400 block">Retail Rate:</span>
                        <strong className="text-stone-900 font-bold">{formatPKR(p.retailPrice)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block">
                          Wholesale (Min {p.wholesaleMinQty || 12}):
                        </span>
                        <strong className="text-lime-700 font-bold">{formatPKR(p.wholesalePrice)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Add to Cart Actions */}
                  <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                    {inCartItem ? (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(cart.indexOf(inCartItem), inCartItem.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center text-xs font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={inCartItem.quantity}
                            onChange={(e) =>
                              handleUpdateQty(cart.indexOf(inCartItem), Number(e.target.value) || 1)
                            }
                            className="w-12 text-center text-xs font-bold py-1 rounded-md border border-stone-200 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(cart.indexOf(inCartItem), inCartItem.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-lime-600 hover:bg-lime-700 text-white flex items-center justify-center text-xs font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-xs font-bold text-lime-800">{formatPKR(inCartItem.lineTotal)}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isOut}
                        onClick={() => handleAddToCart(p)}
                        className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                          isOut
                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            : 'bg-lime-600 hover:bg-lime-700 text-white shadow-sm'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: INTERACTIVE CART & DISCOUNTS & CHECKOUT */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-4 sticky top-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-lime-600" />
                <h2 className="text-base font-bold text-stone-900">Cart & Discounts</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-lime-100 text-lime-800">
                  {cart.length} items ({totalUnitsCount} units)
                </span>
              </div>

              {cart.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleHoldSale}
                    className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 text-xs font-semibold flex items-center gap-1 transition"
                    title="Hold Sale as Draft"
                  >
                    <PauseCircle className="w-4 h-4" />
                    Hold
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Clear current sale cart?')) {
                        setCart([])
                        setCartDiscountValue(0)
                      }
                    }}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs transition"
                    title="Clear Cart"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-stone-400">
                <ShoppingCart className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                <p className="text-xs font-medium text-stone-600">Sale cart is currently empty</p>
                <p className="text-[11px] text-stone-400 mt-0.5">Click &quot;Add to Cart&quot; on products to begin sale</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {cart.map((item, index) => (
                  <div key={item.product.id} className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-stone-900 leading-tight">{item.product.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => handleToggleItemTier(index)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                              item.pricingTier === 'Wholesale'
                                ? 'bg-lime-600 text-white'
                                : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                            }`}
                            title="Click to toggle Retail / Wholesale price tier"
                          >
                            {item.pricingTier} Rate ({formatPKR(item.unitPrice)})
                          </button>
                          <span className="text-[10px] text-stone-400">× {item.quantity} {item.product.unit}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-stone-900 block">{formatPKR(item.lineTotal)}</span>
                        {item.discountAmount > 0 && (
                          <span className="text-[10px] text-rose-600 font-semibold block">
                            -{formatPKR(item.discountAmount)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity and Discount Controls */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200/60">
                      {/* Qty +/- */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(index, item.quantity - 1)}
                          className="w-6 h-6 rounded bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center text-xs font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQty(index, Number(e.target.value) || 1)}
                          className="w-10 text-center text-xs font-bold py-0.5 rounded border border-stone-200 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(index, item.quantity + 1)}
                          className="w-6 h-6 rounded bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center text-xs font-bold"
                        >
                          +
                        </button>
                      </div>

                      {/* Line Discount Input */}
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-stone-500">Disc:</span>
                        <input
                          type="number"
                          min="0"
                          value={item.discountValue || ''}
                          onChange={(e) => handleUpdateItemDiscount(index, item.discountType, Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-12 text-center text-xs font-medium py-0.5 rounded border border-stone-200 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateItemDiscount(
                              index,
                              item.discountType === 'fixed' ? 'percent' : 'fixed',
                              item.discountValue
                            )
                          }
                          className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-bold text-[10px]"
                          title="Toggle Rs. / %"
                        >
                          {item.discountType === 'fixed' ? 'Rs' : '%'}
                        </button>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-stone-400 hover:text-red-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cart Summary & Overall Discount */}
            {cart.length > 0 && (
              <div className="pt-3 border-t border-stone-100 space-y-3">
                {/* Overall Discount Row */}
                <div className="flex items-center justify-between bg-stone-50 p-2 rounded-xl text-xs">
                  <span className="font-bold text-stone-700">Total Bill Discount:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={cartDiscountValue || ''}
                      onChange={(e) => setCartDiscountValue(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-16 text-center text-xs font-bold py-1 rounded-lg border border-stone-200 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setCartDiscountType(cartDiscountType === 'fixed' ? 'percent' : 'fixed')}
                      className="px-2 py-1 rounded-lg bg-stone-200 text-stone-700 font-bold text-[11px]"
                    >
                      {cartDiscountType === 'fixed' ? 'PKR' : '%'}
                    </button>
                  </div>
                </div>

                {/* Subtotal & Totals Table */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal ({totalUnitsCount} units):</span>
                    <span className="font-semibold text-stone-900">{formatPKR(grossSubtotal)}</span>
                  </div>
                  {totalDiscountsCombined > 0 && (
                    <div className="flex justify-between text-rose-600 font-medium">
                      <span>Total Discounts:</span>
                      <span>-{formatPKR(totalDiscountsCombined)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-600">
                    <span>Sales Tax (0% Exempt):</span>
                    <span>Rs. 0</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-200">
                    <span>Grand Total:</span>
                    <span className="text-lime-700 text-lg font-black">{formatPKR(grandTotal)}</span>
                  </div>
                </div>

                {/* Checkout CTA Button */}
                <button
                  type="button"
                  onClick={handleOpenCheckout}
                  className="w-full py-3 rounded-xl bg-lime-600 hover:bg-lime-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                  id="btn-pos-checkout"
                >
                  <Receipt className="w-4 h-4" />
                  Proceed to Checkout ({formatPKR(grandTotal)})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: CHECKOUT & INVOICE PAYMENT */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8">
            <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-lime-400" />
                <div>
                  <h3 className="font-bold text-base">Complete Sale & Issue Invoice</h3>
                  <p className="text-xs text-stone-400">Payment settlement, ledger update, and stock deduction</p>
                </div>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="text-stone-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Summary box */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-stone-500 block text-[11px]">Customer / Account:</span>
                  <strong className="text-sm font-bold text-stone-900">
                    {customerCategory === 'Retail'
                      ? retailCustomerName
                      : selectedCustomer?.name || 'Commercial Client'}
                  </strong>
                  <span className="text-[10px] text-stone-400 block">{customerCategory} Sale</span>
                </div>
                <div className="text-right">
                  <span className="text-stone-500 block text-[11px]">Total Payable:</span>
                  <strong className="text-lg font-black text-lime-700">{formatPKR(grandTotal)}</strong>
                </div>
              </div>

              {/* Payment Status (Paid / Partial / Unpaid) */}
              <div>
                <label className="block font-bold text-stone-700 mb-1.5">Payment Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatus('Paid')
                      setAmountPaid(grandTotal)
                    }}
                    className={`py-2 px-3 rounded-xl border-2 font-bold text-xs transition ${
                      paymentStatus === 'Paid'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-stone-200 bg-white text-stone-700'
                    }`}
                  >
                    Full Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatus('Partial')
                      setAmountPaid(Math.round(grandTotal / 2))
                    }}
                    className={`py-2 px-3 rounded-xl border-2 font-bold text-xs transition ${
                      paymentStatus === 'Partial'
                        ? 'border-amber-600 bg-amber-50 text-amber-800'
                        : 'border-stone-200 bg-white text-stone-700'
                    }`}
                  >
                    Partial Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatus('Unpaid')
                      setAmountPaid(0)
                    }}
                    className={`py-2 px-3 rounded-xl border-2 font-bold text-xs transition ${
                      paymentStatus === 'Unpaid'
                        ? 'border-rose-600 bg-rose-50 text-rose-800'
                        : 'border-stone-200 bg-white text-stone-700'
                    }`}
                  >
                    Unpaid (Credit)
                  </button>
                </div>
              </div>

              {/* Payment Method & Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="Online">Online / Raast</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Deposit To Account</label>
                  <select
                    value={paymentAccount}
                    onChange={(e) => setPaymentAccount(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                  >
                    {db.accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount Paid and Balance Due */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Amount Received (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    max={grandTotal}
                    value={amountPaid}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0
                      setAmountPaid(val)
                      if (val >= grandTotal) setPaymentStatus('Paid')
                      else if (val <= 0) setPaymentStatus('Unpaid')
                      else setPaymentStatus('Partial')
                    }}
                    className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-lime-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Balance Remaining Due</label>
                  <div className="px-3 py-2 text-sm font-bold text-rose-700 bg-white rounded-lg border border-stone-300">
                    {formatPKR(Math.max(0, grandTotal - (Number(amountPaid) || 0)))}
                  </div>
                </div>
              </div>

              {/* Screenshot Attachment (if Online or Bank) */}
              {(paymentMethod === 'Online' || paymentMethod === 'Bank Transfer') && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Transaction Proof / Screenshot (Optional)</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />
                  {paymentScreenshot ? (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-lime-50 border border-lime-200">
                      <div className="flex items-center gap-2">
                        <img src={paymentScreenshot} alt="Proof" className="w-8 h-8 rounded object-cover" />
                        <span className="text-xs font-semibold text-lime-900">Proof attached</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPaymentScreenshot('')}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-2.5 border border-dashed border-stone-300 hover:border-lime-500 rounded-xl text-center bg-stone-50 hover:bg-lime-50/50 flex items-center justify-center gap-1.5 transition"
                    >
                      <Upload className="w-4 h-4 text-stone-400" />
                      <span className="text-xs font-medium text-stone-600">Upload Raast / Bank Slip Photo</span>
                    </button>
                  )}
                </div>
              )}

              {/* Order Notes */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">Order Notes (Optional)</label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Delivered by Van # 4 / Gate clearance..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  className="px-5 py-2 rounded-xl bg-lime-600 hover:bg-lime-700 text-white font-bold shadow-sm"
                  id="btn-confirm-pos-sale"
                >
                  Confirm Sale & Print Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: POST-CHECKOUT COMPLETED INVOICE & PRINT PREVIEW */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8">
            <div className="bg-emerald-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-200" />
                <div>
                  <h3 className="font-bold text-base">Sale Completed Successfully!</h3>
                  <p className="text-xs text-emerald-100">
                    Invoice #{completedInvoice.invoiceNumber} recorded & stock deducted
                  </p>
                </div>
              </div>
              <button onClick={handleResetPOS} className="text-emerald-200 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Print format tabs */}
              <div className="flex items-center justify-between bg-stone-100 p-1.5 rounded-xl">
                <span className="text-[11px] font-bold text-stone-600 px-2">Print Layout:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPrintMode('thermal')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      printMode === 'thermal' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                    }`}
                  >
                    Thermal Receipt (80mm)
                  </button>
                  <button
                    onClick={() => setPrintMode('a4')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      printMode === 'a4' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                    }`}
                  >
                    Commercial A4 Tax Invoice
                  </button>
                </div>
              </div>

              {/* Printable Slip Container */}
              <div
                id="pos-printable-invoice"
                className={`border border-stone-300 rounded-xl p-4 bg-white font-mono mx-auto ${
                  printMode === 'thermal' ? 'max-w-xs text-[11px]' : 'max-w-full text-xs font-sans'
                }`}
              >
                <div className="text-center pb-2 border-b border-stone-200">
                  <h2 className="font-black text-sm text-stone-900">AL FAROOQ FOODS</h2>
                  <p className="text-[10px] text-stone-500">Pure Mineral Water, Juices, Candies & Snacks</p>
                  <p className="text-[10px] text-stone-500">Phone: 0344 9549051 | 0346 9829900</p>
                </div>

                <div className="py-2 border-b border-stone-200 space-y-0.5 text-[11px]">
                  <div className="flex justify-between">
                    <span>Invoice #:</span>
                    <strong>{completedInvoice.invoiceNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Date / Time:</span>
                    <span>{formatDate(completedInvoice.date)} {completedInvoice.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <strong>{completedInvoice.customerName}</strong>
                  </div>
                  {completedInvoice.phone && completedInvoice.phone !== '—' && (
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span>{completedInvoice.phone}</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="py-2 border-b border-stone-200 space-y-1">
                  {completedInvoice.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <div>
                        <span>{it.name}</span>
                        <div className="text-[10px] text-stone-500">
                          {it.quantity} {it.unit} × {formatPKR(it.unitPrice)}
                        </div>
                      </div>
                      <strong>{formatPKR(it.total)}</strong>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="py-2 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPKR(completedInvoice.subtotal)}</span>
                  </div>
                  {completedInvoice.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>-{formatPKR(completedInvoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-stone-200 text-stone-900">
                    <span>Grand Total:</span>
                    <span>{formatPKR(completedInvoice.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Amount Paid ({completedInvoice.paymentMethod}):</span>
                    <span>{formatPKR(completedInvoice.amountPaid)}</span>
                  </div>
                  {completedInvoice.balanceDue > 0 && (
                    <div className="flex justify-between text-amber-700 font-bold">
                      <span>Balance Due:</span>
                      <span>{formatPKR(completedInvoice.balanceDue)}</span>
                    </div>
                  )}
                </div>

                <div className="text-center pt-2 border-t border-stone-200 text-[10px] text-stone-500">
                  Thank you for your business!
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDirectPrint}
                  className="py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-black text-white font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="py-2.5 px-3 rounded-xl bg-lime-600 hover:bg-lime-700 text-white font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Share2 className="w-4 h-4" />
                  Share WhatsApp
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleResetPOS}
                  className="text-xs font-bold text-lime-700 hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Start Next Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ON-THE-FLY NEW CUSTOMER CREATION */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-lime-400" />
                <h3 className="font-bold text-sm">Add New Customer On-the-Fly</h3>
              </div>
              <button onClick={() => setShowNewCustomerModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCustomer} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Customer / Business Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Al-Madina Supermart / Haji Tariq"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Category Type</label>
                  <select
                    value={newCustType}
                    onChange={(e) => setNewCustType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-500/20"
                  >
                    <option value="Distributor">Distributor</option>
                    <option value="Sales Man">Sales Man / Rep</option>
                    <option value="Retailer">Retailer / Shop</option>
                    <option value="Wholesaler">Wholesaler</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="0300 1234567"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">City / Territory</label>
                  <input
                    type="text"
                    value={newCustCity}
                    onChange={(e) => setNewCustCity(e.target.value)}
                    placeholder="e.g. Lahore / Peshawar"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Opening Balance (PKR)</label>
                  <input
                    type="number"
                    value={newCustOpeningBalance}
                    onChange={(e) => setNewCustOpeningBalance(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Market Address (Optional)</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Shop # / Grain Market..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/20"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-lime-600 hover:bg-lime-700 text-white font-bold shadow-sm"
                >
                  Save & Select Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RESUME HELD DRAFTS */}
      {showDraftsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Held Sales Drafts ({drafts.length})</h3>
              </div>
              <button onClick={() => setShowDraftsModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-80 overflow-y-auto text-xs">
              {drafts.length === 0 ? (
                <p className="text-center py-6 text-stone-400">No active held drafts.</p>
              ) : (
                drafts.map((d) => (
                  <div key={d.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                    <div>
                      <strong className="text-stone-900 block">{d.customerName}</strong>
                      <span className="text-[10px] text-stone-400">
                        {d.customerCategory} • {d.cart.length} items • Held at {d.savedAt}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleResumeDraft(d)}
                        className="px-3 py-1.5 rounded-lg bg-lime-600 hover:bg-lime-700 text-white font-bold text-xs flex items-center gap-1"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Resume
                      </button>
                      <button
                        onClick={() => setDrafts(drafts.filter((item) => item.id !== d.id))}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
