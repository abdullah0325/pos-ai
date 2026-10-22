import { NextResponse } from 'next/server';
import { approvalSchema } from '@/lib/smart-schema';
import { applySmartEntry } from '@/lib/smart-apply';
import { transaction, readDatabase, persist, checkRevision } from '@/lib/online-db';
import { apiError } from '@/lib/ai-server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
    try {
        const input = approvalSchema.parse(await request.json());
        const result = await transaction(async (c) => {
            const db = await readDatabase(c, true);
            const old = await c.query('SELECT requests->$1 AS result FROM app_state WHERE id=1', [input.request_id]);
            if (old.rows[0].result)
                return { ...old.rows[0].result, db };
            checkRevision(db, input.revision);
            const applied = applySmartEntry(db, input.draft, input.source, input.request_id);
            const saved = await persist(c, db, applied.db);
            const result = { summary: applied.summary, receiptId: applied.receiptId };
            await c.query('UPDATE app_state SET requests=requests || jsonb_build_object($1::text,$2::jsonb) WHERE id=1', [input.request_id, JSON.stringify(result)]);
            return { ...result, db: saved };
        });
        return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (e) {
        return apiError(e);
    }
}
