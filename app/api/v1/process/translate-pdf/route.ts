import { NextRequest, NextResponse } from 'next/server'
import { extractPdfText } from '@/lib/pdf/extractText'
import { translateText, validateTargetLanguage, SUPPORTED_LANGUAGES } from '@/lib/ai/translate'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const targetLang = (formData.get('targetLang') as string) || ''

  if (!file) {
    return NextResponse.json(
      { success: false, error: { code: 'MISSING_FILE', message: 'No PDF file provided' } },
      { status: 400 },
    )
  }

  if (!validateTargetLanguage(targetLang)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_LANGUAGE', message: `Unsupported language: "${targetLang}". Supported: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}` } },
      { status: 400 },
    )
  }

  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json(
      { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 15 MB limit for translation' } },
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
    const translated = await translateText(text, targetLang, apiKey)
    return NextResponse.json({
      success: true,
      translated,
      targetLang,
      targetLabel: SUPPORTED_LANGUAGES[targetLang].label,
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'TRANSLATE_FAILED', message: err instanceof Error ? err.message : 'Translation failed' } },
      { status: 422 },
    )
  }
}
