/**
 * PDF text extraction using unpdf — designed for serverless/edge environments.
 * Works on Vercel, Cloudflare Workers, and local Node.js without any worker setup.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Extracts plain text from a PDF Uint8Array.
 * Uses unpdf which bundles pdfjs-dist in a worker-free serverless-compatible way.
 */
export async function extractPdfText(pdfBytes: Uint8Array): Promise<string> {
  if (pdfBytes.length === 0) {
    throw new Error('PDF input is empty')
  }

  if (
    pdfBytes[0] !== 0x25 || pdfBytes[1] !== 0x50 ||
    pdfBytes[2] !== 0x44 || pdfBytes[3] !== 0x46
  ) {
    throw new Error('Input is not a valid PDF file')
  }

  const { extractText } = await import('unpdf')
  const result = await extractText(pdfBytes, { mergePages: true })

  // unpdf returns { totalPages, text } — join pages if array
  const text = Array.isArray(result.text)
    ? result.text.join('\n\n')
    : (result.text as string) ?? ''

  return text
}

/**
 * Splits text into chunks of approximately `maxWords` words each.
 */
export function chunkText(text: string, maxWords: number): string[] {
  if (!text.trim()) return []
  const words = text.trim().split(/\s+/)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '))
  }
  return chunks
}
