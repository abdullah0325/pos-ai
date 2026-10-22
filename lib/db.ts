// Shared business types and online API client.

export type Status = 'Active' | 'In stock' | 'Low stock' | 'Out of stock' | 'In production' | 'Completed' | 'Pending' | 'Paid' | 'Partial' | 'Unpaid' | 'Delivered'

export type ProductCategory = string
export type RawMaterialCategory = 'Ingredients' | 'Packaging' | 'Chemicals & Minerals' | 'Flavors' | 'Other' | string
export type CustomerType = 'Retailer' | 'Distributor' | 'Sales Man' | 'Sales Representative' | 'Wholesaler' | 'Other' | 'Counter' | 'Walk-in' | string
export type SupplierSupplyCategory = 'Raw Material' | 'Product' | 'Both' | string

export interface CustomerCategoryItem {
  id: string
  name: string
  parentType: 'Walk-in' | 'Retailer' | 'Wholesaler'
  description?: string
  color?: string
  createdAt?: string
}
export type ExpenseCategory =
  | 'Rent'
  | 'Bills/Utilities'
  | 'Salaries'
  | 'Daily/Misc'
  | 'Loan/Advance to employee'
  | 'Machine Maintenance'
  | 'Fuel & Transport'
  | 'Packaging & Consumables'
  | 'Factory Electricity'
  | 'Labor & Wages'
  | 'Factory Rent'
  | 'Office & Admin'
  | 'Marketing'
  | 'Other'
  | string

export interface CategoryItem {
  id: string
  name: string
  description?: string
  color?: string
  createdAt?: string
}

export interface ProductItem {
  groupName?: string
  spec?: string
  baseUnit?: string
  units?: Array<{ unit: string; factor_to_base: number }>
  id: string
  name: string
  sku: string
  category: string
  description?: string
  size?: string // e.g. "500", "1.5", "250", "100" (optional)
  sizeUnit?: string // dropdown: 'ml', 'L', 'g', 'kg', 'oz', 'pcs' (optional)
  unit: string // 'Cartons', 'Pcs', 'Bottles', 'Jars', 'Boxes', 'Packs'
  quantity: number // finished cartons / packs / pcs
  imageUrl?: string // Base64 or local URL
  costPrice: number // actual/base unit cost price
  wholesalePrice: number // wholesale rate
  wholesaleMinQty?: number // minimum quantity limit for wholesale rate (e.g. 12, 24, 50)
  retailPrice: number // selling price (retail)
  totalCost?: number // auto-calculated or manually overridden total cost
  isManualTotalCost?: boolean // flag if totalCost is manually overridden
  isPurchasedProduct?: boolean // true if purchased (outsourced), false if manufactured in-house
  purchaseCost?: number // purchase cost if purchased
  purchaseInvoiceImage?: string // attached invoice image
  expiryDate?: string // Optional product batch expiry date (YYYY-MM-DD)
  manufacturingDate?: string // Optional manufacturing date
  reorderLevel: number
  status: Status
  updatedAt: string
}

export interface RawMaterialItem {
  id: string
  name: string
  category: RawMaterialCategory
  sku: string
  description?: string
  imageUrl?: string
  size?: string
  unit: string // 'kg' | 'g' | 'L' | 'ml' | 'Pcs' | 'Bags' | 'Drums' | 'Rolls' | 'Cartons'
  unitCost: number // Base price per unit
  unitPrice?: number // Alias for compatibility with deal rates
  otherCost?: number // Other cost (e.g. transport, handling, freight)
  totalCostPerUnit?: number // auto-calculated (unitCost + otherCost) or manual override
  isManualTotalCost?: boolean
  totalCost?: number // Total valuation = (totalCostPerUnit || unitCost) * quantity
  purchaseInvoiceImage?: string // Attached purchase invoice image (Base64)
  supplierId?: string // Link to Supplier module
  supplierName?: string
  supplier?: string // Alias for supplierName
  totalReceived?: number // Total quantity received/opening
  totalConsumed?: number // Total quantity consumed in production
  quantity: number // Remaining warehouse stock
  expiryDate?: string // Optional raw material/ingredient expiry date
  manufacturingDate?: string // Optional manufacturing / batch date
  reorderLevel: number
  status: Status
  updatedAt: string
}

export interface ProductionConsumedItem {
  rawMaterialId: string
  name: string
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
}

export interface ProductionRun {
  id: string
  batchNumber: string
  date: string
  productId: string
  productName: string
  targetQuantity: number
  unit: string
  consumedMaterials: ProductionConsumedItem[]
  laborCost: number
  overheadCost: number
  totalProductionCost: number
  unitCost: number
  status: 'Completed' | 'In production' | 'Planned'
  supervisor: string
  notes?: string
}

export interface CustomerPaymentRecord {
  id: string
  receiptNumber: string
  date: string
  amount: number
  paymentMethod: 'Cash' | 'Card' | 'Online' | 'Bank Transfer' | 'Cheque'
  paymentAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank'
  transactionRef?: string
  receiptImage?: string // Base64 screenshot or photo of bank slip/cheque
  notes?: string
  createdAt: string
}

export interface CustomerItem {
  id: string
  customerId?: string // Display ID e.g. CUST-1001 or manual
  name: string
  businessName?: string
  type: CustomerType
  phone: string
  altPhone?: string
  email?: string
  cnic?: string
  address: string
  city?: string
  territory?: string
  openingBalance: number
  currentBalance: number // positive = receivable from customer
  creditLimit: number
  status: 'Active' | 'Blocked'
  notes?: string
  paymentRecords?: CustomerPaymentRecord[]
  createdAt?: string
  updatedAt: string
}

export interface SupplierPaymentRecord {
  id: string
  receiptNumber: string
  date: string
  amount: number
  paymentMethod: 'Cash' | 'Card' | 'Online' | 'Bank Transfer' | 'Cheque'
  paymentAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank'
  transactionRef?: string
  receiptImage?: string // Base64 screenshot or photo of bank slip/cheque
  purchaseId?: string // Linked deal / purchase ID
  notes?: string
  createdAt: string
}

export interface SupplierItem {
  id: string
  supplierCode?: string // Display ID e.g. SUP-1001 or manual
  name: string
  contactPerson: string
  category: string
  supplyCategory?: SupplierSupplyCategory
  phone: string
  altPhone?: string
  email?: string
  address: string
  city: string
  openingBalance: number
  currentBalance: number // positive = payable to supplier
  status: 'Active' | 'Blocked'
  notes?: string
  totalPurchases?: number
  totalPaid?: number
  paymentRecords?: SupplierPaymentRecord[]
  createdAt?: string
  updatedAt: string
}

export interface InvoiceLineItem {
  productId: string
  name: string
  quantity: number
  unit: string
  unitPrice: number
  costPrice: number
  imageUrl?: string
  discount?: number
  discountType?: 'percent' | 'fixed'
  discountValue?: number
  pricingTier?: 'Retail' | 'Wholesale'
  total: number
}

export interface InvoiceItem {
  id: string
  invoiceNumber: string
  date: string
  time?: string
  dueDate?: string // Optional due date for pending customer payments
  customerId: string
  customerName: string
  customerType: CustomerType
  partyId?: string
  phone: string
  address: string
  saleType: 'Distributor' | 'Wholesale' | 'Retail' | 'Counter'
  items: InvoiceLineItem[]
  subtotal: number
  discount: number
  cartDiscountType?: 'percent' | 'fixed'
  cartDiscountValue?: number
  tax: number
  grandTotal: number
  amountPaid: number
  balanceDue: number
  paymentMethod: 'Cash' | 'Card' | 'Online' | 'Bank Transfer' | 'Cheque' | 'Credit'
  paymentScreenshot?: string
  invoiceImage?: string // Attached scanned/physical invoice photo
  paymentAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank'
  status: 'Paid' | 'Partial' | 'Unpaid'
  deliveryStatus: 'Delivered' | 'Pending' | 'Dispatched'
  notes?: string
  createdAt: string
}

export type PurchaseType = 'Raw Material' | 'Finished Product'

export interface PurchaseLineItem {
  id?: string
  itemId?: string // rawMaterialId or productId
  itemType?: PurchaseType
  rawMaterialId?: string
  productId?: string
  name: string
  category?: string
  quantity: number
  unit: string
  unitPrice: number
  otherCost?: number
  total: number
  isManualTotal?: boolean
}

export interface PurchaseItem {
  id: string
  poNumber: string
  purchaseNumber?: string // Alias for compatibility
  purchaseType?: PurchaseType // 'Raw Material' | 'Finished Product'
  category?: string // 'Raw Material' | 'Packaging' | 'Equipment & Machinery' | 'Chemicals & Flavors' | 'Maintenance & Spares' | 'Transport & Logistics' | 'Office & Factory Supplies' | 'Finished Product' | 'Custom / One-off' | string
  customCategoryLabel?: string
  isCustomCategory?: boolean
  dueDate?: string // Due date for pending or partial payments
  date: string
  time?: string
  supplierId?: string
  supplierName: string
  supplierPhone?: string
  items: PurchaseLineItem[]
  quantity?: number
  unit?: string
  unitPrice?: number
  otherCost?: number // transport/handling/freight
  grandTotal: number
  isManualTotalCost?: boolean
  amountPaid: number
  balanceDue: number
  status: 'Paid' | 'Partial' | 'Unpaid'
  paymentStatus?: 'Paid' | 'Partial' | 'Unpaid'
  paymentMethod: 'Cash' | 'Card' | 'Online' | 'Bank Transfer' | 'Cheque' | 'Credit'
  paymentAccount?: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank'
  transactionRef?: string
  invoiceImage?: string // Attached purchase invoice/bill image (Base64)
  purchaseInvoiceImage?: string // Alias
  paymentScreenshot?: string // Attached online transaction screenshot (Base64)
  isReturnOrDefect?: boolean // Flagged as Return / Defect shipment
  defectNote?: string
  referenceNumber?: string // Optional vendor invoice / challan #
  notes?: string
  createdAt?: string
}

export interface ExpenseItem {
  id: string
  expenseNumber: string
  voucherNumber?: string // Alias for compatibility
  date: string
  category: ExpenseCategory | string
  description: string
  title?: string // Alias for compatibility
  amount: number
  paidTo: string
  employeeId?: string // Linked Employee Profile ID
  employeeName?: string // Linked Employee Name
  salaryMonth?: string // e.g. "August 2026"
  baseSalary?: number // Total monthly salary / full payable
  pendingSalaryBalance?: number // Remaining unpaid balance if partial
  isRecurring?: boolean // Marked as Recurring Monthly
  recurringFrequency?: 'Monthly' | 'Weekly' | 'Quarterly' | 'Yearly'
  paymentMethod: 'Cash' | 'Card' | 'Online' | 'Bank Transfer' | 'Cheque'
  paymentAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank'
  transactionRef?: string
  receiptImage?: string
  paymentScreenshot?: string
  status: 'Paid' | 'Partial' | 'Pending'
  notes?: string
  createdAt: string
}

export interface ReturnItem {
  id: string
  returnNumber: string
  date: string
  type: 'Customer Sales Return' | 'Supplier Purchase Return' | 'Stock Damage Adjustment' | string
  partyId?: string
  partyName: string
  items?: Array<{
    id: string
    name: string
    quantity: number
    unit: string
    unitPrice: number
    total: number
    reason: string
  }>
  productName?: string
  quantity?: number
  unit?: string
  totalLoss?: number
  reason?: string
  status?: string
  totalRefund?: number
  refundStatus?: 'Adjusted in Ledger' | 'Cash Refunded'
  notes?: string
  createdAt?: string
}

export interface AccountBalance {
  id: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank' | string
  name: string
  type: 'Cash' | 'Bank'
  accountNumber?: string
  balance: number
  updatedAt: string
}

export type AccountItem = AccountBalance

export interface AccountTransfer {
  id: string
  date: string
  fromAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank' | string
  toAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank' | string
  amount: number
  description?: string
  notes?: string
}

export interface LedgerEntry {
  id: string
  partyId: string
  partyType: 'Customer' | 'Supplier'
  date: string
  referenceType: 'Invoice' | 'Payment' | 'Purchase' | 'Return' | 'Opening'
  referenceId: string
  description: string
  debit: number // Customer debit = invoice (increase balance); Supplier debit = payment (decrease payable)
  credit: number // Customer credit = payment (decrease balance); Supplier credit = purchase (increase payable)
  balance: number
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Off-day' | 'Half-day' | 'Leave'

export interface AttendanceRecord {
  id: string
  date: string // YYYY-MM-DD
  status: AttendanceStatus
  notes?: string
  checkInTime?: string
  checkOutTime?: string
}

export interface EmployeeAllowance {
  id: string
  name: string // e.g. "Food Allowance", "Conveyance Allowance", "Medical Allowance", "Overtime Bonus", "House Rent"
  amount: number
}

export interface LoanAdvanceRecord {
  id: string
  date: string // YYYY-MM-DD
  amount: number
  type: 'Loan' | 'Salary Advance'
  reason: string
  remainingBalance: number
  status: 'Active' | 'Settled'
  createdAt: string
}

export interface SalaryPaymentRecord {
  id: string
  receiptNumber: string // e.g. SAL-2026-08-01
  month: string // e.g. "August 2026"
  paymentDate: string
  baseSalary: number
  allowances: number
  allowancesBreakdown?: Array<{ name: string; amount: number }>
  overtimeBonus?: number
  loanDeduction?: number
  absentDeduction?: number
  netPayable: number
  amountPaid: number
  pendingBalance?: number
  paymentMethod: 'Cash' | 'Online' | 'Bank Transfer' | 'Cheque' | 'Card'
  paymentAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank'
  paymentScreenshot?: string // Base64 image
  status: 'Paid' | 'Pending' | 'Partial'
  notes?: string
  createdAt: string
}

export interface EmployeeLeaveRecord {
  id: string
  leaveType: 'Casual' | 'Sick' | 'Annual' | 'Emergency' | 'Unpaid'
  startDate: string
  endDate: string
  days: number
  reason: string
  status: 'Approved' | 'Pending' | 'Rejected'
  appliedOn: string
  notes?: string
}

export interface EmployeeItem {
  id: string
  name: string
  phone: string
  altPhone?: string
  email?: string
  cnic?: string
  role: string
  department: string
  baseSalary: number
  allowances?: EmployeeAllowance[]
  totalAllowances?: number
  dutyTiming: string
  shift: 'Morning' | 'Evening' | 'Night' | 'General Day' | 'Rotating'
  joiningDate: string
  status: 'Active' | 'On Leave' | 'Terminated'
  currentSalaryStatus: 'Pending' | 'Paid' | 'Partial'
  pendingSalaryAmount?: number
  lastSalaryPaidDate?: string
  totalLoanBalance: number
  address?: string
  emergencyContact?: string
  bankDetails?: {
    bankName?: string
    accountNumber?: string
    accountTitle?: string
  }
  attendance: AttendanceRecord[]
  loans: LoanAdvanceRecord[]
  salaryHistory: SalaryPaymentRecord[]
  leaves?: EmployeeLeaveRecord[]
  notes?: string
  updatedAt: string
}

export interface PhonebookCategoryItem {
  id: string
  name: string
  color?: string // 'emerald' | 'purple' | 'amber' | 'blue' | 'orange' | 'teal' | 'sky' | 'stone' | 'rose' | 'red'
  description?: string
  createdAt?: string
}

export interface PhonebookContactItem {
  id: string
  name: string
  phone: string
  altPhone?: string
  whatsapp?: string
  email?: string
  category: string
  businessName?: string
  city?: string
  address?: string
  notes?: string
  isFavorite?: boolean
  linkedType?: 'customer' | 'supplier' | 'employee' | 'other'
  linkedId?: string
  createdAt?: string
  updatedAt?: string
}

export interface CompanyProfile {
  name: string
  tagline: string
  phone1: string
  phone2: string
  email: string
  address: string
  taxNumber: string
}

export const defaultCompanyProfile: CompanyProfile = {
  name: 'Al Farooq Hardware',
  tagline: 'Electrical, plumbing, building materials & tools',
  phone1: '0344 9549051',
  phone2: '0346 9829900',
  email: 'umarfarooq4847@gmail.com',
  address: 'Main Market, Lahore, Pakistan',
  taxNumber: '',
}

export interface AdminProfile {
  name: string
  email: string
  phone: string
  title: string
}

export const defaultAdminProfile: AdminProfile = {
  name: 'Umar Farooq',
  email: 'umarfarooq4847@gmail.com',
  phone: '0344 9549051',
  title: 'Super Admin',
}

export interface AppDatabase {
  revision?: number
  productAliases?: Array<{ aliasKey: string; productId: string; source: string }>
  stockMovements?: Array<{ id: string; itemId: string; kind: 'product' | 'raw_material'; type: 'purchase' | 'sale' | 'adjust' | 'opening'; qty: number; refId: string; createdAt: string }>
  aiActivity?: Array<{ id: string; type: 'scan' | 'voice'; createdAt: string; created: number; aliases?: number; mode?: string }>
  adminProfile?: AdminProfile
  companyProfile?: CompanyProfile
  categories: CategoryItem[]
  rawMaterialCategories?: CategoryItem[]
  customerCategories?: CustomerCategoryItem[]
  supplierCategories?: CategoryItem[]
  expenseCategories?: CategoryItem[]
  products: ProductItem[]
  rawMaterials: RawMaterialItem[]
  productionRuns: ProductionRun[]
  customers: CustomerItem[]
  suppliers: SupplierItem[]
  invoices: InvoiceItem[]
  purchases: PurchaseItem[]
  expenses: ExpenseItem[]
  returns: ReturnItem[]
  accounts: AccountBalance[]
  transfers: AccountTransfer[]
  ledgers: LedgerEntry[]
  employees: EmployeeItem[]
  phonebookCategories?: PhonebookCategoryItem[]
  phonebookContacts?: PhonebookContactItem[]
  purchaseCategories?: PurchaseCategoryItem[]
  lastBackupDate?: string
  version: number
}

export interface PurchaseCategoryItem {
  id: string
  name: string
  description?: string
  color?: string
  isCustom?: boolean
  createdAt?: string
}

export const defaultPurchaseCategories: PurchaseCategoryItem[] = [{id:'pc-hardware',name:'Finished Product',description:'Hardware stock purchases'}]

export const defaultSupplierCategories: CategoryItem[] = [{id:'sup-hardware',name:'Hardware Supplier'}]

export const defaultExpenseCategories: CategoryItem[] = [{id:'exp-rent',name:'Rent'},{id:'exp-delivery',name:'Fuel & Transport'},{id:'exp-office',name:'Office & Admin'}]

export const defaultRawMaterialCategories: CategoryItem[] = [{id:'rm-other',name:'Other'}]

export const defaultProductCategories: CategoryItem[] = ['Electrical','Water supply & plumbing','Building materials','General hardware & tools','Electronics','Other'].map((name,i)=>({id:`cat-${i}`,name}))

export const defaultCustomerCategories: CustomerCategoryItem[] = [{id:'cc-retail',name:'Retailer',parentType:'Retailer'},{id:'cc-contract',name:'Contractor',parentType:'Wholesaler'},{id:'cc-walk',name:'Walk-in Customer',parentType:'Walk-in'}]

export const defaultPhonebookCategories: PhonebookCategoryItem[] = [
  { id: 'pbcat-1', name: 'Distributors', color: 'emerald', description: 'Regional distribution partners & territory wholesalers', createdAt: '2026-08-01' },
  { id: 'pbcat-2', name: 'Wholesalers', color: 'purple', description: 'Bulk wholesale buyers, mandi dealers & stockists', createdAt: '2026-08-01' },
  { id: 'pbcat-3', name: 'Retailers', color: 'amber', description: 'Retail shops, marts, bakeries & grocery counters', createdAt: '2026-08-01' },
  { id: 'pbcat-4', name: 'Suppliers', color: 'blue', description: 'Raw materials, packaging, chemical & machinery vendors', createdAt: '2026-08-01' },
  { id: 'pbcat-5', name: 'Transport & Logistics', color: 'orange', description: 'Goods transport, truck addas, loaders & delivery drivers', createdAt: '2026-08-01' },
  { id: 'pbcat-6', name: 'Maintenance & Technical', color: 'teal', description: 'Electricians, mechanics, boiler & chiller service engineers', createdAt: '2026-08-01' },
  { id: 'pbcat-7', name: 'Staff & Management', color: 'sky', description: 'Plant supervisors, gate security, dispatch incharge', createdAt: '2026-08-01' },
  { id: 'pbcat-8', name: 'General & Personal', color: 'stone', description: 'General business, legal, banking and emergency contacts', createdAt: '2026-08-01' },
]

export const DB_STORAGE_KEY = 'al_farooq_foods_db_v2'

// Empty online workspace. Demo data is explicitly seeded on the server.
export const initialDatabase: AppDatabase = {
  version: 2, categories: [], rawMaterialCategories: [], customerCategories: [], supplierCategories: [],
  expenseCategories: [], purchaseCategories: [], phonebookCategories: [], phonebookContacts: [],
  products: [], rawMaterials: [], productionRuns: [], customers: [], suppliers: [], invoices: [],
  purchases: [], expenses: [], returns: [], accounts: [], transfers: [], ledgers: [], employees: [],
  stockMovements: [], aiActivity: [], productAliases: [], companyProfile: defaultCompanyProfile,
}

let onlineSnapshot: AppDatabase = initialDatabase
export function setOnlineSnapshot(db:AppDatabase){onlineSnapshot=db}
export function getOnlineSnapshot(){return onlineSnapshot}
export function generateInitialPhonebookContacts(db:AppDatabase):PhonebookContactItem[]{
 return [...db.customers.map(c=>({id:`contact-c-${c.id}`,name:c.name,phone:c.phone,address:c.address,category:c.type,linkedType:'customer' as const,linkedId:c.id})),...db.suppliers.map(s=>({id:`contact-s-${s.id}`,name:s.name,phone:s.phone,address:s.address,category:'Suppliers',linkedType:'supplier' as const,linkedId:s.id}))]
}
// All business persistence goes through the online API.
export async function loadDatabase(): Promise<AppDatabase> {
  const response = await fetch('/api/database', { cache: 'no-store' })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'Could not load the online database.')
  setOnlineSnapshot(body)
  return body
}
export async function saveDatabase(db: AppDatabase): Promise<AppDatabase> {
  const response = await fetch('/api/database', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ db, revision: db.revision ?? 0 }) })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'Could not save. Reload and try again.')
  setOnlineSnapshot(body)
  return body
}

export function exportDatabaseJSON(db: AppDatabase): void {
  const updatedDb = { ...db, lastBackupDate: new Date().toISOString() }
  saveDatabase(updatedDb)
  const jsonStr = JSON.stringify(updatedDb, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `HARDWARE_POS_BACKUP_${dateStr}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Import database from single JSON file
export async function importDatabaseJSON(file: File): Promise<AppDatabase> {
  const text = await file.text()
  return validateDatabaseBackup(JSON.parse(text))
}

// Validation is read-only: a preview must never overwrite the live database.
export function validateDatabaseBackup(value: unknown): AppDatabase {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a database object.')
  const data = structuredClone(value) as Record<string, unknown>
  if (!Number.isInteger(data.version) || (data.version as number) < 1 || (data.version as number) > initialDatabase.version) throw new Error('Unsupported backup version.')
  const requiredFields: Record<string, string[]> = {
    products: ['name', 'quantity', 'costPrice', 'wholesalePrice', 'retailPrice'],
    rawMaterials: ['name', 'quantity', 'unitCost'],
    customers: ['name', 'currentBalance'], suppliers: ['name', 'currentBalance'],
    invoices: ['customerName', 'date', 'items', 'grandTotal'],
    purchases: ['supplierName', 'date', 'grandTotal', 'amountPaid', 'balanceDue'],
    expenses: ['date', 'amount'], accounts: ['name', 'balance'],
  }
  for (const [key, sample] of Object.entries(initialDatabase)) {
    if (!Array.isArray(sample)) continue
    const records = data[key] ?? (['stockMovements','aiActivity','productAliases','rawMaterialCategories','customerCategories','supplierCategories','expenseCategories','purchaseCategories','phonebookCategories','phonebookContacts'].includes(key) ? [] : undefined)
    if (data[key] === undefined && Array.isArray(records)) data[key] = records
    if (!Array.isArray(records)) throw new Error(`Missing or invalid ${key} records.`)
    const ids = new Set<string>()
    for (const record of records) {
      const identity = key === 'productAliases' ? record?.aliasKey : record?.id
      if (!record || typeof record !== 'object' || Array.isArray(record) || typeof identity !== 'string' || !identity || ids.has(identity)) throw new Error(`Invalid or duplicate record in ${key}.`)
      ids.add(identity)
      for(const field of ['quantity','costPrice','wholesalePrice','retailPrice','currentBalance','grandTotal','amountPaid','balanceDue','amount','balance']) {
        if(field in record && (typeof record[field] !== 'number' || !Number.isFinite(record[field]))) throw new Error(`Invalid ${key}.${field}.`)
      }
      for (const field of requiredFields[key] || []) {
        if (!(field in record)) throw new Error(`Missing ${key}.${field}.`)
      }
      if (sample.length > 0) {
        for (const [field, example] of Object.entries(sample[0])) {
          if (!(field in record)) continue
          if (typeof example === 'number' && (typeof record[field] !== 'number' || !Number.isFinite(record[field]))) throw new Error(`Invalid ${key}.${field}.`)
          if (typeof example === 'string' && typeof record[field] !== 'string') throw new Error(`Invalid ${key}.${field}.`)
          if (Array.isArray(example) && !Array.isArray(record[field])) throw new Error(`Invalid ${key}.${field}.`)
        }
      }
      if (key === 'invoices' || key === 'purchases') {
        if (record.items !== undefined && (!Array.isArray(record.items) || record.items.some((item: Record<string, unknown>) => !item || typeof item.name !== 'string' || !Number.isFinite(item.quantity) || !Number.isFinite(item.unitPrice)))) throw new Error(`Invalid line items in ${key}.`)
      }
    }
  }
  if (data.companyProfile !== undefined) {
    if (!data.companyProfile || typeof data.companyProfile !== 'object' || Array.isArray(data.companyProfile)) throw new Error('Invalid company profile.')
    for (const key of Object.keys(defaultCompanyProfile)) {
      if (typeof (data.companyProfile as Record<string, unknown>)[key] !== 'string') throw new Error('Invalid company profile fields.')
    }
  }
  if (data.adminProfile !== undefined) {
    if (!data.adminProfile || typeof data.adminProfile !== 'object' || Array.isArray(data.adminProfile)) throw new Error('Invalid admin profile.')
    for (const key of Object.keys(defaultAdminProfile)) {
      if (typeof (data.adminProfile as Record<string, unknown>)[key] !== 'string') throw new Error('Invalid admin profile fields.')
    }
  }
  return data as unknown as AppDatabase
}

// Convert image file to offline Base64 string for OPFS / Local database
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export type ModuleKey =
  | 'dashboard'
  | 'pos'
  | 'sales'
  | 'customer-management'
  | 'purchase'
  | 'suppliers-management'
  | 'expenses'
  | 'products'
  | 'raw-materials'
  | 'employees'
  | 'reports'
  | 'settings'
  // Sub-routes & legacy keys for deep linking / routing
  | 'invoices'
  | 'counter-sales'
  | 'distributors'
  | 'wholesalers'
  | 'customers'
  | 'production'
  | 'stock'
  | 'suppliers'
  | 'purchases'
  | 'returns'
  | 'cash-bank'
  | 'daily-summary'
  | 'monthly-summary'
  | 'yearly-summary'
  | 'profit-loss'
  | 'phonebook'

export const moduleLabels: Record<ModuleKey, string> = {
  dashboard: 'Executive Dashboard',
  pos: 'Point of Sale (POS)',
  sales: 'Sales & Distribution',
  'customer-management': 'Customer Management',
  purchase: 'Purchases & Expenses',
  'suppliers-management': 'Suppliers',
  expenses: 'Purchases & Expenses',
  products: 'Finished Products',
  'raw-materials': 'Raw Material Warehouse',
  employees: 'Employees & Payroll',
  reports: 'Reports & Statements',
  settings: 'Settings & Backups',
  // Sub-labels
  invoices: 'Commercial Invoices',
  'counter-sales': 'Counter Sales (POS)',
  distributors: 'Distributors & Sales Reps',
  wholesalers: 'Wholesaler Accounts',
  customers: 'Customer & Shop Accounts',
  production: 'Plant Production Engine',
  stock: 'Stock Register & Alerts',
  suppliers: 'Supplier Accounts & Ledgers',
  purchases: 'Raw Material Purchases',
  returns: 'Returns & Defects',
  'cash-bank': 'Cash & Bank Accounts',
  'daily-summary': 'Daily Accounts Summary',
  'monthly-summary': 'Monthly Financial Statement',
  'yearly-summary': 'Yearly Financial Review',
  'profit-loss': 'Profit & Loss Statement',
  phonebook: 'Phone Book Directory',
}

// Currency formatting helper (Pakistani Rupee PKR)
export const formatPKR = (amount: number = 0): string => {
  return `Rs. ${Number(amount || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`
}

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}
