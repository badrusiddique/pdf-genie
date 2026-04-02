import { PDFDocument } from 'pdf-lib'

/**
 * Remove specific pages from a PDF.
 * @param pageNumbers - 1-indexed page numbers to remove
 */
export async function removePagesFromPdf(
  pdfBytes: Uint8Array,
  pageNumbers: number[],
): Promise<Uint8Array> {
  if (pageNumbers.length === 0) throw new Error('At least one page number is required')
  const doc = await PDFDocument.load(pdfBytes)
  const total = doc.getPageCount()

  const invalid = pageNumbers.filter(n => n < 1 || n > total)
  if (invalid.length > 0) throw new Error(`Invalid page numbers: ${invalid.join(', ')}`)

  const unique = [...new Set(pageNumbers)]
  if (unique.length >= total) throw new Error('Cannot remove all pages from a PDF')

  // Remove in reverse order to preserve indices
  const sorted = unique.sort((a, b) => b - a)
  for (const pageNum of sorted) {
    doc.removePage(pageNum - 1) // pdf-lib uses 0-indexed
  }
  return doc.save()
}
