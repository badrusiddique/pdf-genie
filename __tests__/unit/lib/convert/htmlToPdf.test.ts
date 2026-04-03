import { describe, it, expect } from 'vitest'
import { buildHtmlDocument } from '@/lib/convert/htmlToPdf'

describe('buildHtmlDocument', () => {
  it('wraps a bare HTML fragment in a full document', () => {
    const result = buildHtmlDocument('<p>Hello</p>')
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).toContain('<p>Hello</p>')
    expect(result).toMatch(/<html[\s>]/)
    expect(result).toContain('</html>')
  })

  it('returns a full document unchanged if it already has an <html> tag', () => {
    const full = '<!DOCTYPE html><html><body><p>test</p></body></html>'
    expect(buildHtmlDocument(full)).toBe(full)
  })

  it('injects print-friendly CSS into wrapped fragments', () => {
    const result = buildHtmlDocument('<p>content</p>')
    expect(result).toContain('<style>')
    expect(result).toContain('font-family')
  })
})
