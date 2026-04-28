export interface TextBlock {
  page: number
  bbox: [number, number, number, number] // [x0, y0, x1, y1] — PDF native coords (bottom-left origin)
  text: string
  fontSize: number
}

function isArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text)
}

export async function extractArabicBlocks(pdfBytes: Uint8Array): Promise<TextBlock[]> {
  // Dynamic import to avoid SSR issues.
  // canvas is aliased to empty module in next.config.ts so pdfjs-dist loads cleanly on Vercel.
  // workerSrc = '' disables the web worker — required for serverless environments.
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = ''

  const loadingTask = pdfjs.getDocument({
    data: pdfBytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    verbosity: 0,
  })
  const doc = await loadingTask.promise
  const blocks: TextBlock[] = []

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()

    for (const item of content.items) {
      if (!('str' in item)) continue // skip TextMarkedContent
      const text = item.str.trim()
      if (text.length < 3 || !isArabic(text)) continue

      // transform = [a, b, c, d, e, f]: e=x, f=y(baseline from bottom), d≈fontSize
      const [, , , d, e, f] = item.transform
      const fontSize = Math.abs(d) || 11
      const width = item.width || fontSize * text.length * 0.5
      // Cover ascenders (~0.85× above baseline) and descenders (~0.25× below)
      const y0 = f - fontSize * 0.25
      const y1 = f + fontSize * 0.85

      blocks.push({ page: pageNum - 1, bbox: [e, y0, e + width, y1], text, fontSize })
    }
  }

  return blocks
}
