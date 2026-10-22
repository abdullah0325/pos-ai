import { z } from 'zod';
const n = z.number().finite().min(-1e12).max(1e12);
const id = z.string().min(1).max(150);
const record = z.object({ id }).passthrough();
const records = z.array(record).max(20000);
const product = record.extend({ name: z.string().min(1).max(300), unit: z.string().max(100), quantity: n, costPrice: n, retailPrice: n, wholesalePrice: n, reorderLevel: n,
    baseUnit: z.string().max(100).optional(), units: z.array(z.object({ unit: z.string().min(1).max(100), factor_to_base: z.number().finite().positive().max(1e8) })).max(20).optional() });
const party = record.extend({ name: z.string().min(1).max(300), currentBalance: n });
const purchaseLine = z.object({ name: z.string().min(1).max(300), quantity: n, unit: z.string().max(100), unitPrice: n, total: n }).passthrough();
const invoiceLine = purchaseLine.extend({ productId: id, costPrice: n });
const transaction = record.extend({ grandTotal: n, amountPaid: n, balanceDue: n, date: z.string().max(40) });
export const databaseSchema = z.object({ version: z.literal(2), revision: z.number().int().nonnegative().optional(), products: z.array(product).max(5000), customers: z.array(party).max(5000), suppliers: z.array(party).max(5000), purchases: z.array(transaction.extend({ items: z.array(purchaseLine).max(500) })).max(20000), invoices: z.array(transaction.extend({ items: z.array(invoiceLine).max(500) })).max(20000), expenses: z.array(record.extend({ amount: n })).max(20000), rawMaterials: records, productionRuns: records, categories: records, returns: records, accounts: records, transfers: records, ledgers: records, employees: records,
    stockMovements: z.array(z.object({ id, itemId: id, kind: z.enum(['product', 'raw_material']), type: z.enum(['purchase', 'sale', 'adjust', 'opening']), qty: n, refId: id, createdAt: z.string().datetime() })).max(100000).optional(),
    productAliases: z.array(z.object({ aliasKey: z.string().min(1).max(300), productId: id, source: z.string().max(100) })).max(10000).optional(),
}).passthrough().superRefine((db, ctx) => {
    for (const key of ['products', 'customers', 'suppliers', 'purchases', 'invoices', 'expenses'] as const) {
        const ids = db[key].map(x => x.id);
        if (new Set(ids).size !== ids.length)
            ctx.addIssue({ code: 'custom', message: `Duplicate ${key} IDs`, path: [key] });
    }
});
