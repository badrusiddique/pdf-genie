import { describe, it, expect, vi } from 'vitest'
import { chunkText } from '@/lib/pdf/extractText'

// extractPdfText uses pdfjs-dist with require() — it works in Node/API routes
// but may not load cleanly in vitest JSDOM. Test chunkText (pure) + basic smoke test.

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'test content' }]
        })
      })
    })
  })
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
  it('throws for empty input without calling pdfjs', async () => {
    const { extractPdfText } = await import('@/lib/pdf/extractText')
    await expect(extractPdfText(new Uint8Array(0))).rejects.toThrow()
  })

  it('throws for non-PDF bytes without calling pdfjs', async () => {
    const { extractPdfText } = await import('@/lib/pdf/extractText')
    await expect(extractPdfText(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow()
  })
})
