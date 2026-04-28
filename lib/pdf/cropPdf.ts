import { PDFDocument } from 'pdf-lib'

export interface CropBox {
  x: number       // points from left
  y: number       // points from bottom
  width: number
  height: number
}

export async function cropPdf(bytes: Uint8Array, box: CropBox): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  for (const page of doc.getPages()) {
    page.setCropBox(box.x, box.y, box.width, box.height)
  }
  return doc.save()
}
