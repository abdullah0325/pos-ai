export type Status = 'Active' | 'Low stock' | 'In production' | 'Completed' | 'Pending' | 'Paid'

export type RecordItem = {
  id: string
  name: string
  category?: string
  sku?: string
  quantity?: number
  unit?: string
  price?: number
  status: Status
  meta?: string
  imageUrl?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  syncStatus?: 'synced' | 'pending'
}

export type ModuleKey =
  | 'dashboard'
  | 'products'
  | 'raw-materials'
  | 'production'
  | 'sales'
  | 'purchases'
  | 'expenses'
  | 'staff'
  | 'customers'
  | 'suppliers'
  | 'reports'
  | 'settings'

export const moduleLabels: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  'raw-materials': 'Raw materials',
  production: 'Production',
  sales: 'Sales',
  purchases: 'Purchases',
  expenses: 'Expenses',
  staff: 'Staff',
  customers: 'Customers',
  suppliers: 'Suppliers',
  reports: 'Reports',
  settings: 'Settings',
}

export const seedData: Record<Exclude<ModuleKey, 'dashboard' | 'settings' | 'reports'>, RecordItem[]> = {
  products: [
    { id: 'p-1', name: 'Classic Cotton Tee', category: 'Apparel', sku: 'CT-001', quantity: 248, unit: 'pcs', price: 1299, status: 'Active', meta: 'Updated today' },
    { id: 'p-2', name: 'Relaxed Linen Shirt', category: 'Apparel', sku: 'LS-014', quantity: 42, unit: 'pcs', price: 2499, status: 'Low stock', meta: 'Reorder at 50' },
    { id: 'p-3', name: 'Canvas Weekend Tote', category: 'Accessories', sku: 'WT-009', quantity: 126, unit: 'pcs', price: 899, status: 'Active', meta: 'Updated yesterday' },
    { id: 'p-4', name: 'Everyday Chino', category: 'Apparel', sku: 'EC-004', quantity: 86, unit: 'pcs', price: 1999, status: 'Active', meta: 'Updated 2 days ago' },
  ],
  'raw-materials': [
    { id: 'r-1', name: 'Organic cotton', category: 'Fabric', sku: 'MAT-021', quantity: 680, unit: 'kg', price: 420, status: 'Active', meta: 'Horizon Textiles' },
    { id: 'r-2', name: 'Linen blend', category: 'Fabric', sku: 'MAT-033', quantity: 75, unit: 'kg', price: 680, status: 'Low stock', meta: 'Horizon Textiles' },
    { id: 'r-3', name: 'Brass buttons', category: 'Trim', sku: 'MAT-041', quantity: 2400, unit: 'pcs', price: 8, status: 'Active', meta: 'Craft Supply Co.' },
  ],
  production: [
    { id: 'm-1', name: 'Classic Cotton Tee / Batch 24', category: 'Cut & sew', quantity: 320, unit: 'pcs', status: 'In production', meta: 'Due Aug 26' },
    { id: 'm-2', name: 'Canvas Weekend Tote / Batch 18', category: 'Assembly', quantity: 180, unit: 'pcs', status: 'Completed', meta: 'Completed Aug 20' },
    { id: 'm-3', name: 'Relaxed Linen Shirt / Batch 12', category: 'Cut & sew', quantity: 120, unit: 'pcs', status: 'Pending', meta: 'Starts Aug 28' },
  ],
  sales: [
    { id: 's-1', name: 'Order #1048', category: 'Walk-in', quantity: 4, price: 6896, status: 'Paid', meta: 'Muhammad Abdullah · Today' },
    { id: 's-2', name: 'Order #1047', category: 'Online', quantity: 2, price: 3798, status: 'Paid', meta: 'Ayesha Khan · Today' },
    { id: 's-3', name: 'Order #1046', category: 'Wholesale', quantity: 18, price: 28800, status: 'Pending', meta: 'Urban Form · Yesterday' },
  ],
  purchases: [
    { id: 'b-1', name: 'PO #2031', category: 'Raw materials', quantity: 680, price: 285600, status: 'Paid', meta: 'Horizon Textiles · Aug 20' },
    { id: 'b-2', name: 'PO #2030', category: 'Packaging', quantity: 500, price: 42000, status: 'Pending', meta: 'PackRight · Aug 19' },
  ],
  expenses: [
    { id: 'e-1', name: 'Studio rent', category: 'Operations', price: 85000, status: 'Paid', meta: 'Aug 01' },
    { id: 'e-2', name: 'Courier & delivery', category: 'Logistics', price: 12400, status: 'Paid', meta: 'Aug 18' },
    { id: 'e-3', name: 'Equipment repair', category: 'Maintenance', price: 6800, status: 'Pending', meta: 'Aug 19' },
  ],
  staff: [
    { id: 'st-1', name: 'Sana Ahmed', category: 'Production lead', status: 'Active', meta: 'Joined Jan 2024' },
    { id: 'st-2', name: 'Bilal Raza', category: 'Warehouse', status: 'Active', meta: 'Joined Apr 2024' },
    { id: 'st-3', name: 'Nida Malik', category: 'Sales', status: 'Active', meta: 'Joined Jul 2024' },
  ],
  customers: [
    { id: 'c-1', name: 'Muhammad Abdullah', category: 'Retail', meta: '12 orders · Rs. 34,780', status: 'Active' },
    { id: 'c-2', name: 'Ayesha Khan', category: 'Retail', meta: '8 orders · Rs. 21,400', status: 'Active' },
    { id: 'c-3', name: 'Urban Form', category: 'Wholesale', meta: '4 orders · Rs. 120,000', status: 'Active' },
  ],
  suppliers: [
    { id: 'sp-1', name: 'Horizon Textiles', category: 'Fabric supplier', meta: '18 purchase orders', status: 'Active' },
    { id: 'sp-2', name: 'Craft Supply Co.', category: 'Trims & hardware', meta: '9 purchase orders', status: 'Active' },
    { id: 'sp-3', name: 'PackRight', category: 'Packaging', meta: '6 purchase orders', status: 'Active' },
  ],
}

export const dashboardStats = [
  { label: 'Total sales', value: 'Rs. 428,650', change: '+12.8%', tone: 'purple' },
  { label: 'Orders', value: '184', change: '+8.2%', tone: 'olive' },
  { label: 'Products in stock', value: '1,248', change: '+4.5%', tone: 'purple' },
  { label: 'Expenses', value: 'Rs. 104,200', change: '-3.1%', tone: 'olive' },
]

export function getRecords(key: Exclude<ModuleKey, 'dashboard' | 'settings' | 'reports'>): RecordItem[] {
  if (typeof window === 'undefined') return seedData[key]
  try {
    const saved = window.localStorage.getItem(`loom:${key}`)
    return saved ? JSON.parse(saved) : seedData[key]
  } catch { return seedData[key] }
}

export function saveRecords(key: Exclude<ModuleKey, 'dashboard' | 'settings' | 'reports'>, records: RecordItem[]) {
  if (typeof window !== 'undefined') window.localStorage.setItem(`loom:${key}`, JSON.stringify(records))
}

export const currency = (value = 0) => `Rs. ${value.toLocaleString('en-IN')}`

export const moduleApiMap: Record<string, string> = Object.fromEntries(Object.keys(moduleLabels).map((key) => [key, `/api/${key}`]))
