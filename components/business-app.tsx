'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Boxes,
  Briefcase,
  Building2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Download,
  Factory,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Store,
  TrendingUp,
  Truck,
  Upload,
  User,
  UserCheck,
  Users,
  Wallet,
  WifiOff,
  X,
  RotateCcw,
  Calendar,
  Layers,
  Banknote,
} from 'lucide-react'

import {
  loadDatabase,
  saveDatabase,
  type AppDatabase,
  type ModuleKey,
  moduleLabels,
  initialDatabase,
  formatPKR,
} from '@/lib/db'

import DashboardView from './dashboard-view'
import InvoicesView from './invoices-view'
import ProductionView from './production-view'
import InventoryView from './inventory-view'
import RawMaterialsView from './raw-materials-view'
import SalesEntitiesView from './sales-entities-view'
import PosView from './pos-view'
import ProcurementView from './procurement-view'
import AccountsView from './accounts-view'
import EmployeesView from './employees-view'
import PhonebookView from './phonebook-view'
import SettingsView from './settings-view'

export default function BusinessApp() {
  const [db, setDb] = useState<AppDatabase>(initialDatabase)
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [isOwner, setIsOwner] = useState(true)
  const [isClientLoaded, setIsClientLoaded] = useState(false)

  // Load from offline persistent storage on mount
  useEffect(() => {
    const loaded = loadDatabase()
    setDb(loaded)
    setIsClientLoaded(true)
  }, [])

  // Sync back to offline localStorage whenever db updates
  const handleSaveDatabase = (updated: AppDatabase) => {
    setDb(updated)
    saveDatabase(updated)
  }

  // Navigation handler
  const handleNavigate = (key: ModuleKey) => {
    setActiveModule(key)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-frame">
      {/* SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <Image
            src="/al-farooq-foods-logo.png"
            alt="AL FAROOQ FOODS"
            width={220}
            height={52}
            className="brand-logo"
            priority
          />
          <button className="icon-button close-nav" onClick={() => setSidebarOpen(false)}>
            <X />
          </button>
        </div>

        <div className="workspace">
          <div className="workspace-avatar">AF</div>
          <div>
            <strong>AL FAROOQ FOODS</strong>
            <span>Food & Beverage Plant</span>
          </div>
          <ChevronDown className="workspace-chevron" />
        </div>

        {/* Sidebar Nav Items */}
        <div className="nav-list">
          {/* Group 1: Overview */}
          <div className="nav-group">
            <div className="nav-label">Overview</div>
            <button
              className={`nav-item ${activeModule === 'dashboard' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('dashboard')}
            >
              <LayoutDashboard />
              <span>Dashboard</span>
            </button>
          </div>

          {/* Group 2: Sales & Commerce */}
          <div className="nav-group">
            <div className="nav-label">Sales & Distribution</div>
            <button
              className={`nav-item ${activeModule === 'invoices' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('invoices')}
            >
              <FileText />
              <span>Invoices</span>
              <span className="nav-count">{db.invoices.length}</span>
            </button>

            <button
              className={`nav-item ${activeModule === 'counter-sales' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('counter-sales')}
            >
              <ShoppingCart />
              <span>Counter Sales (POS)</span>
            </button>

            <button
              className={`nav-item ${activeModule === 'distributors' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('distributors')}
            >
              <Truck />
              <span>Distributors & Sales Reps</span>
            </button>

            <button
              className={`nav-item ${activeModule === 'wholesalers' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('wholesalers')}
            >
              <Building2 />
              <span>Wholesaler Accounts</span>
            </button>

            <button
              className={`nav-item ${activeModule === 'customers' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('customers')}
            >
              <Store />
              <span>Customers / Shops</span>
            </button>

            <button
              className={`nav-item ${activeModule === 'phonebook' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('phonebook')}
            >
              <Phone />
              <span>Phone Book</span>
            </button>
          </div>

          {/* Group 3: Product Management */}
          <div className="nav-group">
            <div className="nav-label">Product Management</div>
            <button
              className={`nav-item ${activeModule === 'products' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('products')}
              id="nav-products"
            >
              <Package />
              <span>Product Management</span>
              <span className="nav-count">{db.products.length}</span>
            </button>
          </div>

          {/* Group 4: Raw Material Management */}
          <div className="nav-group">
            <div className="nav-label">Raw Material Management</div>
            <button
              className={`nav-item ${activeModule === 'raw-materials' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('raw-materials')}
              id="nav-raw-materials"
            >
              <Boxes />
              <span>Raw Material Management</span>
              <span className="nav-count">{db.rawMaterials.length}</span>
            </button>
          </div>

          {/* Group 5: Plant Operations & Stock */}
          <div className="nav-group">
            <div className="nav-label">Plant & Manufacturing</div>
            <button
              className={`nav-item ${activeModule === 'production' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('production')}
              id="nav-production"
            >
              <Factory />
              <span>Production Engine</span>
              <span className="nav-count">{db.productionRuns.length}</span>
            </button>

            <button
              className={`nav-item ${activeModule === 'stock' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('stock')}
              id="nav-stock"
            >
              <Layers />
              <span>Stock Register</span>
            </button>
          </div>

          {/* Group 4: Procurement & Overheads */}
          <div className="nav-group">
            <div className="nav-label">Purchases & Expenses</div>
            <button
              className={`nav-item ${activeModule === 'suppliers' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('suppliers')}
            >
              <Briefcase />
              <span>Supplier Accounts</span>
            </button>

            <button
              className={`nav-item ${activeModule === 'purchases' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('purchases')}
            >
              <ShoppingBag />
              <span>Purchases (Raw Mat.)</span>
            </button>

            <button
              className={`nav-item ${activeModule === 'expenses' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('expenses')}
            >
              <CircleDollarSign />
              <span>Factory Expenses</span>
            </button>

            <button
              className={`nav-item ${activeModule === 'returns' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('returns')}
            >
              <RotateCcw />
              <span>Returns & Defects</span>
            </button>
          </div>

          {/* Group 5: Accounts & Financials */}
          <div className="nav-group">
            <div className="nav-label">Financial Accounts</div>
            <button
              className={`nav-item ${activeModule === 'cash-bank' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('cash-bank')}
            >
              <Wallet />
              <span>Cash & Bank</span>
            </button>

            <button
              className={`nav-item ${activeModule === 'daily-summary' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('daily-summary')}
            >
              <Calendar />
              <span>Daily Summary</span>
            </button>

            <button
              className={`nav-item ${activeModule === 'monthly-summary' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('monthly-summary')}
            >
              <Calendar />
              <span>Monthly Summary</span>
            </button>

            <button
              className={`nav-item ${activeModule === 'yearly-summary' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('yearly-summary')}
            >
              <TrendingUp />
              <span>Yearly Summary</span>
            </button>

            <button
              className={`nav-item ${activeModule === 'profit-loss' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('profit-loss')}
            >
              <CircleDollarSign />
              <span>Profit & Loss</span>
            </button>

            <button
              className={`nav-item ${activeModule === 'reports' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('reports')}
            >
              <Download />
              <span>Reports & Export</span>
            </button>
          </div>

          {/* Group 6: Human Resources & Staff */}
          <div className="nav-group">
            <div className="nav-label">Staff & Payroll</div>
            <button
              className={`nav-item ${activeModule === 'employees' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('employees')}
              id="nav-employees"
            >
              <Users />
              <span>Employees & Payroll</span>
              <span className="nav-count">{db.employees?.length || 0}</span>
            </button>
          </div>

          {/* Group 7: System */}
          <div className="nav-group">
            <div className="nav-label">Administration</div>
            <button
              className={`nav-item ${activeModule === 'settings' ? 'nav-item-active' : ''}`}
              onClick={() => handleNavigate('settings')}
            >
              <Settings />
              <span>Settings & Backup</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-foot">
          <div className="offline-card">
            <div className="offline-icon">
              <WifiOff />
            </div>
            <div>
              <strong>100% Offline App</strong>
              <span>Fast local database active</span>
            </div>
          </div>

          <div className="user-card cursor-pointer" onClick={() => setIsOwner(!isOwner)}>
            <div className="user-avatar">{isOwner ? 'OM' : 'ST'}</div>
            <div>
              <strong>{isOwner ? 'Umar Farooq (Owner)' : 'Floor Supervisor (Staff)'}</strong>
              <span>{isOwner ? 'Super Admin' : 'Operator Access'}</span>
            </div>
            <ChevronDown />
          </div>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <main className="main-area">
        {/* Top Navbar */}
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)}>
            <Menu />
          </button>

          <div className="breadcrumb">
            <span>AL FAROOQ FOODS</span>
            <span>/</span>
            <strong>{moduleLabels[activeModule]}</strong>
          </div>

          <div className="top-actions">
            <div className="role-pill" onClick={() => setIsOwner(!isOwner)} title="Click to toggle role">
              <Shield className="w-3.5 h-3.5" />
              <span>{isOwner ? 'Owner View' : 'Staff View'}</span>
            </div>

            <button
              className="icon-button"
              title="Quick Backup JSON"
              onClick={() => {
                const { exportDatabaseJSON } = require('@/lib/db')
                exportDatabaseJSON(db)
              }}
            >
              <Download />
            </button>

            <button className="icon-button" onClick={() => handleNavigate('settings')} title="Settings">
              <Settings />
            </button>

            <div className="top-avatar">{isOwner ? 'AF' : 'ST'}</div>
          </div>
        </header>

        {/* Body Content Router */}
        <div className="content">
          {activeModule === 'dashboard' && (
            <DashboardView
              db={db}
              onNavigate={handleNavigate}
              onOpenReceipt={() => setShowReceiptModal(true)}
              isOwner={isOwner}
            />
          )}

          {activeModule === 'invoices' && (
            <InvoicesView db={db} onSaveDatabase={handleSaveDatabase} />
          )}

          {activeModule === 'production' && (
            <ProductionView db={db} onSaveDatabase={handleSaveDatabase} />
          )}

          {activeModule === 'raw-materials' && (
            <RawMaterialsView
              db={db}
              onSaveDatabase={handleSaveDatabase}
              onNavigateToSupplier={() => handleNavigate('suppliers')}
            />
          )}

          {(activeModule === 'products' || activeModule === 'stock') && (
            <InventoryView
              db={db}
              activeSubView={activeModule}
              onSaveDatabase={handleSaveDatabase}
            />
          )}

          {activeModule === 'counter-sales' && (
            <PosView
              db={db}
              onSaveDatabase={handleSaveDatabase}
              onNavigate={handleNavigate}
            />
          )}

          {(activeModule === 'distributors' ||
            activeModule === 'wholesalers' ||
            activeModule === 'customers') && (
            <SalesEntitiesView
              db={db}
              entityType={activeModule}
              onSaveDatabase={handleSaveDatabase}
            />
          )}

          {(activeModule === 'suppliers' ||
            activeModule === 'purchases' ||
            activeModule === 'expenses' ||
            activeModule === 'returns') && (
            <ProcurementView
              db={db}
              activeSubView={activeModule}
              onSaveDatabase={handleSaveDatabase}
            />
          )}

          {(activeModule === 'daily-summary' ||
            activeModule === 'monthly-summary' ||
            activeModule === 'yearly-summary' ||
            activeModule === 'profit-loss' ||
            activeModule === 'cash-bank' ||
            activeModule === 'reports') && (
            <AccountsView
              db={db}
              viewType={activeModule}
              onSaveDatabase={handleSaveDatabase}
              isOwner={isOwner}
            />
          )}

          {activeModule === 'employees' && (
            <EmployeesView db={db} onSaveDatabase={handleSaveDatabase} />
          )}

          {activeModule === 'phonebook' && (
            <PhonebookView db={db} onSaveDatabase={handleSaveDatabase} />
          )}

          {activeModule === 'settings' && (
            <SettingsView
              db={db}
              isOwner={isOwner}
              setIsOwner={setIsOwner}
              onSaveDatabase={handleSaveDatabase}
            />
          )}
        </div>
      </main>

      {/* Payment Receipt Modal */}
      {showReceiptModal && (
        <div className="payment-overlay">
          <div className="receipt-modal">
            <button className="receipt-close" onClick={() => setShowReceiptModal(false)}>
              <X />
            </button>
            <div className="receipt-success">
              <div className="receipt-confetti">✦ · ✦ · ✦</div>
              <div className="receipt-check">✓</div>
            </div>
            <p className="receipt-amount">
              <small>Rs</small>150,000<sup>00</sup>
            </p>
            <h2>Payment Received Successfully</h2>
            <div className="recipient-initials">HN</div>
            <h3>Haji Noor Muhammad</h3>
            <p className="recipient-phone">Noor Beverages · 0344 9549051</p>
            <div className="receipt-actions">
              <button
                onClick={() => {
                  setShowReceiptModal(false)
                  handleNavigate('invoices')
                }}
              >
                <FileText />
                <span>View Invoice Record</span>
                <ChevronDown className="rotate-270" />
              </button>
              <button onClick={() => setShowReceiptModal(false)}>
                <CheckCircleIcon />
                <span>Done / Close</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Building2Icon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      <path d="M10 6h4"/>
      <path d="M10 10h4"/>
      <path d="M10 14h4"/>
      <path d="M10 18h4"/>
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <path d="m9 11 3 3L22 4"/>
    </svg>
  )
}
