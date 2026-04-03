import { NextRequest, NextResponse } from 'next/server'
import { convertWordToPdf } from '@/lib/convert/wordToPdf'

// DOCX files are ZIP archives starting with PK magic bytes
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json(
      { success: false, error: { code: 'MISSING_FILE', message: 'No file provided' } },
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

  if (
    bytes.length < 4 ||
    bytes[0] !== ZIP_MAGIC[0] || bytes[1] !== ZIP_MAGIC[1] ||
    bytes[2] !== ZIP_MAGIC[2] || bytes[3] !== ZIP_MAGIC[3]
  ) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_FILE', message: 'File does not appear to be a valid Word document' } },
      { status: 400 },
    )
  }

  try {
    const pdf = await convertWordToPdf(bytes)
    const safeName = file.name.replace(/[^\w\-. ]/g, '_').replace(/\.(docx?|doc)$/i, '')
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'CONVERT_FAILED', message: err instanceof Error ? err.message : 'Conversion failed' } },
      { status: 422 },
    )
  }
}
