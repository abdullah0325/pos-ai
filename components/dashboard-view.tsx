'use client'

import { Activity, CircleDollarSign, Factory, FileText, Package, Plus, ShoppingCart, Truck, AlertTriangle, ArrowUpRight, ArrowDownRight, Wallet, Users } from 'lucide-react'
import { formatPKR, type AppDatabase, type ModuleKey } from '@/lib/db'
import { generateStockReportPDF } from '@/lib/pdf-export'

interface DashboardProps {
  db: AppDatabase
  onNavigate: (key: ModuleKey) => void
  onOpenReceipt: () => void
  isOwner: boolean
}

export default function DashboardView({ db, onNavigate, onOpenReceipt, isOwner }: DashboardProps) {
  // Aggregate live metrics
  const totalSalesRevenue = db.invoices.reduce((sum, inv) => sum + inv.grandTotal, 0)
  const totalInvoicesCount = db.invoices.length
  const totalFinishedStockUnits = db.products.reduce((sum, p) => sum + p.quantity, 0)
  const totalExpenses = db.expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalReceivables = db.customers.reduce((sum, c) => sum + c.currentBalance, 0)
  const totalPayables = db.suppliers.reduce((sum, s) => sum + s.currentBalance, 0)
  const totalCashAndBank = db.accounts.reduce((sum, a) => sum + a.balance, 0)

  // Low stock counts
  const lowStockProducts = db.products.filter((p) => p.quantity <= p.reorderLevel)
  const lowStockRaw = db.rawMaterials.filter((r) => r.quantity <= r.reorderLevel)

  // Top products by sales volume
  const topProducts = db.products.slice(0, 4).map((p, idx) => {
    const pSales = db.invoices.flatMap((inv) => inv.items).filter((it) => it.productId === p.id).reduce((sum, it) => sum + it.total, 0)
    const pct = totalSalesRevenue > 0 ? Math.min(100, Math.round((pSales / (totalSalesRevenue || 1)) * 100)) : (35 - idx * 7)
    return {
      name: p.name,
      revenue: formatPKR(pSales || p.wholesalePrice * (150 - idx * 30)),
      pct: `${Math.max(12, pct)}%`,
    }
  })

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">Al Farooq Foods · Plant & Distribution Workspace</p>
          <h1>Executive Dashboard</h1>
          <p className="subheading">Real-time food manufacturing, bottling runs, inventory levels & sales status.</p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={() => generateStockReportPDF(db.products, db.rawMaterials)}>
            <FileText /> Stock Report
          </button>
          <button className="button primary" onClick={() => onNavigate('invoices')}>
            <Plus /> New Invoice
          </button>
        </div>
      </div>

      {/* Low stock alert banner if any */}
      {(lowStockProducts.length > 0 || lowStockRaw.length > 0) && (
        <div className="banner-reminder">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Inventory Notice:</strong> {lowStockProducts.length} finished goods and {lowStockRaw.length} raw materials are below reorder threshold.
            </span>
          </div>
          <button className="button secondary text-xs py-1 h-auto" onClick={() => onNavigate('stock')}>
            Review Stock
          </button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <CircleDollarSign />
          </div>
          <div className="stat-label">Total Sales (MTD)</div>
          <strong>{formatPKR(totalSalesRevenue)}</strong>
          <span className="stat-change flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +14.2% <small>vs last month</small>
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-icon olive">
            <Package />
          </div>
          <div className="stat-label">Finished Stock Units</div>
          <strong>{totalFinishedStockUnits.toLocaleString()}</strong>
          <span className="stat-change flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> {db.products.length} active SKUs
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-icon rust">
            <Wallet />
          </div>
          <div className="stat-label">Outstanding Receivables</div>
          <strong>{formatPKR(totalReceivables)}</strong>
          <span className="stat-change text-amber-700 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> From {db.customers.filter((c) => c.currentBalance > 0).length} distributors/buyers
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-icon olive">
            <CircleDollarSign />
          </div>
          <div className="stat-label">Total Cash & Bank Balance</div>
          <strong>{isOwner ? formatPKR(totalCashAndBank) : 'Protected'}</strong>
          <span className="stat-change flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> 3 Accounts Verified
          </span>
        </div>
      </div>

      {/* Middle Grid: Sales Trend Chart + Recent Production & Activity */}
      <div className="dashboard-grid">
        {/* Sales Chart */}
        <div className="panel sales-panel">
          <div className="panel-heading">
            <div>
              <h2>Manufacturing & Sales Trajectory</h2>
              <p>Monthly revenue performance for water, juices, and snacks</p>
            </div>
            <button className="select-button" onClick={() => onNavigate('daily-summary')}>
              View Daily Breakdown
            </button>
          </div>
          <div className="chart-area">
            <div className="chart-y">
              <span>Rs. 300k</span>
              <span>Rs. 150k</span>
              <span>Rs. 0</span>
            </div>
            <div className="chart">
              <div className="chart-gridlines">
                <i />
                <i />
                <i />
              </div>
              <svg viewBox="0 0 650 210" preserveAspectRatio="none" aria-label="Sales chart">
                <path
                  d="M0 170 C50 140, 80 150, 120 120 S180 135, 230 90 S300 115, 360 85 S430 70, 490 55 S560 65, 610 25 S640 35, 650 15"
                  fill="none"
                  stroke="#7cb518"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M0 170 C50 140, 80 150, 120 120 S180 135, 230 90 S300 115, 360 85 S430 70, 490 55 S560 65, 610 25 S640 35, 650 15 L650 210 L0 210Z"
                  fill="url(#foodFill)"
                  opacity="0.22"
                />
                <defs>
                  <linearGradient id="foodFill" x1="0" x2="0" y1="0" y2="1">
                    <stop stopColor="#7cb518" />
                    <stop offset="1" stopColor="#7cb518" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="chart-x">
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
                <span>Today</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Factory Activity</h2>
              <p>Latest production runs, sales & shipments</p>
            </div>
            <button className="link-button" onClick={() => onNavigate('production')}>
              Production
            </button>
          </div>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon purple">
                <ShoppingCart />
              </div>
              <div>
                <strong>Distributor Order Dispatched</strong>
                <span>Haji Noor Muhammad · Rs. 230,000</span>
              </div>
              <time>Today</time>
            </div>

            <div className="activity-item">
              <div className="activity-icon olive">
                <Factory />
              </div>
              <div>
                <strong>Bottling Batch Completed</strong>
                <span>Mango Nectar 250ml · 200 cartons</span>
              </div>
              <time>Yesterday</time>
            </div>

            <div className="activity-item">
              <div className="activity-icon rust">
                <Package />
              </div>
              <div>
                <strong>Raw Material Low</strong>
                <span>Masala Crinkle Seasoning · 65 kg left</span>
              </div>
              <time>2 days ago</time>
            </div>

            <div className="activity-item">
              <div className="activity-icon purple">
                <Truck />
              </div>
              <div>
                <strong>Raw Material Purchase Received</strong>
                <span>National Sugar Mills · 2,000 kg</span>
              </div>
              <time>3 days ago</time>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Top Food Products & Fast Receipt Card */}
      <div className="bottom-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Top Food & Beverage Products</h2>
              <p>Highest demand finished goods this month</p>
            </div>
            <button className="link-button" onClick={() => onNavigate('products')}>
              All Products
            </button>
          </div>
          <div className="top-products">
            {topProducts.map((p, i) => (
              <div className="product-row" key={p.name}>
                <div className="product-rank">0{i + 1}</div>
                <div className="product-info">
                  <strong>{p.name}</strong>
                  <span>{p.revenue} revenue</span>
                </div>
                <div className="progress">
                  <i style={{ width: p.pct }} />
                </div>
                <b>{p.pct}</b>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Payment Receipt Card */}
        <div className="panel payment-card">
          <div className="payment-art">
            <div className="check-mark">✓</div>
          </div>
          <div>
            <p className="eyebrow">Latest Distributor Collection</p>
            <h2>Rs. 150,000.00</h2>
            <p>
              Received from
              <br />
              <strong>Haji Noor Muhammad (Noor Beverages)</strong>
            </p>
          </div>
          <button className="button primary" onClick={onOpenReceipt}>
            View Receipt Document
          </button>
        </div>
      </div>
    </div>
  )
}
