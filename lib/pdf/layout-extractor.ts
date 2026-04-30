export interface TextBlock {
  page: number
  bbox: [number, number, number, number] // [x0, y0, x1, y1] — PDF native coords (bottom-left origin)
  text: string
  fontSize: number
}

// Covers base Arabic, Extended Arabic, Presentation Forms-A and -B
function isArabicChar(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0
  return (
    (cp >= 0x0600 && cp <= 0x06FF) || // Base Arabic
    (cp >= 0x0750 && cp <= 0x077F) || // Arabic Supplement
    (cp >= 0xFB50 && cp <= 0xFDFF) || // Presentation Forms-A
    (cp >= 0xFE70 && cp <= 0xFEFF)    // Presentation Forms-B
  )
}

function hasArabic(text: string): boolean {
  return [...text].some(isArabicChar)
}

interface GlyphInfo {
  x: number
  y: number
  w: number
  fontSize: number
  char: string
}

export async function extractArabicBlocks(pdfBytes: Uint8Array): Promise<TextBlock[]> {
  // unpdf's getDocumentProxy uses a serverless-safe pdfjs bundle — no DOMMatrix / worker issues
  const { getDocumentProxy } = await import('unpdf')
  const doc = await getDocumentProxy(pdfBytes)
  const blocks: TextBlock[] = []

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()

    // Bucket Arabic glyphs by y-baseline (1pt buckets)
    const lineMap = new Map<number, GlyphInfo[]>()

    for (const item of content.items) {
      if (!('str' in item)) continue
      const char = item.str
      if (!char || !hasArabic(char)) continue

      const [, , , d, e, f] = item.transform
      const fontSize = Math.abs(d) || 11
      const yKey = Math.round(f) // 1pt bucket

      if (!lineMap.has(yKey)) lineMap.set(yKey, [])
      lineMap.get(yKey)!.push({ x: e, y: f, w: item.width || fontSize * 0.55, fontSize, char })
    }

    // For each line: sort by x descending (RTL logical order), group into words
    for (const glyphs of lineMap.values()) {
      glyphs.sort((a, b) => b.x - a.x) // descending = logical Arabic order (right → left)

      // Group into words: gap > half a character width marks a word boundary
      const words: GlyphInfo[][] = []
      let current: GlyphInfo[] = []

      for (let i = 0; i < glyphs.length; i++) {
        if (i === 0) { current.push(glyphs[i]); continue }
        const prev = glyphs[i - 1]
        // In descending-x order, prev.x > cur.x; gap is the space between them
        const gap = prev.x - (glyphs[i].x + glyphs[i].w)
        if (gap > prev.fontSize * 0.4) {
          words.push(current)
          current = [glyphs[i]]
        } else {
          current.push(glyphs[i])
        }
      }
      if (current.length > 0) words.push(current)

      for (const word of words) {
        const text = word.map(g => g.char).join('')
        if (!text.trim()) continue

        const x0 = Math.min(...word.map(g => g.x))
        const x1 = Math.max(...word.map(g => g.x + g.w))
        const fontSize = word[0].fontSize
        const y = word[0].y
        const y0 = y - fontSize * 0.25
        const y1 = y + fontSize * 0.85

        blocks.push({ page: pageNum - 1, bbox: [x0, y0, x1, y1], text, fontSize })
      }
    }
  }

  return blocks
}
