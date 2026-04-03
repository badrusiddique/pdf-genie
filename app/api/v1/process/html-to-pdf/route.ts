import { NextRequest, NextResponse } from 'next/server'
import { convertHtmlToPdf } from '@/lib/convert/htmlToPdf'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json(
      { success: false, error: { code: 'MISSING_FILE', message: 'No HTML file provided' } },
      { status: 400 },
    )
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { success: false, error: { code: 'FILE_TOO_LARGE', message: 'HTML file exceeds 5 MB limit' } },
      { status: 413 },
    )
  }

  const html = await file.text()

  try {
    const pdf = await convertHtmlToPdf(html)
    const safeName = file.name.replace(/[^\w\-. ]/g, '_').replace(/\.html?$/i, '')
    const filename = `${safeName}.pdf`
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'CONVERT_FAILED', message: err instanceof Error ? err.message : 'Conversion failed' } },
      { status: 422 },
    )
  }
}
