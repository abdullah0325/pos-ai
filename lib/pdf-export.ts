// Client-side PDF & Excel/CSV Export Engine for AL FAROOQ FOODS
import jsPDF from 'jspdf'
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
  doc.text('AL FAROOQ FOODS', 14, 15)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Manufacturers of Mineral Water, Juices, Confectionery & Snacks', 14, 21)
  doc.text('Phone: 0344 9549051, 0346 9829900 | Email: umarfarooq4847@gmail.com', 14, 26)

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
  doc.text('AL FAROOQ FOODS', 14, 13)
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
  doc.text('AL FAROOQ FOODS', 14, 15)

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

// Export any dataset as CSV/Excel compatible file
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
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
