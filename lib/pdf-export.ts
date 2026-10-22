// Client-side PDF & Excel/CSV Export Engine for AL FAROOQ FOODS
import jsPDF from 'jspdf'
import { getOnlineSnapshot, defaultCompanyProfile } from '@/lib/db'

function billingProfile() { return { ...defaultCompanyProfile, ...getOnlineSnapshot().companyProfile } }
function billingContact() { const p = billingProfile(); return [p.phone1, p.phone2, p.email].filter(Boolean).join(' | ') }
import autoTable from 'jspdf-autotable'
import {
  formatPKR,
  formatDate,
  type InvoiceItem,
  type CustomerItem,
  type SupplierItem,
  type LedgerEntry,
  type ProductItem,
  type RawMaterialItem,
  type EmployeeItem,
  type SalaryPaymentRecord,
  type PurchaseItem,
} from './db'

export function generateInvoicePDF(invoice: InvoiceItem, customer?: CustomerItem) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Theme Colors
  const primaryColor: [number, number, number] = [124, 181, 24] // #7cb518
  const darkColor: [number, number, number] = [43, 43, 43] // #2b2b2b
  const mutedColor: [number, number, number] = [109, 109, 104] // #6d6d68

  // Header Banner
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 32, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(billingProfile().name, 14, 15)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(billingProfile().tagline, 14, 21)
  doc.text(billingContact(), 14, 26)

  // Invoice Title Badge
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(148, 7, 48, 18, 3, 3, 'F')
  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('TAX INVOICE', 172, 14, { align: 'center' })
  doc.setFontSize(9)
  doc.setTextColor(...primaryColor)
  doc.text(invoice.invoiceNumber, 172, 20, { align: 'center' })

  // Metadata Section
  doc.setTextColor(...darkColor)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE TO:', 14, 42)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(invoice.customerName, 14, 48)
  if (customer?.businessName) doc.text(customer.businessName, 14, 53)
  doc.text(`Phone: ${invoice.phone || customer?.phone || '—'}`, 14, 58)
  doc.text(`Address: ${invoice.address || customer?.address || '—'}`, 14, 63)

  // Invoice Details right side
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE DETAILS:', 130, 42)
  doc.setFont('helvetica', 'normal')
  doc.text(`Invoice Date: ${formatDate(invoice.date)}`, 130, 48)
  doc.text(`Customer Type: ${invoice.customerType}`, 130, 53)
  doc.text(`Payment Status: ${invoice.status.toUpperCase()}`, 130, 58)
  doc.text(`Payment Mode: ${invoice.paymentMethod}`, 130, 63)

  // Items Table
  const tableRows = invoice.items.map((item, index) => [
    (index + 1).toString(),
    item.name,
    `${item.quantity} ${item.unit}`,
    formatPKR(item.unitPrice),
    formatPKR(item.total),
  ])

  autoTable(doc, {
    startY: 70,
    head: [['#', 'Product Description', 'Qty', 'Unit Price', 'Total']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [124, 181, 24],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8.5,
      textColor: [43, 43, 43],
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    },
  })

  // Summary box below table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || 140

  const summaryX = 120
  doc.setFontSize(9)
  doc.setTextColor(...mutedColor)
  doc.text('Subtotal:', summaryX, finalY + 8)
  doc.setTextColor(...darkColor)
  doc.text(formatPKR(invoice.subtotal), 196, finalY + 8, { align: 'right' })

  if (invoice.discount > 0) {
    doc.setTextColor(...mutedColor)
    doc.text('Discount:', summaryX, finalY + 14)
    doc.setTextColor(184, 72, 30) // rust
    doc.text(`- ${formatPKR(invoice.discount)}`, 196, finalY + 14, { align: 'right' })
  }

  // Grand Total Box
  doc.setFillColor(241, 241, 238)
  doc.roundedRect(summaryX - 5, finalY + 18, 85, 10, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...primaryColor)
  doc.text('Grand Total:', summaryX, finalY + 25)
  doc.text(formatPKR(invoice.grandTotal), 196, finalY + 25, { align: 'right' })

  // Amount Paid & Balance Due
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...mutedColor)
  doc.text('Amount Received:', summaryX, finalY + 34)
  doc.setTextColor(114, 128, 25) // success green
  doc.text(formatPKR(invoice.amountPaid), 196, finalY + 34, { align: 'right' })

  doc.setTextColor(...mutedColor)
  doc.text('Balance Due:', summaryX, finalY + 40)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(invoice.balanceDue > 0 ? 184 : 114, invoice.balanceDue > 0 ? 72 : 128, invoice.balanceDue > 0 ? 30 : 25)
  doc.text(formatPKR(invoice.balanceDue), 196, finalY + 40, { align: 'right' })

  // Notes & Signatures
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...mutedColor)
  doc.setFontSize(8)
  if (invoice.notes) {
    doc.text(`Special Notes: ${invoice.notes}`, 14, finalY + 12)
  }
  doc.text('Goods once sold will not be returned unless manufacturing defect is reported within 48 hours.', 14, finalY + 22)
  doc.text('Thank you for your business with AL FAROOQ FOODS!', 14, finalY + 28)

  // Signature Lines
  doc.setDrawColor(200, 200, 200)
  doc.line(14, finalY + 55, 65, finalY + 55)
  doc.line(140, finalY + 55, 196, finalY + 55)

  doc.setFontSize(8)
  doc.text('Customer Signature & Stamp', 14, finalY + 60)
  doc.text('For AL FAROOQ FOODS (Auth. Sign)', 140, finalY + 60)

  // Save PDF
  doc.save(`${invoice.invoiceNumber}_AL_FAROOQ_FOODS.pdf`)
}

export function generateLedgerPDF(party: CustomerItem | SupplierItem, ledgers: LedgerEntry[], isCustomer = true) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  doc.setFillColor(124, 181, 24)
  doc.rect(0, 0, 210, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(billingProfile().name, 14, 13)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`${isCustomer ? 'Customer / Distributor' : 'Supplier'} Account Statement & Ledger`, 14, 20)

  doc.setTextColor(43, 43, 43)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`Account: ${party.name}`, 14, 38)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  if ('businessName' in party && party.businessName) doc.text(`Business: ${party.businessName}`, 14, 44)
  doc.text(`Phone: ${party.phone || '—'} | City: ${party.city || '—'}`, 14, 49)
  doc.text(`Current Outstanding Balance: ${formatPKR(party.currentBalance)}`, 14, 54)

  const rows = ledgers.map((l, i) => [
    (i + 1).toString(),
    formatDate(l.date),
    l.referenceType,
    l.description,
    l.debit > 0 ? formatPKR(l.debit) : '—',
    l.credit > 0 ? formatPKR(l.credit) : '—',
    formatPKR(l.balance),
  ])

  autoTable(doc, {
    startY: 60,
    head: [['#', 'Date', 'Type', 'Description', isCustomer ? 'Debit (Sale)' : 'Debit (Paid)', isCustomer ? 'Credit (Paid)' : 'Credit (Bill)', 'Balance']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [124, 181, 24], textColor: [255, 255, 255] },
    styles: { fontSize: 8, cellPadding: 2.5 },
  })

  doc.save(`Ledger_${party.name.replace(/\s+/g, '_')}.pdf`)
}

export function generateStockReportPDF(products: ProductItem[], rawMaterials: RawMaterialItem[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  doc.setFillColor(124, 181, 24)
  doc.rect(0, 0, 210, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('AL FAROOQ FOODS - INVENTORY & STOCK REPORT', 14, 14)
  doc.setFontSize(9)
  doc.text(`Generated on: ${formatDate(new Date().toISOString())}`, 14, 20)

  doc.setTextColor(43, 43, 43)
  doc.setFontSize(12)
  doc.text('Finished Goods Stock', 14, 34)

  const prodRows = products.map((p, i) => [
    (i + 1).toString(),
    p.name,
    p.category,
    `${p.quantity} ${p.unit}`,
    formatPKR(p.costPrice),
    formatPKR(p.wholesalePrice),
    formatPKR(p.quantity * p.costPrice),
    p.status,
  ])

  autoTable(doc, {
    startY: 38,
    head: [['#', 'Product', 'Category', 'Quantity', 'Cost Rate', 'Wholesale Rate', 'Stock Value', 'Status']],
    body: prodRows,
    theme: 'grid',
    headStyles: { fillColor: [124, 181, 24], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextY = (doc as any).lastAutoTable?.finalY || 120

  doc.setFontSize(12)
  doc.text('Raw Materials Stock', 14, nextY + 10)

  const rawRows = rawMaterials.map((r, i) => [
    (i + 1).toString(),
    r.name,
    r.category,
    `${r.quantity} ${r.unit}`,
    formatPKR(r.unitCost),
    formatPKR(r.quantity * r.unitCost),
    r.supplierName || '—',
    r.status,
  ])

  autoTable(doc, {
    startY: nextY + 14,
    head: [['#', 'Raw Material', 'Category', 'Quantity', 'Unit Cost', 'Stock Value', 'Supplier', 'Status']],
    body: rawRows,
    theme: 'grid',
    headStyles: { fillColor: [184, 72, 30], fontSize: 8 }, // rust
    styles: { fontSize: 7.5, cellPadding: 2 },
  })

  doc.save(`Stock_Report_AL_FAROOQ_FOODS_${new Date().toISOString().slice(0, 10)}.pdf`)
}

export function generateSalarySlipPDF(employee: EmployeeItem, payment: SalaryPaymentRecord) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Theme Colors
  const primaryColor: [number, number, number] = [124, 181, 24] // #7cb518
  const darkColor: [number, number, number] = [43, 43, 43] // #2b2b2b

  // Header Banner
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 32, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(billingProfile().name, 14, 15)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Factory & Head Office: Industrial Area, Sheikhupura Road, Lahore', 14, 21)
  doc.text('Phone: 0344 9549051, 0346 9829900 | Official Payroll Voucher', 14, 26)

  // Voucher Title Badge
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(142, 7, 54, 18, 3, 3, 'F')
  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('SALARY RECEIPT', 169, 14, { align: 'center' })
  doc.setFontSize(8.5)
  doc.setTextColor(...primaryColor)
  doc.text(payment.receiptNumber || 'SAL-VOUCHER', 169, 20, { align: 'center' })

  // Employee Information
  doc.setTextColor(...darkColor)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('EMPLOYEE DETAILS:', 14, 42)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Employee Name: ${employee.name}`, 14, 48)
  doc.text(`Designation / Role: ${employee.role}`, 14, 53)
  doc.text(`Department: ${employee.department || 'Production & Plant'}`, 14, 58)
  doc.text(`Phone: ${employee.phone} | CNIC: ${employee.cnic || '—'}`, 14, 63)
  doc.text(`Duty Timing: ${employee.dutyTiming || 'General Shift'}`, 14, 68)

  // Payment Metadata
  doc.setFont('helvetica', 'bold')
  doc.text('DISBURSEMENT DETAILS:', 130, 42)
  doc.setFont('helvetica', 'normal')
  doc.text(`Salary Month: ${payment.month}`, 130, 48)
  doc.text(`Disbursement Date: ${formatDate(payment.paymentDate)}`, 130, 53)
  doc.text(`Payment Mode: ${payment.paymentMethod}`, 130, 58)
  doc.text(`Disbursed From: ${payment.paymentAccount === 'cash-in-hand' ? 'Cash in Hand (Factory Register)' : payment.paymentAccount === 'meezan-bank' ? 'Meezan Bank Ltd' : 'Habib Bank Ltd (HBL)'}`, 130, 63)
  doc.text(`Payment Status: ${payment.status.toUpperCase()}`, 130, 68)

  // Salary Breakdown Table
  const tableRows = [
    ['1', 'Base Basic Salary', 'Fixed monthly contracted remuneration', formatPKR(payment.baseSalary)],
    ['2', 'Total Allowances & Benefits', payment.allowancesBreakdown?.map(a => `${a.name}: ${formatPKR(a.amount)}`).join(', ') || 'Food, conveyance, medical allowances', `+ ${formatPKR(payment.allowances)}`],
  ]

  if (payment.overtimeBonus && payment.overtimeBonus > 0) {
    tableRows.push(['3', 'Overtime & Performance Bonus', 'Additional overtime hours & plant targets', `+ ${formatPKR(payment.overtimeBonus)}`])
  }

  if (payment.loanDeduction && payment.loanDeduction > 0) {
    tableRows.push([(tableRows.length + 1).toString(), 'Loan / Advance Deductions', 'Monthly salary advance settlement', `- ${formatPKR(payment.loanDeduction)}`])
  }

  if (payment.absentDeduction && payment.absentDeduction > 0) {
    tableRows.push([(tableRows.length + 1).toString(), 'Absent / Unpaid Leave Deduction', 'Deduction for unapproved absence', `- ${formatPKR(payment.absentDeduction)}`])
  }

  autoTable(doc, {
    startY: 76,
    head: [['#', 'Compensation Component', 'Description / Details', 'Amount (PKR)']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [124, 181, 24],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8.5,
      textColor: [43, 43, 43],
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || 140

  // Net Paid Summary Box
  doc.setFillColor(245, 248, 240)
  doc.setDrawColor(124, 181, 24)
  doc.roundedRect(120, finalY + 6, 76, 26, 2, 2, 'FD')

  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('NET AMOUNT DISBURSED:', 124, finalY + 14)

  doc.setTextColor(124, 181, 24)
  doc.setFontSize(15)
  doc.text(formatPKR(payment.amountPaid), 124, finalY + 24)

  // Remaining Loan Status Note
  if (employee.totalLoanBalance > 0) {
    doc.setTextColor(184, 72, 30)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(`Remaining Loan / Advance Balance: ${formatPKR(employee.totalLoanBalance)}`, 14, finalY + 12)
  }

  // Notes
  if (payment.notes) {
    doc.setTextColor(...darkColor)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(`Voucher Notes: ${payment.notes}`, 14, finalY + 20)
  }

  // Signatures
  doc.setDrawColor(180, 180, 180)
  doc.line(20, finalY + 55, 75, finalY + 55)
  doc.line(135, finalY + 55, 190, finalY + 55)

  doc.setTextColor(...darkColor)
  doc.setFontSize(8)
  doc.text('Employee Signature & Date', 47, finalY + 60, { align: 'center' })
  doc.text('Authorized Signatory (AL FAROOQ FOODS)', 162, finalY + 60, { align: 'center' })

  // Footer
  doc.setFontSize(7.5)
  doc.setTextColor(130, 130, 130)
  doc.text('This is a computer-generated payroll voucher created offline via AL FAROOQ FOODS ERP System.', 105, 285, { align: 'center' })

  doc.save(`Salary_Receipt_${employee.name.replace(/\s+/g, '_')}_${payment.month.replace(/\s+/g, '_')}.pdf`)
}

// Generate Customer Payment Receipt PDF
export function generateCustomerPaymentReceiptPDF(
  customer: CustomerItem,
  payment: {
    receiptNumber: string
    date: string
    amount: number
    paymentMethod: string
    paymentAccount?: string
    transactionRef?: string
    notes?: string
  }
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
  const primaryColor: [number, number, number] = [124, 181, 24]
  const darkColor: [number, number, number] = [43, 43, 43]
  const mutedColor: [number, number, number] = [109, 109, 104]

  // Header Banner
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 148, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(billingProfile().name, 10, 11)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Official Payment Receipt Voucher', 10, 17)

  doc.setFillColor(255, 255, 255)
  doc.roundedRect(98, 5, 42, 14, 2, 2, 'F')
  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('RECEIPT #', 119, 10, { align: 'center' })
  doc.setFontSize(8.5)
  doc.setTextColor(...primaryColor)
  doc.text(payment.receiptNumber, 119, 15, { align: 'center' })

  // Details
  doc.setTextColor(...darkColor)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('RECEIVED FROM:', 10, 32)
  doc.setFont('helvetica', 'normal')
  doc.text(customer.name, 10, 37)
  if (customer.businessName) doc.text(customer.businessName, 10, 42)
  doc.text(`Phone: ${customer.phone || '—'} | Type: ${customer.type}`, 10, 47)
  if (customer.address) doc.text(`Address: ${customer.address}`, 10, 52)

  doc.setFont('helvetica', 'bold')
  doc.text('PAYMENT DETAILS:', 85, 32)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${formatDate(payment.date)}`, 85, 37)
  doc.text(`Method: ${payment.paymentMethod}`, 85, 42)
  if (payment.transactionRef) doc.text(`Ref: ${payment.transactionRef}`, 85, 47)

  // Payment Box
  doc.setFillColor(245, 248, 240)
  doc.setDrawColor(124, 181, 24)
  doc.roundedRect(10, 60, 128, 22, 2, 2, 'FD')

  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('AMOUNT RECEIVED (PKR):', 16, 68)

  doc.setTextColor(124, 181, 24)
  doc.setFontSize(16)
  doc.text(formatPKR(payment.amount), 16, 77)

  doc.setTextColor(...mutedColor)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Current Outstanding Balance: ${formatPKR(customer.currentBalance)}`, 75, 76)

  if (payment.notes) {
    doc.setTextColor(...darkColor)
    doc.setFontSize(8)
    doc.text(`Notes: ${payment.notes}`, 10, 89)
  }

  // Signatures
  doc.setDrawColor(190, 190, 190)
  doc.line(15, 115, 55, 115)
  doc.line(90, 115, 135, 115)

  doc.setFontSize(7.5)
  doc.setTextColor(...darkColor)
  doc.text('Customer Signature', 35, 120, { align: 'center' })
  doc.text('AL FAROOQ FOODS Cashier', 112, 120, { align: 'center' })

  doc.save(`Receipt_${payment.receiptNumber}_${customer.name.replace(/\s+/g, '_')}.pdf`)
}

// Generate Supplier Deal Receipt / Voucher PDF
export function generateSupplierDealReceiptPDF(
  supplier: SupplierItem,
  deal: {
    poNumber: string
    date: string
    items: Array<{ name: string; quantity: number; unit: string; unitPrice: number; total: number }>
    grandTotal: number
    amountPaid: number
    balanceDue: number
    status: string
    paymentMethod?: string
    notes?: string
  }
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const primaryColor: [number, number, number] = [124, 181, 24]
  const darkColor: [number, number, number] = [43, 43, 43]
  const mutedColor: [number, number, number] = [109, 109, 104]

  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 30, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(billingProfile().name, 14, 14)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Supplier Purchase Order & Deal Receipt Voucher', 14, 21)

  doc.setFillColor(255, 255, 255)
  doc.roundedRect(145, 6, 52, 18, 2, 2, 'F')
  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('PURCHASE VOUCHER', 171, 12, { align: 'center' })
  doc.setFontSize(9)
  doc.setTextColor(...primaryColor)
  doc.text(deal.poNumber, 171, 18, { align: 'center' })

  // Supplier info
  doc.setTextColor(...darkColor)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('VENDOR / SUPPLIER:', 14, 40)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(supplier.name, 14, 46)
  doc.text(`Contact: ${supplier.contactPerson || '—'} | Phone: ${supplier.phone || '—'}`, 14, 51)
  doc.text(`Address: ${supplier.address || '—'}, ${supplier.city || ''}`, 14, 56)

  doc.setFont('helvetica', 'bold')
  doc.text('DEAL DETAILS:', 130, 40)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${formatDate(deal.date)}`, 130, 46)
  doc.text(`Status: ${deal.status.toUpperCase()}`, 130, 51)
  doc.text(`Payment Mode: ${deal.paymentMethod || 'Cash'}`, 130, 56)

  const rows = deal.items.map((item, i) => [
    (i + 1).toString(),
    item.name,
    `${item.quantity} ${item.unit}`,
    formatPKR(item.unitPrice),
    formatPKR(item.total),
  ])

  autoTable(doc, {
    startY: 64,
    head: [['#', 'Item / Material Description', 'Quantity', 'Rate / Unit', 'Total Cost']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [124, 181, 24], textColor: [255, 255, 255] },
    styles: { fontSize: 8.5, cellPadding: 3 },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || 120
  const summaryX = 120

  doc.setFontSize(9)
  doc.setTextColor(...mutedColor)
  doc.text('Deal Total Value:', summaryX, finalY + 8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...darkColor)
  doc.text(formatPKR(deal.grandTotal), 196, finalY + 8, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...mutedColor)
  doc.text('Amount Paid:', summaryX, finalY + 15)
  doc.setTextColor(114, 128, 25)
  doc.text(formatPKR(deal.amountPaid), 196, finalY + 15, { align: 'right' })

  doc.setTextColor(...mutedColor)
  doc.text('Remaining Balance Due:', summaryX, finalY + 22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(deal.balanceDue > 0 ? 184 : 114, deal.balanceDue > 0 ? 72 : 128, deal.balanceDue > 0 ? 30 : 25)
  doc.text(formatPKR(deal.balanceDue), 196, finalY + 22, { align: 'right' })

  if (deal.notes) {
    doc.setTextColor(...darkColor)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(`Notes / Terms: ${deal.notes}`, 14, finalY + 10)
  }

  doc.setDrawColor(200, 200, 200)
  doc.line(14, finalY + 45, 65, finalY + 45)
  doc.line(140, finalY + 45, 196, finalY + 45)

  doc.setFontSize(8)
  doc.text('Supplier Signature / Stamp', 14, finalY + 50)
  doc.text('Received & Verified by (AL FAROOQ FOODS)', 140, finalY + 50)

  doc.save(`Deal_${deal.poNumber}_${supplier.name.replace(/\s+/g, '_')}.pdf`)
}

// Export Purchase Voucher / Order PDF
export function generatePurchaseVoucherPDF(purchase: PurchaseItem, supplier?: SupplierItem) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const primaryColor: [number, number, number] = [124, 181, 24] // #7cb518
  const darkColor: [number, number, number] = [43, 43, 43]
  const mutedColor: [number, number, number] = [109, 109, 104]

  // Header Banner
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 32, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(billingProfile().name, 14, 15)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Raw Material Procurement & Finished Goods Purchase Voucher', 14, 21)
  doc.text(billingContact(), 14, 26)

  // Title Box
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(138, 6, 62, 20, 2, 2, 'F')
  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('PURCHASE VOUCHER', 169, 12, { align: 'center' })
  doc.setFontSize(10)
  doc.setTextColor(...primaryColor)
  doc.text(purchase.poNumber || purchase.purchaseNumber || 'PO-RECORD', 169, 18, { align: 'center' })
  doc.setFontSize(7.5)
  doc.setTextColor(...mutedColor)
  doc.text(`Type: ${purchase.purchaseType || 'Procurement'}`, 169, 23, { align: 'center' })

  // Supplier & Voucher Meta
  const metaY = 40
  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('SUPPLIER / VENDOR DETAILS:', 14, metaY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Name: ${supplier?.name || purchase.supplierName}`, 14, metaY + 6)
  if (supplier?.contactPerson) {
    doc.text(`Contact: ${supplier.contactPerson} (${supplier.phone || ''})`, 14, metaY + 11)
  } else {
    doc.text(`Contact: Business Supplier`, 14, metaY + 11)
  }
  if (supplier?.address || supplier?.city) {
    doc.text(`Address: ${[supplier.address, supplier.city].filter(Boolean).join(', ')}`, 14, metaY + 16)
  }

  // Right column: Date, Status, Payment info
  doc.setFont('helvetica', 'bold')
  doc.text('PURCHASE DETAILS:', 125, metaY)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${formatDate(purchase.date)} ${purchase.time ? `· ${purchase.time}` : ''}`, 125, metaY + 6)
  doc.text(`Payment Status: ${purchase.status}`, 125, metaY + 11)
  doc.text(`Payment Method: ${purchase.paymentMethod} ${purchase.paymentAccount ? `(${purchase.paymentAccount})` : ''}`, 125, metaY + 16)

  // Items Table
  const items = purchase.items && purchase.items.length > 0
    ? purchase.items
    : [{
        id: '1',
        name: purchase.purchaseType === 'Raw Material' ? 'Raw Material' : 'Inventory Item',
        quantity: purchase.quantity || 1,
        unit: purchase.unit || 'Units',
        unitPrice: purchase.unitPrice || (purchase.grandTotal / (purchase.quantity || 1)),
        otherCost: purchase.otherCost || 0,
        total: purchase.grandTotal,
      }]

  const tableRows = items.map((it, idx) => [
    idx + 1,
    it.name,
    `${it.quantity} ${it.unit}`,
    formatPKR(it.unitPrice),
    it.otherCost ? formatPKR(it.otherCost) : 'Rs 0',
    formatPKR(it.total || (it.quantity * it.unitPrice + (it.otherCost || 0))),
  ])

  autoTable(doc, {
    startY: metaY + 22,
    head: [['#', 'Item / Material Description', 'Quantity', 'Rate / Unit Cost', 'Freight / Other', 'Total (PKR)']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: darkColor,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 32, halign: 'right' },
    },
  })

  // Financial summary
  const finalY = (doc as any).lastAutoTable.finalY + 8

  doc.setFillColor(248, 250, 252)
  doc.rect(120, finalY, 78, 38, 'F')
  doc.setDrawColor(220, 220, 220)
  doc.rect(120, finalY, 78, 38, 'S')

  doc.setFontSize(9)
  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'normal')
  doc.text('Grand Total:', 124, finalY + 8)
  doc.setFont('helvetica', 'bold')
  doc.text(formatPKR(purchase.grandTotal), 194, finalY + 8, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.text('Amount Paid:', 124, finalY + 17)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(34, 197, 94) // green
  doc.text(formatPKR(purchase.amountPaid), 194, finalY + 17, { align: 'right' })

  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'normal')
  doc.text('Balance Due:', 124, finalY + 26)
  doc.setFont('helvetica', 'bold')
  if (purchase.balanceDue > 0) {
    doc.setTextColor(225, 29, 72) // rose red
  }
  doc.text(formatPKR(purchase.balanceDue), 194, finalY + 26, { align: 'right' })

  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Status: ${purchase.status.toUpperCase()}`, 124, finalY + 34)

  if (purchase.notes) {
    doc.setTextColor(...darkColor)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(`Notes / Terms: ${purchase.notes}`, 14, finalY + 10)
  }

  // Signature section
  doc.setDrawColor(200, 200, 200)
  doc.line(14, finalY + 50, 65, finalY + 50)
  doc.line(140, finalY + 50, 196, finalY + 50)

  doc.setFontSize(8)
  doc.setTextColor(...darkColor)
  doc.text('Supplier Signature / Stamp', 14, finalY + 55)
  doc.text('Received & Verified by (AL FAROOQ FOODS)', 140, finalY + 55)

  doc.save(`Purchase_${purchase.poNumber || purchase.id}_${(supplier?.name || purchase.supplierName || 'vendor').replace(/\s+/g, '_')}.pdf`)
}

// Export Expense Voucher PDF
export function generateExpenseVoucherPDF(expense: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  })

  const primaryColor: [number, number, number] = [124, 181, 24]
  const darkColor: [number, number, number] = [43, 43, 43]
  const mutedColor: [number, number, number] = [109, 109, 104]

  // Header Banner
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 148, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(billingProfile().name, 10, 11)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text('PAYMENT & EXPENSE VOUCHER', 10, 17)

  // Voucher Number badge
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(95, 5, 43, 14, 2, 2, 'F')
  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('VOUCHER #', 116, 10, { align: 'center' })
  doc.setFontSize(8.5)
  doc.setTextColor(...primaryColor)
  doc.text(expense.expenseNumber || expense.id, 116, 15, { align: 'center' })

  // Voucher details box
  doc.setTextColor(...darkColor)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  const startY = 32
  doc.text(`Date: ${formatDate(expense.date)}`, 10, startY)
  doc.text(`Category: ${expense.category}`, 80, startY)

  doc.text(`Paid To: ${expense.paidTo || expense.employeeName || 'General Payee'}`, 10, startY + 7)
  doc.text(`Payment Method: ${expense.paymentMethod} (${expense.paymentAccount})`, 80, startY + 7)

  if (expense.employeeName) {
    doc.text(`Linked Employee: ${expense.employeeName}`, 10, startY + 14)
  }

  // Description / Details Box
  doc.setDrawColor(220, 220, 220)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(10, startY + 20, 128, 25, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...darkColor)
  doc.text('Particulars / Description:', 14, startY + 26)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(expense.description || 'Business operational expense', 14, startY + 33, { maxWidth: 120 })

  if (expense.transactionRef) {
    doc.setFontSize(7.5)
    doc.setTextColor(...mutedColor)
    doc.text(`Transaction Reference: ${expense.transactionRef}`, 14, startY + 41)
  }

  // Amount Total
  doc.setFillColor(...primaryColor)
  doc.roundedRect(10, startY + 50, 128, 16, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('TOTAL AMOUNT PAID:', 16, startY + 60)
  doc.setFontSize(13)
  doc.text(formatPKR(expense.amount), 132, startY + 60, { align: 'right' })

  // Signatures
  doc.setTextColor(...darkColor)
  doc.setFontSize(7.5)
  doc.setDrawColor(180, 180, 180)
  doc.line(14, startY + 90, 50, startY + 90)
  doc.line(95, startY + 90, 134, startY + 90)

  doc.text('Prepared By (Accounts)', 14, startY + 95)
  doc.text('Approved By / Received By', 95, startY + 95)

  doc.save(`Expense_Voucher_${expense.expenseNumber || expense.id}.pdf`)
}

// Export any dataset as CSV/Excel compatible file
export function exportToCSV(filename: string, headers: string[], rows: (string | number | undefined | null)[][]) {
  const csvContent = [
    headers.map((h) => `"${String(h ?? '').replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export interface BusinessReportPDFOptions {
  title: string
  subtitle?: string
  dateRangeText: string
  kpiStats?: Array<{ label: string; value: string; detail?: string }>
  headers: string[]
  rows: (string | number | undefined | null)[][]
  filename?: string
  orientation?: 'portrait' | 'landscape'
}

export function generateBusinessReportPDF(options: BusinessReportPDFOptions) {
  const {
    title,
    subtitle,
    dateRangeText,
    kpiStats = [],
    headers,
    rows,
    filename = 'Business_Report',
    orientation = 'landscape',
  } = options

  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = orientation === 'landscape' ? 297 : 210
  const primaryColor: [number, number, number] = [124, 181, 24] // #7cb518
  const darkColor: [number, number, number] = [43, 43, 43] // #2b2b2b
  const mutedColor: [number, number, number] = [109, 109, 104] // #6d6d68

  // Header Banner
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, pageWidth, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(billingProfile().name, 14, 11)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Central Business Intelligence & Executive Analytics Report', 14, 18)

  // Report Date Range Badge on Right
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(pageWidth - 85, 4, 71, 15, 2, 2, 'F')
  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('PERIOD / DATE RANGE', pageWidth - 49.5, 9, { align: 'center' })
  doc.setFontSize(8)
  doc.setTextColor(...primaryColor)
  doc.text(dateRangeText, pageWidth - 49.5, 15, { align: 'center' })

  // Report Title and Subtitle
  let currentY = 32
  doc.setTextColor(...darkColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(title, 14, currentY)

  if (subtitle) {
    currentY += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...mutedColor)
    doc.text(subtitle, 14, currentY)
  }

  // Render KPI Stat Cards if provided
  if (kpiStats && kpiStats.length > 0) {
    currentY += 5
    const cardGap = 4
    const cardCount = Math.min(kpiStats.length, 6)
    const totalAvailableWidth = pageWidth - 28
    const cardWidth = (totalAvailableWidth - (cardCount - 1) * cardGap) / cardCount
    const cardHeight = 16

    kpiStats.slice(0, 6).forEach((kpi, idx) => {
      const cardX = 14 + idx * (cardWidth + cardGap)
      doc.setFillColor(248, 250, 248)
      doc.setDrawColor(222, 222, 216)
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, 'FD')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(...mutedColor)
      doc.text(kpi.label.toUpperCase(), cardX + 3, currentY + 4.5)

      doc.setFontSize(9)
      doc.setTextColor(...darkColor)
      doc.text(kpi.value, cardX + 3, currentY + 10.5)

      if (kpi.detail) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(...primaryColor)
        doc.text(kpi.detail, cardX + 3, currentY + 14)
      }
    })
    currentY += cardHeight + 4
  } else {
    currentY += 2
  }

  // Data Table
  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: rows.map((r) => r.map((c) => String(c ?? '—'))),
    theme: 'grid',
    headStyles: {
      fillColor: [124, 181, 24],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 7.5,
      textColor: [43, 43, 43],
      cellPadding: 2,
      lineColor: [222, 222, 216],
    },
    alternateRowStyles: {
      fillColor: [252, 252, 250],
    },
    margin: { left: 14, right: 14 },
  })

  // Footer on each page
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pageHeight = orientation === 'landscape' ? 210 : 297
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...mutedColor)
    doc.text(
      `AL FAROOQ FOODS Confidential Business Report · Generated on ${formatDate(new Date().toISOString())}`,
      14,
      pageHeight - 6
    )
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 6, { align: 'right' })
  }

  doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

