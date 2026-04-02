import { NextRequest, NextResponse } from 'next/server'
import { compressPdf, type CompressionLevel } from '@/lib/pdf/compress'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const level = (formData.get('level') as string) || 'recommended'

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

  // Magic bytes check: %PDF = 0x25 0x50 0x44 0x46
  if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_PDF', message: 'File is not a valid PDF' } },
      { status: 400 },
    )
  }

  const result = await compressPdf(bytes, level as CompressionLevel)

  const filename = `${file.name.replace(/\.pdf$/i, '')}_compressed.pdf`
  return new NextResponse(Buffer.from(result.compressed), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Original-Size': String(result.originalSize),
      'X-Compressed-Size': String(result.compressedSize),
    },
  })
}
