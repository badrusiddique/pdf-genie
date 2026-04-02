import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { removePagesFromPdf } from '@/lib/pdf/removePages'

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

describe('removePagesFromPdf', () => {
  it('throws on empty page numbers array', async () => {
    const pdf = await createTestPdf(3)
    await expect(removePagesFromPdf(pdf, [])).rejects.toThrow('At least one page number is required')
  })

  it('throws on invalid page number (too high)', async () => {
    const pdf = await createTestPdf(3)
    await expect(removePagesFromPdf(pdf, [5])).rejects.toThrow('Invalid page numbers')
  })

  it('throws on invalid page number (zero or negative)', async () => {
    const pdf = await createTestPdf(3)
    await expect(removePagesFromPdf(pdf, [0])).rejects.toThrow('Invalid page numbers')
  })

  it('throws when trying to remove all pages', async () => {
    const pdf = await createTestPdf(3)
    await expect(removePagesFromPdf(pdf, [1, 2, 3])).rejects.toThrow('Cannot remove all pages')
  })

  it('removes single page correctly (result has totalPages - 1 pages)', async () => {
    const pdf = await createTestPdf(4)
    const result = await removePagesFromPdf(pdf, [2])
    expect(await getPageCount(result)).toBe(3)
  })

  it('removes multiple pages correctly', async () => {
    const pdf = await createTestPdf(5)
    const result = await removePagesFromPdf(pdf, [1, 3, 5])
    expect(await getPageCount(result)).toBe(2)
  })

  it('handles duplicate page numbers gracefully (removes each page once)', async () => {
    const pdf = await createTestPdf(4)
    const result = await removePagesFromPdf(pdf, [2, 2, 2])
    expect(await getPageCount(result)).toBe(3)
  })
})
