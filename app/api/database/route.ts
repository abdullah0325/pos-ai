import { NextResponse } from 'next/server';
import { z } from 'zod';
import { transaction, readDatabase, persist, checkRevision } from '@/lib/online-db';
import { databaseSchema } from '@/lib/online-schema';
import type { AppDatabase } from '@/lib/db';
import { apiError } from '@/lib/ai-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() { try {
    return NextResponse.json(await transaction(c => readDatabase(c)), { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return apiError(e);
} }
export async function PUT(request: Request) {
    try {
        const input = z.object({ db: databaseSchema, revision: z.number().int().nonnegative() }).strict().parse(await request.json());
        const db = await transaction(async (c) => { const before = await readDatabase(c, true); checkRevision(before, input.revision); return persist(c, before, input.db as unknown as AppDatabase); });
        return NextResponse.json(db, { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (e) {
        return apiError(e);
    }
}
