import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { rebuildPdf } from '@/lib/pdf/layout-reconstructor'
import type { TextBlock } from '@/lib/pdf/layout-extractor'
import { createTestPdf } from './helpers'

describe('rebuildPdf', () => {
  it('returns valid PDF bytes with correct magic header', async () => {
    const source = await createTestPdf(1)
    const result = await rebuildPdf(source, [], [])

    expect(result).toBeInstanceOf(Uint8Array)
    expect(result[0]).toBe(0x25) // %
    expect(result[1]).toBe(0x50) // P
  })

  it('output has same page count as source', async () => {
    const source = await createTestPdf(3)
    const result = await rebuildPdf(source, [], [])

    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(3)
  })

  it('inserts translated text for a block without throwing', async () => {
    const source = await createTestPdf(1)
    const blocks: TextBlock[] = [
      { page: 0, bbox: [50, 700, 200, 720], text: 'مرحبا', fontSize: 12 },
    ]
    const result = await rebuildPdf(source, blocks, ['Hello'])
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('skips blocks whose translation is a placeholder', async () => {
    const source = await createTestPdf(1)
    const blocks: TextBlock[] = [
      { page: 0, bbox: [50, 700, 200, 720], text: 'مرحبا', fontSize: 12 },
    ]
    const result = await rebuildPdf(source, blocks, ['[Translation error]'])
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(1)
  })

  it('handles blocks on multiple pages', async () => {
    const source = await createTestPdf(2)
    const blocks: TextBlock[] = [
      { page: 0, bbox: [50, 700, 200, 720], text: 'مرحبا', fontSize: 12 },
      { page: 1, bbox: [50, 700, 200, 720], text: 'الأردن', fontSize: 12 },
    ]
    const result = await rebuildPdf(source, blocks, ['Hello', 'Jordan'])
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(2)
  })

  it('handles more translations than blocks without throwing', async () => {
    const source = await createTestPdf(1)
    const result = await rebuildPdf(source, [], ['extra1', 'extra2'])
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(1)
  })

  it('handles page index out of range gracefully', async () => {
    const source = await createTestPdf(1)
    const blocks: TextBlock[] = [
      { page: 5, bbox: [50, 700, 200, 720], text: 'مرحبا', fontSize: 12 },
    ]
    await expect(rebuildPdf(source, blocks, ['Hello'])).resolves.toBeInstanceOf(Uint8Array)
  })
})
