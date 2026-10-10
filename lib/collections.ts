import type { AppDatabase } from './db'

export function latestDistributorCollection(db: AppDatabase) {
  return db.customers.filter(customer => customer.type === 'Distributor')
    .flatMap(customer => (customer.paymentRecords || []).map(payment => ({ customer, payment })))
    .sort((a, b) => b.payment.date.localeCompare(a.payment.date) || b.payment.createdAt.localeCompare(a.payment.createdAt))[0]
}
