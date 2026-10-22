import { z } from 'zod'
import { NextResponse } from 'next/server'

export async function openAI(path: string, body: BodyInit, json = true) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('AI is not configured. Continue manually.')
  const response = await fetch(`https://api.openai.com/v1/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, ...(json ? { 'Content-Type': 'application/json' } : {}) }, body, signal: AbortSignal.timeout(60000), cache: 'no-store' })
  if (!response.ok) throw new Error('AI is unavailable. Check your connection and configuration, or continue manually.')
  return response.json()
}
export async function structured<T>(model: string, prompt: string, content: unknown, schema: z.ZodType<T>, jsonSchema: unknown): Promise<T> {
  const result = await openAI('chat/completions', JSON.stringify({ model, store: false, messages: [{ role: 'system', content: prompt }, { role: 'user', content }], response_format: { type: 'json_schema', json_schema: { name: 'result', strict: true, schema: jsonSchema } } }))
  const message = result.choices?.[0]?.message
  if (!message?.content || message.refusal) throw new Error('AI could not read this input. Edit manually or try a clearer recording/image.')
  return schema.parse(JSON.parse(message.content))
}
export const nullableString = { type: ['string', 'null'] }
export const nullableNumber = { type: ['number', 'null'] }
export function object(properties: Record<string, unknown>) { return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false } }
export function apiError(error: unknown) {
  return NextResponse.json({ error: error instanceof z.ZodError ? 'Invalid or incomplete data. Check the fields and try again.' : error instanceof Error ? error.message : 'Request failed. Continue manually.' }, { status: error instanceof z.ZodError ? 400 : 503, headers: { 'Cache-Control': 'no-store' } })
}
