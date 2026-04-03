import { NextRequest, NextResponse } from 'next/server'
import { chatWithKimi, type ChatMessage } from '@/lib/ai/qa'

export async function POST(req: NextRequest) {
  let body: { messages?: ChatMessage[]; context?: string } | null = null

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_BODY', message: 'Request body must be JSON' } },
      { status: 400 },
    )
  }

  if (!body || !Array.isArray(body.messages) || typeof body.context !== 'string') {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_BODY', message: 'Body must include messages array and context string' } },
      { status: 400 },
    )
  }

  const { messages, context } = body

  if (messages.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'EMPTY_MESSAGES', message: 'Messages array cannot be empty' } },
      { status: 400 },
    )
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY ?? ''

  try {
    const answer = await chatWithKimi(messages, context, apiKey)
    return NextResponse.json({ success: true, answer })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'QA_FAILED', message: err instanceof Error ? err.message : 'Q&A failed' } },
      { status: 422 },
    )
  }
}
