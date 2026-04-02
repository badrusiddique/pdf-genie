import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { splitPdfByRanges, splitPdfToPages, splitPdfIntoChunks } from '@/lib/pdf/split'

async function createTestPdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([595, 842])
    page.drawText(`Page ${i + 1}`, { x: 50, y: 750, size: 14 })
  }
  return doc.save()
}

async function getPageCount(pdfBytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(pdfBytes)
  return doc.getPageCount()
}

describe('splitPdfByRanges', () => {
  it('throws on empty ranges', async () => {
    const pdf = await createTestPdf(3)
    await expect(splitPdfByRanges(pdf, [])).rejects.toThrow('At least one range is required')
  })

  it('returns 1 PDF with 3 pages when given range [1-3] from 5-page PDF', async () => {
    const pdf = await createTestPdf(5)
    const results = await splitPdfByRanges(pdf, [{ from: 1, to: 3 }])
    expect(results).toHaveLength(1)
    expect(await getPageCount(results[0])).toBe(3)
  })

  it('returns 2 PDFs with correct page counts for two ranges', async () => {
    const pdf = await createTestPdf(5)
    const results = await splitPdfByRanges(pdf, [{ from: 1, to: 2 }, { from: 3, to: 5 }])
    expect(results).toHaveLength(2)
    expect(await getPageCount(results[0])).toBe(2)
    expect(await getPageCount(results[1])).toBe(3)
  })

  it('throws on invalid range (out of bounds - to > totalPages)', async () => {
    const pdf = await createTestPdf(3)
    await expect(splitPdfByRanges(pdf, [{ from: 1, to: 10 }])).rejects.toThrow('Invalid range')
  })

  it('throws on invalid range (from > to)', async () => {
    const pdf = await createTestPdf(5)
    await expect(splitPdfByRanges(pdf, [{ from: 3, to: 1 }])).rejects.toThrow('Invalid range')
  })

  it('throws on invalid range (from < 1)', async () => {
    const pdf = await createTestPdf(5)
    await expect(splitPdfByRanges(pdf, [{ from: 0, to: 2 }])).rejects.toThrow('Invalid range')
  })
})

describe('splitPdfToPages', () => {
  it('returns 4 PDFs each with 1 page from a 4-page PDF', async () => {
    const pdf = await createTestPdf(4)
    const results = await splitPdfToPages(pdf)
    expect(results).toHaveLength(4)
    for (const result of results) {
      expect(await getPageCount(result)).toBe(1)
    }
  })
})

describe('splitPdfIntoChunks', () => {
  it('throws when chunkSize < 1', async () => {
    const pdf = await createTestPdf(3)
    await expect(splitPdfIntoChunks(pdf, 0)).rejects.toThrow('Chunk size must be at least 1')
  })

  it('on 7-page PDF with chunk size 3 gives 3 PDFs with [3,3,1] pages', async () => {
    const pdf = await createTestPdf(7)
    const results = await splitPdfIntoChunks(pdf, 3)
    expect(results).toHaveLength(3)
    expect(await getPageCount(results[0])).toBe(3)
    expect(await getPageCount(results[1])).toBe(3)
    expect(await getPageCount(results[2])).toBe(1)
  })
})
