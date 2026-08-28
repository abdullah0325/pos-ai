'use client'

import { useState, useMemo } from 'react'
import {
  Phone,
  MessageSquare,
  Search,
  Plus,
  MapPin,
  Building2,
  User,
  X,
  Edit2,
  Trash2,
  Star,
  Copy,
  Check,
  FolderPlus,
  Settings2,
  Download,
  Printer,
  LayoutGrid,
  List,
  ArrowUpDown,
  Filter,
  ExternalLink,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import {
  type AppDatabase,
  type PhonebookContactItem,
  type PhonebookCategoryItem,
  defaultPhonebookCategories,
  generateInitialPhonebookContacts,
} from '@/lib/db'

interface PhonebookViewProps {
  db: AppDatabase
  onSaveDatabase: (updated: AppDatabase) => void
}

// Preset color options for categories
const CATEGORY_COLORS: Array<{ id: string; name: string; bg: string; text: string; border: string }> = [
  { id: 'emerald', name: 'Emerald Green', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { id: 'purple', name: 'Royal Purple', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { id: 'amber', name: 'Amber Gold', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { id: 'blue', name: 'Deep Blue', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { id: 'orange', name: 'Warm Orange', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  { id: 'teal', name: 'Teal Green', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  { id: 'sky', name: 'Sky Blue', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  { id: 'rose', name: 'Rose Red', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  { id: 'stone', name: 'Warm Gray', bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' },
]

// Common major commercial hubs in Pakistan for fast city selection
const COMMON_CITIES = [
  'Lahore',
  'Faisalabad',
  'Karachi',
  'Rawalpindi',
  'Islamabad',
  'Gujranwala',
  'Multan',
  'Sialkot',
  'Peshawar',
  'Quetta',
  'Sargodha',
  'Bahawalpur',
  'Sukkur',
  'Sheikhupura',
]

export default function PhonebookView({ db, onSaveDatabase }: PhonebookViewProps) {
  // Ensure we have current contacts and categories
  const contacts: PhonebookContactItem[] = useMemo(() => {
    if (db.phonebookContacts && Array.isArray(db.phonebookContacts) && db.phonebookContacts.length > 0) {
      return db.phonebookContacts
    }
    return generateInitialPhonebookContacts(db)
  }, [db])

  const categories: PhonebookCategoryItem[] = useMemo(() => {
    if (db.phonebookCategories && Array.isArray(db.phonebookCategories) && db.phonebookCategories.length > 0) {
      return db.phonebookCategories
    }
    return defaultPhonebookCategories
  }, [db])

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedCity, setSelectedCity] = useState<string>('All')
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'category' | 'recent'>('name-asc')

  // Feedback states
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Modals state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<PhonebookContactItem | null>(null)

  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<PhonebookCategoryItem | null>(null)

  const [contactToDelete, setContactToDelete] = useState<PhonebookContactItem | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<PhonebookCategoryItem | null>(null)

  // Contact Form state
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    altPhone: '',
    whatsapp: '',
    whatsappSameAsPhone: true,
    category: '',
    businessName: '',
    city: 'Lahore',
    customCity: '',
    address: '',
    email: '',
    notes: '',
    isFavorite: false,
  })

  // Category Form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: 'emerald',
    description: '',
  })

  // Show transient toast
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  // Copy phone number helper
  const handleCopyPhone = (phone: string, id: string) => {
    navigator.clipboard?.writeText(phone)
    setCopiedPhoneId(id)
    setTimeout(() => {
      setCopiedPhoneId(null)
    }, 2000)
    showToast(`Copied ${phone} to clipboard`)
  }

  // Pakistani phone WhatsApp link generator
  const getWhatsAppLink = (phone: string, contactName?: string) => {
    let clean = phone.replace(/[^0-9]/g, '')
    if (clean.startsWith('0')) {
      clean = '92' + clean.slice(1)
    } else if (clean.startsWith('+92')) {
      clean = clean.replace('+', '')
    } else if (!clean.startsWith('92') && clean.length === 10) {
      clean = '92' + clean
    }
    const greeting = contactName
      ? `Assalam-o-Alaikum ${contactName}, from AL FAROOQ FOODS.`
      : `Assalam-o-Alaikum, from AL FAROOQ FOODS.`
    return `https://wa.me/${clean}?text=${encodeURIComponent(greeting)}`
  }

  // Toggle favorite
  const handleToggleFavorite = (contactId: string) => {
    const updatedContacts = contacts.map((c) =>
      c.id === contactId ? { ...c, isFavorite: !c.isFavorite, updatedAt: new Date().toISOString() } : c
    )
    onSaveDatabase({
      ...db,
      phonebookContacts: updatedContacts,
      phonebookCategories: categories,
    })
  }

  // Open Contact Modal for New
  const handleOpenNewContact = (presetCategory?: string) => {
    setEditingContact(null)
    const firstCat = presetCategory || (categories.length > 0 ? categories[0].name : 'General & Personal')
    setContactForm({
      name: '',
      phone: '',
      altPhone: '',
      whatsapp: '',
      whatsappSameAsPhone: true,
      category: firstCat,
      businessName: '',
      city: 'Lahore',
      customCity: '',
      address: '',
      email: '',
      notes: '',
      isFavorite: false,
    })
    setIsContactModalOpen(true)
  }

  // Open Contact Modal for Edit
  const handleOpenEditContact = (contact: PhonebookContactItem) => {
    setEditingContact(contact)
    const isStandardCity = COMMON_CITIES.includes(contact.city || '')
    setContactForm({
      name: contact.name,
      phone: contact.phone,
      altPhone: contact.altPhone || '',
      whatsapp: contact.whatsapp || '',
      whatsappSameAsPhone: !contact.whatsapp || contact.whatsapp === contact.phone,
      category: contact.category || (categories[0]?.name || 'General & Personal'),
      businessName: contact.businessName || '',
      city: isStandardCity ? (contact.city || 'Lahore') : 'Other',
      customCity: isStandardCity ? '' : (contact.city || ''),
      address: contact.address || '',
      email: contact.email || '',
      notes: contact.notes || '',
      isFavorite: !!contact.isFavorite,
    })
    setIsContactModalOpen(true)
  }

  // Save Contact (Create or Update)
  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactForm.name.trim()) {
      alert('Please provide contact person name.')
      return
    }
    if (!contactForm.phone.trim()) {
      alert('Please provide a primary phone number.')
      return
    }

    const resolvedCity =
      contactForm.city === 'Other'
        ? contactForm.customCity.trim() || 'Other'
        : contactForm.city

    const finalWhatsApp = contactForm.whatsappSameAsPhone
      ? contactForm.phone.trim()
      : contactForm.whatsapp.trim() || contactForm.phone.trim()

    const nowStr = new Date().toISOString().slice(0, 10)

    let updatedContacts: PhonebookContactItem[] = []
    let updatedCustomers = db.customers ? [...db.customers] : []
    let updatedSuppliers = db.suppliers ? [...db.suppliers] : []

    if (editingContact) {
      // UPDATE existing contact
      updatedContacts = contacts.map((c) => {
        if (c.id === editingContact.id) {
          return {
            ...c,
            name: contactForm.name.trim(),
            phone: contactForm.phone.trim(),
            altPhone: contactForm.altPhone.trim(),
            whatsapp: finalWhatsApp,
            category: contactForm.category || 'General & Personal',
            businessName: contactForm.businessName.trim(),
            city: resolvedCity,
            address: contactForm.address.trim(),
            email: contactForm.email.trim(),
            notes: contactForm.notes.trim(),
            isFavorite: contactForm.isFavorite,
            updatedAt: nowStr,
          }
        }
        return c
      })

      // If this contact was linked to a customer or supplier, keep core contact info synced
      if (editingContact.linkedType === 'customer' && editingContact.linkedId) {
        updatedCustomers = updatedCustomers.map((cust) => {
          if (cust.id === editingContact.linkedId) {
            return {
              ...cust,
              name: contactForm.name.trim(),
              phone: contactForm.phone.trim(),
              altPhone: contactForm.altPhone.trim(),
              city: resolvedCity,
              address: contactForm.address.trim(),
              businessName: contactForm.businessName.trim() || cust.businessName,
              updatedAt: nowStr,
            }
          }
          return cust
        })
      } else if (editingContact.linkedType === 'supplier' && editingContact.linkedId) {
        updatedSuppliers = updatedSuppliers.map((sup) => {
          if (sup.id === editingContact.linkedId) {
            return {
              ...sup,
              contactPerson: contactForm.name.trim(),
              phone: contactForm.phone.trim(),
              altPhone: contactForm.altPhone.trim(),
              city: resolvedCity,
              address: contactForm.address.trim(),
              updatedAt: nowStr,
            }
          }
          return sup
        })
      }

      showToast(`Updated contact "${contactForm.name.trim()}"`)
    } else {
      // CREATE new contact
      const newId = `pb-contact-${Date.now()}`
      const newContact: PhonebookContactItem = {
        id: newId,
        name: contactForm.name.trim(),
        phone: contactForm.phone.trim(),
        altPhone: contactForm.altPhone.trim(),
        whatsapp: finalWhatsApp,
        category: contactForm.category || (categories[0]?.name || 'General & Personal'),
        businessName: contactForm.businessName.trim(),
        city: resolvedCity,
        address: contactForm.address.trim(),
        email: contactForm.email.trim(),
        notes: contactForm.notes.trim(),
        isFavorite: contactForm.isFavorite,
        linkedType: 'other',
        createdAt: nowStr,
        updatedAt: nowStr,
      }

      updatedContacts = [newContact, ...contacts]
      showToast(`Added "${contactForm.name.trim()}" to phonebook`)
    }

    onSaveDatabase({
      ...db,
      phonebookContacts: updatedContacts,
      phonebookCategories: categories,
      customers: updatedCustomers,
      suppliers: updatedSuppliers,
    })

    setIsContactModalOpen(false)
    setEditingContact(null)
  }

  // Confirm and execute contact deletion
  const handleConfirmDeleteContact = () => {
    if (!contactToDelete) return
    const updatedContacts = contacts.filter((c) => c.id !== contactToDelete.id)
    onSaveDatabase({
      ...db,
      phonebookContacts: updatedContacts,
      phonebookCategories: categories,
    })
    showToast(`Removed "${contactToDelete.name}" from phonebook`)
    setContactToDelete(null)
  }

  // Category Manager: open new category
  const handleOpenNewCategory = () => {
    setEditingCategory(null)
    setCategoryForm({
      name: '',
      color: 'emerald',
      description: '',
    })
  }

  // Category Manager: open edit category
  const handleOpenEditCategory = (cat: PhonebookCategoryItem) => {
    setEditingCategory(cat)
    setCategoryForm({
      name: cat.name,
      color: cat.color || 'emerald',
      description: cat.description || '',
    })
  }

  // Category Manager: save category (create or update)
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = categoryForm.name.trim()
    if (!trimmedName) {
      alert('Please enter a category name.')
      return
    }

    let updatedCats: PhonebookCategoryItem[] = []
    let updatedContacts = [...contacts]

    if (editingCategory) {
      const oldName = editingCategory.name
      updatedCats = categories.map((c) =>
        c.id === editingCategory.id
          ? {
              ...c,
              name: trimmedName,
              color: categoryForm.color,
              description: categoryForm.description.trim(),
            }
          : c
      )

      // If category name was changed, update all contacts that belonged to old category!
      if (oldName !== trimmedName) {
        updatedContacts = updatedContacts.map((c) =>
          c.category === oldName ? { ...c, category: trimmedName, updatedAt: new Date().toISOString().slice(0, 10) } : c
        )
      }

      showToast(`Updated category "${trimmedName}"`)
    } else {
      // Check duplicate
      const exists = categories.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())
      if (exists) {
        alert('A category with this name already exists.')
        return
      }

      const newCat: PhonebookCategoryItem = {
        id: `pbcat-${Date.now()}`,
        name: trimmedName,
        color: categoryForm.color,
        description: categoryForm.description.trim(),
        createdAt: new Date().toISOString().slice(0, 10),
      }
      updatedCats = [...categories, newCat]
      showToast(`Created new category "${trimmedName}"`)
    }

    onSaveDatabase({
      ...db,
      phonebookCategories: updatedCats,
      phonebookContacts: updatedContacts,
    })

    setEditingCategory(null)
    setCategoryForm({ name: '', color: 'emerald', description: '' })
  }

  // Category Manager: confirm and execute category deletion
  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return
    const remainingCats = categories.filter((c) => c.id !== categoryToDelete.id)
    const fallbackCategory = remainingCats.length > 0 ? remainingCats[0].name : 'General & Personal'

    // Reassign all contacts in the deleted category to the fallback category so no contact is orphaned
    const updatedContacts = contacts.map((c) =>
      c.category === categoryToDelete.name
        ? { ...c, category: fallbackCategory, updatedAt: new Date().toISOString().slice(0, 10) }
        : c
    )

    onSaveDatabase({
      ...db,
      phonebookCategories: remainingCats,
      phonebookContacts: updatedContacts,
    })

    showToast(`Deleted category "${categoryToDelete.name}". Reassigned contacts to "${fallbackCategory}".`)
    setCategoryToDelete(null)
    if (selectedCategory === categoryToDelete.name) {
      setSelectedCategory('All')
    }
  }

  // Helper to get styling for category badge
  const getCategoryBadgeClass = (categoryName: string) => {
    const found = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase())
    const colorId = found?.color || 'stone'
    const match = CATEGORY_COLORS.find((col) => col.id === colorId) || CATEGORY_COLORS[8]
    return `${match.bg} ${match.text} ${match.border}`
  }

  // Sync / Re-import all customers and suppliers that might not be in phonebook
  const handleSyncFromERP = () => {
    const seenPhones = new Set(contacts.map((c) => c.phone.replace(/[^0-9]/g, '')))
    const newItems: PhonebookContactItem[] = []
    const nowStr = new Date().toISOString().slice(0, 10)

    db.customers?.forEach((c) => {
      const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '')
      if (cleanPhone && !seenPhones.has(cleanPhone)) {
        seenPhones.add(cleanPhone)
        let cat = 'Retailers'
        if (c.type === 'Distributor') cat = 'Distributors'
        else if (c.type === 'Wholesaler') cat = 'Wholesalers'
        else if (c.type === 'Retailer') cat = 'Retailers'
        else if (c.type?.includes('Sales')) cat = 'Distributors'
        else cat = 'General & Personal'

        newItems.push({
          id: `pb-c-${c.id}-${Date.now()}`,
          name: c.name,
          phone: c.phone,
          altPhone: c.altPhone || '',
          whatsapp: c.phone,
          email: c.email || '',
          category: cat,
          businessName: c.businessName || '',
          city: c.city || 'Lahore',
          address: c.address || '',
          notes: c.notes || '',
          isFavorite: c.type === 'Distributor',
          linkedType: 'customer',
          linkedId: c.id,
          createdAt: nowStr,
          updatedAt: nowStr,
        })
      }
    })

    db.suppliers?.forEach((s) => {
      const cleanPhone = (s.phone || '').replace(/[^0-9]/g, '')
      if (cleanPhone && !seenPhones.has(cleanPhone)) {
        seenPhones.add(cleanPhone)
        newItems.push({
          id: `pb-s-${s.id}-${Date.now()}`,
          name: s.contactPerson ? `${s.contactPerson}` : s.name,
          phone: s.phone,
          altPhone: s.altPhone || '',
          whatsapp: s.phone,
          email: s.email || '',
          category: 'Suppliers',
          businessName: s.name,
          city: s.city || 'Lahore',
          address: s.address || '',
          notes: s.notes || `${s.category || 'Raw Material'} Supplier`,
          isFavorite: false,
          linkedType: 'supplier',
          linkedId: s.id,
          createdAt: nowStr,
          updatedAt: nowStr,
        })
      }
    })

    if (newItems.length > 0) {
      const merged = [...newItems, ...contacts]
      onSaveDatabase({
        ...db,
        phonebookContacts: merged,
        phonebookCategories: categories,
      })
      showToast(`Synced and added ${newItems.length} new contacts from Customers & Suppliers`)
    } else {
      showToast('Phonebook is already up to date with all Customers & Suppliers.')
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (contacts.length === 0) {
      alert('No contacts available to export.')
      return
    }

    const headers = [
      'Full Name',
      'Business / Company',
      'Category',
      'Primary Phone',
      'Alternate Phone',
      'WhatsApp Number',
      'Email',
      'City',
      'Address',
      'Starred / Favorite',
      'Notes',
      'Created Date',
      'Last Updated',
    ]

    const rows = filteredContacts.map((c) => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.businessName || '').replace(/"/g, '""')}"`,
      `"${(c.category || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.altPhone || '').replace(/"/g, '""')}"`,
      `"${(c.whatsapp || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.city || '').replace(/"/g, '""')}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.isFavorite ? 'Yes' : 'No',
      `"${(c.notes || '').replace(/"/g, '""')}"`,
      c.createdAt || '',
      c.updatedAt || '',
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `AL_FAROOQ_FOODS_PHONEBOOK_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showToast('Exported phonebook to CSV')
  }

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    let result = contacts.filter((c) => {
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.businessName && c.businessName.toLowerCase().includes(q)) ||
        c.phone.replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, '')) ||
        (c.altPhone && c.altPhone.replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, ''))) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))

      const matchCat = selectedCategory === 'All' || c.category.toLowerCase() === selectedCategory.toLowerCase()
      const matchCity = selectedCity === 'All' || (c.city && c.city.toLowerCase() === selectedCity.toLowerCase())
      const matchFav = !favoritesOnly || !!c.isFavorite

      return matchSearch && matchCat && matchCity && matchFav
    })

    // Sorting
    result.sort((a, b) => {
      // Starred items can optionally be pinned or sorted standard
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name)
      } else if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name)
      } else if (sortBy === 'category') {
        return (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name)
      } else if (sortBy === 'recent') {
        return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')
      }
      return 0
    })

    return result
  }, [contacts, searchQuery, selectedCategory, selectedCity, favoritesOnly, sortBy])

  // Aggregate category counts
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {}
    contacts.forEach((c) => {
      const cat = c.category || 'General & Personal'
      map[cat] = (map[cat] || 0) + 1
    })
    return map
  }, [contacts])

  // Unique cities list
  const availableCities = useMemo(() => {
    const citySet = new Set<string>()
    contacts.forEach((c) => {
      if (c.city && c.city.trim()) {
        citySet.add(c.city.trim())
      }
    })
    return Array.from(citySet).sort()
  }, [contacts])

  // Favorite contacts count
  const favoritesCount = useMemo(() => contacts.filter((c) => c.isFavorite).length, [contacts])

  return (
    <div className="page-stack space-y-4" id="phonebook-main-container">
      {/* Toast notification */}
      {toastMessage && (
        <div
          id="phonebook-toast-alert"
          className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2 animate-fade-in border border-gray-700"
        >
          <Sparkles className="w-4 h-4 text-[#7cb518]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-[var(--border)] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-[#f0f7e8] text-[#7cb518] border border-[#d3ebb2]">
              Factory Directory & Dialer
            </span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-500 font-medium">AL FAROOQ FOODS</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mt-1">Company Phone Book & Contacts</h1>
          <p className="text-xs text-gray-500 max-w-2xl mt-0.5">
            Centralized communications directory with 1-click WhatsApp messaging, direct calling, and full contact & category management.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="btn-add-new-contact"
            onClick={() => handleOpenNewContact()}
            className="button primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>

          <button
            type="button"
            id="btn-manage-categories"
            onClick={() => {
              handleOpenNewCategory()
              setIsCategoryManagerOpen(true)
            }}
            className="button secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#7cb518]" />
            <span>Manage Categories</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 font-bold text-gray-700">
              {categories.length}
            </span>
          </button>

          <button
            type="button"
            id="btn-export-phonebook-csv"
            onClick={handleExportCSV}
            title="Download CSV spreadsheet of all contacts"
            className="button secondary text-xs py-2 px-2.5 flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            id="btn-print-phonebook"
            onClick={() => window.print()}
            title="Print printable contact list"
            className="button secondary text-xs py-2 px-2.5 flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* KPI / Metric Chips Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-[var(--border)] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Total Contacts</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{contacts.length}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#f0f7e8] flex items-center justify-center text-[#7cb518]">
            <Phone className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[var(--border)] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Starred VIPs</div>
            <div className="text-xl font-bold text-amber-600 mt-0.5">{favoritesCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[var(--border)] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Categories</div>
            <div className="text-xl font-bold text-blue-600 mt-0.5">{categories.length}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <FolderPlus className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[var(--border)] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Cities Covered</div>
            <div className="text-xl font-bold text-teal-600 mt-0.5">{availableCities.length}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
            <MapPin className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Category Pills Row with Quick Management Trigger */}
      <div className="bg-white p-3 rounded-xl border border-[var(--border)] shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <div className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span>Filter by Category:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-sync-erp-contacts"
              onClick={handleSyncFromERP}
              className="text-[11px] text-gray-500 hover:text-gray-800 underline flex items-center gap-1"
              title="Sync any new customers or suppliers into phonebook directory"
            >
              Sync Customers/Suppliers
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              id="btn-quick-manage-cats"
              onClick={() => {
                handleOpenNewCategory()
                setIsCategoryManagerOpen(true)
              }}
              className="text-[11px] font-medium text-[#7cb518] hover:underline flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3" />
              Manage / Add Category
            </button>
          </div>
        </div>

        {/* Scrollable / wrap Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            id="cat-pill-all"
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              selectedCategory === 'All'
                ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            All Contacts ({contacts.length})
          </button>

          {categories.map((cat) => {
            const count = categoryCounts[cat.name] || 0
            const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase()
            const badgeStyle = getCategoryBadgeClass(cat.name)
            return (
              <button
                key={cat.id}
                type="button"
                id={`cat-pill-${cat.id}`}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'ring-2 ring-gray-900 bg-white font-bold text-gray-900 border-gray-900 shadow-xs'
                    : `${badgeStyle} hover:opacity-90`
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-gray-900 text-white' : 'bg-white/80 text-gray-800'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Search, Secondary Filters & View Switcher Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[var(--border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Box */}
        <div className="flex-1 max-w-md relative">
          <div className="search-box w-full">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              id="input-phonebook-search"
              placeholder="Search by contact name, company, phone number, city, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs w-full py-1.5 pl-8 pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* City Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-500 font-medium hidden lg:inline">City:</span>
            <select
              id="select-city-filter"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs bg-white cursor-pointer text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#7cb518]"
            >
              <option value="All">All Cities ({availableCities.length})</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-500 font-medium hidden lg:inline">Sort:</span>
            <div className="relative flex items-center">
              <select
                id="select-sort-filter"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs bg-white cursor-pointer text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#7cb518]"
              >
                <option value="name-asc">Name (A → Z)</option>
                <option value="name-desc">Name (Z → A)</option>
                <option value="category">Category</option>
                <option value="recent">Recently Updated</option>
              </select>
            </div>
          </div>

          {/* Starred Only Toggle */}
          <button
            type="button"
            id="btn-filter-favorites"
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              favoritesOnly
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
            title="Toggle starred contacts only"
          >
            <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-white text-white' : 'text-amber-500'}`} />
            <span>Starred ({favoritesCount})</span>
          </button>

          {/* Grid vs Table View Mode Switcher */}
          <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
            <button
              type="button"
              id="btn-view-grid"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'grid' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Grid Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="btn-view-table"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'table' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Dense Table List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Result Status Sub-bar */}
      <div className="flex items-center justify-between px-1 text-xs text-gray-500">
        <div>
          Showing <span className="font-semibold text-gray-800">{filteredContacts.length}</span> of{' '}
          <span className="font-semibold text-gray-800">{contacts.length}</span> contacts
          {selectedCategory !== 'All' && ` in "${selectedCategory}"`}
          {selectedCity !== 'All' && ` from ${selectedCity}`}
          {favoritesOnly && ' (Starred only)'}
        </div>

        {(searchQuery || selectedCategory !== 'All' || selectedCity !== 'All' || favoritesOnly) && (
          <button
            type="button"
            id="btn-reset-filters"
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('All')
              setSelectedCity('All')
              setFavoritesOnly(false)
            }}
            className="text-xs text-[#7cb518] hover:underline font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredContacts.length === 0 && (
        <div className="bg-white rounded-xl border border-[var(--border)] p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-800">No contacts found</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
            No contacts matched your search query or selected category filter. Try clearing your filters or create a new contact.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('All')
                setSelectedCity('All')
                setFavoritesOnly(false)
              }}
              className="button secondary text-xs py-1.5 px-3"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={() => handleOpenNewContact(selectedCategory !== 'All' ? selectedCategory : undefined)}
              className="button primary text-xs py-1.5 px-3"
            >
              + Create Contact
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: GRID CARDS VIEW */}
      {viewMode === 'grid' && filteredContacts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((item) => {
            const badgeClass = getCategoryBadgeClass(item.category)
            const initials = item.name
              .split(' ')
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'CP'

            return (
              <div
                key={item.id}
                id={`contact-card-${item.id}`}
                className="bg-white rounded-xl border border-[var(--border)] shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between p-4 relative group"
              >
                <div>
                  {/* Card Header: Avatar, Name, Category badge, Star, and Actions */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#f0f7e8] text-[#7cb518] font-bold text-xs flex items-center justify-center shrink-0 border border-[#d6ebb8]">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-gray-900 truncate" title={item.name}>
                            {item.name}
                          </h3>
                        </div>
                        {item.businessName && (
                          <div className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5" title={item.businessName}>
                            <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{item.businessName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Star Button */}
                      <button
                        type="button"
                        id={`btn-star-${item.id}`}
                        onClick={() => handleToggleFavorite(item.id)}
                        className="p-1 rounded-md text-gray-400 hover:text-amber-500 hover:bg-gray-100 transition-colors"
                        title={item.isFavorite ? 'Remove from Starred' : 'Star this contact'}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            item.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-400'
                          }`}
                        />
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        id={`btn-edit-${item.id}`}
                        onClick={() => handleOpenEditContact(item)}
                        className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit this contact"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        id={`btn-delete-${item.id}`}
                        onClick={() => setContactToDelete(item)}
                        className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Category Pill */}
                  <div className="mb-2.5">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${badgeClass}`}>
                      {item.category || 'General & Personal'}
                    </span>
                  </div>

                  {/* Contact Info: Phone, Alt, City, Address */}
                  <div className="space-y-1.5 my-3 text-xs text-gray-600 bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
                    {/* Primary Phone */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-gray-900">
                        <Phone className="w-3.5 h-3.5 text-[#7cb518] shrink-0" />
                        <span>{item.phone}</span>
                      </div>
                      <button
                        type="button"
                        id={`btn-copy-${item.id}`}
                        onClick={() => handleCopyPhone(item.phone, item.id)}
                        className="text-[10px] font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1 p-0.5"
                        title="Copy phone number"
                      >
                        {copiedPhoneId === item.id ? (
                          <span className="text-[#7cb518] flex items-center gap-0.5 font-bold">
                            <Check className="w-3 h-3" /> Copied
                          </span>
                        ) : (
                          <Copy className="w-3 h-3 text-gray-400" />
                        )}
                      </button>
                    </div>

                    {/* Alternate Phone if present */}
                    {item.altPhone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono">
                        <span className="text-[10px] text-gray-400">Alt:</span>
                        <span>{item.altPhone}</span>
                      </div>
                    )}

                    {/* Location */}
                    {(item.city || item.address) && (
                      <div className="flex items-start gap-1.5 text-[11px] text-gray-600 pt-1 border-t border-gray-200/60">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">
                          {item.city && <strong className="text-gray-700 font-semibold">{item.city}</strong>}
                          {item.city && item.address && ' · '}
                          {item.address}
                        </span>
                      </div>
                    )}

                    {/* Notes if present */}
                    {item.notes && (
                      <div className="text-[11px] text-gray-500 italic line-clamp-1 pt-0.5">
                        &ldquo;{item.notes}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons: Direct Call and WhatsApp */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <a
                    href={`tel:${item.phone.replace(/[^0-9+]/g, '')}`}
                    id={`btn-call-${item.id}`}
                    className="button secondary flex-1 text-xs py-1.5 h-auto text-center flex items-center justify-center gap-1.5 font-semibold text-gray-700 hover:text-gray-900"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#7cb518]" /> Call
                  </a>

                  <a
                    href={getWhatsAppLink(item.whatsapp || item.phone, item.name)}
                    target="_blank"
                    rel="noreferrer"
                    id={`btn-whatsapp-${item.id}`}
                    className="button primary flex-1 text-xs py-1.5 h-auto text-center flex items-center justify-center gap-1.5 bg-[#25D366] text-white border-0 shadow-none hover:bg-[#1EBE5D] font-semibold"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-white" /> WhatsApp
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* VIEW 2: DENSE TABLE LIST VIEW */}
      {viewMode === 'table' && filteredContacts.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse" id="table-phonebook-list">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 w-8 text-center">★</th>
                  <th className="py-2.5 px-3">Contact Name</th>
                  <th className="py-2.5 px-3">Business / Company</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Primary Phone</th>
                  <th className="py-2.5 px-3">City / Area</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContacts.map((item) => {
                  const badgeClass = getCategoryBadgeClass(item.category)
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Favorite Toggle */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(item.id)}
                          className="text-gray-300 hover:text-amber-500"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              item.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Name */}
                      <td className="py-2.5 px-3 font-semibold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <span>{item.name}</span>
                          {item.linkedType === 'customer' && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-blue-50 text-blue-600 font-mono">
                              Customer
                            </span>
                          )}
                          {item.linkedType === 'supplier' && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-orange-50 text-orange-600 font-mono">
                              Supplier
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Business */}
                      <td className="py-2.5 px-3 text-gray-600">{item.businessName || '—'}</td>

                      {/* Category Badge */}
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeClass}`}>
                          {item.category || 'General'}
                        </span>
                      </td>

                      {/* Phone with copy */}
                      <td className="py-2.5 px-3 font-mono font-medium text-gray-800">
                        <div className="flex items-center gap-1.5">
                          <span>{item.phone}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(item.phone, item.id)}
                            className="text-gray-400 hover:text-gray-700"
                            title="Copy number"
                          >
                            {copiedPhoneId === item.id ? (
                              <Check className="w-3 h-3 text-[#7cb518]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        {item.altPhone && (
                          <div className="text-[10px] text-gray-400 font-normal">Alt: {item.altPhone}</div>
                        )}
                      </td>

                      {/* City & Address */}
                      <td className="py-2.5 px-3 text-gray-600">
                        <div>{item.city || '—'}</div>
                        {item.address && <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{item.address}</div>}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`tel:${item.phone.replace(/[^0-9+]/g, '')}`}
                            className="p-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                            title="Direct Call"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#7cb518]" />
                          </a>

                          <a
                            href={getWhatsAppLink(item.whatsapp || item.phone, item.name)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-md bg-[#25D366] text-white hover:opacity-90"
                            title="WhatsApp Chat"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-white" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleOpenEditContact(item)}
                            className="p-1 rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                            title="Edit Contact"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setContactToDelete(item)}
                            className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600"
                            title="Delete Contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT CONTACT MODAL */}
      {/* ========================================================================= */}
      {isContactModalOpen && (
        <div
          id="modal-contact-form"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#f0f7e8] text-[#7cb518] flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingContact ? 'Update Contact Information' : 'Add New Person Contact'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {editingContact
                      ? `Editing details for ${editingContact.name}`
                      : 'Create a new business or personal contact in company directory'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-contact-modal"
                onClick={() => setIsContactModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveContact} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Name & Business Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Contact Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-contact-name"
                    required
                    placeholder="e.g. Haji Muhammad Farooq"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#7cb518] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Business / Shop / Company
                  </label>
                  <input
                    id="input-contact-business"
                    placeholder="e.g. Farooq Trading Corporation"
                    value={contactForm.businessName}
                    onChange={(e) => setContactForm({ ...contactForm, businessName: e.target.value })}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#7cb518] focus:outline-none"
                  />
                </div>
              </div>

              {/* Category Selection + Quick Category Add */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Category Group <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenNewCategory()
                      setIsCategoryManagerOpen(true)
                    }}
                    className="text-[11px] text-[#7cb518] hover:underline font-semibold flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> New Category
                  </button>
                </div>
                <select
                  id="select-contact-category"
                  required
                  value={contactForm.category}
                  onChange={(e) => setContactForm({ ...contactForm, category: e.target.value })}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-[#7cb518] focus:outline-none cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.description ? `— ${c.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Primary Phone & Alternate Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Primary Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-contact-phone"
                      required
                      placeholder="e.g. 0300-1234567"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-[#7cb518] focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">Used for direct 1-click calling.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Alternate Phone / Mobile
                  </label>
                  <input
                    id="input-contact-alt-phone"
                    placeholder="e.g. 0321-7654321 / 042-3512345"
                    value={contactForm.altPhone}
                    onChange={(e) => setContactForm({ ...contactForm, altPhone: e.target.value })}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-[#7cb518] focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Office landline or secondary sim.</p>
                </div>
              </div>

              {/* WhatsApp Configuration */}
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                    WhatsApp Number
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-emerald-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contactForm.whatsappSameAsPhone}
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          whatsappSameAsPhone: e.target.checked,
                          whatsapp: e.target.checked ? contactForm.phone : contactForm.whatsapp,
                        })
                      }
                      className="rounded text-[#7cb518] focus:ring-0 cursor-pointer"
                    />
                    <span>Same as primary phone</span>
                  </label>
                </div>

                {!contactForm.whatsappSameAsPhone && (
                  <div>
                    <input
                      id="input-contact-whatsapp"
                      placeholder="Custom WhatsApp Number e.g. 0301-9876543"
                      value={contactForm.whatsapp}
                      onChange={(e) => setContactForm({ ...contactForm, whatsapp: e.target.value })}
                      className="w-full border border-emerald-200 bg-white rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-1 focus:ring-[#7cb518] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* City & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">City / Region</label>
                  <select
                    id="select-contact-city"
                    value={contactForm.city}
                    onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-[#7cb518] focus:outline-none cursor-pointer"
                  >
                    {COMMON_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="Other">Other (Type custom city)...</option>
                  </select>

                  {contactForm.city === 'Other' && (
                    <input
                      placeholder="Type city name..."
                      value={contactForm.customCity}
                      onChange={(e) => setContactForm({ ...contactForm, customCity: e.target.value })}
                      className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs mt-1.5 focus:ring-1 focus:ring-[#7cb518] focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    id="input-contact-email"
                    type="email"
                    placeholder="e.g. farooq@gmail.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#7cb518] focus:outline-none"
                  />
                </div>
              </div>

              {/* Full Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Shop / Factory Address / Area
                </label>
                <input
                  id="input-contact-address"
                  placeholder="e.g. Shop #12, Wholesale Grain Market, Badami Bagh"
                  value={contactForm.address}
                  onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#7cb518] focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes & Special Instructions
                </label>
                <textarea
                  id="textarea-contact-notes"
                  rows={2}
                  placeholder="e.g. Key distributor for 500ml water bottles. Best time to call is 11 AM - 3 PM."
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#7cb518] focus:outline-none"
                />
              </div>

              {/* Starred / Favorite Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-800 select-none">
                  <input
                    type="checkbox"
                    id="checkbox-contact-favorite"
                    checked={contactForm.isFavorite}
                    onChange={(e) => setContactForm({ ...contactForm, isFavorite: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-semibold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    Star this contact as VIP / High Priority
                  </span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  id="btn-cancel-contact-form"
                  onClick={() => setIsContactModalOpen(false)}
                  className="button secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-contact-form"
                  className="button primary text-xs py-2 px-5 font-semibold"
                >
                  {editingContact ? 'Save Changes' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: FULL CATEGORY MANAGER (CREATE, UPDATE, DELETE CATEGORIES) */}
      {/* ========================================================================= */}
      {isCategoryManagerOpen && (
        <div
          id="modal-category-manager"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Manage Contact Categories</h3>
                  <p className="text-xs text-gray-500">
                    Create, update, rename, or color-code directory categories
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-category-manager"
                onClick={() => {
                  setIsCategoryManagerOpen(false)
                  setEditingCategory(null)
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Category Form: Create or Edit */}
              <div className="bg-gray-50/90 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    {editingCategory ? (
                      <>
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit Category: &quot;{editingCategory.name}&quot;</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-[#7cb518]" />
                        <span>Create New Category</span>
                      </>
                    )}
                  </h4>

                  {editingCategory && (
                    <button
                      type="button"
                      onClick={handleOpenNewCategory}
                      className="text-[11px] text-gray-500 hover:text-gray-800 underline"
                    >
                      Cancel Edit / Switch to New
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveCategory} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Category Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="input-category-name"
                        required
                        placeholder="e.g. Transporters & Logistics"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-[#7cb518] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Color Theme / Badge
                      </label>
                      <select
                        id="select-category-color"
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                        className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-[#7cb518] focus:outline-none cursor-pointer"
                      >
                        {CATEGORY_COLORS.map((col) => (
                          <option key={col.id} value={col.id}>
                            {col.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Description / Roles Included
                    </label>
                    <input
                      id="input-category-description"
                      placeholder="e.g. Goods transport addas, Mazdas, truck dispatchers"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-xs bg-white focus:ring-1 focus:ring-[#7cb518] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      id="btn-save-category-submit"
                      className="button primary text-xs py-1.5 px-4 font-semibold"
                    >
                      {editingCategory ? 'Update Category' : '+ Add Category'}
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Existing Categories */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Existing Directory Categories ({categories.length})</span>
                  <span className="text-[11px] font-normal text-gray-400">
                    Contacts automatically inherit renamed categories
                  </span>
                </h4>

                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                  {categories.map((cat) => {
                    const count = categoryCounts[cat.name] || 0
                    const badgeStyle = getCategoryBadgeClass(cat.name)
                    const isBeingEdited = editingCategory?.id === cat.id

                    return (
                      <div
                        key={cat.id}
                        className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                          isBeingEdited ? 'bg-blue-50/50' : 'hover:bg-gray-50/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md border shrink-0 ${badgeStyle}`}>
                            {cat.name}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs text-gray-600 truncate">{cat.description || 'No description'}</div>
                            <div className="text-[10px] text-gray-400">
                              {count} {count === 1 ? 'contact' : 'contacts'} assigned
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            id={`btn-edit-cat-${cat.id}`}
                            onClick={() => handleOpenEditCategory(cat)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Rename or update category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            id={`btn-del-cat-${cat.id}`}
                            onClick={() => setCategoryToDelete(cat)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryManagerOpen(false)
                  setEditingCategory(null)
                }}
                className="button secondary text-xs py-1.5 px-4"
              >
                Close Category Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE CONTACT CONFIRMATION */}
      {/* ========================================================================= */}
      {contactToDelete && (
        <div
          id="modal-delete-contact"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-sm overflow-hidden p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Delete Contact?</h3>
            <p className="text-xs text-gray-500 mt-1">
              Are you sure you want to remove <strong className="text-gray-800">{contactToDelete.name}</strong> (
              <span className="font-mono">{contactToDelete.phone}</span>) from the company phonebook?
            </p>

            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 my-3 text-xs text-gray-600 space-y-1">
              <div>
                <strong>Category:</strong> {contactToDelete.category}
              </div>
              {contactToDelete.businessName && (
                <div>
                  <strong>Company:</strong> {contactToDelete.businessName}
                </div>
              )}
              {contactToDelete.city && (
                <div>
                  <strong>City:</strong> {contactToDelete.city}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                id="btn-cancel-delete-contact"
                onClick={() => setContactToDelete(null)}
                className="button secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-contact"
                onClick={handleConfirmDeleteContact}
                className="button primary text-xs py-2 px-4 bg-red-600 hover:bg-red-700 text-white border-0 font-semibold"
              >
                Yes, Delete Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE CATEGORY CONFIRMATION */}
      {/* ========================================================================= */}
      {categoryToDelete && (
        <div
          id="modal-delete-category"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-sm overflow-hidden p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Delete Category?</h3>
            <p className="text-xs text-gray-500 mt-1">
              Are you sure you want to delete category <strong className="text-gray-800">&quot;{categoryToDelete.name}&quot;</strong>?
            </p>

            <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 my-3 text-xs text-amber-900">
              <p>
                <strong>Safe Reassignment:</strong> Any contacts currently in this category (
                {categoryCounts[categoryToDelete.name] || 0} contacts) will automatically be moved to another category so no
                numbers are lost.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                id="btn-cancel-delete-cat"
                onClick={() => setCategoryToDelete(null)}
                className="button secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-cat"
                onClick={handleConfirmDeleteCategory}
                className="button primary text-xs py-2 px-4 bg-red-600 hover:bg-red-700 text-white border-0 font-semibold"
              >
                Yes, Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
