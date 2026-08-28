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
  PieChart as PieChartIcon,
  CheckCircle,
  AlertCircle,
  Percent,
  Wallet,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Printer,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Package,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
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

// Chart Palette Colors
const PIE_COLORS = ['#059669', '#2563eb', '#d97706', '#7c3aed', '#ec4899', '#06b6d4', '#f97316']
const EXPENSE_COLORS = ['#d97706', '#2563eb', '#7c3aed', '#059669', '#dc2626', '#0891b2']

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
  const [showPLDetails, setShowPLDetails] = useState<boolean>(false)

  // Sub-Filters for Specific Tables
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

  // Helper: check if date is in selected range
  const isDateInRange = (d?: string) => {
    if (!d) return false
    const cleanD = d.slice(0, 10)
    return cleanD >= dateRange.start && cleanD <= dateRange.end
  }

  // Filtered Datasets
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
    const netProfit =
      totalRevenue - (estimatedCOGS > 0 ? estimatedCOGS : totalPurchases * 0.8) - totalExpenses - totalSalaries

    // Profit margin %
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'

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
      profitMargin,
      totalReceivablesOutstanding,
      totalPayablesOutstanding,
      finishedGoodsValuation,
      rawMaterialsValuation,
      totalInventoryValuation,
    }
  }, [
    filteredInvoices,
    filteredPurchases,
    filteredExpenses,
    filteredSalaryPayments,
    db.customers,
    db.suppliers,
    db.products,
    db.rawMaterials,
  ])

  // Time-Series Trend Data for Area / Line Chart
  const timeSeriesTrendData = useMemo(() => {
    // Collect all dates from invoices, purchases, expenses
    const dateMap = new Map<string, { date: string; label: string; revenue: number; outflow: number; purchases: number; expenses: number; salaries: number; net: number }>()

    const registerDate = (d?: string) => {
      if (!d) return null
      const clean = d.slice(0, 10)
      if (!isDateInRange(clean)) return null
      if (!dateMap.has(clean)) {
        dateMap.set(clean, {
          date: clean,
          label: clean.slice(5), // MM-DD
          revenue: 0,
          outflow: 0,
          purchases: 0,
          expenses: 0,
          salaries: 0,
          net: 0,
        })
      }
      return dateMap.get(clean)!
    }

    filteredInvoices.forEach((inv) => {
      const entry = registerDate(inv.date)
      if (entry) entry.revenue += inv.grandTotal || 0
    })

    filteredPurchases.forEach((p) => {
      const entry = registerDate(p.date)
      if (entry) {
        entry.purchases += p.grandTotal || 0
        entry.outflow += p.grandTotal || 0
      }
    })

    filteredExpenses.forEach((e) => {
      const entry = registerDate(e.date)
      if (entry) {
        entry.expenses += e.amount || 0
        entry.outflow += e.amount || 0
      }
    })

    filteredSalaryPayments.forEach((sp) => {
      const entry = registerDate(sp.paymentDate || sp.month)
      if (entry) {
        entry.salaries += sp.amountPaid || 0
        entry.outflow += sp.amountPaid || 0
      }
    })

    // If empty or single point, generate standard fallback timeline for current range
    if (dateMap.size === 0) {
      return [
        { date: 'Day 1', label: 'Day 1', revenue: 0, outflow: 0, purchases: 0, expenses: 0, salaries: 0, net: 0 },
        { date: 'Day 2', label: 'Day 2', revenue: 0, outflow: 0, purchases: 0, expenses: 0, salaries: 0, net: 0 },
      ]
    }

    const sorted = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    sorted.forEach((item) => {
      item.net = item.revenue - item.outflow
    })
    return sorted
  }, [filteredInvoices, filteredPurchases, filteredExpenses, filteredSalaryPayments, dateRange])

  // Channel Distribution Donut Data
  const channelBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; value: number; count: number }>()
    filteredInvoices.forEach((inv) => {
      const ch = inv.customerType || 'Walk-in'
      const existing = map.get(ch) || { name: ch, value: 0, count: 0 }
      existing.value += inv.grandTotal || 0
      existing.count += 1
      map.set(ch, existing)
    })
    const list = Array.from(map.values()).sort((a, b) => b.value - a.value)
    const grandTotal = list.reduce((sum, item) => sum + item.value, 0) || 1
    return list.map((item) => ({
      ...item,
      percentage: Math.round((item.value / grandTotal) * 100),
    }))
  }, [filteredInvoices])

  // Outflow Breakdown (Purchases vs Expenses vs Payroll)
  const outflowSplitData = useMemo(() => {
    const data = [
      { name: 'Raw & Mat. Purchases', value: overviewMetrics.totalPurchases, color: '#2563eb' },
      { name: 'Factory Overhead', value: overviewMetrics.totalExpenses, color: '#d97706' },
      { name: 'Staff Salaries', value: overviewMetrics.totalSalaries, color: '#7c3aed' },
    ].filter((item) => item.value > 0)

    const total = data.reduce((sum, item) => sum + item.value, 0) || 1
    return data.map((item) => ({
      ...item,
      percentage: Math.round((item.value / total) * 100),
    }))
  }, [overviewMetrics.totalPurchases, overviewMetrics.totalExpenses, overviewMetrics.totalSalaries])

  // Expense Categories Distribution
  const expenseCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    filteredExpenses.forEach((e) => {
      const cat = e.category || 'Other'
      map.set(cat, (map.get(cat) || 0) + (e.amount || 0))
    })
    const list = Array.from(map.entries()).map(([cat, amount]) => ({ name: cat, value: amount }))
    list.sort((a, b) => b.value - a.value)
    const totalExp = list.reduce((sum, x) => sum + x.value, 0) || 1
    return list.map((item) => ({
      ...item,
      percentage: Math.round((item.value / totalExp) * 100),
    }))
  }, [filteredExpenses])

  // Inventory Valuation Chart Data
  const inventoryValuationData = useMemo(() => {
    return [
      { name: 'Finished Goods', value: overviewMetrics.finishedGoodsValuation, color: '#059669', count: db.products.length },
      { name: 'Raw Materials', value: overviewMetrics.rawMaterialsValuation, color: '#2563eb', count: db.rawMaterials.length },
    ]
  }, [overviewMetrics.finishedGoodsValuation, overviewMetrics.rawMaterialsValuation, db.products.length, db.rawMaterials.length])

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
      .slice(0, 6)
  }, [filteredInvoices])

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
      .slice(0, 6)
  }, [filteredInvoices])

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

  // EXPORT HANDLERS
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
          ['Total Purchases & Procurement', formatPKR(overviewMetrics.totalPurchases), 'Procurement stock value received'],
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
          { label: 'Top Category', value: expenseCategoryBreakdown[0]?.name || 'General' },
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

  // Report Category Tabs Definition
  const reportCategories: Array<{
    id: ReportCategoryKey
    label: string
    icon: React.ComponentType<{ className?: string }>
    count?: number
  }> = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'sales', label: 'Sales', icon: ShoppingBag, count: db.invoices.length },
    { id: 'purchases', label: 'Purchases', icon: Truck, count: db.purchases.length },
    { id: 'expenses', label: 'Expenses', icon: Receipt, count: db.expenses.length },
    { id: 'suppliers', label: 'Suppliers', icon: Building2, count: db.suppliers.length },
    { id: 'customers', label: 'Customers', icon: Users, count: db.customers.length },
    { id: 'salary', label: 'Payroll', icon: Wallet, count: db.employees.length },
    { id: 'inventory', label: 'Inventory', icon: Boxes, count: db.products.length + db.rawMaterials.length },
  ]

  return (
    <div className="space-y-4">
      {/* 1. TOP HEADER & DATE RANGE FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Reports & Business Analytics
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Instant visual health dashboard · Real-time financial insights & ledgers
          </p>
        </div>

        {/* Date Selector Pills & Compact Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Selector Pills */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/80">
            {[
              { id: 'today', label: 'Today' },
              { id: 'this-week', label: 'Week' },
              { id: 'this-month', label: 'Month' },
              { id: 'this-quarter', label: 'Quarter' },
              { id: 'this-year', label: 'Year' },
              { id: 'all-time', label: 'All' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => {
              const isSelected = datePreset === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setDatePreset(p.id as DatePreset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-stone-200">
            <button
              onClick={handleExportCurrentReportCSV}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-all cursor-pointer"
              title="Export CSV spreadsheet"
              id="btn-export-report-csv"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportCurrentReportPDF}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer shadow-2xs"
              title="Export formatted PDF"
              id="btn-export-report-pdf"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Date Inputs Row if custom is selected */}
      {datePreset === 'custom' && (
        <div className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 text-xs">
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

      {/* 2. REPORT TYPE SELECTOR (MODERN HORIZONTAL ICON TABS) */}
      <div className="bg-white p-1.5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
          {reportCategories.map((cat) => {
            const Icon = cat.icon
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  setSearchQuery('')
                }}
                id={`report-tab-${cat.id}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                <span>{cat.label}</span>
                {cat.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-extrabold rounded-md ${
                      isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. REPORT VIEWS */}

      {/* ========================================================= */}
      {/* 3.1 BUSINESS OVERVIEW (DEFAULT DASHBOARD VIEW)            */}
      {/* ========================================================= */}
      {activeCategory === 'overview' && (
        <div className="space-y-4">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Total Revenue */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
                <span>Total Revenue</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-stone-900">{formatPKR(overviewMetrics.totalRevenue)}</div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-emerald-700">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{filteredInvoices.length} Invoices issued</span>
                </div>
              </div>
            </div>

            {/* Total Purchases */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
                <span>Total Purchases</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-stone-900">{formatPKR(overviewMetrics.totalPurchases)}</div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-blue-700">
                  <span>{filteredPurchases.length} Purchase Orders</span>
                </div>
              </div>
            </div>

            {/* Factory Expenses */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
                <span>Factory Expenses</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-amber-800">{formatPKR(overviewMetrics.totalExpenses)}</div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-stone-500">
                  <span>+ Payroll: {formatPKR(overviewMetrics.totalSalaries)}</span>
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
                <span>Net Profit / Loss</span>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    overviewMetrics.netProfit >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
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
                <div className="flex items-center gap-1 mt-1 text-[11px] font-bold">
                  {overviewMetrics.netProfit >= 0 ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" /> {overviewMetrics.profitMargin}% Net Margin
                    </span>
                  ) : (
                    <span className="text-rose-700 flex items-center gap-1">
                      <ArrowDownRight className="w-3.5 h-3.5" /> Operating Deficit
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Book Balances */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
                <span>Book Balances</span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500 font-medium">Receivables:</span>
                  <span className="font-black text-emerald-800">
                    {formatPKR(overviewMetrics.totalReceivablesOutstanding)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500 font-medium">Payables:</span>
                  <span className="font-black text-amber-800">
                    {formatPKR(overviewMetrics.totalPayablesOutstanding)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Visual Grid: Left Big Charts + Right Stat/Donut Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 2 Columns: Revenue vs Expense Trend Chart */}
            <div className="lg:col-span-2 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-stone-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Revenue Inflow vs Total Outflow Trend
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    Daily financial trajectory across selected period ({dateRange.label})
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Revenue
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Total Outflow
                  </span>
                </div>
              </div>

              {/* Area Chart Container */}
              <div className="w-full h-72 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatPKR(Number(val)), '']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        borderColor: '#e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorRev)"
                    />
                    <Area
                      type="monotone"
                      dataKey="outflow"
                      name="Total Outflow"
                      stroke="#d97706"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorOutflow)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Bottom Quick Flow Summary Bar */}
              <div className="pt-2 border-t border-stone-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-emerald-50/60 rounded-xl">
                  <span className="text-[10px] text-stone-500 uppercase font-bold block">Cash Collected</span>
                  <span className="font-black text-emerald-800 mt-0.5 block">
                    {formatPKR(overviewMetrics.cashCollected)}
                  </span>
                </div>
                <div className="p-2 bg-amber-50/60 rounded-xl">
                  <span className="text-[10px] text-stone-500 uppercase font-bold block">New Market Credit</span>
                  <span className="font-black text-amber-800 mt-0.5 block">
                    {formatPKR(overviewMetrics.newReceivables)}
                  </span>
                </div>
                <div className="p-2 bg-purple-50/60 rounded-xl">
                  <span className="text-[10px] text-stone-500 uppercase font-bold block">Purchases Paid</span>
                  <span className="font-black text-purple-800 mt-0.5 block">
                    {formatPKR(overviewMetrics.purchasesPaid)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Donut Cards (Sales Channel & Outflow Split) */}
            <div className="space-y-4">
              {/* Sales by Channel Donut Chart */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <PieChartIcon className="w-3.5 h-3.5 text-emerald-600" />
                    Sales by Channel
                  </h3>
                  <span className="text-[11px] font-bold text-stone-500">
                    {formatPKR(overviewMetrics.totalRevenue)}
                  </span>
                </div>

                {channelBreakdown.length === 0 ? (
                  <p className="text-xs text-stone-400 py-6 text-center">No sales in selected period.</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-32 relative shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={channelBreakdown}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={28}
                            outerRadius={46}
                            paddingAngle={3}
                          >
                            {channelBreakdown.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val: any) => [formatPKR(Number(val)), '']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-1 text-xs">
                      {channelBreakdown.map((ch, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1.5 text-stone-600 truncate">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                            ></span>
                            <span className="truncate">{ch.name}</span>
                          </span>
                          <span className="font-black text-stone-900 shrink-0">{ch.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Expense & Outflow Split Donut */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-amber-600" />
                    Outflow Breakdown
                  </h3>
                  <span className="text-[11px] font-bold text-amber-800">
                    {formatPKR(overviewMetrics.totalOutflows)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-32 h-32 relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={outflowSplitData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={28}
                          outerRadius={46}
                          paddingAngle={3}
                        >
                          {outflowSplitData.map((entry, index) => (
                            <Cell key={`cell-outflow-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: any) => [formatPKR(Number(val)), '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1.5 text-xs">
                    {outflowSplitData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 text-stone-600 truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                          <span className="truncate">{item.name}</span>
                        </span>
                        <span className="font-black text-stone-900 shrink-0">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Inventory Valuation Compact Bar */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-purple-600" />
                    Inventory Valuation
                  </h3>
                  <span className="text-xs font-black text-stone-900">
                    {formatPKR(overviewMetrics.totalInventoryValuation)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 bg-purple-50/50 rounded-xl border border-purple-100">
                    <span className="text-[10px] text-stone-500 uppercase font-bold block">Finished Goods</span>
                    <span className="text-xs font-black text-purple-900 mt-0.5 block">
                      {formatPKR(overviewMetrics.finishedGoodsValuation)}
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium">{db.products.length} SKUs</span>
                  </div>
                  <div className="p-2 bg-blue-50/50 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-stone-500 uppercase font-bold block">Raw Materials</span>
                    <span className="text-xs font-black text-blue-900 mt-0.5 block">
                      {formatPKR(overviewMetrics.rawMaterialsValuation)}
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium">{db.rawMaterials.length} Items</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Collapsible P&L Summary Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <button
              onClick={() => setShowPLDetails(!showPLDetails)}
              className="w-full p-4 flex items-center justify-between bg-stone-50/60 hover:bg-stone-100/80 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                  Detailed P&L Statement & Margin Breakdown
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <span>{showPLDetails ? 'Hide Details' : 'View Audit Table'}</span>
                {showPLDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showPLDetails && (
              <div className="p-4 border-t border-stone-200 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 text-stone-600 font-bold border-y border-stone-200">
                      <th className="py-2.5 px-3.5">Financial Accounting Head</th>
                      <th className="py-2.5 px-3.5 text-right">Amount (PKR)</th>
                      <th className="py-2.5 px-3.5 text-right">% of Revenue</th>
                      <th className="py-2.5 px-3.5">Analytical Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    <tr>
                      <td className="py-2.5 px-3.5 font-bold text-stone-900">Gross Sales Revenue</td>
                      <td className="py-2.5 px-3.5 text-right font-black text-emerald-700">
                        {formatPKR(overviewMetrics.totalRevenue)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-semibold">100%</td>
                      <td className="py-2.5 px-3.5 text-emerald-700 font-semibold">Inflow Generated</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3.5 text-stone-700">(-) Purchases & Procurement</td>
                      <td className="py-2.5 px-3.5 text-right font-semibold text-stone-800">
                        {formatPKR(overviewMetrics.totalPurchases)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-stone-500">
                        {overviewMetrics.totalRevenue > 0
                          ? `${Math.round((overviewMetrics.totalPurchases / overviewMetrics.totalRevenue) * 100)}%`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3.5 text-stone-500">Material Inward</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3.5 text-stone-700">(-) Factory & Operating Expenses</td>
                      <td className="py-2.5 px-3.5 text-right font-semibold text-stone-800">
                        {formatPKR(overviewMetrics.totalExpenses)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-stone-500">
                        {overviewMetrics.totalRevenue > 0
                          ? `${Math.round((overviewMetrics.totalExpenses / overviewMetrics.totalRevenue) * 100)}%`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3.5 text-stone-500">Overhead & Utilities</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3.5 text-stone-700">(-) Factory Staff Payroll & Salaries</td>
                      <td className="py-2.5 px-3.5 text-right font-semibold text-stone-800">
                        {formatPKR(overviewMetrics.totalSalaries)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-stone-500">
                        {overviewMetrics.totalRevenue > 0
                          ? `${Math.round((overviewMetrics.totalSalaries / overviewMetrics.totalRevenue) * 100)}%`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3.5 text-stone-500">Staff Compensation</td>
                    </tr>
                    <tr className="bg-stone-50 font-black">
                      <td className="py-3 px-3.5 text-stone-900">Estimated Net Operational Profit / Loss</td>
                      <td
                        className={`py-3 px-3.5 text-right text-sm ${
                          overviewMetrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {formatPKR(overviewMetrics.netProfit)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold">
                        {overviewMetrics.profitMargin}%
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            overviewMetrics.netProfit >= 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {overviewMetrics.netProfit >= 0 ? 'Profitable Surplus' : 'Operating Deficit'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3.2 SALES REPORT DASHBOARD                                */}
      {/* ========================================================= */}
      {activeCategory === 'sales' && (
        <div className="space-y-4">
          {/* Sales KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Total Sales</span>
              <div className="text-2xl font-black text-stone-900 mt-1">{formatPKR(overviewMetrics.totalRevenue)}</div>
              <span className="text-[11px] text-emerald-700 font-bold">{filteredInvoices.length} invoices</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Cash Collected</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{formatPKR(overviewMetrics.cashCollected)}</div>
              <span className="text-[11px] text-stone-500">
                {overviewMetrics.totalRevenue > 0
                  ? `${Math.round((overviewMetrics.cashCollected / overviewMetrics.totalRevenue) * 100)}% recovery rate`
                  : '0%'}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Pending Customer Dues</span>
              <div className="text-2xl font-black text-amber-800 mt-1">{formatPKR(overviewMetrics.newReceivables)}</div>
              <span className="text-[11px] text-amber-700 font-bold">Unsettled credit</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Average Order Value</span>
              <div className="text-2xl font-black text-stone-900 mt-1">
                {formatPKR(filteredInvoices.length ? Math.round(overviewMetrics.totalRevenue / filteredInvoices.length) : 0)}
              </div>
              <span className="text-[11px] text-stone-500">Per invoice average</span>
            </div>
          </div>

          {/* Visual Sales Charts: Daily Revenue Trend & Channel Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Daily Sales Revenue Velocity
              </h3>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeriesTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                    />
                    <Tooltip formatter={(val: any) => [formatPKR(Number(val)), 'Sales Revenue']} />
                    <Bar dataKey="revenue" name="Sales Revenue" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products Volume */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                Top Selling Products
              </h3>
              <div className="space-y-2 pt-1">
                {topProductsData.length === 0 ? (
                  <p className="text-xs text-stone-400 py-6 text-center">No products sold in period.</p>
                ) : (
                  topProductsData.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-stone-50 text-xs">
                      <div>
                        <div className="font-bold text-stone-900 truncate max-w-[140px]">{p.name}</div>
                        <div className="text-[10px] text-stone-500">{p.quantity} {p.unit}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-emerald-700">{formatPKR(p.revenue)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Searchable Invoices Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-3 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-stone-50/60">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search invoice #, customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={salesChannelFilter}
                  onChange={(e) => setSalesChannelFilter(e.target.value)}
                  className="bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="All">All Channels</option>
                  <option value="POS / Counter">POS / Counter</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Wholesaler">Wholesaler</option>
                  <option value="Retailer">Retailer</option>
                  <option value="Walk-in">Walk-in</option>
                </select>

                <select
                  value={salesStatusFilter}
                  onChange={(e) => setSalesStatusFilter(e.target.value)}
                  className="bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
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
                    <th className="py-2 px-3">Invoice #</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Customer</th>
                    <th className="py-2 px-3">Channel</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 px-3 text-right">Paid</th>
                    <th className="py-2 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-stone-400">
                        No sales invoices found.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-stone-50/80">
                        <td className="py-2 px-3 font-bold text-stone-900">{inv.invoiceNumber}</td>
                        <td className="py-2 px-3 text-stone-600">{formatDate(inv.date)}</td>
                        <td className="py-2 px-3 font-semibold text-stone-800">{inv.customerName}</td>
                        <td className="py-2 px-3 text-stone-600">{inv.customerType}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
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
                        <td className="py-2 px-3 text-right font-bold text-stone-900">{formatPKR(inv.grandTotal)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-700">{formatPKR(inv.amountPaid)}</td>
                        <td className="py-2 px-3 text-right font-bold text-amber-800">{formatPKR(inv.balanceDue)}</td>
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
      {/* 3.3 PURCHASE REPORT DASHBOARD                             */}
      {/* ========================================================= */}
      {activeCategory === 'purchases' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Total Procurement</span>
              <div className="text-2xl font-black text-stone-900 mt-1">{formatPKR(overviewMetrics.totalPurchases)}</div>
              <span className="text-[11px] text-blue-700 font-bold">{filteredPurchases.length} Purchase Orders</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Paid to Vendors</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{formatPKR(overviewMetrics.purchasesPaid)}</div>
              <span className="text-[11px] text-stone-500">Settled inward payments</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Pending Payables</span>
              <div className="text-2xl font-black text-amber-800 mt-1">
                {formatPKR(overviewMetrics.totalPurchases - overviewMetrics.purchasesPaid)}
              </div>
              <span className="text-[11px] text-amber-700 font-bold">Vendor balance due</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Raw Material Share</span>
              <div className="text-2xl font-black text-purple-800 mt-1">
                {formatPKR(
                  filteredPurchases
                    .filter((p) => (p.purchaseType || 'Raw Material') === 'Raw Material')
                    .reduce((sum, p) => sum + p.grandTotal, 0)
                )}
              </div>
              <span className="text-[11px] text-purple-700 font-bold">Ingredients & packaging</span>
            </div>
          </div>

          {/* Detailed Purchases Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-3 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-stone-50/60">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search PO #, supplier name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={purchaseTypeFilter}
                  onChange={(e) => setPurchaseTypeFilter(e.target.value)}
                  className="bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="All">All Types</option>
                  <option value="Raw Material">Raw Material</option>
                  <option value="Finished Product">Finished Product</option>
                  <option value="Equipment">Equipment / Spares</option>
                </select>

                <select
                  value={purchaseSupplierFilter}
                  onChange={(e) => setPurchaseSupplierFilter(e.target.value)}
                  className="bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold max-w-xs truncate"
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
                    <th className="py-2 px-3">PO #</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Supplier Name</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 px-3 text-right">Paid</th>
                    <th className="py-2 px-3 text-right">Balance</th>
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
                        <td className="py-2 px-3 font-bold text-stone-900">
                          {p.poNumber || p.purchaseNumber || 'PO-RECORD'}
                        </td>
                        <td className="py-2 px-3 text-stone-600">{formatDate(p.date)}</td>
                        <td className="py-2 px-3 font-semibold text-stone-800">{p.supplierName}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800">
                            {p.purchaseType || 'Raw Material'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
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
                        <td className="py-2 px-3 text-right font-bold text-stone-900">{formatPKR(p.grandTotal)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-700">{formatPKR(p.amountPaid)}</td>
                        <td className="py-2 px-3 text-right font-bold text-amber-800">{formatPKR(p.balanceDue)}</td>
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
      {/* 3.4 EXPENSES REPORT DASHBOARD                             */}
      {/* ========================================================= */}
      {activeCategory === 'expenses' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Total Factory Expenses</span>
              <div className="text-2xl font-black text-amber-800 mt-1">{formatPKR(overviewMetrics.totalExpenses)}</div>
              <span className="text-[11px] text-stone-500">{filteredExpenses.length} vouchers logged</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Top Category</span>
              <div className="text-lg font-black text-stone-900 mt-1 truncate">
                {expenseCategoryBreakdown[0]?.name || 'General'}
              </div>
              <span className="text-[11px] text-amber-700 font-bold">
                {expenseCategoryBreakdown[0] ? `${formatPKR(expenseCategoryBreakdown[0].value)} (${expenseCategoryBreakdown[0].percentage}%)` : '—'}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Avg Voucher Size</span>
              <div className="text-2xl font-black text-stone-900 mt-1">
                {formatPKR(filteredExpenses.length ? Math.round(overviewMetrics.totalExpenses / filteredExpenses.length) : 0)}
              </div>
              <span className="text-[11px] text-stone-500">Per voucher average</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Cash vs Bank</span>
              <div className="text-xs font-bold text-stone-800 mt-1.5 space-y-0.5">
                <div className="flex justify-between">
                  <span>Cash:</span>
                  <span className="text-emerald-700">
                    {formatPKR(
                      filteredExpenses
                        .filter((e) => e.paymentMethod === 'Cash')
                        .reduce((s, e) => s + e.amount, 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Bank:</span>
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

          {/* Expenses Chart & Detailed Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <PieChartIcon className="w-3.5 h-3.5 text-amber-600" />
                Spending by Category
              </h3>
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategoryBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={3}
                    >
                      {expenseCategoryBreakdown.map((_, index) => (
                        <Cell key={`cell-exp-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [formatPKR(Number(val)), '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 text-[11px]">
                {expenseCategoryBreakdown.slice(0, 4).map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-stone-600">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: EXPENSE_COLORS[idx % EXPENSE_COLORS.length] }}></span>
                      {c.name}
                    </span>
                    <span className="font-bold text-stone-900">{c.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-3 border-b border-stone-200 flex items-center justify-between gap-2 bg-stone-50/60">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search vouchers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl"
                  />
                </div>
                <select
                  value={expenseCategoryFilter}
                  onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                  className="bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
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
                      <th className="py-2 px-3">Voucher #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Paid To</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-stone-50/80">
                        <td className="py-2 px-3 font-bold text-stone-900">
                          {e.voucherNumber || e.expenseNumber || 'VCH'}
                        </td>
                        <td className="py-2 px-3 text-stone-600">{formatDate(e.date)}</td>
                        <td className="py-2 px-3 text-stone-800">{e.description || e.title}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800">
                            {e.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-stone-600">{e.paidTo || '—'}</td>
                        <td className="py-2 px-3 text-right font-black text-stone-900">{formatPKR(e.amount)}</td>
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
      {/* 3.5 SUPPLIER / VENDOR REPORT DASHBOARD                    */}
      {/* ========================================================= */}
      {activeCategory === 'suppliers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Registered Suppliers</span>
              <div className="text-2xl font-black text-stone-900 mt-1">{db.suppliers.length}</div>
              <span className="text-[11px] text-stone-500">Active vendor accounts</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Total Outstanding Payables</span>
              <div className="text-2xl font-black text-amber-800 mt-1">
                {formatPKR(overviewMetrics.totalPayablesOutstanding)}
              </div>
              <span className="text-[11px] text-amber-700 font-bold">Total debt owed to vendors</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Top Creditor</span>
              <div className="text-lg font-black text-stone-900 mt-1 truncate">
                {supplierPayables[0]?.name || 'None'}
              </div>
              <span className="text-[11px] text-amber-800 font-bold">
                {formatPKR(supplierPayables[0]?.currentBalance || 0)}
              </span>
            </div>
          </div>

          {/* Supplier Payables Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-3 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-stone-50/60">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search supplier, phone, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <select
                value={supplierCategoryFilter}
                onChange={(e) => setSupplierCategoryFilter(e.target.value)}
                className="bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
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
                    <th className="py-2 px-3">Supplier Name</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Contact</th>
                    <th className="py-2 px-3">City</th>
                    <th className="py-2 px-3 text-right">Opening Balance</th>
                    <th className="py-2 px-3 text-right">Current Payable</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {supplierPayables.map((s) => (
                    <tr key={s.id} className="hover:bg-stone-50/80">
                      <td className="py-2 px-3 font-bold text-stone-900">{s.name}</td>
                      <td className="py-2 px-3 text-stone-600">{s.category}</td>
                      <td className="py-2 px-3 text-stone-600 font-mono">{s.phone}</td>
                      <td className="py-2 px-3 text-stone-600">{s.city || '—'}</td>
                      <td className="py-2 px-3 text-right text-stone-500">{formatPKR(s.openingBalance || 0)}</td>
                      <td className="py-2 px-3 text-right font-black text-amber-800">{formatPKR(s.currentBalance || 0)}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                            (s.currentBalance || 0) > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {(s.currentBalance || 0) > 0 ? 'Payable' : 'Settled'}
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
      {/* 3.6 CUSTOMER / CONTACT REPORT DASHBOARD                   */}
      {/* ========================================================= */}
      {activeCategory === 'customers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Active Customers</span>
              <div className="text-2xl font-black text-stone-900 mt-1">{db.customers.length}</div>
              <span className="text-[11px] text-stone-500">Distributors, wholesalers & retailers</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Total Market Receivables</span>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                {formatPKR(overviewMetrics.totalReceivablesOutstanding)}
              </div>
              <span className="text-[11px] text-emerald-700 font-bold">Total market credit to collect</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Top Debtor Balance</span>
              <div className="text-lg font-black text-stone-900 mt-1 truncate">
                {customerReceivables[0]?.name || 'None'}
              </div>
              <span className="text-[11px] text-amber-800 font-bold">
                {formatPKR(customerReceivables[0]?.currentBalance || 0)}
              </span>
            </div>
          </div>

          {/* Customer Receivables Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-3 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-stone-50/60">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search customer, business name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <select
                value={customerTypeFilter}
                onChange={(e) => setCustomerTypeFilter(e.target.value)}
                className="bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="All">All Channels</option>
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
                    <th className="py-2 px-3">Customer Name</th>
                    <th className="py-2 px-3">Business</th>
                    <th className="py-2 px-3">Channel</th>
                    <th className="py-2 px-3">Phone</th>
                    <th className="py-2 px-3">City</th>
                    <th className="py-2 px-3 text-right">Opening Balance</th>
                    <th className="py-2 px-3 text-right">Receivable Due</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {customerReceivables.map((c) => (
                    <tr key={c.id} className="hover:bg-stone-50/80">
                      <td className="py-2 px-3 font-bold text-stone-900">{c.name}</td>
                      <td className="py-2 px-3 text-stone-700">{c.businessName || '—'}</td>
                      <td className="py-2 px-3 text-stone-600">{c.type}</td>
                      <td className="py-2 px-3 text-stone-600 font-mono">{c.phone}</td>
                      <td className="py-2 px-3 text-stone-600">{c.city || '—'}</td>
                      <td className="py-2 px-3 text-right text-stone-500">{formatPKR(c.openingBalance || 0)}</td>
                      <td className="py-2 px-3 text-right font-black text-emerald-800">{formatPKR(c.currentBalance || 0)}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                            (c.currentBalance || 0) > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
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
      {/* 3.7 SALARY / PAYROLL REPORT DASHBOARD                     */}
      {/* ========================================================= */}
      {activeCategory === 'salary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Total Factory Staff</span>
              <div className="text-2xl font-black text-stone-900 mt-1">{db.employees.length}</div>
              <span className="text-[11px] text-stone-500">Operators & management</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Monthly Payroll Obligation</span>
              <div className="text-2xl font-black text-stone-900 mt-1">
                {formatPKR(db.employees.reduce((s, e) => s + (e.monthlySalary || 0), 0))}
              </div>
              <span className="text-[11px] text-stone-500">Base salary run</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Disbursed in Period</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{formatPKR(overviewMetrics.totalSalaries)}</div>
              <span className="text-[11px] text-emerald-700 font-bold">{filteredSalaryPayments.length} payouts</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Staff Loan Advances</span>
              <div className="text-2xl font-black text-amber-800 mt-1">
                {formatPKR(db.employees.reduce((s, e) => s + (e.totalAdvanceGiven || 0), 0))}
              </div>
              <span className="text-[11px] text-amber-700 font-bold">Active loan balances</span>
            </div>
          </div>

          {/* Detailed Employee Payroll Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-3 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-stone-50/60">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search staff, designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <select
                value={payrollDeptFilter}
                onChange={(e) => setPayrollDeptFilter(e.target.value)}
                className="bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
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
                    <th className="py-2 px-3">Employee Name</th>
                    <th className="py-2 px-3">Designation</th>
                    <th className="py-2 px-3">Department</th>
                    <th className="py-2 px-3 text-right">Monthly Base</th>
                    <th className="py-2 px-3 text-right">Paid in Period</th>
                    <th className="py-2 px-3 text-right">Advances</th>
                    <th className="py-2 px-3 text-center">Status</th>
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
                        <td className="py-2 px-3 font-bold text-stone-900">{emp.name}</td>
                        <td className="py-2 px-3 text-stone-700">{emp.designation}</td>
                        <td className="py-2 px-3 text-stone-600">{emp.department}</td>
                        <td className="py-2 px-3 text-right font-bold text-stone-900">{formatPKR(emp.monthlySalary || 0)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatPKR(totalPaid)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-amber-800">{formatPKR(emp.totalAdvanceGiven || 0)}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                              emp.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
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
      {/* 3.8 INVENTORY / STOCK REPORT DASHBOARD                    */}
      {/* ========================================================= */}
      {activeCategory === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Total Stock Valuation</span>
              <div className="text-2xl font-black text-stone-900 mt-1">
                {formatPKR(overviewMetrics.totalInventoryValuation)}
              </div>
              <span className="text-[11px] text-purple-700 font-bold">{inventoryItems.length} SKUs</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Finished Goods</span>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                {formatPKR(overviewMetrics.finishedGoodsValuation)}
              </div>
              <span className="text-[11px] text-emerald-700 font-bold">{db.products.length} catalog items</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Raw Materials</span>
              <div className="text-2xl font-black text-blue-800 mt-1">
                {formatPKR(overviewMetrics.rawMaterialsValuation)}
              </div>
              <span className="text-[11px] text-blue-700 font-bold">{db.rawMaterials.length} ingredients/packaging</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">Low Stock Reorders</span>
              <div className="text-2xl font-black text-rose-700 mt-1">
                {inventoryItems.filter((i) => i.quantity <= i.reorderLevel).length}
              </div>
              <span className="text-[11px] text-rose-600 font-bold">Below safety threshold</span>
            </div>
          </div>

          {/* Detailed Inventory Valuation Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-3 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-stone-50/60">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search item, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <select
                value={inventoryTypeFilter}
                onChange={(e) => setInventoryTypeFilter(e.target.value as any)}
                className="bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="All">All Inventory</option>
                <option value="Product">Finished Products Only</option>
                <option value="Raw Material">Raw Materials Only</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100/70 text-stone-700 font-bold border-b border-stone-200">
                    <th className="py-2 px-3">Item Name</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-right">Stock Qty</th>
                    <th className="py-2 px-3 text-right">Cost Rate</th>
                    <th className="py-2 px-3 text-right">Valuation</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {inventoryItems.map((it) => (
                    <tr key={it.id} className="hover:bg-stone-50/80">
                      <td className="py-2 px-3 font-bold text-stone-900">{it.name}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            it.type === 'Finished Product'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {it.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-stone-600">{it.category}</td>
                      <td className="py-2 px-3 text-right font-bold text-stone-900">
                        {it.quantity} <span className="text-[10px] text-stone-500 font-normal">{it.unit}</span>
                      </td>
                      <td className="py-2 px-3 text-right text-stone-600">{formatPKR(it.costRate)}</td>
                      <td className="py-2 px-3 text-right font-black text-emerald-800">{formatPKR(it.valuation)}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
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
