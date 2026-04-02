import { PDFDocument } from 'pdf-lib'

/**
 * Merge multiple PDFs into a single document.
 * Pages are added in the order provided.
 */
export async function mergePdfs(pdfs: Uint8Array[]): Promise<Uint8Array> {
  if (pdfs.length === 0) throw new Error('At least one PDF is required')
  if (pdfs.length === 1) return pdfs[0]

  const merged = await PDFDocument.create()
  for (const pdfBytes of pdfs) {
    if (pdfBytes.length < 4 || pdfBytes[0] !== 0x25 || pdfBytes[1] !== 0x50 || pdfBytes[2] !== 0x44 || pdfBytes[3] !== 0x46) {
      throw new Error('Input is not a valid PDF file')
    }
    const doc = await PDFDocument.load(pdfBytes)
    const pages = await merged.copyPages(doc, doc.getPageIndices())
    for (const page of pages) merged.addPage(page)
  }
  return merged.save()
}
