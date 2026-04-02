import { PDFDocument } from 'pdf-lib'

export type CompressionLevel = 'extreme' | 'recommended' | 'less'

/**
 * Compress a PDF by stripping metadata and using object stream compression.
 * Text, vectors, and structure are preserved unchanged.
 * Returns compressed PDF bytes + actual size savings info.
 */
export async function compressPdf(
  pdfBytes: Uint8Array,
  level: CompressionLevel = 'recommended',
): Promise<{ compressed: Uint8Array; originalSize: number; compressedSize: number }> {
  const originalSize = pdfBytes.length

  // Load will throw if bytes are not a valid PDF
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: false })

  // Strip metadata for recommended and extreme levels
  if (level === 'recommended' || level === 'extreme') {
    doc.setTitle('')
    doc.setAuthor('')
    doc.setSubject('')
    doc.setKeywords([])
    doc.setProducer('')
    doc.setCreator('')
  }

  // Save with object stream compression (reduces cross-reference table size)
  const compressed = await doc.save({ useObjectStreams: true })

  return {
    compressed,
    originalSize,
    compressedSize: compressed.length,
  }
}
