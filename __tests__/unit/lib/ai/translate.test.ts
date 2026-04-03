import { describe, it, expect } from 'vitest'
import { SUPPORTED_LANGUAGES, getTranslationModel, validateTargetLanguage } from '@/lib/ai/translate'

describe('SUPPORTED_LANGUAGES', () => {
  it('contains at least 8 languages', () => {
    expect(Object.keys(SUPPORTED_LANGUAGES).length).toBeGreaterThanOrEqual(8)
  })

  it('each entry has label and Helsinki-NLP model', () => {
    for (const [, entry] of Object.entries(SUPPORTED_LANGUAGES)) {
      expect(typeof entry.label).toBe('string')
      expect(entry.model).toContain('Helsinki-NLP')
    }
  })
})

describe('validateTargetLanguage', () => {
  it('returns true for supported codes', () => {
    expect(validateTargetLanguage('es')).toBe(true)
    expect(validateTargetLanguage('fr')).toBe(true)
  })

  it('returns false for unsupported codes', () => {
    expect(validateTargetLanguage('klingon')).toBe(false)
    expect(validateTargetLanguage('')).toBe(false)
  })
})

describe('getTranslationModel', () => {
  it('returns correct model for supported language', () => {
    const model = getTranslationModel('es')
    expect(model).toContain('Helsinki-NLP')
  })

  it('throws for unsupported language', () => {
    expect(() => getTranslationModel('klingon')).toThrow()
  })
})
