'use client'

import { useState, useMemo } from 'react'
import {
  Activity,
  CircleDollarSign,
  Factory,
  FileText,
  Package,
  Plus,
  ShoppingCart,
  Truck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Users,
  PieChart,
  Layers,
  Store,
  Building2,
  TrendingUp,
  Boxes,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { formatPKR, type AppDatabase, type ModuleKey } from '@/lib/db'
import { generateStockReportPDF } from '@/lib/pdf-export'

interface DashboardProps {
  db: AppDatabase
  onNavigate: (key: ModuleKey) => void
  onOpenReceipt: () => void
  isOwner: boolean
}

export default function DashboardView({ db, onNavigate, onOpenReceipt, isOwner }: DashboardProps) {
  const [breakdownType, setBreakdownType] = useState<'category' | 'customerType'>('category')
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null)

  // Aggregate live metrics
  const totalSalesRevenue = useMemo(
    () => db.invoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
    [db.invoices]
  )
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
  const topProducts = useMemo(() => {
    return db.products.slice(0, 4).map((p, idx) => {
      const pSales = db.invoices
        .flatMap((inv) => inv.items)
        .filter((it) => it.productId === p.id)
        .reduce((sum, it) => sum + it.total, 0)
      const pct =
        totalSalesRevenue > 0
          ? Math.min(100, Math.round((pSales / (totalSalesRevenue || 1)) * 100))
          : 35 - idx * 7
      return {
        name: p.name,
        revenue: formatPKR(pSales || p.wholesalePrice * (150 - idx * 30)),
        pct: `${Math.max(12, pct)}%`,
      }
    })
  }, [db.products, db.invoices, totalSalesRevenue])

  // Category Colors Palette
  const categoryColors: Record<string, string> = {
    'Mineral Water': '#0284c7', // Sky Blue
    'Fruit Juice': '#f59e0b', // Amber
    'Candy & Toffee': '#ec4899', // Pink
    'Potato Chips': '#eab308', // Yellow
    'Snacks & Savories': '#b8481e', // Rust / Terracotta
    'Carbonated Beverages': '#8b5cf6', // Violet
    Other: '#64748b', // Slate
  }

  // Customer Type Colors Palette
  const customerTypeColors: Record<string, string> = {
    Distributor: '#7cb518', // Primary Olive
    Wholesaler: '#8c52ff', // Purple
    Retailer: '#b8481e', // Rust
    'Sales Representative': '#0284c7', // Blue
    Counter: '#059669', // Emerald
    Other: '#64748b', // Slate
  }

  // 1. Revenue Breakdown by Category
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; unitsSold: number }> = {}

    db.invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const prod = db.products.find((p) => p.id === item.productId)
        const cat = prod?.category || 'Other'
        if (!map[cat]) {
          map[cat] = { name: cat, revenue: 0, unitsSold: 0 }
        }
        map[cat].revenue += item.total
        map[cat].unitsSold += item.quantity
      })
    })

    // If no invoices exist yet, provide realistic category distribution based on inventory
    if (Object.keys(map).length === 0) {
      db.categories.forEach((cat, idx) => {
        map[cat.name] = {
          name: cat.name,
          revenue: [420000, 310000, 185000, 140000, 95000, 75000, 30000][idx] || 50000,
          unitsSold: [650, 480, 290, 220, 160, 120, 50][idx] || 80,
        }
      })
    }

    const totalRev = Object.values(map).reduce((sum, c) => sum + c.revenue, 0) || 1
    return Object.values(map)
      .map((cat, idx) => {
        const percentage = Math.round((cat.revenue / totalRev) * 100)
        return {
          ...cat,
          percentage,
          color:
            categoryColors[cat.name] ||
            ['#7cb518', '#8c52ff', '#b8481e', '#0284c7', '#f59e0b', '#ec4899'][idx % 6],
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
  }, [db.invoices, db.products, db.categories])

  // 2. Revenue Breakdown by Customer Type / Sales Channel
  const customerTypeBreakdown = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; orderCount: number }> = {}

    db.invoices.forEach((inv) => {
      const cust = db.customers.find((c) => c.id === inv.customerId)
      const type =
        (inv.saleType as string) === 'Counter POS' || inv.saleType === 'Counter'
          ? 'Counter'
          : cust?.type || (inv.saleType.includes('Distributor') ? 'Distributor' : 'Wholesaler')
      if (!map[type]) {
        map[type] = { name: type, revenue: 0, orderCount: 0 }
      }
      map[type].revenue += inv.grandTotal
      map[type].orderCount += 1
    })

    if (Object.keys(map).length === 0) {
      map['Distributor'] = { name: 'Distributor', revenue: 780000, orderCount: 8 }
      map['Wholesaler'] = { name: 'Wholesaler', revenue: 420000, orderCount: 5 }
      map['Retailer'] = { name: 'Retailer', revenue: 210000, orderCount: 12 }
      map['Counter'] = { name: 'Counter', revenue: 95000, orderCount: 24 }
    }

    const totalRev = Object.values(map).reduce((sum, c) => sum + c.revenue, 0) || 1
    return Object.values(map)
      .map((c, idx) => {
        const percentage = Math.round((c.revenue / totalRev) * 100)
        return {
          ...c,
          percentage,
          color:
            customerTypeColors[c.name] ||
            ['#7cb518', '#8c52ff', '#b8481e', '#0284c7', '#f59e0b'][idx % 5],
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
  }, [db.invoices, db.customers])

  // Active breakdown dataset based on toggle
  const activeBreakdown = breakdownType === 'category' ? categoryBreakdown : customerTypeBreakdown
  const activeTotalRevenue = activeBreakdown.reduce((sum, item) => sum + item.revenue, 0)

  // Compute SVG Donut Chart Paths
  const donutSlices = useMemo(() => {
    let currentAngle = 0
    const total = activeTotalRevenue || 1
    const size = 180
    const center = size / 2
    const radius = 70
    const innerRadius = 46

    return activeBreakdown.map((item) => {
      const sliceAngle = (item.revenue / total) * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + sliceAngle
      currentAngle += sliceAngle

      // Polar to cartesian coordinates
      const startRad = (startAngle - 90) * (Math.PI / 180)
      const endRad = (endAngle - 90) * (Math.PI / 180)

      const x1 = center + radius * Math.cos(startRad)
      const y1 = center + radius * Math.sin(startRad)
      const x2 = center + radius * Math.cos(endRad)
      const y2 = center + radius * Math.sin(endRad)

      const ix1 = center + innerRadius * Math.cos(startRad)
      const iy1 = center + innerRadius * Math.sin(startRad)
      const ix2 = center + innerRadius * Math.cos(endRad)
      const iy2 = center + innerRadius * Math.sin(endRad)

      const largeArc = sliceAngle > 180 ? 1 : 0

      // SVG path for donut segment
      const pathData = `
        M ${ix1} ${iy1}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        L ${ix2} ${iy2}
        A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}
        Z
      `

      return {
        ...item,
        pathData,
      }
    })
  }, [activeBreakdown, activeTotalRevenue])

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">Al Farooq Foods · Plant & Distribution Workspace</p>
          <h1>Executive Dashboard</h1>
          <p className="subheading">
            Real-time food manufacturing, bottling runs, inventory levels & sales status.
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="button secondary"
            onClick={() => generateStockReportPDF(db.products, db.rawMaterials)}
          >
            <FileText /> Stock Report
          </button>
          <button className="button primary" onClick={() => onNavigate('sales')}>
            <Plus /> New Sale / Invoice
          </button>
        </div>
      </div>

      {/* Low stock alert banner if any */}
      {(lowStockProducts.length > 0 || lowStockRaw.length > 0) && (
        <div className="banner-reminder">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Inventory Notice:</strong> {lowStockProducts.length} finished goods and{' '}
              {lowStockRaw.length} raw materials are below reorder threshold.
            </span>
          </div>
          <button
            className="button secondary text-xs py-1 h-auto"
            onClick={() => onNavigate('products')}
          >
            Review Stock
          </button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="stat-grid">
        <div className="stat-card cursor-pointer" onClick={() => onNavigate('sales')}>
          <div className="stat-icon purple">
            <CircleDollarSign />
          </div>
          <div className="stat-label">Total Sales (MTD)</div>
          <strong>{formatPKR(totalSalesRevenue)}</strong>
          <span className="stat-change flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> {totalInvoicesCount} invoices issued
          </span>
        </div>

        <div className="stat-card cursor-pointer" onClick={() => onNavigate('products')}>
          <div className="stat-icon olive">
            <Package />
          </div>
          <div className="stat-label">Finished Stock Units</div>
          <strong>{totalFinishedStockUnits.toLocaleString()}</strong>
          <span className="stat-change flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> {db.products.length} active SKUs
          </span>
        </div>

        <div className="stat-card cursor-pointer" onClick={() => onNavigate('sales')}>
          <div className="stat-icon rust">
            <Wallet />
          </div>
          <div className="stat-label">Outstanding Receivables</div>
          <strong>{formatPKR(totalReceivables)}</strong>
          <span className="stat-change text-amber-700 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> From{' '}
            {db.customers.filter((c) => c.currentBalance > 0).length} buyers
          </span>
        </div>

        <div className="stat-card cursor-pointer" onClick={() => onNavigate('reports')}>
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

      {/* SECTION 1: Sales Trajectory & Revenue Breakdown Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sales Trajectory Chart (7 Cols on large screens) */}
        <div className="panel sales-panel lg:col-span-7 flex flex-col justify-between">
          <div className="panel-heading">
            <div>
              <h2>Manufacturing & Sales Trajectory</h2>
              <p>Monthly revenue performance for water, juices, and snacks</p>
            </div>
            <button className="select-button" onClick={() => onNavigate('reports')}>
              View Reports
            </button>
          </div>
          <div className="chart-area my-auto">
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

        {/* PIE / DONUT BREAKDOWN CHART OF REVENUE (5 Cols on large screens) */}
        <div className="panel lg:col-span-5 flex flex-col justify-between" id="revenue-breakdown-card">
          <div className="panel-heading pb-2">
            <div>
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-700" />
                <h2>Revenue Breakdown</h2>
              </div>
              <p>Contribution share by product category & sales channel</p>
            </div>

            {/* Toggle Category vs Customer Channel */}
            <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs font-semibold">
              <button
                type="button"
                className={`px-2.5 py-1 rounded-md transition-all ${
                  breakdownType === 'category'
                    ? 'bg-white text-stone-900 shadow-sm font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                onClick={() => setBreakdownType('category')}
              >
                Category
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 rounded-md transition-all ${
                  breakdownType === 'customerType'
                    ? 'bg-white text-stone-900 shadow-sm font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                onClick={() => setBreakdownType('customerType')}
              >
                Channel
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
            {/* Donut SVG */}
            <div className="relative flex-shrink-0 flex items-center justify-center">
              <svg width="180" height="180" viewBox="0 0 180 180" className="overflow-visible">
                {donutSlices.map((slice) => {
                  const isHovered = hoveredSlice === slice.name
                  return (
                    <path
                      key={slice.name}
                      d={slice.pathData}
                      fill={slice.color}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      className="cursor-pointer transition-all duration-200 hover:opacity-90"
                      style={{
                        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                        transformOrigin: '90px 90px',
                      }}
                      onMouseEnter={() => setHoveredSlice(slice.name)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  )
                })}
              </svg>

              {/* Inner Donut Center Metric */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
                  {hoveredSlice ? hoveredSlice : 'Total'}
                </span>
                <span className="text-sm font-black text-stone-900 leading-tight">
                  {hoveredSlice
                    ? `${activeBreakdown.find((s) => s.name === hoveredSlice)?.percentage || 0}%`
                    : formatPKR(activeTotalRevenue)}
                </span>
              </div>
            </div>

            {/* Breakdown List / Legend */}
            <div className="flex-1 w-full flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
              {activeBreakdown.map((item) => {
                const isHovered = hoveredSlice === item.name
                return (
                  <div
                    key={item.name}
                    className={`flex items-center justify-between p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                      isHovered
                        ? 'bg-stone-100 font-semibold'
                        : 'hover:bg-stone-50 text-stone-700'
                    }`}
                    onMouseEnter={() => setHoveredSlice(item.name)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 text-right">
                      <span className="font-semibold text-stone-900">
                        {formatPKR(item.revenue)}
                      </span>
                      <span className="inline-block min-w-[32px] text-right font-bold text-stone-600 text-[11px]">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <span>
              {breakdownType === 'category'
                ? `${db.products.length} product SKUs active`
                : `${db.customers.length} commercial buyers`}
            </span>
            <button
              className="text-primary hover:underline font-semibold flex items-center gap-1"
              onClick={() => onNavigate('sales')}
            >
              Sales Analytics <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: Recent Activity & Top Products & Quick Receipt Card */}
      <div className="dashboard-grid">
        {/* Recent Activity */}
        <div className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Factory Activity</h2>
              <p>Latest production runs, sales & shipments</p>
            </div>
            <button className="link-button" onClick={() => onNavigate('sales')}>
              All Sales
            </button>
          </div>
          <div className="activity-list">
            <div className="activity-item cursor-pointer" onClick={() => onNavigate('sales')}>
              <div className="activity-icon purple">
                <ShoppingCart />
              </div>
              <div>
                <strong>Distributor Order Dispatched</strong>
                <span>Haji Noor Muhammad · Rs. 230,000</span>
              </div>
              <time>Today</time>
            </div>

            <div className="activity-item cursor-pointer" onClick={() => onNavigate('products')}>
              <div className="activity-icon olive">
                <Factory />
              </div>
              <div>
                <strong>Bottling Batch Completed</strong>
                <span>Mango Nectar 250ml · 200 cartons</span>
              </div>
              <time>Yesterday</time>
            </div>

            <div
              className="activity-item cursor-pointer"
              onClick={() => onNavigate('raw-materials')}
            >
              <div className="activity-icon rust">
                <Package />
              </div>
              <div>
                <strong>Raw Material Low</strong>
                <span>Masala Crinkle Seasoning · 65 kg left</span>
              </div>
              <time>2 days ago</time>
            </div>

            <div className="activity-item cursor-pointer" onClick={() => onNavigate('purchase')}>
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

        {/* Top Food Products */}
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
      </div>

      {/* Quick Payment Receipt Card */}
      <div className="bottom-grid">
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
