import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TextBlock } from '@/lib/pdf/layout-extractor'

vi.mock('unpdf', () => ({
  getDocumentProxy: vi.fn(),
}))

import * as unpdfModule from 'unpdf'

function makeItem(str: string, x: number, y: number, fontSize: number, width: number) {
  return { str, transform: [fontSize, 0, 0, fontSize, x, y], width, height: fontSize }
}

function makeMockDoc(items: ReturnType<typeof makeItem>[]) {
  return {
    numPages: 1,
    getPage: vi.fn().mockResolvedValue({
      getTextContent: vi.fn().mockResolvedValue({ items }),
    }),
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

describe('extractArabicBlocks', () => {
  it('returns only Arabic spans', async () => {
    vi.mocked(unpdfModule.getDocumentProxy).mockResolvedValue(
      makeMockDoc([
        makeItem('مرحبا', 100, 200, 11, 50),
        makeItem('Hello', 200, 200, 11, 40),
      ]) as unknown as Awaited<ReturnType<typeof unpdfModule.getDocumentProxy>>,
    )

    const { extractArabicBlocks } = await import('@/lib/pdf/layout-extractor')
    const blocks: TextBlock[] = await extractArabicBlocks(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text).toBe('مرحبا')
  })

  it('includes short Arabic words (no minimum length filter)', async () => {
    vi.mocked(unpdfModule.getDocumentProxy).mockResolvedValue(
      makeMockDoc([
        makeItem('ال', 100, 200, 11, 20),
        makeItem('الفيصلي', 200, 200, 11, 60),
      ]) as unknown as Awaited<ReturnType<typeof unpdfModule.getDocumentProxy>>,
    )

    const { extractArabicBlocks } = await import('@/lib/pdf/layout-extractor')
    const blocks: TextBlock[] = await extractArabicBlocks(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
    // Short-span filter removed to support single presentation-form glyphs
    expect(blocks.length).toBeGreaterThanOrEqual(1)
    expect(blocks.map(b => b.text)).toContain('الفيصلي')
  })

  it('returns correct page index (0-indexed)', async () => {
    vi.mocked(unpdfModule.getDocumentProxy).mockResolvedValue(
      makeMockDoc([makeItem('مرحبا', 100, 200, 11, 50)]) as unknown as Awaited<
        ReturnType<typeof unpdfModule.getDocumentProxy>
      >,
    )

    const { extractArabicBlocks } = await import('@/lib/pdf/layout-extractor')
    const blocks: TextBlock[] = await extractArabicBlocks(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
    expect(blocks[0].page).toBe(0)
  })

  it('computes bbox x0/x1 from transform and width', async () => {
    vi.mocked(unpdfModule.getDocumentProxy).mockResolvedValue(
      makeMockDoc([makeItem('مرحبا', 100, 200, 11, 50)]) as unknown as Awaited<
        ReturnType<typeof unpdfModule.getDocumentProxy>
      >,
    )

    const { extractArabicBlocks } = await import('@/lib/pdf/layout-extractor')
    const blocks: TextBlock[] = await extractArabicBlocks(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
    const [x0, , x1] = blocks[0].bbox
    expect(x0).toBe(100)
    expect(x1).toBe(150) // x0 + width
  })

  it('bbox y0 is below baseline and y1 is above baseline', async () => {
    vi.mocked(unpdfModule.getDocumentProxy).mockResolvedValue(
      makeMockDoc([makeItem('مرحبا', 100, 200, 11, 50)]) as unknown as Awaited<
        ReturnType<typeof unpdfModule.getDocumentProxy>
      >,
    )

    const { extractArabicBlocks } = await import('@/lib/pdf/layout-extractor')
    const blocks: TextBlock[] = await extractArabicBlocks(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
    const [, y0, , y1] = blocks[0].bbox
    expect(y0).toBeLessThan(200)
    expect(y1).toBeGreaterThan(200)
  })

  it('returns empty array when no Arabic text found', async () => {
    vi.mocked(unpdfModule.getDocumentProxy).mockResolvedValue(
      makeMockDoc([
        makeItem('Hello', 100, 200, 11, 40),
        makeItem('World', 200, 200, 11, 45),
      ]) as unknown as Awaited<ReturnType<typeof unpdfModule.getDocumentProxy>>,
    )

    const { extractArabicBlocks } = await import('@/lib/pdf/layout-extractor')
    const blocks: TextBlock[] = await extractArabicBlocks(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
    expect(blocks).toHaveLength(0)
  })
})
