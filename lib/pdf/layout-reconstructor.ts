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
    if (!translation || translation.startsWith('[')) continue
    const list = byPage.get(blocks[i].page) ?? []
    list.push({ block: blocks[i], translation })
    byPage.set(blocks[i].page, list)
  }

  for (const [pageIdx, items] of byPage) {
    const page = pages[pageIdx]
    if (!page) continue

    const { width: pageWidth, height: pageHeight } = page.getSize()

    for (const { block, translation } of items) {
      const [x0, y0, x1, y1] = block.bbox
      const boxWidth = Math.max(1, x1 - x0)

      // Clamp white rectangle to exact Arabic bbox — no expansion to avoid clipping adjacent content
      const rectX  = Math.max(0, x0)
      const rectY  = Math.max(0, Math.min(y0, pageHeight))
      const rectY1 = Math.max(0, Math.min(y1, pageHeight))
      const rectH  = Math.max(1, rectY1 - rectY)
      const rectW  = Math.min(boxWidth, pageWidth - rectX)

      // 1. White rectangle — exact bbox, no expansion, to preserve adjacent content
      page.drawRectangle({
        x: rectX,
        y: rectY,
        width: rectW,
        height: rectH,
        color: rgb(1, 1, 1),
        borderWidth: 0,
      })

      // 2. Scale font to fit English text inside the original box width
      let fontSize = Math.max(5, Math.min(block.fontSize, rectH * 0.82, 18))
      const rawWidth = font.widthOfTextAtSize(translation, fontSize)
      if (rawWidth > boxWidth && rawWidth > 0) {
        fontSize = Math.max(5, fontSize * (boxWidth / rawWidth) * 0.92)
      }

      // 3. Truncate to fit — no maxWidth on drawText (that wraps vertically into other content)
      let display = translation
      if (font.widthOfTextAtSize(display, fontSize) > boxWidth) {
        while (display.length > 2 && font.widthOfTextAtSize(display + '…', fontSize) > boxWidth) {
          display = display.slice(0, -1)
        }
        display += '…'
      }

      try {
        page.drawText(display, {
          x: x0,
          y: rectY + 2,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        })
      } catch {
        // Skip if pdf-lib rejects the draw (e.g. zero-size box)
      }
    }
  }

  return doc.save({ useObjectStreams: true })
}
