import { NextRequest, NextResponse } from 'next/server'
import { extractPdfText } from '@/lib/pdf/extractText'
import { summarizeText } from '@/lib/ai/summarize'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json(
      { success: false, error: { code: 'MISSING_FILE', message: 'No PDF file provided' } },
      { status: 400 },
    )
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json(
      { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 50 MB limit' } },
      { status: 413 },
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())

  if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_PDF', message: 'File is not a valid PDF' } },
      { status: 400 },
    )
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY ?? ''

  try {
    const text = await extractPdfText(bytes)
    const summary = await summarizeText(text, apiKey)
    return NextResponse.json({ success: true, summary })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'SUMMARIZE_FAILED', message: err instanceof Error ? err.message : 'Summarization failed' } },
      { status: 422 },
    )
  }
}
