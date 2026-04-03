import { NextRequest, NextResponse } from 'next/server'
import { answerQuestion } from '@/lib/ai/qa'

export async function POST(req: NextRequest) {
  let body: { question?: string; context?: string } | null = null

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_BODY', message: 'Request body must be JSON with question and context' } },
      { status: 400 },
    )
  }

  if (!body || typeof body.question !== 'string' || typeof body.context !== 'string') {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_BODY', message: 'Body must include question and context strings' } },
      { status: 400 },
    )
  }

  const { question, context } = body

  if (!question.trim()) {
    return NextResponse.json(
      { success: false, error: { code: 'EMPTY_QUESTION', message: 'Question cannot be empty' } },
      { status: 400 },
    )
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY ?? ''

  try {
    const result = await answerQuestion(question, context, apiKey)
    return NextResponse.json({ success: true, answer: result.answer, score: result.score })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'QA_FAILED', message: err instanceof Error ? err.message : 'Q&A failed' } },
      { status: 422 },
    )
  }
}
