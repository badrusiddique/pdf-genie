import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/ai/huggingface', () => ({
  hfInference: vi.fn(),
}))

import { hfInference } from '@/lib/ai/huggingface'
import type { GlossaryEntry } from '@/lib/ai/arabic-translate'

beforeEach(() => vi.clearAllMocks())

describe('translateArabicBlocks — glossary pre-pass', () => {
  it('replaces known Arabic entity in source before sending to model', async () => {
    vi.mocked(hfInference).mockResolvedValue([{ translation_text: 'Al-Faisaly' }])
    const { translateArabicBlocks } = await import('@/lib/ai/arabic-translate')

    const glossary: GlossaryEntry[] = [{ ar: 'الفيصلي', en: 'Al-Faisaly', source: 'reference' }]
    await translateArabicBlocks([{ text: 'الفيصلي' }], glossary, 'test-key')

    const call = vi.mocked(hfInference).mock.calls[0]
    const payload = call[1] as { inputs: string[] }
    expect(payload.inputs[0]).toBe('Al-Faisaly')
  })

  it('returns one translation per input block', async () => {
    vi.mocked(hfInference).mockResolvedValue([
      { translation_text: 'Match Report' },
      { translation_text: 'Jordan' },
    ])
    const { translateArabicBlocks } = await import('@/lib/ai/arabic-translate')

    const results = await translateArabicBlocks(
      [{ text: 'تقرير المباراة' }, { text: 'الأردن' }],
      [],
      'test-key',
    )
    expect(results).toHaveLength(2)
    expect(results[0]).toBe('Match Report')
    expect(results[1]).toBe('Jordan')
  })

  it('handles empty blocks array without calling API', async () => {
    const { translateArabicBlocks } = await import('@/lib/ai/arabic-translate')
    const results = await translateArabicBlocks([], [], 'test-key')
    expect(results).toEqual([])
    expect(hfInference).not.toHaveBeenCalled()
  })

  it('returns string result for each block even with glossary applied', async () => {
    vi.mocked(hfInference).mockResolvedValue([{ translation_text: 'Peanut.' }])
    const { translateArabicBlocks } = await import('@/lib/ai/arabic-translate')

    const glossary: GlossaryEntry[] = [{ ar: 'الفيصلي', en: 'Al-Faisaly', source: 'reference' }]
    const results = await translateArabicBlocks([{ text: 'الفيصلي' }], glossary, 'test-key')
    expect(results).toHaveLength(1)
    expect(typeof results[0]).toBe('string')
  })
})

describe('extractEntityCandidates', () => {
  it('returns candidates where model output differs from reference proper nouns', async () => {
    const { extractEntityCandidates } = await import('@/lib/ai/arabic-translate')

    const candidates = extractEntityCandidates(
      ['الفيصلي'],
      ['Peanut.'],
      'AL-FAISALY scored in the match at Amman International Stadium',
    )

    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates[0].ar).toBe('الفيصلي')
    expect(candidates[0].en_model).toBe('Peanut.')
  })

  it('does not suggest correction when model output matches reference', async () => {
    const { extractEntityCandidates } = await import('@/lib/ai/arabic-translate')

    const candidates = extractEntityCandidates(
      ['الفيصلي'],
      ['Al-Faisaly'],
      'Al-Faisaly scored in the match',
    )

    expect(candidates.filter(c => c.ar === 'الفيصلي')).toHaveLength(0)
  })

  it('deduplicates by Arabic source text', async () => {
    const { extractEntityCandidates } = await import('@/lib/ai/arabic-translate')

    const candidates = extractEntityCandidates(
      ['الفيصلي', 'الفيصلي'],
      ['Peanut.', 'Peanut.'],
      'AL-FAISALY won the match',
    )

    const forFaisaly = candidates.filter(c => c.ar === 'الفيصلي')
    expect(forFaisaly.length).toBeLessThanOrEqual(1)
  })

  it('caps results at 20 entries', async () => {
    const { extractEntityCandidates } = await import('@/lib/ai/arabic-translate')

    const arabicTexts = Array.from({ length: 30 }, (_, i) => `كلمة${i}`)
    const modelOuts = arabicTexts.map(() => 'wrong')
    const ref = 'ALPHA BETA GAMMA DELTA EPSILON ZETA ETA THETA IOTA KAPPA LAMBDA MU NU XI OMICRON PI RHO SIGMA TAU UPSILON'

    const candidates = extractEntityCandidates(arabicTexts, modelOuts, ref)
    expect(candidates.length).toBeLessThanOrEqual(20)
  })
})
