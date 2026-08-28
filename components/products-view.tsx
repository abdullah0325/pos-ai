'use client'

import { type AppDatabase, type ModuleKey } from '@/lib/db'
import InventoryView from './inventory-view'

export type ProductsSubTab = 'catalog' | 'production' | 'stock' | 'products'

interface ProductsViewProps {
  db: AppDatabase
  initialTab?: ProductsSubTab
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigate?: (key: ModuleKey, subTab?: string) => void
}

export default function ProductsView({
  db,
  initialTab,
  onSaveDatabase,
  onNavigate,
}: ProductsViewProps) {
  const activeSubView = initialTab === 'stock' ? 'stock' : 'products'
  return (
    <div className="w-full" id="products-catalog-page">
      <InventoryView
        db={db}
        activeSubView={activeSubView}
        onSaveDatabase={onSaveDatabase}
      />
    </div>
  )
}

