import { describe, it, expect } from 'vitest'
import { prepareChunksForSummary, combineSummaries } from '@/lib/ai/summarize'

describe('prepareChunksForSummary', () => {
  it('returns empty array for empty text', () => {
    expect(prepareChunksForSummary('')).toEqual([])
  })

  it('returns empty array for whitespace-only', () => {
    expect(prepareChunksForSummary('   ')).toEqual([])
  })

  it('returns single chunk for short text with enough words', () => {
    const text = Array.from({ length: 15 }, (_, i) => `word${i}`).join(' ')
    const chunks = prepareChunksForSummary(text)
    expect(chunks).toHaveLength(1)
  })

  it('filters out chunks with fewer than 10 words', () => {
    const chunks = prepareChunksForSummary('too short')
    expect(chunks).toHaveLength(0)
  })

  it('splits long text into multiple chunks', () => {
    const longText = Array.from({ length: 1000 }, (_, i) => `word${i}`).join(' ')
    const chunks = prepareChunksForSummary(longText)
    expect(chunks.length).toBeGreaterThan(1)
  })
})

describe('combineSummaries', () => {
  it('returns single summary unchanged', () => {
    expect(combineSummaries(['Only one part.'])).toBe('Only one part.')
  })

  it('joins multiple summaries', () => {
    const result = combineSummaries(['Part 1.', 'Part 2.'])
    expect(result).toContain('Part 1.')
    expect(result).toContain('Part 2.')
  })
})
