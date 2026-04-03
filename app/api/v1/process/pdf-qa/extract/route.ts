import { NextRequest, NextResponse } from 'next/server'
import { extractPdfText } from '@/lib/pdf/extractText'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const files = formData.getAll('files') as File[]

  if (files.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'MISSING_FILES', message: 'No PDF files provided' } },
      { status: 400 },
    )
  }

  if (files.length > 5) {
    return NextResponse.json(
      { success: false, error: { code: 'TOO_MANY_FILES', message: 'Maximum 5 PDFs allowed' } },
      { status: 400 },
    )
  }

  const allTexts: string[] = []

  for (const file of files) {
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: `${file.name} exceeds 15 MB limit` } },
        { status: 413 },
      )
    }

    const bytes = new Uint8Array(await file.arrayBuffer())

    if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PDF', message: `${file.name} is not a valid PDF` } },
        { status: 400 },
      )
    }

    try {
      const text = await extractPdfText(bytes)
      if (text.trim()) allTexts.push(`=== ${file.name} ===\n${text}`)
    } catch (extractErr) {
      const msg = extractErr instanceof Error ? extractErr.message : String(extractErr)
      return NextResponse.json(
        { success: false, error: { code: 'EXTRACT_FAILED', message: `Failed to extract text from ${file.name}: ${msg}` } },
        { status: 422 },
      )
    }
  }

  if (allTexts.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_TEXT', message: 'No readable text found in the uploaded PDF(s)' } },
      { status: 422 },
    )
  }

  return NextResponse.json({ success: true, context: allTexts.join('\n\n') })
}
