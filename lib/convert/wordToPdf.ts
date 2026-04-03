import mammoth from 'mammoth'
import { htmlToPdfBuffer } from './browser'
import { buildHtmlDocument } from './htmlToPdf'

/**
 * Converts DOCX bytes to an HTML string using mammoth.
 * Exported for unit testing — no browser dependency.
 */
export async function docxToHtml(docxBytes: Uint8Array): Promise<string> {
  if (docxBytes.length === 0) {
    throw new Error('DOCX input is empty')
  }

  const buffer = Buffer.from(docxBytes)
  let result: { value: string; messages: { type: string; message: string }[] }

  try {
    result = await mammoth.convertToHtml({ buffer })
  } catch {
    throw new Error('Failed to parse DOCX file. The file may be corrupt or not a valid Word document.')
  }

  if (!result.value || result.value.trim().length === 0) {
    throw new Error('The Word document appears to be empty or contains no readable content.')
  }

  return result.value
}

/**
 * Converts a DOCX Uint8Array to a PDF Uint8Array.
 * Step 1: mammoth → HTML. Step 2: puppeteer → PDF.
 */
export async function convertWordToPdf(docxBytes: Uint8Array): Promise<Uint8Array> {
  const bodyHtml = await docxToHtml(docxBytes)
  const fullHtml = buildHtmlDocument(bodyHtml)
  const buffer = await htmlToPdfBuffer(fullHtml, {
    format: 'A4',
    margin: { top: '2cm', bottom: '2cm', left: '2.5cm', right: '2.5cm' },
  })
  return new Uint8Array(buffer)
}
