'use client'

import { useState, useEffect } from 'react'
import { Package, Layers, Factory, Plus, Download, FileText, Tag } from 'lucide-react'
import { type AppDatabase, type ModuleKey } from '@/lib/db'
import InventoryView from './inventory-view'
import ProductionView from './production-view'

export type ProductsSubTab = 'catalog' | 'stock' | 'production'

interface ProductsViewProps {
  db: AppDatabase
  initialTab?: ProductsSubTab
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigate: (key: ModuleKey) => void
}

export default function ProductsView({
  db,
  initialTab = 'catalog',
  onSaveDatabase,
  onNavigate,
}: ProductsViewProps) {
  const [activeTab, setActiveTab] = useState<ProductsSubTab>(initialTab)

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  const lowStockCount = db.products.filter((p) => p.quantity <= p.reorderLevel).length

  const tabs: Array<{
    id: ProductsSubTab
    label: string
    shortLabel: string
    icon: React.ReactNode
    count?: number
    badgeColor?: string
  }> = [
    {
      id: 'catalog',
      label: 'Finished Products Catalog',
      shortLabel: 'Catalog & Pricing',
      icon: <Package className="w-4 h-4" />,
      count: db.products.length,
    },
    {
      id: 'stock',
      label: 'Stock Register & Alerts',
      shortLabel: 'Stock Register',
      icon: <Layers className="w-4 h-4" />,
      count: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: lowStockCount > 0 ? 'bg-amber-100 text-amber-800' : undefined,
    },
    {
      id: 'production',
      label: 'Plant Production Engine',
      shortLabel: 'Production Engine',
      icon: <Factory className="w-4 h-4" />,
      count: db.productionRuns.length,
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Top Products Horizontal Navigation Bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-2 shadow-xs sticky top-[71px] z-20">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                id={`products-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                      tab.badgeColor
                        ? tab.badgeColor
                        : isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sub-view Content Router */}
      <div>
        {activeTab === 'catalog' && (
          <InventoryView
            db={db}
            activeSubView="products"
            onSaveDatabase={onSaveDatabase}
          />
        )}

        {activeTab === 'stock' && (
          <InventoryView
            db={db}
            activeSubView="stock"
            onSaveDatabase={onSaveDatabase}
          />
        )}

        {activeTab === 'production' && (
          <ProductionView db={db} onSaveDatabase={onSaveDatabase} />
        )}
      </div>
    </div>
  )
}
