'use client'

import { useState, useMemo, useRef } from 'react'
import {
  Receipt,
  Plus,
  Search,
  Calendar,
  DollarSign,
  CreditCard,
  FileText,
  Download,
  Trash2,
  Edit,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Printer,
  Eye,
  Upload,
  ArrowRight,
  ShieldCheck,
  Check,
  Building,
  Layers,
  Banknote,
  Percent,
  Filter,
  UserCheck,
  Sparkles,
  TrendingDown,
  ChevronDown,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  type AppDatabase,
  type ExpenseItem,
  type ExpenseCategory,
  type EmployeeItem,
  type SalaryPaymentRecord,
  type LoanAdvanceRecord,
  fileToBase64,
} from '@/lib/db'
import { generateExpenseVoucherPDF, exportToCSV } from '@/lib/pdf-export'

interface ExpensesViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigate?: (module: string, subTab?: string) => void
}

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  'Rent',
  'Bills/Utilities',
  'Salaries',
  'Daily/Misc',
  'Loan/Advance to employee',
  'Machine Maintenance',
  'Fuel & Transport',
  'Packaging & Consumables',
  'Office & Admin',
  'Marketing',
  'Other',
]

export default function ExpensesView({ db, onSaveDatabase, onNavigate }: ExpensesViewProps) {
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All')
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'this_month' | 'this_week' | 'today'>('this_month')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('All')
  const [accountFilter, setAccountFilter] = useState<string>('All')

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<ExpenseItem | null>(null)
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null)

  // Form States
  const [expenseNumber, setExpenseNumber] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [expenseCategory, setExpenseCategory] = useState<string>('Daily/Misc')
  const [customCategoryInput, setCustomCategoryInput] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [paidTo, setPaidTo] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Online' | 'Bank Transfer' | 'Cheque'>('Cash')
  const [paymentAccount, setPaymentAccount] = useState<'cash-in-hand' | 'meezan-bank' | 'hbl-bank'>('cash-in-hand')
  const [transactionRef, setTransactionRef] = useState('')
  const [receiptImage, setReceiptImage] = useState<string>('')
  const [paymentScreenshot, setPaymentScreenshot] = useState<string>('')
  const [notes, setNotes] = useState('')

  // Linked Employee State (for Salary or Loan/Advance)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [salaryMonth, setSalaryMonth] = useState<string>(() => {
    const d = new Date()
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  })

  const receiptInputRef = useRef<HTMLInputElement>(null)
  const screenshotInputRef = useRef<HTMLInputElement>(null)

  // Extract unique categories (defaults + existing in db)
  const allCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES)
    db.expenses.forEach((e) => {
      if (e.category) set.add(e.category)
    })
    return Array.from(set)
  }, [db.expenses])

  // Selected Employee object
  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null
    return db.employees?.find((e) => e.id === selectedEmployeeId) || null
  }, [db.employees, selectedEmployeeId])

  // Date Filtering Helper
  const isDateInFilter = (dateStr: string, filter: typeof dateRangeFilter) => {
    if (filter === 'all') return true
    const d = new Date(dateStr)
    const today = new Date()

    if (filter === 'today') {
      return d.toISOString().slice(0, 10) === today.toISOString().slice(0, 10)
    }
    if (filter === 'this_week') {
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      return d >= startOfWeek
    }
    if (filter === 'this_month') {
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
    }
    return true
  }

  // Filtered Expenses List
  const filteredExpenses = useMemo(() => {
    return db.expenses
      .filter((exp) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchNumber = exp.expenseNumber?.toLowerCase().includes(q)
          const matchDesc = exp.description?.toLowerCase().includes(q)
          const matchPaidTo = exp.paidTo?.toLowerCase().includes(q)
          const matchEmp = exp.employeeName?.toLowerCase().includes(q)
          const matchCat = exp.category?.toLowerCase().includes(q)
          const matchNotes = exp.notes?.toLowerCase().includes(q)
          if (!matchNumber && !matchDesc && !matchPaidTo && !matchEmp && !matchCat && !matchNotes) {
            return false
          }
        }

        // Category
        if (selectedCategoryFilter !== 'All' && exp.category !== selectedCategoryFilter) {
          return false
        }

        // Date Range
        if (!isDateInFilter(exp.date, dateRangeFilter)) {
          return false
        }

        // Payment Method
        if (paymentMethodFilter !== 'All' && exp.paymentMethod !== paymentMethodFilter) {
          return false
        }

        // Account
        if (accountFilter !== 'All' && exp.paymentAccount !== accountFilter) {
          return false
        }

        return true
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [db.expenses, searchQuery, selectedCategoryFilter, dateRangeFilter, paymentMethodFilter, accountFilter])

  // Monthly Metrics Calculations
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const thisMonth = new Date().getMonth()
    const thisYear = new Date().getFullYear()

    let totalThisMonth = 0
    let totalToday = 0
    let salariesThisMonth = 0
    let loansThisMonth = 0

    const categoryBreakdown: Record<string, number> = {}

    db.expenses.forEach((exp) => {
      const expDate = new Date(exp.date)
      const isCurrentMonth = expDate.getMonth() === thisMonth && expDate.getFullYear() === thisYear

      if (isCurrentMonth) {
        totalThisMonth += exp.amount || 0
        categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + (exp.amount || 0)

        if (exp.category === 'Salaries' || exp.category.toLowerCase().includes('salary')) {
          salariesThisMonth += exp.amount || 0
        }
        if (exp.category.includes('Loan') || exp.category.includes('Advance')) {
          loansThisMonth += exp.amount || 0
        }
      }

      if (exp.date === todayStr) {
        totalToday += exp.amount || 0
      }
    })

    const sortedCategories = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])

    return {
      totalThisMonth,
      totalToday,
      salariesThisMonth,
      loansThisMonth,
      sortedCategories,
    }
  }, [db.expenses])

  // Open Create Modal
  const handleOpenCreate = (prefillCategory?: string) => {
    const nextNum = `EXP-2026-${String(db.expenses.length + 1).padStart(4, '0')}`
    setEditingExpense(null)
    setExpenseNumber(nextNum)
    setExpenseDate(new Date().toISOString().slice(0, 10))
    setExpenseCategory(prefillCategory || 'Daily/Misc')
    setCustomCategoryInput('')
    setDescription('')
    setAmount('')
    setPaidTo('')
    setPaymentMethod('Cash')
    setPaymentAccount('cash-in-hand')
    setTransactionRef('')
    setReceiptImage('')
    setPaymentScreenshot('')
    setNotes('')
    setSelectedEmployeeId('')
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (exp: ExpenseItem) => {
    setEditingExpense(exp)
    setExpenseNumber(exp.expenseNumber || exp.id)
    setExpenseDate(exp.date)
    setExpenseCategory(exp.category)
    setCustomCategoryInput('')
    setDescription(exp.description)
    setAmount(exp.amount)
    setPaidTo(exp.paidTo || '')
    setPaymentMethod(exp.paymentMethod || 'Cash')
    setPaymentAccount(exp.paymentAccount || 'cash-in-hand')
    setTransactionRef(exp.transactionRef || '')
    setReceiptImage(exp.receiptImage || '')
    setPaymentScreenshot(exp.paymentScreenshot || '')
    setNotes(exp.notes || '')
    setSelectedEmployeeId(exp.employeeId || '')
    setIsModalOpen(true)
  }

  // Handle Employee Change in modal
  const handleEmployeeSelect = (empId: string) => {
    setSelectedEmployeeId(empId)
    const emp = db.employees?.find((e) => e.id === empId)
    if (emp) {
      setPaidTo(emp.name)
      if (expenseCategory === 'Salaries') {
        const totalPay = emp.baseSalary + (emp.totalAllowances || 0)
        setAmount(totalPay)
        setDescription(`Monthly Salary for ${emp.name} (${salaryMonth}) - ${emp.role}`)
      } else if (expenseCategory.includes('Loan') || expenseCategory.includes('Advance')) {
        setDescription(`Salary Advance / Emergency Loan to ${emp.name} (${emp.role})`)
      }
    }
  }

  // Save Expense Record with Universal Auto-Linking
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = Number(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Please enter a valid expense amount.')
      return
    }

    const finalCategory = expenseCategory === 'Other' && customCategoryInput.trim() ? customCategoryInput.trim() : expenseCategory

    // Validation for Employee Linkage
    if (finalCategory === 'Salaries' && !selectedEmployeeId) {
      alert('Please select an Employee profile for Salary payments to ensure universal employee profile auto-linking.')
      return
    }
    if ((finalCategory === 'Loan/Advance to employee' || finalCategory === 'Loan/Advance') && !selectedEmployeeId) {
      alert('Please select an Employee profile to link this loan/advance.')
      return
    }

    const newExpenseId = editingExpense ? editingExpense.id : `exp-${Date.now()}`
    const empName = selectedEmployee ? selectedEmployee.name : paidTo

    const updatedExpense: ExpenseItem = {
      id: newExpenseId,
      expenseNumber: expenseNumber || `EXP-${Date.now()}`,
      date: expenseDate,
      category: finalCategory,
      description: description.trim() || `${finalCategory} Expense`,
      amount: numericAmount,
      paidTo: paidTo.trim() || empName || 'General Vendor',
      employeeId: selectedEmployeeId || undefined,
      employeeName: selectedEmployee ? selectedEmployee.name : undefined,
      paymentMethod,
      paymentAccount,
      transactionRef: transactionRef.trim() || undefined,
      receiptImage: receiptImage || undefined,
      paymentScreenshot: paymentScreenshot || undefined,
      status: 'Paid',
      notes: notes.trim() || undefined,
      createdAt: editingExpense ? editingExpense.createdAt : new Date().toISOString(),
    }

    // Clone DB objects for mutation
    let updatedExpenses = [...db.expenses]
    let updatedEmployees = [...(db.employees || [])]
    let updatedAccounts = db.accounts.map((acc) => ({ ...acc }))

    // 1. If Editing: Revert previous account deduction and previous employee linkages
    if (editingExpense) {
      // Revert old account balance
      const oldAcc = updatedAccounts.find((a) => a.id === editingExpense.paymentAccount)
      if (oldAcc) {
        oldAcc.balance += editingExpense.amount
        oldAcc.updatedAt = new Date().toISOString().slice(0, 10)
      }

      // Revert old employee linking if it existed
      if (editingExpense.employeeId) {
        updatedEmployees = updatedEmployees.map((emp) => {
          if (emp.id === editingExpense.employeeId) {
            let updatedSalaryHistory = emp.salaryHistory.filter((s) => !s.receiptNumber.includes(editingExpense.expenseNumber))
            let updatedLoans = emp.loans.filter((l) => l.reason !== editingExpense.description)
            let newLoanBal = emp.totalLoanBalance
            if (editingExpense.category.includes('Loan') || editingExpense.category.includes('Advance')) {
              newLoanBal = Math.max(0, (emp.totalLoanBalance || 0) - editingExpense.amount)
            }
            return {
              ...emp,
              salaryHistory: updatedSalaryHistory,
              loans: updatedLoans,
              totalLoanBalance: newLoanBal,
            }
          }
          return emp
        })
      }

      // Replace expense in array
      updatedExpenses = updatedExpenses.map((exp) => (exp.id === editingExpense.id ? updatedExpense : exp))
    } else {
      // New Expense
      updatedExpenses = [updatedExpense, ...updatedExpenses]
    }

    // 2. Deduct new amount from selected account
    const targetAccount = updatedAccounts.find((a) => a.id === paymentAccount)
    if (targetAccount) {
      targetAccount.balance -= numericAmount
      targetAccount.updatedAt = new Date().toISOString().slice(0, 10)
    }

    // 3. Universal Employee Profile Auto-Linking
    if (selectedEmployeeId) {
      updatedEmployees = updatedEmployees.map((emp) => {
        if (emp.id === selectedEmployeeId) {
          const empCopy = { ...emp }

          // Auto-create Salary Payment Record
          if (finalCategory === 'Salaries') {
            const salaryRec: SalaryPaymentRecord = {
              id: `sal-${Date.now()}`,
              receiptNumber: `SAL-${updatedExpense.expenseNumber}`,
              month: salaryMonth || new Date(expenseDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
              paymentDate: expenseDate,
              baseSalary: emp.baseSalary,
              allowances: emp.totalAllowances || 0,
              netPayable: numericAmount,
              amountPaid: numericAmount,
              paymentMethod: paymentMethod === 'Card' ? 'Online' : paymentMethod,
              paymentAccount,
              paymentScreenshot: paymentScreenshot || receiptImage || undefined,
              status: 'Paid',
              notes: `${description} | Recorded via Expenses module`,
              createdAt: new Date().toISOString(),
            }
            empCopy.salaryHistory = [salaryRec, ...empCopy.salaryHistory]
            empCopy.currentSalaryStatus = 'Paid'
            empCopy.lastSalaryPaidDate = expenseDate
            empCopy.updatedAt = new Date().toISOString().slice(0, 10)
          }

          // Auto-create Loan / Advance Record
          if (finalCategory === 'Loan/Advance to employee' || finalCategory === 'Loan/Advance') {
            const loanRec: LoanAdvanceRecord = {
              id: `loan-${Date.now()}`,
              date: expenseDate,
              amount: numericAmount,
              type: 'Salary Advance',
              reason: description || 'Advance payment recorded in Expenses',
              remainingBalance: numericAmount,
              status: 'Active',
              createdAt: new Date().toISOString(),
            }
            empCopy.loans = [loanRec, ...empCopy.loans]
            empCopy.totalLoanBalance = (empCopy.totalLoanBalance || 0) + numericAmount
            empCopy.updatedAt = new Date().toISOString().slice(0, 10)
          }

          return empCopy
        }
        return emp
      })
    }

    // Save entire state
    onSaveDatabase({
      ...db,
      expenses: updatedExpenses,
      employees: updatedEmployees,
      accounts: updatedAccounts,
    })

    setIsModalOpen(false)
  }

  // Delete Expense Confirmation
  const handleConfirmDelete = () => {
    if (!deletingExpense) return

    let updatedAccounts = db.accounts.map((a) => ({ ...a }))
    // Refund account
    const acc = updatedAccounts.find((a) => a.id === deletingExpense.paymentAccount)
    if (acc) {
      acc.balance += deletingExpense.amount
      acc.updatedAt = new Date().toISOString().slice(0, 10)
    }

    // Clean linked employee record if any
    let updatedEmployees = [...(db.employees || [])]
    if (deletingExpense.employeeId) {
      updatedEmployees = updatedEmployees.map((emp) => {
        if (emp.id === deletingExpense.employeeId) {
          const newSalaryHistory = emp.salaryHistory.filter((s) => !s.receiptNumber.includes(deletingExpense.expenseNumber))
          const newLoans = emp.loans.filter((l) => l.reason !== deletingExpense.description)
          let newLoanBal = emp.totalLoanBalance
          if (deletingExpense.category.includes('Loan') || deletingExpense.category.includes('Advance')) {
            newLoanBal = Math.max(0, (emp.totalLoanBalance || 0) - deletingExpense.amount)
          }
          return {
            ...emp,
            salaryHistory: newSalaryHistory,
            loans: newLoans,
            totalLoanBalance: newLoanBal,
          }
        }
        return emp
      })
    }

    const updatedExpenses = db.expenses.filter((e) => e.id !== deletingExpense.id)

    onSaveDatabase({
      ...db,
      expenses: updatedExpenses,
      employees: updatedEmployees,
      accounts: updatedAccounts,
    })

    setDeletingExpense(null)
  }

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = ['Voucher #', 'Date', 'Category', 'Description', 'Amount (PKR)', 'Paid To', 'Linked Employee', 'Payment Method', 'Account', 'Ref #']
    const rows = filteredExpenses.map((exp) => [
      exp.expenseNumber || exp.id,
      exp.date,
      exp.category,
      exp.description,
      exp.amount,
      exp.paidTo || '',
      exp.employeeName || '',
      exp.paymentMethod,
      exp.paymentAccount,
      exp.transactionRef || '',
    ])
    exportToCSV(`AL_FAROOQ_FOODS_Expenses_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  // Handle Receipt Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isScreenshot: boolean) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      if (isScreenshot) {
        setPaymentScreenshot(base64)
      } else {
        setReceiptImage(base64)
      }
    } catch (err) {
      console.error('File upload error', err)
      alert('Could not process image file.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-lime-100 flex items-center justify-center text-lime-700">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900">Factory & Business Expenses</h1>
              <p className="text-xs text-stone-500">Record, track, categorize, and auto-link operational vouchers & salaries</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
            title="Export filtered list to Excel/CSV"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => handleOpenCreate()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-lime-600 hover:bg-lime-700 text-white shadow-sm transition"
            id="btn-add-expense"
          >
            <Plus className="w-4 h-4" />
            Add Expense Record
          </button>
        </div>
      </div>

      {/* Monthly Summary & KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total This Month */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 font-medium uppercase tracking-wider">Expenses (This Month)</span>
            <div className="text-2xl font-bold text-stone-900 mt-1">{formatPKR(stats.totalThisMonth)}</div>
            <span className="text-xs text-stone-400 mt-0.5 inline-block">All factory operational costs</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Today's Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 font-medium uppercase tracking-wider">Today&apos;s Expenses</span>
            <div className="text-2xl font-bold text-stone-900 mt-1">{formatPKR(stats.totalToday)}</div>
            <span className="text-xs text-stone-400 mt-0.5 inline-block">Recorded on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Salaries Disbursed */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 font-medium uppercase tracking-wider">Salaries Paid (This Month)</span>
            <div className="text-2xl font-bold text-stone-900 mt-1">{formatPKR(stats.salariesThisMonth)}</div>
            <span className="text-xs text-stone-400 mt-0.5 inline-block">Auto-linked to Employee profiles</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Loans & Advances */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 font-medium uppercase tracking-wider">Loans / Advances</span>
            <div className="text-2xl font-bold text-stone-900 mt-1">{formatPKR(stats.loansThisMonth)}</div>
            <span className="text-xs text-stone-400 mt-0.5 inline-block">Staff advance deductions ledger</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Banknote className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Category Breakdown Badges */}
      {stats.sortedCategories.length > 0 && (
        <div className="bg-stone-50 border border-stone-200/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">This Month&apos;s Expense Distribution</span>
            <span className="text-xs text-stone-500 font-medium">{stats.sortedCategories.length} active categories</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.sortedCategories.map(([cat, total]) => {
              const percent = stats.totalThisMonth > 0 ? Math.round((total / stats.totalThisMonth) * 100) : 0
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === cat ? 'All' : cat)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    selectedCategoryFilter === cat
                      ? 'bg-lime-600 text-white border-lime-600 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[11px] ${selectedCategoryFilter === cat ? 'bg-lime-700 text-lime-100' : 'bg-stone-100 text-stone-600'}`}>
                    {formatPKR(total)} ({percent}%)
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search voucher #, description, payee, or notes..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
            >
              <option value="All">All Categories</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
            >
              <option value="this_month">This Month</option>
              <option value="this_week">This Week</option>
              <option value="today">Today Only</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
            >
              <option value="All">All Payment Methods</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Online">Online / Raast</option>
              <option value="Cheque">Cheque</option>
              <option value="Card">Card</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expense List Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-stone-800">Expense Vouchers & Ledger</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-600">
              {filteredExpenses.length} records
            </span>
          </div>
          <div className="text-xs font-semibold text-stone-600">
            Filtered Total:{' '}
            <span className="text-stone-900 font-bold text-sm">
              {formatPKR(filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0))}
            </span>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-16 text-center text-stone-500">
            <Receipt className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-stone-700">No expenses found</p>
            <p className="text-xs text-stone-400 mt-1">Try adjusting your filters or click below to record an expense</p>
            <button
              onClick={() => handleOpenCreate()}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lime-600 hover:bg-lime-700 text-white text-xs font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                  <th className="py-3 px-4">Voucher / Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description / Particulars</th>
                  <th className="py-3 px-4">Paid To / Employee</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount (PKR)</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-stone-50/80 transition">
                    {/* Voucher / Date */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{exp.expenseNumber || exp.id}</div>
                      <div className="text-[11px] text-stone-500">{formatDate(exp.date)}</div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                        exp.category === 'Salaries'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : exp.category.includes('Loan')
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : exp.category === 'Factory Electricity' || exp.category === 'Bills/Utilities'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : exp.category === 'Rent' || exp.category === 'Factory Rent'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {exp.category}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-stone-900 line-clamp-1">{exp.description}</div>
                      {exp.notes && <div className="text-[11px] text-stone-500 line-clamp-1 italic">{exp.notes}</div>}
                    </td>

                    {/* Paid To / Linked Employee */}
                    <td className="py-3 px-4">
                      {exp.employeeName ? (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-lime-600 shrink-0" />
                          <div>
                            <span className="font-semibold text-lime-800 hover:underline cursor-pointer" onClick={() => onNavigate && onNavigate('employees')}>
                              {exp.employeeName}
                            </span>
                            <span className="text-[10px] block text-stone-400">Employee Profile</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-stone-700 font-medium">{exp.paidTo || '—'}</span>
                      )}
                    </td>

                    {/* Payment Method & Account */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-stone-900">{exp.paymentMethod}</div>
                      <div className="text-[11px] text-stone-500 capitalize">
                        {exp.paymentAccount === 'cash-in-hand'
                          ? 'Cash Register'
                          : exp.paymentAccount === 'meezan-bank'
                          ? 'Meezan Bank'
                          : 'HBL Bank'}
                      </div>
                      {exp.transactionRef && <div className="text-[10px] text-stone-400 font-mono">Ref: {exp.transactionRef}</div>}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-sm text-stone-900">{formatPKR(exp.amount)}</span>
                    </td>

                    {/* Receipt Image / Proof */}
                    <td className="py-3 px-4 text-center">
                      {exp.receiptImage || exp.paymentScreenshot ? (
                        <button
                          onClick={() =>
                            setPreviewImage({
                              src: exp.receiptImage || exp.paymentScreenshot || '',
                              title: `Receipt for ${exp.expenseNumber || exp.id} - ${exp.category}`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-lime-50 hover:bg-lime-100 text-lime-700 border border-lime-200 transition"
                          title="View receipt/screenshot"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      ) : (
                        <span className="text-stone-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => generateExpenseVoucherPDF(exp)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition"
                          title="Print / Download PDF Voucher"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit expense"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingExpense(exp)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-lime-400" />
                <div>
                  <h3 className="font-bold text-base">{editingExpense ? 'Edit Expense Record' : 'Record Business Expense'}</h3>
                  <p className="text-xs text-stone-400">Post operational expenses, utilities, and auto-linked payroll vouchers</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Voucher # */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Voucher / Expense #</label>
                  <input
                    type="text"
                    required
                    value={expenseNumber}
                    onChange={(e) => setExpenseNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 font-mono bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                  />
                </div>
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Expense Category / Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => {
                    setExpenseCategory(e.target.value)
                    if (e.target.value !== 'Salaries' && !e.target.value.includes('Loan')) {
                      // reset employee if normal category
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} {cat === 'Salaries' ? '⭐ (Auto-links to Employee Profile)' : ''}
                    </option>
                  ))}
                  <option value="Other">+ Custom Category (Type below)</option>
                </select>
              </div>

              {/* Custom Category Input */}
              {expenseCategory === 'Other' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Custom Category Name</label>
                  <input
                    type="text"
                    required
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="e.g. Legal Fees, ISO Certification, etc."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                  />
                </div>
              )}

              {/* SPECIAL EMPLOYEE LINKAGE BOX IF SALARIES OR LOANS */}
              {(expenseCategory === 'Salaries' || expenseCategory.includes('Loan') || expenseCategory.includes('Advance')) && (
                <div className="p-4 rounded-xl bg-lime-50 border border-lime-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-lime-700" />
                    <span className="text-xs font-bold text-lime-900">
                      {expenseCategory === 'Salaries'
                        ? 'Universal Profile Linking: Select Employee for Salary Payment'
                        : 'Universal Profile Linking: Select Employee for Loan / Advance'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-lime-800 mb-1">
                        Employee Profile <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={selectedEmployeeId}
                        onChange={(e) => handleEmployeeSelect(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-lime-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-lime-500"
                      >
                        <option value="">-- Choose Employee --</option>
                        {db.employees?.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.role} - Base: {formatPKR(emp.baseSalary)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {expenseCategory === 'Salaries' && (
                      <div>
                        <label className="block text-[11px] font-bold text-lime-800 mb-1">Salary Month</label>
                        <input
                          type="text"
                          value={salaryMonth}
                          onChange={(e) => setSalaryMonth(e.target.value)}
                          placeholder="e.g. August 2026"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-lime-300 bg-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                        />
                      </div>
                    )}
                  </div>

                  {selectedEmployee && (
                    <div className="text-[11px] text-lime-900 bg-white/80 p-2.5 rounded-lg border border-lime-200 flex items-center justify-between">
                      <div>
                        <strong>{selectedEmployee.name}</strong> • {selectedEmployee.department}
                        <span className="block text-stone-500 text-[10px]">
                          Base: {formatPKR(selectedEmployee.baseSalary)} | Allowances: {formatPKR(selectedEmployee.totalAllowances || 0)}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-emerald-100 text-emerald-800">
                        {expenseCategory === 'Salaries' ? 'Auto-updates to PAID' : `Existing Loan: ${formatPKR(selectedEmployee.totalLoanBalance || 0)}`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Description / Particulars <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 3-Phase Factory electricity WAPDA bill for packaging plant"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                />
              </div>

              {/* Amount & Paid To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Amount (PKR) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">Rs.</span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 text-sm font-bold rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Paid To (Vendor / Person / Dept)</label>
                  <input
                    type="text"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    placeholder="e.g. IESCO / PSO / Pakistan State Oil"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                  />
                </div>
              </div>

              {/* Payment Method & Payment Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Online">Online / Raast</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Card">Debit / Credit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Deduct From Account</label>
                  <select
                    value={paymentAccount}
                    onChange={(e) => setPaymentAccount(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                  >
                    {db.accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Bal: {formatPKR(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transaction Ref */}
              {(paymentMethod === 'Bank Transfer' || paymentMethod === 'Online' || paymentMethod === 'Cheque') && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Transaction Ref # / Cheque #</label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. TR-982138 or CHQ-001928"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 font-mono"
                  />
                </div>
              )}

              {/* Upload Receipt & Online Screenshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Bill / Receipt Image */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Attached Receipt / Bill Image (Optional)</label>
                  <input
                    type="file"
                    ref={receiptInputRef}
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, false)}
                    className="hidden"
                  />
                  {receiptImage ? (
                    <div className="relative border border-stone-200 rounded-xl p-2 bg-stone-50 flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img src={receiptImage} alt="Receipt" className="w-10 h-10 object-cover rounded-lg" />
                        <span className="text-xs text-stone-700 font-medium truncate">Receipt Attached</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ src: receiptImage, title: 'Bill / Receipt' })}
                          className="p-1 text-stone-500 hover:text-stone-800"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setReceiptImage('')} className="p-1 text-red-500 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => receiptInputRef.current?.click()}
                      className="w-full border border-dashed border-stone-300 hover:border-lime-500 rounded-xl p-3 text-center bg-stone-50 hover:bg-lime-50/50 transition flex flex-col items-center justify-center gap-1"
                    >
                      <Upload className="w-4 h-4 text-stone-400" />
                      <span className="text-xs font-medium text-stone-600">Upload Receipt / Bill Photo</span>
                    </button>
                  )}
                </div>

                {/* Online Screenshot */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Online Payment Screenshot (Optional)</label>
                  <input
                    type="file"
                    ref={screenshotInputRef}
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, true)}
                    className="hidden"
                  />
                  {paymentScreenshot ? (
                    <div className="relative border border-stone-200 rounded-xl p-2 bg-stone-50 flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img src={paymentScreenshot} alt="Screenshot" className="w-10 h-10 object-cover rounded-lg" />
                        <span className="text-xs text-stone-700 font-medium truncate">Screenshot Attached</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ src: paymentScreenshot, title: 'Payment Screenshot' })}
                          className="p-1 text-stone-500 hover:text-stone-800"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setPaymentScreenshot('')} className="p-1 text-red-500 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => screenshotInputRef.current?.click()}
                      className="w-full border border-dashed border-stone-300 hover:border-lime-500 rounded-xl p-3 text-center bg-stone-50 hover:bg-lime-50/50 transition flex flex-col items-center justify-center gap-1"
                    >
                      <Upload className="w-4 h-4 text-stone-400" />
                      <span className="text-xs font-medium text-stone-600">Upload Bank / Raast Proof</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Internal Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional audit or factory remarks..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-lime-600 hover:bg-lime-700 text-white shadow-sm transition"
                >
                  {editingExpense ? 'Save Changes' : 'Record & Deduct Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-stone-900">Delete Expense Record?</h3>
              <p className="text-xs text-stone-500 mt-1">
                Are you sure you want to delete <strong className="text-stone-800">{deletingExpense.expenseNumber || deletingExpense.id}</strong> (
                {formatPKR(deletingExpense.amount)})?
              </p>
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg mt-2.5 border border-amber-200">
                This will refund <strong>{formatPKR(deletingExpense.amount)}</strong> back into{' '}
                <span className="capitalize">{deletingExpense.paymentAccount}</span> and remove any linked employee payroll entry.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingExpense(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700"
              >
                Keep Record
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                Yes, Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE ZOOM / PREVIEW MODAL */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-2xl w-full p-4 overflow-hidden shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h4 className="font-bold text-sm text-stone-900">{previewImage.title}</h4>
              <button onClick={() => setPreviewImage(null)} className="text-stone-400 hover:text-stone-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 flex items-center justify-center bg-stone-900/5 rounded-xl my-2 max-h-[70vh] overflow-auto">
              <img src={previewImage.src} alt={previewImage.title} className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm" />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
