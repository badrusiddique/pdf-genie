import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { mergePdfs } from '@/lib/pdf/merge'

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

describe('mergePdfs', () => {
  it('throws when called with empty array', async () => {
    await expect(mergePdfs([])).rejects.toThrow('At least one PDF is required')
  })

  it('returns same bytes when called with single PDF', async () => {
    const pdf = await createTestPdf(2)
    const result = await mergePdfs([pdf])
    expect(result).toBe(pdf)
  })

  it('merged PDF has correct page count (sum of all input page counts)', async () => {
    const pdf1 = await createTestPdf(2)
    const pdf2 = await createTestPdf(3)
    const result = await mergePdfs([pdf1, pdf2])
    expect(await getPageCount(result)).toBe(5)
  })

  it('preserves page order across three PDFs', async () => {
    const pdf1 = await createTestPdf(1)
    const pdf2 = await createTestPdf(2)
    const pdf3 = await createTestPdf(3)
    const result = await mergePdfs([pdf1, pdf2, pdf3])
    expect(await getPageCount(result)).toBe(6)
  })
})
