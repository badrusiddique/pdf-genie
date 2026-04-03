import { describe, it, expect } from 'vitest'
import { findRelevantChunks, buildQaContext } from '@/lib/ai/qa'

const SAMPLE_TEXT = `
Chapter 1: Introduction
The pdf-genie project is a web application for manipulating PDF files.
It supports merging, splitting, and compressing PDFs with a dark atmospheric theme.

Chapter 2: Features
The application includes over 30 tools organized in 7 categories.
Each tool has a dedicated page with a file upload interface and cyan accent colors.
The design uses Fraunces display font and Instrument Sans for UI text.
`

describe('findRelevantChunks', () => {
  it('returns chunks containing question keywords', () => {
    const chunks = findRelevantChunks('What tools does it support?', SAMPLE_TEXT, 3)
    expect(chunks.length).toBeGreaterThan(0)
    const joined = chunks.join(' ').toLowerCase()
    expect(joined).toMatch(/tool|support|merge|split|compress/)
  })

  it('returns empty array for empty context', () => {
    expect(findRelevantChunks('question?', '', 3)).toEqual([])
  })

  it('limits to maxChunks', () => {
    const chunks = findRelevantChunks('pdf', SAMPLE_TEXT, 2)
    expect(chunks.length).toBeLessThanOrEqual(2)
  })
})

describe('buildQaContext', () => {
  it('joins chunks with separators', () => {
    const result = buildQaContext(['chunk one', 'chunk two'])
    expect(result).toContain('chunk one')
    expect(result).toContain('chunk two')
  })

  it('returns empty string for empty array', () => {
    expect(buildQaContext([])).toBe('')
  })
})
