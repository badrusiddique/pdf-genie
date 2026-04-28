import { PDFDocument } from 'pdf-lib'

export async function unlockPdf(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return doc.save({ useObjectStreams: true })
}
