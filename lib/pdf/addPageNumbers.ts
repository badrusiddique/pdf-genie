import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export type NumberPosition = 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center' | 'top-left' | 'top-right'

export interface PageNumberOptions {
  position: NumberPosition
  fontSize: number
  startFrom: number   // first page number (usually 1)
  margin: number      // points from edge
  format: 'n' | 'Page n' | 'Page n of p'
}

function formatNumber(n: number, total: number, fmt: PageNumberOptions['format']): string {
  if (fmt === 'Page n') return `Page ${n}`
  if (fmt === 'Page n of p') return `Page ${n} of ${total}`
  return String(n)
}

export async function addPageNumbers(bytes: Uint8Array, opts: PageNumberOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  const total = pages.length

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const { width, height } = page.getSize()
    const label = formatNumber(i + opts.startFrom, total + opts.startFrom - 1, opts.format)
    const textWidth = font.widthOfTextAtSize(label, opts.fontSize)

    let x: number

    const pos = opts.position
    const isBottom = pos.startsWith('bottom')
    const y = isBottom ? opts.margin : height - opts.margin - opts.fontSize

    if (pos.endsWith('center')) {
      x = width / 2 - textWidth / 2
    } else if (pos.endsWith('left')) {
      x = opts.margin
    } else {
      x = width - textWidth - opts.margin
    }

    page.drawText(label, {
      x,
      y,
      size: opts.fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    })
  }

  return doc.save()
}
