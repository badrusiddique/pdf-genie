import { describe, it, expect, vi } from 'vitest'
import { chunkText } from '@/lib/pdf/extractText'

// Mock pdfjs-dist to avoid worker and browser API issues in test env
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'mocked text content' }],
        }),
      }),
    }),
  }),
}))

describe('chunkText', () => {
  it('returns single chunk for short text', () => {
    const chunks = chunkText('hello world', 100)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe('hello world')
  })

  it('splits long text into word-boundary chunks', () => {
    const words = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ')
    const chunks = chunkText(words, 50)
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach(chunk => {
      expect(chunk.split(' ').length).toBeLessThanOrEqual(55)
    })
  })

  it('returns empty array for empty string', () => {
    expect(chunkText('', 100)).toEqual([])
  })

  it('returns empty array for whitespace-only string', () => {
    expect(chunkText('   ', 100)).toEqual([])
  })
})

describe('extractPdfText - input validation', () => {
  it('throws for empty input', async () => {
    const { extractPdfText } = await import('@/lib/pdf/extractText')
    await expect(extractPdfText(new Uint8Array(0))).rejects.toThrow()
  })

  it('throws for non-PDF bytes', async () => {
    const { extractPdfText } = await import('@/lib/pdf/extractText')
    await expect(extractPdfText(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow()
  })

  it('extracts text from valid PDF bytes (mocked pdfjs)', async () => {
    const { extractPdfText } = await import('@/lib/pdf/extractText')
    const validPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34])
    const result = await extractPdfText(validPdf)
    expect(typeof result).toBe('string')
  })
})
