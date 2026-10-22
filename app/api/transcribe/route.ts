import { NextResponse } from 'next/server'
import { z } from 'zod'
import { openAI, apiError } from '@/lib/ai-server'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('audio')
    if (!(file instanceof File) || !file.size || file.size > 4000000 || !/^(audio\/(webm|mp4|mpeg|ogg|wav)|video\/webm)/.test(file.type)) return NextResponse.json({ error: 'Choose an audio recording under 4MB.' }, { status: 400 })
    const data = new FormData()
    data.set('file', file)
    data.set('model', process.env.OPENAI_STT_MODEL || 'gpt-4o-mini-transcribe')
    data.set('prompt', 'English, Urdu, Roman Urdu. AL FAROOQ FOODS sales, cartons, mineral water, mango juice, udhaar.')
    const result = z.object({ text: z.string().trim().min(1).max(10000) }).parse(await openAI('audio/transcriptions', data, false))
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error) }
}
