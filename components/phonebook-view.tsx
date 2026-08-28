'use client'

import { useState } from 'react'
import { Phone, MessageSquare, Search, Plus, MapPin, Building2, User, X } from 'lucide-react'
import { type AppDatabase, type CustomerItem } from '@/lib/db'

interface PhonebookViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
}

export default function PhonebookView({ db, onSaveDatabase }: PhonebookViewProps) {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('All')

  // Aggregate all contacts from customers and suppliers
  const contacts = [
    ...db.customers.map((c) => ({
      id: c.id,
      name: c.name,
      business: c.businessName || `${c.type || 'Customer'} Account`,
      type: c.type || 'Customer',
      phone: c.phone || '',
      city: c.city || '—',
      address: c.address || '',
      isSupplier: false,
    })),
    ...db.suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      business: s.category ? `${s.category} Supplier` : 'Raw Material Supplier',
      type: 'Supplier' as const,
      phone: s.phone || '',
      city: s.city || '—',
      address: s.address || '',
      isSupplier: true,
    })),
  ]

  const filtered = contacts.filter((c) => {
    const matchQ =
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.business.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query) ||
      c.city.toLowerCase().includes(query.toLowerCase()) ||
      c.address.toLowerCase().includes(query.toLowerCase())

    let matchRole = true
    if (roleFilter !== 'All') {
      if (roleFilter === 'Distributor') {
        matchRole = c.type === 'Distributor'
      } else if (roleFilter === 'Wholesaler') {
        matchRole = c.type === 'Wholesaler'
      } else if (roleFilter === 'Retailer') {
        matchRole = c.type === 'Retailer'
      } else if (roleFilter === 'Sales Representative') {
        matchRole = c.type === 'Sales Representative' || c.type === 'Sales Man'
      } else if (roleFilter === 'Supplier') {
        matchRole = c.type === 'Supplier' || c.isSupplier
      } else if (roleFilter === 'Counter') {
        matchRole = c.type === 'Counter' || c.type === 'Walk-in' || c.type === 'Other'
      } else {
        matchRole = c.type === roleFilter
      }
    }

    return matchQ && matchRole
  })

  // Format Pakistani phone number for WhatsApp link
  const getWhatsAppLink = (phone: string) => {
    let clean = phone.replace(/[^0-9]/g, '')
    if (clean.startsWith('0')) {
      clean = '92' + clean.slice(1)
    }
    return `https://wa.me/${clean}?text=Assalam-o-Alaikum,%20from%20AL%20FAROOQ%20FOODS.`
  }

  const distributorsCount = contacts.filter((c) => c.type === 'Distributor').length
  const wholesalersCount = contacts.filter((c) => c.type === 'Wholesaler').length
  const retailersCount = contacts.filter((c) => c.type === 'Retailer').length
  const salesRepsCount = contacts.filter((c) => c.type === 'Sales Representative' || c.type === 'Sales Man').length
  const suppliersCount = contacts.filter((c) => c.isSupplier || c.type === 'Supplier').length
  const othersCount = contacts.filter((c) => c.type === 'Counter' || c.type === 'Walk-in' || c.type === 'Other').length

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Directory & Communication</p>
          <h1>Company Phone Book</h1>
          <p className="subheading">
            Instant 1-click dialer and WhatsApp connect for all distributors, wholesalers, retail buyers, and raw material suppliers.
          </p>
        </div>
      </div>

      <div className="module-toolbar">
        <div className="flex items-center gap-3">
          <div className="search-box">
            <Search />
            <input
              placeholder="Search by contact, business, phone or city..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-[var(--border)] rounded-md px-3 py-1.5 text-xs bg-white cursor-pointer"
          >
            <option value="All">All Categories ({contacts.length})</option>
            {distributorsCount > 0 && <option value="Distributor">Distributors ({distributorsCount})</option>}
            {wholesalersCount > 0 && <option value="Wholesaler">Wholesalers ({wholesalersCount})</option>}
            {retailersCount > 0 && <option value="Retailer">Retailers ({retailersCount})</option>}
            {salesRepsCount > 0 && <option value="Sales Representative">Sales Reps ({salesRepsCount})</option>}
            {suppliersCount > 0 && <option value="Supplier">Suppliers ({suppliersCount})</option>}
            {othersCount > 0 && <option value="Counter">Counter / Walk-in ({othersCount})</option>}
          </select>
        </div>
        <div className="result-count">
          Showing {filtered.length} of {contacts.length} verified phone numbers
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div key={item.id} className="panel flex flex-col justify-between p-4">
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="row-avatar bg-[#f0f7e8] text-[#7cb518]">
                    {item.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <strong className="text-sm text-gray-900 block">{item.name}</strong>
                    <span className="text-[11px] text-gray-500">{item.business}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {item.type}
                </span>
              </div>

              <div className="space-y-1 my-3 text-xs text-gray-600">
                <div className="flex items-center gap-1.5 font-mono font-semibold text-gray-800">
                  <Phone className="w-3.5 h-3.5 text-[#7cb518]" />
                  <span>{item.phone}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-500">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{item.city} · {item.address}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <a
                href={`tel:${item.phone.replace(/[^0-9+]/g, '')}`}
                className="button secondary flex-1 text-xs py-1.5 h-auto text-center"
              >
                <Phone className="w-3.5 h-3.5" /> Call
              </a>
              <a
                href={getWhatsAppLink(item.phone)}
                target="_blank"
                rel="noreferrer"
                className="button primary flex-1 text-xs py-1.5 h-auto text-center bg-[#25D366] text-white border-0 shadow-none hover:opacity-90"
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
