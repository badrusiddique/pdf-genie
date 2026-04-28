import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { TextBlock } from './layout-extractor'

export async function rebuildPdf(
  sourceBytes: Uint8Array,
  blocks: TextBlock[],
  translations: string[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()

  // Group by page for efficient iteration
  const byPage = new Map<number, Array<{ block: TextBlock; translation: string }>>()
  for (let i = 0; i < blocks.length; i++) {
    const translation = translations[i] ?? ''
    if (!translation || translation.startsWith('[')) continue // skip error placeholders
    const list = byPage.get(blocks[i].page) ?? []
    list.push({ block: blocks[i], translation })
    byPage.set(blocks[i].page, list)
  }

  for (const [pageIdx, items] of byPage) {
    const page = pages[pageIdx]
    if (!page) continue // skip out-of-range page references

    const { height: pageHeight } = page.getSize()

    for (const { block, translation } of items) {
      const [x0, y0, x1, y1] = block.bbox
      const boxWidth = Math.max(1, x1 - x0)
      // Clamp y coordinates to page bounds
      const drawY0 = Math.max(0, Math.min(y0, pageHeight))
      const drawY1 = Math.max(0, Math.min(y1, pageHeight))
      const drawHeight = Math.max(1, drawY1 - drawY0)

      // 1. White rectangle to blank the Arabic text
      page.drawRectangle({
        x: x0,
        y: drawY0,
        width: boxWidth,
        height: drawHeight,
        color: rgb(1, 1, 1),
        borderWidth: 0,
      })

      // 2. Insert English text — font size matched to original, clamped for safety
      const fontSize = Math.max(6, Math.min(block.fontSize, drawHeight * 0.85, 24))
      try {
        page.drawText(translation, {
          x: x0,
          y: drawY0 + 2,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          maxWidth: boxWidth,
          lineHeight: fontSize * 1.2,
        })
      } catch {
        // Best-effort — skip if text can't be inserted (e.g. oversized)
      }
    }
  }

  return doc.save({ useObjectStreams: true })
}
