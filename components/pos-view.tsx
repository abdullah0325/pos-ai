'use client'

import { confirmAction } from '@/lib/confirmation'

import CatalogPhoto from './catalog-photo'
import AiVoice from './ai-voice'
import ModuleHeading from './module-heading'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  ScanLine,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  Download,
  Share2,
  Upload,
  X,
  Building2,
  Truck,
  User,
  Package,
  Receipt,
  ChevronDown,
  UserPlus,
  PauseCircle,
  PlayCircle,
  TrendingUp,
  Banknote,
  Clock,
  Store,
  Check,
  ExternalLink,
  ShieldAlert,
  FolderTree,
  Tag,
  CreditCard,
  Layers,
  AlertCircle,
  Users,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  type AppDatabase,
  type ProductItem,
  type CustomerItem,
  type CustomerCategoryItem,
  defaultCustomerCategories,
  type InvoiceItem,
  type InvoiceLineItem,
  type LedgerEntry,
  type CustomerType,
  type Status,
  fileToBase64,
} from '@/lib/db'
import { generateInvoicePDF } from '@/lib/pdf-export'

interface PosViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigate?: (module: string, subTab?: string) => void
}

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
  voiceSource?: boolean
  id: string
  savedAt: string
  selectedCategoryName: string
  selectedCustomerId?: string
  customerName: string
  cart: CartItem[]
  cartDiscountType: 'percent' | 'fixed'
  cartDiscountValue: number
  notes?: string
}

export default function PosView({ db, onSaveDatabase, onNavigate }: PosViewProps) {
  const [voiceDraft, setVoiceDraft] = useState(false)
  // 1. DYNAMIC CUSTOMER CATEGORIES (Pulled directly from Customer Management)
  const liveCustomerCategories = useMemo<CustomerCategoryItem[]>(() => {
    const base =
      db.customerCategories && db.customerCategories.length > 0
        ? db.customerCategories
        : defaultCustomerCategories

    // Also include any unique custom types that exist on registered customers
    const knownNames = new Set(base.map((c) => c.name.toLowerCase().trim()))
    const extra: CustomerCategoryItem[] = []

    db.customers.forEach((cust) => {
      const t = (cust.type || '').trim()
      if (t && !knownNames.has(t.toLowerCase())) {
        knownNames.add(t.toLowerCase())
        const isWholesale =
          t.toLowerCase().includes('distributor') ||
          t.toLowerCase().includes('wholesal') ||
          t.toLowerCase().includes('sales') ||
          t.toLowerCase().includes('van')
        const isWalkin =
          t.toLowerCase().includes('walk') ||
          t.toLowerCase().includes('counter') ||
          t.toLowerCase().includes('direct')
        extra.push({
          id: `cat-${t.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: t,
          parentType: isWholesale ? 'Wholesaler' : isWalkin ? 'Walk-in' : 'Retailer',
          description: `Custom category (${t})`,
        })
      }
    })

    return [...base, ...extra]
  }, [db.customerCategories, db.customers])

  // Active selected Category name (defaults to 'Walk-in Customer' or first category)
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('Walk-in Customer')

  // Find category object
  const activeCustomerCategory = useMemo<CustomerCategoryItem>(() => {
    const found = liveCustomerCategories.find(
      (c) => c.name.toLowerCase() === (selectedCategoryName || '').toLowerCase()
    )
    if (found) return found
    return (
      liveCustomerCategories[0] || {
        id: 'ccat-default',
        name: selectedCategoryName || 'Walk-in Customer',
        parentType: 'Walk-in',
      }
    )
  }, [liveCustomerCategories, selectedCategoryName])

  // Check if current category uses wholesale rates
  const isWholesaleActive = useMemo(() => {
    if (activeCustomerCategory.parentType === 'Wholesaler') return true
    const n = activeCustomerCategory.name.toLowerCase()
    return (
      n.includes('distributor') ||
      n.includes('wholesal') ||
      n.includes('sales man') ||
      n.includes('salesman') ||
      n.includes('sales representative') ||
      n.includes('rep') ||
      n.includes('van')
    )
  }, [activeCustomerCategory])

  // Check if current category is Walk-in
  const isWalkinActive = useMemo(() => {
    if (activeCustomerCategory.parentType === 'Walk-in') return true
    const n = activeCustomerCategory.name.toLowerCase()
    return n.includes('walk') || n.includes('counter') || n.includes('direct')
  }, [activeCustomerCategory])

  // Selected Customer ID & Search Dropdown
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false)

  // Walk-in direct buyer details
  const [walkinCustomerName, setWalkinCustomerName] = useState('Walk-in Retail Customer')
  const [walkinCustomerPhone, setWalkinCustomerPhone] = useState('')

  // Quick Add Customer Modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [newCustName, setNewCustName] = useState('')
  const [newCustType, setNewCustType] = useState<string>('Retailer')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustAddress, setNewCustAddress] = useState('')
  const [newCustCity, setNewCustCity] = useState('')
  const [newCustOpeningBalance, setNewCustOpeningBalance] = useState<number>(0)

  // 2. Product Search and Category Filter
  const [productQuery, setProductQuery] = useState('')
  const [productEntryMode, setProductEntryMode] = useState<'manual' | 'scan' | null>(null)
  const productEntryDialog = useRef<HTMLDialogElement>(null)
  const currentSaleHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (productEntryMode) {
      productEntryDialog.current?.showModal()
      productEntryDialog.current?.querySelector<HTMLInputElement>('input')?.focus()
    } else {
      productEntryDialog.current?.close()
    }
  }, [productEntryMode])
  const returnToCurrentSale = () => {
    setProductEntryMode(null)
    requestAnimationFrame(() => {
      currentSaleHeading.current?.scrollIntoView({ block: 'nearest' })
      currentSaleHeading.current?.focus({ preventScroll: true })
    })
  }
  const [scanCode, setScanCode] = useState('')
  const [entryMessage, setEntryMessage] = useState('')
  const [manualProduct, setManualProduct] = useState({ name: '', sku: '', price: '', cost: '', stock: '', unit: 'Pcs' })
  const closingProductEntry = useRef(false)
  const closeProductEntry = async () => {
    if (closingProductEntry.current) return
    const hasInput = productEntryMode === 'scan'
      ? scanCode.length > 0
      : Object.entries(manualProduct).some(([key, value]) => key === 'unit' ? value !== 'Pcs' : value.length > 0)
    closingProductEntry.current = true
    try {
      if (hasInput && !(await confirmAction({
        title: 'Discard entered details?',
        message: 'Your unsaved product details will be lost.',
        confirmLabel: 'Discard',
        destructive: true,
      }))) return
      setScanCode('')
      setManualProduct({ name: '', sku: '', price: '', cost: '', stock: '', unit: 'Pcs' })
      setEntryMessage('')
      setProductEntryMode(null)
    } finally {
      closingProductEntry.current = false
    }
  }

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
  const [invoiceDueDate, setInvoiceDueDate] = useState<string>('')
  const [paymentScreenshot, setPaymentScreenshot] = useState<string>('')
  const [orderNotes, setOrderNotes] = useState('')

  // 6. Post-Checkout Confirmation & Print Modal
  const [completedInvoice, setCompletedInvoice] = useState<InvoiceItem | null>(null)
  const [printMode, setPrintMode] = useState<'thermal' | 'a4'>('thermal')

  // 7. Drafts / Hold Sales
  const [drafts, setDrafts] = useState<PosDraft[]>([])
  const [showDraftsModal, setShowDraftsModal] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filtered registered customer profiles for the active category
  const filteredProfiles = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase()
    const catName = activeCustomerCategory.name.toLowerCase()
    const parentType = activeCustomerCategory.parentType

    let pool: CustomerItem[] = []

    if (isWalkinActive) {
      pool = db.customers.filter((c) => {
        const t = (c.type || '').toLowerCase()
        return (
          t.includes('walk') ||
          t.includes('counter') ||
          t.includes('direct') ||
          t === 'other' ||
          t === ''
        )
      })
      if (pool.length === 0) {
        pool = db.customers
      }
    } else {
      pool = db.customers.filter((c) => {
        const cType = (c.type || '').trim().toLowerCase()
        if (cType === catName) return true
        if (parentType === 'Wholesaler') {
          return (
            cType.includes('distributor') ||
            cType.includes('wholesal') ||
            cType.includes('sales') ||
            cType.includes('rep') ||
            cType.includes('van')
          )
        }
        if (parentType === 'Retailer') {
          return cType.includes('retail') || cType.includes('shop') || cType.includes('mart')
        }
        return false
      })

      // If no customer matches the specific category filter, show all non-walk-in customers
      if (pool.length === 0) {
        pool = db.customers.filter((c) => {
          const t = (c.type || '').toLowerCase()
          return !t.includes('walk') && !t.includes('counter')
        })
      }
    }

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
  }, [db.customers, activeCustomerCategory, isWalkinActive, customerSearchQuery])

  // Currently selected customer profile
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null
    return db.customers.find((c) => c.id === selectedCustomerId) || null
  }, [db.customers, selectedCustomerId])

  // Extract all categories from products & categories
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



  // Pricing Rule: Wholesale category auto-applies Wholesale rate; Retail / Walk-in applies Retail rate
  const getProductPriceForQty = (
    product: ProductItem,
    qty: number,
    wholesaleActive: boolean
  ): { price: number; tier: 'Retail' | 'Wholesale' } => {
    if (wholesaleActive) {
      return { price: product.wholesalePrice, tier: 'Wholesale' }
    }
    const wholesaleLimit =
      product.wholesaleMinQty && product.wholesaleMinQty > 0 ? product.wholesaleMinQty : 999999
    if (qty >= wholesaleLimit) {
      return { price: product.wholesalePrice, tier: 'Wholesale' }
    }
    return { price: product.retailPrice, tier: 'Retail' }
  }

  // Calculate line item discount & total
  const calculateItemLine = (
    product: ProductItem,
    qty: number,
    wholesaleActive: boolean,
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
      const calculated = getProductPriceForQty(product, qty, wholesaleActive)
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

  // One-click add to cart: if already in cart, increases quantity
  const handleAddToCart = (product: ProductItem) => {
    const freshProduct = db.products.find((p) => p.id === product.id) || product
    const existingIndex = cart.findIndex((item) => item.product.id === freshProduct.id)

    if (existingIndex >= 0) {
      const existing = cart[existingIndex]
      const newQty = existing.quantity + 1

      if (newQty > freshProduct.quantity) {
        alert(`Stock limit reached! Only ${freshProduct.quantity} ${freshProduct.unit} available in warehouse.`)
        return
      }

      const updatedItem = calculateItemLine(
        freshProduct,
        newQty,
        isWholesaleActive,
        existing.discountType,
        existing.discountValue
      )
      const newCart = [...cart]
      newCart[existingIndex] = updatedItem
      setCart(newCart)
    } else {
      if (freshProduct.quantity <= 0) {
        alert(`Product is currently Out of Stock (${freshProduct.quantity} in inventory).`)
        return
      }
      const newItem = calculateItemLine(freshProduct, 1, isWholesaleActive, 'fixed', 0)
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
      isWholesaleActive,
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
      isWholesaleActive,
      type,
      val
    )
    const newCart = [...cart]
    newCart[index] = updated
    setCart(newCart)
  }

  const handleScanProduct = (event: React.FormEvent) => {
    event.preventDefault()
    const code = scanCode.trim().toLowerCase()
    if (!code) return
    const matches = db.products.filter(product => product.sku.trim().toLowerCase() === code)
    if (matches.length !== 1) {
      setEntryMessage(matches.length ? 'Multiple products use this SKU. Select the correct product from the catalog.' : 'No product found. Scan the product SKU or add it manually.')
      return
    }
    const product = matches[0]
    const quantity = cart.find(item => item.product.id === product.id)?.quantity || 0
    if (quantity + 1 > product.quantity) {
      setEntryMessage('Stock limit reached for ' + product.name)
      return
    }
    handleAddToCart(product)
    setEntryMessage(product.name + ' added to cart.')
    setScanCode('')
    returnToCurrentSale()
  }

  const handleManualProduct = (event: React.FormEvent) => {
    event.preventDefault()
    const name = manualProduct.name.trim()
    const sku = manualProduct.sku.trim()
    const price = Number(manualProduct.price)
    const stock = Number(manualProduct.stock)
    const cost = Number(manualProduct.cost)
    if (!name || !sku || !manualProduct.cost || !Number.isFinite(cost) || cost < 0 || !manualProduct.price || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 1) {
      setEntryMessage('Enter a name, unique SKU, valid cost, positive selling price, and whole stock quantity of at least 1.')
      return
    }
    if (db.products.some(product => product.sku.trim().toLowerCase() === sku.toLowerCase())) {
      setEntryMessage('This SKU already exists. Find it in the catalog or scan it.')
      return
    }
    const product: ProductItem = {
      id: 'prod-' + crypto.randomUUID(), name, sku, category: 'General', unit: manualProduct.unit,
      quantity: stock, retailPrice: price, wholesalePrice: price, costPrice: cost, reorderLevel: 0,
      status: 'Active', updatedAt: new Date().toISOString().slice(0, 10),
    }
    try {
      onSaveDatabase({ ...db, products: [...db.products, product] })
      handleAddToCart(product)
      setManualProduct({ name: '', sku: '', price: '', cost: '', stock: '', unit: 'Pcs' })
      setEntryMessage(name + ' saved to the catalog and added to cart.')
      returnToCurrentSale()
    } catch {
      setEntryMessage('Unable to save the product. Please try again.')
    }
  }

  // Toggle Pricing Tier manually (Retail vs Wholesale)
  const handleToggleItemTier = (index: number) => {
    const current = cart[index]
    const nextTier: 'Retail' | 'Wholesale' = current.pricingTier === 'Retail' ? 'Wholesale' : 'Retail'
    const updated = calculateItemLine(
      current.product,
      current.quantity,
      isWholesaleActive,
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

  // Switch Customer Category Dropdown
  const handleCategoryChange = (newCatName: string) => {
    setSelectedCategoryName(newCatName)
    setSelectedCustomerId('')
    setCustomerSearchQuery('')
    setIsCustomerDropdownOpen(false)

    const targetCat = liveCustomerCategories.find((c) => c.name === newCatName)
    const isWholesale = targetCat ? targetCat.parentType === 'Wholesaler' || targetCat.name.toLowerCase().includes('distributor') || targetCat.name.toLowerCase().includes('wholesal') : false

    // Re-evaluate pricing for items in cart
    const reevaluatedCart = cart.map((item) =>
      calculateItemLine(
        item.product,
        item.quantity,
        isWholesale,
        item.discountType,
        item.discountValue
      )
    )
    setCart(reevaluatedCart)
  }

  // Save New Customer On-The-Fly
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

    onSaveDatabase({
      ...db,
      customers: [newCustomer, ...db.customers],
    })

    // Auto-select this newly created category and customer
    setSelectedCategoryName(newCustType)
    setSelectedCustomerId(newId)
    setShowNewCustomerModal(false)

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

    const draftName = isWalkinActive
      ? walkinCustomerName || 'Walk-in Sale'
      : selectedCustomer?.name || `${selectedCategoryName} Sale`

    const newDraft: PosDraft = {
      voiceSource: voiceDraft,
      id: `draft-${Date.now()}`,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      selectedCategoryName,
      selectedCustomerId: selectedCustomerId || undefined,
      customerName: draftName,
      cart: [...cart],
      cartDiscountType,
      cartDiscountValue,
      notes: orderNotes,
    }

    setDrafts([newDraft, ...drafts])
    setVoiceDraft(false)
    setCart([])
    setCartDiscountValue(0)
    alert(`Sale held as Draft for "${draftName}".`)
  }

  // Resume Draft Sale
  const handleResumeDraft = (draft: PosDraft) => {
    setVoiceDraft(!!draft.voiceSource)
    setSelectedCategoryName(draft.selectedCategoryName || 'Walk-in Customer')
    if (draft.selectedCustomerId) {
      setSelectedCustomerId(draft.selectedCustomerId)
    }
    setCart(draft.cart)
    setCartDiscountType(draft.cartDiscountType)
    setCartDiscountValue(draft.cartDiscountValue)
    if (draft.notes) setOrderNotes(draft.notes)

    setDrafts(drafts.filter((d) => d.id !== draft.id))
    setShowDraftsModal(false)
  }

  // Open checkout modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      alert('Your cart is empty. Please select products from the catalog.')
      return
    }

    if (!isWalkinActive && !selectedCustomer) {
      alert(`Please select a registered ${selectedCategoryName} profile before checkout, or switch to Walk-in Customer.`)
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

    const customerId = isWalkinActive
      ? selectedCustomer?.id || 'cust-direct-customer'
      : selectedCustomer?.id || `cust-${Date.now()}`

    const customerName = isWalkinActive
      ? selectedCustomer?.name || walkinCustomerName.trim() || 'Walk-in Retail Customer'
      : selectedCustomer?.businessName || selectedCustomer?.name || `${selectedCategoryName} Client`

    const customerType: CustomerType = (selectedCustomer?.type as CustomerType) || (isWholesaleActive ? 'Wholesaler' : isWalkinActive ? 'Counter' : 'Retailer')

    const phone = isWalkinActive
      ? selectedCustomer?.phone || walkinCustomerPhone || '—'
      : selectedCustomer?.phone || '—'

    const address = isWalkinActive
      ? selectedCustomer?.address || 'Factory Gate Counter'
      : selectedCustomer?.address || 'Pakistan'

    const effectiveAmountPaid =
      paymentStatus === 'Paid'
        ? grandTotal
        : paymentStatus === 'Unpaid'
        ? 0
        : Math.min(grandTotal, Math.max(0, Number(amountPaid) || 0))

    const balanceDue = Math.max(0, grandTotal - effectiveAmountPaid)

    // Build Invoice Line Items with product images
    const invoiceLines: InvoiceLineItem[] = cart.map((c) => {
      const liveP = db.products.find((p) => p.id === c.product.id) || c.product
      return {
        productId: c.product.id,
        name: c.product.name,
        quantity: c.quantity,
        unit: c.product.unit,
        unitPrice: c.unitPrice,
        costPrice: c.product.costPrice,
        imageUrl: liveP.imageUrl || (liveP as any).image || c.product.imageUrl || (c.product as any).image,
        discount: c.discountAmount,
        discountType: c.discountType,
        discountValue: c.discountValue,
        pricingTier: c.pricingTier,
        total: c.lineTotal,
      }
    })

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
      saleType: isWholesaleActive ? 'Distributor' : isWalkinActive ? 'Counter' : 'Retail',
      items: invoiceLines,
      subtotal: grossSubtotal,
      discount: totalDiscountsCombined,
      cartDiscountType,
      cartDiscountValue,
      tax: 0,
      grandTotal,
      amountPaid: effectiveAmountPaid,
      balanceDue,
      dueDate: balanceDue > 0 && invoiceDueDate ? invoiceDueDate : undefined,
      paymentMethod: voiceDraft && balanceDue > 0 ? 'Credit' : paymentMethod,
      paymentScreenshot: paymentScreenshot || undefined,
      paymentAccount,
      status: paymentStatus,
      deliveryStatus: 'Delivered',
      notes: orderNotes.trim() || `POS Sale (${selectedCategoryName})`,
      createdAt: now.toISOString(),
    }

    // 1. Post-Sale Automation: Auto-deduct warehouse stock
    const updatedProducts = db.products.map((p) => {
      const matched = cart.find((item) => item.product.id === p.id)
      if (matched) {
        const remaining = voiceDraft ? p.quantity - matched.quantity : Math.max(0, p.quantity - matched.quantity)
        return {
          ...p,
          quantity: remaining,
          status: (remaining <= 0 ? 'Out of stock' : remaining <= p.reorderLevel ? 'Low stock' : 'In stock') as Status,
          updatedAt: dateStr,
        }
      }
      return p
    })

    // 2. Post-Sale Automation: Update Customer Outstanding Balance & Ledger
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

      // Add Ledger Entry for Payment Credit
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

    // 3. Post-Sale Automation: Update Financial Account Balance
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

    if (voiceDraft) updatedDb.aiActivity = [...(db.aiActivity || []), { id: newInvoice.id, type: 'voice', createdAt: now.toISOString(), created: 0 }]
    onSaveDatabase(updatedDb)
    setVoiceDraft(false)

    setCompletedInvoice(newInvoice)
    setShowCheckoutModal(false)
    setPaymentScreenshot('')
    setOrderNotes('')
  }

  // Reset POS for next sale
  const handleResetPOS = () => {
    setVoiceDraft(false)
    setCart([])
    setCartDiscountValue(0)
    setCompletedInvoice(null)
    setPaymentStatus('Paid')
    setPaymentMethod('Cash')
    setAmountPaid(0)
    setPaymentScreenshot('')
  }

  // Direct Print
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
    alert('Receipt text copied to clipboard! Ready to paste into WhatsApp.')
  }

  return (
    <div className="space-y-4" id="pos-terminal-root">
      <AiVoice db={db} onApply={(draft, customerId) => {
        const grouped = new Map<string, number>()
        draft.items.forEach(line => { if (line.matched_product_id) grouped.set(line.matched_product_id, (grouped.get(line.matched_product_id) || 0) + line.qty) })
        const lines: CartItem[] = [...grouped].map(([id, qty]) => {
          const product = db.products.find(p => p.id === id)!
          if (qty > product.quantity) alert(`Warning: ${product.name} will have negative stock.`)
          return { product, quantity: qty, unitPrice: product.retailPrice, pricingTier: 'Retail', discountType: 'fixed', discountValue: 0, discountAmount: 0, lineTotal: qty * product.retailPrice }
        })
        setCart(lines); setVoiceDraft(true); setCompletedInvoice(null)
        setCartDiscountValue(0); setCartDiscountType('fixed'); setOrderNotes(''); setPaymentScreenshot('')
        const customer = db.customers.find(c => c.id === customerId)
        setSelectedCategoryName(customer?.type || 'Walk-in Customer'); setSelectedCustomerId(customerId)
        setPaymentStatus(draft.payment_type === 'credit' ? 'Unpaid' : 'Paid'); setPaymentMethod('Cash'); setAmountPaid(0)
      }} />
      <ModuleHeading icon="invoices" className="pos-no-print">
        <div>
          <p className="eyebrow">Al Farooq Foods · Sales Workspace</p>
          <h1>Point of Sale</h1>
          <p className="subheading">Create sales, manage customer pricing, and issue receipts.</p>
        </div>
      </ModuleHeading>
      {/* 2. DYNAMIC CUSTOMER CATEGORY & SELECTION SECTION */}
      <div data-ui="surface" className="gradient-card bg-white p-4 rounded-2xl shadow-xs border border-stone-200 space-y-3.5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-lime-50 text-lime-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-stone-900 leading-none">Customer & Pricing Tier</h3>
              <p className="text-[10px] text-stone-500 mt-0.5">
                Pricing automatically adapts: {isWholesaleActive ? 'Wholesale Price Tier' : 'Retail Price Tier'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {drafts.length > 0 && (
              <button data-ui="button"
                type="button"
                onClick={() => setShowDraftsModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 transition"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Held Sales ({drafts.length})</span>
              </button>
            )}

            <button data-ui="button"
              type="button"
              onClick={() => {
                setNewCustType(activeCustomerCategory.name)
                setShowNewCustomerModal(true)
              }}
              className="px-3 py-1.5 rounded-xl bg-lime-600 hover:bg-lime-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Quick Add Customer</span>
            </button>

            {onNavigate && (
              <button data-ui="button"
                type="button"
                onClick={() => onNavigate('customer-management')}
                className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 transition"
                title="Manage Customer Directory & Categories"
              >
                <FolderTree className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">Categories</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Category Dropdown + Customer Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Dropdown 1: Live Customer Category Dropdown (Pulls from Customer Management) */}
          <div className="md:col-span-4 space-y-1">
            <label className="block text-[11px] font-bold text-stone-700">
              Customer Category <span className="text-lime-700 font-normal">({liveCustomerCategories.length} live)</span>
            </label>
            <div className="relative">
              <select data-ui="select"
                value={selectedCategoryName}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 text-xs font-semibold text-stone-900 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-500/50 appearance-none transition cursor-pointer"
              >
                {liveCustomerCategories.map((cat) => (
                  <option key={cat.id || cat.name} value={cat.name}>
                    {cat.name} {cat.parentType ? `(${cat.parentType})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            </div>
          </div>

          {/* Dropdown 2 / Input: Customer Selection Listing & Search */}
          <div className="md:col-span-8 space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-stone-700">
                {isWalkinActive ? 'Walk-in Counter Details' : `Select Registered ${selectedCategoryName}`}
              </label>
              {!isWalkinActive && (
                <span className="text-[10px] text-stone-500">
                  {filteredProfiles.length} customer{filteredProfiles.length === 1 ? '' : 's'} available
                </span>
              )}
            </div>

            {isWalkinActive ? (
              /* Walk-in Counter Inputs */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <input data-ui="input"
                    type="text"
                    value={walkinCustomerName}
                    onChange={(e) => setWalkinCustomerName(e.target.value)}
                    placeholder="Walk-in Counter Name"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-lime-500 font-medium text-stone-900"
                  />
                </div>
                <div className="relative">
                  <input data-ui="input"
                    type="text"
                    value={walkinCustomerPhone}
                    onChange={(e) => setWalkinCustomerPhone(e.target.value)}
                    placeholder="Phone (Optional)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-lime-500 font-medium text-stone-900"
                  />
                </div>
              </div>
            ) : (
              /* Searchable Customer Dropdown */
              <div className="relative">
                <div
                  onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    selectedCustomer
                      ? 'border-lime-300 bg-lime-50/30 hover:bg-lime-50/50'
                      : 'border-stone-200 bg-stone-50/60 hover:bg-white'
                  }`}
                >
                  {selectedCustomer ? (
                    <div className="flex items-center gap-2 font-medium text-stone-900 truncate min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-lime-100 text-lime-800 text-[10px] font-bold uppercase shrink-0">
                        {selectedCustomer.type || selectedCategoryName}
                      </span>
                      <span className="font-bold truncate text-stone-900">{selectedCustomer.name}</span>
                      {selectedCustomer.businessName && (
                        <span className="text-stone-500 text-[11px] truncate">
                          ({selectedCustomer.businessName})
                        </span>
                      )}
                      <span className="text-stone-400 text-[10px] hidden sm:inline truncate">
                        • {selectedCustomer.city || selectedCustomer.address} • {selectedCustomer.phone}
                      </span>
                    </div>
                  ) : (
                    <span className="text-stone-400 flex items-center gap-2 truncate">
                      <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      Click to choose registered customer ({filteredProfiles.length} found)...
                    </span>
                  )}

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {selectedCustomer && (
                      <button data-ui="button"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedCustomerId('')
                        }}
                        className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition"
                        title="Clear customer selection"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  </div>
                </div>

                {/* Dropdown Menu Popup */}
                {isCustomerDropdownOpen && (
                  <div className="gradient-card absolute top-full left-0 right-0 z-40 mt-1.5 bg-white rounded-2xl shadow-xl border border-stone-200 max-h-64 overflow-hidden flex flex-col p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                      <input data-ui="input"
                        type="text"
                        autoFocus
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        placeholder={`Search ${selectedCategoryName} by name, business, phone, city...`}
                        className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-500/50"
                      />
                    </div>

                    {/* Customer Items List */}
                    <div className="overflow-y-auto space-y-1 pr-1 max-h-48">
                      {/* Top Quick Add Trigger inside Dropdown */}
                      <div
                        onClick={() => {
                          setIsCustomerDropdownOpen(false)
                          setNewCustType(activeCustomerCategory.name)
                          setShowNewCustomerModal(true)
                        }}
                        className="p-2 rounded-xl bg-lime-50/70 hover:bg-lime-100 text-lime-800 text-xs font-bold cursor-pointer flex items-center justify-between transition border border-dashed border-lime-300"
                      >
                        <div className="flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5 text-lime-700" />
                          <span>+ Register New {selectedCategoryName} Customer</span>
                        </div>
                        <span className="text-[10px] text-lime-700">Quick Add</span>
                      </div>

                      {filteredProfiles.length === 0 ? (
                        <div className="p-4 text-center text-xs text-stone-500">
                          No registered customer matches &quot;{customerSearchQuery}&quot;.
                        </div>
                      ) : (
                        filteredProfiles.map((cust) => {
                          const isSelected = selectedCustomerId === cust.id
                          return (
                            <div data-ui="surface"
                              key={cust.id}
                              onClick={() => {
                                setSelectedCustomerId(cust.id)
                                setIsCustomerDropdownOpen(false)
                              }}
                              className={`p-2.5 rounded-xl cursor-pointer text-xs flex items-center justify-between transition ${
                                isSelected
                                  ? 'bg-lime-600 text-white font-bold shadow-xs'
                                  : 'hover:bg-stone-50 text-stone-800 border border-transparent hover:border-stone-100'
                              }`}
                            >
                              <div className="truncate min-w-0 pr-2">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="font-bold truncate">{cust.name}</span>
                                  {cust.businessName && (
                                    <span
                                      className={`text-[11px] truncate ${
                                        isSelected ? 'text-lime-100' : 'text-stone-500'
                                      }`}
                                    >
                                      ({cust.businessName})
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`text-[10px] mt-0.5 truncate ${
                                    isSelected ? 'text-lime-200' : 'text-stone-400'
                                  }`}
                                >
                                  {cust.phone} • {cust.city || cust.address || 'Pakistan'}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span
                                  className={`text-[11px] font-bold block ${
                                    isSelected
                                      ? 'text-white'
                                      : cust.currentBalance > 0
                                      ? 'text-amber-600'
                                      : 'text-emerald-600'
                                  }`}
                                >
                                  {formatPKR(cust.currentBalance)}
                                </span>
                                <span
                                  className={`text-[9px] block ${
                                    isSelected ? 'text-lime-200' : 'text-stone-400'
                                  }`}
                                >
                                  Balance
                                </span>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Inline Customer Financial & Credit Note (Visual Reference for Cashier) */}
        {selectedCustomer && (
          <div className="bg-stone-50/90 rounded-xl p-2.5 border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              {/* Outstanding Balance */}
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 text-[11px]">Outstanding Due:</span>
                <span
                  className={`font-bold ${
                    selectedCustomer.currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {formatPKR(selectedCustomer.currentBalance)}
                </span>
              </div>

              <span className="text-stone-300 hidden sm:inline">•</span>

              {/* Credit Limit */}
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 text-[11px]">Credit Limit:</span>
                <span className="font-bold text-stone-800">
                  {formatPKR(selectedCustomer.creditLimit || 200000)}
                </span>
              </div>

              <span className="text-stone-300 hidden sm:inline">•</span>

              {/* Available Limit */}
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 text-[11px]">Available Credit:</span>
                <span className="font-semibold text-stone-700">
                  {formatPKR(
                    Math.max(0, (selectedCustomer.creditLimit || 200000) - selectedCustomer.currentBalance)
                  )}
                </span>
              </div>
            </div>

            {/* Credit Standing Badge */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
              {selectedCustomer.currentBalance > (selectedCustomer.creditLimit || 200000) ? (
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  Credit Limit Exceeded
                </span>
              ) : selectedCustomer.currentBalance > 0 ? (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-600" />
                  Balance Pending
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Clear Standing
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <dialog ref={productEntryDialog} className="pos-product-dialog" aria-labelledby="pos-product-dialog-title" onCancel={(event) => { event.preventDefault(); void closeProductEntry() }} onClose={() => setProductEntryMode(null)}>
        <div className="pos-entry-panel">
          <div className="pos-product-dialog-header">
            <h2 id="pos-product-dialog-title">{productEntryMode === 'manual' ? 'Add product' : 'Scan product'}</h2>
            <button type="button" aria-label="Close product entry" onClick={() => void closeProductEntry()}><X size={18} /></button>
          </div>
            {productEntryMode === 'scan' && <form onSubmit={handleScanProduct} className="pos-scan-form">
              <label htmlFor="pos-scan-code">Scan barcode / SKU</label>
              <p>Use a USB or Bluetooth barcode scanner, or type a SKU and press Enter. Barcodes must match a product SKU.</p>
              <div><input id="pos-scan-code" autoFocus autoComplete="off" value={scanCode} onChange={event => setScanCode(event.target.value)} placeholder="Scan or enter SKU" /><button type="submit" className="button primary">Add to cart</button></div>
            </form>}
            {productEntryMode === 'manual' && <form onSubmit={handleManualProduct} className="pos-manual-form">
              <p>Create a catalog product and add one unit to this sale. Retail and wholesale prices will use the selling price below.</p>
              <div className="pos-manual-fields">
                <label>Product name<input required value={manualProduct.name} onChange={event => setManualProduct({ ...manualProduct, name: event.target.value })} /></label>
                <label>SKU / barcode<input required value={manualProduct.sku} onChange={event => setManualProduct({ ...manualProduct, sku: event.target.value })} /></label>
                <label>Selling price (Rs.)<input required type="number" min="0.01" step="0.01" value={manualProduct.price} onChange={event => setManualProduct({ ...manualProduct, price: event.target.value })} /></label>
                <label>Unit cost (Rs.)<input required type="number" min="0" step="0.01" value={manualProduct.cost} onChange={event => setManualProduct({ ...manualProduct, cost: event.target.value })} /></label>
                <label>Stock quantity<input required type="number" min="1" step="1" value={manualProduct.stock} onChange={event => setManualProduct({ ...manualProduct, stock: event.target.value })} /></label>
                <label>Unit<select value={manualProduct.unit} onChange={event => setManualProduct({ ...manualProduct, unit: event.target.value })}>{['Pcs', 'Cartons', 'Bottles', 'Jars', 'Boxes', 'Packs'].map(unit => <option key={unit}>{unit}</option>)}</select></label>
              </div>
              <button type="submit" className="button primary">Save & add to cart</button>
            </form>}
            {entryMessage && <p className="pos-entry-message" role="status">{entryMessage}</p>}

        </div>
      </dialog>
      {/* 3. PRODUCT CATALOG (LEFT) + CLEAN CART (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT: SIMPLIFIED PRODUCT CATALOG */}
        <div className="lg:col-span-7 space-y-3">
          {/* Search & Category Pills */}
          <div data-ui="surface" className="gradient-card bg-white p-3 rounded-2xl shadow-xs border border-stone-100 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input data-ui="input"
                type="text"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Search products by name or SKU..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-lime-500"
              />
              {productQuery && (
                <button data-ui="button" onClick={() => setProductQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-none">
              {availableCategories.map((cat) => (
                <button data-ui="button"
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl font-semibold text-xs whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-lime-600 text-white shadow-2xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* SIMPLIFIED PRODUCT CARDS GRID: FLAT & MINIMAL */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 max-h-[660px] overflow-y-auto p-1">
            {filteredProducts.map((p) => {
              const inCartItem = cart.find((item) => item.product.id === p.id)
              const isOut = p.quantity <= 0
              const currentPrice = isWholesaleActive ? p.wholesalePrice : p.retailPrice

              return (
                <div data-ui="toolbar"
                  key={p.id}
                  onClick={() => {
                    if (!isOut) handleAddToCart(p)
                  }}
                  className={`group relative bg-white rounded-2xl p-2.5 flex flex-col justify-between transition-all duration-150 select-none shadow-xs hover:shadow-md ${
                    isOut
                      ? 'opacity-50 cursor-not-allowed'
                      : inCartItem
                      ? 'cursor-pointer ring-2 ring-lime-500/80 bg-lime-50/20'
                      : 'cursor-pointer hover:-translate-y-0.5'
                  }`}
                >
                  {/* Top Image Box */}
                  <div className="aspect-square w-full rounded-xl bg-stone-100/70 overflow-hidden relative mb-2 flex items-center justify-center">
                    <CatalogPhoto item={p}
                        src={p.imageUrl || (p as any).image}
                        alt={p.name}
                        className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-200"
                      />

                    {/* Out of Stock Overlay */}
                    {isOut && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                        <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold">Out of stock</span>
                      </div>
                    )}

                    {/* In-cart count indicator badge */}
                    {inCartItem && (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-lime-600 text-white text-[10px] font-black shadow-xs flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" />
                        {inCartItem.quantity}
                      </div>
                    )}
                  </div>

                  {/* Product Details: Name, Single Applicable Price, Single Icon Action */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-xs text-stone-900 line-clamp-1 leading-snug group-hover:text-lime-700 transition" title={p.name}>
                      {p.name}
                    </h3>

                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-xs font-black text-lime-700">
                        {formatPKR(currentPrice)}
                      </span>

                      {/* Single Add-to-Cart Icon Button */}
                      <button data-ui="button"
                        type="button"
                        disabled={isOut}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!isOut) handleAddToCart(p)
                        }}
                        className="pos-product-add"
                        aria-label={`Add ${p.name} to cart`}
                        title="Add to cart"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: STREAMLINED LIVE CART */}
        <div className="lg:col-span-5 space-y-3">
          <div data-ui="surface" className="pos-current-sale gradient-card bg-white p-3.5 rounded-2xl shadow-xs border border-stone-100 space-y-3 sticky top-3">
            {/* Cart Header */}
            <div className="pos-cart-header flex items-center justify-between pb-2.5 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-lime-600" />
                <h2 ref={currentSaleHeading} tabIndex={-1} className="text-sm font-bold text-stone-900">Current Sale</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-lime-100 text-lime-800">
                  {cart.length} ({totalUnitsCount} units)
                </span>
              </div>

              {cart.length > 0 && (
                <div className="flex items-center gap-1">
                  <button data-ui="button"
                    onClick={handleHoldSale}
                    className="p-1 rounded-md text-amber-700 hover:bg-amber-50 text-xs font-semibold flex items-center gap-1 transition"
                    title="Hold Sale as Draft"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    Hold
                  </button>
                  <button data-ui="button"
                    onClick={async () => {
                      if (await confirmAction({
                        title: 'Clear current sale?',
                        message: `Remove ${cart.length} ${cart.length === 1 ? 'product' : 'products'} and all discounts from this cart? Saved sales and inventory will stay unchanged.`,
                        confirmLabel: 'Clear cart',
                        destructive: true,
                      })) {
                        setVoiceDraft(false)
                        setCart([])
                        setCartDiscountValue(0)
                      }
                    }}
                    className="p-1 rounded-md text-rose-600 hover:bg-rose-50 text-xs transition"
                    title="Clear Cart"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="pos-sale-entry-actions">
              <button type="button" onClick={() => { setEntryMessage(''); setProductEntryMode('manual') }}><Plus size={16} /> Add product</button>
              <button type="button" onClick={() => { setEntryMessage(''); setScanCode(''); setProductEntryMode('scan') }}><ScanLine size={16} /> Scan SKU</button>
            </div>
            {!productEntryMode && entryMessage && <p className="pos-entry-message" role="status">{entryMessage}</p>}
            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-stone-400">
                <ShoppingCart className="w-8 h-8 mx-auto text-stone-300 mb-1.5" />
                <p className="text-xs font-medium text-stone-600">Cart is empty</p>
                <p className="text-[11px] text-stone-400">Click any product on the left to add</p>
              </div>
            ) : (
              <div className="pos-cart-items space-y-2 max-h-72 overflow-y-auto pr-0.5">
                {cart.map((item, index) => {
                  const liveProduct = db.products.find((p) => p.id === item.product.id) || item.product
                  const itemImage = liveProduct.imageUrl || (liveProduct as any).image || item.product.imageUrl || (item.product as any).image

                  return (
                    <div key={item.product.id} className="pos-cart-item bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/50 space-y-1.5">
                      <div className="flex items-start gap-2.5">
                        {/* Product Image Thumbnail in Cart */}
                        <div className="w-11 h-11 rounded-lg bg-white shrink-0 overflow-hidden relative flex items-center justify-center border border-stone-200/80 shadow-2xs">
                          <CatalogPhoto item={liveProduct}
                              src={itemImage}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="truncate">
                              <h4 className="font-bold text-xs text-stone-900 leading-snug truncate" title={item.product.name}>
                                {item.product.name}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <button data-ui="button"
                                  type="button"
                                  onClick={() => handleToggleItemTier(index)}
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase transition ${
                                    item.pricingTier === 'Wholesale'
                                      ? 'bg-lime-600 text-white'
                                      : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                                  }`}
                                  title="Toggle Retail / Wholesale price tier"
                                >
                                  {item.pricingTier} ({formatPKR(item.unitPrice)})
                                </button>
                                <span className="text-[10px] text-stone-400">× {item.quantity}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-stone-900 block">{formatPKR(item.lineTotal)}</span>
                              {item.discountAmount > 0 && (
                                <span className="text-[10px] text-rose-600 font-semibold block">
                                  -{formatPKR(item.discountAmount)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Modifier & Line Discount */}
                      <div className="pos-cart-item-controls flex items-center justify-between gap-2 pt-1 border-t border-stone-200/50">
                        {/* Qty +/- */}
                        <div className="flex items-center gap-1">
                          <button data-ui="button"
                            type="button"
                            aria-label={`Decrease quantity of ${item.product.name}`}
                            onClick={() => handleUpdateQty(index, item.quantity - 1)}
                            className="w-5 h-5 rounded bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center text-xs font-bold"
                          >
                            -
                          </button>
                          <input data-ui="input"
                            type="number"
                            min="1"
                            aria-label={`Quantity of ${item.product.name}`}
                            value={item.quantity}
                            onChange={(e) => handleUpdateQty(index, Number(e.target.value) || 1)}
                            className="w-9 text-center text-xs font-bold py-0.2 rounded border border-stone-200 bg-white"
                          />
                          <button data-ui="button"
                            type="button"
                            aria-label={`Increase quantity of ${item.product.name}`}
                            onClick={() => handleUpdateQty(index, item.quantity + 1)}
                            className="w-5 h-5 rounded bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center text-xs font-bold"
                          >
                            +
                          </button>
                        </div>

                      {/* Line Discount Input */}
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-stone-500 text-[10px]">Disc:</span>
                        <input data-ui="input"
                          type="number"
                          min="0"
                          aria-label={`Discount for ${item.product.name}`}
                          value={item.discountValue || ''}
                          onChange={(e) => handleUpdateItemDiscount(index, item.discountType, Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-10 text-center text-xs font-medium py-0.2 rounded border border-stone-200 bg-white"
                        />
                        <button data-ui="button"
                          type="button"
                          onClick={() =>
                            handleUpdateItemDiscount(
                              index,
                              item.discountType === 'fixed' ? 'percent' : 'fixed',
                              item.discountValue
                            )
                          }
                          className="px-1 py-0.2 rounded bg-stone-200 text-stone-700 font-bold text-[9px]"
                          title="Toggle Rs. / %"
                        >
                          {item.discountType === 'fixed' ? 'Rs' : '%'}
                        </button>
                      </div>

                      {/* Delete item */}
                      <button data-ui="button"
                        type="button"
                        aria-label={`Remove ${item.product.name} from cart`}
                        onClick={() => handleRemoveItem(index)}
                        className="text-stone-400 hover:text-red-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

            {/* Cart Summary & Overall Discount */}
            {cart.length > 0 && (
              <div className="pos-cart-summary pt-2.5 border-t border-stone-100 space-y-2.5">
                {/* Total Bill Discount */}
                <div className="pos-bill-discount flex items-center justify-between bg-stone-50 p-2 rounded-xl text-xs">
                  <span className="font-semibold text-stone-700">Bill Discount:</span>
                  <div className="flex items-center gap-1">
                    <input data-ui="input"
                      type="number"
                      min="0"
                      aria-label="Bill discount"
                      value={cartDiscountValue || ''}
                      onChange={(e) => setCartDiscountValue(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-14 text-center text-xs font-bold py-0.5 rounded border border-stone-200 bg-white"
                    />
                    <button data-ui="button"
                      type="button"
                      onClick={() => setCartDiscountType(cartDiscountType === 'fixed' ? 'percent' : 'fixed')}
                      className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-bold text-[10px]"
                    >
                      {cartDiscountType === 'fixed' ? 'PKR' : '%'}
                    </button>
                  </div>
                </div>

                {/* Subtotal & Totals Table */}
                <div className="pos-cart-totals space-y-1 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-stone-900">{formatPKR(grossSubtotal)}</span>
                  </div>
                  {totalDiscountsCombined > 0 && (
                    <div className="flex justify-between text-rose-600 font-medium">
                      <span>Discounts:</span>
                      <span>-{formatPKR(totalDiscountsCombined)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-stone-900 pt-1.5 border-t border-stone-200">
                    <span>Grand Total:</span>
                    <span className="text-lime-700 text-base font-black">{formatPKR(grandTotal)}</span>
                  </div>
                </div>

                {/* Checkout CTA Button */}
                <button data-ui="button"
                  type="button"
                  onClick={handleOpenCheckout}
                  className="w-full py-2.5 rounded-xl bg-lime-600 hover:bg-lime-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                  id="btn-pos-checkout"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Proceed to Checkout ({formatPKR(grandTotal)})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: CHECKOUT & SETTLEMENT */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div data-ui="surface" className="gradient-card bg-white w-full max-w-md rounded-2xl shadow-xl border border-stone-200 overflow-hidden my-6">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-lime-400" />
                <h3 className="font-bold text-sm">Complete Sale & Issue Invoice</h3>
              </div>
              <button data-ui="button" onClick={() => setShowCheckoutModal(false)} className="text-stone-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto text-xs">
              <div data-ui="surface" className="gradient-card bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-stone-500 block text-[10px]">Buyer / Account:</span>
                  <strong className="text-xs font-bold text-stone-900">
                    {isWalkinActive
                      ? walkinCustomerName || 'Walk-in Customer'
                      : selectedCustomer?.name || `${selectedCategoryName} Client`}
                  </strong>
                  <span className="text-[10px] text-stone-400 block">{selectedCategoryName}</span>
                </div>
                <div className="text-right">
                  <span className="text-stone-500 block text-[10px]">Total Payable:</span>
                  <strong className="text-base font-black text-lime-700">{formatPKR(grandTotal)}</strong>
                </div>
              </div>

              {/* Order Items Preview with Product Images */}
              <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-200 space-y-1.5 max-h-36 overflow-y-auto">
                <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 px-0.5">
                  <span>Selected Products ({cart.length})</span>
                  <span>Qty: {cart.reduce((s, it) => s + it.quantity, 0)}</span>
                </div>
                <div className="space-y-1">
                  {cart.map((item) => {
                    const liveProd = db.products.find((p) => p.id === item.product.id) || item.product
                    const itemImg = liveProd.imageUrl || (liveProd as any).image || item.product.imageUrl || (item.product as any).image
                    return (
                      <div key={item.product.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-stone-200/60 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded bg-stone-100 border border-stone-200 shrink-0 overflow-hidden flex items-center justify-center">
                            <CatalogPhoto item={liveProd} src={itemImg} alt={item.product.name} className="w-full h-full object-cover" />
                          </div>
                          <span className="font-semibold text-stone-900 truncate max-w-[170px]">{item.product.name}</span>
                          <span className="text-stone-400 text-[10px] shrink-0">× {item.quantity}</span>
                        </div>
                        <span className="font-bold text-stone-800 shrink-0">{formatPKR(item.lineTotal)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">Payment Status</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button data-ui="button"
                    type="button"
                    onClick={() => {
                      setPaymentStatus('Paid')
                      setAmountPaid(grandTotal)
                    }}
                    className={`py-1.5 px-2 rounded-lg border font-bold text-xs transition ${
                      paymentStatus === 'Paid'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-stone-200 bg-white text-stone-700'
                    }`}
                  >
                    Full Paid
                  </button>
                  <button data-ui="button"
                    type="button"
                    onClick={() => {
                      setPaymentStatus('Partial')
                      setAmountPaid(Math.round(grandTotal / 2))
                    }}
                    className={`py-1.5 px-2 rounded-lg border font-bold text-xs transition ${
                      paymentStatus === 'Partial'
                        ? 'border-amber-600 bg-amber-50 text-amber-800'
                        : 'border-stone-200 bg-white text-stone-700'
                    }`}
                  >
                    Partial Paid
                  </button>
                  <button data-ui="button"
                    type="button"
                    onClick={() => {
                      setPaymentStatus('Unpaid')
                      setAmountPaid(0)
                    }}
                    className={`py-1.5 px-2 rounded-lg border font-bold text-xs transition ${
                      paymentStatus === 'Unpaid'
                        ? 'border-rose-600 bg-rose-50 text-rose-800'
                        : 'border-stone-200 bg-white text-stone-700'
                    }`}
                  >
                    Unpaid (Credit)
                  </button>
                </div>
              </div>

              {/* Payment Method & Deposit Account */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Payment Method</label>
                  <select data-ui="select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-lime-500"
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="Online">Online / Raast</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Deposit To</label>
                  <select data-ui="select"
                    value={paymentAccount}
                    onChange={(e) => setPaymentAccount(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-lime-500"
                  >
                    {db.accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount Paid & Remaining Balance */}
              <div className="grid grid-cols-2 gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                <div>
                  <label className="block font-bold text-stone-700 mb-0.5">Amount Received</label>
                  <input data-ui="input"
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
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-md border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-lime-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-0.5">Balance Due</label>
                  <div className="px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-white rounded-md border border-stone-300">
                    {formatPKR(Math.max(0, grandTotal - (Number(amountPaid) || 0)))}
                  </div>
                </div>
              </div>

              {/* Payment Due Date (Optional for pending/partial balance) */}
              {(paymentStatus !== 'Paid' || (Number(amountPaid) || 0) < grandTotal) && (
                <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Payment Due Date (Optional)
                    </label>
                    <div className="flex gap-1">
                      <button data-ui="button"
                        type="button"
                        onClick={() => {
                          const d = new Date()
                          d.setDate(d.getDate() + 7)
                          setInvoiceDueDate(d.toISOString().slice(0, 10))
                        }}
                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-white text-stone-700 rounded border border-stone-200 hover:bg-stone-100"
                      >
                        +7d
                      </button>
                      <button data-ui="button"
                        type="button"
                        onClick={() => {
                          const d = new Date()
                          d.setDate(d.getDate() + 15)
                          setInvoiceDueDate(d.toISOString().slice(0, 10))
                        }}
                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-white text-stone-700 rounded border border-stone-200 hover:bg-stone-100"
                      >
                        +15d
                      </button>
                      <button data-ui="button"
                        type="button"
                        onClick={() => {
                          const d = new Date()
                          d.setDate(d.getDate() + 30)
                          setInvoiceDueDate(d.toISOString().slice(0, 10))
                        }}
                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-white text-stone-700 rounded border border-stone-200 hover:bg-stone-100"
                      >
                        +30d
                      </button>
                      {invoiceDueDate && (
                        <button data-ui="button"
                          type="button"
                          onClick={() => setInvoiceDueDate('')}
                          className="px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <input data-ui="input"
                    type="date"
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-stone-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-amber-700/80 leading-tight">
                    Set a target payment date for reminder alerts in the notification bell.
                  </p>
                </div>
              )}

              {/* Screenshot Attachment */}
              {(paymentMethod === 'Online' || paymentMethod === 'Bank Transfer') && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Receipt Screenshot (Optional)</label>
                  <input data-ui="file"
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />
                  {paymentScreenshot ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-lime-50 border border-lime-200">
                      <div className="flex items-center gap-2">
                        <img src={paymentScreenshot} alt="Proof" className="w-7 h-7 rounded object-cover" />
                        <span className="text-xs font-semibold text-lime-900">Proof attached</span>
                      </div>
                      <button data-ui="button"
                        type="button"
                        onClick={() => setPaymentScreenshot('')}
                        className="text-red-500 hover:text-red-700 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button data-ui="button"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-2 border border-dashed border-stone-300 hover:border-lime-500 rounded-lg text-center bg-stone-50 hover:bg-lime-50/50 flex items-center justify-center gap-1.5 transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-xs font-medium text-stone-600">Upload Slip Photo</span>
                    </button>
                  )}
                </div>
              )}

              {/* Order Notes */}
              <div>
                <label className="block font-bold text-stone-700 mb-0.5">Notes (Optional)</label>
                <input data-ui="input"
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Counter gate clearance / Driver dispatch..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-lime-500"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-end gap-2">
                <button data-ui="button"
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button data-ui="button"
                  type="button"
                  onClick={handleCompleteSale}
                  className="px-4 py-1.5 rounded-lg bg-lime-600 hover:bg-lime-700 text-white font-bold shadow-xs"
                  id="btn-confirm-pos-sale"
                >
                  Confirm & Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: POST-CHECKOUT CONFIRMATION & PRINT */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div data-ui="surface" className="gradient-card bg-white w-full max-w-md rounded-2xl shadow-xl border border-stone-200 overflow-hidden my-6">
            <div className="bg-emerald-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="font-bold text-sm">Sale Completed!</h3>
                  <p className="text-[11px] text-emerald-100">Invoice #{completedInvoice.invoiceNumber}</p>
                </div>
              </div>
              <button data-ui="button" onClick={handleResetPOS} className="text-emerald-200 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              {/* Print layout selector */}
              <div className="flex items-center justify-between bg-stone-100 p-1 rounded-lg">
                <span className="text-[10px] font-bold text-stone-600 px-2">Layout:</span>
                <div className="flex items-center gap-1">
                  <button data-ui="button"
                    onClick={() => setPrintMode('thermal')}
                    className={`px-2.5 py-1 rounded-md font-bold transition text-[11px] ${
                      printMode === 'thermal' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                    }`}
                  >
                    Thermal (80mm)
                  </button>
                  <button data-ui="button"
                    onClick={() => setPrintMode('a4')}
                    className={`px-2.5 py-1 rounded-md font-bold transition text-[11px] ${
                      printMode === 'a4' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                    }`}
                  >
                    Commercial A4
                  </button>
                </div>
              </div>

              {/* Printable Receipt Preview */}
              <div
                id="pos-printable-invoice"
                className={`border border-stone-300 rounded-lg p-3 bg-white font-mono mx-auto ${
                  printMode === 'thermal' ? 'max-w-xs text-[10px]' : 'max-w-full text-xs font-sans'
                }`}
              >
                <div className="text-center pb-2 border-b border-stone-200">
                  <h2 className="font-black text-xs text-stone-900">AL FAROOQ FOODS</h2>
                  <p className="text-[9px] text-stone-500">Pure Mineral Water, Juices, Candies & Snacks</p>
                  <p className="text-[9px] text-stone-500">Phone: 0344 9549051 | 0346 9829900</p>
                </div>

                <div className="py-1.5 border-b border-stone-200 space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>Invoice #:</span>
                    <strong>{completedInvoice.invoiceNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{formatDate(completedInvoice.date)} {completedInvoice.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <strong>{completedInvoice.customerName}</strong>
                  </div>
                </div>

                {/* Line Items */}
                <div className="py-1.5 border-b border-stone-200 space-y-1">
                  {completedInvoice.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[10px]">
                      <div>
                        <span>{it.name}</span>
                        <div className="text-[9px] text-stone-500">
                          {it.quantity} {it.unit} × {formatPKR(it.unitPrice)}
                        </div>
                      </div>
                      <strong>{formatPKR(it.total)}</strong>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="py-1.5 space-y-0.5 text-[10px]">
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
                    <span>Paid ({completedInvoice.paymentMethod}):</span>
                    <span>{formatPKR(completedInvoice.amountPaid)}</span>
                  </div>
                  {completedInvoice.balanceDue > 0 && (
                    <div className="flex justify-between text-amber-700 font-bold">
                      <span>Balance Due:</span>
                      <span>{formatPKR(completedInvoice.balanceDue)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button data-ui="button"
                  type="button"
                  onClick={handleDirectPrint}
                  className="py-2 px-2 rounded-lg bg-stone-900 hover:bg-black text-white font-bold flex items-center justify-center gap-1 transition text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button data-ui="button"
                  type="button"
                  onClick={handleDownloadPDF}
                  className="py-2 px-2 rounded-lg bg-lime-600 hover:bg-lime-700 text-white font-bold flex items-center justify-center gap-1 transition text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </button>
                <button data-ui="button"
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className="py-2 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1 transition text-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
              </div>

              <div className="text-center pt-1">
                <button data-ui="button"
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

      {/* MODAL 3: QUICK ADD CUSTOMER MODAL (FALLBACK IF NOT USING NAVIGATION) */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div data-ui="surface" className="gradient-card bg-white w-full max-w-md rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-lime-400" />
                <h3 className="font-bold text-sm">Add New Customer Profile</h3>
              </div>
              <button data-ui="button" onClick={() => setShowNewCustomerModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCustomer} className="p-4 space-y-2.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-0.5">Name / Business Name *</label>
                <input data-ui="input"
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Al-Madina Supermart / Haji Tariq"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-lime-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-0.5">Category Type</label>
                  <select data-ui="select"
                    value={newCustType}
                    onChange={(e) => setNewCustType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-lime-500"
                  >
                    <option value="Retailer">Retailer (Shop)</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Sales Man">Sales Man / Rep</option>
                    <option value="Wholesaler">Wholesaler</option>
                    <option value="Counter">Customer (Direct)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-0.5">Phone Number</label>
                  <input data-ui="input"
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="0300 1234567"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-lime-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-0.5">City / Territory</label>
                  <input data-ui="input"
                    type="text"
                    value={newCustCity}
                    onChange={(e) => setNewCustCity(e.target.value)}
                    placeholder="e.g. Lahore / Peshawar"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-lime-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-0.5">Opening Balance</label>
                  <input data-ui="input"
                    type="number"
                    value={newCustOpeningBalance}
                    onChange={(e) => setNewCustOpeningBalance(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-lime-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-0.5">Market Address</label>
                <input data-ui="input"
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Shop # / Market location..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-lime-500"
                />
              </div>

              <div className="pt-2 border-t border-stone-100 flex justify-end gap-2">
                <button data-ui="button"
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button data-ui="button"
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-lime-600 hover:bg-lime-700 text-white font-bold shadow-xs"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: HELD DRAFTS */}
      {showDraftsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div data-ui="surface" className="gradient-card bg-white w-full max-w-md rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">Held Sales Drafts ({drafts.length})</h3>
              </div>
              <button data-ui="button" onClick={() => setShowDraftsModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-2 max-h-72 overflow-y-auto text-xs">
              {drafts.length === 0 ? (
                <p className="text-center py-6 text-stone-400">No active held drafts.</p>
              ) : (
                drafts.map((d) => (
                  <div key={d.id} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/60 flex items-center justify-between">
                    <div>
                      <strong className="text-stone-900 block">{d.customerName}</strong>
                      <span className="text-[10px] text-stone-400">
                        {d.selectedCategoryName || 'Customer'} • {d.cart.length} items • {d.savedAt}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button data-ui="button"
                        onClick={() => handleResumeDraft(d)}
                        className="px-2.5 py-1 rounded-lg bg-lime-600 hover:bg-lime-700 text-white font-bold text-xs flex items-center gap-1"
                      >
                        <PlayCircle className="w-3 h-3" />
                        Resume
                      </button>
                      <button data-ui="button"
                        onClick={() => setDrafts(drafts.filter((item) => item.id !== d.id))}
                        className="p-1 rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
