import { z } from 'zod';
import { numeric } from './ai-schema';
export const modes = ['product_list', 'purchase_bill', 'sale_list', 'stock_count'] as const;
export const modeSchema = z.enum(modes);
const name = z.string().trim().min(1).max(300);
const str = z.string().trim().max(300).nullable();
const nonnegative = z.preprocess(numeric, z.number().finite().min(0).max(1e10).nullable());
export const unitSchema = z.object({ unit: name, factor_to_base: z.preprocess(numeric, z.number().finite().positive().max(1e8)) }).strict();
export const rowSchema = z.object({
    name, extracted_name: z.string().trim().min(1).max(300).nullable().optional(), product_id: str, group_name: str, spec: str, category: str, base_unit: str,
    units: z.array(unitSchema).max(20).nullable(), purchase_price: nonnegative, sale_price: nonnegative,
    qty: nonnegative, unit: str, rate: nonnegative, amount: nonnegative,
    kind: z.enum(['product', 'expense']),
}).strict();
export const draftSchema = z.object({ mode: modeSchema, supplier: str, supplier_id: str, customer: str, customer_id: str,
    date: z.preprocess(v => v === '' ? null : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)), 'Invalid date').nullable()), total: nonnegative,
    payment_type: z.enum(['cash', 'credit']).nullable(), lines: z.array(rowSchema).min(1).max(100) }).strict();
export const approvalSchema = z.object({ draft: draftSchema, revision: z.number().int().nonnegative(), request_id: z.string().uuid(), source: z.enum(['image', 'voice', 'text', 'manual']) }).strict();
export type SmartMode = z.infer<typeof modeSchema>;
export type SmartRow = z.infer<typeof rowSchema>;
export type SmartDraft = z.infer<typeof draftSchema>;
export type MatchedRow = SmartRow & {
    status: 'matched' | 'suggested' | 'new';
    confidence: number;
    warnings: string[];
    matchedProduct?: {
        id: string;
        name: string;
    };
};
export function blankRow(): SmartRow { return { name: '', product_id: null, group_name: null, spec: null, category: null, base_unit: null, units: null, purchase_price: null, sale_price: null, qty: null, unit: null, rate: null, amount: null, kind: 'product' }; }
export function blankDraft(mode: SmartMode): SmartDraft { return { mode, supplier: null, supplier_id: null, customer: null, customer_id: null, date: null, total: null, payment_type: 'cash', lines: [blankRow()] }; }
export const unitKey = (s: string) => {
    const key = s.toLowerCase().trim();
    return ({ ft: 'foot', feet: 'foot', pcs: 'piece', pieces: 'piece', pc: 'piece', boxes: 'box', coils: 'coil', bags: 'bag', metre: 'meter', m: 'meter', g: 'gram', in: 'inch', inches: 'inch', kg: 'kg', lengths: 'length' } as Record<string, string>)[key] || key;
};
export const normalized = (s: string) => s.toLowerCase().replace(/["?]/g, ' inch ').replace(/\s+/g, ' ').trim();
export function factor(product: {
    unit: string;
    baseUnit?: string;
    units?: Array<{
        unit: string;
        factor_to_base: number;
    }>;
}, unit: string | null) {
    const base = unitKey(product.baseUnit || product.unit);
    if (!unit || unitKey(unit) === base)
        return 1;
    const conversion = product.units?.find(u => unitKey(u.unit) === unitKey(unit));
    if (!conversion)
        throw new Error(`Unit "${unit}" is not configured for this product. Choose its base unit or add a conversion.`);
    return conversion.factor_to_base;
}
