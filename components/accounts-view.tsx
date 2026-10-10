'use client'

import { confirmAction } from '@/lib/confirmation'

import ModuleHeading from './module-heading'

import { useState, useEffect } from 'react'
import {
  CircleDollarSign,
  Calendar,
  TrendingUp,
  ArrowRightLeft,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Download,
  Wallet,
  Plus,
  X,
  PieChart,
  Layers,
  FileSpreadsheet,
} from 'lucide-react'
import { formatPKR, formatDate, type AppDatabase, type AccountTransfer } from '@/lib/db'
import { exportToCSV, generateStockReportPDF } from '@/lib/pdf-export'

export type AccountsSubTab =
  | 'reports'
  | 'profit-loss'
  | 'cash-bank'
  | 'daily-summary'
  | 'monthly-summary'
  | 'yearly-summary'

interface AccountsViewProps {
  db: AppDatabase
  viewType?: 'daily-summary' | 'monthly-summary' | 'yearly-summary' | 'profit-loss' | 'cash-bank' | 'reports'
  onSaveDatabase: (updated: AppDatabase) => void
  isOwner: boolean
}

export default function AccountsView({ db, viewType = 'reports', onSaveDatabase, isOwner }: AccountsViewProps) {
  const [tab, setTab] = useState<AccountsSubTab>(viewType as AccountsSubTab)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [selectedYear, setSelectedYear] = useState('2026')
  const [showTransferModal, setShowTransferModal] = useState(false)

  useEffect(() => {
    if (viewType) {
      setTab(viewType as AccountsSubTab)
    }
  }, [viewType])

  const currentView = tab

  // 1. DAILY CALCULATIONS for selectedDate
  const dailyInvoices = db.invoices.filter((inv) => inv.date === selectedDate)
  const dailySales = dailyInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0)
  const dailyCashReceived = dailyInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0)
  const dailyCreditSales = dailyInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0)

  const dailyPurchases = db.purchases.filter((p) => p.date === selectedDate)
  const dailyPurchaseAmount = dailyPurchases.reduce((sum, p) => sum + p.grandTotal, 0)
  const dailyPurchasePaid = dailyPurchases.reduce((sum, p) => sum + p.amountPaid, 0)

  const dailyExpensesList = db.expenses.filter((e) => e.date === selectedDate)
  const dailyExpenses = dailyExpensesList.reduce((sum, e) => sum + e.amount, 0)

  const dailyProduction = db.productionRuns.filter((pr) => pr.date === selectedDate)
  const dailyProductionCost = dailyProduction.reduce((sum, pr) => sum + pr.totalProductionCost, 0)

  // Estimated daily COGS (Cost of goods sold from invoices)
  const dailyCOGS = dailyInvoices.flatMap((inv) => inv.items).reduce((sum, it) => sum + (it.costPrice || it.unitPrice * 0.7) * it.quantity, 0)
  const dailyGrossProfit = dailySales - dailyCOGS
  const dailyNetProfit = dailyGrossProfit - dailyExpenses

  // 2. MONTHLY CALCULATIONS for selectedMonth (e.g. 2026-08)
  const monthlyInvoices = db.invoices.filter((inv) => inv.date.startsWith(selectedMonth))
  const monthlySales = monthlyInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0)
  const monthlyCollections = monthlyInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0)
  const monthlyReceivables = monthlyInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0)

  const monthlyPurchases = db.purchases.filter((p) => p.date.startsWith(selectedMonth))
  const monthlyPurchasesAmount = monthlyPurchases.reduce((sum, p) => sum + p.grandTotal, 0)

  const monthlyExpensesList = db.expenses.filter((e) => e.date.startsWith(selectedMonth))
  const monthlyExpenses = monthlyExpensesList.reduce((sum, e) => sum + e.amount, 0)

  const monthlyProduction = db.productionRuns.filter((pr) => pr.date.startsWith(selectedMonth))
  const monthlyProductionOutput = monthlyProduction.reduce((sum, pr) => sum + pr.targetQuantity, 0)

  const monthlyCOGS = monthlyInvoices.flatMap((inv) => inv.items).reduce((sum, it) => sum + (it.costPrice || it.unitPrice * 0.7) * it.quantity, 0)
  const monthlyGrossProfit = monthlySales - monthlyCOGS
  const monthlyNetProfit = monthlyGrossProfit - monthlyExpenses

  // 3. YEARLY CALCULATIONS for selectedYear (e.g. 2026)
  const yearlyInvoices = db.invoices.filter((inv) => inv.date.startsWith(selectedYear))
  const yearlySales = yearlyInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0)
  const yearlyPurchases = db.purchases.filter((p) => p.date.startsWith(selectedYear)).reduce((sum, p) => sum + p.grandTotal, 0)
  const yearlyExpenses = db.expenses.filter((e) => e.date.startsWith(selectedYear)).reduce((sum, e) => sum + e.amount, 0)
  const yearlyCOGS = yearlyInvoices.flatMap((inv) => inv.items).reduce((sum, it) => sum + (it.costPrice || it.unitPrice * 0.7) * it.quantity, 0)
  const yearlyNetProfit = yearlySales - yearlyCOGS - yearlyExpenses

  // Export Daily Summary CSV
  const exportDailyCSV = () => {
    const headers = ['Metric', 'Amount (Rs)']
    const rows = [
      ['Date', selectedDate],
      ['Total Sales', dailySales],
      ['Cash Received', dailyCashReceived],
      ['Credit Sales Added', dailyCreditSales],
      ['Raw Material Purchases', dailyPurchaseAmount],
      ['Factory Expenses', dailyExpenses],
      ['Cost of Goods Sold (COGS)', dailyCOGS],
      ['Estimated Gross Profit', dailyGrossProfit],
      ['Net Daily Profit', dailyNetProfit],
    ]
    exportToCSV(`Daily_Accounts_Summary_${selectedDate}`, headers, rows)
  }

  const tabs: Array<{
    id: AccountsSubTab
    label: string
    icon: React.ReactNode
  }> = [
    {
      id: 'reports',
      label: 'Reports & Exports',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'profit-loss',
      label: 'Profit & Loss Statement',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: 'cash-bank',
      label: 'Cash & Bank Accounts',
      icon: <Wallet className="w-4 h-4" />,
    },
    {
      id: 'daily-summary',
      label: 'Daily Summary',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'monthly-summary',
      label: 'Monthly Summary',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'yearly-summary',
      label: 'Yearly Summary',
      icon: <TrendingUp className="w-4 h-4" />,
    },
  ]

  return (
    <div className="page-stack">
      {/* Top Accounts Horizontal Navigation Bar */}
      <div data-ui="surface" className="gradient-card module-tabs bg-white rounded-xl border border-stone-200 p-2 shadow-xs sticky top-[76px] z-[9]">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {tabs.map((t) => {
            const isActive = currentView === t.id
            return (
              <button data-ui="tab"
                key={t.id}
                id={`accounts-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Heading */}
      <ModuleHeading icon="accounts">
        <div>
          <p className="eyebrow">Financial Accounts & Books</p>
          <h1>
            {currentView === 'daily-summary'
              ? 'Daily Accounts Summary'
              : currentView === 'monthly-summary'
              ? 'Monthly Accounts Summary'
              : currentView === 'yearly-summary'
              ? 'Yearly Accounts Summary'
              : currentView === 'profit-loss'
              ? 'Profit & Loss Statement'
              : currentView === 'cash-bank'
              ? 'Cash & Bank Accounts'
              : 'Reports & Exports Center'}
          </h1>
          <p className="subheading">
            {currentView === 'profit-loss'
              ? 'Comprehensive statement reflecting Sales Revenue, Cost of Goods Sold (COGS), Plant Overheads & Net Operating Profit.'
              : currentView === 'cash-bank'
              ? 'Multi-account cash register, Meezan Bank, and HBL account ledger with real-time fund transfers.'
              : 'Auto-calculated offline books directly connected to manufacturing, sales, and procurement.'}
          </p>
        </div>
        <div className="heading-actions">
          {currentView === 'daily-summary' && (
            <>
              <input data-ui="input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-[var(--border)] rounded-md px-3 py-1.5 text-xs bg-white"
              />
              <button data-ui="button" className="button secondary" onClick={exportDailyCSV}>
                <Download /> Export CSV
              </button>
            </>
          )}

          {currentView === 'monthly-summary' && (
            <input data-ui="input"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-[var(--border)] rounded-md px-3 py-1.5 text-xs bg-white"
            />
          )}

          {currentView === 'yearly-summary' && (
            <select data-ui="select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="border border-[var(--border)] rounded-md px-3 py-1.5 text-xs bg-white"
            >
              <option value="2026">Year 2026</option>
              <option value="2025">Year 2025</option>
            </select>
          )}

          {currentView === 'cash-bank' && (
            <button data-ui="button" className="button primary" onClick={() => setShowTransferModal(true)}>
              <ArrowRightLeft /> Transfer Funds
            </button>
          )}
        </div>
      </ModuleHeading>

      {/* VIEW: DAILY SUMMARY */}
      {currentView === 'daily-summary' && (
        <div className="space-y-6">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Daily Gross Sales ({selectedDate})</div>
              <strong>{formatPKR(dailySales)}</strong>
              <span className="stat-change text-emerald-700">{dailyInvoices.length} invoices created</span>
            </div>

            <div className="stat-card">
              <div className="stat-label">Cash Collected Today</div>
              <strong className="text-emerald-700">{formatPKR(dailyCashReceived)}</strong>
              <span className="stat-change">Cash in hand + Bank deposits</span>
            </div>

            <div className="stat-card">
              <div className="stat-label">Daily Factory Expenses</div>
              <strong className="text-amber-700">{formatPKR(dailyExpenses)}</strong>
              <span className="stat-change">{dailyExpensesList.length} expense vouchers</span>
            </div>

            <div className="stat-card">
              <div className="stat-label">Estimated Daily Net Profit</div>
              <strong className={dailyNetProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                {formatPKR(dailyNetProfit)}
              </strong>
              <span className="stat-change">Sales - COGS - Expenses</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Invoices list */}
            <div className="panel">
              <div className="panel-heading mb-3">
                <div>
                  <h2>Today&apos;s Invoices & Sales</h2>
                  <p>All sales executed on {formatDate(selectedDate)}</p>
                </div>
              </div>
              <div className="table-scroll">
                <table data-ui="table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Paid</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="font-bold">{inv.invoiceNumber}</td>
                        <td>{inv.customerName}</td>
                        <td className="font-bold">{formatPKR(inv.grandTotal)}</td>
                        <td className="text-emerald-700">{formatPKR(inv.amountPaid)}</td>
                        <td>
                          <span className={inv.status === 'Paid' ? 'status status-success' : 'status status-warning'}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {dailyInvoices.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-400 py-6">
                          No sales recorded on this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Daily Expenses list */}
            <div className="panel">
              <div className="panel-heading mb-3">
                <div>
                  <h2>Today&apos;s Factory Expenses</h2>
                  <p>Vouchers paid on {formatDate(selectedDate)}</p>
                </div>
              </div>
              <div className="table-scroll">
                <table data-ui="table">
                  <thead>
                    <tr>
                      <th>Voucher #</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyExpensesList.map((exp) => (
                      <tr key={exp.id}>
                        <td className="font-bold">{exp.voucherNumber}</td>
                        <td>{exp.title}</td>
                        <td>{exp.category}</td>
                        <td className="font-bold text-amber-700">{formatPKR(exp.amount)}</td>
                      </tr>
                    ))}
                    {dailyExpensesList.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-gray-400 py-6">
                          No expenses recorded on this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: MONTHLY SUMMARY */}
      {viewType === 'monthly-summary' && (
        <div className="space-y-6">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Monthly Gross Revenue</div>
              <strong>{formatPKR(monthlySales)}</strong>
              <span className="stat-change text-emerald-700">{monthlyInvoices.length} total orders</span>
            </div>

            <div className="stat-card">
              <div className="stat-label">Total Monthly Collections</div>
              <strong className="text-emerald-700">{formatPKR(monthlyCollections)}</strong>
              <span className="stat-change">Cash and bank inflows</span>
            </div>

            <div className="stat-card">
              <div className="stat-label">Raw Material Purchases</div>
              <strong>{formatPKR(monthlyPurchasesAmount)}</strong>
              <span className="stat-change">{monthlyPurchases.length} POs processed</span>
            </div>

            <div className="stat-card">
              <div className="stat-label">Net Monthly Operating Profit</div>
              <strong className="text-emerald-700">{formatPKR(monthlyNetProfit)}</strong>
              <span className="stat-change">Revenue - COGS - Overheads</span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading mb-4">
              <div>
                <h2>Monthly Financial Statement ({selectedMonth})</h2>
                <p>Consolidated manufacturing, sales, procurement and overhead ledger</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div data-ui="surface" className="gradient-card bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <h3 className="font-bold text-sm text-gray-900 border-b border-gray-200 pb-2">Revenue & Inflows</h3>
                <div className="flex justify-between text-gray-700">
                  <span>Gross Finished Goods Invoiced:</span>
                  <span className="font-bold">{formatPKR(monthlySales)}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-medium">
                  <span>Cash & Bank Collections Realized:</span>
                  <span className="font-bold">{formatPKR(monthlyCollections)}</span>
                </div>
                <div className="flex justify-between text-amber-800">
                  <span>Outstanding Month-End Receivables:</span>
                  <span className="font-bold">{formatPKR(monthlyReceivables)}</span>
                </div>
                <div className="flex justify-between text-gray-700 pt-2 border-t border-gray-200">
                  <span>Total Cartons/Units Produced:</span>
                  <span className="font-bold">{monthlyProductionOutput.toLocaleString()} pk</span>
                </div>
              </div>

              <div data-ui="surface" className="gradient-card bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <h3 className="font-bold text-sm text-gray-900 border-b border-gray-200 pb-2">Costs & Expenses</h3>
                <div className="flex justify-between text-gray-700">
                  <span>Cost of Finished Goods Sold (COGS):</span>
                  <span className="font-bold">{formatPKR(monthlyCOGS)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Factory Electricity & Utilities:</span>
                  <span className="font-bold">
                    {formatPKR(
                      monthlyExpensesList.filter((e) => e.category === 'Factory Electricity').reduce((s, e) => s + e.amount, 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Labor & Wages Overheads:</span>
                  <span className="font-bold">
                    {formatPKR(
                      monthlyExpensesList.filter((e) => e.category === 'Labor & Wages').reduce((s, e) => s + e.amount, 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Net Estimated Monthly Profit:</span>
                  <span className="text-[#7cb518] text-base">{formatPKR(monthlyNetProfit)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: YEARLY SUMMARY */}
      {viewType === 'yearly-summary' && (
        <div className="space-y-6">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Annual Sales Turnover ({selectedYear})</div>
              <strong>{formatPKR(yearlySales)}</strong>
              <span className="stat-change text-emerald-700">Gross invoiced volume</span>
            </div>

            <div className="stat-card">
              <div className="stat-label">Annual Raw Material Purchases</div>
              <strong>{formatPKR(yearlyPurchases)}</strong>
              <span className="stat-change">Sugar, preforms, concentrates</span>
            </div>

            <div className="stat-card">
              <div className="stat-label">Annual Factory Expenses</div>
              <strong>{formatPKR(yearlyExpenses)}</strong>
              <span className="stat-change">Power, labor, fuel, maintenance</span>
            </div>

            <div className="stat-card">
              <div className="stat-label">Annual Net Operating Profit</div>
              <strong className="text-emerald-700">{formatPKR(yearlyNetProfit)}</strong>
              <span className="stat-change">Net annual yield</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: PROFIT & LOSS */}
      {viewType === 'profit-loss' && (
        <div className="panel max-w-4xl mx-auto">
          <div className="panel-heading mb-6 border-b border-gray-200 pb-4">
            <div>
              <p className="eyebrow">AL FAROOQ FOODS · MANUFACTURING ACCOUNTS</p>
              <h2>Income & Profit/Loss Statement</h2>
              <p>For Period: All Current Recorded Operations (2026)</p>
            </div>
            <button data-ui="button"
              className="button secondary"
              onClick={() => {
                const headers = ['Category', 'Particulars', 'Amount (PKR)']
                const rows = [
                  ['Revenue', 'Gross Invoiced Sales', db.invoices.reduce((s, i) => s + i.grandTotal, 0)],
                  ['Cost of Sales', 'Raw Material & Production COGS', db.invoices.flatMap((i) => i.items).reduce((s, it) => s + (it.costPrice || it.unitPrice * 0.75) * it.quantity, 0)],
                  ['Gross Profit', 'Revenue minus COGS', db.invoices.reduce((s, i) => s + i.grandTotal, 0) - db.invoices.flatMap((i) => i.items).reduce((s, it) => s + (it.costPrice || it.unitPrice * 0.75) * it.quantity, 0)],
                  ['Operating Expenses', 'Factory Electricity, Labor, Fuel', db.expenses.reduce((s, e) => s + e.amount, 0)],
                  ['Net Profit', 'Operating Surplus', db.invoices.reduce((s, i) => s + i.grandTotal, 0) - db.invoices.flatMap((i) => i.items).reduce((s, it) => s + (it.costPrice || it.unitPrice * 0.75) * it.quantity, 0) - db.expenses.reduce((s, e) => s + e.amount, 0)],
                ]
                exportToCSV(`Profit_Loss_AL_FAROOQ_FOODS`, headers, rows)
              }}
            >
              <Download /> Export Statement
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. REVENUE */}
            <div data-ui="surface" className="gradient-card bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-sm text-gray-900 mb-2">1. Operating Revenue</h3>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span>Gross Commercial Sales (Water, Juices, Snacks)</span>
                <span className="font-bold">{formatPKR(db.invoices.reduce((s, i) => s + i.grandTotal, 0))}</span>
              </div>
              <div className="flex justify-between py-1 text-gray-500">
                <span>Less: Trade Discounts Allowed</span>
                <span>- {formatPKR(db.invoices.reduce((s, i) => s + i.discount, 0))}</span>
              </div>
              <div className="flex justify-between py-1.5 font-bold text-gray-900 text-sm">
                <span>Net Sales Revenue:</span>
                <span className="text-[#7cb518]">{formatPKR(db.invoices.reduce((s, i) => s + i.grandTotal, 0))}</span>
              </div>
            </div>

            {/* 2. COST OF GOODS SOLD */}
            <div data-ui="surface" className="gradient-card bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-sm text-gray-900 mb-2">2. Cost of Goods Sold (COGS)</h3>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span>Raw Materials Consumed in Production (Sugar, Pulp, Preforms)</span>
                <span>{formatPKR(db.productionRuns.reduce((s, pr) => s + pr.consumedMaterials.reduce((sm, m) => sm + m.totalCost, 0), 0))}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span>Direct Plant Labor & Bottling Wages</span>
                <span>{formatPKR(db.productionRuns.reduce((s, pr) => s + pr.laborCost, 0))}</span>
              </div>
              <div className="flex justify-between py-1.5 font-bold text-gray-900 text-sm">
                <span>Total Manufacturing Cost of Sold Goods:</span>
                <span>
                  {formatPKR(
                    db.invoices.flatMap((i) => i.items).reduce((s, it) => s + (it.costPrice || it.unitPrice * 0.75) * it.quantity, 0)
                  )}
                </span>
              </div>
            </div>

            {/* 3. GROSS PROFIT */}
            <div data-ui="surface" className="gradient-card bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex justify-between items-center text-sm font-bold text-emerald-950">
              <span>3. Gross Manufacturing Profit:</span>
              <span className="text-base text-emerald-700">
                {formatPKR(
                  db.invoices.reduce((s, i) => s + i.grandTotal, 0) -
                    db.invoices.flatMap((i) => i.items).reduce((s, it) => s + (it.costPrice || it.unitPrice * 0.75) * it.quantity, 0)
                )}
              </span>
            </div>

            {/* 4. OPERATING EXPENSES */}
            <div data-ui="surface" className="gradient-card bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-sm text-gray-900 mb-2">4. General, Factory & Selling Overheads</h3>
              {['Factory Electricity', 'Labor & Wages', 'Fuel & Diesel', 'Machinery Maintenance', 'Factory Rent', 'Freight & Transport'].map((cat) => {
                const amt = db.expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0)
                return (
                  <div key={cat} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
                    <span>{cat}</span>
                    <span>{formatPKR(amt)}</span>
                  </div>
                )
              })}
              <div className="flex justify-between py-1.5 font-bold text-gray-900 text-sm mt-2 border-t border-gray-300">
                <span>Total Overhead Expenses:</span>
                <span className="text-amber-800">{formatPKR(db.expenses.reduce((s, e) => s + e.amount, 0))}</span>
              </div>
            </div>

            {/* 5. NET PROFIT */}
            <div data-ui="surface" className="bg-[#7cb518] text-white p-5 rounded-xl flex justify-between items-center font-bold text-base shadow-lg">
              <div>
                <span className="block text-xs uppercase tracking-wider text-lime-100 font-normal">Final Net Yield</span>
                <span>NET OPERATING PROFIT</span>
              </div>
              <span className="text-2xl">
                {formatPKR(
                  db.invoices.reduce((s, i) => s + i.grandTotal, 0) -
                    db.invoices.flatMap((i) => i.items).reduce((s, it) => s + (it.costPrice || it.unitPrice * 0.75) * it.quantity, 0) -
                    db.expenses.reduce((s, e) => s + e.amount, 0)
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: CASH & BANK */}
      {viewType === 'cash-bank' && (
        <div className="space-y-6">
          <div className="stat-grid">
            {db.accounts.map((acc) => (
              <div className="stat-card" key={acc.id}>
                <div className="stat-icon olive">
                  <Wallet />
                </div>
                <div className="stat-label">{acc.name} ({acc.type})</div>
                <strong className="text-gray-900">{isOwner ? formatPKR(acc.balance) : 'Protected'}</strong>
                <span className="stat-change">
                  {acc.accountNumber ? `A/C: ${acc.accountNumber}` : 'Factory Main Register'}
                </span>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-heading mb-4">
              <div>
                <h2>Recent Bank & Cash Transfers</h2>
                <p>Audited inter-account fund shifts</p>
              </div>
              <button data-ui="button" className="button primary" onClick={() => setShowTransferModal(true)}>
                <ArrowRightLeft /> Transfer Balance
              </button>
            </div>

            <div className="table-scroll">
              <table data-ui="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>From Account</th>
                    <th>To Account</th>
                    <th>Transferred Amount</th>
                    <th>Reference / Description</th>
                  </tr>
                </thead>
                <tbody>
                  {db.transfers.map((tr) => (
                    <tr key={tr.id}>
                      <td>{formatDate(tr.date)}</td>
                      <td className="font-semibold text-gray-800">{tr.fromAccount}</td>
                      <td className="font-semibold text-[#7cb518]">{tr.toAccount}</td>
                      <td className="font-bold text-gray-900">{formatPKR(tr.amount)}</td>
                      <td className="text-gray-600 text-xs">{tr.description}</td>
                    </tr>
                  ))}
                  {db.transfers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-400 py-6">
                        No fund transfers logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: REPORTS */}
      {viewType === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="panel flex flex-col justify-between">
              <div>
                <div className="stat-icon olive mb-2">
                  <FileText />
                </div>
                <h3 className="font-bold text-base text-gray-900">Inventory & Stock PDF</h3>
                <p className="text-xs text-gray-500 mt-1 mb-4">
                  Print or save complete finished goods & raw materials warehouse valuation report.
                </p>
              </div>
              <button data-ui="button" className="button primary w-full" onClick={() => generateStockReportPDF(db.products, db.rawMaterials)}>
                <Download /> Download Stock PDF
              </button>
            </div>

            <div className="panel flex flex-col justify-between">
              <div>
                <div className="stat-icon purple mb-2">
                  <Download />
                </div>
                <h3 className="font-bold text-base text-gray-900">Customer Ledgers Export</h3>
                <p className="text-xs text-gray-500 mt-1 mb-4">
                  Export all distributor, wholesaler and retail account statements to Excel/CSV.
                </p>
              </div>
              <button data-ui="button"
                className="button secondary w-full"
                onClick={() => {
                  const headers = ['Account', 'Type', 'City', 'Phone', 'Credit Limit', 'Current Balance']
                  const rows = db.customers.map((c) => [c.name, c.type, c.city, c.phone, c.creditLimit, c.currentBalance])
                  exportToCSV(`Customer_Accounts_${new Date().toISOString().slice(0, 10)}`, headers, rows)
                }}
              >
                <Download /> Export Customers CSV
              </button>
            </div>

            <div className="panel flex flex-col justify-between">
              <div>
                <div className="stat-icon rust mb-2">
                  <Download />
                </div>
                <h3 className="font-bold text-base text-gray-900">Factory Expenses CSV</h3>
                <p className="text-xs text-gray-500 mt-1 mb-4">
                  Export complete list of utility, wage, and maintenance vouchers to Excel.
                </p>
              </div>
              <button data-ui="button"
                className="button secondary w-full"
                onClick={() => {
                  const headers = ['Voucher', 'Date', 'Title', 'Category', 'Amount', 'Account', 'Paid To']
                  const rows = db.expenses.map((e) => [e.voucherNumber, formatDate(e.date), e.title, e.category, e.amount, e.paymentAccount, e.paidTo])
                  exportToCSV(`Factory_Expenses_${new Date().toISOString().slice(0, 10)}`, headers, rows)
                }}
              >
                <Download /> Export Expenses CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FUND TRANSFER MODAL */}
      {showTransferModal && (
        <TransferFundsModal
          db={db}
          onClose={() => setShowTransferModal(false)}
          onSaveDatabase={onSaveDatabase}
        />
      )}
    </div>
  )
}

function TransferFundsModal({
  db,
  onClose,
  onSaveDatabase,
}: {
  db: AppDatabase
  onClose: () => void
  onSaveDatabase: (updated: AppDatabase) => void
}) {
  const [fromAccount, setFromAccount] = useState(db.accounts[0]?.id || '')
  const [toAccount, setToAccount] = useState(db.accounts[1]?.id || '')
  const [amount, setAmount] = useState(50000)
  const [description, setDescription] = useState('Factory cash deposit to bank account')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (fromAccount === toAccount) {
      alert('Source and destination accounts must be different.')
      return
    }

    const fromAccObj = db.accounts.find((a) => a.id === fromAccount)
    const toAccObj = db.accounts.find((a) => a.id === toAccount)
    if (!fromAccObj || !toAccObj) return

    if (fromAccObj.balance < amount) {
      if (!await confirmAction('Warning: Source account balance is less than the transfer amount. Proceed anyway?')) {
        return
      }
    }

    const newTransfer: AccountTransfer = {
      id: `tr-${Date.now()}`,
      date,
      fromAccount: fromAccObj.name,
      toAccount: toAccObj.name,
      amount,
      description,
    }

    const updatedAccounts = db.accounts.map((acc) => {
      if (acc.id === fromAccount) {
        return { ...acc, balance: Math.max(0, acc.balance - amount), updatedAt: date }
      }
      if (acc.id === toAccount) {
        return { ...acc, balance: acc.balance + amount, updatedAt: date }
      }
      return acc
    })

    onSaveDatabase({
      ...db,
      accounts: updatedAccounts,
      transfers: [newTransfer, ...db.transfers],
    })

    onClose()
  }

  return (
    <div className="editor-overlay">
      <form className="editor-modal" onSubmit={handleSubmit}>
        <div className="editor-header">
          <div>
            <p className="eyebrow">Cash & Bank</p>
            <h2>Transfer Funds Between Accounts</h2>
          </div>
          <button data-ui="button" type="button" className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="form-grid">
          <label>
            Transfer From Account *
            <select data-ui="select" value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} required>
              {db.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (Available: {formatPKR(a.balance)})
                </option>
              ))}
            </select>
          </label>

          <label>
            Transfer To Account *
            <select data-ui="select" value={toAccount} onChange={(e) => setToAccount(e.target.value)} required>
              {db.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (Current: {formatPKR(a.balance)})
                </option>
              ))}
            </select>
          </label>

          <label>
            Amount (Rs) *
            <input data-ui="input" type="number" min="1" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
          </label>

          <label>
            Transfer Date
            <input data-ui="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>

          <label className="col-span-2">
            Description / Reason
            <input data-ui="input" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </label>
        </div>

        <div className="editor-actions">
          <button data-ui="button" type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button data-ui="button" type="submit" className="button primary">
            Execute Fund Transfer
          </button>
        </div>
      </form>
    </div>
  )
}
