'use client'

import { type AppDatabase, type ModuleKey } from '@/lib/db'
import InventoryView from './inventory-view'

interface ProductsViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigate: (key: ModuleKey) => void
}

export default function ProductsView({
  db,
  onSaveDatabase,
}: ProductsViewProps) {
  return (
    <div className="w-full" id="products-catalog-page">
      <InventoryView
        db={db}
        activeSubView="products"
        onSaveDatabase={onSaveDatabase}
      />
    </div>
  )
}

