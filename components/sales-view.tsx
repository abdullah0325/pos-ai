'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  ShoppingCart,
  Truck,
  Store,
  Building2,
  ArrowRight,
  TrendingUp,
  Receipt,
  Users,
} from 'lucide-react'
import { type AppDatabase, type ModuleKey } from '@/lib/db'
import InvoicesView from './invoices-view'
import PosView from './pos-view'
import SalesEntitiesView from './sales-entities-view'

export type SalesSubTab =
  | 'invoices'
  | 'pos'
  | 'distributors'
  | 'customers'
  | 'wholesalers'

interface SalesViewProps {
  db: AppDatabase
  initialTab?: SalesSubTab
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigate: (key: ModuleKey) => void
}

export default function SalesView({
  db,
  initialTab = 'invoices',
  onSaveDatabase,
  onNavigate,
}: SalesViewProps) {
  const [activeTab, setActiveTab] = useState<SalesSubTab>(initialTab)

  // Sync tab if initialTab changes externally
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  // Count summaries for badges
  const distributorsCount = db.customers.filter(
    (c) => c.type === 'Distributor' || c.type === 'Sales Representative'
  ).length
  const retailCustomersCount = db.customers.filter(
    (c) => c.type === 'Retailer' || c.type === 'Other'
  ).length
  const wholesalersCount = db.customers.filter((c) => c.type === 'Wholesaler').length

  const tabs: Array<{
    id: SalesSubTab
    label: string
    shortLabel: string
    icon: React.ReactNode
    count?: number
  }> = [
    {
      id: 'invoices',
      label: 'Invoices & Sales Orders',
      shortLabel: 'Invoices',
      icon: <FileText className="w-4 h-4" />,
      count: db.invoices.length,
    },
    {
      id: 'pos',
      label: 'Counter Sales (POS)',
      shortLabel: 'Counter POS',
      icon: <ShoppingCart className="w-4 h-4" />,
    },
    {
      id: 'distributors',
      label: 'Distributors & Sales Reps',
      shortLabel: 'Distributors',
      icon: <Truck className="w-4 h-4" />,
      count: distributorsCount,
    },
    {
      id: 'customers',
      label: 'Customers / Retail Shops',
      shortLabel: 'Customers & Shops',
      icon: <Store className="w-4 h-4" />,
      count: retailCustomersCount,
    },
    {
      id: 'wholesalers',
      label: 'Wholesaler Accounts',
      shortLabel: 'Wholesalers',
      icon: <Building2 className="w-4 h-4" />,
      count: wholesalersCount,
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Top Sales Horizontal Navigation Bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-2 shadow-xs sticky top-[71px] z-20">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                id={`sales-tab-${tab.id}`}
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
                      isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
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
        {activeTab === 'invoices' && (
          <InvoicesView db={db} onSaveDatabase={onSaveDatabase} />
        )}

        {activeTab === 'pos' && (
          <PosView db={db} onSaveDatabase={onSaveDatabase} onNavigate={onNavigate} />
        )}

        {activeTab === 'distributors' && (
          <SalesEntitiesView
            db={db}
            entityType="distributors"
            onSaveDatabase={onSaveDatabase}
          />
        )}

        {activeTab === 'customers' && (
          <SalesEntitiesView
            db={db}
            entityType="customers"
            onSaveDatabase={onSaveDatabase}
          />
        )}

        {activeTab === 'wholesalers' && (
          <SalesEntitiesView
            db={db}
            entityType="wholesalers"
            onSaveDatabase={onSaveDatabase}
          />
        )}
      </div>
    </div>
  )
}
