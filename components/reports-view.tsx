'use client'

import React, { useState, useMemo } from 'react'
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Download,
  Filter,
  Search,
  DollarSign,
  ShoppingBag,
  Truck,
  Receipt,
  Users,
  Building2,
  Boxes,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  FileText,
  Clock,
  PieChart,
  CheckCircle,
  AlertCircle,
  Percent,
  Wallet,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Printer,
  ChevronDown,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  type AppDatabase,
  type InvoiceItem,
  type PurchaseItem,
  type ExpenseItem,
  type SupplierItem,
  type CustomerItem,
  type EmployeeItem,
  type ProductItem,
  type RawMaterialItem,
} from '@/lib/db'
import { exportToCSV, generateBusinessReportPDF } from '@/lib/pdf-export'

export type ReportCategoryKey =
  | 'overview'
  | 'sales'
  | 'purchases'
  | 'expenses'
  | 'suppliers'
  | 'customers'
  | 'salary'
  | 'inventory'

export type DatePreset =
  | 'today'
  | 'this-week'
  | 'this-month'
  | 'this-quarter'
  | 'this-year'
  | 'all-time'
  | 'custom'

interface ReportsViewProps {
  db: AppDatabase
  initialCategory?: ReportCategoryKey
  onSaveDatabase?: (updated: AppDatabase) => void
  isOwner?: boolean
}

export default function ReportsView({
  db,
  initialCategory = 'overview',
  onSaveDatabase,
  isOwner = true,
}: ReportsViewProps) {
  // Navigation & Filter States
  const [activeCategory, setActiveCategory] = useState<ReportCategoryKey>(initialCategory)
  const [datePreset, setDatePreset] = useState<DatePreset>('this-month')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Specific Sub-Filters
  const [salesChannelFilter, setSalesChannelFilter] = useState<string>('All')
  const [salesStatusFilter, setSalesStatusFilter] = useState<string>('All')
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState<string>('All')
  const [purchaseSupplierFilter, setPurchaseSupplierFilter] = useState<string>('All')
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('All')
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState<string>('All')
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('All')
  const [payrollDeptFilter, setPayrollDeptFilter] = useState<string>('All')
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState<'All' | 'Product' | 'Raw Material'>('All')

  // Date Range Calculations
  const dateRange = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    let start = ''
    let end = todayStr
    let label = 'This Month'

    if (datePreset === 'today') {
      start = todayStr
      end = todayStr
      label = `Today (${formatDate(todayStr)})`
    } else if (datePreset === 'this-week') {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - 7)
      start = weekStart.toISOString().slice(0, 10)
      end = todayStr
      label = 'Past 7 Days'
    } else if (datePreset === 'this-month') {
      start = `${todayStr.slice(0, 7)}-01`
      end = todayStr
      const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })
      label = `This Month (${monthName})`
    } else if (datePreset === 'this-quarter') {
      const currentMonth = now.getMonth()
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3 + 1
      const qStartStr = `${now.getFullYear()}-${String(quarterStartMonth).padStart(2, '0')}-01`
      start = qStartStr
      end = todayStr
      label = `Q${Math.floor(currentMonth / 3) + 1} ${now.getFullYear()}`
    } else if (datePreset === 'this-year') {
      start = `${now.getFullYear()}-01-01`
      end = todayStr
      label = `Year ${now.getFullYear()}`
    } else if (datePreset === 'all-time') {
      start = '2000-01-01'
      end = '2099-12-31'
      label = 'All Historical Records'
    } else if (datePreset === 'custom') {
      start = customStartDate || '2000-01-01'
      end = customEndDate || todayStr
      label = `${customStartDate ? formatDate(customStartDate) : 'Start'} to ${
        customEndDate ? formatDate(customEndDate) : 'End'
      }`
    }

    return { start, end, label }
  }, [datePreset, customStartDate, customEndDate])

  // Helper: check if a date is within range
  const isDateInRange = (d?: string) => {
    if (!d) return false
    const cleanD = d.slice(0, 10)
    return cleanD >= dateRange.start && cleanD <= dateRange.end
  }

  // Filtered Datasets for Selected Date Range
  const filteredInvoices = useMemo(() => {
    return db.invoices.filter((inv) => {
      if (!isDateInRange(inv.date)) return false
      if (salesChannelFilter !== 'All' && inv.customerType !== salesChannelFilter) return false
      if (salesStatusFilter !== 'All' && inv.status !== salesStatusFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const match =
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          (inv.phone && inv.phone.includes(q))
        if (!match) return false
      }
      return true
    })
  }, [db.invoices, dateRange, salesChannelFilter, salesStatusFilter, searchQuery])

  const filteredPurchases = useMemo(() => {
    return db.purchases.filter((p) => {
      if (!isDateInRange(p.date)) return false
      if (purchaseTypeFilter !== 'All' && (p.purchaseType || 'Raw Material') !== purchaseTypeFilter) return false
      if (purchaseSupplierFilter !== 'All' && p.supplierName !== purchaseSupplierFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const match =
          (p.poNumber || p.purchaseNumber || '').toLowerCase().includes(q) ||
          (p.supplierName || '').toLowerCase().includes(q) ||
          (p.notes || '').toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [db.purchases, dateRange, purchaseTypeFilter, purchaseSupplierFilter, searchQuery])

  const filteredExpenses = useMemo(() => {
    return db.expenses.filter((e) => {
      if (!isDateInRange(e.date)) return false
      if (expenseCategoryFilter !== 'All' && e.category !== expenseCategoryFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const match =
          (e.voucherNumber || e.expenseNumber || '').toLowerCase().includes(q) ||
          (e.description || e.title || '').toLowerCase().includes(q) ||
          (e.paidTo || '').toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [db.expenses, dateRange, expenseCategoryFilter, searchQuery])

  const filteredSalaryPayments = useMemo(() => {
    return (db.salaryPayments || []).filter((sp) => {
      if (!isDateInRange(sp.paymentDate || sp.month)) return false
      if (payrollDeptFilter !== 'All') {
        const emp = db.employees.find((e) => e.id === sp.employeeId)
        if (emp && emp.department !== payrollDeptFilter) return false
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const match =
          (sp.voucherNumber || '').toLowerCase().includes(q) ||
          (sp.employeeName || '').toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [db.salaryPayments, db.employees, dateRange, payrollDeptFilter, searchQuery])

  // Overview Core Calculations
  const overviewMetrics = useMemo(() => {
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0)
    const cashCollected = filteredInvoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0)
    const newReceivables = filteredInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0)

    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0)
    const purchasesPaid = filteredPurchases.reduce((sum, p) => sum + (p.amountPaid || 0), 0)

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    const totalSalaries = filteredSalaryPayments.reduce((sum, sp) => sum + (sp.amountPaid || 0), 0)

    // COGS estimation based on line items costPrice
    const estimatedCOGS = filteredInvoices
      .flatMap((inv) => inv.items || [])
      .reduce((sum, it) => sum + (it.costPrice || it.unitPrice * 0.7) * (it.quantity || 0), 0)

    const grossProfit = totalRevenue - estimatedCOGS
    const totalOutflows = totalPurchases + totalExpenses + totalSalaries
    const netProfit = totalRevenue - (estimatedCOGS > 0 ? estimatedCOGS : totalPurchases * 0.8) - totalExpenses - totalSalaries

    // Balance Sheet totals (all-time balances)
    const totalReceivablesOutstanding = db.customers.reduce((sum, c) => sum + Math.max(0, c.currentBalance || 0), 0)
    const totalPayablesOutstanding = db.suppliers.reduce((sum, s) => sum + Math.max(0, s.currentBalance || 0), 0)

    // Inventory Valuation
    const finishedGoodsValuation = db.products.reduce(
      (sum, p) => sum + (p.quantity || 0) * (p.costPrice || p.wholesalePrice * 0.75),
      0
    )
    const rawMaterialsValuation = db.rawMaterials.reduce(
      (sum, r) => sum + (r.quantity || 0) * (r.unitCost || 0),
      0
    )
    const totalInventoryValuation = finishedGoodsValuation + rawMaterialsValuation

    return {
      totalRevenue,
      cashCollected,
      newReceivables,
      totalPurchases,
      purchasesPaid,
      totalExpenses,
      totalSalaries,
      totalOutflows,
      estimatedCOGS,
      grossProfit,
      netProfit,
      totalReceivablesOutstanding,
      totalPayablesOutstanding,
      finishedGoodsValuation,
      rawMaterialsValuation,
      totalInventoryValuation,
    }
  }, [filteredInvoices, filteredPurchases, filteredExpenses, filteredSalaryPayments, db.customers, db.suppliers, db.products, db.rawMaterials])

  // Top Customers Ranking
  const topCustomersData = useMemo(() => {
    const map = new Map<string, { name: string; business: string; type: string; totalRevenue: number; count: number; balance: number }>()
    filteredInvoices.forEach((inv) => {
      const key = inv.customerId || inv.customerName
      const existing = map.get(key) || {
        name: inv.customerName,
        business: '',
        type: inv.customerType || 'Customer',
        totalRevenue: 0,
        count: 0,
        balance: inv.balanceDue || 0,
      }
      existing.totalRevenue += inv.grandTotal || 0
      existing.count += 1
      map.set(key, existing)
    })

    return Array.from(map.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 8)
  }, [filteredInvoices])

  // Top Products Ranking
  const topProductsData = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number; unit: string }>()
    filteredInvoices.forEach((inv) => {
      ;(inv.items || []).forEach((it) => {
        const key = it.productId || it.name
        const existing = map.get(key) || {
          name: it.name,
          quantity: 0,
          revenue: 0,
          unit: it.unit || 'Cartons',
        }
        existing.quantity += it.quantity || 0
        existing.revenue += it.total || (it.quantity * it.unitPrice) || 0
        map.set(key, existing)
      })
    })

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
  }, [filteredInvoices])

  // Channel Distribution
  const channelBreakdown = useMemo(() => {
    const map = new Map<string, { channel: string; total: number; count: number }>()
    filteredInvoices.forEach((inv) => {
      const ch = inv.customerType || 'Walk-in'
      const existing = map.get(ch) || { channel: ch, total: 0, count: 0 }
      existing.total += inv.grandTotal || 0
      existing.count += 1
      map.set(ch, existing)
    })
    const list = Array.from(map.values()).sort((a, b) => b.total - a.total)
    const grandTotal = list.reduce((sum, item) => sum + item.total, 0) || 1
    return list.map((item) => ({
      ...item,
      percentage: Math.round((item.total / grandTotal) * 100),
    }))
  }, [filteredInvoices])

  // Expense Categories Distribution
  const expenseCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    filteredExpenses.forEach((e) => {
      const cat = e.category || 'Other'
      map.set(cat, (map.get(cat) || 0) + (e.amount || 0))
    })
    const list = Array.from(map.entries()).map(([cat, amount]) => ({ category: cat, amount }))
    list.sort((a, b) => b.amount - a.amount)
    const totalExp = list.reduce((sum, x) => sum + x.amount, 0) || 1
    return list.map((item) => ({
      ...item,
      percentage: Math.round((item.amount / totalExp) * 100),
    }))
  }, [filteredExpenses])

  // Supplier Payables Ranking
  const supplierPayables = useMemo(() => {
    return (db.suppliers || [])
      .filter((s) => {
        if (supplierCategoryFilter !== 'All' && s.category !== supplierCategoryFilter) return false
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          const match = s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q))
          if (!match) return false
        }
        return true
      })
      .sort((a, b) => (b.currentBalance || 0) - (a.currentBalance || 0))
  }, [db.suppliers, supplierCategoryFilter, searchQuery])

  // Customer Receivables Ranking
  const customerReceivables = useMemo(() => {
    return (db.customers || [])
      .filter((c) => {
        if (customerTypeFilter !== 'All' && c.type !== customerTypeFilter) return false
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          const match =
            c.name.toLowerCase().includes(q) ||
            (c.businessName && c.businessName.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q))
          if (!match) return false
        }
        return true
      })
      .sort((a, b) => (b.currentBalance || 0) - (a.currentBalance || 0))
  }, [db.customers, customerTypeFilter, searchQuery])

  // Inventory Stock Combined
  const inventoryItems = useMemo(() => {
    const prods = db.products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku || 'SKU-PRD',
      category: p.category,
      type: 'Finished Product' as const,
      quantity: p.quantity,
      unit: p.unit,
      costRate: p.costPrice,
      sellingRate: p.wholesalePrice,
      valuation: (p.quantity || 0) * (p.costPrice || 0),
      reorderLevel: p.reorderLevel,
      status: p.status,
    }))

    const raws = db.rawMaterials.map((r) => ({
      id: r.id,
      name: r.name,
      sku: r.sku || 'SKU-RAW',
      category: r.category,
      type: 'Raw Material' as const,
      quantity: r.quantity,
      unit: r.unit,
      costRate: r.unitCost,
      sellingRate: 0,
      valuation: (r.quantity || 0) * (r.unitCost || 0),
      reorderLevel: r.reorderLevel,
      status: r.status,
    }))

    const combined = [...prods, ...raws]

    return combined.filter((it) => {
      if (inventoryTypeFilter === 'Product' && it.type !== 'Finished Product') return false
      if (inventoryTypeFilter === 'Raw Material' && it.type !== 'Raw Material') return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const match =
          it.name.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          it.sku.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [db.products, db.rawMaterials, inventoryTypeFilter, searchQuery])

  // EXPORT HANDLERS FOR EACH CATEGORY
  const handleExportCurrentReportCSV = () => {
    if (activeCategory === 'overview') {
      const headers = ['Category', 'Period Value (PKR)', 'Notes / Status']
      const rows = [
        ['Total Revenue / Sales', overviewMetrics.totalRevenue, `${filteredInvoices.length} invoices generated`],
        ['Cash Collected', overviewMetrics.cashCollected, 'Settled in cash/bank'],
        ['New Credit / Receivables', overviewMetrics.newReceivables, 'Added to customer balance'],
        ['Total Purchases & Procurement', overviewMetrics.totalPurchases, `${filteredPurchases.length} POs`],
        ['Operating & Factory Expenses', overviewMetrics.totalExpenses, `${filteredExpenses.length} vouchers`],
        ['Salaries & Payroll Paid', overviewMetrics.totalSalaries, `${filteredSalaryPayments.length} payouts`],
        ['Estimated Gross Margin', overviewMetrics.grossProfit, 'Sales - COGS'],
        ['Estimated Net Profit/Loss', overviewMetrics.netProfit, 'Gross - Expenses - Salaries'],
        ['Total Outstanding Customer Receivables', overviewMetrics.totalReceivablesOutstanding, 'Total across all customers'],
        ['Total Outstanding Supplier Payables', overviewMetrics.totalPayablesOutstanding, 'Total owed to suppliers'],
        ['Total Current Stock Valuation', overviewMetrics.totalInventoryValuation, 'Finished goods + Raw materials'],
      ]
      exportToCSV(`AL_FAROOQ_Executive_Overview_${datePreset}`, headers, rows)
    } else if (activeCategory === 'sales') {
      const headers = ['Invoice #', 'Date', 'Customer Name', 'Channel', 'Items', 'Status', 'Grand Total', 'Amount Paid', 'Balance Due']
      const rows = filteredInvoices.map((inv) => [
        inv.invoiceNumber,
        formatDate(inv.date),
        inv.customerName,
        inv.customerType,
        (inv.items || []).map((i) => `${i.name} (${i.quantity})`).join(', '),
        inv.status,
        inv.grandTotal,
        inv.amountPaid,
        inv.balanceDue,
      ])
      exportToCSV(`AL_FAROOQ_Sales_Report_${datePreset}`, headers, rows)
    } else if (activeCategory === 'purchases') {
      const headers = ['PO #', 'Date', 'Supplier', 'Type', 'Status', 'Grand Total', 'Amount Paid', 'Balance Due']
      const rows = filteredPurchases.map((p) => [
        p.poNumber || p.purchaseNumber || 'PO-GEN',
        formatDate(p.date),
        p.supplierName,
        p.purchaseType || 'Raw Material',
        p.status,
        p.grandTotal,
        p.amountPaid,
        p.balanceDue,
      ])
      exportToCSV(`AL_FAROOQ_Purchase_Report_${datePreset}`, headers, rows)
    } else if (activeCategory === 'expenses') {
      const headers = ['Voucher #', 'Date', 'Description / Title', 'Category', 'Paid To', 'Method', 'Amount (PKR)']
      const rows = filteredExpenses.map((e) => [
        e.voucherNumber || e.expenseNumber || 'EXP-VCH',
        formatDate(e.date),
        e.description || e.title,
        e.category,
        e.paidTo || 'General',
        e.paymentMethod,
        e.amount,
      ])
      exportToCSV(`AL_FAROOQ_Expenses_Report_${datePreset}`, headers, rows)
    } else if (activeCategory === 'suppliers') {
      const headers = ['Supplier Name', 'Supply Category', 'Phone', 'City', 'Opening Balance', 'Current Balance Due']
      const rows = supplierPayables.map((s) => [
        s.name,
        s.category,
        s.phone,
        s.city || '—',
        s.openingBalance || 0,
        s.currentBalance || 0,
      ])
      exportToCSV(`AL_FAROOQ_Supplier_Payables_${datePreset}`, headers, rows)
    } else if (activeCategory === 'customers') {
      const headers = ['Customer Name', 'Business Name', 'Channel', 'Phone', 'City', 'Opening Balance', 'Current Receivable Balance']
      const rows = customerReceivables.map((c) => [
        c.name,
        c.businessName || '—',
        c.type,
        c.phone,
        c.city || '—',
        c.openingBalance || 0,
        c.currentBalance || 0,
      ])
      exportToCSV(`AL_FAROOQ_Customer_Receivables_${datePreset}`, headers, rows)
    } else if (activeCategory === 'salary') {
      const headers = ['Employee Name', 'Designation', 'Department', 'Monthly Salary', 'Paid This Period', 'Total Advances', 'Status']
      const rows = db.employees.map((emp) => {
        const empPayments = (db.salaryPayments || []).filter((sp) => sp.employeeId === emp.id && isDateInRange(sp.paymentDate || sp.month))
        const totalPaid = empPayments.reduce((sum, sp) => sum + sp.amountPaid, 0)
        return [
          emp.name,
          emp.designation,
          emp.department,
          emp.monthlySalary || 0,
          totalPaid,
          emp.totalAdvanceGiven || 0,
          emp.status,
        ]
      })
      exportToCSV(`AL_FAROOQ_Payroll_Report_${datePreset}`, headers, rows)
    } else if (activeCategory === 'inventory') {
      const headers = ['Item Name', 'SKU', 'Type', 'Category', 'Quantity On Hand', 'Unit', 'Cost Rate', 'Valuation (PKR)', 'Status']
      const rows = inventoryItems.map((it) => [
        it.name,
        it.sku,
        it.type,
        it.category,
        it.quantity,
        it.unit,
        it.costRate,
        it.valuation,
        it.status,
      ])
      exportToCSV(`AL_FAROOQ_Inventory_Valuation_${datePreset}`, headers, rows)
    }
  }

  const handleExportCurrentReportPDF = () => {
    if (activeCategory === 'overview') {
      generateBusinessReportPDF({
        title: 'Executive Business Performance Overview',
        subtitle: 'Comprehensive financial, revenue, expense & balance sheet summary',
        dateRangeText: dateRange.label,
        filename: 'Executive_Overview_Report',
        kpiStats: [
          { label: 'Total Revenue', value: formatPKR(overviewMetrics.totalRevenue), detail: `${filteredInvoices.length} Invoices` },
          { label: 'Total Purchases', value: formatPKR(overviewMetrics.totalPurchases), detail: `${filteredPurchases.length} Purchase Orders` },
          { label: 'Operating Expenses', value: formatPKR(overviewMetrics.totalExpenses), detail: `${filteredExpenses.length} Vouchers` },
          { label: 'Net Profit / Loss', value: formatPKR(overviewMetrics.netProfit), detail: 'Estimated Net' },
          { label: 'Customer Receivables', value: formatPKR(overviewMetrics.totalReceivablesOutstanding), detail: 'Owed to Company' },
          { label: 'Supplier Payables', value: formatPKR(overviewMetrics.totalPayablesOutstanding), detail: 'Owed by Company' },
        ],
        headers: ['Executive Metric', 'Amount (PKR)', 'Analytical Breakdown & Status'],
        rows: [
          ['Gross Sales Revenue', formatPKR(overviewMetrics.totalRevenue), `${filteredInvoices.length} sales invoices issued`],
          ['Cash & Bank Inflows', formatPKR(overviewMetrics.cashCollected), 'Realized cash collections'],
          ['New Customer Dues (Credit)', formatPKR(overviewMetrics.newReceivables), 'Pending collections from current period'],
          ['Total Raw Material & Finished Purchases', formatPKR(overviewMetrics.totalPurchases), 'Procurement stock value received'],
          ['Factory Operating Expenses', formatPKR(overviewMetrics.totalExpenses), 'Utilities, rent, maintenance & transport'],
          ['Employee Payroll & Labor Wages', formatPKR(overviewMetrics.totalSalaries), 'Factory staff & operator disbursements'],
          ['Estimated Cost of Goods Sold (COGS)', formatPKR(overviewMetrics.estimatedCOGS), 'Standard manufactured material cost'],
          ['Estimated Net Operational Profit', formatPKR(overviewMetrics.netProfit), overviewMetrics.netProfit >= 0 ? 'Surplus / Positive' : 'Deficit / Negative'],
          ['Total Outstanding Receivables (Book)', formatPKR(overviewMetrics.totalReceivablesOutstanding), 'Total market credit to collect'],
          ['Total Outstanding Payables (Book)', formatPKR(overviewMetrics.totalPayablesOutstanding), 'Total vendor liabilities'],
          ['Total Warehoused Stock Valuation', formatPKR(overviewMetrics.totalInventoryValuation), 'Finished goods & raw materials on hand'],
        ],
      })
    } else if (activeCategory === 'sales') {
      generateBusinessReportPDF({
        title: 'Sales & Channel Intelligence Report',
        subtitle: 'Invoice audit, channel distribution, top products and sales velocity',
        dateRangeText: dateRange.label,
        filename: 'Sales_Performance_Report',
        kpiStats: [
          { label: 'Total Sales', value: formatPKR(overviewMetrics.totalRevenue) },
          { label: 'Cash Collected', value: formatPKR(overviewMetrics.cashCollected) },
          { label: 'Pending Dues', value: formatPKR(overviewMetrics.newReceivables) },
          { label: 'Total Invoices', value: `${filteredInvoices.length}` },
          { label: 'Avg Order Value', value: formatPKR(filteredInvoices.length ? Math.round(overviewMetrics.totalRevenue / filteredInvoices.length) : 0) },
        ],
        headers: ['Invoice #', 'Date', 'Customer Name', 'Channel', 'Status', 'Grand Total', 'Amount Paid', 'Balance Due'],
        rows: filteredInvoices.map((inv) => [
          inv.invoiceNumber,
          formatDate(inv.date),
          inv.customerName,
          inv.customerType,
          inv.status,
          formatPKR(inv.grandTotal),
          formatPKR(inv.amountPaid),
          formatPKR(inv.balanceDue),
        ]),
      })
    } else if (activeCategory === 'purchases') {
      generateBusinessReportPDF({
        title: 'Procurement & Purchase Register Report',
        subtitle: 'Raw material procurement, equipment, outsourced goods and vendor liabilities',
        dateRangeText: dateRange.label,
        filename: 'Procurement_Report',
        kpiStats: [
          { label: 'Total Purchases', value: formatPKR(overviewMetrics.totalPurchases) },
          { label: 'Amount Paid', value: formatPKR(overviewMetrics.purchasesPaid) },
          { label: 'Balance Due', value: formatPKR(overviewMetrics.totalPurchases - overviewMetrics.purchasesPaid) },
          { label: 'Total Orders', value: `${filteredPurchases.length}` },
        ],
        headers: ['PO #', 'Date', 'Supplier Name', 'Category', 'Status', 'Grand Total', 'Amount Paid', 'Balance Due'],
        rows: filteredPurchases.map((p) => [
          p.poNumber || p.purchaseNumber || 'PO-RECORD',
          formatDate(p.date),
          p.supplierName,
          p.purchaseType || 'Raw Material',
          p.status,
          formatPKR(p.grandTotal),
          formatPKR(p.amountPaid),
          formatPKR(p.balanceDue),
        ]),
      })
    } else if (activeCategory === 'expenses') {
      generateBusinessReportPDF({
        title: 'Factory & Operating Expenses Report',
        subtitle: 'Itemized expenditure log, utility bills, maintenance and operational overhead',
        dateRangeText: dateRange.label,
        filename: 'Expenses_Report',
        kpiStats: [
          { label: 'Total Expenses', value: formatPKR(overviewMetrics.totalExpenses) },
          { label: 'Total Vouchers', value: `${filteredExpenses.length}` },
          { label: 'Top Category', value: expenseCategoryBreakdown[0]?.category || 'General' },
          { label: 'Avg Daily Spend', value: formatPKR(Math.round(overviewMetrics.totalExpenses / 30)) },
        ],
        headers: ['Voucher #', 'Date', 'Description / Purpose', 'Category', 'Paid To', 'Method', 'Amount'],
        rows: filteredExpenses.map((e) => [
          e.voucherNumber || e.expenseNumber || 'VCH',
          formatDate(e.date),
          e.description || e.title,
          e.category,
          e.paidTo || 'Factory General',
          e.paymentMethod,
          formatPKR(e.amount),
        ]),
      })
    } else if (activeCategory === 'suppliers') {
      generateBusinessReportPDF({
        title: 'Supplier Payables & Vendor Ledgers Report',
        subtitle: 'Outstanding liability status, vendor balances and purchase history',
        dateRangeText: dateRange.label,
        filename: 'Supplier_Payables_Report',
        kpiStats: [
          { label: 'Total Suppliers', value: `${supplierPayables.length}` },
          { label: 'Total Payables Due', value: formatPKR(overviewMetrics.totalPayablesOutstanding) },
          { label: 'Top Vendor Due', value: supplierPayables[0]?.name || 'None' },
        ],
        headers: ['Supplier Name', 'Supply Category', 'Phone', 'City', 'Opening Balance', 'Current Balance Due'],
        rows: supplierPayables.map((s) => [
          s.name,
          s.category,
          s.phone,
          s.city || '—',
          formatPKR(s.openingBalance || 0),
          formatPKR(s.currentBalance || 0),
        ]),
      })
    } else if (activeCategory === 'customers') {
      generateBusinessReportPDF({
        title: 'Customer Receivables & Market Credit Report',
        subtitle: 'Distributor, wholesaler & retail party balances and aging summary',
        dateRangeText: dateRange.label,
        filename: 'Customer_Receivables_Report',
        kpiStats: [
          { label: 'Active Customers', value: `${customerReceivables.length}` },
          { label: 'Total Receivables', value: formatPKR(overviewMetrics.totalReceivablesOutstanding) },
          { label: 'Top Debtor', value: customerReceivables[0]?.name || 'None' },
        ],
        headers: ['Customer Name', 'Business / Shop', 'Type', 'Phone', 'City', 'Opening Balance', 'Current Balance Due'],
        rows: customerReceivables.map((c) => [
          c.name,
          c.businessName || '—',
          c.type,
          c.phone,
          c.city || '—',
          formatPKR(c.openingBalance || 0),
          formatPKR(c.currentBalance || 0),
        ]),
      })
    } else if (activeCategory === 'salary') {
      generateBusinessReportPDF({
        title: 'Payroll & Employee Compensation Report',
        subtitle: 'Monthly salary distribution, labor payouts and outstanding staff advances',
        dateRangeText: dateRange.label,
        filename: 'Payroll_Report',
        kpiStats: [
          { label: 'Total Staff', value: `${db.employees.length}` },
          { label: 'Monthly Payroll Base', value: formatPKR(db.employees.reduce((s, e) => s + (e.monthlySalary || 0), 0)) },
          { label: 'Paid in Period', value: formatPKR(overviewMetrics.totalSalaries) },
        ],
        headers: ['Employee Name', 'Designation', 'Department', 'Monthly Salary', 'Paid This Period', 'Total Advances', 'Status'],
        rows: db.employees.map((emp) => {
          const empPayments = (db.salaryPayments || []).filter((sp) => sp.employeeId === emp.id && isDateInRange(sp.paymentDate || sp.month))
          const totalPaid = empPayments.reduce((sum, sp) => sum + sp.amountPaid, 0)
          return [
            emp.name,
            emp.designation,
            emp.department,
            formatPKR(emp.monthlySalary || 0),
            formatPKR(totalPaid),
            formatPKR(emp.totalAdvanceGiven || 0),
            emp.status,
          ]
        }),
      })
    } else if (activeCategory === 'inventory') {
      generateBusinessReportPDF({
        title: 'Inventory Valuation & Warehouse Stock Report',
        subtitle: 'Stock status, valuation breakdown across finished products and raw materials',
        dateRangeText: dateRange.label,
        filename: 'Inventory_Valuation_Report',
        kpiStats: [
          { label: 'Total Valuation', value: formatPKR(overviewMetrics.totalInventoryValuation) },
          { label: 'Finished Goods', value: formatPKR(overviewMetrics.finishedGoodsValuation) },
          { label: 'Raw Materials', value: formatPKR(overviewMetrics.rawMaterialsValuation) },
          { label: 'Total SKUs', value: `${inventoryItems.length}` },
        ],
        headers: ['Item Description', 'SKU', 'Type', 'Category', 'Stock Qty', 'Unit', 'Cost Rate', 'Total Valuation', 'Status'],
        rows: inventoryItems.map((it) => [
          it.name,
          it.sku,
          it.type,
          it.category,
          it.quantity,
          it.unit,
          formatPKR(it.costRate),
          formatPKR(it.valuation),
          it.status,
        ]),
      })
    }
  }

  // Categories definition
  const reportCategories: Array<{
    id: ReportCategoryKey
    label: string
    description: string
    icon: React.ReactNode
    count?: number | string
  }> = [
    {
      id: 'overview',
      label: 'Business Overview',
      description: 'Executive health & financial summary',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'sales',
      label: 'Sales Report',
      description: 'Revenue, channels & invoice ledger',
      icon: <ShoppingBag className="w-4 h-4" />,
      count: db.invoices.length,
    },
    {
      id: 'purchases',
      label: 'Purchase Report',
      description: 'Procurement, POs & supplier bills',
      icon: <Truck className="w-4 h-4" />,
      count: db.purchases.length,
    },
    {
      id: 'expenses',
      label: 'Expenses Report',
      description: 'Factory overhead & utility spending',
      icon: <Receipt className="w-4 h-4" />,
      count: db.expenses.length,
    },
    {
      id: 'suppliers',
      label: 'Supplier / Vendor Report',
      description: 'Outstanding payables & ledgers',
      icon: <Building2 className="w-4 h-4" />,
      count: db.suppliers.length,
    },
    {
      id: 'customers',
      label: 'Customer / Contact Report',
      description: 'Market receivables & top buyers',
      icon: <Users className="w-4 h-4" />,
      count: db.customers.length,
    },
    {
      id: 'salary',
      label: 'Salary / Payroll Report',
      description: 'Staff payroll, wages & advances',
      icon: <Wallet className="w-4 h-4" />,
      count: db.employees.length,
    },
    {
      id: 'inventory',
      label: 'Inventory / Stock Report',
      description: 'Valuation & raw vs finished stock',
      icon: <Boxes className="w-4 h-4" />,
      count: db.products.length + db.rawMaterials.length,
    },
  ]

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & DATE RANGE FILTER BAR */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 rounded-md">
              Central Intelligence Hub
            </span>
            <span className="text-xs text-stone-500 font-medium">· AL FAROOQ FOODS</span>
          </div>
          <h1 className="text-2xl font-black text-stone-900 mt-1 flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-emerald-600" />
            Reports & Business Analytics
          </h1>
          <p className="text-xs text-stone-600 mt-0.5 max-w-2xl">
            Unified single destination for all deep analytics, financial statements, sales channels, vendor payables, market credit, payroll, and stock valuation audits.
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCurrentReportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 transition-all cursor-pointer shadow-2xs"
            title="Download CSV spreadsheet for current report"
            id="btn-export-report-csv"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportCurrentReportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition-all cursor-pointer shadow-xs"
            title="Download formatted executive PDF report"
            id="btn-export-report-pdf"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* 2. DATE FILTER & CATEGORY NAVIGATION BAR */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        {/* Date Presets Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Report Period:</span>
            <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {dateRange.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'today', label: 'Today' },
              { id: 'this-week', label: 'This Week' },
              { id: 'this-month', label: 'This Month' },
              { id: 'this-quarter', label: 'This Quarter' },
              { id: 'this-year', label: 'This Year' },
              { id: 'all-time', label: 'All Time' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => {
              const isSelected = datePreset === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setDatePreset(p.id as DatePreset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Custom Date Inputs if Custom is selected */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 text-xs">
            <span className="font-bold text-stone-700">Start Date:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs font-medium"
            />
            <span className="font-bold text-stone-700">End Date:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs font-medium"
            />
          </div>
        )}

        {/* Categories Selector Tabs (Pill & Clean Segmented Layout) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
          {reportCategories.map((cat) => {
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  setSearchQuery('')
                }}
                id={`report-nav-${cat.id}`}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 border-emerald-500 shadow-2xs ring-2 ring-emerald-500/20'
                    : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100/80 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-emerald-600 text-white' : 'bg-stone-200/80 text-stone-700'
                    }`}
                  >
                    {cat.icon}
                  </div>
                  {cat.count !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isActive ? 'bg-emerald-200/60 text-emerald-900' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {cat.count}
                    </span>
                  )}
                </div>
                <div className="mt-2 w-full">
                  <div
                    className={`text-xs font-bold truncate ${
                      isActive ? 'text-emerald-950 font-black' : 'text-stone-800'
                    }`}
                  >
                    {cat.label}
                  </div>
                  <div className="text-[10px] text-stone-500 truncate mt-0.5">{cat.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. REPORT CONTENT SECTIONS */}

      {/* ========================================================= */}
      {/* SECTION 1: TOP-LEVEL OVERVIEW (DEFAULT EXECUTIVE VIEW)    */}
      {/* ========================================================= */}
      {activeCategory === 'overview' && (
        <div className="space-y-6">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Revenue */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                <span>Total Revenue (Sales)</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-stone-900">{formatPKR(overviewMetrics.totalRevenue)}</div>
                <div className="flex items-center justify-between mt-1 text-[11px] font-semibold text-emerald-700">
                  <span>Collected: {formatPKR(overviewMetrics.cashCollected)}</span>
                  <span>{filteredInvoices.length} Inv</span>
                </div>
              </div>
            </div>

            {/* Total Purchases */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                <span>Total Purchases</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-stone-900">{formatPKR(overviewMetrics.totalPurchases)}</div>
                <div className="flex items-center justify-between mt-1 text-[11px] font-semibold text-blue-700">
                  <span>Paid: {formatPKR(overviewMetrics.purchasesPaid)}</span>
                  <span>{filteredPurchases.length} POs</span>
                </div>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                <span>Factory & Operating Expenses</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-amber-800">{formatPKR(overviewMetrics.totalExpenses)}</div>
                <div className="flex items-center justify-between mt-1 text-[11px] font-semibold text-amber-700">
                  <span>+ Payroll: {formatPKR(overviewMetrics.totalSalaries)}</span>
                  <span>{filteredExpenses.length} Vch</span>
                </div>
              </div>
            </div>

            {/* Net Estimated Profit / Loss */}
            <div
              className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
                overviewMetrics.netProfit >= 0
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-rose-50/70 border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-stone-600">
                <span>Net Estimated Profit / Loss</span>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    overviewMetrics.netProfit >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  <DollarSign className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
              <div className="mt-2">
                <div
                  className={`text-2xl font-black ${
                    overviewMetrics.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
                  }`}
                >
                  {formatPKR(overviewMetrics.netProfit)}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-stone-700">
                  {overviewMetrics.netProfit >= 0 ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Profitable Margin
                    </span>
                  ) : (
                    <span className="text-rose-700 flex items-center gap-1">
                      <ArrowDownRight className="w-3.5 h-3.5" /> Deficit / Net Loss
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Outstanding Receivables vs Payables */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                <span>Book Balances (Ledgers)</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500 font-medium">Customer Receivables:</span>
                  <span className="font-extrabold text-emerald-800">
                    {formatPKR(overviewMetrics.totalReceivablesOutstanding)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500 font-medium">Supplier Payables:</span>
                  <span className="font-extrabold text-amber-800">
                    {formatPKR(overviewMetrics.totalPayablesOutstanding)}
                  </span>
                </div>
                <div className="text-[10px] text-stone-400 text-right pt-0.5">Real-time ledger audit</div>
              </div>
            </div>
          </div>

          {/* Combined Visual Trends & Cash Flow Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Revenue vs Expense Outflow Trend (Bar & Progress Comparison) */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-stone-900">Revenue Inflow vs Expense Outflow</h2>
                  <p className="text-xs text-stone-500">Financial distribution for selected period ({dateRange.label})</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Sales Revenue
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> Total Outflow
                  </span>
                </div>
              </div>

              {/* Progress Flow Bars */}
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-stone-700">Total Sales Revenue Generated</span>
                    <span className="text-emerald-700">{formatPKR(overviewMetrics.totalRevenue)}</span>
                  </div>
                  <div className="w-full h-3.5 bg-stone-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          overviewMetrics.totalRevenue + overviewMetrics.totalOutflows > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (overviewMetrics.totalRevenue /
                                    Math.max(overviewMetrics.totalRevenue, overviewMetrics.totalOutflows)) *
                                    100
                                )
                              )
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                    <span>Realized Cash: {formatPKR(overviewMetrics.cashCollected)}</span>
                    <span>New Market Credit: {formatPKR(overviewMetrics.newReceivables)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-stone-700">Total Business Outflow (Purchases + Expenses + Payroll)</span>
                    <span className="text-amber-800">{formatPKR(overviewMetrics.totalOutflows)}</span>
                  </div>
                  <div className="w-full h-3.5 bg-stone-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-blue-500 h-full transition-all duration-500"
                      style={{
                        width: `${
                          overviewMetrics.totalOutflows > 0
                            ? Math.round((overviewMetrics.totalPurchases / overviewMetrics.totalOutflows) * 100)
                            : 0
                        }%`,
                      }}
                      title={`Purchases: ${formatPKR(overviewMetrics.totalPurchases)}`}
                    ></div>
                    <div
                      className="bg-amber-500 h-full transition-all duration-500"
                      style={{
                        width: `${
                          overviewMetrics.totalOutflows > 0
                            ? Math.round((overviewMetrics.totalExpenses / overviewMetrics.totalOutflows) * 100)
                            : 0
                        }%`,
                      }}
                      title={`Expenses: ${formatPKR(overviewMetrics.totalExpenses)}`}
                    ></div>
                    <div
                      className="bg-purple-500 h-full transition-all duration-500"
                      style={{
                        width: `${
                          overviewMetrics.totalOutflows > 0
                            ? Math.round((overviewMetrics.totalSalaries / overviewMetrics.totalOutflows) * 100)
                            : 0
                        }%`,
                      }}
                      title={`Salaries: ${formatPKR(overviewMetrics.totalSalaries)}`}
                    ></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-stone-600 mt-1.5">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> Purchases:{' '}
                      {formatPKR(overviewMetrics.totalPurchases)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> Factory Expenses:{' '}
                      {formatPKR(overviewMetrics.totalExpenses)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span> Salaries:{' '}
                      {formatPKR(overviewMetrics.totalSalaries)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Monthly Breakdown Statement Mini Table */}
              <div className="pt-3 border-t border-stone-100">
                <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wide mb-2">
                  Executive P&L Summary Table
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-50 text-stone-600 font-bold border-y border-stone-200">
                        <th className="py-2 px-3">Revenue / Expense Head</th>
                        <th className="py-2 px-3 text-right">Amount (PKR)</th>
                        <th className="py-2 px-3 text-right">% of Revenue</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      <tr>
                        <td className="py-2 px-3 font-bold text-stone-900">Total Sales Revenue</td>
                        <td className="py-2 px-3 text-right font-black text-emerald-700">
                          {formatPKR(overviewMetrics.totalRevenue)}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold">100%</td>
                        <td className="py-2 px-3 text-emerald-700 font-semibold">Inflow Generated</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-stone-700">(-) Material Purchases / Procurement</td>
                        <td className="py-2 px-3 text-right font-semibold text-stone-800">
                          {formatPKR(overviewMetrics.totalPurchases)}
                        </td>
                        <td className="py-2 px-3 text-right text-stone-500">
                          {overviewMetrics.totalRevenue > 0
                            ? `${Math.round((overviewMetrics.totalPurchases / overviewMetrics.totalRevenue) * 100)}%`
                            : '—'}
                        </td>
                        <td className="py-2 px-3 text-stone-500">Stock Inward</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-stone-700">(-) Factory Overhead & Operating Expenses</td>
                        <td className="py-2 px-3 text-right font-semibold text-stone-800">
                          {formatPKR(overviewMetrics.totalExpenses)}
                        </td>
                        <td className="py-2 px-3 text-right text-stone-500">
                          {overviewMetrics.totalRevenue > 0
                            ? `${Math.round((overviewMetrics.totalExpenses / overviewMetrics.totalRevenue) * 100)}%`
                            : '—'}
                        </td>
                        <td className="py-2 px-3 text-stone-500">Utilities / Rent / Logistics</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-stone-700">(-) Factory Staff Payroll & Salaries</td>
                        <td className="py-2 px-3 text-right font-semibold text-stone-800">
                          {formatPKR(overviewMetrics.totalSalaries)}
                        </td>
                        <td className="py-2 px-3 text-right text-stone-500">
                          {overviewMetrics.totalRevenue > 0
                            ? `${Math.round((overviewMetrics.totalSalaries / overviewMetrics.totalRevenue) * 100)}%`
                            : '—'}
                        </td>
                        <td className="py-2 px-3 text-stone-500">Labor & Staff</td>
                      </tr>
                      <tr className="bg-stone-50/80 font-black">
                        <td className="py-2.5 px-3 text-stone-900">Estimated Net Operational Balance</td>
                        <td
                          className={`py-2.5 px-3 text-right text-sm ${
                            overviewMetrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {formatPKR(overviewMetrics.netProfit)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {overviewMetrics.totalRevenue > 0
                            ? `${Math.round((overviewMetrics.netProfit / overviewMetrics.totalRevenue) * 100)}%`
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wide font-extrabold ${
                              overviewMetrics.netProfit >= 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {overviewMetrics.netProfit >= 0 ? 'Positive Margin' : 'Deficit'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Quick Breakdown Side Panel (Channel Distribution & Stock Valuation) */}
            <div className="space-y-6">
              {/* Sales Channels Breakdown */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-emerald-600" />
                    Sales by Channel
                  </h3>
                  <span className="text-[11px] text-stone-500">{channelBreakdown.length} active channels</span>
                </div>
                <div className="space-y-2.5">
                  {channelBreakdown.length === 0 ? (
                    <p className="text-xs text-stone-400 py-3 text-center">No sales recorded in this date range.</p>
                  ) : (
                    channelBreakdown.map((ch, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-700">{ch.channel}</span>
                          <span className="font-bold text-stone-900">
                            {formatPKR(ch.total)} ({ch.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full"
                            style={{ width: `${ch.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Inventory Valuation Card */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-purple-600" />
                    Total Inventory Valuation
                  </h3>
                  <span className="text-xs font-black text-stone-900">
                    {formatPKR(overviewMetrics.totalInventoryValuation)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-500 text-[10px] block uppercase font-bold">Finished Goods</span>
                    <span className="text-sm font-black text-stone-900 mt-0.5 block">
                      {formatPKR(overviewMetrics.finishedGoodsValuation)}
                    </span>
                    <span className="text-[10px] text-purple-700 font-semibold mt-0.5 block">
                      {db.products.length} catalog items
                    </span>
                  </div>
                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-500 text-[10px] block uppercase font-bold">Raw Materials</span>
                    <span className="text-sm font-black text-stone-900 mt-0.5 block">
                      {formatPKR(overviewMetrics.rawMaterialsValuation)}
                    </span>
                    <span className="text-[10px] text-blue-700 font-semibold mt-0.5 block">
                      {db.rawMaterials.length} materials
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: SALES REPORT                                   */}
      {/* ========================================================= */}
      {activeCategory === 'sales' && (
        <div className="space-y-6">
          {/* Sales Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Total Sales Revenue</span>
              <div className="text-2xl font-black text-stone-900 mt-1">{formatPKR(overviewMetrics.totalRevenue)}</div>
              <span className="text-[11px] text-emerald-700 font-semibold">{filteredInvoices.length} invoices issued</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Cash Realized / Collected</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{formatPKR(overviewMetrics.cashCollected)}</div>
              <span className="text-[11px] text-stone-500">
                {overviewMetrics.totalRevenue > 0
                  ? `${Math.round((overviewMetrics.cashCollected / overviewMetrics.totalRevenue) * 100)}% recovery rate`
                  : '0%'}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Pending Customer Dues</span>
              <div className="text-2xl font-black text-amber-700 mt-1">{formatPKR(overviewMetrics.newReceivables)}</div>
              <span className="text-[11px] text-amber-800 font-semibold">Current period credit added</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Average Invoice Size</span>
              <div className="text-2xl font-black text-stone-900 mt-1">
                {formatPKR(filteredInvoices.length ? Math.round(overviewMetrics.totalRevenue / filteredInvoices.length) : 0)}
              </div>
              <span className="text-[11px] text-stone-500">Per order sales average</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Top Selling Channel</span>
              <div className="text-lg font-black text-stone-900 mt-1 truncate">
                {channelBreakdown[0]?.channel || 'Direct / Walk-in'}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">
                {channelBreakdown[0] ? `${formatPKR(channelBreakdown[0].total)} (${channelBreakdown[0].percentage}%)` : '—'}
              </span>
            </div>
          </div>

          {/* Top Products & Top Customers Summary Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Best Selling Products */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                Top Performing Products by Sales Volume
              </h3>
              <div className="space-y-2">
                {topProductsData.length === 0 ? (
                  <p className="text-xs text-stone-400 py-4 text-center">No products sold in selected period.</p>
                ) : (
                  topProductsData.slice(0, 5).map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs">
                      <div>
                        <div className="font-bold text-stone-900">{p.name}</div>
                        <div className="text-[11px] text-stone-500">{p.quantity} {p.unit} sold</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-emerald-700">{formatPKR(p.revenue)}</div>
                        <div className="text-[10px] text-stone-400">Total Contribution</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top 5 Customers by Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Top Customers & Distributors by Revenue
              </h3>
              <div className="space-y-2">
                {topCustomersData.length === 0 ? (
                  <p className="text-xs text-stone-400 py-4 text-center">No customer transactions in selected period.</p>
                ) : (
                  topCustomersData.slice(0, 5).map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs">
                      <div>
                        <div className="font-bold text-stone-900">{c.name}</div>
                        <div className="text-[11px] text-stone-500">{c.type} · {c.count} orders</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-stone-900">{formatPKR(c.totalRevenue)}</div>
                        <div className="text-[10px] text-stone-400">Gross Purchased</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Filter Bar & Detailed Invoices Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-50/50">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search invoices, customer name, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={salesChannelFilter}
                  onChange={(e) => setSalesChannelFilter(e.target.value)}
                  className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <option value="All">All Channels</option>
                  <option value="POS / Counter">POS / Counter</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Wholesaler">Wholesaler</option>
                  <option value="Retailer">Retailer</option>
                  <option value="Direct / Walk-in">Direct / Walk-in</option>
                </select>

                <select
                  value={salesStatusFilter}
                  onChange={(e) => setSalesStatusFilter(e.target.value)}
                  className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <option value="All">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100/70 text-stone-700 font-bold border-b border-stone-200">
                    <th className="py-2.5 px-3.5">Invoice #</th>
                    <th className="py-2.5 px-3.5">Date</th>
                    <th className="py-2.5 px-3.5">Customer / Party</th>
                    <th className="py-2.5 px-3.5">Channel</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-right">Grand Total</th>
                    <th className="py-2.5 px-3.5 text-right">Paid</th>
                    <th className="py-2.5 px-3.5 text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-stone-400">
                        No sales invoices found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-stone-50/80">
                        <td className="py-2.5 px-3.5 font-bold text-stone-900">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-3.5 text-stone-600">{formatDate(inv.date)}</td>
                        <td className="py-2.5 px-3.5 font-semibold text-stone-800">{inv.customerName}</td>
                        <td className="py-2.5 px-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                            {inv.customerType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              inv.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'Partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-stone-900">
                          {formatPKR(inv.grandTotal)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-semibold text-emerald-700">
                          {formatPKR(inv.amountPaid)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-amber-800">
                          {formatPKR(inv.balanceDue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredInvoices.length > 0 && (
                  <tfoot>
                    <tr className="bg-stone-100 font-black border-t-2 border-stone-200">
                      <td colSpan={5} className="py-3 px-3.5 text-stone-900">
                        Total ({filteredInvoices.length} Invoices)
                      </td>
                      <td className="py-3 px-3.5 text-right text-stone-900">
                        {formatPKR(overviewMetrics.totalRevenue)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-emerald-800">
                        {formatPKR(overviewMetrics.cashCollected)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-amber-800">
                        {formatPKR(overviewMetrics.newReceivables)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 3: PURCHASE REPORT                                */}
      {/* ========================================================= */}
      {activeCategory === 'purchases' && (
        <div className="space-y-6">
          {/* Purchase Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Total Procurement Value</span>
              <div className="text-2xl font-black text-stone-900 mt-1">{formatPKR(overviewMetrics.totalPurchases)}</div>
              <span className="text-[11px] text-blue-700 font-semibold">{filteredPurchases.length} Purchase Orders</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Paid to Vendors</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{formatPKR(overviewMetrics.purchasesPaid)}</div>
              <span className="text-[11px] text-stone-500">Settled inward payments</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Pending Payables Due</span>
              <div className="text-2xl font-black text-amber-800 mt-1">
                {formatPKR(overviewMetrics.totalPurchases - overviewMetrics.purchasesPaid)}
              </div>
              <span className="text-[11px] text-amber-700 font-semibold">Vendor balance pending</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Raw Material Share</span>
              <div className="text-2xl font-black text-purple-800 mt-1">
                {formatPKR(
                  filteredPurchases
                    .filter((p) => (p.purchaseType || 'Raw Material') === 'Raw Material')
                    .reduce((sum, p) => sum + p.grandTotal, 0)
                )}
              </div>
              <span className="text-[11px] text-purple-700 font-semibold">Ingredients, packaging & chemicals</span>
            </div>
          </div>

          {/* Detailed Purchases Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-50/50">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search PO #, supplier name, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={purchaseTypeFilter}
                  onChange={(e) => setPurchaseTypeFilter(e.target.value)}
                  className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <option value="All">All Types</option>
                  <option value="Raw Material">Raw Material</option>
                  <option value="Finished Product">Finished Product</option>
                  <option value="Equipment">Equipment / Spares</option>
                </select>

                <select
                  value={purchaseSupplierFilter}
                  onChange={(e) => setPurchaseSupplierFilter(e.target.value)}
                  className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-semibold max-w-xs truncate"
                >
                  <option value="All">All Suppliers</option>
                  {db.suppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100/70 text-stone-700 font-bold border-b border-stone-200">
                    <th className="py-2.5 px-3.5">PO / Invoice #</th>
                    <th className="py-2.5 px-3.5">Date</th>
                    <th className="py-2.5 px-3.5">Supplier Name</th>
                    <th className="py-2.5 px-3.5">Type</th>
                    <th className="py-2.5 px-3.5">Payment Status</th>
                    <th className="py-2.5 px-3.5 text-right">Grand Total</th>
                    <th className="py-2.5 px-3.5 text-right">Paid</th>
                    <th className="py-2.5 px-3.5 text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-stone-400">
                        No purchase orders recorded in this date range.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p) => (
                      <tr key={p.id} className="hover:bg-stone-50/80">
                        <td className="py-2.5 px-3.5 font-bold text-stone-900">
                          {p.poNumber || p.purchaseNumber || 'PO-RECORD'}
                        </td>
                        <td className="py-2.5 px-3.5 text-stone-600">{formatDate(p.date)}</td>
                        <td className="py-2.5 px-3.5 font-semibold text-stone-800">{p.supplierName}</td>
                        <td className="py-2.5 px-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800">
                            {p.purchaseType || 'Raw Material'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              p.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'Partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-stone-900">
                          {formatPKR(p.grandTotal)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-semibold text-emerald-700">
                          {formatPKR(p.amountPaid)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-amber-800">
                          {formatPKR(p.balanceDue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 4: EXPENSES REPORT                                */}
      {/* ========================================================= */}
      {activeCategory === 'expenses' && (
        <div className="space-y-6">
          {/* Expense Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Total Factory Expenses</span>
              <div className="text-2xl font-black text-amber-800 mt-1">{formatPKR(overviewMetrics.totalExpenses)}</div>
              <span className="text-[11px] text-stone-500">{filteredExpenses.length} vouchers logged</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Top Expense Category</span>
              <div className="text-xl font-black text-stone-900 mt-1 truncate">
                {expenseCategoryBreakdown[0]?.category || 'General'}
              </div>
              <span className="text-[11px] text-amber-700 font-semibold">
                {expenseCategoryBreakdown[0] ? `${formatPKR(expenseCategoryBreakdown[0].amount)} (${expenseCategoryBreakdown[0].percentage}%)` : '—'}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Average Voucher Size</span>
              <div className="text-2xl font-black text-stone-900 mt-1">
                {formatPKR(filteredExpenses.length ? Math.round(overviewMetrics.totalExpenses / filteredExpenses.length) : 0)}
              </div>
              <span className="text-[11px] text-stone-500">Per voucher average</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Cash vs Bank Payments</span>
              <div className="text-sm font-bold text-stone-800 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Cash-in-Hand:</span>
                  <span className="text-emerald-700">
                    {formatPKR(
                      filteredExpenses
                        .filter((e) => e.paymentMethod === 'Cash')
                        .reduce((s, e) => s + e.amount, 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Bank Transfers:</span>
                  <span className="text-blue-700">
                    {formatPKR(
                      filteredExpenses
                        .filter((e) => e.paymentMethod !== 'Cash')
                        .reduce((s, e) => s + e.amount, 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Category Breakdown Chart & Detailed Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Breakdown Progress Bars */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-amber-600" />
                Spending by Category
              </h3>
              <div className="space-y-2.5">
                {expenseCategoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-700">{cat.category}</span>
                      <span className="font-bold text-stone-900">
                        {formatPKR(cat.amount)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="bg-amber-600 h-full rounded-full" style={{ width: `${cat.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Expenses Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-stone-200 flex items-center justify-between gap-3 bg-stone-50/50">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search voucher, description, payee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl"
                  />
                </div>
                <select
                  value={expenseCategoryFilter}
                  onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                  className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <option value="All">All Categories</option>
                  {Array.from(new Set(db.expenses.map((e) => e.category))).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-100/70 text-stone-700 font-bold border-b border-stone-200">
                      <th className="py-2.5 px-3.5">Voucher #</th>
                      <th className="py-2.5 px-3.5">Date</th>
                      <th className="py-2.5 px-3.5">Description</th>
                      <th className="py-2.5 px-3.5">Category</th>
                      <th className="py-2.5 px-3.5">Paid To</th>
                      <th className="py-2.5 px-3.5 text-right">Amount (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-stone-50/80">
                        <td className="py-2 px-3.5 font-bold text-stone-900">
                          {e.voucherNumber || e.expenseNumber || 'VCH'}
                        </td>
                        <td className="py-2 px-3.5 text-stone-600">{formatDate(e.date)}</td>
                        <td className="py-2 px-3.5 text-stone-800">{e.description || e.title}</td>
                        <td className="py-2 px-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800">
                            {e.category}
                          </span>
                        </td>
                        <td className="py-2 px-3.5 text-stone-600">{e.paidTo || '—'}</td>
                        <td className="py-2 px-3.5 text-right font-black text-stone-900">{formatPKR(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 5: SUPPLIER / VENDOR REPORT                       */}
      {/* ========================================================= */}
      {activeCategory === 'suppliers' && (
        <div className="space-y-6">
          {/* Supplier Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Total Registered Suppliers</span>
              <div className="text-2xl font-black text-stone-900 mt-1">{db.suppliers.length}</div>
              <span className="text-[11px] text-stone-500">Raw materials, packaging, machinery</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Total Outstanding Payables</span>
              <div className="text-2xl font-black text-amber-800 mt-1">
                {formatPKR(overviewMetrics.totalPayablesOutstanding)}
              </div>
              <span className="text-[11px] text-amber-700 font-semibold">Total debt to vendors</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Top Supplier Balance Due</span>
              <div className="text-xl font-black text-stone-900 mt-1 truncate">
                {supplierPayables[0]?.name || 'None'}
              </div>
              <span className="text-[11px] text-amber-800 font-bold">
                {formatPKR(supplierPayables[0]?.currentBalance || 0)}
              </span>
            </div>
          </div>

          {/* Supplier Payables Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-50/50">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search supplier, phone, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <select
                value={supplierCategoryFilter}
                onChange={(e) => setSupplierCategoryFilter(e.target.value)}
                className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-semibold"
              >
                <option value="All">All Categories</option>
                {Array.from(new Set(db.suppliers.map((s) => s.category))).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100/70 text-stone-700 font-bold border-b border-stone-200">
                    <th className="py-2.5 px-3.5">Supplier Name</th>
                    <th className="py-2.5 px-3.5">Category</th>
                    <th className="py-2.5 px-3.5">Phone / Contact</th>
                    <th className="py-2.5 px-3.5">City</th>
                    <th className="py-2.5 px-3.5 text-right">Opening Balance</th>
                    <th className="py-2.5 px-3.5 text-right">Current Payable Balance</th>
                    <th className="py-2.5 px-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {supplierPayables.map((s) => (
                    <tr key={s.id} className="hover:bg-stone-50/80">
                      <td className="py-2.5 px-3.5 font-bold text-stone-900">{s.name}</td>
                      <td className="py-2.5 px-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700">
                          {s.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-stone-600 font-mono">{s.phone}</td>
                      <td className="py-2.5 px-3.5 text-stone-600">{s.city || '—'}</td>
                      <td className="py-2.5 px-3.5 text-right font-medium text-stone-600">
                        {formatPKR(s.openingBalance || 0)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-black text-amber-800">
                        {formatPKR(s.currentBalance || 0)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            (s.currentBalance || 0) > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {(s.currentBalance || 0) > 0 ? 'Payable Due' : 'Settled / Clear'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 6: CUSTOMER / CONTACT REPORT                      */}
      {/* ========================================================= */}
      {activeCategory === 'customers' && (
        <div className="space-y-6">
          {/* Customer Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Total Active Customers</span>
              <div className="text-2xl font-black text-stone-900 mt-1">{db.customers.length}</div>
              <span className="text-[11px] text-stone-500">Distributors, wholesalers & retailers</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Total Market Receivables</span>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                {formatPKR(overviewMetrics.totalReceivablesOutstanding)}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">Total credit to collect</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Highest Outstanding Debtor</span>
              <div className="text-xl font-black text-stone-900 mt-1 truncate">
                {customerReceivables[0]?.name || 'None'}
              </div>
              <span className="text-[11px] text-amber-800 font-bold">
                {formatPKR(customerReceivables[0]?.currentBalance || 0)}
              </span>
            </div>
          </div>

          {/* Customer Receivables Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-50/50">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search customer, business name, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <select
                value={customerTypeFilter}
                onChange={(e) => setCustomerTypeFilter(e.target.value)}
                className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-semibold"
              >
                <option value="All">All Customer Types</option>
                <option value="Distributor">Distributor</option>
                <option value="Wholesaler">Wholesaler</option>
                <option value="Retailer">Retailer</option>
                <option value="Walk-in">Walk-in</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100/70 text-stone-700 font-bold border-b border-stone-200">
                    <th className="py-2.5 px-3.5">Customer Name</th>
                    <th className="py-2.5 px-3.5">Business / Shop</th>
                    <th className="py-2.5 px-3.5">Type</th>
                    <th className="py-2.5 px-3.5">Phone</th>
                    <th className="py-2.5 px-3.5">City</th>
                    <th className="py-2.5 px-3.5 text-right">Opening Balance</th>
                    <th className="py-2.5 px-3.5 text-right">Current Outstanding Due</th>
                    <th className="py-2.5 px-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {customerReceivables.map((c) => (
                    <tr key={c.id} className="hover:bg-stone-50/80">
                      <td className="py-2.5 px-3.5 font-bold text-stone-900">{c.name}</td>
                      <td className="py-2.5 px-3.5 text-stone-700 font-medium">{c.businessName || '—'}</td>
                      <td className="py-2.5 px-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700">
                          {c.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-stone-600 font-mono">{c.phone}</td>
                      <td className="py-2.5 px-3.5 text-stone-600">{c.city || '—'}</td>
                      <td className="py-2.5 px-3.5 text-right font-medium text-stone-600">
                        {formatPKR(c.openingBalance || 0)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-black text-emerald-800">
                        {formatPKR(c.currentBalance || 0)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            (c.currentBalance || 0) > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {(c.currentBalance || 0) > 0 ? 'Receivable' : 'Settled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 7: SALARY / PAYROLL REPORT                        */}
      {/* ========================================================= */}
      {activeCategory === 'salary' && (
        <div className="space-y-6">
          {/* Salary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Total Factory Staff</span>
              <div className="text-2xl font-black text-stone-900 mt-1">{db.employees.length}</div>
              <span className="text-[11px] text-stone-500">Active operators & management</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Monthly Payroll Obligation</span>
              <div className="text-2xl font-black text-stone-900 mt-1">
                {formatPKR(db.employees.reduce((s, e) => s + (e.monthlySalary || 0), 0))}
              </div>
              <span className="text-[11px] text-stone-500">Base salary run</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Paid in Selected Period</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {formatPKR(overviewMetrics.totalSalaries)}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">
                {filteredSalaryPayments.length} disbursements
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Total Employee Advances</span>
              <div className="text-2xl font-black text-amber-800 mt-1">
                {formatPKR(db.employees.reduce((s, e) => s + (e.totalAdvanceGiven || 0), 0))}
              </div>
              <span className="text-[11px] text-amber-700 font-semibold">Active staff advance balance</span>
            </div>
          </div>

          {/* Detailed Employee Payroll Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-50/50">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search employee name, designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <select
                value={payrollDeptFilter}
                onChange={(e) => setPayrollDeptFilter(e.target.value)}
                className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-semibold"
              >
                <option value="All">All Departments</option>
                {Array.from(new Set(db.employees.map((e) => e.department))).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100/70 text-stone-700 font-bold border-b border-stone-200">
                    <th className="py-2.5 px-3.5">Employee Name</th>
                    <th className="py-2.5 px-3.5">Designation</th>
                    <th className="py-2.5 px-3.5">Department</th>
                    <th className="py-2.5 px-3.5 text-right">Base Monthly Salary</th>
                    <th className="py-2.5 px-3.5 text-right">Disbursed This Period</th>
                    <th className="py-2.5 px-3.5 text-right">Advances Given</th>
                    <th className="py-2.5 px-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {db.employees.map((emp) => {
                    const empPayments = (db.salaryPayments || []).filter(
                      (sp) => sp.employeeId === emp.id && isDateInRange(sp.paymentDate || sp.month)
                    )
                    const totalPaid = empPayments.reduce((sum, sp) => sum + sp.amountPaid, 0)

                    return (
                      <tr key={emp.id} className="hover:bg-stone-50/80">
                        <td className="py-2.5 px-3.5 font-bold text-stone-900">{emp.name}</td>
                        <td className="py-2.5 px-3.5 text-stone-700">{emp.designation}</td>
                        <td className="py-2.5 px-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                            {emp.department}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-black text-stone-900">
                          {formatPKR(emp.monthlySalary || 0)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-emerald-700">
                          {formatPKR(totalPaid)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-semibold text-amber-800">
                          {formatPKR(emp.totalAdvanceGiven || 0)}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              emp.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {emp.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 8: INVENTORY / STOCK REPORT                       */}
      {/* ========================================================= */}
      {activeCategory === 'inventory' && (
        <div className="space-y-6">
          {/* Inventory Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Total Stock Valuation</span>
              <div className="text-2xl font-black text-stone-900 mt-1">
                {formatPKR(overviewMetrics.totalInventoryValuation)}
              </div>
              <span className="text-[11px] text-purple-700 font-semibold">{inventoryItems.length} active SKUs</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Finished Goods Value</span>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                {formatPKR(overviewMetrics.finishedGoodsValuation)}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">{db.products.length} catalog products</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Raw Materials Value</span>
              <div className="text-2xl font-black text-blue-800 mt-1">
                {formatPKR(overviewMetrics.rawMaterialsValuation)}
              </div>
              <span className="text-[11px] text-blue-700 font-semibold">{db.rawMaterials.length} raw components</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Low Stock Reorder Alerts</span>
              <div className="text-2xl font-black text-rose-700 mt-1">
                {inventoryItems.filter((i) => i.quantity <= i.reorderLevel).length}
              </div>
              <span className="text-[11px] text-rose-600 font-semibold">Items below safety threshold</span>
            </div>
          </div>

          {/* Detailed Inventory Valuation Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-50/50">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search product, raw material, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <select
                value={inventoryTypeFilter}
                onChange={(e) => setInventoryTypeFilter(e.target.value as any)}
                className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-semibold"
              >
                <option value="All">All Inventory Types</option>
                <option value="Product">Finished Products Only</option>
                <option value="Raw Material">Raw Materials Only</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100/70 text-stone-700 font-bold border-b border-stone-200">
                    <th className="py-2.5 px-3.5">Item Name</th>
                    <th className="py-2.5 px-3.5">Type</th>
                    <th className="py-2.5 px-3.5">Category</th>
                    <th className="py-2.5 px-3.5 text-right">On-Hand Quantity</th>
                    <th className="py-2.5 px-3.5 text-right">Unit Cost Rate</th>
                    <th className="py-2.5 px-3.5 text-right">Total Valuation</th>
                    <th className="py-2.5 px-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {inventoryItems.map((it) => (
                    <tr key={it.id} className="hover:bg-stone-50/80">
                      <td className="py-2.5 px-3.5 font-bold text-stone-900">{it.name}</td>
                      <td className="py-2.5 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            it.type === 'Finished Product'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {it.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-stone-600 font-medium">{it.category}</td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-stone-900">
                        {it.quantity} <span className="text-[10px] text-stone-500 font-normal">{it.unit}</span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-stone-600">{formatPKR(it.costRate)}</td>
                      <td className="py-2.5 px-3.5 text-right font-black text-emerald-800">
                        {formatPKR(it.valuation)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            it.quantity <= it.reorderLevel
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {it.quantity <= it.reorderLevel ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
