'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Building2, Check, Download, X } from 'lucide-react'
import { defaultCompanyProfile, formatDate, formatPKR, type AppDatabase } from '@/lib/db'
import { latestDistributorCollection } from '@/lib/collections'
import { generateCustomerPaymentReceiptPDF } from '@/lib/pdf-export'

export default function CollectionReceipt({ db, onClose, onViewCustomer }: { db: AppDatabase; onClose: () => void; onViewCustomer: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState('')
  const collection = latestDistributorCollection(db)
  const company = { ...defaultCompanyProfile, ...db.companyProfile }
  useEffect(() => { dialog.current?.showModal() }, [])
  if (!collection) return null
  const { customer, payment } = collection
  const account = db.accounts.find(account => account.id === payment.paymentAccount)

  return <dialog ref={dialog} className="collection-receipt" aria-labelledby="collection-receipt-title" onCancel={onClose} onClick={event => {
    if (event.target !== dialog.current) return
    const box = dialog.current.getBoundingClientRect()
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose()
  }}>
    <header className="collection-receipt-header"><h2 id="collection-receipt-title">Payment Record</h2><button type="button" aria-label="Close receipt" onClick={onClose}><X size={17} /></button></header>
    <div className="collection-receipt-parties">
      <div><span>Received by</span><strong><Building2 size={16} />{company.name}</strong></div>
      <div><span>Collection type</span><strong>Distributor payment</strong></div>
    </div>
    <div className="collection-receipt-badges"><span><Check size={12} /> Received</span><span>{payment.paymentMethod}</span></div>
    <section className="collection-receipt-records" aria-label="Receipt details">
      <div><span>Received from<strong>{customer.name}</strong><small>{customer.businessName}</small></span><span className="collection-party-initials">{customer.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('')}</span></div>
      <div><span>Receipt number<strong>{payment.receiptNumber}</strong></span><span>{formatDate(payment.date)}</span></div>
      <div><span>Payment account<strong>{account?.name || payment.paymentAccount || 'Not specified'}</strong></span><span>{payment.paymentMethod}</span></div>
      {payment.transactionRef && <div><span>Transaction reference<strong>{payment.transactionRef}</strong></span><Check size={15} /></div>}
      <footer><span>Collection total</span><strong>{formatPKR(payment.amount)}</strong></footer>
    </section>
    <div className="collection-receipt-summary"><span>Payment received</span><strong>{formatPKR(payment.amount)}</strong></div>
    <div className="collection-receipt-summary"><span>Current customer balance</span><strong>{formatPKR(customer.currentBalance)}</strong></div>
    <p className="collection-balance-note">Account balance across all transactions.</p>
    <div className="collection-receipt-total"><span>Amount collected</span><strong>{formatPKR(payment.amount)}</strong></div>
    {payment.notes && <p className="collection-receipt-note">{payment.notes}</p>}
    {error && <p className="collection-receipt-error" role="alert">{error}</p>}
    <footer className="collection-receipt-actions"><button type="button" onClick={onViewCustomer}>Customer account<ArrowUpRight size={14} /></button><button type="button" onClick={() => { try { generateCustomerPaymentReceiptPDF(customer, payment) } catch { setError('Could not export the receipt. Please try again.') } }}><Download size={14} /> Export receipt</button></footer>
  </dialog>
}
