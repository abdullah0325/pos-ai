import { z } from 'zod';
import { NextResponse } from 'next/server';
import { transaction, readDatabase, persist, checkRevision } from '@/lib/online-db';
import { buildDemo } from '@/lib/demo-seed';
import { apiError } from '@/lib/ai-server';
export async function POST(request: Request) { try {
    const input = z.object({ confirmation: z.literal('RESET'), revision: z.number().int().nonnegative() }).strict().parse(await request.json());
    const db = await transaction(async (c) => { const before = await readDatabase(c, true); checkRevision(before, input.revision); const saved = await persist(c, before, buildDemo(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })), true); await c.query("UPDATE app_state SET requests='{}'::jsonb WHERE id=1"); return saved; });
    return NextResponse.json(db, { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return apiError(e);
} }
