import { formatFileSize, isWithinSizeLimit, getFileExtension } from '@/lib/file-utils'

describe('formatFileSize', () => {
  it('formats bytes', () => expect(formatFileSize(500)).toBe('500 B'))
  it('formats kilobytes', () => expect(formatFileSize(1536)).toBe('1.5 KB'))
  it('formats megabytes', () => expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB'))
})

describe('isWithinSizeLimit', () => {
  const makeFile = (sizeBytes: number) => new File(['x'.repeat(sizeBytes)], 'test.pdf', { type: 'application/pdf' })
  it('returns true when within limit', () => expect(isWithinSizeLimit(makeFile(5 * 1024 * 1024), 10)).toBe(true))
  it('returns false when over limit', () => expect(isWithinSizeLimit(makeFile(15 * 1024 * 1024), 10)).toBe(false))
  it('returns true at exact limit', () => expect(isWithinSizeLimit(makeFile(10 * 1024 * 1024), 10)).toBe(true))
})

describe('getFileExtension', () => {
  it('returns pdf for pdf files', () => {
    const file = new File([''], 'document.pdf', { type: 'application/pdf' })
    expect(getFileExtension(file)).toBe('pdf')
  })
  it('returns empty string for no extension', () => {
    const file = new File([''], 'noextension', { type: '' })
    expect(getFileExtension(file)).toBe('')
  })
})
