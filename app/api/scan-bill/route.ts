import { NextResponse } from 'next/server'
export async function POST(){return NextResponse.json({error:'Use Smart Entry at /api/ai/extract and approve before saving.'},{status:410})}
