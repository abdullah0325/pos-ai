import type { AppDatabase, ProductItem, PurchaseLineItem, InvoiceLineItem } from './db';
import { draftSchema, factor, normalized, type SmartDraft, type MatchedRow } from './smart-schema';
export function rowWarnings(row: SmartDraft['lines'][number], db: AppDatabase, mode: SmartDraft['mode']): string[] {
    const p = db.products.find(p => p.id === row.product_id), warnings: string[] = [];
    if (row.kind === 'expense' && mode !== 'purchase_bill')
        warnings.push('Expense rows are only supported in purchases');
    if (row.qty === null && mode !== 'product_list')
        warnings.push('Quantity is missing');
    if (row.qty !== null && row.rate !== null && row.amount !== null && Math.abs(row.qty * row.rate - row.amount) > 0.01)
        warnings.push('Quantity x rate differs from amount');
    if(mode==='purchase_bill' && row.rate===null && row.amount===null)warnings.push('Price is missing; review before approval')
    if(mode==='sale_list' && (p ? p.retailPrice===0 : !row.sale_price))warnings.push('Sale price is missing or zero; review before approval')
    if (p) {
        try {
            const f = factor(p, row.unit);
            if (row.qty !== null && mode === 'sale_list' && row.qty * f > p.quantity)
                warnings.push('Sale will make stock negative');
            if (mode === 'purchase_bill' && row.rate !== null && p.costPrice > 0 && Math.abs(row.rate / f - p.costPrice) / p.costPrice > 0.3)
                warnings.push('Purchase price changed by over 30%');
        }
        catch (e) {
            warnings.push((e as Error).message);
        }
    }
    return warnings;
}
export function applySmartEntry(previous: AppDatabase, input: SmartDraft, source: 'image' | 'voice' | 'text' | 'manual', id: string) {
    const draft = draftSchema.parse(input), db = structuredClone(previous), now = new Date().toISOString(), date = draft.date || now.slice(0, 10);
    let created = 0, updated = 0, learned = 0;
    const warnings = draft.lines.flatMap(r => rowWarnings(r, previous, draft.mode));
    const seen = new Set<string>(), purchaseItems: PurchaseLineItem[] = [], saleItems: InvoiceLineItem[] = [];
    const originalNames = new Set(previous.products.map(p => normalized(p.name)));
    for (const row of draft.lines) {
        const key = normalized(row.name);
        if (seen.has(key))
            warnings.push(`Duplicate line: ${row.name}`);
        seen.add(key);
        if (row.kind === 'expense') {
            if (draft.mode !== 'purchase_bill')
                throw new Error('Expenses can only be entered on a purchase bill.');
            if (row.amount === null && (row.qty === null || row.rate === null))
                throw new Error('Enter an expense amount or quantity and rate.');
            const amount = row.amount ?? row.qty! * row.rate!;
            db.expenses.push({ id: crypto.randomUUID(), expenseNumber: `EXP-${id.slice(0, 8)}`, date, category: 'Other', description: row.name, amount, paidTo: draft.supplier || '', paymentMethod: 'Cash', paymentAccount: 'cash-in-hand', status: 'Pending', notes: `Included in payable for purchase ${id}`, createdAt: now });
            purchaseItems.push({ name: row.name, quantity: row.qty ?? 1, unit: row.unit || 'service', unitPrice: row.rate ?? amount, total: amount });
            continue;
        }
        let product = db.products.find(p => p.id === row.product_id);
        if (row.product_id && !product)
            throw new Error('Selected product no longer exists. Review again.');
        if (!product) {
            if (originalNames.has(key) || db.products.some(p => normalized(p.name) === key))
                throw new Error(`${row.name} already exists. Select it from the product list.`);
            const base = row.base_unit || row.unit || 'piece';
            product = { id: crypto.randomUUID(), name: row.name, groupName: row.group_name || row.name, spec: row.spec || '', category: row.category || 'Other', sku: '', unit: base, baseUnit: base, units: row.units || [{ unit: base, factor_to_base: 1 }], quantity: 0, costPrice: row.purchase_price ?? 0, retailPrice: row.sale_price ?? 0, wholesalePrice: row.sale_price ?? 0, reorderLevel: 0, status: 'Out of stock', isPurchasedProduct: true, updatedAt: now };
            db.products.push(product);
            created++;
        }
        else
            updated++;
        if (draft.mode === 'product_list') {
            for (const [field, value] of Object.entries({ groupName: row.group_name, spec: row.spec, category: row.category, purchase_price: row.purchase_price, sale_price: row.sale_price })) {
                if (value !== null) {
                    if (field === 'purchase_price')
                        product.costPrice = value as number;
                    else if (field === 'sale_price') {
                        product.retailPrice = value as number;
                        product.wholesalePrice = value as number;
                    }
                    else
                        (product as unknown as Record<string, unknown>)[field] = value;
                }
            }
            if (row.base_unit && row.base_unit !== product.unit && previous.products.some(p => p.id === product!.id))
                throw new Error('Changing an existing base unit requires a stock migration; keep its current base unit.');
            if (row.base_unit) {
                product.unit = row.base_unit;
                product.baseUnit = row.base_unit;
            }
            if (row.units)
                product.units = row.units;
        }
        const base = product.baseUnit || product.unit;
        if (product.units?.some(u => u.unit === base && u.factor_to_base !== 1))
            throw new Error('The base unit conversion factor must be 1.');
        const conversion = factor(product, row.unit);
        if (row.qty === null && draft.mode !== 'product_list')
            throw new Error(`Enter a quantity for ${row.name}.`);
        const qty = row.qty ?? 0, qtyBase = qty * conversion;
        if (draft.mode === 'purchase_bill' && qty <= 0)
            throw new Error('Purchase quantities must be positive.');
        if (draft.mode === 'purchase_bill') {
            const amount = row.amount ?? qty * (row.rate ?? 0), rate = row.rate ?? (qty > 0 ? amount / qty : 0);
            product.quantity += qtyBase;
            if (row.rate !== null || row.amount !== null)
                product.costPrice = rate / conversion;
            purchaseItems.push({ itemId: product.id, productId: product.id, itemType: 'Finished Product', name: product.name, quantity: qty, unit: row.unit || base, unitPrice: rate, total: amount });
        }
        else if (draft.mode === 'sale_list') {
            if (qty <= 0)
                throw new Error('Sale quantities must be positive.');
            const rate = product.retailPrice * conversion;
            product.quantity -= qtyBase;
            if (product.quantity < 0 && !warnings.some(w => w.includes(product!.name)))
                warnings.push(`Negative stock: ${product.name}`);
            saleItems.push({ productId: product.id, name: product.name, quantity: qty, unit: row.unit || base, unitPrice: rate, costPrice: product.costPrice * conversion, total: qty * rate });
        }
        else if (row.qty !== null)
            product.quantity = qtyBase;
        product.status = product.quantity <= 0 ? 'Out of stock' : product.quantity <= product.reorderLevel ? 'Low stock' : 'In stock';
        product.updatedAt = now;
        // Alias changes are made only by approved rows, never by extraction.
        db.productAliases ||= [];
        const aliasKey = normalized(row.extracted_name || row.name);
        const oldAlias = db.productAliases.find(a => a.aliasKey === aliasKey);
        if (oldAlias && oldAlias.productId !== product.id)
            throw new Error(`The alias ${row.name} already belongs to another product. Rename the row or select that product.`);
        if (!oldAlias) {
            db.productAliases.push({ aliasKey, productId: product.id, source });
            learned++;
        }
    }
    let receiptId: string | undefined;
    if (draft.mode === 'purchase_bill') {
        let supplier = db.suppliers.find(s => s.id === draft.supplier_id) || db.suppliers.find(s => normalized(s.name) === normalized(draft.supplier || ''));
        if (draft.supplier_id && !db.suppliers.some(s => s.id === draft.supplier_id))
            throw new Error('Unknown supplier ID.');
        if (!supplier && draft.supplier) {
            supplier = { id: crypto.randomUUID(), name: draft.supplier, contactPerson: '', category: 'Hardware', phone: '', address: '', city: '', openingBalance: 0, currentBalance: 0, status: 'Active', updatedAt: now };
            db.suppliers.push(supplier);
        }
        const lineTotal = purchaseItems.reduce((s, l) => s + l.total, 0), total = draft.total ?? lineTotal;
        if (Math.abs(total - lineTotal) > .01)
            warnings.push('Bill total differs from line total; the reviewed bill total was used.');
        if (supplier) {
            supplier.currentBalance += total;
            db.ledgers.push({ id: crypto.randomUUID(), partyId: supplier.id, partyType: 'Supplier', date, referenceType: 'Purchase', referenceId: id, description: 'Approved purchase', debit: 0, credit: total, balance: supplier.currentBalance });
        }
        db.purchases.push({ id, poNumber: `PO-${id.slice(0, 8)}`, date, supplierId: supplier?.id, supplierName: supplier?.name || '', items: purchaseItems, grandTotal: total, amountPaid: 0, balanceDue: total, status: 'Unpaid', paymentMethod: 'Credit', createdAt: now });
    }
    if (draft.mode === 'sale_list') {
        const credit = draft.payment_type === 'credit';
        let customer = db.customers.find(c => c.id === draft.customer_id) || db.customers.find(c => normalized(c.name) === normalized(draft.customer || ''));
        if (draft.customer_id && !db.customers.some(c => c.id === draft.customer_id))
            throw new Error('Unknown customer ID.');
        if (!customer && draft.customer) {
            customer = { id: crypto.randomUUID(), name: draft.customer, type: 'Retailer', phone: '', address: '', openingBalance: 0, currentBalance: 0, creditLimit: 100000, status: 'Active', updatedAt: now };
            db.customers.push(customer);
        }
        if (credit && !customer)
            throw new Error('Choose or name a customer for a credit sale.');
        const total = saleItems.reduce((s, l) => s + l.total, 0);
        if (credit && customer) {
            customer.currentBalance += total;
            db.ledgers.push({ id: crypto.randomUUID(), partyId: customer.id, partyType: 'Customer', date, referenceType: 'Invoice', referenceId: id, description: 'Approved credit sale', debit: total, credit: 0, balance: customer.currentBalance });
        }
        if (!credit) {
            const account = db.accounts.find(a => a.id === 'cash-in-hand');
            if (account)
                account.balance += total;
        }
        db.invoices.push({ id, invoiceNumber: `SALE-${id.slice(0, 8)}`, date, customerId: customer?.id || '', customerName: customer?.name || 'Walk-in', customerType: customer?.type || 'Walk-in', phone: customer?.phone || '', address: customer?.address || '', saleType: 'Retail', items: saleItems, subtotal: total, discount: 0, tax: 0, grandTotal: total, amountPaid: credit ? 0 : total, balanceDue: credit ? total : 0, paymentMethod: credit ? 'Credit' : 'Cash', paymentAccount: 'cash-in-hand', status: credit ? 'Unpaid' : 'Paid', deliveryStatus: 'Delivered', createdAt: now });
        receiptId = id;
    }
    if (source !== 'manual') {
        db.aiActivity ||= [];
        db.aiActivity.push({ id, type: source === 'voice' ? 'voice' : 'scan', mode: draft.mode, createdAt: now, created, aliases: learned });
    }
    return { db, summary: { updated, created, warnings: [...new Set(warnings)], aliases: learned }, receiptId };
}
