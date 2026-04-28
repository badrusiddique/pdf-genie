import { NextRequest, NextResponse } from 'next/server'
import pptxgen from 'pptxgenjs'

export const maxDuration = 30

const MAX_SIZE_BYTES = 15 * 1024 * 1024

function err(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status })
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return err('INVALID_FORM', 'Could not parse form data', 400)

  const file = form.get('file') as File | null
  if (!file) return err('MISSING_FILE', 'file is required', 400)
  if (file.size > MAX_SIZE_BYTES) return err('FILE_TOO_LARGE', 'File exceeds 15 MB limit', 413)

  const bytes = new Uint8Array(await file.arrayBuffer())

  let pageTexts: string[]
  try {
    const { extractText } = await import('unpdf')
    const result = await extractText(bytes, { mergePages: false })
    pageTexts = Array.isArray(result.text) ? result.text : [result.text]
  } catch {
    return err('EXTRACT_FAILED', 'Could not extract text from PDF', 422)
  }

  const pres = new pptxgen()
  pres.layout = 'LAYOUT_WIDE'

  for (let p = 0; p < pageTexts.length; p++) {
    const slide = pres.addSlide()
    slide.background = { color: 'FFFFFF' }

    const lines = pageTexts[p]
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .slice(0, 30) // cap lines per slide

    if (lines.length === 0) continue

    // First line as title if short enough
    if (lines[0].length < 100) {
      slide.addText(lines[0], {
        x: 0.5, y: 0.3, w: '90%', h: 0.7,
        fontSize: 20, bold: true, color: '1B3A6B',
      })
      const body = lines.slice(1).join('\n')
      if (body) {
        slide.addText(body, {
          x: 0.5, y: 1.2, w: '90%', h: '75%',
          fontSize: 12, color: '333333',
          breakLine: true, valign: 'top',
        })
      }
    } else {
      slide.addText(lines.join('\n'), {
        x: 0.5, y: 0.5, w: '90%', h: '85%',
        fontSize: 12, color: '333333',
        breakLine: true, valign: 'top',
      })
    }

    // Page number
    slide.addText(`${p + 1}`, {
      x: 0, y: '92%', w: '100%', h: 0.3,
      align: 'center', fontSize: 9, color: '888888',
    })
  }

  const pptxBuffer = await pres.write({ outputType: 'nodebuffer' })
  const outBytes = Uint8Array.from(pptxBuffer as Buffer)
  const baseName = file.name.replace(/\.pdf$/i, '')

  return new NextResponse(outBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}.pptx"`,
    },
  })
}
