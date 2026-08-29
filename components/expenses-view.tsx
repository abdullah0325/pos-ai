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
  FolderTree,
  Tag,
  Palette,
  RotateCw,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  defaultExpenseCategories,
  type AppDatabase,
  type ExpenseItem,
  type ExpenseCategory,
  type CategoryItem,
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

export const EXPENSE_CATEGORY_COLORS = [
  { id: 'amber', label: 'Amber / Orange (Utilities & Electricity)', class: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  { id: 'orange', label: 'Orange (Fuel & Transport)', class: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  { id: 'rose', label: 'Rose / Red (Rent & Facility)', class: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500' },
  { id: 'teal', label: 'Teal (Maintenance & Repairs)', class: 'bg-teal-100 text-teal-800 border-teal-200', dot: 'bg-teal-500' },
  { id: 'sky', label: 'Sky / Cyan (Logistics & Freight)', class: 'bg-sky-100 text-sky-800 border-sky-200', dot: 'bg-sky-500' },
  { id: 'stone', label: 'Stone / Gray (Admin & Misc)', class: 'bg-stone-100 text-stone-800 border-stone-200', dot: 'bg-stone-500' },
  { id: 'emerald', label: 'Emerald / Green (Salaries & Payroll)', class: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'purple', label: 'Purple (Loans & Advances)', class: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
  { id: 'blue', label: 'Blue (Marketing & Promotion)', class: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  { id: 'indigo', label: 'Indigo (Legal & Compliance)', class: 'bg-indigo-100 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500' },
]

export function getExpenseCategoryBadgeClass(categoryName: string, expenseCategories?: CategoryItem[]) {
  const cat = (categoryName || '').trim().toLowerCase()
  const matched = expenseCategories?.find((c) => c.name.toLowerCase() === cat)
  const color = matched?.color?.toLowerCase()

  if (color === 'amber') return 'bg-amber-100 text-amber-800 border-amber-200'
  if (color === 'orange') return 'bg-orange-100 text-orange-800 border-orange-200'
  if (color === 'rose' || color === 'red') return 'bg-rose-100 text-rose-800 border-rose-200'
  if (color === 'teal') return 'bg-teal-100 text-teal-800 border-teal-200'
  if (color === 'sky' || color === 'cyan') return 'bg-sky-100 text-sky-800 border-sky-200'
  if (color === 'stone' || color === 'gray') return 'bg-stone-100 text-stone-800 border-stone-200'
  if (color === 'emerald' || color === 'green') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (color === 'purple') return 'bg-purple-100 text-purple-800 border-purple-200'
  if (color === 'blue') return 'bg-blue-100 text-blue-800 border-blue-200'
  if (color === 'indigo') return 'bg-indigo-100 text-indigo-800 border-indigo-200'

  // Default color fallbacks based on name
  if (cat.includes('salar') || cat.includes('wage')) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (cat.includes('loan') || cat.includes('advance')) return 'bg-purple-100 text-purple-800 border-purple-200'
  if (cat.includes('utilit') || cat.includes('elect') || cat.includes('wapda') || cat.includes('gas') || cat.includes('bill')) {
    return 'bg-amber-100 text-amber-800 border-amber-200'
  }
  if (cat.includes('rent')) return 'bg-rose-100 text-rose-800 border-rose-200'
  if (cat.includes('maint') || cat.includes('repair')) return 'bg-teal-100 text-teal-800 border-teal-200'
  if (cat.includes('fuel') || cat.includes('petrol') || cat.includes('diesel') || cat.includes('transport') || cat.includes('freight')) {
    return 'bg-orange-100 text-orange-800 border-orange-200'
  }
  if (cat.includes('market') || cat.includes('ad')) return 'bg-blue-100 text-blue-800 border-blue-200'

  return 'bg-stone-100 text-stone-700 border-stone-200'
}

export function getExpenseCategoryDotClass(categoryName: string, expenseCategories?: CategoryItem[]) {
  const cat = (categoryName || '').trim().toLowerCase()
  const matched = expenseCategories?.find((c) => c.name.toLowerCase() === cat)
  const color = matched?.color?.toLowerCase()

  const found = EXPENSE_CATEGORY_COLORS.find((c) => c.id === color)
  if (found) return found.dot

  if (cat.includes('salar') || cat.includes('wage')) return 'bg-emerald-500'
  if (cat.includes('loan') || cat.includes('advance')) return 'bg-purple-500'
  if (cat.includes('utilit') || cat.includes('elect') || cat.includes('wapda') || cat.includes('gas') || cat.includes('bill')) return 'bg-amber-500'
  if (cat.includes('rent')) return 'bg-rose-500'
  if (cat.includes('maint') || cat.includes('repair')) return 'bg-teal-500'
  if (cat.includes('fuel') || cat.includes('petrol') || cat.includes('diesel') || cat.includes('transport')) return 'bg-orange-500'
  if (cat.includes('market') || cat.includes('ad')) return 'bg-blue-500'

  return 'bg-stone-500'
}

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  'Factory Utilities',
  'Fuel/Diesel',
  'Rent',
  'Maintenance',
  'Transport/Freight',
  'Office Expenses',
  'Salaries',
  'Loan/Advance to employee',
  'Marketing',
  'Daily/Misc',
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
  const [isManagingCategories, setIsManagingCategories] = useState(false)
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
  const [markRemainingAsPending, setMarkRemainingAsPending] = useState<boolean>(true)
  const [isRecurring, setIsRecurring] = useState<boolean>(false)

  const receiptInputRef = useRef<HTMLInputElement>(null)
  const screenshotInputRef = useRef<HTMLInputElement>(null)

  // Category classification helpers
  const isSalaryCategory = (cat: string) => {
    const c = (cat || '').trim().toLowerCase()
    return c === 'salaries' || c === 'salary' || c === 'payroll' || (c.includes('salary') && !c.includes('advance') && !c.includes('loan'))
  }

  const isLoanCategory = (cat: string) => {
    const c = (cat || '').trim().toLowerCase()
    return c.includes('loan') || c.includes('advance')
  }

  // Active Category Items list
  const currentCategories: CategoryItem[] = useMemo(() => {
    return db.expenseCategories && db.expenseCategories.length > 0
      ? db.expenseCategories
      : defaultExpenseCategories
  }, [db.expenseCategories])

  // Extract unique categories (defaults + existing in db)
  const allCategories = useMemo(() => {
    const set = new Set<string>()
    currentCategories.forEach((c) => set.add(c.name))
    db.expenses.forEach((e) => {
      if (e.category) set.add(e.category)
    })
    return Array.from(set)
  }, [currentCategories, db.expenses])

  // Selected Employee object
  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null
    return db.employees?.find((e) => e.id === selectedEmployeeId) || null
  }, [db.employees, selectedEmployeeId])

  // Last recorded expense in current category (for reference note)
  const lastRecordedExpenseForCategory = useMemo(() => {
    const cat = (expenseCategory === 'Other' && customCategoryInput.trim() ? customCategoryInput.trim() : expenseCategory).trim().toLowerCase()
    if (!cat) return null
    return (
      db.expenses
        .filter((e) => e.id !== editingExpense?.id && (e.category || '').trim().toLowerCase() === cat)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null
    )
  }, [db.expenses, expenseCategory, customCategoryInput, editingExpense])

  // Total default payable for selected employee
  const selectedEmpTotalPayable = useMemo(() => {
    if (!selectedEmployee) return 0
    return (selectedEmployee.baseSalary || 0) + (selectedEmployee.totalAllowances || 0)
  }, [selectedEmployee])

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
    setMarkRemainingAsPending(true)
    setIsRecurring(false)
    setSalaryMonth(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
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
    setMarkRemainingAsPending(true)
    setIsRecurring(!!exp.isRecurring)
    setSalaryMonth(exp.salaryMonth || new Date(exp.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
    setIsModalOpen(true)
  }

  // Handle Employee Change in modal
  const handleEmployeeSelect = (empId: string) => {
    setSelectedEmployeeId(empId)
    const emp = db.employees?.find((e) => e.id === empId)
    if (emp) {
      setPaidTo(emp.name)
      if (isSalaryCategory(expenseCategory)) {
        const totalPay = (emp.baseSalary || 0) + (emp.totalAllowances || 0)
        setAmount(totalPay)
        setDescription(`Monthly Salary for ${emp.name} (${salaryMonth}) - ${emp.role}`)
      } else if (isLoanCategory(expenseCategory)) {
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
    const isSalary = isSalaryCategory(finalCategory)
    const isLoan = isLoanCategory(finalCategory)

    // Validation for Employee Linkage
    if (isSalary && !selectedEmployeeId) {
      alert('Please select an Employee profile for Salary payments to ensure universal employee profile auto-linking.')
      return
    }
    if (isLoan && !selectedEmployeeId) {
      alert('Please select an Employee profile to link this loan/advance.')
      return
    }

    const newExpenseId = editingExpense ? editingExpense.id : `exp-${Date.now()}`
    const empName = selectedEmployee ? selectedEmployee.name : paidTo

    // Calculate Salary breakdown
    const defaultMonthlyTotal = selectedEmployee ? (selectedEmployee.baseSalary || 0) + (selectedEmployee.totalAllowances || 0) : numericAmount
    const pendingSalaryBal = isSalary && markRemainingAsPending ? Math.max(0, defaultMonthlyTotal - numericAmount) : 0
    const isFullSalary = isSalary ? pendingSalaryBal === 0 : true

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
      salaryMonth: isSalary ? salaryMonth : undefined,
      baseSalary: isSalary ? defaultMonthlyTotal : undefined,
      pendingSalaryBalance: isSalary && pendingSalaryBal > 0 ? pendingSalaryBal : undefined,
      isRecurring: isRecurring || undefined,
      paymentMethod,
      paymentAccount,
      transactionRef: transactionRef.trim() || undefined,
      receiptImage: receiptImage || undefined,
      paymentScreenshot: paymentScreenshot || undefined,
      status: isSalary ? (isFullSalary ? 'Paid' : 'Partial') : 'Paid',
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
            const updatedSalaryHistory = emp.salaryHistory.filter(
              (s) => !s.receiptNumber.includes(editingExpense.expenseNumber) && s.id !== `sal-${editingExpense.id}`
            )
            const updatedLoans = emp.loans.filter((l) => l.reason !== editingExpense.description)
            let newLoanBal = emp.totalLoanBalance
            if (isLoanCategory(editingExpense.category)) {
              newLoanBal = Math.max(0, (emp.totalLoanBalance || 0) - editingExpense.amount)
            }
            return {
              ...emp,
              salaryHistory: updatedSalaryHistory,
              loans: updatedLoans,
              totalLoanBalance: newLoanBal,
              currentSalaryStatus: emp.salaryHistory.length > 1 ? emp.currentSalaryStatus : 'Pending',
              pendingSalaryAmount: undefined,
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
          if (isSalary) {
            const salaryRec: SalaryPaymentRecord = {
              id: `sal-${Date.now()}`,
              receiptNumber: `SAL-${updatedExpense.expenseNumber}`,
              month: salaryMonth || new Date(expenseDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
              paymentDate: expenseDate,
              baseSalary: emp.baseSalary,
              allowances: emp.totalAllowances || 0,
              netPayable: defaultMonthlyTotal,
              amountPaid: numericAmount,
              pendingBalance: pendingSalaryBal > 0 ? pendingSalaryBal : undefined,
              paymentMethod: paymentMethod === 'Card' ? 'Online' : paymentMethod,
              paymentAccount,
              paymentScreenshot: paymentScreenshot || receiptImage || undefined,
              status: isFullSalary ? 'Paid' : (numericAmount > 0 ? 'Partial' : 'Pending'),
              notes: `${description} | Recorded via Expenses module${pendingSalaryBal > 0 ? ` (Pending Balance: Rs. ${pendingSalaryBal.toLocaleString()})` : ''}`,
              createdAt: new Date().toISOString(),
            }
            empCopy.salaryHistory = [salaryRec, ...empCopy.salaryHistory]
            empCopy.currentSalaryStatus = isFullSalary ? 'Paid' : 'Partial'
            empCopy.pendingSalaryAmount = pendingSalaryBal > 0 ? pendingSalaryBal : undefined
            empCopy.lastSalaryPaidDate = expenseDate
            empCopy.updatedAt = new Date().toISOString().slice(0, 10)
          }

          // Auto-create Loan / Advance Record
          if (isLoan) {
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
            onClick={() => setIsManagingCategories(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
            title="Manage expense category names and colors"
          >
            <FolderTree className="w-4 h-4 text-stone-500" />
            Manage Categories
          </button>
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
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getExpenseCategoryBadgeClass(exp.category, currentCategories)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getExpenseCategoryDotClass(exp.category, currentCategories)}`} />
                          {exp.category}
                        </span>
                        {exp.isRecurring && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                            <RotateCw className="w-2.5 h-2.5" /> Recurring
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-stone-900 line-clamp-1">{exp.description}</div>
                      {exp.salaryMonth && <div className="text-[10px] font-semibold text-lime-700">Salary Month: {exp.salaryMonth}</div>}
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
                            <span className="text-[10px] block text-stone-400">
                              {exp.pendingSalaryBalance ? `Partial Paid (Bal: ${formatPKR(exp.pendingSalaryBalance)})` : 'Employee Profile'}
                            </span>
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
                      {exp.pendingSalaryBalance && exp.pendingSalaryBalance > 0 ? (
                        <div className="text-[10px] font-semibold text-amber-700 mt-0.5">
                          Pending: {formatPKR(exp.pendingSalaryBalance)}
                        </div>
                      ) : null}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-700">
                    Expense Category / Type <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsManagingCategories(true)}
                    className="text-[11px] font-semibold text-lime-700 hover:text-lime-800 hover:underline inline-flex items-center gap-1"
                  >
                    <FolderTree className="w-3 h-3" /> Manage Categories
                  </button>
                </div>
                <select
                  value={expenseCategory}
                  onChange={(e) => {
                    setExpenseCategory(e.target.value)
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} {isSalaryCategory(cat) ? '⭐ (Auto-links to Employee Profile & Payroll)' : ''}
                    </option>
                  ))}
                  <option value="Other">+ Custom Category (Type below)</option>
                </select>

                {/* Last Recorded Expense Reference Note */}
                {lastRecordedExpenseForCategory && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50/90 px-3 py-1.5 rounded-xl border border-amber-200/80 mt-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">
                      <strong>Previous {lastRecordedExpenseForCategory.category} Record:</strong>{' '}
                      {formatPKR(lastRecordedExpenseForCategory.amount)} on {formatDate(lastRecordedExpenseForCategory.date)}{' '}
                      {lastRecordedExpenseForCategory.paidTo ? `(${lastRecordedExpenseForCategory.paidTo})` : ''}
                    </span>
                  </div>
                )}
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
                    placeholder="e.g. Legal Fees, ISO Certification, Factory Repairs, etc."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                  />
                </div>
              )}

              {/* SPECIAL EMPLOYEE LINKAGE BOX IF SALARIES OR LOANS */}
              {(isSalaryCategory(expenseCategory) || isLoanCategory(expenseCategory)) && (
                <div className="p-4 rounded-xl bg-lime-50 border border-lime-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-lime-700" />
                    <span className="text-xs font-bold text-lime-900">
                      {isSalaryCategory(expenseCategory)
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

                    {isSalaryCategory(expenseCategory) && (
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

                  {selectedEmployee && isSalaryCategory(expenseCategory) && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] text-lime-900 bg-white/90 p-2.5 rounded-lg border border-lime-200 flex items-center justify-between">
                        <div>
                          <strong>{selectedEmployee.name}</strong> • {selectedEmployee.department || selectedEmployee.role}
                          <span className="block text-stone-600 text-[10px] mt-0.5">
                            Base: {formatPKR(selectedEmployee.baseSalary)} + Allowances: {formatPKR(selectedEmployee.totalAllowances || 0)} ={' '}
                            <strong className="text-stone-900">Total Payable: {formatPKR(selectedEmpTotalPayable)}</strong>
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-emerald-100 text-emerald-800">
                          {Number(amount) >= selectedEmpTotalPayable ? 'Full Disbursal' : 'Partial Payment'}
                        </span>
                      </div>

                      {/* Partial Payment Notice & Toggle */}
                      {Number(amount) > 0 && Number(amount) < selectedEmpTotalPayable && (
                        <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              Paying {formatPKR(Number(amount))} of full {formatPKR(selectedEmpTotalPayable)}. Remaining balance is{' '}
                              <strong>{formatPKR(selectedEmpTotalPayable - Number(amount))}</strong>.
                            </span>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer text-[11px] text-amber-800">
                            <input
                              type="checkbox"
                              checked={markRemainingAsPending}
                              onChange={(e) => setMarkRemainingAsPending(e.target.checked)}
                              className="rounded text-amber-600 focus:ring-amber-500"
                            />
                            <span>Mark remaining balance ({formatPKR(selectedEmpTotalPayable - Number(amount))}) as Pending in Payroll</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedEmployee && isLoanCategory(expenseCategory) && (
                    <div className="text-[11px] text-lime-900 bg-white/80 p-2.5 rounded-lg border border-lime-200 flex items-center justify-between">
                      <div>
                        <strong>{selectedEmployee.name}</strong> • {selectedEmployee.role}
                      </div>
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-purple-100 text-purple-800">
                        Existing Loan Balance: {formatPKR(selectedEmployee.totalLoanBalance || 0)}
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

              {/* Recurring Monthly Expense Option */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100/70 transition">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-lime-600 rounded border-stone-300 focus:ring-lime-500"
                />
                <div>
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-stone-600" />
                    Mark as Recurring Monthly Expense
                  </span>
                  <span className="text-[11px] text-stone-500 block">
                    For regular monthly bills (Electricity, Factory Rent, Fuel/Diesel, Internet, Maintenance) to show reminders and comparison notes.
                  </span>
                </div>
              </label>

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

      {/* MANAGE EXPENSE CATEGORIES MODAL */}
      {isManagingCategories && (
        <ManageExpenseCategoriesModal
          categories={currentCategories}
          expenses={db.expenses}
          onClose={() => setIsManagingCategories(false)}
          onSave={(updatedCats) => {
            onSaveDatabase({
              ...db,
              expenseCategories: updatedCats,
            })
          }}
        />
      )}
    </div>
  )
}

/* =========================================================================
   MANAGE EXPENSE CATEGORIES MODAL COMPONENT
========================================================================= */
interface ManageExpenseCategoriesModalProps {
  categories: CategoryItem[]
  expenses: ExpenseItem[]
  onClose: () => void
  onSave: (updated: CategoryItem[]) => void
}

function ManageExpenseCategoriesModal({
  categories,
  expenses,
  onClose,
  onSave,
}: ManageExpenseCategoriesModalProps) {
  const [catList, setCatList] = useState<CategoryItem[]>(() =>
    categories.length > 0 ? [...categories] : [...defaultExpenseCategories]
  )

  // New Category Form State
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('amber')
  const [newDescription, setNewDescription] = useState('')
  const [searchFilter, setSearchFilter] = useState('')

  // Editing Category State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('amber')
  const [editDescription, setEditDescription] = useState('')

  // Count usage of each category in existing expense records
  const categoryUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    expenses.forEach((e) => {
      if (e.category) {
        counts[e.category.toLowerCase()] = (counts[e.category.toLowerCase()] || 0) + 1
      }
    })
    return counts
  }, [expenses])

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return

    // Check duplicate
    if (catList.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      alert(`A category named "${trimmed}" already exists.`)
      return
    }

    const newCat: CategoryItem = {
      id: `expcat-${Date.now()}`,
      name: trimmed,
      color: newColor,
      description: newDescription.trim() || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    }

    const updated = [...catList, newCat]
    setCatList(updated)
    onSave(updated)
    setNewName('')
    setNewDescription('')
    setNewColor('amber')
  }

  const handleStartEdit = (cat: CategoryItem) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color || 'amber')
    setEditDescription(cat.description || '')
  }

  const handleSaveEdit = (catId: string) => {
    const trimmed = editName.trim()
    if (!trimmed) return

    if (
      catList.some(
        (c) => c.id !== catId && c.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      alert(`Another category named "${trimmed}" already exists.`)
      return
    }

    const updated = catList.map((c) => {
      if (c.id === catId) {
        return {
          ...c,
          name: trimmed,
          color: editColor,
          description: editDescription.trim() || undefined,
        }
      }
      return c
    })

    setCatList(updated)
    onSave(updated)
    setEditingId(null)
  }

  const handleDeleteCategory = (catId: string, catName: string) => {
    const usage = categoryUsageCounts[catName.toLowerCase()] || 0
    let msg = `Are you sure you want to delete category "${catName}"?`
    if (usage > 0) {
      msg = `Category "${catName}" is currently used in ${usage} expense record(s).\n\nAre you sure you want to delete it from the categories list? Existing expense records will retain their text.`
    }

    if (confirm(msg)) {
      const updated = catList.filter((c) => c.id !== catId)
      setCatList(updated)
      onSave(updated)
    }
  }

  const handleResetDefaults = () => {
    if (confirm('Reset all expense categories to factory defaults? Any custom added categories will be reset.')) {
      setCatList([...defaultExpenseCategories])
      onSave([...defaultExpenseCategories])
    }
  }

  const filteredCategories = catList.filter((c) => {
    if (!searchFilter.trim()) return true
    const q = searchFilter.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    )
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-lime-500/20 text-lime-400 flex items-center justify-center">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Manage Expense Categories</h3>
              <p className="text-xs text-stone-400">
                Organize, color-code, and customize operational expense classifications
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Add New Category Box */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-lime-600" />
              Add New Expense Category
            </h4>
            <form onSubmit={handleAddCategory} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Generator Maintenance, Legal Fees"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Brief description of this expense type"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                  />
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-stone-500" /> Badge Color Theme
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXPENSE_CATEGORY_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewColor(c.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                        newColor === c.id
                          ? 'border-lime-600 bg-lime-50 text-lime-900 ring-2 ring-lime-500/20 shadow-xs'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${c.dot}`} />
                      <span className="capitalize">{c.id}</span>
                      {newColor === c.id && <Check className="w-3 h-3 text-lime-700" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lime-600 hover:bg-lime-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition"
                >
                  <Plus className="w-4 h-4" /> Save Category
                </button>
              </div>
            </form>
          </div>

          {/* List of Existing Categories */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  Active Expense Categories ({catList.length})
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search categories..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-lime-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 hover:underline px-2 py-1"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white">
              {filteredCategories.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs">No categories match your search.</div>
              ) : (
                filteredCategories.map((cat) => {
                  const isEditing = editingId === cat.id
                  const usage = categoryUsageCounts[cat.name.toLowerCase()] || 0

                  if (isEditing) {
                    return (
                      <div key={cat.id} className="p-3.5 bg-lime-50/40 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-stone-700 mb-1">Category Name</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-lime-300 bg-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-stone-700 mb-1">Description</label>
                            <input
                              type="text"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-lime-300 bg-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">Badge Color</label>
                          <div className="flex flex-wrap gap-1.5">
                            {EXPENSE_CATEGORY_COLORS.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setEditColor(c.id)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border transition ${
                                  editColor === c.id
                                    ? 'border-lime-600 bg-lime-100 text-lime-900 font-bold'
                                    : 'border-stone-200 bg-white text-stone-600'
                                }`}
                              >
                                <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                                <span className="capitalize">{c.id}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 text-xs rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(cat.id)}
                            className="px-3 py-1 text-xs rounded-lg bg-lime-600 hover:bg-lime-700 text-white font-semibold shadow-xs"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={cat.id} className="p-3 flex items-center justify-between gap-3 hover:bg-stone-50 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 ${getExpenseCategoryBadgeClass(cat.name, catList)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getExpenseCategoryDotClass(cat.name, catList)}`} />
                          {cat.name}
                        </span>
                        <div className="min-w-0">
                          {cat.description ? (
                            <p className="text-xs text-stone-500 truncate">{cat.description}</p>
                          ) : (
                            <p className="text-xs text-stone-300 italic">No description</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                          {usage} voucher{usage === 1 ? '' : 's'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit Category"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="bg-stone-50 p-4 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-900 hover:bg-stone-800 text-white shadow-xs transition"
          >
            Done & Close
          </button>
        </div>
      </div>
    </div>
  )
}
