import { PDFDocument, degrees } from 'pdf-lib'

export type RotateAngle = 90 | 180 | 270

export async function rotatePdf(bytes: Uint8Array, angle: RotateAngle): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  for (const page of doc.getPages()) {
    const current = page.getRotation().angle
    page.setRotation(degrees((current + angle) % 360))
  }
  return doc.save()
}
