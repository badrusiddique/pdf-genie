import { PDFDocument } from 'pdf-lib'

export type SplitMode = 'range' | 'pages' | 'fixed'

export interface SplitRange {
  from: number  // 1-indexed
  to: number    // 1-indexed, inclusive
}

/**
 * Split a PDF into multiple PDFs by page ranges.
 * Each range becomes one output PDF.
 */
export async function splitPdfByRanges(
  pdfBytes: Uint8Array,
  ranges: SplitRange[],
): Promise<Uint8Array[]> {
  if (ranges.length === 0) throw new Error('At least one range is required')
  if (pdfBytes.length < 4 || pdfBytes[0] !== 0x25 || pdfBytes[1] !== 0x50 || pdfBytes[2] !== 0x44 || pdfBytes[3] !== 0x46) {
    throw new Error('Input is not a valid PDF file')
  }
  const source = await PDFDocument.load(pdfBytes)
  const totalPages = source.getPageCount()

  return Promise.all(
    ranges.map(async ({ from, to }) => {
      if (from < 1 || to > totalPages || from > to) {
        throw new Error(`Invalid range ${from}-${to} for document with ${totalPages} pages`)
      }
      const doc = await PDFDocument.create()
      const indices = Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i)
      const pages = await doc.copyPages(source, indices)
      for (const page of pages) doc.addPage(page)
      return doc.save()
    }),
  )
}

/**
 * Split a PDF into individual pages (one PDF per page).
 */
export async function splitPdfToPages(pdfBytes: Uint8Array): Promise<Uint8Array[]> {
  if (pdfBytes.length < 4 || pdfBytes[0] !== 0x25 || pdfBytes[1] !== 0x50 || pdfBytes[2] !== 0x44 || pdfBytes[3] !== 0x46) {
    throw new Error('Input is not a valid PDF file')
  }
  const source = await PDFDocument.load(pdfBytes)
  const count = source.getPageCount()
  return splitPdfByRanges(pdfBytes, Array.from({ length: count }, (_, i) => ({ from: i + 1, to: i + 1 })))
}

/**
 * Split a PDF into chunks of N pages each.
 */
export async function splitPdfIntoChunks(pdfBytes: Uint8Array, chunkSize: number): Promise<Uint8Array[]> {
  if (chunkSize < 1 || !Number.isInteger(chunkSize)) {
    throw new Error('Chunk size must be a positive integer')
  }
  if (pdfBytes.length < 4 || pdfBytes[0] !== 0x25 || pdfBytes[1] !== 0x50 || pdfBytes[2] !== 0x44 || pdfBytes[3] !== 0x46) {
    throw new Error('Input is not a valid PDF file')
  }
  const source = await PDFDocument.load(pdfBytes)
  const total = source.getPageCount()
  const ranges: SplitRange[] = []
  for (let i = 1; i <= total; i += chunkSize) {
    ranges.push({ from: i, to: Math.min(i + chunkSize - 1, total) })
  }
  return splitPdfByRanges(pdfBytes, ranges)
}
