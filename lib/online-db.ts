import { Pool, neonConfig, type PoolClient } from '@neondatabase/serverless';
import WebSocket from 'ws';
import type { AppDatabase } from './db';
import { initialDatabase } from './db';
import { auditStock } from './stock-audit';
import { databaseSchema } from './online-schema';
neonConfig.webSocketConstructor = WebSocket;
let pool: Pool;
function getPool() {
    if (!process.env.DATABASE_URL)
        throw new Error('Set DATABASE_URL and run npm run db:migrate.');
    if (!pool) {
        pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 20000, idleTimeoutMillis: 30000, max: 5 });
        // Neon may close an idle WebSocket. The pool drops that client and reconnects
        // on the next request; an idle socket error must not terminate the server.
        pool.on('error', () => console.warn('An idle database connection closed; the next request will reconnect.'));
    }
    return pool;
}
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query('SET LOCAL search_path TO hardware, public');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        try { await client.query('ROLLBACK'); } catch {}
        throw error;
    }
    finally {
        client.release();
    }
}
const core = { products: 'products', suppliers: 'suppliers', customers: 'customers', purchases: 'purchases', invoices: 'sales', expenses: 'expenses' } as const;
export async function readDatabase(client: PoolClient, lock = false): Promise<AppDatabase> {
    // A shared lock keeps all table reads on the same revision while a writer replaces rows.
    const result = await client.query(`SELECT * FROM app_state WHERE id=1 ${lock ? 'FOR UPDATE' : 'FOR SHARE'}`);
    if (!result.rows[0])
        throw new Error('Database is not initialized. Run npm run db:migrate and npm run db:seed.');
    const db = { ...initialDatabase, ...result.rows[0].data, revision: result.rows[0].revision } as AppDatabase;
    for (const [key, table] of Object.entries(core))
        (db as unknown as Record<string, unknown>)[key] = (await client.query(`SELECT data FROM ${table} ORDER BY id`)).rows.map(r => r.data);
    db.stockMovements = (await client.query('SELECT data FROM stock_movements ORDER BY created_at,id')).rows.map(r => r.data);
    db.productAliases = (await client.query('SELECT alias_key,product_id,source FROM product_aliases ORDER BY alias_key')).rows.map(r => ({ aliasKey: r.alias_key, productId: r.product_id, source: r.source }));
    return db;
}
export async function persist(client: PoolClient, previous: AppDatabase, input: AppDatabase, reset = false): Promise<AppDatabase> {
    databaseSchema.parse(input);
    for (const product of input.products) {
        const old = previous.products.find(p => p.id === product.id);
        if (!reset && old && (old.baseUnit || old.unit) !== (product.baseUnit || product.unit))
            throw new Error('Changing an existing base unit requires a stock migration.');
        if (product.units?.some(u => u.unit === (product.baseUnit || product.unit) && u.factor_to_base !== 1))
            throw new Error('The base unit conversion must equal 1.');
    }
    const next = reset ? structuredClone(input) : auditStock(previous, { ...input, stockMovements: previous.stockMovements });
    // Core tables retain their legacy UI payload alongside generated SQL columns.
    // Both represent the same row; no browser database or asynchronous mirror exists.
    for (const [key, table] of Object.entries(core) as [
        keyof typeof core,
        string
    ][]) {
        const rows = next[key];
        await client.query(`INSERT INTO ${table}(id,data) SELECT x->>'id',x FROM jsonb_array_elements($1::jsonb) x ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data`, [JSON.stringify(rows)]);
        await client.query(`DELETE FROM ${table} WHERE NOT(id=ANY($1::text[]))`, [rows.map(r => r.id)]);
    }
    for (const [table, parent, key] of [['purchase_items', 'purchase_id', 'purchases'], ['sale_items', 'sale_id', 'invoices']] as const) {
        await client.query(`DELETE FROM ${table}`);
        const rows = next[key].flatMap(p => p.items.map((line, i) => ({ id: `${p.id}:${i}`, parent: p.id, product_id: 'productId' in line ? line.productId : line.itemId ?? null, data: line })));
        await client.query(`INSERT INTO ${table}(id,${parent},product_id,data) SELECT x->>'id',x->>'parent',x->>'product_id',x->'data' FROM jsonb_array_elements($1::jsonb)x`, [JSON.stringify(rows)]);
    }
    if (reset)
        await client.query('DELETE FROM stock_movements');
    await client.query(`INSERT INTO stock_movements(id,product_id,type,qty_base,ref_id,created_at,data) SELECT x->>'id',x->>'itemId',x->>'type',(x->>'qty')::numeric,x->>'refId',(x->>'createdAt')::timestamptz,x FROM jsonb_array_elements($1::jsonb)x ON CONFLICT(id) DO NOTHING`, [JSON.stringify(next.stockMovements || [])]);
    await client.query('DELETE FROM product_aliases');
    const productIds = new Set(next.products.map(p => p.id));
    next.productAliases = (next.productAliases || []).filter(a => productIds.has(a.productId));
    await client.query(`INSERT INTO product_aliases SELECT x->>'aliasKey',x->>'productId',x->>'source' FROM jsonb_array_elements($1::jsonb)x`, [JSON.stringify(next.productAliases)]);
    // Catch inconsistent seeds and ensure every stock change has an audit entry.
    const sums = new Map<string, number>();
    for (const movement of next.stockMovements || [])
        if (movement.kind === 'product')
            sums.set(movement.itemId, (sums.get(movement.itemId) || 0) + movement.qty);
    for (const p of next.products)
        if (Math.abs((sums.get(p.id) || 0) - p.quantity) > 0.00001)
            throw new Error(`Stock ledger does not balance for ${p.name}.`);
    const extra = { ...next } as Record<string, unknown>;
    for (const key of [...Object.keys(core), 'stockMovements', 'productAliases', 'revision'])
        delete extra[key];
    const updated = await client.query('UPDATE app_state SET data=$1::jsonb,revision=revision+1 WHERE id=1 RETURNING revision', [JSON.stringify(extra)]);
    next.revision = updated.rows[0].revision;
    return next;
}
export function checkRevision(db: AppDatabase, revision: number) { if (db.revision !== revision)
    throw Object.assign(new Error('Records changed in another session. Reload before saving; your draft has not been saved.'), { status: 409 }); }
export async function closeDatabase() { if (pool)
    await pool.end(); }
