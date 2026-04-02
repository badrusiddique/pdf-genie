import { describe, it, expect } from 'vitest'
import { compressPdf } from '@/lib/pdf/compress'
import { createTestPdf } from './helpers'
import { PDFDocument } from 'pdf-lib'

describe('compressPdf', () => {
  it('returns valid PDF bytes', async () => {
    const pdf = await createTestPdf(1)
    const result = await compressPdf(pdf)
    expect(result.compressed).toBeInstanceOf(Uint8Array)
    expect(result.compressed.length).toBeGreaterThan(0)
  })

  it('returns originalSize matching input', async () => {
    const pdf = await createTestPdf(2)
    const result = await compressPdf(pdf)
    expect(result.originalSize).toBe(pdf.length)
  })

  it('output is a valid loadable PDF', async () => {
    const pdf = await createTestPdf(1)
    const result = await compressPdf(pdf)
    // Should load without throwing
    const doc = await PDFDocument.load(result.compressed)
    expect(doc.getPageCount()).toBe(1)
  })

  it('accepts all three compression levels without throwing', async () => {
    const pdf = await createTestPdf(1)
    await expect(compressPdf(pdf, 'extreme')).resolves.toBeDefined()
    await expect(compressPdf(pdf, 'recommended')).resolves.toBeDefined()
    await expect(compressPdf(pdf, 'less')).resolves.toBeDefined()
  })

  it('throws on invalid PDF bytes', async () => {
    const invalid = new Uint8Array([0x00, 0x01, 0x02, 0x03])
    await expect(compressPdf(invalid)).rejects.toThrow()
  })

  it('compressedSize reflects actual output size', async () => {
    const pdf = await createTestPdf(3)
    const result = await compressPdf(pdf)
    expect(result.compressedSize).toBe(result.compressed.length)
  })
})
