import { describe, it, expect } from 'vitest'
import { docxToHtml } from '@/lib/convert/wordToPdf'

// We only unit-test the mammoth conversion step (no browser needed).
// Full HTML→PDF pipeline is covered by E2E.
describe('docxToHtml', () => {
  it('throws for empty input', async () => {
    await expect(docxToHtml(new Uint8Array(0))).rejects.toThrow()
  })

  it('throws for non-DOCX bytes (PDF magic bytes)', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00])
    await expect(docxToHtml(pdfBytes)).rejects.toThrow()
  })
})
