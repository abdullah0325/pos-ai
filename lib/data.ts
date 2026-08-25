// AL FAROOQ FOODS - Core Data Definitions and Module Navigation
export type {
  ProductItem,
  RawMaterialItem,
  ProductionRun,
  CustomerItem,
  SupplierItem,
  InvoiceItem,
  PurchaseItem,
  ExpenseItem,
  ReturnItem,
  AccountBalance,
  AccountTransfer,
  LedgerEntry,
  AppDatabase,
  Status,
  ProductCategory,
  RawMaterialCategory,
  CustomerType,
  ExpenseCategory,
} from './db'

export {
  loadDatabase,
  saveDatabase,
  exportDatabaseJSON,
  importDatabaseJSON,
  fileToBase64,
  formatPKR,
  formatDate,
  initialDatabase,
} from './db'

export type ModuleKey =
  | 'dashboard'
  | 'invoices'
  | 'counter-sales'
  | 'distributors'
  | 'wholesalers'
  | 'customers'
  | 'products'
  | 'raw-materials'
  | 'production'
  | 'stock'
  | 'purchases'
  | 'suppliers'
  | 'expenses'
  | 'returns'
  | 'cash-bank'
  | 'daily-summary'
  | 'monthly-summary'
  | 'yearly-summary'
  | 'profit-loss'
  | 'phonebook'
  | 'reports'
  | 'settings'

export const moduleLabels: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  invoices: 'Invoices',
  'counter-sales': 'Counter Sales',
  distributors: 'Distributor Accounts',
  wholesalers: 'Wholesaler Accounts',
  customers: 'Customer Accounts',
  products: 'Finished Products',
  'raw-materials': 'Raw Materials',
  production: 'Production Management',
  stock: 'Stock In & Out',
  purchases: 'Purchases (Raw Material)',
  suppliers: 'Supplier Accounts',
  expenses: 'Expense Management',
  returns: 'Returns & Adjustments',
  'cash-bank': 'Cash & Bank Accounts',
  'daily-summary': 'Daily Accounts',
  'monthly-summary': 'Monthly Accounts',
  'yearly-summary': 'Yearly Accounts',
  'profit-loss': 'Profit & Loss',
  phonebook: 'Phone Book',
  reports: 'Reports & Exports',
  settings: 'Settings & Backup',
}

export const currency = (value = 0) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
