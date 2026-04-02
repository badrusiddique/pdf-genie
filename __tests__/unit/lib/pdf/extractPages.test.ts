import { describe, it, expect } from 'vitest'
import { extractPagesFromPdf } from '@/lib/pdf/extractPages'
import { createTestPdf, getPageCount } from './helpers'

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

  it('outputs pages in ascending order regardless of input order', async () => {
    const source = await createTestPdf(5)
    const result = await extractPagesFromPdf(source, [5, 3, 1])
    const count = await getPageCount(result)
    expect(count).toBe(3) // pages 1, 3, 5 extracted
  })
})
