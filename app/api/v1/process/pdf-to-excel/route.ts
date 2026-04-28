import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

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

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'pdf-genie'
  workbook.created = new Date()

  for (let p = 0; p < pageTexts.length; p++) {
    const sheet = workbook.addWorksheet(`Page ${p + 1}`)
    sheet.columns = [{ header: `Content — Page ${p + 1}`, key: 'content', width: 80 }]

    const lines = pageTexts[p]
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    for (const line of lines) {
      // Heuristic: if line has multiple whitespace-separated segments, split into columns
      const cells = line.split(/\s{2,}|\t/).map(c => c.trim()).filter(Boolean)
      if (cells.length > 1) {
        sheet.addRow(cells)
      } else {
        sheet.addRow([line])
      }
    }
  }

  const rawBuffer = await workbook.xlsx.writeBuffer()
  const outBytes = new Uint8Array(rawBuffer as ArrayBuffer)
  const baseName = file.name.replace(/\.pdf$/i, '')

  return new NextResponse(outBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(baseName)}.xlsx"`,
    },
  })
}
