'use client'

import { useState, useMemo, useRef } from 'react'
import {
  Users,
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
  Share2,
  Eye,
  Phone,
  Building,
  Upload,
  ArrowRight,
  ShieldCheck,
  Check,
  Briefcase,
  Layers,
  Banknote,
  Percent,
  Minus,
  Sparkles,
} from 'lucide-react'
import {
  formatPKR,
  formatDate,
  type AppDatabase,
  type EmployeeItem,
  type AttendanceRecord,
  type AttendanceStatus,
  type LoanAdvanceRecord,
  type SalaryPaymentRecord,
  type EmployeeAllowance,
  fileToBase64,
} from '@/lib/db'
import { generateSalarySlipPDF, exportToCSV } from '@/lib/pdf-export'

interface EmployeesViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
}

export default function EmployeesView({ db, onSaveDatabase }: EmployeesViewProps) {
  const employees = db.employees || []

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('All')
  const [shiftFilter, setShiftFilter] = useState<string>('All')
  const [salaryStatusFilter, setSalaryStatusFilter] = useState<'All' | 'Pending' | 'Paid'>('All')
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'loans' | 'payroll'>('employees')

  // Modals & Drawers
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null)
  const [viewingEmployee, setViewingEmployee] = useState<EmployeeItem | null>(null)
  const [profileTab, setProfileTab] = useState<'overview' | 'attendance' | 'loans' | 'salary'>('overview')

  // Payment / Disbursement Modal
  const [disbursingEmployee, setDisbursingEmployee] = useState<EmployeeItem | null>(null)
  const [salaryMonth, setSalaryMonth] = useState<string>(() => {
    const d = new Date()
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  })
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [basePayInput, setBasePayInput] = useState<number>(0)
  const [allowancePayInput, setAllowancePayInput] = useState<number>(0)
  const [overtimePayInput, setOvertimePayInput] = useState<number>(0)
  const [loanDeductInput, setLoanDeductInput] = useState<number>(0)
  const [absentDeductInput, setAbsentDeductInput] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Online' | 'Bank Transfer'>('Cash')
  const [paymentAccount, setPaymentAccount] = useState<'cash-in-hand' | 'meezan-bank' | 'hbl-bank'>('cash-in-hand')
  const [paymentScreenshot, setPaymentScreenshot] = useState<string>('')
  const [paymentNotes, setPaymentNotes] = useState<string>('')

  // Generated Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<{
    employee: EmployeeItem
    payment: SalaryPaymentRecord
  } | null>(null)

  // Loan Modal
  const [loaningEmployee, setLoaningEmployee] = useState<EmployeeItem | null>(null)
  const [loanAmount, setLoanAmount] = useState<number>(5000)
  const [loanType, setLoanType] = useState<'Loan' | 'Salary Advance'>('Salary Advance')
  const [loanReason, setLoanReason] = useState<string>('')
  const [loanAccount, setLoanAccount] = useState<'cash-in-hand' | 'meezan-bank' | 'hbl-bank'>('cash-in-hand')
  const [loanDate, setLoanDate] = useState<string>(() => new Date().toISOString().slice(0, 10))

  // Daily Attendance Date & Register
  const [attendanceDate, setAttendanceDate] = useState<string>(() => new Date().toISOString().slice(0, 10))

  // Image Zoom Modal
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Roles list for filter
  const uniqueRoles = useMemo(() => {
    const set = new Set<string>()
    employees.forEach((e) => {
      if (e.role) set.add(e.role)
    })
    return ['All', ...Array.from(set)]
  }, [employees])

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesQuery =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.phone.includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.id.toLowerCase().includes(q) ||
        (emp.cnic && emp.cnic.includes(q))

      const matchesRole = roleFilter === 'All' || emp.role === roleFilter
      const matchesShift = shiftFilter === 'All' || emp.shift === shiftFilter
      const matchesSalaryStatus =
        salaryStatusFilter === 'All' || emp.currentSalaryStatus === salaryStatusFilter

      return matchesQuery && matchesRole && matchesShift && matchesSalaryStatus
    })
  }, [employees, searchQuery, roleFilter, shiftFilter, salaryStatusFilter])

  // KPI Calculations
  const totalEmployees = employees.length
  const activeEmployees = employees.filter((e) => e.status === 'Active').length
  const totalMonthlyPayroll = employees.reduce(
    (sum, e) => sum + (e.baseSalary || 0) + (e.totalAllowances || 0),
    0
  )
  const pendingSalaryEmployees = employees.filter((e) => e.currentSalaryStatus === 'Pending')
  const totalPendingAmount = pendingSalaryEmployees.reduce(
    (sum, e) => sum + (e.baseSalary || 0) + (e.totalAllowances || 0) - (e.totalLoanBalance > 0 ? Math.min(e.totalLoanBalance, 5000) : 0),
    0
  )
  const totalActiveLoans = employees.reduce((sum, e) => sum + (e.totalLoanBalance || 0), 0)

  // Attendance stats for today
  const todayAttendance = useMemo(() => {
    let present = 0
    let absent = 0
    let offDay = 0
    let leave = 0
    employees.forEach((e) => {
      const rec = e.attendance?.find((a) => a.date === attendanceDate)
      if (rec?.status === 'Present') present++
      else if (rec?.status === 'Absent') absent++
      else if (rec?.status === 'Off-day') offDay++
      else if (rec?.status === 'Leave' || rec?.status === 'Half-day') leave++
    })
    return { present, absent, offDay, leave }
  }, [employees, attendanceDate])

  // Open Pay Salary Modal
  const handleOpenDisburse = (employee: EmployeeItem) => {
    setDisbursingEmployee(employee)
    setBasePayInput(employee.baseSalary || 0)
    setAllowancePayInput(employee.totalAllowances || 0)
    setOvertimePayInput(0)
    // Suggest loan deduction if employee has active loan balance
    const suggestedLoanDeduct = employee.totalLoanBalance > 0 ? Math.min(employee.totalLoanBalance, 10000) : 0
    setLoanDeductInput(suggestedLoanDeduct)
    setAbsentDeductInput(0)
    setPaymentMethod('Cash')
    setPaymentAccount('cash-in-hand')
    setPaymentScreenshot('')
    setPaymentNotes(`Monthly payroll disbursement for ${salaryMonth}`)
  }

  // Calculated Net Pay in modal
  const calculatedNetPay = Math.max(
    0,
    basePayInput + allowancePayInput + overtimePayInput - loanDeductInput - absentDeductInput
  )

  // Submit Salary Disbursement
  const handleConfirmDisburse = () => {
    if (!disbursingEmployee) return

    const receiptNum = `SAL-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(100 + Math.random() * 900))}`

    const newPaymentRecord: SalaryPaymentRecord = {
      id: `sal-${Date.now()}`,
      receiptNumber: receiptNum,
      month: salaryMonth,
      paymentDate: paymentDate,
      baseSalary: basePayInput,
      allowances: allowancePayInput,
      allowancesBreakdown: disbursingEmployee.allowances?.map((a) => ({
        name: a.name,
        amount: a.amount,
      })),
      overtimeBonus: overtimePayInput,
      loanDeduction: loanDeductInput,
      absentDeduction: absentDeductInput,
      netPayable: calculatedNetPay,
      amountPaid: calculatedNetPay,
      paymentMethod: paymentMethod,
      paymentAccount: paymentAccount,
      paymentScreenshot: paymentScreenshot || undefined,
      status: 'Paid',
      notes: paymentNotes,
      createdAt: new Date().toISOString(),
    }

    // Update Employee
    const updatedEmployees = employees.map((emp) => {
      if (emp.id !== disbursingEmployee.id) return emp

      const newLoanBal = Math.max(0, (emp.totalLoanBalance || 0) - loanDeductInput)
      const updatedLoans = (emp.loans || []).map((l) => {
        if (l.status === 'Active' && loanDeductInput > 0) {
          const rem = Math.max(0, l.remainingBalance - loanDeductInput)
          return { ...l, remainingBalance: rem, status: rem === 0 ? ('Settled' as const) : ('Active' as const) }
        }
        return l
      })

      return {
        ...emp,
        currentSalaryStatus: 'Paid' as const,
        lastSalaryPaidDate: paymentDate,
        totalLoanBalance: newLoanBal,
        loans: updatedLoans,
        salaryHistory: [newPaymentRecord, ...(emp.salaryHistory || [])],
        updatedAt: new Date().toISOString().slice(0, 10),
      }
    })

    // Deduct from chosen Account balance
    const updatedAccounts = db.accounts.map((acc) => {
      if (acc.id === paymentAccount) {
        return {
          ...acc,
          balance: acc.balance - calculatedNetPay,
          updatedAt: new Date().toISOString().slice(0, 10),
        }
      }
      return acc
    })

    // Record expense in factory expenses
    const newExpense = {
      id: `exp-${Date.now()}`,
      expenseNumber: `EXP-SAL-${receiptNum}`,
      date: paymentDate,
      category: 'Labor & Wages' as const,
      description: `Staff Salary: ${disbursingEmployee.name} (${disbursingEmployee.role}) - ${salaryMonth} [${receiptNum}]`,
      amount: calculatedNetPay,
      paidTo: disbursingEmployee.name,
      paymentMethod: paymentMethod === 'Bank Transfer' || paymentMethod === 'Online' ? ('Bank Transfer' as const) : ('Cash' as const),
      paymentAccount: paymentAccount,
      receiptImage: paymentScreenshot || undefined,
      status: 'Paid' as const,
      createdAt: new Date().toISOString(),
    }

    const updatedDb: AppDatabase = {
      ...db,
      employees: updatedEmployees,
      accounts: updatedAccounts,
      expenses: [newExpense, ...db.expenses],
    }

    onSaveDatabase(updatedDb)

    const updatedTargetEmp = updatedEmployees.find((e) => e.id === disbursingEmployee.id) || disbursingEmployee
    setActiveReceipt({
      employee: updatedTargetEmp,
      payment: newPaymentRecord,
    })

    setDisbursingEmployee(null)
  }

  // Handle Quick Attendance Update for an employee on selected date
  const handleSetAttendance = (empId: string, status: AttendanceStatus) => {
    const updatedEmployees = employees.map((emp) => {
      if (emp.id !== empId) return emp

      const existingRecs = emp.attendance || []
      const index = existingRecs.findIndex((a) => a.date === attendanceDate)

      let newAttendance: AttendanceRecord[]
      if (index >= 0) {
        newAttendance = existingRecs.map((a, i) =>
          i === index
            ? {
                ...a,
                status,
                checkInTime: status === 'Present' ? a.checkInTime || '08:00 AM' : undefined,
              }
            : a
        )
      } else {
        newAttendance = [
          ...existingRecs,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            date: attendanceDate,
            status,
            checkInTime: status === 'Present' ? '08:00 AM' : undefined,
          },
        ]
      }

      return {
        ...emp,
        attendance: newAttendance,
        updatedAt: new Date().toISOString().slice(0, 10),
      }
    })

    onSaveDatabase({ ...db, employees: updatedEmployees })
  }

  // Mark all active employees as Present for selected date
  const handleMarkAllPresent = () => {
    const updatedEmployees = employees.map((emp) => {
      if (emp.status !== 'Active') return emp

      const existingRecs = emp.attendance || []
      const index = existingRecs.findIndex((a) => a.date === attendanceDate)

      let newAttendance: AttendanceRecord[]
      if (index >= 0) {
        newAttendance = existingRecs.map((a, i) =>
          i === index ? { ...a, status: 'Present' as const, checkInTime: a.checkInTime || '08:00 AM' } : a
        )
      } else {
        newAttendance = [
          ...existingRecs,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            date: attendanceDate,
            status: 'Present' as const,
            checkInTime: '08:00 AM',
          },
        ]
      }

      return { ...emp, attendance: newAttendance }
    })

    onSaveDatabase({ ...db, employees: updatedEmployees })
  }

  // Confirm Give Loan / Advance
  const handleConfirmLoan = () => {
    if (!loaningEmployee || loanAmount <= 0) return

    const newLoanRecord: LoanAdvanceRecord = {
      id: `ln-${Date.now()}`,
      date: loanDate,
      amount: loanAmount,
      type: loanType,
      reason: loanReason || `${loanType} disbursed to employee`,
      remainingBalance: loanAmount,
      status: 'Active',
      createdAt: new Date().toISOString(),
    }

    const updatedEmployees = employees.map((emp) => {
      if (emp.id !== loaningEmployee.id) return emp

      return {
        ...emp,
        totalLoanBalance: (emp.totalLoanBalance || 0) + loanAmount,
        loans: [newLoanRecord, ...(emp.loans || [])],
        updatedAt: new Date().toISOString().slice(0, 10),
      }
    })

    // Deduct from account
    const updatedAccounts = db.accounts.map((acc) => {
      if (acc.id === loanAccount) {
        return {
          ...acc,
          balance: acc.balance - loanAmount,
          updatedAt: new Date().toISOString().slice(0, 10),
        }
      }
      return acc
    })

    // Expense item
    const newExpense = {
      id: `exp-${Date.now()}`,
      expenseNumber: `EXP-ADV-${Date.now().toString().slice(-4)}`,
      date: loanDate,
      category: 'Labor & Wages' as const,
      description: `Staff Advance/Loan Disbursed: ${loaningEmployee.name} (${loanType}) - ${loanReason || 'Advance'}`,
      amount: loanAmount,
      paidTo: loaningEmployee.name,
      paymentMethod: loanAccount === 'cash-in-hand' ? ('Cash' as const) : ('Bank Transfer' as const),
      paymentAccount: loanAccount,
      status: 'Paid' as const,
      createdAt: new Date().toISOString(),
    }

    onSaveDatabase({
      ...db,
      employees: updatedEmployees,
      accounts: updatedAccounts,
      expenses: [newExpense, ...db.expenses],
    })

    setLoaningEmployee(null)
    setLoanReason('')
  }

  // Delete Employee
  const handleDeleteEmployee = (empId: string, name: string) => {
    if (confirm(`Are you sure you want to delete employee "${name}"? This action cannot be undone.`)) {
      const updated = employees.filter((e) => e.id !== empId)
      onSaveDatabase({ ...db, employees: updated })
      if (viewingEmployee?.id === empId) setViewingEmployee(null)
    }
  }

  // Export Employees to CSV
  const handleExportCSV = () => {
    const headers = [
      'Employee ID',
      'Full Name',
      'Phone',
      'CNIC',
      'Role / Designation',
      'Department',
      'Base Salary (PKR)',
      'Total Allowances (PKR)',
      'Duty Timing',
      'Shift',
      'Joining Date',
      'Salary Status',
      'Active Loan Balance (PKR)',
      'Status',
    ]

    const rows = employees.map((e) => [
      e.id,
      e.name,
      e.phone,
      e.cnic || '—',
      e.role,
      e.department || 'Production & Plant',
      e.baseSalary,
      e.totalAllowances || 0,
      e.dutyTiming,
      e.shift,
      formatDate(e.joiningDate),
      e.currentSalaryStatus,
      e.totalLoanBalance || 0,
      e.status,
    ])

    exportToCSV(`AL_FAROOQ_FOODS_Employees_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  // Copy WhatsApp Receipt
  const handleCopyWhatsAppSlip = (emp: EmployeeItem, payment: SalaryPaymentRecord) => {
    const text = `*AL FAROOQ FOODS - SALARY DISBURSEMENT RECEIPT*
━━━━━━━━━━━━━━━━━━━━━
*Voucher No:* ${payment.receiptNumber}
*Employee:* ${emp.name} (${emp.role})
*Month:* ${payment.month}
*Date:* ${formatDate(payment.paymentDate)}
*Phone:* ${emp.phone}

*Compensation Breakdown:*
• Base Basic Salary: ${formatPKR(payment.baseSalary)}
• Total Allowances: +${formatPKR(payment.allowances)}
${payment.overtimeBonus ? `• Overtime Bonus: +${formatPKR(payment.overtimeBonus)}\n` : ''}${payment.loanDeduction ? `• Advance/Loan Deducted: -${formatPKR(payment.loanDeduction)}\n` : ''}${payment.absentDeduction ? `• Absent Deduction: -${formatPKR(payment.absentDeduction)}\n` : ''}━━━━━━━━━━━━━━━━━━━━━
*NET AMOUNT PAID: ${formatPKR(payment.amountPaid)}*
*Payment Mode:* ${payment.paymentMethod} (${payment.paymentAccount.toUpperCase()})
*Status:* PAID ✓
${emp.totalLoanBalance > 0 ? `*Remaining Loan Balance:* ${formatPKR(emp.totalLoanBalance)}\n` : ''}━━━━━━━━━━━━━━━━━━━━━
_AL FAROOQ FOODS Industrial Plant & Bottling Division_`

    navigator.clipboard.writeText(text)
    alert('Salary voucher copied to clipboard! You can paste it directly in WhatsApp.')
  }

  return (
    <div className="page-stack">
      {/* Top Heading & Quick Actions */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">Administration & Human Resources</p>
          <h1>Employees & Staff Payroll</h1>
          <p className="subheading">
            Manage factory plant personnel, duty shifts, attendance tracking, loans & advances, and monthly salary disbursement with transaction proof.
          </p>
        </div>

        <div className="heading-actions">
          <button className="button secondary" onClick={handleExportCSV}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button className="button secondary" onClick={() => setActiveTab('attendance')}>
            <Calendar className="w-4 h-4" /> Attendance Register
          </button>
          <button className="button primary" onClick={() => setIsCreatingEmployee(true)}>
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <span className="metric-label">Total Factory Staff</span>
            <Users className="w-5 h-5 text-[#7cb518]" />
          </div>
          <p className="metric-value">{totalEmployees}</p>
          <div className="metric-foot text-xs text-muted-foreground mt-1">
            <span className="font-semibold text-[#7cb518]">{activeEmployees} Active</span> · {totalEmployees - activeEmployees} On Leave / Inactive
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <span className="metric-label">Monthly Payroll Obligation</span>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className="metric-value">{formatPKR(totalMonthlyPayroll)}</p>
          <div className="metric-foot text-xs text-muted-foreground mt-1">
            Includes base salaries & plant allowances
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <span className="metric-label">Pending Salaries</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="metric-value text-amber-700">{pendingSalaryEmployees.length} Staff</p>
          <div className="metric-foot text-xs text-amber-600 font-semibold mt-1">
            {formatPKR(totalPendingAmount)} unpaid this cycle
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <span className="metric-label">Active Loans & Advances</span>
            <CreditCard className="w-5 h-5 text-[#b8481e]" />
          </div>
          <p className="metric-value text-[#b8481e]">{formatPKR(totalActiveLoans)}</p>
          <div className="metric-foot text-xs text-muted-foreground mt-1">
            Deductible across monthly payroll slips
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="tab-pill-group">
          <button
            className={`tab-pill ${activeTab === 'employees' ? 'tab-pill-active' : ''}`}
            onClick={() => setActiveTab('employees')}
          >
            <Users className="w-4 h-4 mr-1.5 inline" />
            All Employees ({employees.length})
          </button>
          <button
            className={`tab-pill ${activeTab === 'attendance' ? 'tab-pill-active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <Calendar className="w-4 h-4 mr-1.5 inline" />
            Daily Attendance Register
          </button>
          <button
            className={`tab-pill ${activeTab === 'loans' ? 'tab-pill-active' : ''}`}
            onClick={() => setActiveTab('loans')}
          >
            <CreditCard className="w-4 h-4 mr-1.5 inline" />
            Loans & Advances ({employees.filter((e) => e.totalLoanBalance > 0).length})
          </button>
          <button
            className={`tab-pill ${activeTab === 'payroll' ? 'tab-pill-active' : ''}`}
            onClick={() => setActiveTab('payroll')}
          >
            <Banknote className="w-4 h-4 mr-1.5 inline" />
            Payroll Disbursement & Receipts
          </button>
        </div>
      </div>

      {/* VIEW 1: EMPLOYEES DIRECTORY */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="panel p-4 flex flex-wrap items-center gap-3">
            <div className="search-field flex-1 min-w-[240px]">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search staff by name, phone, role, CNIC or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none pl-9 pr-3 py-2 text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-muted-foreground mr-2">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input-select text-sm py-2 px-3 bg-white border rounded-lg"
              >
                <option value="All">All Designations</option>
                {uniqueRoles.filter((r) => r !== 'All').map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="input-select text-sm py-2 px-3 bg-white border rounded-lg"
              >
                <option value="All">All Shifts</option>
                <option value="Morning">Morning Shift</option>
                <option value="Evening">Evening Shift</option>
                <option value="Night">Night Shift</option>
                <option value="General Day">General Day</option>
                <option value="Rotating">Rotating Shift</option>
              </select>

              <select
                value={salaryStatusFilter}
                onChange={(e) => setSalaryStatusFilter(e.target.value as 'All' | 'Pending' | 'Paid')}
                className="input-select text-sm py-2 px-3 bg-white border rounded-lg font-medium"
              >
                <option value="All">All Salary Statuses</option>
                <option value="Pending">🔴 Pending Salary</option>
                <option value="Paid">🟢 Paid Salary</option>
              </select>
            </div>
          </div>

          {/* Employees Table */}
          <div className="panel overflow-hidden">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee Details</th>
                    <th>Role & Department</th>
                    <th>Duty Timing / Shift</th>
                    <th>Monthly Package</th>
                    <th>Today Attendance ({attendanceDate})</th>
                    <th>Salary Status</th>
                    <th>Loan Balance</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold">No employee records match your filters.</p>
                        <p className="text-xs mt-1">Try resetting search criteria or add a new employee.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const todayAtt = emp.attendance?.find((a) => a.date === attendanceDate)
                      const isPending = emp.currentSalaryStatus === 'Pending'

                      return (
                        <tr key={emp.id} className="hover:bg-muted/40 transition-colors">
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#7cb518]/15 text-[#7cb518] font-bold flex items-center justify-center text-sm">
                                {emp.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                              </div>
                              <div>
                                <div className="font-semibold text-sm flex items-center gap-1.5">
                                  {emp.name}
                                  {emp.status !== 'Active' && (
                                    <span className="badge badge-muted text-[10px] px-1.5 py-0.5">
                                      {emp.status}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-[11px] font-semibold text-foreground/70">
                                    {emp.id.toUpperCase()}
                                  </span>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 inline" /> {emp.phone}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="font-medium text-sm text-foreground">{emp.role}</div>
                            <div className="text-xs text-muted-foreground">{emp.department || 'Production'}</div>
                          </td>

                          <td>
                            <div className="text-xs font-semibold text-foreground">{emp.dutyTiming || '08:00 AM - 04:00 PM'}</div>
                            <span className="badge badge-outline text-[11px] mt-0.5 inline-block">
                              {emp.shift || 'Morning'}
                            </span>
                          </td>

                          <td>
                            <div className="font-semibold text-sm text-foreground">
                              {formatPKR((emp.baseSalary || 0) + (emp.totalAllowances || 0))}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Base: {formatPKR(emp.baseSalary)}
                              {emp.totalAllowances && emp.totalAllowances > 0 ? ` + ${formatPKR(emp.totalAllowances)}` : ''}
                            </div>
                          </td>

                          <td>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSetAttendance(emp.id, 'Present')}
                                className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                                  todayAtt?.status === 'Present'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-muted hover:bg-emerald-100 text-emerald-800'
                                }`}
                                title="Mark Present"
                              >
                                P
                              </button>
                              <button
                                onClick={() => handleSetAttendance(emp.id, 'Absent')}
                                className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                                  todayAtt?.status === 'Absent'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'bg-muted hover:bg-rose-100 text-rose-800'
                                }`}
                                title="Mark Absent"
                              >
                                A
                              </button>
                              <button
                                onClick={() => handleSetAttendance(emp.id, 'Off-day')}
                                className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                                  todayAtt?.status === 'Off-day'
                                    ? 'bg-slate-700 text-white shadow-sm'
                                    : 'bg-muted hover:bg-slate-200 text-slate-700'
                                }`}
                                title="Mark Off-day"
                              >
                                Off
                              </button>
                              <button
                                onClick={() => handleSetAttendance(emp.id, 'Leave')}
                                className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                                  todayAtt?.status === 'Leave'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-muted hover:bg-blue-100 text-blue-800'
                                }`}
                                title="Mark Leave"
                              >
                                L
                              </button>
                            </div>
                            {todayAtt?.checkInTime && todayAtt.status === 'Present' && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                In: {todayAtt.checkInTime}
                              </div>
                            )}
                          </td>

                          <td>
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" /> Paid
                                </span>
                                {emp.lastSalaryPaidDate && (
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {formatDate(emp.lastSalaryPaidDate)}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td>
                            {emp.totalLoanBalance > 0 ? (
                              <span className="font-semibold text-xs text-[#b8481e] bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                                {formatPKR(emp.totalLoanBalance)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Nil</span>
                            )}
                          </td>

                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending ? (
                                <button
                                  className="button primary text-xs py-1 px-2.5"
                                  onClick={() => handleOpenDisburse(emp)}
                                  title="Disburse Monthly Salary"
                                >
                                  <DollarSign className="w-3.5 h-3.5" /> Pay
                                </button>
                              ) : (
                                <button
                                  className="button secondary text-xs py-1 px-2 text-emerald-700"
                                  onClick={() => {
                                    if (emp.salaryHistory && emp.salaryHistory.length > 0) {
                                      setActiveReceipt({
                                        employee: emp,
                                        payment: emp.salaryHistory[0],
                                      })
                                    } else {
                                      handleOpenDisburse(emp)
                                    }
                                  }}
                                  title="View Salary Receipt"
                                >
                                  <FileText className="w-3.5 h-3.5" /> Slip
                                </button>
                              )}

                              <button
                                className="icon-button text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setLoaningEmployee(emp)
                                  setLoanAmount(5000)
                                }}
                                title="Issue Loan / Salary Advance"
                              >
                                <CreditCard className="w-4 h-4 text-amber-700" />
                              </button>

                              <button
                                className="icon-button text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setViewingEmployee(emp)
                                  setProfileTab('overview')
                                }}
                                title="View Full Employee Profile"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                className="icon-button text-muted-foreground hover:text-foreground"
                                onClick={() => setEditingEmployee(emp)}
                                title="Edit Employee"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                className="icon-button text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                                title="Delete Employee"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ATTENDANCE REGISTER */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="panel p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#7cb518]" /> Register Date:
              </label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="input-field max-w-[180px] text-sm py-1.5"
              />
              <button
                className="button secondary text-xs py-1.5"
                onClick={() => setAttendanceDate(new Date().toISOString().slice(0, 10))}
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800">
                  Present: {todayAttendance.present}
                </span>
                <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-800">
                  Absent: {todayAttendance.absent}
                </span>
                <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-800">
                  Off-day: {todayAttendance.offDay}
                </span>
                <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-800">
                  Leave: {todayAttendance.leave}
                </span>
              </div>

              <button className="button primary text-xs py-1.5" onClick={handleMarkAllPresent}>
                <Check className="w-4 h-4 mr-1" /> Mark All as Present
              </button>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff Name & Role</th>
                    <th>Department</th>
                    <th>Shift Timing</th>
                    <th>Status for {formatDate(attendanceDate)}</th>
                    <th>Check-in Time</th>
                    <th>Quick Mark Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const record = emp.attendance?.find((a) => a.date === attendanceDate)
                    const status = record?.status || 'Unmarked'

                    return (
                      <tr key={emp.id} className="hover:bg-muted/40">
                        <td>
                          <div className="font-semibold text-sm">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">{emp.role}</div>
                        </td>

                        <td className="text-xs text-muted-foreground">{emp.department}</td>
                        <td className="text-xs font-medium">{emp.dutyTiming}</td>

                        <td>
                          <span
                            className={`badge text-xs font-semibold ${
                              status === 'Present'
                                ? 'badge-success'
                                : status === 'Absent'
                                ? 'badge-danger'
                                : status === 'Off-day'
                                ? 'badge-muted'
                                : status === 'Leave'
                                ? 'badge-info'
                                : 'badge-warning'
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        <td>
                          <span className="text-xs font-mono">
                            {status === 'Present' ? record?.checkInTime || '08:00 AM' : '—'}
                          </span>
                        </td>

                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSetAttendance(emp.id, 'Present')}
                              className={`px-3 py-1 rounded text-xs font-semibold ${
                                status === 'Present'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleSetAttendance(emp.id, 'Absent')}
                              className={`px-3 py-1 rounded text-xs font-semibold ${
                                status === 'Absent'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300'
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              onClick={() => handleSetAttendance(emp.id, 'Off-day')}
                              className={`px-3 py-1 rounded text-xs font-semibold ${
                                status === 'Off-day'
                                  ? 'bg-slate-700 text-white'
                                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-300'
                              }`}
                            >
                              Off-Day
                            </button>
                            <button
                              onClick={() => handleSetAttendance(emp.id, 'Leave')}
                              className={`px-3 py-1 rounded text-xs font-semibold ${
                                status === 'Leave'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-300'
                              }`}
                            >
                              Leave
                            </button>
                          </div>
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

      {/* VIEW 3: LOANS & ADVANCES LEDGER */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          <div className="panel p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base">Factory Staff Loan & Salary Advance Tracker</h3>
              <p className="text-xs text-muted-foreground">
                Issue salary advances, track outstanding balances, and auto-settle upon monthly payroll disbursement.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Total Outstanding Balance</span>
              <span className="text-xl font-bold text-[#b8481e]">{formatPKR(totalActiveLoans)}</span>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff Name & Role</th>
                    <th>Current Outstanding Balance</th>
                    <th>Recent Loan / Advance History</th>
                    <th className="text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const loans = emp.loans || []

                    return (
                      <tr key={emp.id} className="hover:bg-muted/40">
                        <td>
                          <div className="font-semibold text-sm">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {emp.role} · {emp.phone}
                          </div>
                        </td>

                        <td>
                          {emp.totalLoanBalance > 0 ? (
                            <div>
                              <span className="text-sm font-bold text-[#b8481e]">
                                {formatPKR(emp.totalLoanBalance)}
                              </span>
                              <span className="badge badge-warning text-[10px] ml-2">Active Advance</span>
                            </div>
                          ) : (
                            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> No active loans
                            </span>
                          )}
                        </td>

                        <td>
                          {loans.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No loan history</span>
                          ) : (
                            <div className="space-y-1">
                              {loans.slice(0, 2).map((l) => (
                                <div key={l.id} className="text-xs flex items-center gap-2">
                                  <span className="font-mono text-muted-foreground">{formatDate(l.date)}:</span>
                                  <span className="font-semibold">{formatPKR(l.amount)}</span>
                                  <span className="text-muted-foreground">({l.reason || l.type})</span>
                                  <span
                                    className={`badge text-[10px] px-1 py-0 ${
                                      l.status === 'Settled' ? 'badge-success' : 'badge-warning'
                                    }`}
                                  >
                                    {l.status} (Rem: {formatPKR(l.remainingBalance)})
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="text-right">
                          <button
                            className="button primary text-xs py-1 px-3"
                            onClick={() => {
                              setLoaningEmployee(emp)
                              setLoanAmount(5000)
                            }}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Issue Advance
                          </button>
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

      {/* VIEW 4: PAYROLL DISBURSEMENTS & SLIPS */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="panel p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base">Monthly Payroll Cycle: {salaryMonth}</h3>
              <p className="text-xs text-muted-foreground">
                View all pending salary payments, past disbursements, transaction screenshot proofs, and print slips.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">Change Cycle:</span>
              <select
                value={salaryMonth}
                onChange={(e) => setSalaryMonth(e.target.value)}
                className="input-select text-sm py-1.5 px-3 bg-white border rounded-lg font-semibold"
              >
                <option value="August 2026">August 2026</option>
                <option value="July 2026">July 2026</option>
                <option value="June 2026">June 2026</option>
                <option value="May 2026">May 2026</option>
              </select>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff Name & Role</th>
                    <th>Base Salary</th>
                    <th>Allowances</th>
                    <th>Loan Deductions</th>
                    <th>Net Disbursed / Payable</th>
                    <th>Payment Status</th>
                    <th className="text-right">Receipt / Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const isPaid = emp.currentSalaryStatus === 'Paid'
                    const recentPayment = emp.salaryHistory?.[0]
                    const totalGross = (emp.baseSalary || 0) + (emp.totalAllowances || 0)

                    return (
                      <tr key={emp.id} className="hover:bg-muted/40">
                        <td>
                          <div className="font-semibold text-sm">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {emp.role} · {emp.phone}
                          </div>
                        </td>

                        <td className="text-sm font-medium">{formatPKR(emp.baseSalary)}</td>
                        <td className="text-sm font-medium text-emerald-700">
                          +{formatPKR(emp.totalAllowances || 0)}
                        </td>
                        <td className="text-sm font-medium text-[#b8481e]">
                          {emp.totalLoanBalance > 0 ? `Active Adv: ${formatPKR(emp.totalLoanBalance)}` : '—'}
                        </td>

                        <td>
                          <span className="font-bold text-sm text-foreground">
                            {formatPKR(totalGross)}
                          </span>
                        </td>

                        <td>
                          {isPaid ? (
                            <span className="badge badge-success text-xs font-semibold">
                              <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Paid ({formatDate(emp.lastSalaryPaidDate)})
                            </span>
                          ) : (
                            <span className="badge badge-warning text-xs font-semibold">
                              <Clock className="w-3 h-3 mr-1 inline" /> Pending Payment
                            </span>
                          )}
                        </td>

                        <td className="text-right">
                          {isPaid && recentPayment ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="button secondary text-xs py-1 px-2.5"
                                onClick={() => setActiveReceipt({ employee: emp, payment: recentPayment })}
                              >
                                <Printer className="w-3.5 h-3.5 mr-1" /> View Slip
                              </button>
                              {recentPayment.paymentScreenshot && (
                                <button
                                  className="button secondary text-xs py-1 px-2 text-blue-600"
                                  onClick={() => setZoomedImage(recentPayment.paymentScreenshot!)}
                                  title="View Online Transaction Screenshot"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Proof
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              className="button primary text-xs py-1 px-3"
                              onClick={() => handleOpenDisburse(emp)}
                            >
                              <DollarSign className="w-3.5 h-3.5 mr-1" /> Pay Salary
                            </button>
                          )}
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

      {/* MODAL 1: ADD / EDIT EMPLOYEE */}
      {(isCreatingEmployee || editingEmployee) && (
        <EmployeeFormModal
          employee={editingEmployee}
          onClose={() => {
            setIsCreatingEmployee(false)
            setEditingEmployee(null)
          }}
          onSave={(savedEmployee) => {
            let updated: EmployeeItem[]
            if (editingEmployee) {
              updated = employees.map((e) => (e.id === savedEmployee.id ? savedEmployee : e))
            } else {
              updated = [savedEmployee, ...employees]
            }
            onSaveDatabase({ ...db, employees: updated })
            setIsCreatingEmployee(false)
            setEditingEmployee(null)
          }}
        />
      )}

      {/* MODAL 2: PAY SALARY / DISBURSEMENT */}
      {disbursingEmployee && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Banknote className="w-6 h-6 text-[#7cb518]" /> Disburse Monthly Salary
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Issue payroll for <strong className="text-foreground">{disbursingEmployee.name}</strong> ({disbursingEmployee.role})
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setDisbursingEmployee(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Salary Month / Period</label>
                <input
                  type="text"
                  value={salaryMonth}
                  onChange={(e) => setSalaryMonth(e.target.value)}
                  className="input-field"
                  placeholder="e.g. August 2026"
                />
              </div>

              <div>
                <label className="field-label">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Compensation Breakdown Inputs */}
            <div className="bg-muted/40 rounded-xl p-4 space-y-3 border border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Salary Computation Breakdown
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="field-label">Base Salary (PKR)</label>
                  <input
                    type="number"
                    value={basePayInput}
                    onChange={(e) => setBasePayInput(Number(e.target.value) || 0)}
                    className="input-field font-semibold"
                  />
                </div>

                <div>
                  <label className="field-label">Allowances & Benefits (+)</label>
                  <input
                    type="number"
                    value={allowancePayInput}
                    onChange={(e) => setAllowancePayInput(Number(e.target.value) || 0)}
                    className="input-field font-semibold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="field-label">Overtime / Bonus (+)</label>
                  <input
                    type="number"
                    value={overtimePayInput}
                    onChange={(e) => setOvertimePayInput(Number(e.target.value) || 0)}
                    className="input-field font-semibold text-emerald-700"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="field-label mb-0">Loan / Advance Deduction (-)</label>
                    {disbursingEmployee.totalLoanBalance > 0 && (
                      <span className="text-[11px] text-[#b8481e] font-semibold">
                        Max Bal: {formatPKR(disbursingEmployee.totalLoanBalance)}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={loanDeductInput}
                    onChange={(e) => setLoanDeductInput(Number(e.target.value) || 0)}
                    className="input-field font-semibold text-[#b8481e]"
                  />
                </div>

                <div>
                  <label className="field-label">Absent / Fine Deduction (-)</label>
                  <input
                    type="number"
                    value={absentDeductInput}
                    onChange={(e) => setAbsentDeductInput(Number(e.target.value) || 0)}
                    className="input-field font-semibold text-[#b8481e]"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Total Net Payable Banner */}
              <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-[#7cb518]/30 mt-2">
                <span className="font-bold text-sm text-foreground">Net Disbursed Amount:</span>
                <span className="text-xl font-black text-[#7cb518]">{formatPKR(calculatedNetPay)}</span>
              </div>
            </div>

            {/* Payment Mode & Bank Screenshot */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Payment Mode</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="input-select"
                  >
                    <option value="Cash">Cash (Factory Cash Register)</option>
                    <option value="Online">Online Banking Transfer</option>
                    <option value="Bank Transfer">Bank Cheque / IBFT Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Disburse From Account</label>
                  <select
                    value={paymentAccount}
                    onChange={(e) => setPaymentAccount(e.target.value as any)}
                    className="input-select"
                  >
                    {db.accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Bal: {formatPKR(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transaction Screenshot Upload for Online / Bank Transfer */}
              {(paymentMethod === 'Online' || paymentMethod === 'Bank Transfer') && (
                <div className="border-2 border-dashed border-border rounded-xl p-4 bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-[#7cb518]" /> Attach Online Payment Screenshot Proof
                    </label>
                    {paymentScreenshot && (
                      <button
                        type="button"
                        onClick={() => setPaymentScreenshot('')}
                        className="text-xs text-destructive hover:underline font-semibold"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>

                  {paymentScreenshot ? (
                    <div className="flex items-center gap-3">
                      <div className="relative group cursor-pointer" onClick={() => setZoomedImage(paymentScreenshot)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={paymentScreenshot}
                          alt="Transaction Screenshot"
                          className="w-24 h-24 object-cover rounded-lg border shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white rounded-lg transition-opacity text-xs font-semibold">
                          Zoom
                        </div>
                      </div>
                      <div className="text-xs space-y-1">
                        <span className="badge badge-success text-[11px] font-semibold">
                          ✓ Screenshot attached
                        </span>
                        <p className="text-muted-foreground">
                          Stored locally in offline storage. Will appear on printable receipt.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const b64 = await fileToBase64(file)
                            setPaymentScreenshot(b64)
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="button secondary text-xs py-2 px-4"
                      >
                        <Upload className="w-4 h-4 mr-1.5" /> Upload Screenshot (IBFT / Meezan / HBL / Raast)
                      </button>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        PNG, JPG, or JPEG receipts up to 10MB
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="field-label">Voucher Notes (Optional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Paid in full via Meezan online corporate portal"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                className="button secondary"
                onClick={() => setDisbursingEmployee(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button primary px-6"
                onClick={handleConfirmDisburse}
              >
                <Check className="w-4 h-4 mr-1.5" /> Mark Paid & Generate Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: GENERATED SALARY RECEIPT / SLIP */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-border p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <span className="badge badge-success text-xs font-semibold">✓ Salary Paid</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {activeReceipt.payment.receiptNumber}
                </span>
              </div>
              <button className="icon-button" onClick={() => setActiveReceipt(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Layout */}
            <div id="salary-slip-print" className="border border-slate-300 rounded-xl p-5 space-y-4 bg-slate-50/50">
              {/* Receipt Header */}
              <div className="flex items-start justify-between border-b border-slate-300 pb-3">
                <div>
                  <h3 className="font-black text-lg text-slate-900 tracking-tight">AL FAROOQ FOODS</h3>
                  <p className="text-[11px] text-slate-600">Industrial Area, Sheikhupura Road, Lahore</p>
                  <p className="text-[11px] text-slate-600">Phone: 0344 9549051 · 0346 9829900</p>
                </div>
                <div className="text-right">
                  <span className="bg-[#7cb518] text-white px-2.5 py-1 rounded text-xs font-bold uppercase">
                    SALARY SLIP
                  </span>
                  <div className="text-xs font-mono font-bold mt-1 text-slate-700">
                    {activeReceipt.payment.receiptNumber}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {formatDate(activeReceipt.payment.paymentDate)}
                  </div>
                </div>
              </div>

              {/* Employee & Payment Meta */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Employee:</span>
                  <strong className="text-sm text-slate-900">{activeReceipt.employee.name}</strong>
                  <div className="text-slate-600">{activeReceipt.employee.role}</div>
                  <div className="text-slate-500">CNIC: {activeReceipt.employee.cnic || '—'}</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Salary Period:</span>
                  <strong className="text-sm text-slate-900">{activeReceipt.payment.month}</strong>
                  <div className="text-slate-600">Mode: {activeReceipt.payment.paymentMethod}</div>
                  <div className="text-slate-500">Dept: {activeReceipt.employee.department}</div>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-xs border border-slate-300 rounded overflow-hidden">
                <thead className="bg-slate-200 text-slate-800 font-bold">
                  <tr>
                    <th className="text-left p-2">Component</th>
                    <th className="text-right p-2">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2">Basic Monthly Salary</td>
                    <td className="p-2 text-right font-medium">{formatPKR(activeReceipt.payment.baseSalary)}</td>
                  </tr>
                  <tr>
                    <td className="p-2">
                      Allowances & Benefits
                      {activeReceipt.payment.allowancesBreakdown && (
                        <div className="text-[10px] text-slate-500">
                          {activeReceipt.payment.allowancesBreakdown.map((a) => `${a.name} (${formatPKR(a.amount)})`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-right font-medium text-emerald-700">
                      +{formatPKR(activeReceipt.payment.allowances)}
                    </td>
                  </tr>
                  {activeReceipt.payment.overtimeBonus && activeReceipt.payment.overtimeBonus > 0 ? (
                    <tr>
                      <td className="p-2">Overtime / Performance Bonus</td>
                      <td className="p-2 text-right font-medium text-emerald-700">
                        +{formatPKR(activeReceipt.payment.overtimeBonus)}
                      </td>
                    </tr>
                  ) : null}
                  {activeReceipt.payment.loanDeduction && activeReceipt.payment.loanDeduction > 0 ? (
                    <tr>
                      <td className="p-2">Advance / Loan Deduction</td>
                      <td className="p-2 text-right font-medium text-rose-700">
                        -{formatPKR(activeReceipt.payment.loanDeduction)}
                      </td>
                    </tr>
                  ) : null}
                  {activeReceipt.payment.absentDeduction && activeReceipt.payment.absentDeduction > 0 ? (
                    <tr>
                      <td className="p-2">Absent / Unpaid Leave Deduction</td>
                      <td className="p-2 text-right font-medium text-rose-700">
                        -{formatPKR(activeReceipt.payment.absentDeduction)}
                      </td>
                    </tr>
                  ) : null}
                  <tr className="bg-slate-100 font-bold text-sm">
                    <td className="p-2.5 text-slate-900">NET DISBURSED AMOUNT:</td>
                    <td className="p-2.5 text-right text-[#7cb518] font-black text-base">
                      {formatPKR(activeReceipt.payment.amountPaid)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Online Payment Proof Thumbnail on slip if present */}
              {activeReceipt.payment.paymentScreenshot && (
                <div className="border border-slate-200 rounded p-2 flex items-center gap-3 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeReceipt.payment.paymentScreenshot}
                    alt="Transaction Proof"
                    className="w-12 h-12 object-cover rounded border"
                  />
                  <div className="text-[11px] text-slate-600">
                    <strong className="text-slate-800 block">Bank Transaction Proof Attached</strong>
                    Disbursed via {activeReceipt.payment.paymentMethod} ({activeReceipt.payment.paymentAccount})
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-6 pt-6 text-[11px] text-slate-600">
                <div className="border-t border-slate-400 text-center pt-1">
                  Employee Signature & Date
                </div>
                <div className="border-t border-slate-400 text-center pt-1">
                  Authorized Signatory (AL FAROOQ FOODS)
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 print:hidden">
              <button
                className="button secondary text-xs"
                onClick={() => handleCopyWhatsAppSlip(activeReceipt.employee, activeReceipt.payment)}
              >
                <Share2 className="w-4 h-4 mr-1.5 text-emerald-600" /> WhatsApp Text
              </button>

              <div className="flex items-center gap-2">
                <button
                  className="button secondary text-xs"
                  onClick={() => generateSalarySlipPDF(activeReceipt.employee, activeReceipt.payment)}
                >
                  <Download className="w-4 h-4 mr-1.5" /> Download PDF
                </button>
                <button
                  className="button primary text-xs"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4 mr-1.5" /> Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ISSUE LOAN / ADVANCE */}
      {loaningEmployee && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#b8481e]" /> Issue Loan / Advance
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  For: <strong className="text-foreground">{loaningEmployee.name}</strong> (Current Balance: {formatPKR(loaningEmployee.totalLoanBalance)})
                </p>
              </div>
              <button className="icon-button" onClick={() => setLoaningEmployee(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="field-label">Disbursement Date</label>
                <input
                  type="date"
                  value={loanDate}
                  onChange={(e) => setLoanDate(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Advance Type</label>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value as any)}
                    className="input-select"
                  >
                    <option value="Salary Advance">Salary Advance (Short Term)</option>
                    <option value="Loan">Emergency Loan (Installment)</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Amount (PKR)</label>
                  <input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value) || 0)}
                    className="input-field font-bold text-lg"
                    min="500"
                    step="500"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Disburse From Account</label>
                <select
                  value={loanAccount}
                  onChange={(e) => setLoanAccount(e.target.value as any)}
                  className="input-select"
                >
                  {db.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Bal: {formatPKR(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Reason / Notes</label>
                <input
                  type="text"
                  value={loanReason}
                  onChange={(e) => setLoanReason(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Medical emergency advance, Eid shopping, family expense"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                className="button secondary"
                onClick={() => setLoaningEmployee(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button primary"
                onClick={handleConfirmLoan}
              >
                <Check className="w-4 h-4 mr-1.5" /> Disburse Advance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: EMPLOYEE DETAILED PROFILE & HISTORY */}
      {viewingEmployee && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-3xl rounded-2xl shadow-2xl border border-border p-6 space-y-5 my-8">
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-[#7cb518]/20 text-[#7cb518] font-bold flex items-center justify-center text-lg">
                  {viewingEmployee.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{viewingEmployee.name}</h2>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className="badge badge-outline">{viewingEmployee.role}</span>
                    <span>·</span>
                    <span>{viewingEmployee.department}</span>
                    <span>·</span>
                    <span className="font-mono">{viewingEmployee.phone}</span>
                  </div>
                </div>
              </div>
              <button className="icon-button" onClick={() => setViewingEmployee(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Sub Tabs */}
            <div className="tab-pill-group">
              <button
                className={`tab-pill ${profileTab === 'overview' ? 'tab-pill-active' : ''}`}
                onClick={() => setProfileTab('overview')}
              >
                Biodata & Info
              </button>
              <button
                className={`tab-pill ${profileTab === 'attendance' ? 'tab-pill-active' : ''}`}
                onClick={() => setProfileTab('attendance')}
              >
                Attendance Log ({viewingEmployee.attendance?.length || 0})
              </button>
              <button
                className={`tab-pill ${profileTab === 'salary' ? 'tab-pill-active' : ''}`}
                onClick={() => setProfileTab('salary')}
              >
                Salary Receipts ({viewingEmployee.salaryHistory?.length || 0})
              </button>
              <button
                className={`tab-pill ${profileTab === 'loans' ? 'tab-pill-active' : ''}`}
                onClick={() => setProfileTab('loans')}
              >
                Loan Ledger ({viewingEmployee.loans?.length || 0})
              </button>
            </div>

            {/* TAB CONTENT */}
            {profileTab === 'overview' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-xl">
                <div>
                  <span className="text-xs text-muted-foreground block">CNIC Number:</span>
                  <strong>{viewingEmployee.cnic || '—'}</strong>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Duty Shift & Timing:</span>
                  <strong>{viewingEmployee.dutyTiming} ({viewingEmployee.shift})</strong>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Base Monthly Salary:</span>
                  <strong className="text-foreground">{formatPKR(viewingEmployee.baseSalary)}</strong>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Monthly Allowances:</span>
                  <strong className="text-emerald-700">+{formatPKR(viewingEmployee.totalAllowances || 0)}</strong>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Joining Date:</span>
                  <strong>{formatDate(viewingEmployee.joiningDate)}</strong>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Emergency Contact:</span>
                  <strong>{viewingEmployee.emergencyContact || '—'}</strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground block">Residential Address:</span>
                  <strong>{viewingEmployee.address || '—'}</strong>
                </div>
                {viewingEmployee.bankDetails && (
                  <div className="sm:col-span-2 border-t pt-2 mt-2">
                    <span className="text-xs text-muted-foreground block">Bank Account Details:</span>
                    <strong>
                      {viewingEmployee.bankDetails.bankName || 'Bank'} — {viewingEmployee.bankDetails.accountNumber || '—'} ({viewingEmployee.bankDetails.accountTitle || viewingEmployee.name})
                    </strong>
                  </div>
                )}
              </div>
            )}

            {profileTab === 'attendance' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Recent Attendance Log</span>
                  <span>Total Recorded: {viewingEmployee.attendance?.length || 0} days</span>
                </div>
                <div className="max-h-60 overflow-y-auto border rounded-xl divide-y">
                  {viewingEmployee.attendance?.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">No attendance records yet.</div>
                  ) : (
                    viewingEmployee.attendance?.map((att) => (
                      <div key={att.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">{formatDate(att.date)}</span>
                          {att.checkInTime && <span className="text-muted-foreground">(In: {att.checkInTime})</span>}
                        </div>
                        <span
                          className={`badge ${
                            att.status === 'Present'
                              ? 'badge-success'
                              : att.status === 'Absent'
                              ? 'badge-danger'
                              : 'badge-muted'
                          }`}
                        >
                          {att.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {profileTab === 'salary' && (
              <div className="space-y-3">
                <div className="max-h-60 overflow-y-auto border rounded-xl divide-y">
                  {viewingEmployee.salaryHistory?.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">No salary disbursement records yet.</div>
                  ) : (
                    viewingEmployee.salaryHistory?.map((sal) => (
                      <div key={sal.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <strong className="block text-sm text-foreground">{sal.month}</strong>
                          <span className="text-muted-foreground font-mono">
                            {sal.receiptNumber} · Paid on {formatDate(sal.paymentDate)}
                          </span>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <span className="font-bold text-sm text-foreground block">
                              {formatPKR(sal.amountPaid)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{sal.paymentMethod}</span>
                          </div>
                          <button
                            className="button secondary text-xs py-1 px-2"
                            onClick={() => {
                              setActiveReceipt({ employee: viewingEmployee, payment: sal })
                            }}
                          >
                            Slip
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {profileTab === 'loans' && (
              <div className="space-y-3">
                <div className="max-h-60 overflow-y-auto border rounded-xl divide-y">
                  {viewingEmployee.loans?.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">No loans or salary advances.</div>
                  ) : (
                    viewingEmployee.loans?.map((ln) => (
                      <div key={ln.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <strong className="block text-foreground">{ln.type}: {formatPKR(ln.amount)}</strong>
                          <span className="text-muted-foreground">
                            Date: {formatDate(ln.date)} · Reason: {ln.reason}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="badge badge-warning text-xs font-semibold">
                            Remaining: {formatPKR(ln.remainingBalance)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t">
              <button className="button secondary" onClick={() => setViewingEmployee(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: IMAGE ZOOM */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-white p-2 rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoomedImage} alt="Payment Proof" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            <button
              className="absolute top-4 right-4 bg-black/70 text-white rounded-full p-1.5"
              onClick={() => setZoomedImage(null)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Sub-component: Add / Edit Employee Form Modal
function EmployeeFormModal({
  employee,
  onClose,
  onSave,
}: {
  employee: EmployeeItem | null
  onClose: () => void
  onSave: (emp: EmployeeItem) => void
}) {
  const isEdit = !!employee

  const [name, setName] = useState(employee?.name || '')
  const [phone, setPhone] = useState(employee?.phone || '')
  const [cnic, setCnic] = useState(employee?.cnic || '')
  const [role, setRole] = useState(employee?.role || 'Plant Operations Specialist')
  const [department, setDepartment] = useState(employee?.department || 'Production & Plant')
  const [baseSalary, setBaseSalary] = useState<number>(employee?.baseSalary || 40000)
  const [dutyTiming, setDutyTiming] = useState(employee?.dutyTiming || 'Morning Shift (08:00 AM - 04:00 PM)')
  const [shift, setShift] = useState<'Morning' | 'Evening' | 'Night' | 'General Day' | 'Rotating'>(
    employee?.shift || 'Morning'
  )
  const [joiningDate, setJoiningDate] = useState(
    employee?.joiningDate || new Date().toISOString().slice(0, 10)
  )
  const [status, setStatus] = useState<'Active' | 'On Leave' | 'Terminated'>(employee?.status || 'Active')
  const [address, setAddress] = useState(employee?.address || '')
  const [emergencyContact, setEmergencyContact] = useState(employee?.emergencyContact || '')
  const [bankName, setBankName] = useState(employee?.bankDetails?.bankName || 'Meezan Bank Ltd')
  const [accountNumber, setAccountNumber] = useState(employee?.bankDetails?.accountNumber || '')
  const [accountTitle, setAccountTitle] = useState(employee?.bankDetails?.accountTitle || '')
  const [notes, setNotes] = useState(employee?.notes || '')

  // Allowances dynamic list
  const [allowances, setAllowances] = useState<EmployeeAllowance[]>(
    employee?.allowances || [
      { id: 'al-1', name: 'Food Allowance', amount: 3000 },
      { id: 'al-2', name: 'Conveyance Allowance', amount: 3000 },
    ]
  )

  const handleAddAllowance = () => {
    setAllowances([
      ...allowances,
      { id: `al-${Date.now()}`, name: 'Medical Allowance', amount: 2000 },
    ])
  }

  const handleRemoveAllowance = (id: string) => {
    setAllowances(allowances.filter((a) => a.id !== id))
  }

  const handleUpdateAllowance = (id: string, field: 'name' | 'amount', value: any) => {
    setAllowances(
      allowances.map((a) => (a.id === id ? { ...a, [field]: field === 'amount' ? Number(value) || 0 : value } : a))
    )
  }

  const totalAllowances = allowances.reduce((sum, a) => sum + (a.amount || 0), 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      alert('Please provide at least the employee name and phone number.')
      return
    }

    const saved: EmployeeItem = {
      id: employee?.id || `emp-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      phone: phone.trim(),
      cnic: cnic.trim() || undefined,
      role: role.trim(),
      department: department.trim(),
      baseSalary: Number(baseSalary) || 0,
      allowances: allowances,
      totalAllowances: totalAllowances,
      dutyTiming: dutyTiming.trim(),
      shift: shift,
      joiningDate: joiningDate,
      status: status,
      currentSalaryStatus: employee?.currentSalaryStatus || 'Pending',
      lastSalaryPaidDate: employee?.lastSalaryPaidDate,
      totalLoanBalance: employee?.totalLoanBalance || 0,
      address: address.trim() || undefined,
      emergencyContact: emergencyContact.trim() || undefined,
      bankDetails: {
        bankName: bankName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        accountTitle: accountTitle.trim() || name.trim(),
      },
      attendance: employee?.attendance || [],
      loans: employee?.loans || [],
      salaryHistory: employee?.salaryHistory || [],
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString().slice(0, 10),
    }

    onSave(saved)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border p-6 space-y-4 my-8">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-[#7cb518]" />
            {isEdit ? 'Edit Employee Record' : 'Register New Employee'}
          </h2>
          <button className="icon-button" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="e.g. Tariq Mehmood"
              />
            </div>

            <div>
              <label className="field-label">Phone Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
                placeholder="e.g. 0300-1234567"
              />
            </div>

            <div>
              <label className="field-label">CNIC Number (Optional)</label>
              <input
                type="text"
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                className="input-field font-mono text-xs"
                placeholder="35201-XXXXXXX-X"
              />
            </div>

            <div>
              <label className="field-label">Role / Designation *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input-select"
              >
                <option value="Plant Operations Manager">Plant Operations Manager</option>
                <option value="Senior RO Plant & Water Chemist">Senior RO Plant & Water Chemist</option>
                <option value="Bottling & Capping Line Operator">Bottling & Capping Line Operator</option>
                <option value="Juice Master Mixer & Formulation Incharge">Juice Master Mixer & Formulation Incharge</option>
                <option value="Packaging & Shrink Tunnel Specialist">Packaging & Shrink Tunnel Specialist</option>
                <option value="Distribution Fleet Driver">Distribution Fleet Driver</option>
                <option value="Plant Accountant & Store Incharge">Plant Accountant & Store Incharge</option>
                <option value="Boiler & Chiller Technician">Boiler & Chiller Technician</option>
                <option value="Quality Assurance Inspector">Quality Assurance Inspector</option>
                <option value="Plant Security Officer">Plant Security Officer</option>
                <option value="General Plant Worker">General Plant Worker</option>
              </select>
            </div>

            <div>
              <label className="field-label">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="input-select"
              >
                <option value="Production & Plant">Production & Plant</option>
                <option value="Quality & Lab">Quality & Lab</option>
                <option value="Packaging & Warehousing">Packaging & Warehousing</option>
                <option value="Logistics & Supply">Logistics & Supply</option>
                <option value="Administration & Finance">Administration & Finance</option>
                <option value="Facility & Security">Facility & Security</option>
              </select>
            </div>

            <div>
              <label className="field-label">Base Monthly Salary (PKR) *</label>
              <input
                type="number"
                required
                value={baseSalary}
                onChange={(e) => setBaseSalary(Number(e.target.value) || 0)}
                className="input-field font-bold"
                min="0"
                step="1000"
              />
            </div>

            <div>
              <label className="field-label">Duty Shift</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as any)}
                className="input-select"
              >
                <option value="Morning">Morning Shift (07:00 AM - 03:00 PM)</option>
                <option value="Evening">Evening Shift (03:00 PM - 11:00 PM)</option>
                <option value="Night">Night Shift (11:00 PM - 07:00 AM)</option>
                <option value="General Day">General Day (08:30 AM - 05:30 PM)</option>
                <option value="Rotating">Rotating Shift</option>
              </select>
            </div>

            <div>
              <label className="field-label">Duty Timing Details</label>
              <input
                type="text"
                value={dutyTiming}
                onChange={(e) => setDutyTiming(e.target.value)}
                className="input-field"
                placeholder="e.g. Morning Shift (08:00 AM - 04:00 PM)"
              />
            </div>

            <div>
              <label className="field-label">Joining Date</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="field-label">Employment Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="input-select"
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Terminated">Terminated / Inactive</option>
              </select>
            </div>
          </div>

          {/* Dynamic Allowances Section */}
          <div className="bg-muted/40 p-4 rounded-xl space-y-3 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Other Benefits & Allowances (Optional)
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Food, conveyance, overtime, medical or house rent allowances
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddAllowance}
                className="button secondary text-xs py-1 px-2.5"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Allowance
              </button>
            </div>

            {allowances.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleUpdateAllowance(item.id, 'name', e.target.value)}
                  className="input-field flex-1 text-xs"
                  placeholder="Allowance Name (e.g. Food Allowance)"
                />
                <input
                  type="number"
                  value={item.amount}
                  onChange={(e) => handleUpdateAllowance(item.id, 'amount', e.target.value)}
                  className="input-field w-32 text-xs font-semibold"
                  placeholder="Amount"
                  step="500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAllowance(item.id)}
                  className="icon-button text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <div className="flex justify-between items-center text-xs font-bold pt-2 border-t text-foreground">
              <span>Total Monthly Compensation Package:</span>
              <span className="text-[#7cb518] text-sm">
                {formatPKR(baseSalary + totalAllowances)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Emergency Contact Phone</label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="input-field text-xs"
                placeholder="e.g. Brother (0321-9988776)"
              />
            </div>

            <div>
              <label className="field-label">Bank Account Number (IBFT)</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="input-field text-xs font-mono"
                placeholder="e.g. 010203040510-101"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button type="button" className="button secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button primary px-6">
              <Check className="w-4 h-4 mr-1.5" />
              {isEdit ? 'Save Changes' : 'Register Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
