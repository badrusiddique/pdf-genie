import { describe, it, expect } from 'vitest'
import { imagesToPdf } from '@/lib/pdf/scanToPdf'
import { getPageCount } from './helpers'

// Minimal 1x1 transparent PNG (67 bytes)
const MINIMAL_PNG = new Uint8Array([
  0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A, // PNG signature
  0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52, // IHDR chunk length + type
  0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01, // 1x1 dimensions
  0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53, // bit depth, color type, etc
  0xDE,0x00,0x00,0x00,0x0C,0x49,0x44,0x41, // IDAT chunk
  0x54,0x08,0xD7,0x63,0xF8,0xCF,0xC0,0x00,
  0x00,0x00,0x02,0x00,0x01,0xE2,0x21,0xBC,
  0x33,0x00,0x00,0x00,0x00,0x49,0x45,0x4E, // IEND chunk
  0x44,0xAE,0x42,0x60,0x82
])

describe('imagesToPdf', () => {
  it('throws on empty array', async () => {
    await expect(imagesToPdf([])).rejects.toThrow('At least one image is required')
  })

  it('creates PDF with correct page count from multiple images', async () => {
    const images = [
      { bytes: MINIMAL_PNG, mimeType: 'image/png' as const },
      { bytes: MINIMAL_PNG, mimeType: 'image/png' as const },
      { bytes: MINIMAL_PNG, mimeType: 'image/png' as const },
    ]
    const result = await imagesToPdf(images)
    expect(await getPageCount(result)).toBe(3)
  })

  it('creates valid PDF bytes (starts with %PDF magic bytes)', async () => {
    const images = [{ bytes: MINIMAL_PNG, mimeType: 'image/png' as const }]
    const result = await imagesToPdf(images)
    // %PDF in ASCII: 0x25, 0x50, 0x44, 0x46
    expect(result[0]).toBe(0x25) // %
    expect(result[1]).toBe(0x50) // P
    expect(result[2]).toBe(0x44) // D
    expect(result[3]).toBe(0x46) // F
  })

  it('produces valid PDF with pageSize: a4', async () => {
    const images = [{ bytes: MINIMAL_PNG, mimeType: 'image/png' as const }]
    const result = await imagesToPdf(images, { pageSize: 'a4' })
    expect(await getPageCount(result)).toBe(1)
  })

  it('produces valid PDF with orientation: landscape', async () => {
    const images = [{ bytes: MINIMAL_PNG, mimeType: 'image/png' as const }]
    const result = await imagesToPdf(images, { orientation: 'landscape' })
    expect(await getPageCount(result)).toBe(1)
  })

  it('produces valid PDF with margin: small on a fixed page size', async () => {
    const images = [{ bytes: MINIMAL_PNG, mimeType: 'image/png' as const }]
    // Use a4 so the 20px margin applies to a 595×842 page, not the 1×1 image dimensions
    const result = await imagesToPdf(images, { pageSize: 'a4', margin: 'small' })
    expect(await getPageCount(result)).toBe(1)
  })

  it('throws when tiny image with pageSize fit and margin big makes draw area non-positive', async () => {
    // MINIMAL_PNG is 1x1px; with margin: 'big' (40px each side), drawW = 1 - 80 <= 0
    const images = [{ bytes: MINIMAL_PNG, mimeType: 'image/png' as const }]
    await expect(imagesToPdf(images, { pageSize: 'fit', margin: 'big' })).rejects.toThrow(
      'Image is too small',
    )
  })
})
