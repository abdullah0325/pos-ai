// Client-side Offline Database & Storage for AL FAROOQ FOODS
// Operates 100% offline using IndexedDB + LocalStorage with JSON Export/Import

export type Status = 'Active' | 'In stock' | 'Low stock' | 'Out of stock' | 'In production' | 'Completed' | 'Pending' | 'Paid' | 'Partial' | 'Unpaid' | 'Delivered'

export type ProductCategory = 'Mineral Water' | 'Fruit Juice' | 'Candy & Toffee' | 'Snacks & Chips' | 'Other'
export type RawMaterialCategory = 'Ingredients' | 'Packaging' | 'Chemicals & Minerals' | 'Flavors' | 'Other'
export type CustomerType = 'Distributor' | 'Wholesaler' | 'Retailer' | 'Counter'
export type ExpenseCategory = 'Factory Electricity' | 'Labor & Wages' | 'Fuel & Transport' | 'Machine Maintenance' | 'Factory Rent' | 'Packaging & Consumables' | 'Office & Admin' | 'Marketing' | 'Misc'

export interface ProductItem {
  id: string
  name: string
  category: ProductCategory
  sku: string
  quantity: number // finished cartons / packs / pcs
  unit: string // 'Cartons', 'Pcs', 'Bottles', 'Jars', 'Boxes'
  costPrice: number // manufacturing cost
  wholesalePrice: number
  retailPrice: number
  reorderLevel: number
  status: Status
  imageUrl?: string
  description?: string
  updatedAt: string
}

export interface RawMaterialItem {
  id: string
  name: string
  category: RawMaterialCategory
  sku: string
  quantity: number
  unit: string // 'kg', 'Liters', 'Pcs', 'Rolls', 'Bags'
  unitCost: number
  reorderLevel: number
  supplierId?: string
  supplierName?: string
  status: Status
  imageUrl?: string
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

export interface CustomerItem {
  id: string
  name: string
  businessName: string
  type: CustomerType
  phone: string
  altPhone?: string
  email?: string
  address: string
  city: string
  openingBalance: number
  currentBalance: number // positive = receivable from customer
  creditLimit: number
  status: 'Active' | 'Blocked'
  notes?: string
  updatedAt: string
}

export interface SupplierItem {
  id: string
  name: string
  contactPerson: string
  category: string
  phone: string
  email?: string
  address: string
  city: string
  openingBalance: number
  currentBalance: number // positive = payable to supplier
  status: 'Active' | 'Blocked'
  notes?: string
  updatedAt: string
}

export interface InvoiceLineItem {
  productId: string
  name: string
  quantity: number
  unit: string
  unitPrice: number
  costPrice: number
  total: number
}

export interface InvoiceItem {
  id: string
  invoiceNumber: string
  date: string
  customerId: string
  customerName: string
  customerType: CustomerType
  phone: string
  address: string
  saleType: 'Distributor' | 'Wholesale' | 'Retail' | 'Counter'
  items: InvoiceLineItem[]
  subtotal: number
  discount: number
  tax: number
  grandTotal: number
  amountPaid: number
  balanceDue: number
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit'
  paymentAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank'
  status: 'Paid' | 'Partial' | 'Unpaid'
  deliveryStatus: 'Delivered' | 'Pending' | 'Dispatched'
  notes?: string
  createdAt: string
}

export interface PurchaseLineItem {
  rawMaterialId: string
  name: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
}

export interface PurchaseItem {
  id: string
  poNumber: string
  date: string
  supplierId: string
  supplierName: string
  items: PurchaseLineItem[]
  grandTotal: number
  amountPaid: number
  balanceDue: number
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Credit'
  paymentAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank'
  status: 'Paid' | 'Partial' | 'Unpaid'
  notes?: string
  createdAt: string
}

export interface ExpenseItem {
  id: string
  expenseNumber: string
  date: string
  category: ExpenseCategory
  description: string
  amount: number
  paidTo: string
  paymentMethod: 'Cash' | 'Bank Transfer'
  paymentAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank'
  receiptImage?: string
  status: 'Paid'
  createdAt: string
}

export interface ReturnItem {
  id: string
  returnNumber: string
  date: string
  type: 'Customer Sales Return' | 'Supplier Purchase Return' | 'Stock Damage Adjustment'
  partyId?: string
  partyName: string
  items: Array<{
    id: string
    name: string
    quantity: number
    unit: string
    unitPrice: number
    total: number
    reason: string
  }>
  totalRefund: number
  refundStatus: 'Adjusted in Ledger' | 'Cash Refunded'
  notes?: string
  createdAt: string
}

export interface AccountBalance {
  id: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank'
  name: string
  type: 'Cash' | 'Bank'
  accountNumber?: string
  balance: number
  updatedAt: string
}

export interface AccountTransfer {
  id: string
  date: string
  fromAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank'
  toAccount: 'cash-in-hand' | 'meezan-bank' | 'hbl-bank'
  amount: number
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

export interface AppDatabase {
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
  lastBackupDate?: string
  version: number
}

export const DB_STORAGE_KEY = 'al_farooq_foods_db_v2'

// Initial Default Food Manufacturing Dataset
export const initialDatabase: AppDatabase = {
  version: 2,
  lastBackupDate: '2026-08-21T10:00:00.000Z',
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
      address: 'Shop # 14-18, New G.T. Road Wholesale Market',
      city: 'Peshawar',
      openingBalance: 120000,
      currentBalance: 185400,
      creditLimit: 500000,
      status: 'Active',
      notes: 'Major distributor for KPK region. Prompt 15-day settlement.',
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
      address: 'Main Grain Market, Gunj Mandi Road',
      city: 'Rawalpindi',
      openingBalance: 50000,
      currentBalance: 92600,
      creditLimit: 300000,
      status: 'Active',
      notes: 'High volume wholesale buyer for mineral water and juice cartons.',
      updatedAt: '2026-08-24',
    },
    {
      id: 'cust-3',
      name: 'Malik Jahangir Khan',
      businessName: 'Khyber Fast Distribution Network',
      type: 'Distributor',
      phone: '0300 5544332',
      address: 'Industrial Estate Gate 2, Nowshera Road',
      city: 'Mardan',
      openingBalance: 150000,
      currentBalance: 240000,
      creditLimit: 600000,
      status: 'Active',
      notes: 'Handles 4 delivery supply vans covering Mardan and Swabi.',
      updatedAt: '2026-08-23',
    },
    {
      id: 'cust-4',
      name: 'Sheikh Nabeel & Brothers',
      businessName: 'Chenab Valley Traders',
      type: 'Wholesaler',
      phone: '0312 8877665',
      address: 'Circular Road, Near Clock Tower',
      city: 'Gujranwala',
      openingBalance: 30000,
      currentBalance: 48000,
      creditLimit: 200000,
      status: 'Active',
      notes: 'Wholesaler for confectionery and snacks.',
      updatedAt: '2026-08-22',
    },
    {
      id: 'cust-5',
      name: 'Kashif Mehmood',
      businessName: 'Gulberg Supermart & Bakers',
      type: 'Retailer',
      phone: '0333 4455667',
      address: 'Block C-2, Main Boulevard Gulberg',
      city: 'Lahore',
      openingBalance: 0,
      currentBalance: 14500,
      creditLimit: 100000,
      status: 'Active',
      notes: 'Regular weekly delivery on Tuesday.',
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
  ],
  purchases: [
    {
      id: 'po-3021',
      poNumber: 'PO-2026-3021',
      date: '2026-08-23',
      supplierId: 'sup-1',
      supplierName: 'National Sugar Mills Ltd',
      items: [
        { rawMaterialId: 'raw-1', name: 'Refined White Sugar (Food Grade A)', quantity: 2000, unit: 'kg', unitPrice: 145, total: 290000 },
      ],
      grandTotal: 290000,
      amountPaid: 200000,
      balanceDue: 90000,
      paymentMethod: 'Bank Transfer',
      paymentAccount: 'meezan-bank',
      status: 'Partial',
      notes: 'Received 40 bags of 50kg Sugar. Quality verified.',
      createdAt: '2026-08-23T09:00:00Z',
    },
    {
      id: 'po-3020',
      poNumber: 'PO-2026-3020',
      date: '2026-08-22',
      supplierId: 'sup-3',
      supplierName: 'Crown Plastics & Preforms',
      items: [
        { rawMaterialId: 'raw-4', name: 'PET Preforms 500ml (28mm Neck)', quantity: 15000, unit: 'Pcs', unitPrice: 6.5, total: 97500 },
        { rawMaterialId: 'raw-6', name: '28mm HDPE Bottling Caps (Tamper Evident)', quantity: 15000, unit: 'Pcs', unitPrice: 2.1, total: 31500 },
      ],
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
  ]
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
    if (!parsed.products || !parsed.rawMaterials || !parsed.productionRuns) {
      const merged = { ...initialDatabase, ...parsed }
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(merged))
      return merged
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
  const data = JSON.parse(text) as AppDatabase
  if (!data.products || !data.rawMaterials || !data.customers || !data.invoices) {
    throw new Error('Invalid AL FAROOQ FOODS backup file.')
  }
  saveDatabase(data)
  return data
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
  | 'invoices'
  | 'counter-sales'
  | 'distributors'
  | 'wholesalers'
  | 'customers'
  | 'production'
  | 'products'
  | 'raw-materials'
  | 'stock'
  | 'suppliers'
  | 'purchases'
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
  dashboard: 'Executive Dashboard',
  invoices: 'Commercial Invoices & Challans',
  'counter-sales': 'Counter Sales & Direct POS',
  distributors: 'Distributor Accounts & Balances',
  wholesalers: 'Wholesale Buyer Accounts',
  customers: 'Client Directory & Biodata',
  production: 'Plant Production Engine & BOM',
  products: 'Finished Products Inventory',
  'raw-materials': 'Raw Material Warehouse',
  stock: 'Consolidated Stock Register',
  suppliers: 'Supplier Accounts & Vendor Ledgers',
  purchases: 'Raw Material Purchase Orders',
  expenses: 'Factory & Administrative Expenses',
  returns: 'Returns & Damaged Goods Tracking',
  'cash-bank': 'Cash Register & Bank Accounts',
  'daily-summary': 'Daily Accounts Summary',
  'monthly-summary': 'Monthly Financial Statement',
  'yearly-summary': 'Yearly Financial Review',
  'profit-loss': 'Profit & Loss Statement',
  phonebook: 'Factory & Trade Phone Book',
  reports: 'Reports & Export Center',
  settings: 'System Configuration & Backups',
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
