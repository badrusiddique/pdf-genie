import { PDFDocument } from 'pdf-lib'

export type PageSize = 'fit' | 'a4' | 'letter'
export type PageOrientation = 'portrait' | 'landscape'
export type PageMargin = 'none' | 'small' | 'big'

export interface ScanToPdfOptions {
  pageSize?: PageSize
  orientation?: PageOrientation
  margin?: PageMargin
}

const PAGE_DIMENSIONS: Record<PageSize, [number, number]> = {
  fit: [0, 0],     // special: use image dimensions
  a4: [595, 842],
  letter: [612, 792],
}

const MARGIN_VALUES: Record<PageMargin, number> = {
  none: 0,
  small: 20,
  big: 40,
}

/**
 * Convert image bytes to a PDF document.
 * Each image becomes one page.
 */
export async function imagesToPdf(
  imageBuffers: { bytes: Uint8Array; mimeType: 'image/jpeg' | 'image/png' }[],
  options: ScanToPdfOptions = {},
): Promise<Uint8Array> {
  if (imageBuffers.length === 0) throw new Error('At least one image is required')

  const { pageSize = 'fit', orientation = 'portrait', margin = 'none' } = options
  const doc = await PDFDocument.create()
  const marginPx = MARGIN_VALUES[margin]

  for (const { bytes, mimeType } of imageBuffers) {
    const image = mimeType === 'image/png'
      ? await doc.embedPng(bytes)
      : await doc.embedJpg(bytes)

    let [w, h] = pageSize === 'fit'
      ? [image.width, image.height]
      : PAGE_DIMENSIONS[pageSize]

    if (orientation === 'landscape') [w, h] = [h, w]

    const page = doc.addPage([w, h])
    const drawW = w - marginPx * 2
    const drawH = h - marginPx * 2
    const scaled = image.scaleToFit(drawW, drawH)
    page.drawImage(image, {
      x: marginPx + (drawW - scaled.width) / 2,
      y: marginPx + (drawH - scaled.height) / 2,
      width: scaled.width,
      height: scaled.height,
    })
  }
  return doc.save()
}
