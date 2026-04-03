/**
 * PDF text extraction for Next.js API routes using pdfjs-dist.
 * Uses an explicit worker path to avoid Turbopack bundling the worker file.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

function ensureDomMatrix() {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    class DOMMatrixPolyfill {
      a=1;b=0;c=0;d=1;e=0;f=0;
      m11=1;m12=0;m13=0;m14=0;m21=0;m22=1;m23=0;m24=0;
      m31=0;m32=0;m33=1;m34=0;m41=0;m42=0;m43=0;m44=1;
      is2D=true;isIdentity=true;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(..._args: unknown[]) {}
      multiply() { return new DOMMatrixPolyfill() }
      translate() { return new DOMMatrixPolyfill() }
      scale() { return new DOMMatrixPolyfill() }
      rotate() { return new DOMMatrixPolyfill() }
      inverse() { return new DOMMatrixPolyfill() }
      transformPoint(p?: { x?: number; y?: number }) {
        return { x: p?.x ?? 0, y: p?.y ?? 0, z: 0, w: 1 }
      }
    }
    ;(globalThis as Record<string, unknown>).DOMMatrix = DOMMatrixPolyfill
  }
}

/**
 * Extracts plain text from a PDF Uint8Array using pdfjs-dist.
 * Polyfills browser APIs and points to the worker file by path to avoid
 * Turbopack bundling it into a chunk it can't find at runtime.
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

  ensureDomMatrix()

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

  // Point to the actual worker file in node_modules so Turbopack doesn't
  // try to bundle it and produce a broken chunk path at runtime.
  const path = await import('path')
  const workerPath = path.resolve(
    process.cwd(),
    'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
  )
  pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`

  const loadingTask = pdfjsLib.getDocument({
    data: pdfBytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  })

  const pdf = await loadingTask.promise
  const pageTexts: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const pageText = (content.items as any[])
      .map((item: any) => item.str ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (pageText) pageTexts.push(pageText)
  }

  return pageTexts.join('\n\n')
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
