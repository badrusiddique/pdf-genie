import { describe, it, expect, vi } from 'vitest'
import { chunkText } from '@/lib/pdf/extractText'

// Mock unpdf to avoid loading pdfjs-dist worker in test environment
vi.mock('unpdf', () => ({
  extractText: vi.fn().mockResolvedValue({ totalPages: 1, text: 'mocked extracted text content' }),
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

  it('extracts text from valid PDF (mocked)', async () => {
    const { extractPdfText } = await import('@/lib/pdf/extractText')
    const validHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D])
    const result = await extractPdfText(validHeader)
    expect(typeof result).toBe('string')
  })
})
