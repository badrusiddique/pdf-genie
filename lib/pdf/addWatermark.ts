import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'

export interface WatermarkOptions {
  text: string
  opacity: number      // 0-1
  rotation: number     // degrees
  fontSize: number
  color: [number, number, number]  // RGB 0-1
}

export async function addWatermark(bytes: Uint8Array, opts: WatermarkOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.HelveticaBold)

  const [r, g, b] = opts.color

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize()
    const textWidth = font.widthOfTextAtSize(opts.text, opts.fontSize)

    page.drawText(opts.text, {
      x: width / 2 - textWidth / 2,
      y: height / 2 - opts.fontSize / 2,
      size: opts.fontSize,
      font,
      color: rgb(r, g, b),
      opacity: opts.opacity,
      rotate: degrees(opts.rotation),
    })
  }

  return doc.save()
}
