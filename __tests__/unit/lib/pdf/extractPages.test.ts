import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { extractPagesFromPdf } from '@/lib/pdf/extractPages'

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

describe('extractPagesFromPdf', () => {
  it('throws on empty array', async () => {
    const pdf = await createTestPdf(3)
    await expect(extractPagesFromPdf(pdf, [])).rejects.toThrow('At least one page number is required')
  })

  it('throws on invalid page numbers (out of bounds)', async () => {
    const pdf = await createTestPdf(3)
    await expect(extractPagesFromPdf(pdf, [5])).rejects.toThrow('Invalid page numbers')
  })

  it('throws on invalid page number (zero or negative)', async () => {
    const pdf = await createTestPdf(3)
    await expect(extractPagesFromPdf(pdf, [0])).rejects.toThrow('Invalid page numbers')
  })

  it('extracts single page correctly', async () => {
    const pdf = await createTestPdf(5)
    const result = await extractPagesFromPdf(pdf, [3])
    expect(await getPageCount(result)).toBe(1)
  })

  it('extracts multiple pages in specified order', async () => {
    const pdf = await createTestPdf(5)
    const result = await extractPagesFromPdf(pdf, [1, 3, 5])
    expect(await getPageCount(result)).toBe(3)
  })

  it('deduplicates page numbers (extracts each page once)', async () => {
    const pdf = await createTestPdf(5)
    const result = await extractPagesFromPdf(pdf, [2, 2, 4, 4])
    expect(await getPageCount(result)).toBe(2)
  })
})
