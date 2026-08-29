'use client'

import React, { useState, useEffect } from 'react'
import {
  Truck,
  Receipt,
  Plus,
  DollarSign,
  Package,
  TrendingDown,
  Layers,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react'
import {
  formatPKR,
  type AppDatabase,
  type ModuleKey,
} from '@/lib/db'
import PurchasesView from './purchases-view'
import ExpensesView from './expenses-view'

export type PurchasesExpensesSubTab = 'purchases' | 'expenses'

interface PurchasesExpensesViewProps {
  db: AppDatabase
  initialTab?: PurchasesExpensesSubTab
  onSaveDatabase: (updated: AppDatabase) => void
  onNavigate?: (module: string, subTab?: string) => void
}

export default function PurchasesExpensesView({
  db,
  initialTab = 'purchases',
  onSaveDatabase,
  onNavigate,
}: PurchasesExpensesViewProps) {
  const [activeTab, setActiveTab] = useState<PurchasesExpensesSubTab>(initialTab)

  // Sync if initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  // Quick total calculations for the summary bar
  const totalPurchasesAmount = React.useMemo(() => {
    return (db.purchases || []).reduce((sum, p) => sum + (p.grandTotal || 0), 0)
  }, [db.purchases])

  const totalExpensesAmount = React.useMemo(() => {
    return (db.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0)
  }, [db.expenses])

  return (
    <div className="space-y-5" id="purchases-expenses-unified-module">
      {/* Top Module Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              <Truck className="w-3.5 h-3.5" /> Procurement & Operations
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 mt-1">Purchases & Expenses</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage vendor purchases, raw materials procurement, factory operations, utilities, and daily business expenses.
          </p>
        </div>

        {/* Two Unified Tabs */}
        <div className="flex items-center gap-1 p-1 bg-stone-100/90 rounded-xl border border-stone-200 self-start md:self-center shadow-2xs">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'purchases'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            id="tab-purchases-orders"
          >
            <Truck className={`w-4 h-4 ${activeTab === 'purchases' ? 'text-emerald-600' : 'text-stone-400'}`} />
            <span>Purchases & Orders</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
              {db.purchases?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'expenses'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            id="tab-expenses-vouchers"
          >
            <Receipt className={`w-4 h-4 ${activeTab === 'expenses' ? 'text-amber-600' : 'text-stone-400'}`} />
            <span>Factory & Daily Expenses</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
              {db.expenses?.length || 0}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content Display */}
      {activeTab === 'purchases' ? (
        <div id="unified-tab-purchases-content">
          <PurchasesView
            db={db}
            onSaveDatabase={onSaveDatabase}
            onNavigate={onNavigate}
          />
        </div>
      ) : (
        <div id="unified-tab-expenses-content">
          <ExpensesView
            db={db}
            onSaveDatabase={onSaveDatabase}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </div>
  )
}
