import { NextRequest, NextResponse } from 'next/server'
import { Document, Paragraph, TextRun, Packer } from 'docx'

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

  let rawText: string
  try {
    const { extractText } = await import('unpdf')
    const result = await extractText(bytes, { mergePages: false })
    rawText = (Array.isArray(result.text) ? result.text : [result.text]).join('\n\n')
  } catch {
    return err('EXTRACT_FAILED', 'Could not extract text from PDF', 422)
  }

  // Split into paragraphs preserving structure
  const paragraphs = rawText
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block =>
      new Paragraph({
        children: block.split('\n').flatMap((line, i, arr) => [
          new TextRun(line),
          ...(i < arr.length - 1 ? [new TextRun({ break: 1 })] : []),
        ]),
        spacing: { after: 200 },
      }),
    )

  const doc = new Document({
    sections: [{ children: paragraphs }],
  })

  const buffer = await Packer.toBuffer(doc)
  const outBytes = Uint8Array.from(buffer)
  const baseName = file.name.replace(/\.pdf$/i, '')

  return new NextResponse(outBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}.docx"`,
    },
  })
}
