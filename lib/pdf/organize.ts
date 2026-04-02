import { PDFDocument, degrees } from 'pdf-lib'

export interface PageOperation {
  sourceIndex: number   // 0-indexed original page index
  rotation?: 0 | 90 | 180 | 270  // rotation in degrees
}

/**
 * Reorganize PDF pages — reorder, rotate, and/or delete pages.
 * @param operations - ordered list of page operations. Omitting a page deletes it.
 */
export async function organizePdf(
  pdfBytes: Uint8Array,
  operations: PageOperation[],
): Promise<Uint8Array> {
  if (operations.length === 0) throw new Error('At least one page operation is required')
  if (pdfBytes.length < 4 || pdfBytes[0] !== 0x25 || pdfBytes[1] !== 0x50 || pdfBytes[2] !== 0x44 || pdfBytes[3] !== 0x46) {
    throw new Error('Input is not a valid PDF file')
  }
  const source = await PDFDocument.load(pdfBytes)
  const total = source.getPageCount()

  const invalid = operations.filter(op => op.sourceIndex < 0 || op.sourceIndex >= total)
  if (invalid.length > 0) {
    throw new Error(`Invalid page indices: ${invalid.map(op => op.sourceIndex).join(', ')}`)
  }

  const doc = await PDFDocument.create()
  const indices = operations.map(op => op.sourceIndex)
  const pages = await doc.copyPages(source, indices)

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const op = operations[i]
    if (op.rotation != null && op.rotation !== 0) {
      page.setRotation(degrees(op.rotation))
    }
    doc.addPage(page)
  }
  return doc.save()
}
