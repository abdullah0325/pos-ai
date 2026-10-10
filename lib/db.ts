// Client-side Offline Database & Storage for AL FAROOQ FOODS
// Operates 100% offline using IndexedDB + LocalStorage with JSON Export/Import

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
  name: 'AL FAROOQ FOODS',
  tagline: 'Mineral Water, Fruit Juices, Confectionery & Snacks',
  phone1: '0344 9549051',
  phone2: '0346 9829900',
  email: 'umarfarooq4847@gmail.com',
  address: 'Industrial Estate, Food & Beverage Zone, Punjab, Pakistan',
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

export const defaultPurchaseCategories: PurchaseCategoryItem[] = [
  { id: 'pcat-1', name: 'Raw Material Purchase', description: 'Grains, sugar, fruit pulp, concentrates & raw ingredients', color: 'emerald' },
  { id: 'pcat-2', name: 'Packaging Purchase', description: 'Bottles, preforms, caps, wrappers, cartons & shrink film', color: 'blue' },
  { id: 'pcat-3', name: 'Machinery Purchase', description: 'Production lines, motors, pumps, tooling & plant equipment', color: 'purple' },
  { id: 'pcat-4', name: 'Other Procurement', description: 'Consumables, plant spares, sanitizers & factory supplies', color: 'amber' },
]

export const defaultSupplierCategories: CategoryItem[] = [
  { id: 'supcat-1', name: 'Raw Material Supplier', color: 'emerald', description: 'Grains, sugar, fruit pulp, concentrates & raw ingredients', createdAt: '2026-08-01' },
  { id: 'supcat-2', name: 'Packaging Supplier', color: 'blue', description: 'PET preforms, caps, bottles, wrappers, cartons & labels', createdAt: '2026-08-01' },
  { id: 'supcat-3', name: 'Finished Product Supplier', color: 'indigo', description: 'Finished stock, trade goods & wholesale products', createdAt: '2026-08-01' },
  { id: 'supcat-4', name: 'Machinery/Equipment Vendor', color: 'purple', description: 'Plant machines, conveyor motors, compressors & tooling', createdAt: '2026-08-01' },
  { id: 'supcat-5', name: 'Service Provider', color: 'teal', description: 'Maintenance, technical services, transport & utilities', createdAt: '2026-08-01' },
]

export const defaultExpenseCategories: CategoryItem[] = [
  { id: 'expcat-1', name: 'Factory Utilities', color: 'amber', description: 'Electricity (WAPDA), gas, factory water & utility bills', createdAt: '2026-08-01' },
  { id: 'expcat-2', name: 'Fuel/Diesel', color: 'orange', description: 'Generator diesel, boiler fuel & delivery vehicle petrol', createdAt: '2026-08-01' },
  { id: 'expcat-3', name: 'Rent', color: 'rose', description: 'Factory building, warehouse & commercial space rent', createdAt: '2026-08-01' },
  { id: 'expcat-4', name: 'Maintenance', color: 'teal', description: 'Plant repairs, machine spare parts, boiler servicing', createdAt: '2026-08-01' },
  { id: 'expcat-5', name: 'Transport/Freight', color: 'sky', description: 'Raw material freight, dispatch delivery & loader charges', createdAt: '2026-08-01' },
  { id: 'expcat-6', name: 'Office Expenses', color: 'stone', description: 'Stationery, tea, kitchen supplies & office maintenance', createdAt: '2026-08-01' },
  { id: 'expcat-7', name: 'Salaries', color: 'emerald', description: 'Staff salaries, wages & production worker payroll', createdAt: '2026-08-01' },
  { id: 'expcat-8', name: 'Loan/Advance to employee', color: 'purple', description: 'Staff loan advances and salary advance deductions', createdAt: '2026-08-01' },
  { id: 'expcat-9', name: 'Marketing', color: 'blue', description: 'Brand promotion, posters, banners & digital ads', createdAt: '2026-08-01' },
  { id: 'expcat-10', name: 'Daily/Misc', color: 'stone', description: 'Daily miscellaneous petty cash expenditures', createdAt: '2026-08-01' },
]

export const defaultRawMaterialCategories: CategoryItem[] = [
  { id: 'rmcat-1', name: 'Packaging', color: 'blue', description: 'Bottling preforms, caps, wrappers, labels, cartons', createdAt: '2026-08-01' },
  { id: 'rmcat-2', name: 'Ingredients', color: 'emerald', description: 'Sugar, fruit pulp, concentrates, salt, food base', createdAt: '2026-08-01' },
  { id: 'rmcat-3', name: 'Chemicals & Minerals', color: 'amber', description: 'RO minerals, citric acid, sanitizers, preservatives', createdAt: '2026-08-01' },
  { id: 'rmcat-4', name: 'Flavors', color: 'purple', description: 'Food grade flavors, seasonings, essences & aromas', createdAt: '2026-08-01' },
]

export const defaultProductCategories: CategoryItem[] = [
  { id: 'cat-1', name: 'Mineral Water', description: 'Purified mineral water in bottles & gallons', createdAt: '2026-08-01' },
  { id: 'cat-2', name: 'Fruit Juice', description: 'Mango, Apple, Guava, Orange juices & nectars', createdAt: '2026-08-01' },
  { id: 'cat-3', name: 'Candy & Toffee', description: 'Milk toffees, fruit chews, candies, lollipops', createdAt: '2026-08-01' },
  { id: 'cat-4', name: 'Potato Chips', description: 'Crispy potato crisps & wavy chips', createdAt: '2026-08-01' },
  { id: 'cat-5', name: 'Snacks & Savories', description: 'Extruded snacks, corn puffs, nimko packs', createdAt: '2026-08-01' },
  { id: 'cat-6', name: 'Carbonated Beverages', description: 'Refreshing sparkling drinks & sodas', createdAt: '2026-08-01' },
  { id: 'cat-7', name: 'Other', description: 'General merchandise and new trial products', createdAt: '2026-08-01' },
]

export const defaultCustomerCategories: CustomerCategoryItem[] = [
  { id: 'ccat-1', name: 'Retailer', parentType: 'Retailer', description: 'Retail stores, marts, bakeries, general shops', createdAt: '2026-08-01' },
  { id: 'ccat-2', name: 'Distributor', parentType: 'Wholesaler', description: 'Bulk regional wholesale distributors', createdAt: '2026-08-01' },
  { id: 'ccat-3', name: 'Sales Man', parentType: 'Wholesaler', description: 'Field sales representatives & route order bookers', createdAt: '2026-08-01' },
  { id: 'ccat-4', name: 'Walk-in Customer', parentType: 'Walk-in', description: 'Walk-in counter buyers & occasional clients', createdAt: '2026-08-01' },
  { id: 'ccat-5', name: 'Van Sales', parentType: 'Wholesaler', description: 'Direct mobile van route sales & wholesale delivery', createdAt: '2026-08-01' },
]

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

// Initial Default Food Manufacturing Dataset
export const initialDatabase: AppDatabase = {
  version: 2,
  lastBackupDate: '2026-08-21T10:00:00.000Z',
  categories: defaultProductCategories,
  rawMaterialCategories: defaultRawMaterialCategories,
  customerCategories: defaultCustomerCategories,
  supplierCategories: defaultSupplierCategories,
  expenseCategories: defaultExpenseCategories,
  purchaseCategories: defaultPurchaseCategories,
  accounts: [
    { id: 'cash-in-hand', name: 'Cash in Hand (Factory Register)', type: 'Cash', balance: 345200, updatedAt: '2026-08-25' },
    { id: 'meezan-bank', name: 'Meezan Bank Ltd (A/C: 010203040510)', type: 'Bank', accountNumber: '010203040510', balance: 1680450, updatedAt: '2026-08-25' },
    { id: 'hbl-bank', name: 'Habib Bank Ltd - HBL (A/C: 998877665520)', type: 'Bank', accountNumber: '998877665520', balance: 945000, updatedAt: '2026-08-25' },
  ],
  products: [
    {
      id: 'prod-1',
      name: 'Al-Farooq Mineral Water 500ml (24-pack)',
      category: 'Mineral Water',
      sku: 'AFW-500-24',
      quantity: 380,
      unit: 'Cartons',
      costPrice: 380,
      wholesalePrice: 540,
      retailPrice: 720,
      reorderLevel: 60,
      status: 'In stock',
      description: '24 x 500ml Premium Purified Bottled Drinking Water Cartons',
      updatedAt: '2026-08-24',
    },
    {
      id: 'prod-2',
      name: 'Al-Farooq Mineral Water 1.5L (12-pack)',
      category: 'Mineral Water',
      sku: 'AFW-1500-12',
      quantity: 240,
      unit: 'Cartons',
      costPrice: 420,
      wholesalePrice: 590,
      retailPrice: 780,
      reorderLevel: 50,
      status: 'In stock',
      description: '12 x 1.5L Pure Mineral Water with balanced TDS',
      updatedAt: '2026-08-24',
    },
    {
      id: 'prod-3',
      name: 'Al-Farooq Mineral Water 6L Family Bottle',
      category: 'Mineral Water',
      sku: 'AFW-6000-1',
      quantity: 160,
      unit: 'Bottles',
      costPrice: 140,
      wholesalePrice: 195,
      retailPrice: 260,
      reorderLevel: 40,
      status: 'In stock',
      description: '6 Liter Convenient Family Bottle with ergonomic handle',
      updatedAt: '2026-08-23',
    },
    {
      id: 'prod-4',
      name: 'Al-Farooq 19L Dispenser Bottle (Refill)',
      category: 'Mineral Water',
      sku: 'AFW-19L-GAL',
      quantity: 85,
      unit: 'Bottles',
      costPrice: 65,
      wholesalePrice: 110,
      retailPrice: 160,
      reorderLevel: 25,
      status: 'In stock',
      description: 'Standard 19-Liter Commercial/Office dispenser water bottle',
      updatedAt: '2026-08-24',
    },
    {
      id: 'prod-5',
      name: 'Al-Farooq Chaunsa Mango Nectar 250ml (24-pack)',
      category: 'Fruit Juice',
      sku: 'AFJ-MNG-250',
      quantity: 420,
      unit: 'Cartons',
      costPrice: 780,
      wholesalePrice: 1050,
      retailPrice: 1320,
      reorderLevel: 80,
      status: 'In stock',
      description: '24 x 250ml Chaunsa Mango Juice with rich fruit pulp',
      updatedAt: '2026-08-24',
    },
    {
      id: 'prod-6',
      name: 'Al-Farooq Red Apple Juice 250ml (24-pack)',
      category: 'Fruit Juice',
      sku: 'AFJ-APL-250',
      quantity: 290,
      unit: 'Cartons',
      costPrice: 810,
      wholesalePrice: 1100,
      retailPrice: 1380,
      reorderLevel: 60,
      status: 'In stock',
      description: '24 x 250ml Crisp Kashmiri Red Apple Juice',
      updatedAt: '2026-08-24',
    },
    {
      id: 'prod-7',
      name: 'Al-Farooq Guava Fruit Nectar 250ml (24-pack)',
      category: 'Fruit Juice',
      sku: 'AFJ-GVA-250',
      quantity: 195,
      unit: 'Cartons',
      costPrice: 760,
      wholesalePrice: 1020,
      retailPrice: 1300,
      reorderLevel: 50,
      status: 'In stock',
      description: '24 x 250ml Pink Guava Nectar with Vitamin C',
      updatedAt: '2026-08-22',
    },
    {
      id: 'prod-8',
      name: 'Farooq Royal Milk Toffee (1kg Jar x 12)',
      category: 'Candy & Toffee',
      sku: 'AFT-MLK-12',
      quantity: 95,
      unit: 'Cartons',
      costPrice: 2100,
      wholesalePrice: 2750,
      retailPrice: 3400,
      reorderLevel: 30,
      status: 'In stock',
      description: '12 x 1kg Jars of Rich Creamy Caramel Milk Toffees',
      updatedAt: '2026-08-21',
    },
    {
      id: 'prod-9',
      name: 'Farooq Butter Candy Roll (72-pack Dispenser)',
      category: 'Candy & Toffee',
      sku: 'AFC-BTR-72',
      quantity: 140,
      unit: 'Boxes',
      costPrice: 850,
      wholesalePrice: 1150,
      retailPrice: 1440,
      reorderLevel: 40,
      status: 'In stock',
      description: '72 Rolls per retail counter display box',
      updatedAt: '2026-08-22',
    },
    {
      id: 'prod-10',
      name: 'Farooq Crispy Potato Chips Salted 40g (30-pack)',
      category: 'Snacks & Chips',
      sku: 'AFS-CHP-SLT',
      quantity: 180,
      unit: 'Cartons',
      costPrice: 920,
      wholesalePrice: 1200,
      retailPrice: 1500,
      reorderLevel: 45,
      status: 'In stock',
      description: '30 x 40g Classic Salted Golden Potato Chips',
      updatedAt: '2026-08-23',
    },
    {
      id: 'prod-11',
      name: 'Farooq Masala Crinkle Chips 40g (30-pack)',
      category: 'Snacks & Chips',
      sku: 'AFS-CHP-MSL',
      quantity: 35,
      unit: 'Cartons',
      costPrice: 940,
      wholesalePrice: 1250,
      retailPrice: 1550,
      reorderLevel: 50,
      status: 'Low stock',
      description: '30 x 40g Spicy Chatpata Crinkle Cut Chips',
      updatedAt: '2026-08-24',
    },
  ],
  rawMaterials: [
    {
      id: 'raw-1',
      name: 'Refined White Sugar (Food Grade A)',
      category: 'Ingredients',
      sku: 'RAW-SGR-01',
      quantity: 2600,
      unit: 'kg',
      unitCost: 145,
      reorderLevel: 800,
      supplierId: 'sup-1',
      supplierName: 'National Sugar Mills',
      status: 'In stock',
      updatedAt: '2026-08-24',
    },
    {
      id: 'raw-2',
      name: 'Premium Chaunsa Mango Pulp Aseptic',
      category: 'Ingredients',
      sku: 'RAW-MNG-02',
      quantity: 1450,
      unit: 'kg',
      unitCost: 320,
      reorderLevel: 500,
      supplierId: 'sup-2',
      supplierName: 'Sindh Agro Pulp Ltd',
      status: 'In stock',
      updatedAt: '2026-08-24',
    },
    {
      id: 'raw-3',
      name: 'Apple Juice Concentrate 70° Brix',
      category: 'Ingredients',
      sku: 'RAW-APL-03',
      quantity: 920,
      unit: 'kg',
      unitCost: 480,
      reorderLevel: 300,
      supplierId: 'sup-2',
      supplierName: 'Sindh Agro Pulp Ltd',
      status: 'In stock',
      updatedAt: '2026-08-23',
    },
    {
      id: 'raw-4',
      name: 'PET Preforms 500ml (28mm Neck)',
      category: 'Packaging',
      sku: 'RAW-PET-500',
      quantity: 16500,
      unit: 'Pcs',
      unitCost: 6.5,
      reorderLevel: 4000,
      supplierId: 'sup-3',
      supplierName: 'Crown Plastics & Preforms',
      status: 'In stock',
      updatedAt: '2026-08-24',
    },
    {
      id: 'raw-5',
      name: 'PET Preforms 1.5L (30mm Neck)',
      category: 'Packaging',
      sku: 'RAW-PET-1500',
      quantity: 9800,
      unit: 'Pcs',
      unitCost: 11.2,
      reorderLevel: 2500,
      supplierId: 'sup-3',
      supplierName: 'Crown Plastics & Preforms',
      status: 'In stock',
      updatedAt: '2026-08-24',
    },
    {
      id: 'raw-6',
      name: '28mm HDPE Bottling Caps (Tamper Evident)',
      category: 'Packaging',
      sku: 'RAW-CAP-28',
      quantity: 21000,
      unit: 'Pcs',
      unitCost: 2.1,
      reorderLevel: 5000,
      supplierId: 'sup-3',
      supplierName: 'Crown Plastics & Preforms',
      status: 'In stock',
      updatedAt: '2026-08-24',
    },
    {
      id: 'raw-7',
      name: 'BOPP Wrap-Around Bottle Labels 500ml',
      category: 'Packaging',
      sku: 'RAW-LBL-500',
      quantity: 18400,
      unit: 'Pcs',
      unitCost: 1.8,
      reorderLevel: 4000,
      supplierId: 'sup-4',
      supplierName: 'Universal Packaging Solutions',
      status: 'In stock',
      updatedAt: '2026-08-23',
    },
    {
      id: 'raw-8',
      name: 'Corrugated Master Cartons (24-pack Water)',
      category: 'Packaging',
      sku: 'RAW-BOX-WTR',
      quantity: 1550,
      unit: 'Pcs',
      unitCost: 45,
      reorderLevel: 400,
      supplierId: 'sup-5',
      supplierName: 'Boxcraft Packages',
      status: 'In stock',
      updatedAt: '2026-08-24',
    },
    {
      id: 'raw-9',
      name: 'Corrugated Master Cartons (Juice 24-pack)',
      category: 'Packaging',
      sku: 'RAW-BOX-JCE',
      quantity: 1300,
      unit: 'Pcs',
      unitCost: 52,
      reorderLevel: 350,
      supplierId: 'sup-5',
      supplierName: 'Boxcraft Packages',
      status: 'In stock',
      updatedAt: '2026-08-24',
    },
    {
      id: 'raw-10',
      name: 'Purified RO Water Minerals Premix',
      category: 'Chemicals & Minerals',
      sku: 'RAW-MIN-01',
      quantity: 180,
      unit: 'kg',
      unitCost: 450,
      reorderLevel: 50,
      supplierId: 'sup-6',
      supplierName: 'ChemPure Industrial',
      status: 'In stock',
      updatedAt: '2026-08-22',
    },
    {
      id: 'raw-11',
      name: 'Food Grade Citric Acid Monohydrate',
      category: 'Ingredients',
      sku: 'RAW-CIT-01',
      quantity: 260,
      unit: 'kg',
      unitCost: 380,
      reorderLevel: 80,
      supplierId: 'sup-6',
      supplierName: 'ChemPure Industrial',
      status: 'In stock',
      updatedAt: '2026-08-22',
    },
    {
      id: 'raw-12',
      name: 'Fresh Potato Slices / Flakes for Chips',
      category: 'Ingredients',
      sku: 'RAW-POT-01',
      quantity: 450,
      unit: 'kg',
      unitCost: 85,
      reorderLevel: 600,
      supplierId: 'sup-7',
      supplierName: 'Punjab Agri Farms',
      status: 'Low stock',
      updatedAt: '2026-08-24',
    },
    {
      id: 'raw-13',
      name: 'Refined Edible Frying Oil',
      category: 'Ingredients',
      sku: 'RAW-OIL-01',
      quantity: 820,
      unit: 'Liters',
      unitCost: 420,
      reorderLevel: 300,
      supplierId: 'sup-8',
      supplierName: 'Faisalabad Oil Mills',
      status: 'In stock',
      updatedAt: '2026-08-23',
    },
    {
      id: 'raw-14',
      name: 'Special Chatpata Masala Seasoning',
      category: 'Flavors',
      sku: 'RAW-MSL-01',
      quantity: 65,
      unit: 'kg',
      unitCost: 650,
      reorderLevel: 80,
      supplierId: 'sup-6',
      supplierName: 'ChemPure Industrial',
      status: 'Low stock',
      updatedAt: '2026-08-24',
    },
  ],
  productionRuns: [
    {
      id: 'pr-1',
      batchNumber: 'BATCH-2026-0824',
      date: '2026-08-24',
      productId: 'prod-5',
      productName: 'Al-Farooq Chaunsa Mango Nectar 250ml (24-pack)',
      targetQuantity: 200,
      unit: 'Cartons',
      consumedMaterials: [
        { rawMaterialId: 'raw-2', name: 'Premium Chaunsa Mango Pulp Aseptic', quantity: 240, unit: 'kg', unitCost: 320, totalCost: 76800 },
        { rawMaterialId: 'raw-1', name: 'Refined White Sugar (Food Grade A)', quantity: 180, unit: 'kg', unitCost: 145, totalCost: 26100 },
        { rawMaterialId: 'raw-11', name: 'Food Grade Citric Acid Monohydrate', quantity: 5, unit: 'kg', unitCost: 380, totalCost: 1900 },
        { rawMaterialId: 'raw-4', name: 'PET Preforms 500ml (28mm Neck)', quantity: 4800, unit: 'Pcs', unitCost: 6.5, totalCost: 31200 },
        { rawMaterialId: 'raw-6', name: '28mm HDPE Bottling Caps (Tamper Evident)', quantity: 4800, unit: 'Pcs', unitCost: 2.1, totalCost: 10080 },
        { rawMaterialId: 'raw-9', name: 'Corrugated Master Cartons (Juice 24-pack)', quantity: 200, unit: 'Pcs', unitCost: 52, totalCost: 10400 },
      ],
      laborCost: 12000,
      overheadCost: 6500,
      totalProductionCost: 174980,
      unitCost: 874.9,
      status: 'Completed',
      supervisor: 'Engr. Sanaullah',
      notes: 'Passed quality assurance & refractometer Brix test at 14.2°',
    },
    {
      id: 'pr-2',
      batchNumber: 'BATCH-2026-0823',
      date: '2026-08-23',
      productId: 'prod-1',
      productName: 'Al-Farooq Mineral Water 500ml (24-pack)',
      targetQuantity: 300,
      unit: 'Cartons',
      consumedMaterials: [
        { rawMaterialId: 'raw-10', name: 'Purified RO Water Minerals Premix', quantity: 6, unit: 'kg', unitCost: 450, totalCost: 2700 },
        { rawMaterialId: 'raw-4', name: 'PET Preforms 500ml (28mm Neck)', quantity: 7200, unit: 'Pcs', unitCost: 6.5, totalCost: 46800 },
        { rawMaterialId: 'raw-6', name: '28mm HDPE Bottling Caps (Tamper Evident)', quantity: 7200, unit: 'Pcs', unitCost: 2.1, totalCost: 15120 },
        { rawMaterialId: 'raw-7', name: 'BOPP Wrap-Around Bottle Labels 500ml', quantity: 7200, unit: 'Pcs', unitCost: 1.8, totalCost: 12960 },
        { rawMaterialId: 'raw-8', name: 'Corrugated Master Cartons (24-pack Water)', quantity: 300, unit: 'Pcs', unitCost: 45, totalCost: 13500 },
      ],
      laborCost: 9000,
      overheadCost: 4500,
      totalProductionCost: 104580,
      unitCost: 348.6,
      status: 'Completed',
      supervisor: 'Tariq Javed',
      notes: 'Ozone sterilized and automated blow moulding line A',
    },
    {
      id: 'pr-3',
      batchNumber: 'BATCH-2026-0825-PLANNED',
      date: '2026-08-25',
      productId: 'prod-11',
      productName: 'Farooq Masala Crinkle Chips 40g (30-pack)',
      targetQuantity: 120,
      unit: 'Cartons',
      consumedMaterials: [
        { rawMaterialId: 'raw-12', name: 'Fresh Potato Slices / Flakes for Chips', quantity: 200, unit: 'kg', unitCost: 85, totalCost: 17000 },
        { rawMaterialId: 'raw-13', name: 'Refined Edible Frying Oil', quantity: 80, unit: 'Liters', unitCost: 420, totalCost: 33600 },
        { rawMaterialId: 'raw-14', name: 'Special Chatpata Masala Seasoning', quantity: 18, unit: 'kg', unitCost: 650, totalCost: 11700 },
      ],
      laborCost: 7500,
      overheadCost: 3800,
      totalProductionCost: 73600,
      unitCost: 613.3,
      status: 'In production',
      supervisor: 'Zubair Qureshi',
      notes: 'Continuous frying line #2 in progress',
    },
  ],
  customers: [
    {
      id: 'cust-1',
      name: 'Haji Noor Muhammad',
      businessName: 'Noor Beverages & Distribution Hub',
      type: 'Distributor',
      phone: '0344 9549051',
      altPhone: '0300 9876543',
      email: 'noor.beverages@gmail.com',
      cnic: '17301-8947261-3',
      address: 'Shop # 14-18, New G.T. Road Wholesale Market',
      city: 'Peshawar',
      territory: 'Peshawar, Charsadda & Khyber Pass',
      openingBalance: 120000,
      currentBalance: 185400,
      creditLimit: 500000,
      status: 'Active',
      notes: 'Major exclusive distributor for KPK region. Regular 15-day bank transfer settlement.',
      paymentRecords: [
        {
          id: 'pay-dist-1',
          receiptNumber: 'REC-2026-1048',
          date: '2026-08-24',
          amount: 150000,
          paymentMethod: 'Bank Transfer',
          paymentAccount: 'meezan-bank',
          transactionRef: 'MZB-IBFT-889123',
          receiptImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><rect width="300" height="150" fill="%23f0fdf4" stroke="%2316a34a" stroke-width="2"/><text x="15" y="30" font-family="Arial" font-size="14" font-weight="bold" fill="%23166534">MEEZAN BANK ONLINE TRANSFER</text><text x="15" y="55" font-family="Arial" font-size="11" fill="%23374151">From: Noor Beverages (Peshawar)</text><text x="15" y="75" font-family="Arial" font-size="11" fill="%23374151">To: AL FAROOQ FOODS (PK12MEZN0012)</text><text x="15" y="100" font-family="Arial" font-size="16" font-weight="bold" fill="%2315803d">AMOUNT: PKR 150,000</text><text x="15" y="125" font-family="Arial" font-size="10" fill="%236b7280">Ref: MZB-IBFT-889123 | 24-Aug-2026</text><circle cx="260" cy="110" r="22" fill="%2322c55e" opacity="0.2"/><text x="245" y="115" font-family="Arial" font-size="12" font-weight="bold" fill="%2315803d">PAID</text></svg>',
          notes: 'Partial advance against Invoice # INV-2026-1048 via Meezan Bank Raast transfer.',
          createdAt: '2026-08-24T12:00:00Z',
        },
      ],
      updatedAt: '2026-08-24',
    },
    {
      id: 'cust-2',
      name: 'Chaudhry Riaz Ahmed',
      businessName: 'Al-Madina Mega Cash & Carry',
      type: 'Wholesaler',
      phone: '0346 9829900',
      altPhone: '0333 5566778',
      email: 'almadina.pindi@gmail.com',
      cnic: '37405-1982736-5',
      address: 'Main Grain Market, Gunj Mandi Road',
      city: 'Rawalpindi',
      territory: 'Rawalpindi City & Islamabad Wholesale',
      openingBalance: 50000,
      currentBalance: 92600,
      creditLimit: 300000,
      status: 'Active',
      notes: 'High volume wholesale buyer for mineral water and juice cartons.',
      paymentRecords: [
        {
          id: 'pay-whs-1',
          receiptNumber: 'REC-2026-1047',
          date: '2026-08-24',
          amount: 136000,
          paymentMethod: 'Bank Transfer',
          paymentAccount: 'hbl-bank',
          transactionRef: 'TR-982103',
          receiptImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><rect width="300" height="150" fill="%23eff6ff" stroke="%232563eb" stroke-width="2"/><text x="15" y="30" font-family="Arial" font-size="14" font-weight="bold" fill="%231e40af">HBL DIGITAL BANKING RECEIPT</text><text x="15" y="55" font-family="Arial" font-size="11" fill="%23374151">Beneficiary: AL FAROOQ FOODS</text><text x="15" y="75" font-family="Arial" font-size="11" fill="%23374151">Account: 01427900183701</text><text x="15" y="100" font-family="Arial" font-size="16" font-weight="bold" fill="%231d4ed8">AMOUNT: PKR 136,000</text><text x="15" y="125" font-family="Arial" font-size="10" fill="%236b7280">Ref: TR-982103 | 24-Aug-2026 14:15</text></svg>',
          notes: 'Full payment for invoice INV-1047 cleared via HBL Konnect.',
          createdAt: '2026-08-24T14:20:00Z',
        },
      ],
      updatedAt: '2026-08-24',
    },
    {
      id: 'cust-3',
      name: 'Malik Jahangir Khan',
      businessName: 'Khyber Fast Distribution Network',
      type: 'Distributor',
      phone: '0300 5544332',
      altPhone: '0345 8899776',
      cnic: '16101-7294018-9',
      address: 'Industrial Estate Gate 2, Nowshera Road',
      city: 'Mardan',
      territory: 'Mardan, Swabi, Malakand & Swat Valley',
      openingBalance: 150000,
      currentBalance: 240000,
      creditLimit: 600000,
      status: 'Active',
      notes: 'Handles 4 delivery supply vans covering Mardan and Swabi.',
      paymentRecords: [
        {
          id: 'pay-dist-3',
          receiptNumber: 'REC-2026-1035',
          date: '2026-08-20',
          amount: 120000,
          paymentMethod: 'Cash',
          paymentAccount: 'cash-in-hand',
          transactionRef: 'CASH-VOUCHER-0820',
          notes: 'Cash collected by factory supply driver upon unloading.',
          createdAt: '2026-08-20T16:00:00Z',
        },
      ],
      updatedAt: '2026-08-23',
    },
    {
      id: 'rep-1',
      name: 'Muhammad Tariq Mehmood',
      businessName: 'Al-Farooq Direct Field Operations (Lahore Zone)',
      type: 'Sales Representative',
      phone: '0302 4433221',
      altPhone: '0321 7766554',
      email: 'tariq.sales@alfarooqfoods.pk',
      cnic: '35201-4455667-1',
      address: 'House # 42, Street 7, Allama Iqbal Town',
      city: 'Lahore',
      territory: 'Lahore South, Multan Road & Sundar Industrial Area',
      openingBalance: 0,
      currentBalance: 42500,
      creditLimit: 200000,
      status: 'Active',
      notes: 'Key field sales representative managing order-booking and van supplies in Lahore retail markets.',
      paymentRecords: [
        {
          id: 'pay-rep-1',
          receiptNumber: 'REC-2026-REP01',
          date: '2026-08-23',
          amount: 35000,
          paymentMethod: 'Cash',
          paymentAccount: 'cash-in-hand',
          transactionRef: 'VAN-CASH-COLL-0823',
          notes: 'Daily van sales collection deposited at factory counter.',
          createdAt: '2026-08-23T18:00:00Z',
        },
      ],
      updatedAt: '2026-08-24',
    },
    {
      id: 'rep-2',
      name: 'Sardar Zubair Abbasi',
      businessName: 'Hazara & Abbottabad Route Rep',
      type: 'Sales Representative',
      phone: '0333 9123456',
      altPhone: '0346 1122334',
      email: 'zubair.hazara@alfarooqfoods.pk',
      cnic: '13101-9988776-5',
      address: 'Main Mansehra Road, Supply Bazaar',
      city: 'Abbottabad',
      territory: 'Abbottabad, Haripur, Mansehra & Murree Hills',
      openingBalance: 0,
      currentBalance: 28400,
      creditLimit: 150000,
      status: 'Active',
      notes: 'Dedicated representative for hill station mart and restaurant distribution networks.',
      paymentRecords: [
        {
          id: 'pay-rep-2',
          receiptNumber: 'REC-2026-REP02',
          date: '2026-08-22',
          amount: 25000,
          paymentMethod: 'Online',
          paymentAccount: 'meezan-bank',
          transactionRef: 'MZB-REP-9921',
          receiptImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><rect width="300" height="150" fill="%23fefce8" stroke="%23ca8a04" stroke-width="2"/><text x="15" y="30" font-family="Arial" font-size="14" font-weight="bold" fill="%23854d0e">MEEZAN BANK CASH DEPOSIT</text><text x="15" y="55" font-family="Arial" font-size="11" fill="%23374151">Depositor: Zubair Abbasi (Sales Rep)</text><text x="15" y="75" font-family="Arial" font-size="11" fill="%23374151">Abbottabad Branch Deposit Slip</text><text x="15" y="100" font-family="Arial" font-size="16" font-weight="bold" fill="%23a16207">AMOUNT: PKR 25,000</text><text x="15" y="125" font-family="Arial" font-size="10" fill="%236b7280">Ref: MZB-REP-9921 | 22-Aug-2026</text></svg>',
          notes: 'Direct branch cash deposit from Abbottabad routes.',
          createdAt: '2026-08-22T15:30:00Z',
        },
      ],
      updatedAt: '2026-08-23',
    },
    {
      id: 'cust-4',
      name: 'Sheikh Nabeel & Brothers',
      businessName: 'Chenab Valley Traders & Wholesalers',
      type: 'Wholesaler',
      phone: '0312 8877665',
      altPhone: '0300 1122334',
      address: 'Circular Road, Near Clock Tower Wholesale Grain Market',
      city: 'Gujranwala',
      territory: 'Gujranwala & Sialkot Belt',
      openingBalance: 30000,
      currentBalance: 48000,
      creditLimit: 200000,
      status: 'Active',
      notes: 'Wholesaler for confectionery, juices, and snacks.',
      paymentRecords: [
        {
          id: 'pay-whs-4',
          receiptNumber: 'REC-2026-WHS04',
          date: '2026-08-21',
          amount: 50000,
          paymentMethod: 'Bank Transfer',
          paymentAccount: 'meezan-bank',
          transactionRef: 'MZB-GUJ-4481',
          notes: 'Bank transfer clearing previous bulk shipment.',
          createdAt: '2026-08-21T11:00:00Z',
        }
      ],
      updatedAt: '2026-08-22',
    },
    {
      id: 'shop-101',
      name: 'Kashif Mehmood',
      businessName: 'Gulberg Supermart & Gourmet Bakers',
      type: 'Retailer',
      phone: '0333 4455667',
      altPhone: '0321 9988112',
      address: 'Shop # 12-14, Block C-2, Main Boulevard Gulberg III',
      city: 'Lahore',
      territory: 'Gulberg & Model Town',
      openingBalance: 15000,
      currentBalance: 29500,
      creditLimit: 120000,
      status: 'Active',
      notes: 'High-end supermarket with regular weekly bulk deliveries of juices and chips.',
      paymentRecords: [
        {
          id: 'pay-shop-101',
          receiptNumber: 'REC-2026-SH101',
          date: '2026-08-23',
          amount: 20000,
          paymentMethod: 'Online',
          paymentAccount: 'meezan-bank',
          transactionRef: 'RAAST-LHR-88219',
          receiptImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><rect width="300" height="150" fill="%23f0fdf4" stroke="%2316a34a" stroke-width="2"/><text x="15" y="30" font-family="Arial" font-size="14" font-weight="bold" fill="%23166534">RAAST INSTANT PAYMENT RECEIPT</text><text x="15" y="55" font-family="Arial" font-size="11" fill="%23374151">From: Gulberg Supermart (Kashif)</text><text x="15" y="75" font-family="Arial" font-size="11" fill="%23374151">To: AL FAROOQ FOODS RAAST ID</text><text x="15" y="100" font-family="Arial" font-size="16" font-weight="bold" fill="%2315803d">AMOUNT: PKR 20,000</text><text x="15" y="125" font-family="Arial" font-size="10" fill="%236b7280">Ref: RAAST-LHR-88219 | 23-Aug-2026</text></svg>',
          notes: 'Raast online payment against previous delivery order.',
          createdAt: '2026-08-23T14:30:00Z',
        },
      ],
      updatedAt: '2026-08-24',
    },
    {
      id: 'shop-102',
      name: 'Haji Abdul Sattar',
      businessName: 'Bismillah Cash & Carry / Wholesale Mart',
      type: 'Wholesaler',
      phone: '0301 7766554',
      altPhone: '0344 3322110',
      address: 'Shop 45-48, Karkhano Wholesale Market, Jamrud Road',
      city: 'Peshawar',
      territory: 'Karkhano Market & Hayatabad',
      openingBalance: 40000,
      currentBalance: 68500,
      creditLimit: 250000,
      status: 'Active',
      notes: 'Bulk buyer of juices, toffees and 500ml water bottles.',
      paymentRecords: [
        {
          id: 'pay-shop-102',
          receiptNumber: 'REC-2026-SH102',
          date: '2026-08-24',
          amount: 50000,
          paymentMethod: 'Cash',
          paymentAccount: 'cash-in-hand',
          transactionRef: 'CASH-REC-0824',
          notes: 'Direct cash handed to driver on delivery.',
          createdAt: '2026-08-24T16:00:00Z',
        }
      ],
      updatedAt: '2026-08-24',
    },
    {
      id: 'shop-103',
      name: 'Muhammad Usman Qureshi',
      businessName: 'Al-Makkah General & Departmental Store',
      type: 'Retailer',
      phone: '0313 9988771',
      address: 'Shop # 8, Commercial Market, Satellite Town, Block B',
      city: 'Rawalpindi',
      territory: 'Satellite Town & 6th Road',
      openingBalance: 0,
      currentBalance: 18400,
      creditLimit: 80000,
      status: 'Active',
      notes: 'Retail mart taking bi-weekly chip and candy replenishments.',
      paymentRecords: [
        {
          id: 'pay-shop-103',
          receiptNumber: 'REC-2026-SH103',
          date: '2026-08-22',
          amount: 15000,
          paymentMethod: 'Online',
          paymentAccount: 'meezan-bank',
          transactionRef: 'MZB-IBFT-3391',
          notes: 'Online bank deposit from Rawalpindi.',
          createdAt: '2026-08-22T10:00:00Z',
        }
      ],
      updatedAt: '2026-08-24',
    },
    {
      id: 'shop-104',
      name: 'Engr. Junaid Afridi',
      businessName: 'Khyber Canteen & Institutional Caterers',
      type: 'Other',
      phone: '0345 1122339',
      address: 'Main Food Court, Hayatabad Medical Complex',
      city: 'Peshawar',
      territory: 'Hayatabad Institutional Accounts',
      openingBalance: 0,
      currentBalance: 24500,
      creditLimit: 100000,
      status: 'Active',
      notes: 'Supplies hospital staff and patient canteens with bottled water and juices.',
      paymentRecords: [
        {
          id: 'pay-shop-104',
          receiptNumber: 'REC-2026-SH104',
          date: '2026-08-21',
          amount: 20000,
          paymentMethod: 'Cheque',
          paymentAccount: 'hbl-bank',
          transactionRef: 'CHQ-HBL-009182',
          notes: 'Institutional clearing cheque deposited to HBL.',
          createdAt: '2026-08-21T13:00:00Z',
        }
      ],
      updatedAt: '2026-08-24',
    },
    {
      id: 'cust-6',
      name: 'Walk-in Counter Sales',
      businessName: 'Al-Farooq Foods Factory Outlet',
      type: 'Counter',
      phone: '0347 8496579',
      address: 'Factory Main Gate # 1, Industrial Sector',
      city: 'Factory Counter',
      openingBalance: 0,
      currentBalance: 0,
      creditLimit: 0,
      status: 'Active',
      notes: 'Cash on delivery / instantaneous counter sales.',
      updatedAt: '2026-08-25',
    },
  ],
  suppliers: [
    {
      id: 'sup-1',
      name: 'National Sugar Mills Ltd',
      contactPerson: 'Tariq Mehmood (Sales Director)',
      category: 'Sugar & Sweeteners',
      phone: '0301 2233445',
      email: 'sales@nationalsugar.pk',
      address: 'Sugar Mill Complex, Millat Road',
      city: 'Faisalabad',
      openingBalance: 80000,
      currentBalance: 120000,
      status: 'Active',
      notes: '50kg food-grade sugar bags in truckloads.',
      updatedAt: '2026-08-23',
    },
    {
      id: 'sup-2',
      name: 'Sindh Agro Pulp Ltd',
      contactPerson: 'Ghulam Rasool',
      category: 'Fruit Pulps & Concentrates',
      phone: '0321 9988776',
      email: 'info@sindhagropulp.com',
      address: 'Agro Industrial Zone, Mirpurkhas',
      city: 'Mirpurkhas',
      openingBalance: 180000,
      currentBalance: 260000,
      status: 'Active',
      notes: 'Aseptic barrel packaging with 2-year shelf life.',
      updatedAt: '2026-08-24',
    },
    {
      id: 'sup-3',
      name: 'Crown Plastics & Preforms',
      contactPerson: 'Engr. Farhan Munir',
      category: 'PET Preforms & Bottle Caps',
      phone: '0345 6677889',
      email: 'farhan@crownplastics.com.pk',
      address: 'Plot 45-B, Sundar Industrial Estate',
      city: 'Lahore',
      openingBalance: 50000,
      currentBalance: 84000,
      status: 'Active',
      notes: 'High clarity virgin grade PET preforms and airtight caps.',
      updatedAt: '2026-08-24',
    },
    {
      id: 'sup-4',
      name: 'Universal Packaging Solutions',
      contactPerson: 'Sajid Ali',
      category: 'Labels & Shrink Film',
      phone: '0333 7788991',
      address: 'Korangi Industrial Area, Sector 23',
      city: 'Karachi',
      openingBalance: 20000,
      currentBalance: 32000,
      status: 'Active',
      notes: '8-color high-definition gravure printed labels.',
      updatedAt: '2026-08-21',
    },
    {
      id: 'sup-5',
      name: 'Boxcraft Packages',
      contactPerson: 'Zafar Iqbal',
      category: 'Corrugated Master Cartons',
      phone: '0334 1122334',
      address: 'Multan Road, Near Thokar Niaz Baig',
      city: 'Lahore',
      openingBalance: 35000,
      currentBalance: 45000,
      status: 'Active',
      notes: 'Heavy-duty 5-ply cartons for water & juice bottles.',
      updatedAt: '2026-08-23',
    },
    {
      id: 'sup-6',
      name: 'ChemPure Industrial',
      contactPerson: 'Dr. Shakeel Ahmed',
      category: 'Food Chemicals & RO Minerals',
      phone: '0300 7788990',
      address: 'Quaid-e-Azam Industrial Estate, Kot Lakhpat',
      city: 'Lahore',
      openingBalance: 10000,
      currentBalance: 18500,
      status: 'Active',
      notes: 'Supplies certified USP/Food Grade minerals and food acids.',
      updatedAt: '2026-08-22',
    },
    {
      id: 'sup-7',
      name: 'Punjab Agri Farms',
      contactPerson: 'Ch. Asghar Ali',
      category: 'Potatoes & Agro Produce',
      phone: '0314 5566778',
      address: 'Depalpur Road, Okara Agri Hub',
      city: 'Okara',
      openingBalance: 25000,
      currentBalance: 42000,
      status: 'Active',
      notes: 'High solid matter Lady Rosetta potato varieties for chips.',
      updatedAt: '2026-08-24',
    },
    {
      id: 'sup-8',
      name: 'Faisalabad Oil Mills',
      contactPerson: 'Malik Aslam',
      category: 'Refined Edible Cooking Oil',
      phone: '0313 4455661',
      address: 'Jhang Road, Small Industrial Estate',
      city: 'Faisalabad',
      openingBalance: 60000,
      currentBalance: 95000,
      status: 'Active',
      notes: 'Double refined palm olein oil for snacks frying.',
      updatedAt: '2026-08-23',
    },
  ],
  invoices: [
    {
      id: 'inv-1048',
      invoiceNumber: 'INV-2026-1048',
      date: '2026-08-24',
      customerId: 'cust-1',
      customerName: 'Haji Noor Muhammad (Noor Beverages)',
      customerType: 'Distributor',
      phone: '0344 9549051',
      address: 'Shop # 14-18, New G.T. Road Wholesale Market, Peshawar',
      saleType: 'Distributor',
      items: [
        { productId: 'prod-1', name: 'Al-Farooq Mineral Water 500ml (24-pack)', quantity: 150, unit: 'Cartons', unitPrice: 540, costPrice: 380, total: 81000 },
        { productId: 'prod-2', name: 'Al-Farooq Mineral Water 1.5L (12-pack)', quantity: 80, unit: 'Cartons', unitPrice: 590, costPrice: 420, total: 47200 },
        { productId: 'prod-5', name: 'Al-Farooq Chaunsa Mango Nectar 250ml (24-pack)', quantity: 100, unit: 'Cartons', unitPrice: 1050, costPrice: 780, total: 105000 },
      ],
      subtotal: 233200,
      discount: 3200,
      tax: 0,
      grandTotal: 230000,
      amountPaid: 150000,
      balanceDue: 80000,
      paymentMethod: 'Bank Transfer',
      paymentAccount: 'meezan-bank',
      status: 'Partial',
      deliveryStatus: 'Delivered',
      notes: 'Dispatched via Mazda Truck # LES-4890. Driver: Akram.',
      createdAt: '2026-08-24T11:30:00Z',
    },
    {
      id: 'inv-1047',
      invoiceNumber: 'INV-2026-1047',
      date: '2026-08-24',
      customerId: 'cust-2',
      customerName: 'Chaudhry Riaz Ahmed (Al-Madina Mega Cash & Carry)',
      customerType: 'Wholesaler',
      phone: '0346 9829900',
      address: 'Main Grain Market, Rawalpindi',
      saleType: 'Wholesale',
      items: [
        { productId: 'prod-5', name: 'Al-Farooq Chaunsa Mango Nectar 250ml (24-pack)', quantity: 50, unit: 'Cartons', unitPrice: 1050, costPrice: 780, total: 52500 },
        { productId: 'prod-6', name: 'Al-Farooq Red Apple Juice 250ml (24-pack)', quantity: 40, unit: 'Cartons', unitPrice: 1100, costPrice: 810, total: 44000 },
        { productId: 'prod-8', name: 'Farooq Royal Milk Toffee (1kg Jar x 12)', quantity: 15, unit: 'Cartons', unitPrice: 2750, costPrice: 2100, total: 41250 },
      ],
      subtotal: 137750,
      discount: 1750,
      tax: 0,
      grandTotal: 136000,
      amountPaid: 136000,
      balanceDue: 0,
      paymentMethod: 'Bank Transfer',
      paymentAccount: 'hbl-bank',
      status: 'Paid',
      deliveryStatus: 'Delivered',
      notes: 'Cleared via Online HBL Transfer ref: TR-982103.',
      createdAt: '2026-08-24T14:15:00Z',
    },
    {
      id: 'inv-1046',
      invoiceNumber: 'INV-2026-1046',
      date: '2026-08-24',
      customerId: 'cust-6',
      customerName: 'Walk-in Direct Customer (Tahir Shah)',
      customerType: 'Counter',
      phone: '0347 8496579',
      address: 'Factory Main Gate # 1',
      saleType: 'Counter',
      items: [
        { productId: 'prod-1', name: 'Al-Farooq Mineral Water 500ml (24-pack)', quantity: 8, unit: 'Cartons', unitPrice: 650, costPrice: 380, total: 5200 },
        { productId: 'prod-5', name: 'Al-Farooq Chaunsa Mango Nectar 250ml (24-pack)', quantity: 4, unit: 'Cartons', unitPrice: 1200, costPrice: 780, total: 4800 },
        { productId: 'prod-10', name: 'Farooq Crispy Potato Chips Salted 40g (30-pack)', quantity: 2, unit: 'Cartons', unitPrice: 1350, costPrice: 920, total: 2700 },
      ],
      subtotal: 12700,
      discount: 200,
      tax: 0,
      grandTotal: 12500,
      amountPaid: 12500,
      balanceDue: 0,
      paymentMethod: 'Cash',
      paymentAccount: 'cash-in-hand',
      status: 'Paid',
      deliveryStatus: 'Delivered',
      notes: 'Factory Gate Counter Sale # 88',
      createdAt: '2026-08-24T16:00:00Z',
    },
    {
      id: 'inv-1045',
      invoiceNumber: 'INV-2026-1045',
      date: '2026-08-23',
      customerId: 'cust-3',
      customerName: 'Malik Jahangir Khan (Khyber Fast Distribution)',
      customerType: 'Distributor',
      phone: '0300 5544332',
      address: 'Industrial Estate Gate 2, Mardan',
      saleType: 'Distributor',
      items: [
        { productId: 'prod-1', name: 'Al-Farooq Mineral Water 500ml (24-pack)', quantity: 200, unit: 'Cartons', unitPrice: 540, costPrice: 380, total: 108000 },
        { productId: 'prod-2', name: 'Al-Farooq Mineral Water 1.5L (12-pack)', quantity: 120, unit: 'Cartons', unitPrice: 590, costPrice: 420, total: 70800 },
      ],
      subtotal: 178800,
      discount: 2800,
      tax: 0,
      grandTotal: 176000,
      amountPaid: 100000,
      balanceDue: 76000,
      paymentMethod: 'Bank Transfer',
      paymentAccount: 'meezan-bank',
      status: 'Partial',
      deliveryStatus: 'Delivered',
      notes: 'Balance promise date 30th August.',
      createdAt: '2026-08-23T10:20:00Z',
    },
    {
      id: 'inv-1044',
      invoiceNumber: 'INV-2026-1044',
      date: '2026-08-23',
      customerId: 'rep-1',
      customerName: 'Muhammad Tariq Mehmood (Sales Rep)',
      customerType: 'Sales Representative',
      phone: '0302 4433221',
      address: 'Lahore South Route Van # 04',
      saleType: 'Wholesale',
      items: [
        { productId: 'prod-5', name: 'Al-Farooq Chaunsa Mango Nectar 250ml (24-pack)', quantity: 40, unit: 'Cartons', unitPrice: 1050, costPrice: 780, total: 42000 },
        { productId: 'prod-9', name: 'Farooq Butter Candy Roll (72-pack Dispenser)', quantity: 20, unit: 'Boxes', unitPrice: 1150, costPrice: 850, total: 23000 },
        { productId: 'prod-10', name: 'Farooq Crispy Potato Chips Salted 40g (30-pack)', quantity: 15, unit: 'Cartons', unitPrice: 1200, costPrice: 920, total: 18000 },
      ],
      subtotal: 83000,
      discount: 5500,
      tax: 0,
      grandTotal: 77500,
      amountPaid: 35000,
      balanceDue: 42500,
      paymentMethod: 'Cash',
      paymentAccount: 'cash-in-hand',
      status: 'Partial',
      deliveryStatus: 'Delivered',
      notes: 'Stock issued for van order bookings on Multan Road.',
      createdAt: '2026-08-23T08:30:00Z',
    },
    {
      id: 'inv-1043',
      invoiceNumber: 'INV-2026-1043',
      date: '2026-08-22',
      customerId: 'rep-2',
      customerName: 'Sardar Zubair Abbasi (Hazara Rep)',
      customerType: 'Sales Representative',
      phone: '0333 9123456',
      address: 'Supply Bazaar, Abbottabad',
      saleType: 'Wholesale',
      items: [
        { productId: 'prod-1', name: 'Al-Farooq Mineral Water 500ml (24-pack)', quantity: 60, unit: 'Cartons', unitPrice: 540, costPrice: 380, total: 32400 },
        { productId: 'prod-6', name: 'Al-Farooq Red Apple Juice 250ml (24-pack)', quantity: 20, unit: 'Cartons', unitPrice: 1100, costPrice: 810, total: 22000 },
      ],
      subtotal: 54400,
      discount: 1000,
      tax: 0,
      grandTotal: 53400,
      amountPaid: 25000,
      balanceDue: 28400,
      paymentMethod: 'Bank Transfer',
      paymentAccount: 'meezan-bank',
      status: 'Partial',
      deliveryStatus: 'Delivered',
      notes: 'Hill station route dispatch.',
      createdAt: '2026-08-22T09:00:00Z',
    },
    {
      id: 'inv-1042',
      invoiceNumber: 'INV-2026-1042',
      date: '2026-08-23',
      customerId: 'shop-101',
      customerName: 'Gulberg Supermart & Gourmet Bakers (Kashif Mehmood)',
      customerType: 'Retailer',
      phone: '0333 4455667',
      address: 'Shop # 12-14, Block C-2, Main Boulevard Gulberg III, Lahore',
      saleType: 'Retail',
      items: [
        { productId: 'prod-5', name: 'Al-Farooq Chaunsa Mango Nectar 250ml (24-pack)', quantity: 20, unit: 'Cartons', unitPrice: 1200, costPrice: 780, total: 24000 },
        { productId: 'prod-10', name: 'Farooq Crispy Potato Chips Salted 40g (30-pack)', quantity: 15, unit: 'Cartons', unitPrice: 1350, costPrice: 920, total: 20250 },
        { productId: 'prod-9', name: 'Farooq Butter Candy Roll (72-pack Dispenser)', quantity: 10, unit: 'Boxes', unitPrice: 1300, costPrice: 850, total: 13000 },
      ],
      subtotal: 57250,
      discount: 2750,
      tax: 0,
      grandTotal: 54500,
      amountPaid: 20000,
      balanceDue: 34500,
      paymentMethod: 'Online',
      paymentAccount: 'meezan-bank',
      status: 'Partial',
      deliveryStatus: 'Delivered',
      paymentScreenshot: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><rect width="300" height="150" fill="%23f0fdf4" stroke="%2316a34a" stroke-width="2"/><text x="15" y="30" font-family="Arial" font-size="14" font-weight="bold" fill="%23166534">RAAST INSTANT PAYMENT RECEIPT</text><text x="15" y="55" font-family="Arial" font-size="11" fill="%23374151">From: Gulberg Supermart (Kashif)</text><text x="15" y="75" font-family="Arial" font-size="11" fill="%23374151">To: AL FAROOQ FOODS RAAST ID</text><text x="15" y="100" font-family="Arial" font-size="16" font-weight="bold" fill="%2315803d">AMOUNT: PKR 20,000</text><text x="15" y="125" font-family="Arial" font-size="10" fill="%236b7280">Ref: RAAST-LHR-88219 | 23-Aug-2026</text></svg>',
      notes: 'Weekly Tuesday delivery. Delivered via Van # 04. Rs. 20,000 received via Raast, balance Rs. 34,500 pending on this shipment.',
      createdAt: '2026-08-23T11:00:00Z',
    },
    {
      id: 'inv-1041',
      invoiceNumber: 'INV-2026-1041',
      date: '2026-08-24',
      customerId: 'shop-102',
      customerName: 'Bismillah Cash & Carry / Wholesale Mart (Haji Abdul Sattar)',
      customerType: 'Wholesaler',
      phone: '0301 7766554',
      address: 'Shop 45-48, Karkhano Wholesale Market, Jamrud Road, Peshawar',
      saleType: 'Wholesale',
      items: [
        { productId: 'prod-1', name: 'Al-Farooq Mineral Water 500ml (24-pack)', quantity: 80, unit: 'Cartons', unitPrice: 540, costPrice: 380, total: 43200 },
        { productId: 'prod-7', name: 'Al-Farooq Guava Fruit Nectar 250ml (24-pack)', quantity: 40, unit: 'Cartons', unitPrice: 1020, costPrice: 760, total: 40800 },
        { productId: 'prod-8', name: 'Farooq Royal Milk Toffee (1kg Jar x 12)', quantity: 16, unit: 'Cartons', unitPrice: 2750, costPrice: 2100, total: 44000 },
      ],
      subtotal: 128000,
      discount: 3000,
      tax: 0,
      grandTotal: 125000,
      amountPaid: 50000,
      balanceDue: 75000,
      paymentMethod: 'Cash',
      paymentAccount: 'cash-in-hand',
      status: 'Partial',
      deliveryStatus: 'Delivered',
      notes: 'Bulk stock delivery to Karkhano Market. Rs. 50,000 cash paid on spot.',
      createdAt: '2026-08-24T15:30:00Z',
    },
    {
      id: 'inv-1040',
      invoiceNumber: 'INV-2026-1040',
      date: '2026-08-22',
      customerId: 'shop-103',
      customerName: 'Al-Makkah General & Departmental Store (Muhammad Usman)',
      customerType: 'Retailer',
      phone: '0313 9988771',
      address: 'Shop # 8, Commercial Market, Satellite Town, Block B, Rawalpindi',
      saleType: 'Retail',
      items: [
        { productId: 'prod-10', name: 'Farooq Crispy Potato Chips Salted 40g (30-pack)', quantity: 15, unit: 'Cartons', unitPrice: 1350, costPrice: 920, total: 20250 },
        { productId: 'prod-11', name: 'Farooq Masala Crinkle Chips 40g (30-pack)', quantity: 10, unit: 'Cartons', unitPrice: 1400, costPrice: 940, total: 14000 },
      ],
      subtotal: 34250,
      discount: 850,
      tax: 0,
      grandTotal: 33400,
      amountPaid: 15000,
      balanceDue: 18400,
      paymentMethod: 'Online',
      paymentAccount: 'meezan-bank',
      status: 'Partial',
      deliveryStatus: 'Delivered',
      notes: 'Delivered to Commercial Market retail counter.',
      createdAt: '2026-08-22T09:30:00Z',
    },
    {
      id: 'inv-1039',
      invoiceNumber: 'INV-2026-1039',
      date: '2026-08-21',
      customerId: 'shop-104',
      customerName: 'Khyber Canteen & Institutional Caterers (Engr. Junaid Afridi)',
      customerType: 'Other',
      phone: '0345 1122339',
      address: 'Main Food Court, Hayatabad Medical Complex, Peshawar',
      saleType: 'Wholesale',
      items: [
        { productId: 'prod-1', name: 'Al-Farooq Mineral Water 500ml (24-pack)', quantity: 50, unit: 'Cartons', unitPrice: 550, costPrice: 380, total: 27500 },
        { productId: 'prod-2', name: 'Al-Farooq Mineral Water 1.5L (12-pack)', quantity: 30, unit: 'Cartons', unitPrice: 600, costPrice: 420, total: 18000 },
      ],
      subtotal: 45500,
      discount: 1000,
      tax: 0,
      grandTotal: 44500,
      amountPaid: 20000,
      balanceDue: 24500,
      paymentMethod: 'Cheque',
      paymentAccount: 'hbl-bank',
      status: 'Partial',
      deliveryStatus: 'Delivered',
      notes: 'HMC hospital staff & cafeteria water supply shipment. Partial payment clearing cheque.',
      createdAt: '2026-08-21T12:00:00Z',
    },
  ],
  purchases: [
    {
      id: 'po-3022',
      poNumber: 'PO-2026-3022',
      purchaseNumber: 'PO-2026-3022',
      purchaseType: 'Finished Product',
      date: '2026-08-24',
      time: '11:30 AM',
      supplierId: 'sup-5',
      supplierName: 'Packages Limited Lahore',
      items: [
        {
          id: 'item-po-1',
          itemId: 'prod-8',
          productId: 'prod-8',
          itemType: 'Finished Product',
          name: 'Farooq Royal Milk Toffee (1kg Jar x 12)',
          category: 'Candy & Toffee',
          quantity: 40,
          unit: 'Cartons',
          unitPrice: 2100,
          otherCost: 1500,
          total: 85500,
        },
      ],
      quantity: 40,
      unit: 'Cartons',
      unitPrice: 2100,
      otherCost: 1500,
      grandTotal: 85500,
      amountPaid: 85500,
      balanceDue: 0,
      paymentMethod: 'Online',
      paymentAccount: 'meezan-bank',
      transactionRef: 'RAAST-MZB-9921',
      status: 'Paid',
      invoiceImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="340" height="200" viewBox="0 0 340 200"><rect width="340" height="200" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2"/><text x="20" y="32" font-family="Arial" font-size="14" font-weight="bold" fill="%231e293b">SUPPLIER TAX INVOICE</text><text x="20" y="55" font-family="Arial" font-size="11" fill="%2364748b">Supplier: Packages Limited Lahore</text><text x="20" y="75" font-family="Arial" font-size="11" fill="%2364748b">Billed To: AL FAROOQ FOODS (PVT) LTD</text><text x="20" y="105" font-family="Arial" font-size="12" font-weight="bold" fill="%23334155">Item: 40 Cartons Royal Milk Toffee 1kg</text><text x="20" y="130" font-family="Arial" font-size="11" fill="%23475569">Rate: Rs. 2,100 | Freight: Rs. 1,500</text><text x="20" y="165" font-family="Arial" font-size="15" font-weight="bold" fill="%2315803d">TOTAL PAID: PKR 85,500</text></svg>',
      paymentScreenshot: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><rect width="300" height="150" fill="%23f0fdf4" stroke="%2316a34a" stroke-width="2"/><text x="15" y="30" font-family="Arial" font-size="14" font-weight="bold" fill="%23166534">MEEZAN BANK IBFT TRANSFER</text><text x="15" y="55" font-family="Arial" font-size="11" fill="%23374151">Paid To: Packages Limited A/C 01029</text><text x="15" y="80" font-family="Arial" font-size="16" font-weight="bold" fill="%2315803d">AMOUNT: PKR 85,500</text><text x="15" y="110" font-family="Arial" font-size="10" fill="%236b7280">Ref: RAAST-MZB-9921 | 24-Aug-2026</text></svg>',
      notes: 'Outsourced confectionery packaging batch, pre-verified quality.',
      createdAt: '2026-08-24T11:30:00Z',
    },
    {
      id: 'po-3021',
      poNumber: 'PO-2026-3021',
      purchaseNumber: 'PO-2026-3021',
      purchaseType: 'Raw Material',
      date: '2026-08-23',
      time: '09:00 AM',
      supplierId: 'sup-1',
      supplierName: 'National Sugar Mills Ltd',
      items: [
        {
          id: 'item-po-2',
          itemId: 'raw-1',
          rawMaterialId: 'raw-1',
          itemType: 'Raw Material',
          name: 'Refined White Sugar (Food Grade A)',
          category: 'Ingredients',
          quantity: 2000,
          unit: 'kg',
          unitPrice: 145,
          otherCost: 2000,
          total: 292000,
        },
      ],
      quantity: 2000,
      unit: 'kg',
      unitPrice: 145,
      otherCost: 2000,
      grandTotal: 292000,
      amountPaid: 200000,
      balanceDue: 92000,
      paymentMethod: 'Bank Transfer',
      paymentAccount: 'meezan-bank',
      status: 'Partial',
      invoiceImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="340" height="200" viewBox="0 0 340 200"><rect width="340" height="200" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2"/><text x="20" y="32" font-family="Arial" font-size="14" font-weight="bold" fill="%231e293b">NATIONAL SUGAR MILLS INVOICE</text><text x="20" y="55" font-family="Arial" font-size="11" fill="%2364748b">Bill #: NSM-2026-8819</text><text x="20" y="80" font-family="Arial" font-size="12" font-weight="bold" fill="%23334155">40 Bags x 50kg Refined Sugar Grade A</text><text x="20" y="105" font-family="Arial" font-size="11" fill="%23475569">Rate: Rs. 145/kg | Truck Freight: Rs. 2,000</text><text x="20" y="135" font-family="Arial" font-size="15" font-weight="bold" fill="%23334155">TOTAL BILL: PKR 292,000</text><text x="20" y="165" font-family="Arial" font-size="11" font-weight="bold" fill="%23b45309">PAID: Rs. 200,000 | DUE: Rs. 92,000</text></svg>',
      notes: 'Received 40 bags of 50kg Sugar via Bedford Truck. Quality verified.',
      createdAt: '2026-08-23T09:00:00Z',
    },
    {
      id: 'po-3020',
      poNumber: 'PO-2026-3020',
      purchaseNumber: 'PO-2026-3020',
      purchaseType: 'Raw Material',
      date: '2026-08-22',
      time: '01:00 PM',
      supplierId: 'sup-3',
      supplierName: 'Crown Plastics & Preforms',
      items: [
        {
          id: 'item-po-3',
          itemId: 'raw-4',
          rawMaterialId: 'raw-4',
          itemType: 'Raw Material',
          name: 'PET Preforms 500ml (28mm Neck)',
          category: 'Packaging',
          quantity: 15000,
          unit: 'Pcs',
          unitPrice: 6.5,
          otherCost: 0,
          total: 97500,
        },
        {
          id: 'item-po-4',
          itemId: 'raw-6',
          rawMaterialId: 'raw-6',
          itemType: 'Raw Material',
          name: '28mm HDPE Bottling Caps (Tamper Evident)',
          category: 'Packaging',
          quantity: 15000,
          unit: 'Pcs',
          unitPrice: 2.1,
          otherCost: 0,
          total: 31500,
        },
      ],
      quantity: 30000,
      unit: 'Pcs',
      unitPrice: 4.3,
      otherCost: 0,
      grandTotal: 129000,
      amountPaid: 129000,
      balanceDue: 0,
      paymentMethod: 'Bank Transfer',
      paymentAccount: 'hbl-bank',
      status: 'Paid',
      notes: 'Full payment cleared on delivery.',
      createdAt: '2026-08-22T13:00:00Z',
    },
  ],
  expenses: [
    {
      id: 'exp-042',
      expenseNumber: 'EXP-2026-042',
      date: '2026-08-24',
      category: 'Factory Electricity',
      description: 'Factory 3-Phase Commercial WAPDA bill for July/August bottling plant run',
      amount: 142500,
      paidTo: 'IESCO Commercial Division',
      paymentMethod: 'Bank Transfer',
      paymentAccount: 'meezan-bank',
      status: 'Paid',
      createdAt: '2026-08-24T12:00:00Z',
    },
    {
      id: 'exp-041',
      expenseNumber: 'EXP-2026-041',
      date: '2026-08-23',
      category: 'Labor & Wages',
      description: 'Weekly bottling line and packaging floor staff wages (14 workers)',
      amount: 84000,
      paidTo: 'Production Floor Staff',
      paymentMethod: 'Cash',
      paymentAccount: 'cash-in-hand',
      status: 'Paid',
      createdAt: '2026-08-23T17:00:00Z',
    },
    {
      id: 'exp-040',
      expenseNumber: 'EXP-2026-040',
      date: '2026-08-22',
      category: 'Fuel & Transport',
      description: 'Diesel for factory backup generator & Mazda delivery truck',
      amount: 32600,
      paidTo: 'PSO Fuel Station # 4',
      paymentMethod: 'Cash',
      paymentAccount: 'cash-in-hand',
      status: 'Paid',
      createdAt: '2026-08-22T11:00:00Z',
    },
    {
      id: 'exp-039',
      expenseNumber: 'EXP-2026-039',
      date: '2026-08-20',
      category: 'Machine Maintenance',
      description: 'Air compressor valves overhaul & conveyor belt lubrication',
      amount: 18500,
      paidTo: 'Pak Tech Engineering Services',
      paymentMethod: 'Cash',
      paymentAccount: 'cash-in-hand',
      status: 'Paid',
      createdAt: '2026-08-20T15:30:00Z',
    },
  ],
  returns: [
    {
      id: 'ret-01',
      returnNumber: 'RET-2026-001',
      date: '2026-08-21',
      type: 'Customer Sales Return',
      partyId: 'cust-1',
      partyName: 'Haji Noor Muhammad',
      items: [
        { id: 'prod-1', name: 'Al-Farooq Mineral Water 500ml (24-pack)', quantity: 4, unit: 'Cartons', unitPrice: 540, total: 2160, reason: 'Outer carton crushed during truck transit' }
      ],
      totalRefund: 2160,
      refundStatus: 'Adjusted in Ledger',
      notes: 'Bottles inspected and rebottled.',
      createdAt: '2026-08-21T16:00:00Z',
    }
  ],
  transfers: [
    {
      id: 'tr-01',
      date: '2026-08-22',
      fromAccount: 'cash-in-hand',
      toAccount: 'meezan-bank',
      amount: 150000,
      notes: 'Counter sales cash deposit into Meezan Bank branch'
    }
  ],
  ledgers: [
    {
      id: 'led-1',
      partyId: 'cust-1',
      partyType: 'Customer',
      date: '2026-08-01',
      referenceType: 'Opening',
      referenceId: 'OP-01',
      description: 'Opening Balance (Brought Forward)',
      debit: 120000,
      credit: 0,
      balance: 120000
    },
    {
      id: 'led-2',
      partyId: 'cust-1',
      partyType: 'Customer',
      date: '2026-08-24',
      referenceType: 'Invoice',
      referenceId: 'INV-2026-1048',
      description: 'Invoice # INV-2026-1048 (Water & Mango Juice cartons)',
      debit: 230000,
      credit: 0,
      balance: 350000
    },
    {
      id: 'led-3',
      partyId: 'cust-1',
      partyType: 'Customer',
      date: '2026-08-24',
      referenceType: 'Payment',
      referenceId: 'REC-1048',
      description: 'Payment Received via Meezan Bank Online Transfer',
      debit: 0,
      credit: 150000,
      balance: 200000
    },
    {
      id: 'led-4',
      partyId: 'cust-1',
      partyType: 'Customer',
      date: '2026-08-24',
      referenceType: 'Return',
      referenceId: 'RET-2026-001',
      description: 'Credit Note for 4 Transit Damaged Water Cartons',
      debit: 0,
      credit: 2160,
      balance: 185400
    },
    {
      id: 'led-dist3-1',
      partyId: 'cust-3',
      partyType: 'Customer',
      date: '2026-08-01',
      referenceType: 'Opening',
      referenceId: 'OP-03',
      description: 'Opening Balance (Brought Forward)',
      debit: 150000,
      credit: 0,
      balance: 150000
    },
    {
      id: 'led-dist3-2',
      partyId: 'cust-3',
      partyType: 'Customer',
      date: '2026-08-20',
      referenceType: 'Payment',
      referenceId: 'REC-2026-1035',
      description: 'Payment Received in Cash (Driver Collection)',
      debit: 0,
      credit: 120000,
      balance: 30000
    },
    {
      id: 'led-dist3-3',
      partyId: 'cust-3',
      partyType: 'Customer',
      date: '2026-08-23',
      referenceType: 'Invoice',
      referenceId: 'INV-2026-1045',
      description: 'Invoice # INV-2026-1045 (Mineral Water Cartons Supply)',
      debit: 176000,
      credit: 0,
      balance: 206000
    },
    {
      id: 'led-rep1-1',
      partyId: 'rep-1',
      partyType: 'Customer',
      date: '2026-08-23',
      referenceType: 'Invoice',
      referenceId: 'INV-2026-1044',
      description: 'Invoice # INV-2026-1044 (Stock issued for Lahore South Van # 04)',
      debit: 77500,
      credit: 0,
      balance: 77500
    },
    {
      id: 'led-rep1-2',
      partyId: 'rep-1',
      partyType: 'Customer',
      date: '2026-08-23',
      referenceType: 'Payment',
      referenceId: 'REC-2026-REP01',
      description: 'Cash deposit from van retail route collections',
      debit: 0,
      credit: 35000,
      balance: 42500
    },
    {
      id: 'led-rep2-1',
      partyId: 'rep-2',
      partyType: 'Customer',
      date: '2026-08-22',
      referenceType: 'Invoice',
      referenceId: 'INV-2026-1043',
      description: 'Invoice # INV-2026-1043 (Hill Station Route Dispatch)',
      debit: 53400,
      credit: 0,
      balance: 53400
    },
    {
      id: 'led-rep2-2',
      partyId: 'rep-2',
      partyType: 'Customer',
      date: '2026-08-22',
      referenceType: 'Payment',
      referenceId: 'REC-2026-REP02',
      description: 'Meezan Bank branch deposit by Rep Zubair Abbasi',
      debit: 0,
      credit: 25000,
      balance: 28400
    },
    {
      id: 'led-whs2-1',
      partyId: 'cust-2',
      partyType: 'Customer',
      date: '2026-08-01',
      referenceType: 'Opening',
      referenceId: 'OP-02',
      description: 'Opening Balance (Brought Forward)',
      debit: 50000,
      credit: 0,
      balance: 50000
    },
    {
      id: 'led-whs2-2',
      partyId: 'cust-2',
      partyType: 'Customer',
      date: '2026-08-24',
      referenceType: 'Invoice',
      referenceId: 'INV-2026-1047',
      description: 'Invoice # INV-2026-1047 (Mango, Apple Juice & Milk Toffees)',
      debit: 136000,
      credit: 0,
      balance: 186000
    },
    {
      id: 'led-whs2-3',
      partyId: 'cust-2',
      partyType: 'Customer',
      date: '2026-08-24',
      referenceType: 'Payment',
      referenceId: 'REC-2026-1047',
      description: 'Payment Received via HBL Online Transfer (TR-982103)',
      debit: 0,
      credit: 136000,
      balance: 50000
    },
    {
      id: 'led-whs4-1',
      partyId: 'cust-4',
      partyType: 'Customer',
      date: '2026-08-01',
      referenceType: 'Opening',
      referenceId: 'OP-04',
      description: 'Opening Balance (Brought Forward)',
      debit: 30000,
      credit: 0,
      balance: 30000
    },
    {
      id: 'led-whs4-2',
      partyId: 'cust-4',
      partyType: 'Customer',
      date: '2026-08-18',
      referenceType: 'Invoice',
      referenceId: 'INV-2026-1032',
      description: 'Invoice # INV-2026-1032 (Confectionery & Juice supply)',
      debit: 68000,
      credit: 0,
      balance: 98000
    },
    {
      id: 'led-whs4-3',
      partyId: 'cust-4',
      partyType: 'Customer',
      date: '2026-08-21',
      referenceType: 'Payment',
      referenceId: 'REC-2026-WHS04',
      description: 'Bank Transfer via Meezan Bank (MZB-GUJ-4481)',
      debit: 0,
      credit: 50000,
      balance: 48000
    },
    {
      id: 'led-sh101-1',
      partyId: 'shop-101',
      partyType: 'Customer',
      date: '2026-08-01',
      referenceType: 'Opening',
      referenceId: 'OP-SH101',
      description: 'Opening Balance (Brought Forward)',
      debit: 15000,
      credit: 0,
      balance: 15000
    },
    {
      id: 'led-sh101-2',
      partyId: 'shop-101',
      partyType: 'Customer',
      date: '2026-08-23',
      referenceType: 'Invoice',
      referenceId: 'INV-2026-1042',
      description: 'Invoice # INV-2026-1042 (Mango Nectar, Potato Chips, Candy Rolls)',
      debit: 54500,
      credit: 0,
      balance: 69500
    },
    {
      id: 'led-sh101-3',
      partyId: 'shop-101',
      partyType: 'Customer',
      date: '2026-08-23',
      referenceType: 'Payment',
      referenceId: 'REC-2026-SH101',
      description: 'Payment Received via Raast Instant Transfer',
      debit: 0,
      credit: 20000,
      balance: 49500
    },
    {
      id: 'led-sh101-4',
      partyId: 'shop-101',
      partyType: 'Customer',
      date: '2026-08-24',
      referenceType: 'Payment',
      referenceId: 'REC-2026-SH101B',
      description: 'Counter Cash Collection from Retail Mart',
      debit: 0,
      credit: 20000,
      balance: 29500
    },
    {
      id: 'led-sh102-1',
      partyId: 'shop-102',
      partyType: 'Customer',
      date: '2026-08-01',
      referenceType: 'Opening',
      referenceId: 'OP-SH102',
      description: 'Opening Balance (Brought Forward)',
      debit: 40000,
      credit: 0,
      balance: 40000
    },
    {
      id: 'led-sh102-2',
      partyId: 'shop-102',
      partyType: 'Customer',
      date: '2026-08-24',
      referenceType: 'Invoice',
      referenceId: 'INV-2026-1041',
      description: 'Invoice # INV-2026-1041 (Mineral Water, Guava Nectar, Milk Toffees)',
      debit: 125000,
      credit: 0,
      balance: 165000
    },
    {
      id: 'led-sh102-3',
      partyId: 'shop-102',
      partyType: 'Customer',
      date: '2026-08-24',
      referenceType: 'Payment',
      referenceId: 'REC-2026-SH102',
      description: 'Cash payment handed to driver on delivery',
      debit: 0,
      credit: 50000,
      balance: 115000
    },
    {
      id: 'led-sh102-4',
      partyId: 'shop-102',
      partyType: 'Customer',
      date: '2026-08-24',
      referenceType: 'Payment',
      referenceId: 'REC-2026-SH102B',
      description: 'Meezan Bank Raast transfer clearance',
      debit: 0,
      credit: 46500,
      balance: 68500
    },
    {
      id: 'led-sh103-1',
      partyId: 'shop-103',
      partyType: 'Customer',
      date: '2026-08-22',
      referenceType: 'Invoice',
      referenceId: 'INV-2026-1040',
      description: 'Invoice # INV-2026-1040 (Salted & Masala Crinkle Chips cartons)',
      debit: 33400,
      credit: 0,
      balance: 33400
    },
    {
      id: 'led-sh103-2',
      partyId: 'shop-103',
      partyType: 'Customer',
      date: '2026-08-22',
      referenceType: 'Payment',
      referenceId: 'REC-2026-SH103',
      description: 'Online Transfer via Meezan Bank App',
      debit: 0,
      credit: 15000,
      balance: 18400
    },
    {
      id: 'led-sh104-1',
      partyId: 'shop-104',
      partyType: 'Customer',
      date: '2026-08-21',
      referenceType: 'Invoice',
      referenceId: 'INV-2026-1039',
      description: 'Invoice # INV-2026-1039 (Mineral Water 500ml & 1.5L bulk supply)',
      debit: 44500,
      credit: 0,
      balance: 44500
    },
    {
      id: 'led-sh104-2',
      partyId: 'shop-104',
      partyType: 'Customer',
      date: '2026-08-21',
      referenceType: 'Payment',
      referenceId: 'REC-2026-SH104',
      description: 'Cheque cleared into HBL Company Account (CHQ # 009182)',
      debit: 0,
      credit: 20000,
      balance: 24500
    },
    {
      id: 'led-5',
      partyId: 'sup-1',
      partyType: 'Supplier',
      date: '2026-08-01',
      referenceType: 'Opening',
      referenceId: 'OP-SUP-1',
      description: 'Opening Balance Payable',
      debit: 0,
      credit: 80000,
      balance: 80000
    },
    {
      id: 'led-6',
      partyId: 'sup-1',
      partyType: 'Supplier',
      date: '2026-08-23',
      referenceType: 'Purchase',
      referenceId: 'PO-2026-3021',
      description: 'Purchase Order # PO-2026-3021 (2000kg Refined Sugar)',
      debit: 0,
      credit: 290000,
      balance: 370000
    },
    {
      id: 'led-7',
      partyId: 'sup-1',
      partyType: 'Supplier',
      date: '2026-08-23',
      referenceType: 'Payment',
      referenceId: 'PAY-3021',
      description: 'Payment made via Meezan Bank Transfer',
      debit: 200000,
      credit: 0,
      balance: 170000
    }
  ],
  employees: [
    {
      id: 'emp-101',
      name: 'Muhammad Aslam Khan',
      phone: '0300-9876541',
      cnic: '35201-1234567-1',
      role: 'Plant Operations Manager',
      department: 'Production & Plant',
      baseSalary: 85000,
      allowances: [
        { id: 'al-1', name: 'Food Allowance', amount: 5000 },
        { id: 'al-2', name: 'Conveyance / Fuel Allowance', amount: 6000 },
      ],
      totalAllowances: 11000,
      dutyTiming: 'General Day (08:30 AM - 05:30 PM)',
      shift: 'General Day',
      joiningDate: '2024-03-15',
      status: 'Active',
      currentSalaryStatus: 'Paid',
      lastSalaryPaidDate: '2026-08-05',
      totalLoanBalance: 0,
      address: 'Plot 44-B, Industrial Area, Sheikhupura Road, Lahore',
      emergencyContact: 'Brother (0321-4567890)',
      bankDetails: {
        bankName: 'Meezan Bank Ltd',
        accountNumber: '010203040510-101',
        accountTitle: 'Muhammad Aslam Khan',
      },
      attendance: [
        { id: 'att-1', date: '2026-08-25', status: 'Present', checkInTime: '08:25 AM' },
        { id: 'att-2', date: '2026-08-24', status: 'Present', checkInTime: '08:28 AM' },
        { id: 'att-3', date: '2026-08-23', status: 'Off-day' },
        { id: 'att-4', date: '2026-08-22', status: 'Present', checkInTime: '08:30 AM' },
        { id: 'att-5', date: '2026-08-21', status: 'Present', checkInTime: '08:20 AM' },
      ],
      loans: [],
      salaryHistory: [
        {
          id: 'sal-2026-07-101',
          receiptNumber: 'SAL-2026-07-001',
          month: 'July 2026',
          paymentDate: '2026-08-05',
          baseSalary: 85000,
          allowances: 11000,
          allowancesBreakdown: [
            { name: 'Food Allowance', amount: 5000 },
            { name: 'Conveyance / Fuel Allowance', amount: 6000 },
          ],
          loanDeduction: 0,
          absentDeduction: 0,
          netPayable: 96000,
          amountPaid: 96000,
          paymentMethod: 'Bank Transfer',
          paymentAccount: 'meezan-bank',
          status: 'Paid',
          notes: 'Monthly salary transferred via Meezan Bank Online Corporate Portal',
          createdAt: '2026-08-05',
        },
      ],
      notes: 'Incharge of entire beverage and bottling manufacturing floor.',
      updatedAt: '2026-08-25',
    },
    {
      id: 'emp-102',
      name: 'Tariq Mehmood',
      phone: '0312-8765432',
      cnic: '35202-7654321-3',
      role: 'Senior RO Plant & Water Chemist',
      department: 'Quality & Lab',
      baseSalary: 55000,
      allowances: [
        { id: 'al-3', name: 'Lab Risk & Medical Allowance', amount: 4000 },
      ],
      totalAllowances: 4000,
      dutyTiming: 'Morning Shift (07:00 AM - 03:00 PM)',
      shift: 'Morning',
      joiningDate: '2024-06-01',
      status: 'Active',
      currentSalaryStatus: 'Pending',
      totalLoanBalance: 0,
      address: 'House # 12, Mohalla Farooqabad, Sheikhupura',
      emergencyContact: 'Wife (0313-9988776)',
      bankDetails: {
        bankName: 'Habib Bank Ltd',
        accountNumber: '998877665520-102',
        accountTitle: 'Tariq Mehmood',
      },
      attendance: [
        { id: 'att-6', date: '2026-08-25', status: 'Present', checkInTime: '06:55 AM' },
        { id: 'att-7', date: '2026-08-24', status: 'Present', checkInTime: '07:02 AM' },
        { id: 'att-8', date: '2026-08-23', status: 'Off-day' },
        { id: 'att-9', date: '2026-08-22', status: 'Present', checkInTime: '06:58 AM' },
      ],
      loans: [],
      salaryHistory: [
        {
          id: 'sal-2026-07-102',
          receiptNumber: 'SAL-2026-07-002',
          month: 'July 2026',
          paymentDate: '2026-08-05',
          baseSalary: 55000,
          allowances: 4000,
          netPayable: 59000,
          amountPaid: 59000,
          paymentMethod: 'Bank Transfer',
          paymentAccount: 'hbl-bank',
          status: 'Paid',
          notes: 'Transferred to HBL Account',
          createdAt: '2026-08-05',
        },
      ],
      notes: 'Performs hourly water testing, TDS monitoring, and ozone saturation checks.',
      updatedAt: '2026-08-25',
    },
    {
      id: 'emp-103',
      name: 'Rashid Ali Bhatti',
      phone: '0345-6789012',
      cnic: '35201-9087654-5',
      role: 'Bottling & Capping Line Operator',
      department: 'Production & Plant',
      baseSalary: 38000,
      allowances: [
        { id: 'al-4', name: 'Meal Allowance', amount: 3000 },
        { id: 'al-5', name: 'Night Shift / Overtime Allowance', amount: 3500 },
      ],
      totalAllowances: 6500,
      dutyTiming: 'Morning Shift (08:00 AM - 04:00 PM)',
      shift: 'Morning',
      joiningDate: '2024-09-10',
      status: 'Active',
      currentSalaryStatus: 'Paid',
      lastSalaryPaidDate: '2026-08-04',
      totalLoanBalance: 0,
      address: 'Village Wandala Dayal Shah, Lahore Road',
      emergencyContact: 'Father (0344-1234567)',
      attendance: [
        { id: 'att-10', date: '2026-08-25', status: 'Present', checkInTime: '07:55 AM' },
        { id: 'att-11', date: '2026-08-24', status: 'Present', checkInTime: '08:00 AM' },
        { id: 'att-12', date: '2026-08-23', status: 'Off-day' },
      ],
      loans: [],
      salaryHistory: [
        {
          id: 'sal-2026-07-103',
          receiptNumber: 'SAL-2026-07-003',
          month: 'July 2026',
          paymentDate: '2026-08-04',
          baseSalary: 38000,
          allowances: 6500,
          netPayable: 44500,
          amountPaid: 44500,
          paymentMethod: 'Cash',
          paymentAccount: 'cash-in-hand',
          status: 'Paid',
          notes: 'Paid in cash at factory cash register',
          createdAt: '2026-08-04',
        },
      ],
      notes: 'Handles bottle rinsing, filler speed adjustment, and cap feeder.',
      updatedAt: '2026-08-25',
    },
    {
      id: 'emp-104',
      name: 'Zubair Ahmed',
      phone: '0322-1122334',
      cnic: '35202-5544332-1',
      role: 'Juice Master Mixer & Formulation Incharge',
      department: 'Production & Plant',
      baseSalary: 44000,
      allowances: [
        { id: 'al-6', name: 'Food Allowance', amount: 3000 },
        { id: 'al-7', name: 'Hygiene Allowance', amount: 2000 },
      ],
      totalAllowances: 5000,
      dutyTiming: 'Evening Shift (04:00 PM - 12:00 AM)',
      shift: 'Evening',
      joiningDate: '2024-11-01',
      status: 'Active',
      currentSalaryStatus: 'Pending',
      totalLoanBalance: 12000,
      address: 'Chungi Amar Sidhu, Ferozepur Road, Lahore',
      emergencyContact: 'Brother (0323-9988112)',
      attendance: [
        { id: 'att-13', date: '2026-08-25', status: 'Present', checkInTime: '03:50 PM' },
        { id: 'att-14', date: '2026-08-24', status: 'Present', checkInTime: '03:55 PM' },
        { id: 'att-15', date: '2026-08-23', status: 'Off-day' },
        { id: 'att-16', date: '2026-08-22', status: 'Present', checkInTime: '04:00 PM' },
        { id: 'att-17', date: '2026-08-21', status: 'Absent', notes: 'Informed family emergency' },
      ],
      loans: [
        {
          id: 'ln-101',
          date: '2026-08-10',
          amount: 20000,
          type: 'Salary Advance',
          reason: 'Family medical expense / hospitalization advance',
          remainingBalance: 12000,
          status: 'Active',
          createdAt: '2026-08-10',
        },
      ],
      salaryHistory: [
        {
          id: 'sal-2026-07-104',
          receiptNumber: 'SAL-2026-07-004',
          month: 'July 2026',
          paymentDate: '2026-08-04',
          baseSalary: 44000,
          allowances: 5000,
          loanDeduction: 8000,
          netPayable: 41000,
          amountPaid: 41000,
          paymentMethod: 'Cash',
          paymentAccount: 'cash-in-hand',
          status: 'Paid',
          notes: 'Rs. 8,000 deducted towards advance repayment.',
          createdAt: '2026-08-04',
        },
      ],
      notes: 'Handles Brix sugar testing, citric acid dosing, and pasteurization heating.',
      updatedAt: '2026-08-25',
    },
    {
      id: 'emp-105',
      name: 'Ghulam Murtaza',
      phone: '0304-4455667',
      cnic: '35201-6677889-9',
      role: 'Packaging & Shrink Tunnel Specialist',
      department: 'Packaging & Warehousing',
      baseSalary: 32000,
      allowances: [
        { id: 'al-8', name: 'Food Allowance', amount: 2500 },
      ],
      totalAllowances: 2500,
      dutyTiming: 'Morning Shift (08:00 AM - 04:00 PM)',
      shift: 'Morning',
      joiningDate: '2025-01-15',
      status: 'Active',
      currentSalaryStatus: 'Pending',
      totalLoanBalance: 5000,
      address: 'Near Bilal Masjid, Kot Abdul Malik',
      emergencyContact: 'Cousin (0305-1122334)',
      attendance: [
        { id: 'att-18', date: '2026-08-25', status: 'Present', checkInTime: '07:50 AM' },
        { id: 'att-19', date: '2026-08-24', status: 'Present', checkInTime: '07:58 AM' },
        { id: 'att-20', date: '2026-08-23', status: 'Off-day' },
        { id: 'att-21', date: '2026-08-22', status: 'Leave', notes: 'Approved personal leave' },
      ],
      loans: [
        {
          id: 'ln-102',
          date: '2026-08-15',
          amount: 5000,
          type: 'Salary Advance',
          reason: 'House utility bills advance',
          remainingBalance: 5000,
          status: 'Active',
          createdAt: '2026-08-15',
        },
      ],
      salaryHistory: [],
      notes: 'Operates auto shrink wrap tunnel, carton bundler, and date coding printer.',
      updatedAt: '2026-08-25',
    },
    {
      id: 'emp-106',
      name: 'Malik Imran Gujjar',
      phone: '0333-7788990',
      cnic: '35201-3344556-7',
      role: 'Distribution Fleet Driver',
      department: 'Logistics & Supply',
      baseSalary: 36000,
      allowances: [
        { id: 'al-9', name: 'Trip Allowance & Daily Tea', amount: 5000 },
        { id: 'al-10', name: 'Mobile Balance Allowance', amount: 1000 },
      ],
      totalAllowances: 6000,
      dutyTiming: 'General Day (07:30 AM - 04:30 PM)',
      shift: 'General Day',
      joiningDate: '2024-05-20',
      status: 'Active',
      currentSalaryStatus: 'Paid',
      lastSalaryPaidDate: '2026-08-05',
      totalLoanBalance: 0,
      address: 'Main Bazaar, Muridke, GT Road',
      emergencyContact: 'Uncle (0334-9900112)',
      attendance: [
        { id: 'att-22', date: '2026-08-25', status: 'Present', checkInTime: '07:25 AM' },
        { id: 'att-23', date: '2026-08-24', status: 'Present', checkInTime: '07:30 AM' },
        { id: 'att-24', date: '2026-08-23', status: 'Off-day' },
      ],
      loans: [],
      salaryHistory: [
        {
          id: 'sal-2026-07-106',
          receiptNumber: 'SAL-2026-07-005',
          month: 'July 2026',
          paymentDate: '2026-08-05',
          baseSalary: 36000,
          allowances: 6000,
          netPayable: 42000,
          amountPaid: 42000,
          paymentMethod: 'Cash',
          paymentAccount: 'cash-in-hand',
          status: 'Paid',
          notes: 'Monthly salary paid in cash at factory dispatch office',
          createdAt: '2026-08-05',
        },
      ],
      notes: 'Handles delivery routes for wholesale markets and Lahore distributor hubs.',
      updatedAt: '2026-08-25',
    },
    {
      id: 'emp-107',
      name: 'Waqas Haider',
      phone: '0301-2233445',
      cnic: '35202-8899001-3',
      role: 'Plant Accountant & Store Incharge',
      department: 'Administration & Finance',
      baseSalary: 48000,
      allowances: [
        { id: 'al-11', name: 'Fuel Allowance', amount: 4000 },
      ],
      totalAllowances: 4000,
      dutyTiming: 'General Day (09:00 AM - 06:00 PM)',
      shift: 'General Day',
      joiningDate: '2024-04-01',
      status: 'Active',
      currentSalaryStatus: 'Pending',
      totalLoanBalance: 0,
      address: 'Ferozewala, Near Judicial Complex',
      emergencyContact: 'Father (0302-3344556)',
      bankDetails: {
        bankName: 'Meezan Bank Ltd',
        accountNumber: '010203040510-107',
        accountTitle: 'Waqas Haider',
      },
      attendance: [
        { id: 'att-25', date: '2026-08-25', status: 'Present', checkInTime: '08:50 AM' },
        { id: 'att-26', date: '2026-08-24', status: 'Present', checkInTime: '08:55 AM' },
        { id: 'att-27', date: '2026-08-23', status: 'Off-day' },
      ],
      loans: [],
      salaryHistory: [
        {
          id: 'sal-2026-07-107',
          receiptNumber: 'SAL-2026-07-006',
          month: 'July 2026',
          paymentDate: '2026-08-05',
          baseSalary: 48000,
          allowances: 4000,
          netPayable: 52000,
          amountPaid: 52000,
          paymentMethod: 'Bank Transfer',
          paymentAccount: 'meezan-bank',
          status: 'Paid',
          notes: 'Transferred via Meezan Online',
          createdAt: '2026-08-05',
        },
      ],
      notes: 'Maintains daily stock registers, raw material gate passes, and petty cash.',
      updatedAt: '2026-08-25',
    },
  ],
  phonebookCategories: defaultPhonebookCategories,
}

// Helper to generate initial phonebook contacts from database entities
export function generateInitialPhonebookContacts(database: Partial<AppDatabase>): PhonebookContactItem[] {
  const contacts: PhonebookContactItem[] = []
  const seenPhones = new Set<string>()

  // 1. Map from customers
  if (database.customers && Array.isArray(database.customers)) {
    database.customers.forEach((c) => {
      let category = 'Retailers'
      if (c.type === 'Distributor') category = 'Distributors'
      else if (c.type === 'Wholesaler') category = 'Wholesalers'
      else if (c.type === 'Retailer') category = 'Retailers'
      else if (c.type === 'Sales Representative' || c.type === 'Sales Man') category = 'Distributors'
      else category = 'General & Personal'

      const phone = c.phone || ''
      if (phone && !seenPhones.has(phone)) {
        seenPhones.add(phone)
        contacts.push({
          id: `pb-c-${c.id}`,
          name: c.name,
          phone: c.phone,
          altPhone: c.altPhone || '',
          whatsapp: c.phone,
          email: c.email || '',
          category,
          businessName: c.businessName || '',
          city: c.city || '',
          address: c.address || '',
          notes: c.notes || '',
          isFavorite: c.type === 'Distributor',
          linkedType: 'customer',
          linkedId: c.id,
          createdAt: c.createdAt || '2026-08-01',
          updatedAt: c.updatedAt || '2026-08-25',
        })
      }
    })
  }

  // 2. Map from suppliers
  if (database.suppliers && Array.isArray(database.suppliers)) {
    database.suppliers.forEach((s) => {
      const phone = s.phone || ''
      if (phone && !seenPhones.has(phone)) {
        seenPhones.add(phone)
        contacts.push({
          id: `pb-s-${s.id}`,
          name: s.contactPerson ? `${s.contactPerson}` : s.name,
          phone: s.phone,
          altPhone: s.altPhone || '',
          whatsapp: s.phone,
          email: s.email || '',
          category: 'Suppliers',
          businessName: s.name,
          city: s.city || '',
          address: s.address || '',
          notes: s.notes || `${s.category || 'Raw Material'} Supplier`,
          isFavorite: false,
          linkedType: 'supplier',
          linkedId: s.id,
          createdAt: s.createdAt || '2026-08-01',
          updatedAt: s.updatedAt || '2026-08-25',
        })
      }
    })
  }

  // 3. Transport & logistics, technical maintenance services
  const logisticsAndServices: PhonebookContactItem[] = [
    {
      id: 'pb-extra-1',
      name: 'Malik Aslam Niazi',
      phone: '0300-4567890',
      altPhone: '0321-7890123',
      whatsapp: '0300-4567890',
      category: 'Transport & Logistics',
      businessName: 'Al-Madina Goods Transport Co.',
      city: 'Lahore',
      address: 'Shop 14, Truck Stand, Badami Bagh, Lahore',
      notes: 'Primary freight contractor for Lahore, Rawalpindi & Peshawar shipments. Trailer & Mazda fleet.',
      isFavorite: true,
      linkedType: 'other',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-25',
    },
    {
      id: 'pb-extra-2',
      name: 'Master Tariq Mahmood',
      phone: '0302-3344556',
      altPhone: '0345-6677889',
      whatsapp: '0302-3344556',
      category: 'Maintenance & Technical',
      businessName: 'Tariq Engineering Works',
      city: 'Gujranwala',
      address: 'Small Industrial Estate #2, G.T. Road, Gujranwala',
      notes: 'Industrial boiler, juice filling lines & packaging machinery overhaul expert. On-call 24/7.',
      isFavorite: true,
      linkedType: 'other',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-25',
    },
    {
      id: 'pb-extra-3',
      name: 'Chaudhary Bilal Akram',
      phone: '0313-5566778',
      whatsapp: '0313-5566778',
      category: 'Maintenance & Technical',
      businessName: 'Bilal Industrial Automation & Electric',
      city: 'Lahore',
      address: 'Main Market, Kot Lakhpat Industrial Area, Lahore',
      notes: 'Factory main distribution panels, 3-phase wiring, PLC inverter tuning and transformer service.',
      isFavorite: false,
      linkedType: 'other',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-25',
    },
    {
      id: 'pb-extra-4',
      name: 'Rana Sohail Ahmed',
      phone: '0321-9871234',
      altPhone: '041-8765432',
      whatsapp: '0321-9871234',
      category: 'Transport & Logistics',
      businessName: 'Niazi Express Cargo & Logistics',
      city: 'Faisalabad',
      address: 'General Bus Stand & Cargo Terminal, Faisalabad',
      notes: 'Handles express daily dispatches to Faisalabad, Jhang, Toba Tek Singh & Sargodha.',
      isFavorite: false,
      linkedType: 'other',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-25',
    },
  ]

  logisticsAndServices.forEach((item) => {
    if (!seenPhones.has(item.phone)) {
      seenPhones.add(item.phone)
      contacts.push(item)
    }
  })

  return contacts
}

// Helper to load database from LocalStorage
export function loadDatabase(): AppDatabase {
  if (typeof window === 'undefined') return initialDatabase
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(initialDatabase))
      return initialDatabase
    }
    const parsed = JSON.parse(raw) as AppDatabase
    // Merge if missing fields
    let updated = false
    if (!parsed.products || !parsed.rawMaterials || !parsed.productionRuns) {
      const merged = { ...initialDatabase, ...parsed }
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(merged))
      return merged
    }

    if (!parsed.categories || !Array.isArray(parsed.categories) || parsed.categories.length === 0) {
      parsed.categories = defaultProductCategories
      updated = true
    }

    if (!parsed.employees || !Array.isArray(parsed.employees) || parsed.employees.length === 0) {
      parsed.employees = initialDatabase.employees || []
      updated = true
    }

    // Ensure all products have totalCost and wholesaleMinQty if not set
    parsed.products = parsed.products.map((p) => {
      let mod = false
      const copy = { ...p }
      if (copy.totalCost === undefined) {
        copy.totalCost = copy.quantity * copy.costPrice
        mod = true
      }
      if (copy.wholesaleMinQty === undefined) {
        copy.wholesaleMinQty = 12
        mod = true
      }
      if (mod) updated = true
      return copy
    })

    // Ensure all raw materials have normalized cost & total tracking fields
    if (parsed.rawMaterials && Array.isArray(parsed.rawMaterials)) {
      parsed.rawMaterials = parsed.rawMaterials.map((r) => {
        let mod = false
        const copy = { ...r }
        if (copy.otherCost === undefined) {
          copy.otherCost = 0
          mod = true
        }
        if (copy.totalCostPerUnit === undefined) {
          copy.totalCostPerUnit = copy.unitCost + (copy.otherCost || 0)
          mod = true
        }
        if (copy.totalCost === undefined) {
          copy.totalCost = (copy.totalCostPerUnit || copy.unitCost) * copy.quantity
          mod = true
        }
        if (copy.totalReceived === undefined) {
          copy.totalReceived = copy.quantity
          mod = true
        }
        if (mod) updated = true
        return copy
      })
    }

    // Ensure all purchases have normalized poNumber, purchaseNumber, purchaseType, items, and status
    if (parsed.purchases && Array.isArray(parsed.purchases)) {
      parsed.purchases = parsed.purchases.map((p) => {
        let mod = false
        const copy = { ...p }
        const poNum = copy.poNumber || copy.purchaseNumber || `PO-2026-${copy.id.slice(-4)}`
        if (!copy.poNumber) {
          copy.poNumber = poNum
          mod = true
        }
        if (!copy.purchaseNumber) {
          copy.purchaseNumber = poNum
          mod = true
        }
        if (!copy.purchaseType) {
          copy.purchaseType = 'Raw Material'
          mod = true
        }
        if (!copy.items || !Array.isArray(copy.items) || copy.items.length === 0) {
          copy.items = [
            {
              itemId: 'raw-1',
              rawMaterialId: 'raw-1',
              itemType: copy.purchaseType || 'Raw Material',
              name: 'Raw Material Item',
              quantity: copy.quantity || 1,
              unit: copy.unit || 'kg',
              unitPrice: copy.unitPrice || copy.grandTotal || 0,
              otherCost: copy.otherCost || 0,
              total: copy.grandTotal || 0,
            },
          ]
          mod = true
        }
        if (copy.otherCost === undefined) {
          copy.otherCost = 0
          mod = true
        }
        if (copy.amountPaid === undefined) {
          copy.amountPaid = copy.grandTotal || 0
          mod = true
        }
        if (copy.balanceDue === undefined) {
          copy.balanceDue = Math.max(0, (copy.grandTotal || 0) - (copy.amountPaid || 0))
          mod = true
        }
        if (!copy.status) {
          copy.status = copy.balanceDue === 0 ? 'Paid' : copy.amountPaid > 0 ? 'Partial' : 'Unpaid'
          mod = true
        }
        if (!copy.paymentMethod) {
          copy.paymentMethod = 'Bank Transfer'
          mod = true
        }
        if (!copy.category) {
          if (copy.purchaseType === 'Finished Product') copy.category = 'Finished Product'
          else if (copy.items && copy.items.some(i => (i.name || '').toLowerCase().includes('carton') || (i.name || '').toLowerCase().includes('label') || (i.name || '').toLowerCase().includes('preform'))) {
            copy.category = 'Packaging'
          } else {
            copy.category = 'Raw Material'
          }
          mod = true
        }
        if (mod) updated = true
        return copy
      })
    } else {
      parsed.purchases = initialDatabase.purchases || []
      updated = true
    }

    if (!parsed.rawMaterialCategories || !Array.isArray(parsed.rawMaterialCategories) || parsed.rawMaterialCategories.length === 0) {
      parsed.rawMaterialCategories = defaultRawMaterialCategories
      updated = true
    }

    if (!parsed.supplierCategories || !Array.isArray(parsed.supplierCategories) || parsed.supplierCategories.length === 0) {
      parsed.supplierCategories = defaultSupplierCategories
      updated = true
    }

    if (!parsed.expenseCategories || !Array.isArray(parsed.expenseCategories) || parsed.expenseCategories.length === 0) {
      parsed.expenseCategories = defaultExpenseCategories
      updated = true
    }

    if (!parsed.purchaseCategories || !Array.isArray(parsed.purchaseCategories) || parsed.purchaseCategories.length === 0) {
      parsed.purchaseCategories = defaultPurchaseCategories
      updated = true
    }

    if (!parsed.phonebookCategories || !Array.isArray(parsed.phonebookCategories) || parsed.phonebookCategories.length === 0) {
      parsed.phonebookCategories = defaultPhonebookCategories
      updated = true
    }

    if (!parsed.phonebookContacts || !Array.isArray(parsed.phonebookContacts) || parsed.phonebookContacts.length === 0) {
      parsed.phonebookContacts = generateInitialPhonebookContacts(parsed)
      updated = true
    }

    if (updated) {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(parsed))
    }

    return parsed
  } catch (err) {
    console.error('Failed to load database:', err)
    return initialDatabase
  }
}

// Helper to save entire database to LocalStorage
export function saveDatabase(db: AppDatabase): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db))
    window.dispatchEvent(new Event('al_farooq_db_updated'))
  } catch (err) {
    console.error('Failed to save database to localStorage:', err)
    throw new Error('Could not save data. Browser storage may be full or unavailable.')
  }
}

// Export database to single JSON file (including base64 images)
export function exportDatabaseJSON(db: AppDatabase): void {
  const updatedDb = { ...db, lastBackupDate: new Date().toISOString() }
  saveDatabase(updatedDb)
  const jsonStr = JSON.stringify(updatedDb, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `AL_FAROOQ_FOODS_BACKUP_${dateStr}.json`
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
  const data = value as Record<string, unknown>
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
    const records = data[key]
    if (!Array.isArray(records)) throw new Error(`Missing or invalid ${key} records.`)
    const ids = new Set<string>()
    for (const record of records) {
      if (!record || typeof record !== 'object' || Array.isArray(record) || typeof record.id !== 'string' || !record.id || ids.has(record.id)) throw new Error(`Invalid or duplicate record in ${key}.`)
      ids.add(record.id)
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
