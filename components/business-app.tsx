'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  Boxes,
  ChevronDown,
  Download,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  LockKeyhole,
  Shield,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
  UserCheck,
  Building2,
  X,
  FileText,
  Receipt,
  Store,
  Phone,
} from 'lucide-react'

import {
  loadDatabase,
  setOnlineSnapshot,
  saveDatabase,
  exportDatabaseJSON,
  type AppDatabase,
  type ModuleKey,
  moduleLabels,
  initialDatabase,
  formatPKR,
} from '@/lib/db'

import DashboardView from './dashboard-view'
import SmartEntry from './smart-entry'
import type { SmartMode } from '@/lib/smart-schema'
import PosView from './pos-view'
import SalesView, { type SalesSubTab } from './sales-view'
import CustomerManagementView from './customer-management-view'
import PurchasesExpensesView, { type PurchasesExpensesSubTab } from './purchases-expenses-view'
import SuppliersManagementView from './suppliers-management-view'
import ProductsView, { type ProductsSubTab } from './products-view'
import RawMaterialsView from './raw-materials-view'
import AccountsView, { type AccountsSubTab } from './accounts-view'
import ReportsView, { type ReportCategoryKey } from './reports-view'
import EmployeesView from './employees-view'
import SettingsView from './settings-view'
import NotificationsPopover from './notifications-popover'
import GlobalSearch from './global-search'
import { useAppLock } from './pin-gate'
import ProfileMenu from './profile-menu'
import CollectionReceipt from './collection-receipt'

export default function BusinessApp() {
  const lockApp = useAppLock()
  const [syncNote, setSyncNote] = useState('Connecting to Neon...')
  const [smartMode, setSmartMode] = useState<SmartMode | null>(null)
  const [saving, setSaving] = useState(false)
  const saveLock = useRef(false)
  const [db, setDb] = useState<AppDatabase>(initialDatabase)
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard')
  const [salesTab, setSalesTab] = useState<SalesSubTab>('invoices')
  const [customerTab, setCustomerTab] = useState<'customers' | 'phonebook'>('customers')
  const [purchaseTab, setPurchaseTab] = useState<PurchasesExpensesSubTab>('purchases')
  const [productsTab, setProductsTab] = useState<ProductsSubTab>('catalog')
  const [reportsCategory, setReportsCategory] = useState<ReportCategoryKey>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileSearchRequest, setMobileSearchRequest] = useState(0)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [isOwner, setIsOwner] = useState(true)
  const [isClientLoaded, setIsClientLoaded] = useState(false)

  useEffect(() => {
    if (!sidebarOpen) return
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
        document.querySelector<HTMLButtonElement>(window.matchMedia('(max-width: 900px)').matches ? '.profile-trigger' : '.mobile-menu')?.focus()
      }
    }
    window.addEventListener('keydown', dismissOnEscape)
    return () => window.removeEventListener('keydown', dismissOnEscape)
  }, [sidebarOpen])

  const refresh = async () => {
    try { const loaded = await loadDatabase(); setDb(loaded); setIsClientLoaded(true); setSyncNote('Online - all records loaded from Neon') }
    catch(error) { setSyncNote((error as Error).message); setIsClientLoaded(false) }
  }
  useEffect(() => { void refresh() }, [])
  useEffect(() => {
    const committed = (event: Event) => { setOnlineSnapshot((event as CustomEvent<AppDatabase>).detail); setDb((event as CustomEvent<AppDatabase>).detail); setIsClientLoaded(true); setSyncNote('Approved records saved to Neon.') }
    window.addEventListener('hardware:committed', committed)
    return () => window.removeEventListener('hardware:committed', committed)
  }, [])
  const handleSaveDatabase = async (updated: AppDatabase) => {
    if (saveLock.current) { setSyncNote('A save is already in progress. Please wait.'); return false }
    saveLock.current = true; setSaving(true); setSyncNote('Saving to Neon...')
    try { const saved = await saveDatabase({...updated, revision:db.revision}); setDb(saved); setSyncNote('Saved to Neon.'); return true }
    catch(error) { setSyncNote((error as Error).message + ' Changes were not saved.'); return false }
    finally { saveLock.current = false; setSaving(false) }
  }

  const handleRoleChange = (owner: boolean) => {
    if (owner === isOwner) return
    setIsOwner(owner)
  }


  // Smart Navigation Handler: supports core modules + direct routing to subtabs
  const handleNavigate = (key: ModuleKey | string, subTab?: string) => {
    // Check if key is a legacy/sub-route and route appropriately
    if (key === 'customer-management' || key === 'customers') {
      setActiveModule('customer-management')
      setCustomerTab(subTab === 'phonebook' ? 'phonebook' : 'customers')
    } else if (key === 'phonebook') {
      setActiveModule('customer-management')
      setCustomerTab('phonebook')
    } else if (key === 'suppliers-management' || key === 'suppliers') {
      setActiveModule('suppliers-management')
    } else if (['invoices', 'counter-sales', 'wholesalers'].includes(key)) {
      setActiveModule('sales')
      const mapped = key === 'counter-sales' ? 'pos' : (key as SalesSubTab)
      setSalesTab(mapped)
    } else if (key === 'expenses') {
      setActiveModule('purchase')
      setPurchaseTab('expenses')
    } else if (key === 'purchases' || key === 'purchase') {
      setActiveModule('purchase')
      setPurchaseTab(subTab === 'expenses' ? 'expenses' : 'purchases')
    } else if (['production', 'stock'].includes(key)) {
      setActiveModule('products')
      setProductsTab(key === 'stock' ? 'stock' : 'production')
    } else if (['daily-summary', 'monthly-summary', 'yearly-summary', 'profit-loss', 'cash-bank', 'sales-report', 'purchase-report', 'expense-report', 'supplier-report', 'customer-report', 'salary-report', 'inventory-report'].includes(key)) {
      setActiveModule('reports')
      if (key === 'sales-report') setReportsCategory('sales')
      else if (key === 'purchase-report') setReportsCategory('purchases')
      else if (key === 'expense-report') setReportsCategory('expenses')
      else if (key === 'supplier-report') setReportsCategory('suppliers')
      else if (key === 'customer-report') setReportsCategory('customers')
      else if (key === 'salary-report') setReportsCategory('salary')
      else if (key === 'inventory-report') setReportsCategory('inventory')
      else setReportsCategory('overview')
    } else {
      setActiveModule(key as ModuleKey)
      if (subTab) {
        if (key === 'sales') setSalesTab(subTab as SalesSubTab)
        if (key === 'purchase') setPurchaseTab(subTab as PurchasesExpensesSubTab)
        if (key === 'customer-management') setCustomerTab(subTab === 'phonebook' ? 'phonebook' : 'customers')
        if (key === 'products') setProductsTab(subTab as ProductsSubTab)
        if (key === 'reports') setReportsCategory(subTab as ReportCategoryKey)
      }
    }
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  return (
    <div className="app-frame">
      {/* FLAT & SIMPLE SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <Image
            src="/hardware-logo.svg"
            alt="AL FAROOQ HARDWARE"
            width={220}
            height={52}
            className="brand-logo"
            priority
          />
          <button data-ui="button" aria-label="Close navigation" className="icon-button close-nav" onClick={() => setSidebarOpen(false)}>
            <X />
          </button>
        </div>

        <div className="workspace">
          <div className="workspace-avatar">AF</div>
          <div className="workspace-identity">
            <strong>AL FAROOQ HARDWARE</strong>
            <span>Hardware Store POS</span>
          </div>
          <ChevronDown className="workspace-chevron" />
        </div>

        {/* Core Top-Level Sidebar Nav Items */}
        <nav className="nav-list" aria-label="Core Business Navigation">
          {/* 1. Dashboard */}
          <button data-ui="button"
            className={`nav-item ${activeModule === 'dashboard' ? 'nav-item-active' : ''}`}
            onClick={() => handleNavigate('dashboard')}
            id="nav-dashboard"
          >
            <LayoutDashboard />
            <span>Dashboard</span>
          </button>

          {/* 2. POS (Standalone Point-of-Sale Page) */}
          <button data-ui="button"
            className={`nav-item ${activeModule === 'pos' ? 'nav-item-active' : ''}`}
            onClick={() => handleNavigate('pos')}
            id="nav-pos"
          >
            <Store />
            <span>POS</span>
          </button>

          {/* 3. Sales */}
          <button data-ui="button"
            className={`nav-item ${activeModule === 'sales' ? 'nav-item-active' : ''}`}
            onClick={() => handleNavigate('sales')}
            id="nav-sales"
          >
            <ShoppingBag />
            <span>Sales</span>
          </button>

          {/* 4. Customer Management (Includes Phone Book Directory) */}
          <button data-ui="button"
            className={`nav-item ${activeModule === 'customer-management' || activeModule === 'phonebook' ? 'nav-item-active' : ''}`}
            onClick={() => handleNavigate('customer-management', 'customers')}
            id="nav-customer-management"
          >
            <UserCheck />
            <span>Customer Management</span>
          </button>

          {/* 5. Purchases & Expenses (Unified Module) */}
          <button data-ui="button"
            className={`nav-item ${activeModule === 'purchase' || activeModule === 'expenses' ? 'nav-item-active' : ''}`}
            onClick={() => handleNavigate('purchase', 'purchases')}
            id="nav-purchases-expenses"
          >
            <Truck />
            <span>Purchases & Expenses</span>
          </button>

          {/* 6. Suppliers (Vendor Hub) */}
          <button data-ui="button"
            className={`nav-item ${activeModule === 'suppliers-management' ? 'nav-item-active' : ''}`}
            onClick={() => handleNavigate('suppliers-management')}
            id="nav-suppliers"
          >
            <Building2 />
            <span>Suppliers</span>
          </button>

          {/* 7. Products */}
          <button data-ui="button"
            className={`nav-item ${activeModule === 'products' ? 'nav-item-active' : ''}`}
            onClick={() => handleNavigate('products')}
            id="nav-products"
          >
            <Package />
            <span>Products</span>
          </button>

          {/* 9. Raw Material */}
          <button data-ui="button"
            className={`nav-item ${activeModule === 'raw-materials' ? 'nav-item-active' : ''}`}
            onClick={() => handleNavigate('raw-materials')}
            id="nav-raw-materials"
          >
            <Boxes />
            <span>Raw Material</span>
          </button>

          {/* 10. Employees */}
          <button data-ui="button"
            className={`nav-item ${activeModule === 'employees' ? 'nav-item-active' : ''}`}
            onClick={() => handleNavigate('employees')}
            id="nav-employees"
          >
            <Users />
            <span>Employees</span>
          </button>

          {/* 11. Reports */}
          <button data-ui="button"
            className={`nav-item ${activeModule === 'reports' ? 'nav-item-active' : ''}`}
            onClick={() => handleNavigate('reports')}
            id="nav-reports"
          >
            <TrendingUp />
            <span>Reports</span>
          </button>

          {/* 12. Settings */}
          <button data-ui="button"
            className={`nav-item ${activeModule === 'settings' ? 'nav-item-active' : ''}`}
            onClick={() => handleNavigate('settings')}
            id="nav-settings"
          >
            <Settings />
            <span>Settings</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-foot">
          <button data-ui="button" type="button" className="sidebar-lock-system" onClick={lockApp}>
            <LockKeyhole size={17} /><span>Lock system</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <button type="button" className="mobile-nav-backdrop" aria-label="Dismiss navigation" onClick={() => setSidebarOpen(false)} />}

      {/* MAIN VIEW AREA */}
      <main className="main-area">
        {/* Top Navbar */}
        <header className="topbar">
          <button data-ui="button" aria-label="Open navigation" aria-expanded={sidebarOpen} className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)}>
            <Menu />
          </button>

          <span className="mobile-header-name">Al Farooq Hardware</span>

          <div className="breadcrumb hidden sm:flex">
            <span>AL FAROOQ HARDWARE</span>
            <span>/</span>
            <strong>{moduleLabels[activeModule] || 'Workspace'}</strong>
          </div>

          {/* Quick Universal Admin Search */}
          <GlobalSearch db={db} onNavigate={handleNavigate} openRequest={mobileSearchRequest} />

          <div className="top-actions">
            <button data-ui="button" type="button" className="role-pill" onClick={() => handleRoleChange(!isOwner)} aria-pressed={isOwner} title="Click to toggle role">
              <Shield className="w-3.5 h-3.5" />
              <span>{isOwner ? 'Owner View' : 'Staff View'}</span>
            </button>

            {/* Smart Action Alerts Notification Bell */}
            <NotificationsPopover db={db} onNavigate={handleNavigate} />

            <button data-ui="button"
              className="icon-button"
              title="Quick Backup JSON"
              onClick={() => exportDatabaseJSON(db)}
            >
              <Download />
            </button>

            <button data-ui="button" type="button" className="icon-button" onClick={lockApp} title="Lock app" aria-label="Lock app">
              <LockKeyhole />
            </button>

            <button data-ui="button" className="icon-button" onClick={() => handleNavigate('settings')} title="Settings">
              <Settings />
            </button>

            <ProfileMenu db={db} isOwner={isOwner} onSave={handleSaveDatabase} onSettings={() => handleNavigate('settings')} onLock={lockApp}
              onSearch={() => setMobileSearchRequest(value => value + 1)}
              onBackup={() => exportDatabaseJSON(db)} onRoleChange={() => handleRoleChange(!isOwner)} />
          </div>
        </header>

        {/* Body Content Router */}
        <div className="content" data-mobile-module={activeModule}>
          <div role="status" className={`online-status ${!isClientLoaded ? 'online-error' : ''}`}>{syncNote} <button type="button" onClick={() => void refresh()} disabled={saving}>Reload records</button></div>
          {!isClientLoaded ? <p>Connect to the database to continue. Run the migration and seed if this is a new setup.</p> : <fieldset disabled={saving} style={{border:0,padding:0,minWidth:0}}>
          {activeModule === 'dashboard' && <>
            <section className="smart-hero"><button className="button primary" onClick={() => setSmartMode('purchase_bill')}>Scan Bill</button><button className="button primary" onClick={() => setSmartMode('sale_list')}>Voice Sale</button><button className="button secondary" onClick={() => setSmartMode('product_list')}>Add Stock / Product</button></section>
            <section className="smart-activity"><h3>AI Activity today</h3><p>{(db.aiActivity || []).filter(a => new Date(a.createdAt).toLocaleDateString('en-CA', {timeZone:'Asia/Karachi'}) === new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Karachi'}) && a.type === 'scan').length} scans | {(db.aiActivity || []).filter(a => new Date(a.createdAt).toLocaleDateString('en-CA', {timeZone:'Asia/Karachi'}) === new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Karachi'}) && a.type === 'voice' && a.mode === 'sale_list').length} voice sales | {(db.aiActivity || []).filter(a => new Date(a.createdAt).toLocaleDateString('en-CA', {timeZone:'Asia/Karachi'}) === new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Karachi'})).reduce((n,a) => n+a.created,0)} items auto-created | {(db.productAliases || []).length} aliases learned</p></section>
          </>}
          {activeModule === 'dashboard' && (
            <DashboardView
              db={db}
              onNavigate={handleNavigate}
              onOpenReceipt={() => setShowReceiptModal(true)}
              isOwner={isOwner}
            />
          )}

          {activeModule === 'pos' && (
            <PosView
              db={db}
              onSaveDatabase={handleSaveDatabase}
              onNavigate={handleNavigate}
            />
          )}

          {activeModule === 'sales' && (
            <SalesView
              db={db}
              initialTab={salesTab}
              onSaveDatabase={handleSaveDatabase}
              onNavigate={handleNavigate}
            />
          )}

          {(activeModule === 'customer-management' || activeModule === 'phonebook') && (
            <CustomerManagementView
              db={db}
              initialTab={customerTab}
              onSaveDatabase={handleSaveDatabase}
              onNavigate={handleNavigate}
            />
          )}

          {activeModule === 'purchase' && purchaseTab === 'purchases' && <SmartEntry mode="purchase_bill" db={db} />}
          {(activeModule === 'purchase' || activeModule === 'expenses') && (
            <PurchasesExpensesView
              db={db}
              initialTab={purchaseTab}
              onSaveDatabase={handleSaveDatabase}
              onNavigate={handleNavigate}
            />
          )}

          {activeModule === 'suppliers-management' && (
            <SuppliersManagementView
              db={db}
              onSaveDatabase={handleSaveDatabase}
              onNavigate={handleNavigate}
            />
          )}

          {activeModule === 'products' && (
            <ProductsView
              db={db}
              initialTab={productsTab}
              onSaveDatabase={handleSaveDatabase}
              onNavigate={handleNavigate}
            />
          )}

          {activeModule === 'raw-materials' && (
            <RawMaterialsView
              db={db}
              onSaveDatabase={handleSaveDatabase}
              onNavigateToSupplier={() => handleNavigate('purchase', 'suppliers')}
            />
          )}

          {activeModule === 'employees' && (
            <EmployeesView db={db} onSaveDatabase={handleSaveDatabase} />
          )}

          {activeModule === 'reports' && (
            <ReportsView
              db={db}
              initialCategory={reportsCategory}
              onSaveDatabase={handleSaveDatabase}
              isOwner={isOwner}
            />
          )}

          {activeModule === 'settings' && (
            <SettingsView
              db={db}
              isOwner={isOwner}
              setIsOwner={handleRoleChange}
              onSaveDatabase={handleSaveDatabase}
            />
          )}
          </fieldset>}
        </div>
      </main>

      <nav className="mobile-bottom-nav" aria-label="Main mobile navigation">
        {([
          { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { key: 'pos', label: 'POS', icon: Store },
          { key: 'sales', label: 'Sales', icon: ShoppingBag },
          { key: 'products', label: 'Products', icon: Package },
          { key: 'reports', label: 'Reports', icon: TrendingUp },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" aria-current={activeModule === key ? 'page' : undefined}
            onClick={() => { if (activeModule !== key) handleNavigate(key) }}>
            <span className="mobile-bottom-icon"><Icon aria-hidden="true" /></span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {isClientLoaded && <button type="button" className="smart-floating" aria-label="Open Smart Entry" onClick={() => setSmartMode(activeModule === 'purchase' ? 'purchase_bill' : activeModule === 'pos' || activeModule === 'sales' ? 'sale_list' : activeModule === 'products' && productsTab === 'stock' ? 'stock_count' : 'product_list')}>AI</button>}
      {smartMode && <div className="smart-overlay" role="dialog" aria-modal="true" aria-label="Smart Entry"><SmartEntry mode={smartMode} db={db} onClose={() => setSmartMode(null)} /></div>}
      {/* Payment receipt uses the same record as the dashboard collection card. */}
      {showReceiptModal && <CollectionReceipt db={db} onClose={() => setShowReceiptModal(false)} onViewCustomer={() => { setShowReceiptModal(false); handleNavigate('customer-management') }} />}
    </div>
  )
}
