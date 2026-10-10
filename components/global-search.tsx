'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Search,
  Users,
  Package,
  Truck,
  UserCheck,
  FileText,
  Boxes,
  ArrowRight,
  X,
  Building2,
  Store,
  Phone,
  MapPin,
  DollarSign,
  Tag,
  Clock,
  Sparkles,
  Command,
  CornerDownLeft,
} from 'lucide-react'
import {
  formatPKR,
  type AppDatabase,
  type ModuleKey,
  type CustomerItem,
  type ProductItem,
  type SupplierItem,
  type EmployeeItem,
  type InvoiceItem,
  type RawMaterialItem,
} from '@/lib/db'

interface GlobalSearchProps {
  db: AppDatabase
  onNavigate: (module: ModuleKey | string, subTab?: string) => void
  openRequest?: number
}

type SearchCategory = 'all' | 'customers' | 'products' | 'suppliers' | 'employees' | 'invoices' | 'raw_materials'

interface SearchResultItem {
  id: string
  category: 'customers' | 'products' | 'suppliers' | 'employees' | 'invoices' | 'raw_materials'
  title: string
  codeOrId?: string
  subtitle: string
  extraInfo?: string
  badgeText?: string
  badgeVariant?: 'emerald' | 'amber' | 'blue' | 'purple' | 'rose' | 'stone'
  targetModule: ModuleKey | string
  targetSubTab?: string
  entityId?: string
}

export default function GlobalSearch({ db, onNavigate, openRequest = 0 }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openRequest) return
    setIsOpen(true)
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [openRequest])

  // Hotkey listener: Cmd+K or Ctrl+K or '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in a textarea or another input (unless Cmd+K is pressed)
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      } else if (e.key === '/' && !isInput) {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Reset selected index when query or category changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, activeCategory])

  // Compute all searchable items
  const allResults = useMemo<SearchResultItem[]>(() => {
    const cleanQuery = query.trim().toLowerCase()
    const results: SearchResultItem[] = []

    // Helper for matching
    const match = (...fields: (string | number | undefined | null)[]) => {
      if (!cleanQuery) return true
      return fields.some((f) => f != null && String(f).toLowerCase().includes(cleanQuery))
    }

    // 1. CUSTOMERS
    db.customers.forEach((c) => {
      if (match(c.name, c.customerId, c.phone, c.businessName, c.city, c.type, c.address)) {
        results.push({
          id: `cust-${c.id}`,
          category: 'customers',
          title: c.name,
          codeOrId: c.customerId,
          subtitle: `${c.businessName ? `${c.businessName} · ` : ''}${c.phone || 'No phone'} · ${c.city || 'City N/A'}`,
          extraInfo: c.type,
          badgeText: c.currentBalance > 0 ? `Due: ${formatPKR(c.currentBalance)}` : 'Clear',
          badgeVariant: c.currentBalance > 0 ? 'amber' : 'emerald',
          targetModule: 'customer-management',
          entityId: c.id,
        })
      }
    })

    // 2. PRODUCTS (Finished Goods)
    db.products.forEach((p) => {
      if (match(p.name, p.sku, p.category, p.description, p.size)) {
        results.push({
          id: `prod-${p.id}`,
          category: 'products',
          title: p.name,
          codeOrId: p.sku,
          subtitle: `Rate: ${formatPKR(p.retailPrice || p.wholesalePrice || 0)} / ${p.unit} · Stock: ${p.quantity} ${p.unit}`,
          extraInfo: p.category,
          badgeText: p.quantity <= 0 ? 'Out of Stock' : `${p.quantity} ${p.unit}`,
          badgeVariant: p.quantity <= 0 ? 'rose' : p.quantity <= (p.reorderLevel || 10) ? 'amber' : 'emerald',
          targetModule: 'products',
          targetSubTab: 'catalog',
          entityId: p.id,
        })
      }
    })

    // 3. SUPPLIERS
    db.suppliers.forEach((s) => {
      if (match(s.name, s.supplierCode, s.phone, s.city, s.category, s.contactPerson)) {
        results.push({
          id: `sup-${s.id}`,
          category: 'suppliers',
          title: s.name,
          codeOrId: s.supplierCode || s.id,
          subtitle: `${s.contactPerson ? `${s.contactPerson} · ` : ''}${s.phone || 'No phone'} · ${s.city || 'City N/A'}`,
          extraInfo: s.category || 'Vendor',
          badgeText: s.currentBalance > 0 ? `Payable: ${formatPKR(s.currentBalance)}` : 'Clear',
          badgeVariant: s.currentBalance > 0 ? 'rose' : 'emerald',
          targetModule: 'suppliers-management',
          entityId: s.id,
        })
      }
    })

    // 4. EMPLOYEES
    db.employees.forEach((e) => {
      if (match(e.name, e.id, e.phone, e.role, e.department, e.dutyTiming)) {
        results.push({
          id: `emp-${e.id}`,
          category: 'employees',
          title: e.name,
          codeOrId: e.id,
          subtitle: `${e.role} (${e.department}) · ${e.phone || 'No phone'} · ${e.dutyTiming}`,
          extraInfo: e.department,
          badgeText: e.currentSalaryStatus === 'Paid' ? 'Paid' : 'Salary Pending',
          badgeVariant: e.currentSalaryStatus === 'Paid' ? 'emerald' : 'purple',
          targetModule: 'employees',
          entityId: e.id,
        })
      }
    })

    // 5. INVOICES / BILLS
    db.invoices.forEach((inv) => {
      const due = inv.balanceDue ?? (inv.grandTotal - (inv.amountPaid || 0))
      if (match(inv.invoiceNumber, inv.customerName, inv.date, inv.paymentMethod, inv.status, inv.grandTotal)) {
        results.push({
          id: `inv-${inv.id}`,
          category: 'invoices',
          title: inv.invoiceNumber,
          codeOrId: inv.date,
          subtitle: `Customer: ${inv.customerName} · Total: ${formatPKR(inv.grandTotal)}`,
          extraInfo: `${inv.items?.length || 1} Items`,
          badgeText: inv.status === 'Paid' ? 'Paid' : due > 0 ? `Due: ${formatPKR(due)}` : inv.status,
          badgeVariant: inv.status === 'Paid' ? 'emerald' : inv.status === 'Partial' ? 'amber' : 'rose',
          targetModule: 'sales',
          targetSubTab: 'invoices',
          entityId: inv.id,
        })
      }
    })

    // 6. RAW MATERIALS (Ingredients & Packaging)
    db.rawMaterials.forEach((r) => {
      if (match(r.name, r.sku, r.category, r.supplierName, r.supplier)) {
        results.push({
          id: `raw-${r.id}`,
          category: 'raw_materials',
          title: r.name,
          codeOrId: r.sku,
          subtitle: `Stock: ${r.quantity} ${r.unit} · Cost: ${formatPKR(r.unitCost || 0)}/${r.unit}`,
          extraInfo: r.category,
          badgeText: r.quantity <= 0 ? 'Depleted' : `${r.quantity} ${r.unit}`,
          badgeVariant: r.quantity <= 0 ? 'rose' : r.quantity <= (r.reorderLevel || 20) ? 'amber' : 'blue',
          targetModule: 'raw-materials',
          entityId: r.id,
        })
      }
    })

    return results
  }, [db, query])

  // Category Filtered results
  const filteredResults = useMemo(() => {
    if (activeCategory === 'all') return allResults
    return allResults.filter((r) => r.category === activeCategory)
  }, [allResults, activeCategory])

  // Counts by category
  const categoryCounts = useMemo(() => {
    return {
      all: allResults.length,
      customers: allResults.filter((r) => r.category === 'customers').length,
      products: allResults.filter((r) => r.category === 'products').length,
      suppliers: allResults.filter((r) => r.category === 'suppliers').length,
      employees: allResults.filter((r) => r.category === 'employees').length,
      invoices: allResults.filter((r) => r.category === 'invoices').length,
      raw_materials: allResults.filter((r) => r.category === 'raw_materials').length,
    }
  }, [allResults])

  // Handle jump
  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false)
    setQuery('')
    onNavigate(item.targetModule, item.targetSubTab)
  }

  // Keyboard navigation within list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredResults[selectedIndex]) {
        handleSelect(filteredResults[selectedIndex])
      }
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]') as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // Icon & Category styling resolver
  const getCategoryMeta = (cat: SearchResultItem['category']) => {
    switch (cat) {
      case 'customers':
        return {
          label: 'Customer',
          icon: <Users className="w-3.5 h-3.5" />,
          avatarBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        }
      case 'products':
        return {
          label: 'Product',
          icon: <Package className="w-3.5 h-3.5" />,
          avatarBg: 'bg-blue-50 text-blue-800 border-blue-200',
        }
      case 'suppliers':
        return {
          label: 'Supplier',
          icon: <Truck className="w-3.5 h-3.5" />,
          avatarBg: 'bg-purple-50 text-purple-800 border-purple-200',
        }
      case 'employees':
        return {
          label: 'Staff',
          icon: <UserCheck className="w-3.5 h-3.5" />,
          avatarBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        }
      case 'invoices':
        return {
          label: 'Invoice',
          icon: <FileText className="w-3.5 h-3.5" />,
          avatarBg: 'bg-amber-50 text-amber-800 border-amber-200',
        }
      case 'raw_materials':
        return {
          label: 'Raw Material',
          icon: <Boxes className="w-3.5 h-3.5" />,
          avatarBg: 'bg-stone-100 text-stone-800 border-stone-200',
        }
    }
  }

  const getBadgeClass = (variant?: SearchResultItem['badgeVariant']) => {
    switch (variant) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200'
      case 'amber':
        return 'bg-amber-50 text-amber-800 border-amber-200'
      case 'rose':
        return 'bg-rose-50 text-rose-700 border-rose-200'
      case 'purple':
        return 'bg-purple-50 text-purple-800 border-purple-200'
      case 'blue':
        return 'bg-blue-50 text-blue-800 border-blue-200'
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200'
    }
  }

  return (
    <div className={`global-search relative w-full max-w-[360px] mx-2 sm:mx-4 ${isOpen ? 'mobile-search-visible' : ''}`} ref={containerRef}>
      {/* Search Bar Input in Topbar */}
      <div
        className={`flex items-center h-11 rounded-xl border bg-white transition-all ${
          isOpen
            ? 'border-emerald-500'
            : 'border-stone-200 hover:border-stone-300'
        }`}
      >
        <input data-ui="input"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleInputKeyDown}
          onClick={() => setIsOpen(true)}
          aria-label="Search across the workspace"
          placeholder="Search"
          className="w-full bg-transparent border-0 outline-none text-sm text-stone-900 placeholder:text-stone-400 px-3.5 py-2.5"
        />

        <button data-ui="button"
          type="button"
          onClick={() => {
            setIsOpen(true)
            setTimeout(() => inputRef.current?.focus(), 50)
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 mr-1.5"
          aria-label="Search"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown Results Modal / Popover */}
      {isOpen && <button type="button" className="mobile-search-close" aria-label="Close workspace search" onClick={() => { setIsOpen(false); document.querySelector<HTMLButtonElement>('.profile-trigger')?.focus() }}><X size={18} /></button>}
      {isOpen && (
        <div
          className="gradient-card absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-stone-200/90 z-50 overflow-hidden flex flex-col max-h-[520px] animate-in fade-in slide-in-from-top-2 duration-150"
          id="global-search-results-modal"
          style={{ minWidth: 'min(92vw, 560px)' }}
        >
          {/* Category Filter Tabs */}
          <div className="px-3 py-2 bg-stone-50/80 border-b border-stone-100 flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
            <button data-ui="tab"
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] shrink-0 transition-colors ${
                activeCategory === 'all'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/70'
              }`}
            >
              All ({categoryCounts.all})
            </button>

            <button data-ui="tab"
              type="button"
              onClick={() => setActiveCategory('customers')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] shrink-0 transition-colors flex items-center gap-1 ${
                activeCategory === 'customers'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200/80'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Customers ({categoryCounts.customers})</span>
            </button>

            <button data-ui="tab"
              type="button"
              onClick={() => setActiveCategory('products')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] shrink-0 transition-colors flex items-center gap-1 ${
                activeCategory === 'products'
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'bg-white text-blue-800 hover:bg-blue-50 border border-blue-200/80'
              }`}
            >
              <Package className="w-3 h-3" />
              <span>Products ({categoryCounts.products})</span>
            </button>

            <button data-ui="tab"
              type="button"
              onClick={() => setActiveCategory('suppliers')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] shrink-0 transition-colors flex items-center gap-1 ${
                activeCategory === 'suppliers'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'bg-white text-purple-800 hover:bg-purple-50 border border-purple-200/80'
              }`}
            >
              <Truck className="w-3 h-3" />
              <span>Suppliers ({categoryCounts.suppliers})</span>
            </button>

            <button data-ui="tab"
              type="button"
              onClick={() => setActiveCategory('employees')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] shrink-0 transition-colors flex items-center gap-1 ${
                activeCategory === 'employees'
                  ? 'bg-indigo-700 text-white shadow-2xs'
                  : 'bg-white text-indigo-800 hover:bg-indigo-50 border border-indigo-200/80'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>Staff ({categoryCounts.employees})</span>
            </button>

            <button data-ui="tab"
              type="button"
              onClick={() => setActiveCategory('invoices')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] shrink-0 transition-colors flex items-center gap-1 ${
                activeCategory === 'invoices'
                  ? 'bg-amber-700 text-white shadow-2xs'
                  : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200/80'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Invoices ({categoryCounts.invoices})</span>
            </button>
          </div>

          {/* Results List */}
          <div
            ref={listRef}
            className="overflow-y-auto max-h-[380px] divide-y divide-stone-100 p-1.5"
            id="global-search-results-list"
          >
            {filteredResults.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-11 h-11 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-2.5">
                  <Search className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-stone-800">No matching records found</h4>
                <p className="text-xs text-stone-500 max-w-[280px] mx-auto mt-1">
                  We couldn't find any customer, product, supplier, staff, or invoice matching "{query}".
                </p>
              </div>
            ) : (
              filteredResults.map((item, index) => {
                const isSelected = index === selectedIndex
                const meta = getCategoryMeta(item.category)
                const badgeClass = getBadgeClass(item.badgeVariant)

                return (
                  <div data-ui="surface"
                    key={item.id}
                    data-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleSelect(item) } }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group border ${
                      isSelected
                        ? 'bg-emerald-50/90 border-emerald-200/90 shadow-2xs'
                        : 'hover:bg-stone-50/80 border-transparent'
                    }`}
                    role="button"
                    tabIndex={0}
                  >
                    {/* Left: Avatar & Text */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${meta.avatarBg}`}
                        title={meta.label}
                      >
                        {meta.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            {meta.label}
                          </span>
                          {item.codeOrId && (
                            <span className="text-[9.5px] font-mono font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded shrink-0">
                              {item.codeOrId}
                            </span>
                          )}
                          {item.extraInfo && (
                            <span className="text-[10px] text-stone-400 font-medium truncate">
                              · {item.extraInfo}
                            </span>
                          )}
                        </div>

                        <h4
                          className={`font-bold text-xs truncate transition-colors ${
                            isSelected ? 'text-emerald-950' : 'text-stone-900 group-hover:text-emerald-800'
                          }`}
                        >
                          {item.title}
                        </h4>

                        <p className="text-[11px] text-stone-500 font-medium truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Right: Badge & Jump Arrow */}
                    <div className="flex items-center gap-2 shrink-0">
                      {item.badgeText && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-2xs ${badgeClass}`}>
                          {item.badgeText}
                        </span>
                      )}

                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-transform ${
                          isSelected
                            ? 'bg-emerald-600 text-white translate-x-0.5'
                            : 'text-stone-400 group-hover:text-stone-700'
                        }`}
                        title={`Jump to ${item.title}`}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Quick Hints */}
          <div className="px-3.5 py-2 bg-stone-50/90 border-t border-stone-200/80 flex items-center justify-between text-[11px] text-stone-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 rounded font-mono text-[9.5px] shadow-2xs">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 rounded font-mono text-[9.5px] shadow-2xs">↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 rounded font-mono text-[9.5px] shadow-2xs">↵</kbd>
                <span>Select & Jump</span>
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 rounded font-mono text-[9.5px] shadow-2xs">ESC</kbd>
                <span>Close</span>
              </span>
            </div>

            <span className="font-semibold text-stone-600">
              {filteredResults.length} {filteredResults.length === 1 ? 'result' : 'results'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
