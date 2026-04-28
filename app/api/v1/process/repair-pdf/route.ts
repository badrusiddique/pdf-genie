import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'

export const maxDuration = 30

const MAX_SIZE_BYTES = 50 * 1024 * 1024

function err(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status })
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return err('INVALID_FORM', 'Could not parse form data', 400)

  const file = form.get('file') as File | null
  if (!file) return err('MISSING_FILE', 'file is required', 400)
  if (file.size > MAX_SIZE_BYTES) return err('FILE_TOO_LARGE', 'File exceeds 50 MB limit', 413)

  const bytes = new Uint8Array(await file.arrayBuffer())

  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    } as Parameters<typeof PDFDocument.load>[1])
  } catch {
    return err('CORRUPT_PDF', 'Could not load PDF — file may be severely damaged', 422)
  }

  const repaired = await doc.save({ useObjectStreams: false })
  const baseName = file.name.replace(/\.pdf$/i, '')

  return new NextResponse(Buffer.from(repaired), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}_repaired.pdf"`,
    },
  })
}
