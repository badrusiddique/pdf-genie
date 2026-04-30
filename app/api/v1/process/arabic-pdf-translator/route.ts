import { NextRequest, NextResponse } from 'next/server'
import { extractArabicBlocks } from '@/lib/pdf/layout-extractor'
import { translateArabicBlocks, extractEntityCandidates } from '@/lib/ai/arabic-translate'
import type { GlossaryEntry } from '@/lib/ai/arabic-translate'
import { rebuildPdf } from '@/lib/pdf/layout-reconstructor'
import { extractPdfText } from '@/lib/pdf/extractText'

// Vercel: 60s allows ~600 Arabic blocks with 8-way parallel HF calls (~20s typical)
export const maxDuration = 60

const MAX_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB — safe for Vercel free tier
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] // %PDF

function isPdf(bytes: Uint8Array): boolean {
  return PDF_MAGIC.every((b, i) => bytes[i] === b)
}

function err(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status })
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) return err('MISSING_API_KEY', 'HuggingFace API key not configured', 500)

  const form = await req.formData().catch(() => null)
  if (!form) return err('INVALID_FORM', 'Could not parse form data', 400)

  const arabicFile = form.get('arabic_pdf') as File | null
  if (!arabicFile) return err('MISSING_FILE', 'arabic_pdf is required', 400)
  if (arabicFile.size > MAX_SIZE_BYTES) return err('FILE_TOO_LARGE', 'File exceeds 15 MB limit', 413)

  const arabicBytes = new Uint8Array(await arabicFile.arrayBuffer())
  if (!isPdf(arabicBytes)) return err('INVALID_PDF', 'arabic_pdf is not a valid PDF', 422)

  // Parse glossary sent as JSON string from client localStorage
  let glossary: GlossaryEntry[] = []
  const glossaryStr = form.get('glossary') as string | null
  if (glossaryStr) {
    try { glossary = JSON.parse(glossaryStr) } catch { /* ignore malformed */ }
  }

  const extractOnly = form.get('extract_entities_only') === 'true'
  const referenceFile = form.get('reference_pdf') as File | null

  // ── Entity extraction mode ─────────────────────────────────────────────
  if (extractOnly && referenceFile) {
    if (referenceFile.size > MAX_SIZE_BYTES) return err('FILE_TOO_LARGE', 'Reference file exceeds 15 MB limit', 413)
    const refBytes = new Uint8Array(await referenceFile.arrayBuffer())
    if (!isPdf(refBytes)) return err('INVALID_PDF', 'reference_pdf is not a valid PDF', 422)

    const [arabicBlocks, referenceText] = await Promise.all([
      extractArabicBlocks(arabicBytes.slice()),
      extractPdfText(refBytes),
    ])

    const modelTranslations = await translateArabicBlocks(arabicBlocks, glossary, apiKey)
    const entities = extractEntityCandidates(
      arabicBlocks.map(b => b.text),
      modelTranslations,
      referenceText,
    )

    return NextResponse.json({ success: true, entities })
  }

  // ── Full translation mode ──────────────────────────────────────────────
  // .slice() copies the buffer — pdfjs-dist transfers (detaches) the original ArrayBuffer
  const blocks = await extractArabicBlocks(arabicBytes.slice())
  const translations = await translateArabicBlocks(blocks, glossary, apiKey)
  const translatedBytes = await rebuildPdf(arabicBytes, blocks, translations)

  const originalName = arabicFile.name.replace(/\.pdf$/i, '')
  return new NextResponse(Buffer.from(translatedBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}_EN.pdf"`,
    },
  })
}
