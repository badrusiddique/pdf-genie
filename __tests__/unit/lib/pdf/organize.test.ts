import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { organizePdf } from '@/lib/pdf/organize'

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

describe('organizePdf', () => {
  it('throws on empty operations', async () => {
    const pdf = await createTestPdf(3)
    await expect(organizePdf(pdf, [])).rejects.toThrow('At least one page operation is required')
  })

  it('throws on invalid source index (negative)', async () => {
    const pdf = await createTestPdf(3)
    await expect(organizePdf(pdf, [{ sourceIndex: -1 }])).rejects.toThrow('Invalid page indices')
  })

  it('throws on invalid source index (out of bounds)', async () => {
    const pdf = await createTestPdf(3)
    await expect(organizePdf(pdf, [{ sourceIndex: 5 }])).rejects.toThrow('Invalid page indices')
  })

  it('reorders pages correctly — result has specified page count', async () => {
    const pdf = await createTestPdf(4)
    // Reverse page order: [3,2,1,0] (0-indexed)
    const result = await organizePdf(pdf, [
      { sourceIndex: 3 },
      { sourceIndex: 2 },
      { sourceIndex: 1 },
      { sourceIndex: 0 },
    ])
    expect(await getPageCount(result)).toBe(4)
  })

  it('deletes pages by omitting them from operations', async () => {
    const pdf = await createTestPdf(5)
    // Only include pages 0, 2, 4 (0-indexed) — skips pages 1, 3
    const result = await organizePdf(pdf, [
      { sourceIndex: 0 },
      { sourceIndex: 2 },
      { sourceIndex: 4 },
    ])
    expect(await getPageCount(result)).toBe(3)
  })

  it('applies rotation to specific pages', async () => {
    const pdf = await createTestPdf(3)
    const result = await organizePdf(pdf, [
      { sourceIndex: 0, rotation: 90 },
      { sourceIndex: 1 },
      { sourceIndex: 2, rotation: 180 },
    ])
    // Verify it produces a valid PDF with correct page count
    expect(await getPageCount(result)).toBe(3)
    // Verify the rotation is applied on the correct pages
    const doc = await PDFDocument.load(result)
    expect(doc.getPage(0).getRotation().angle).toBe(90)
    expect(doc.getPage(1).getRotation().angle).toBe(0)
    expect(doc.getPage(2).getRotation().angle).toBe(180)
  })
})
