import { PDFDocument } from 'pdf-lib'

/**
 * Extract specific pages into a new PDF.
 * Pages are always output in ascending page number order,
 * regardless of the order specified in pageNumbers.
 * Duplicate page numbers are silently deduplicated.
 * @param pageNumbers - 1-indexed page numbers to keep
 */
export async function extractPagesFromPdf(
  pdfBytes: Uint8Array,
  pageNumbers: number[],
): Promise<Uint8Array> {
  if (pageNumbers.length === 0) throw new Error('At least one page number is required')
  const source = await PDFDocument.load(pdfBytes)
  const total = source.getPageCount()

  const invalid = pageNumbers.filter(n => n < 1 || n > total)
  if (invalid.length > 0) throw new Error(`Invalid page numbers: ${invalid.join(', ')}`)

  const unique = [...new Set(pageNumbers)].sort((a, b) => a - b)
  const doc = await PDFDocument.create()
  const indices = unique.map(n => n - 1)
  const pages = await doc.copyPages(source, indices)
  for (const page of pages) doc.addPage(page)
  return doc.save()
}
