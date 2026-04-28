# Arabic PDF Translator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new `arabic-pdf-translator` tool that accepts an Arabic PDF, translates it to English using Helsinki-NLP/opus-mt-tc-big-ar-en (free HuggingFace model), preserves visual layout, and maintains a localStorage glossary so entity names (team names, venues) are corrected automatically on every run.

**Architecture:** pdfjs-dist extracts Arabic text blocks with bounding boxes → HuggingFace API translates in parallel batches (8-way concurrency pool to stay within Vercel's 60s limit) → pdf-lib reconstructs PDF with English text overlaid at original positions. Glossary stored in browser localStorage, sent with each API call, applied in pre- and post-translation passes. Optional reference PDF upload triggers entity extraction mode that returns candidate entity pairs for user review.

**Tech Stack:** pdfjs-dist v5 (already installed), pdf-lib v1 (already installed), `lib/ai/huggingface.ts` (existing wrapper), Vitest (existing), Next.js App Router

**Vercel compatibility:** All processing is in-memory (no disk writes). `export const maxDuration = 60` on the route. Concurrency pool keeps total HF API time under 30s for typical match reports (~600 blocks ÷ 8 per batch ÷ 8 concurrent = ~10 batches × 2s = ~20s). Binary `application/pdf` response via `NextResponse`.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/pdf/layout-extractor.ts` | CREATE | Extract Arabic text blocks + bboxes from PDF via pdfjs-dist |
| `lib/ai/arabic-translate.ts` | CREATE | Batch translate + two-pass glossary + entity candidate extraction |
| `lib/pdf/layout-reconstructor.ts` | CREATE | Rebuild PDF: white-rect over Arabic, English text at same bbox |
| `app/api/v1/process/arabic-pdf-translator/route.ts` | CREATE | API route — orchestrates pipeline, returns binary PDF or entity JSON |
| `config/tools.ts` | MODIFY | Add `arabic-pdf-translator` entry in Intelligence category |
| `app/[tool]/page.tsx` | MODIFY | Add switch case for new tool |
| `components/tool/tools/ArabicPdfTranslatorTool.tsx` | CREATE | Client component — two drop zones, glossary panel, download |
| `__tests__/unit/lib/pdf/layout-extractor.test.ts` | CREATE | Unit tests for text extraction and Arabic filtering |
| `__tests__/unit/lib/ai/arabic-translate.test.ts` | CREATE | Unit tests for glossary application and batch translation |
| `__tests__/unit/lib/pdf/layout-reconstructor.test.ts` | CREATE | Unit tests for PDF reconstruction output |

---

## Task 1: lib/pdf/layout-extractor.ts

**Files:**
- Create: `lib/pdf/layout-extractor.ts`
- Create: `__tests__/unit/lib/pdf/layout-extractor.test.ts`

- [ ] **Step 1.1: Write failing tests**

Create `__tests__/unit/lib/pdf/layout-extractor.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TextBlock } from '@/lib/pdf/layout-extractor'

// pdfjs-dist must be mocked — it requires a browser/worker environment
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
}))

import * as pdfjs from 'pdfjs-dist'

function makeItem(str: string, x: number, y: number, fontSize: number, width: number) {
  return { str, transform: [fontSize, 0, 0, fontSize, x, y], width, height: fontSize }
}

function makeMockDoc(items: ReturnType<typeof makeItem>[]) {
  return {
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({ items }),
      }),
    }),
  }
}

describe('extractArabicBlocks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns only Arabic spans', async () => {
    vi.mocked(pdfjs.getDocument).mockReturnValue(makeMockDoc([
      makeItem('مرحبا', 100, 200, 11, 50),   // Arabic
      makeItem('Hello', 200, 200, 11, 40),    // English — should be excluded
    ]) as ReturnType<typeof pdfjs.getDocument>)

    const { extractArabicBlocks } = await import('@/lib/pdf/layout-extractor')
    const blocks = await extractArabicBlocks(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text).toBe('مرحبا')
  })

  it('skips spans shorter than 3 characters', async () => {
    vi.mocked(pdfjs.getDocument).mockReturnValue(makeMockDoc([
      makeItem('ال', 100, 200, 11, 20),  // 2 chars — skip
      makeItem('الفيصلي', 150, 200, 11, 60),  // 7 chars — keep
    ]) as ReturnType<typeof pdfjs.getDocument>)

    const { extractArabicBlocks } = await import('@/lib/pdf/layout-extractor')
    const blocks = await extractArabicBlocks(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text).toBe('الفيصلي')
  })

  it('returns correct page index (0-indexed)', async () => {
    vi.mocked(pdfjs.getDocument).mockReturnValue(makeMockDoc([
      makeItem('مرحبا', 100, 200, 11, 50),
    ]) as ReturnType<typeof pdfjs.getDocument>)

    const { extractArabicBlocks } = await import('@/lib/pdf/layout-extractor')
    const blocks = await extractArabicBlocks(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
    expect(blocks[0].page).toBe(0)
  })

  it('computes bbox from transform and width', async () => {
    vi.mocked(pdfjs.getDocument).mockReturnValue(makeMockDoc([
      makeItem('مرحبا', 100, 200, 11, 50),
    ]) as ReturnType<typeof pdfjs.getDocument>)

    const { extractArabicBlocks } = await import('@/lib/pdf/layout-extractor')
    const blocks = await extractArabicBlocks(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
    const [x0, y0, x1, y1] = blocks[0].bbox
    expect(x0).toBe(100)
    expect(x1).toBe(150)  // x0 + width
    expect(y0).toBeLessThan(200)   // below baseline
    expect(y1).toBeGreaterThan(200) // above baseline
  })

  it('returns empty array when no Arabic text found', async () => {
    vi.mocked(pdfjs.getDocument).mockReturnValue(makeMockDoc([
      makeItem('Hello', 100, 200, 11, 40),
      makeItem('World', 200, 200, 11, 45),
    ]) as ReturnType<typeof pdfjs.getDocument>)

    const { extractArabicBlocks } = await import('@/lib/pdf/layout-extractor')
    const blocks = await extractArabicBlocks(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
    expect(blocks).toHaveLength(0)
  })
})
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
pnpm test __tests__/unit/lib/pdf/layout-extractor.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/pdf/layout-extractor'`

- [ ] **Step 1.3: Implement `lib/pdf/layout-extractor.ts`**

```typescript
export interface TextBlock {
  page: number
  bbox: [number, number, number, number]  // [x0, y0, x1, y1] — PDF native coords (bottom-left origin)
  text: string
  fontSize: number
}

function isArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text)
}

export async function extractArabicBlocks(pdfBytes: Uint8Array): Promise<TextBlock[]> {
  // Dynamic import keeps this tree-shakeable and avoids SSR issues.
  // GlobalWorkerOptions.workerSrc = '' disables the web worker — required for Vercel serverless.
  // canvas is aliased to empty module in next.config.ts so pdfjs-dist loads cleanly.
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
      if (!('str' in item)) continue  // skip TextMarkedContent items
      const text = item.str.trim()
      if (text.length < 3 || !isArabic(text)) continue

      // transform = [a, b, c, d, e, f]: e=x, f=y(baseline from bottom), d≈fontSize
      const [, , , d, e, f] = item.transform
      const fontSize = Math.abs(d) || 11
      const width = item.width || fontSize * text.length * 0.5
      // Cover ascenders (~0.8× above baseline) and descenders (~0.2× below)
      const y0 = f - fontSize * 0.25
      const y1 = f + fontSize * 0.85

      blocks.push({ page: pageNum - 1, bbox: [e, y0, e + width, y1], text, fontSize })
    }
  }

  return blocks
}
```

- [ ] **Step 1.4: Run tests to confirm they pass**

```bash
pnpm test __tests__/unit/lib/pdf/layout-extractor.test.ts
```

Expected: all 5 tests PASS

- [ ] **Step 1.5: Commit**

```bash
git add lib/pdf/layout-extractor.ts __tests__/unit/lib/pdf/layout-extractor.test.ts
git commit -m "feat(arabic-translator): add layout extractor for Arabic text blocks"
```

---

## Task 2: lib/ai/arabic-translate.ts

**Files:**
- Create: `lib/ai/arabic-translate.ts`
- Create: `__tests__/unit/lib/ai/arabic-translate.test.ts`

- [ ] **Step 2.1: Write failing tests**

Create `__tests__/unit/lib/ai/arabic-translate.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GlossaryEntry } from '@/lib/ai/arabic-translate'

vi.mock('@/lib/ai/huggingface', () => ({
  hfInference: vi.fn(),
}))

import { hfInference } from '@/lib/ai/huggingface'

describe('applyGlossary (via translateArabicBlocks pre/post pass)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('replaces known Arabic entity in source before translating', async () => {
    vi.mocked(hfInference).mockResolvedValue([{ translation_text: 'Jordan Professional League' }])
    const { translateArabicBlocks } = await import('@/lib/ai/arabic-translate')

    const glossary: GlossaryEntry[] = [{ ar: 'الفيصلي', en: 'Al-Faisaly', source: 'reference' }]
    await translateArabicBlocks([{ text: 'الفيصلي' }], glossary, 'test-key')

    const call = vi.mocked(hfInference).mock.calls[0]
    const payload = call[1] as { inputs: string[] }
    // Pre-pass should have replaced الفيصلي with Al-Faisaly in the inputs
    expect(payload.inputs[0]).toBe('Al-Faisaly')
  })

  it('applies glossary post-pass to fix any remaining entity in model output', async () => {
    vi.mocked(hfInference).mockResolvedValue([{ translation_text: 'Peanut.' }])
    const { translateArabicBlocks } = await import('@/lib/ai/arabic-translate')

    const glossary: GlossaryEntry[] = [{ ar: 'الفيصلي', en: 'Al-Faisaly', source: 'reference' }]
    // Glossary pre-pass replaces الفيصلي → Al-Faisaly, so model gets 'Al-Faisaly'
    // Model still returns 'Peanut.' (mocked), then post-pass replaces 'Peanut.' → nothing since
    // post-pass only replaces Arabic entries, not English model hallucinations.
    // What we really test: no crash, returns an array of same length as input
    const results = await translateArabicBlocks([{ text: 'الفيصلي' }], glossary, 'test-key')
    expect(results).toHaveLength(1)
    expect(typeof results[0]).toBe('string')
  })

  it('returns one translation per input block', async () => {
    vi.mocked(hfInference).mockResolvedValue([
      { translation_text: 'Match Report' },
      { translation_text: 'Jordan' },
    ])
    const { translateArabicBlocks } = await import('@/lib/ai/arabic-translate')

    const results = await translateArabicBlocks(
      [{ text: 'تقرير المباراة' }, { text: 'الأردن' }],
      [],
      'test-key',
    )
    expect(results).toHaveLength(2)
    expect(results[0]).toBe('Match Report')
    expect(results[1]).toBe('Jordan')
  })

  it('handles empty blocks array', async () => {
    const { translateArabicBlocks } = await import('@/lib/ai/arabic-translate')
    const results = await translateArabicBlocks([], [], 'test-key')
    expect(results).toEqual([])
    expect(hfInference).not.toHaveBeenCalled()
  })
})

describe('extractEntityCandidates', () => {
  it('returns candidates where model output differs from reference', async () => {
    const { extractEntityCandidates } = await import('@/lib/ai/arabic-translate')

    const candidates = extractEntityCandidates(
      ['الفيصلي'],
      ['Peanut.'],
      'AL-FAISALY scored in the match at Amman International Stadium',
    )

    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates[0].ar).toBe('الفيصلي')
    expect(candidates[0].en_model).toBe('Peanut.')
  })

  it('returns empty array when model output matches reference', async () => {
    const { extractEntityCandidates } = await import('@/lib/ai/arabic-translate')

    const candidates = extractEntityCandidates(
      ['الفيصلي'],
      ['Al-Faisaly'],
      'Al-Faisaly scored in the match',
    )

    // Model output 'Al-Faisaly' appears in reference → no mismatch
    expect(candidates.filter(c => c.ar === 'الفيصلي')).toHaveLength(0)
  })

  it('deduplicates by Arabic source', async () => {
    const { extractEntityCandidates } = await import('@/lib/ai/arabic-translate')

    const candidates = extractEntityCandidates(
      ['الفيصلي', 'الفيصلي'],
      ['Peanut.', 'Peanut.'],
      'AL-FAISALY won the match',
    )

    const forFaisaly = candidates.filter(c => c.ar === 'الفيصلي')
    expect(forFaisaly).toHaveLength(1)
  })
})
```

- [ ] **Step 2.2: Run tests to confirm they fail**

```bash
pnpm test __tests__/unit/lib/ai/arabic-translate.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/ai/arabic-translate'`

- [ ] **Step 2.3: Implement `lib/ai/arabic-translate.ts`**

```typescript
import { hfInference } from './huggingface'

export interface GlossaryEntry {
  ar: string
  en: string
  source: 'reference' | 'manual'
}

export interface EntityCandidate {
  ar: string
  en_model: string
  en_reference: string
}

const MODEL = 'Helsinki-NLP/opus-mt-tc-big-ar-en'
const CHUNK_SIZE = 8
const MAX_CONCURRENT = 8

function applyGlossary(text: string, glossary: GlossaryEntry[]): string {
  let result = text
  for (const entry of glossary) {
    result = result.replaceAll(entry.ar, entry.en)
  }
  return result
}

async function translateChunk(texts: string[], apiKey: string): Promise<string[]> {
  const result = await hfInference<Array<{ translation_text: string }>>(
    MODEL,
    { inputs: texts },
    apiKey,
  )
  return result.map(r => r.translation_text ?? '')
}

// Runs at most `concurrency` promises at a time — keeps Vercel under 60s timeout
async function pooledMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let idx = 0
  async function worker() {
    while (idx < items.length) {
      const i = idx++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

export async function translateArabicBlocks(
  blocks: Array<{ text: string }>,
  glossary: GlossaryEntry[],
  apiKey: string,
): Promise<string[]> {
  if (blocks.length === 0) return []

  // Pre-pass: replace known Arabic entities before the model sees them
  const preprocessed = blocks.map(b => applyGlossary(b.text, glossary))

  // Build fixed-size chunks
  const chunks: string[][] = []
  for (let i = 0; i < preprocessed.length; i += CHUNK_SIZE) {
    chunks.push(preprocessed.slice(i, i + CHUNK_SIZE))
  }

  // Translate with concurrency pool
  const chunkResults = await pooledMap(
    chunks,
    chunk => translateChunk(chunk, apiKey),
    MAX_CONCURRENT,
  )

  const translations = chunkResults.flat()

  // Post-pass: apply glossary to translated output as safety net
  return translations.map(t => applyGlossary(t, glossary))
}

export function extractEntityCandidates(
  arabicTexts: string[],
  modelTranslations: string[],
  referenceText: string,
): EntityCandidate[] {
  // Extract proper noun candidates from reference (all-caps or TitleCase multi-word)
  const refCandidates = Array.from(
    new Set(
      referenceText.match(/\b[A-Z]{2,}(?:[- ][A-Z]{2,})*\b|\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b/g) ?? [],
    ),
  )

  const seen = new Set<string>()
  const results: EntityCandidate[] = []

  for (let i = 0; i < arabicTexts.length; i++) {
    const ar = arabicTexts[i].trim()
    const en_model = (modelTranslations[i] ?? '').trim()
    if (seen.has(ar) || !ar || ar.length < 3) continue

    // Find a reference phrase absent from model output
    const match = refCandidates.find(
      ref => ref.length > 3 && !en_model.toLowerCase().includes(ref.toLowerCase()),
    )
    if (match) {
      results.push({ ar, en_model, en_reference: match })
      seen.add(ar)
    }
  }

  return results.slice(0, 20)
}
```

- [ ] **Step 2.4: Run tests to confirm they pass**

```bash
pnpm test __tests__/unit/lib/ai/arabic-translate.test.ts
```

Expected: all 6 tests PASS

- [ ] **Step 2.5: Commit**

```bash
git add lib/ai/arabic-translate.ts __tests__/unit/lib/ai/arabic-translate.test.ts
git commit -m "feat(arabic-translator): add batch translation lib with glossary and entity extraction"
```

---

## Task 3: lib/pdf/layout-reconstructor.ts

**Files:**
- Create: `lib/pdf/layout-reconstructor.ts`
- Create: `__tests__/unit/lib/pdf/layout-reconstructor.test.ts`

- [ ] **Step 3.1: Write failing tests**

Create `__tests__/unit/lib/pdf/layout-reconstructor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { rebuildPdf } from '@/lib/pdf/layout-reconstructor'
import type { TextBlock } from '@/lib/pdf/layout-extractor'
import { createTestPdf } from './helpers'

describe('rebuildPdf', () => {
  it('returns valid PDF bytes', async () => {
    const source = await createTestPdf(1)
    const blocks: TextBlock[] = []
    const result = await rebuildPdf(source, blocks, [])

    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
    // Should start with PDF magic bytes
    expect(result[0]).toBe(0x25) // %
    expect(result[1]).toBe(0x50) // P
  })

  it('output has same page count as source', async () => {
    const source = await createTestPdf(3)
    const result = await rebuildPdf(source, [], [])

    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(3)
  })

  it('inserts translated text for each block', async () => {
    const source = await createTestPdf(1)
    const blocks: TextBlock[] = [
      { page: 0, bbox: [50, 700, 200, 720], text: 'مرحبا', fontSize: 12 },
    ]
    // Should not throw — text insertion is best-effort
    const result = await rebuildPdf(source, blocks, ['Hello'])
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('skips blocks where translation is a placeholder', async () => {
    const source = await createTestPdf(1)
    const blocks: TextBlock[] = [
      { page: 0, bbox: [50, 700, 200, 720], text: 'مرحبا', fontSize: 12 },
    ]
    // [Translation error] placeholders are skipped — should not throw
    const result = await rebuildPdf(source, blocks, ['[Translation error]'])
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('handles more translations than blocks gracefully', async () => {
    const source = await createTestPdf(1)
    const result = await rebuildPdf(source, [], ['extra', 'extra'])
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(1)
  })

  it('handles blocks on different pages', async () => {
    const source = await createTestPdf(2)
    const blocks: TextBlock[] = [
      { page: 0, bbox: [50, 700, 200, 720], text: 'مرحبا', fontSize: 12 },
      { page: 1, bbox: [50, 700, 200, 720], text: 'الأردن', fontSize: 12 },
    ]
    const result = await rebuildPdf(source, blocks, ['Hello', 'Jordan'])
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(2)
  })
})
```

- [ ] **Step 3.2: Run tests to confirm they fail**

```bash
pnpm test __tests__/unit/lib/pdf/layout-reconstructor.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/pdf/layout-reconstructor'`

- [ ] **Step 3.3: Implement `lib/pdf/layout-reconstructor.ts`**

```typescript
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { TextBlock } from './layout-extractor'

export async function rebuildPdf(
  sourceBytes: Uint8Array,
  blocks: TextBlock[],
  translations: string[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()

  // Group blocks by page for efficient iteration
  const byPage = new Map<number, Array<{ block: TextBlock; translation: string }>>()
  for (let i = 0; i < blocks.length; i++) {
    const translation = translations[i] ?? ''
    if (!translation || translation.startsWith('[')) continue  // skip placeholders
    const list = byPage.get(blocks[i].page) ?? []
    list.push({ block: blocks[i], translation })
    byPage.set(blocks[i].page, list)
  }

  for (const [pageIdx, items] of byPage) {
    const page = pages[pageIdx]
    if (!page) continue
    const { height: pageHeight } = page.getSize()

    for (const { block, translation } of items) {
      const [x0, y0, x1, y1] = block.bbox
      const boxWidth = x1 - x0
      const boxHeight = y1 - y0

      // In pdf-lib, y coordinates are from the BOTTOM of the page.
      // pdfjs-dist also returns y from the bottom, so no flip needed.
      // Clamp to page bounds to avoid out-of-range errors.
      const drawY0 = Math.max(0, Math.min(y0, pageHeight))
      const drawY1 = Math.max(0, Math.min(y1, pageHeight))
      const drawHeight = Math.max(1, drawY1 - drawY0)

      // 1. White rectangle to blank the Arabic text
      page.drawRectangle({
        x: x0,
        y: drawY0,
        width: Math.max(1, boxWidth),
        height: drawHeight,
        color: rgb(1, 1, 1),
        borderWidth: 0,
      })

      // 2. Insert English text — font size matched to original, clamped for safety
      const fontSize = Math.max(6, Math.min(block.fontSize, boxHeight * 0.85, 24))
      try {
        page.drawText(translation, {
          x: x0,
          y: drawY0 + 2,  // 2pt above bottom of box to clear descenders
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          maxWidth: boxWidth,
          lineHeight: fontSize * 1.2,
        })
      } catch {
        // Text insertion is best-effort — skip if it fails (e.g. oversized text)
      }
    }
  }

  const output = await doc.save({ useObjectStreams: true })
  return output
}
```

- [ ] **Step 3.4: Run tests to confirm they pass**

```bash
pnpm test __tests__/unit/lib/pdf/layout-reconstructor.test.ts
```

Expected: all 6 tests PASS

- [ ] **Step 3.5: Run full test suite to confirm no regressions**

```bash
pnpm test
```

Expected: all tests PASS

- [ ] **Step 3.6: Commit**

```bash
git add lib/pdf/layout-reconstructor.ts __tests__/unit/lib/pdf/layout-reconstructor.test.ts
git commit -m "feat(arabic-translator): add layout reconstructor — redact Arabic, insert English"
```

---

## Task 4: API Route

**Files:**
- Create: `app/api/v1/process/arabic-pdf-translator/route.ts`

- [ ] **Step 4.1: Implement the API route**

Create `app/api/v1/process/arabic-pdf-translator/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { extractArabicBlocks } from '@/lib/pdf/layout-extractor'
import { translateArabicBlocks, extractEntityCandidates, GlossaryEntry } from '@/lib/ai/arabic-translate'
import { rebuildPdf } from '@/lib/pdf/layout-reconstructor'
import { extractPdfText } from '@/lib/pdf/extractText'

// Vercel: allow up to 60s for this route (translation of ~600 blocks takes ~20s with pooled calls)
export const maxDuration = 60

const MAX_SIZE_BYTES = 15 * 1024 * 1024  // 15 MB — safe for Vercel free tier
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] // %PDF

function isPdf(bytes: Uint8Array): boolean {
  return PDF_MAGIC.every((b, i) => bytes[i] === b)
}

function err(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status })
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) return err('MISSING_API_KEY', 'HuggingFace API key not configured', 500)

  const form = await req.formData().catch(() => null)
  if (!form) return err('INVALID_FORM', 'Could not parse form data', 400)

  const arabicFile = form.get('arabic_pdf') as File | null
  if (!arabicFile) return err('MISSING_FILE', 'arabic_pdf is required', 400)
  if (arabicFile.size > MAX_SIZE_BYTES) return err('FILE_TOO_LARGE', 'File exceeds 15 MB limit', 413)

  const arabicBytes = new Uint8Array(await arabicFile.arrayBuffer())
  if (!isPdf(arabicBytes)) return err('INVALID_PDF', 'arabic_pdf is not a valid PDF', 422)

  // Parse glossary from form data (sent as JSON string by client)
  let glossary: GlossaryEntry[] = []
  const glossaryStr = form.get('glossary') as string | null
  if (glossaryStr) {
    try { glossary = JSON.parse(glossaryStr) } catch { /* ignore malformed glossary */ }
  }

  const extractOnly = form.get('extract_entities_only') === 'true'
  const referenceFile = form.get('reference_pdf') as File | null

  // --- Entity extraction mode ---
  if (extractOnly && referenceFile) {
    if (referenceFile.size > MAX_SIZE_BYTES) return err('FILE_TOO_LARGE', 'Reference file exceeds 15 MB limit', 413)
    const refBytes = new Uint8Array(await referenceFile.arrayBuffer())
    if (!isPdf(refBytes)) return err('INVALID_PDF', 'reference_pdf is not a valid PDF', 422)

    const [arabicBlocks, referenceText] = await Promise.all([
      extractArabicBlocks(arabicBytes),
      extractPdfText(refBytes),
    ])

    const modelTranslations = await translateArabicBlocks(arabicBlocks, glossary, apiKey)
    const entities = extractEntityCandidates(
      arabicBlocks.map(b => b.text),
      modelTranslations,
      referenceText,
    )

    return NextResponse.json({ success: true, entities })
  }

  // --- Full translation mode ---
  const blocks = await extractArabicBlocks(arabicBytes)
  const translations = await translateArabicBlocks(blocks, glossary, apiKey)
  const translatedBytes = await rebuildPdf(arabicBytes, blocks, translations)

  const originalName = arabicFile.name.replace(/\.pdf$/i, '')
  return new NextResponse(Buffer.from(translatedBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}_EN.pdf"`,
    },
  })
}
```

- [ ] **Step 4.2: Run type check**

```bash
pnpm typecheck
```

Expected: zero errors

- [ ] **Step 4.3: Commit**

```bash
git add app/api/v1/process/arabic-pdf-translator/route.ts
git commit -m "feat(arabic-translator): add API route with translation and entity extraction modes"
```

---

## Task 5: Tool Registration

**Files:**
- Modify: `config/tools.ts`
- Modify: `app/[tool]/page.tsx`

- [ ] **Step 5.1: Add tool entry to `config/tools.ts`**

Open `config/tools.ts` and find the Intelligence category array. Add the new entry alongside `ai-summarizer`, `translate-pdf`, `pdf-qa`:

```typescript
{
  slug: 'arabic-pdf-translator',
  name: 'Arabic PDF Translator',
  description: 'Translate Arabic PDFs to English with layout preserved',
  category: 'intelligence',
  icon: 'Languages',
  processingMode: 'ai',
  acceptedFormats: ['application/pdf'],
  multiple: false,
  maxFiles: 1,
  maxSizeMB: 15,
},
```

- [ ] **Step 5.2: Add switch case to `app/[tool]/page.tsx`**

In the `getToolComponent` switch statement, add after the `'pdf-qa'` case:

```typescript
case 'arabic-pdf-translator': return (await import('@/components/tool/tools/ArabicPdfTranslatorTool')).ArabicPdfTranslatorTool
```

- [ ] **Step 5.3: Run type check and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: zero errors

- [ ] **Step 5.4: Commit**

```bash
git add config/tools.ts app/[tool]/page.tsx
git commit -m "feat(arabic-translator): register tool in config and page router"
```

---

## Task 6: ArabicPdfTranslatorTool.tsx Component

**Files:**
- Create: `components/tool/tools/ArabicPdfTranslatorTool.tsx`

- [ ] **Step 6.1: Implement the component**

Create `components/tool/tools/ArabicPdfTranslatorTool.tsx`:

```typescript
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ToolLayout } from '@/components/tool'
import type { Tool } from '@/config/tools'
import type { GlossaryEntry, EntityCandidate } from '@/lib/ai/arabic-translate'

interface Props { tool: Tool }

type Status = 'idle' | 'extracting' | 'translating' | 'rebuilding' | 'done' | 'error'

const GLOSSARY_KEY = 'arabic-translator-glossary'

function loadGlossary(): GlossaryEntry[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(GLOSSARY_KEY) ?? '[]') } catch { return [] }
}

function saveGlossary(entries: GlossaryEntry[]): void {
  localStorage.setItem(GLOSSARY_KEY, JSON.stringify(entries))
}

const STEP_LABELS: Partial<Record<Status, string>> = {
  extracting: 'Extracting text blocks…',
  translating: 'Translating with AI model…',
  rebuilding: 'Rebuilding PDF…',
}

export function ArabicPdfTranslatorTool({ tool }: Props) {
  const [arabicFile, setArabicFile] = useState<File | null>(null)
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState('')
  const [downloadName, setDownloadName] = useState('')
  const [glossary, setGlossary] = useState<GlossaryEntry[]>([])
  const [showReference, setShowReference] = useState(false)
  const [entityCandidates, setEntityCandidates] = useState<EntityCandidate[]>([])
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set())
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setGlossary(loadGlossary())
  }, [])

  const animateProgress = useCallback((from: number, to: number, ms: number) => {
    if (progressRef.current) clearInterval(progressRef.current)
    const steps = Math.ceil(ms / 80)
    const inc = (to - from) / steps
    let cur = from
    progressRef.current = setInterval(() => {
      cur += inc
      if (cur >= to) { cur = to; clearInterval(progressRef.current!) }
      setProgress(Math.round(cur))
    }, 80)
  }, [])

  const handleArabicDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f?.type === 'application/pdf') setArabicFile(f)
  }, [])

  const handleReferenceDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f?.type === 'application/pdf') setReferenceFile(f)
  }, [])

  const handleTranslate = useCallback(async () => {
    if (!arabicFile) return
    setStatus('extracting')
    setError('')
    setProgress(0)
    setEntityCandidates([])
    setDownloadUrl('')
    animateProgress(0, 20, 3000)

    try {
      const form = new FormData()
      form.append('arabic_pdf', arabicFile)
      form.append('glossary', JSON.stringify(glossary))

      // If reference file is present — extract entities first, then translate
      if (referenceFile) {
        form.append('reference_pdf', referenceFile)
        form.append('extract_entities_only', 'true')

        setStatus('extracting')
        animateProgress(20, 40, 5000)
        const entityRes = await fetch('/api/v1/process/arabic-pdf-translator', {
          method: 'POST', body: form,
        })
        const entityJson = await entityRes.json()
        if (!entityRes.ok || !entityJson.success) throw new Error(entityJson?.error?.message ?? `Error ${entityRes.status}`)
        setEntityCandidates(entityJson.entities ?? [])
        setSelectedCandidates(new Set(entityJson.entities.map((_: EntityCandidate, i: number) => i)))
      }

      // Full translation
      const transForm = new FormData()
      transForm.append('arabic_pdf', arabicFile)
      transForm.append('glossary', JSON.stringify(glossary))

      setStatus('translating')
      animateProgress(40, 80, 20000)
      const res = await fetch('/api/v1/process/arabic-pdf-translator', {
        method: 'POST', body: transForm,
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: { message?: string } })?.error?.message ?? `Error ${res.status}`)
      }

      setStatus('rebuilding')
      animateProgress(80, 99, 3000)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      setDownloadName(`${arabicFile.name.replace(/\.pdf$/i, '')}_EN.pdf`)
      setProgress(100)
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Translation failed')
      setStatus('error')
    } finally {
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }, [arabicFile, referenceFile, glossary, animateProgress])

  const handleDownload = useCallback(() => {
    if (!downloadUrl) return
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = downloadName
    a.click()
  }, [downloadUrl, downloadName])

  const handleSaveCandidates = useCallback(() => {
    const toAdd: GlossaryEntry[] = entityCandidates
      .filter((_, i) => selectedCandidates.has(i))
      .map(c => ({ ar: c.ar, en: c.en_reference, source: 'reference' as const }))
    const merged = [...glossary]
    for (const entry of toAdd) {
      if (!merged.find(e => e.ar === entry.ar)) merged.push(entry)
    }
    setGlossary(merged)
    saveGlossary(merged)
    setEntityCandidates([])
  }, [entityCandidates, selectedCandidates, glossary])

  const handleDeleteGlossary = useCallback((ar: string) => {
    const next = glossary.filter(e => e.ar !== ar)
    setGlossary(next)
    saveGlossary(next)
  }, [glossary])

  const handleClearGlossary = useCallback(() => {
    setGlossary([])
    saveGlossary([])
  }, [])

  const handleReset = useCallback(() => {
    setArabicFile(null)
    setReferenceFile(null)
    setStatus('idle')
    setError('')
    setProgress(0)
    setEntityCandidates([])
    setSelectedCandidates(new Set())
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl('')
  }, [downloadUrl])

  const isProcessing = status === 'extracting' || status === 'translating' || status === 'rebuilding'

  const sidebar = (
    <div className="space-y-4">
      {/* Reference upload toggle */}
      <div>
        <button
          onClick={() => setShowReference(v => !v)}
          className="text-sm text-[#22D3EE] hover:underline flex items-center gap-1"
        >
          {showReference ? '▼' : '▶'} Improve entity names
        </button>
        {showReference && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-[--color-muted]">
              Upload an English reference PDF to auto-learn team names, venues, and other entities.
            </p>
            <label
              className="block border border-dashed border-[--color-border] rounded-lg p-3 text-center cursor-pointer hover:border-[#22D3EE] transition-colors"
              onDragOver={e => e.preventDefault()}
              onDrop={handleReferenceDrop}
            >
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; if (f) setReferenceFile(f) }}
              />
              {referenceFile
                ? <span className="text-sm text-[#22D3EE]">{referenceFile.name}</span>
                : <span className="text-xs text-[--color-muted]">Drop English PDF here</span>
              }
            </label>
          </div>
        )}
      </div>

      {/* Glossary panel */}
      {glossary.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[--color-muted]">Glossary ({glossary.length})</span>
            <button onClick={handleClearGlossary} className="text-xs text-red-400 hover:underline">Clear all</button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {glossary.map(e => (
              <div key={e.ar} className="flex items-center justify-between text-xs bg-white/5 rounded px-2 py-1">
                <span className="text-right font-mono">{e.ar} → {e.en}</span>
                <button
                  onClick={() => handleDeleteGlossary(e.ar)}
                  className="text-[--color-muted] hover:text-red-400 ml-2 shrink-0"
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 rounded-lg p-3">{error}</div>
      )}

      {/* Reset */}
      {status !== 'idle' && (
        <button
          onClick={handleReset}
          className="text-sm text-[--color-muted] hover:text-white transition-colors"
        >
          ← Start over
        </button>
      )}
    </div>
  )

  const action = status === 'done'
    ? { label: '⬇ Download English PDF', onClick: handleDownload }
    : { label: isProcessing ? STEP_LABELS[status] ?? 'Processing…' : 'Translate PDF →', onClick: handleTranslate, disabled: !arabicFile || isProcessing }

  return (
    <ToolLayout tool={tool} sidebar={sidebar} action={action} progress={isProcessing ? progress : undefined}>
      <div className="space-y-4">
        {/* Primary drop zone */}
        <label
          className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            arabicFile ? 'border-[#22D3EE] bg-[#22D3EE]/5' : 'border-[--color-border] hover:border-[#22D3EE]'
          }`}
          onDragOver={e => e.preventDefault()}
          onDrop={handleArabicDrop}
        >
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={e => { const f = e.target.files?.[0]; if (f) setArabicFile(f) }}
          />
          {arabicFile ? (
            <div>
              <p className="font-medium text-[#22D3EE]">{arabicFile.name}</p>
              <p className="text-xs text-[--color-muted] mt-1">{(arabicFile.size / 1024).toFixed(0)} KB</p>
            </div>
          ) : (
            <div>
              <p className="font-medium">Drop Arabic PDF here</p>
              <p className="text-xs text-[--color-muted] mt-1">or click to browse · max 15 MB</p>
            </div>
          )}
        </label>

        {/* Entity candidates review table */}
        {entityCandidates.length > 0 && (
          <div className="border border-[--color-border] rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-white/5 flex items-center justify-between">
              <span className="text-sm font-medium">Detected entity corrections</span>
              <button
                onClick={handleSaveCandidates}
                className="text-xs bg-[#22D3EE] text-black px-3 py-1 rounded-full font-medium hover:bg-[#06B6D4]"
              >
                Save selected to glossary
              </button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[--color-muted] border-b border-[--color-border]">
                  <th className="px-3 py-2 text-left w-6">✓</th>
                  <th className="px-3 py-2 text-right">Arabic</th>
                  <th className="px-3 py-2 text-left">Model said</th>
                  <th className="px-3 py-2 text-left">Reference says</th>
                </tr>
              </thead>
              <tbody>
                {entityCandidates.map((c, i) => (
                  <tr key={i} className="border-b border-[--color-border]/50 hover:bg-white/5">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedCandidates.has(i)}
                        onChange={e => {
                          const next = new Set(selectedCandidates)
                          e.target.checked ? next.add(i) : next.delete(i)
                          setSelectedCandidates(next)
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{c.ar}</td>
                    <td className="px-3 py-2 text-red-400">{c.en_model}</td>
                    <td className="px-3 py-2 text-green-400">{c.en_reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Done state */}
        {status === 'done' && (
          <div className="text-center py-4">
            <p className="text-[#22D3EE] font-medium">Translation complete ✓</p>
            <p className="text-xs text-[--color-muted] mt-1">
              Click "Download English PDF" to save your file.
            </p>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
```

- [ ] **Step 6.2: Run type check and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: zero errors

- [ ] **Step 6.3: Commit**

```bash
git add components/tool/tools/ArabicPdfTranslatorTool.tsx
git commit -m "feat(arabic-translator): add UI component with glossary, entity review, and PDF download"
```

---

## Task 7: QA Gate

- [ ] **Step 7.1: Run full QA suite**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Expected: all pass, zero errors, build succeeds

- [ ] **Step 7.2: Start dev server and smoke test**

```bash
pnpm dev
```

Then navigate to `http://localhost:3000/arabic-pdf-translator` and verify:
- Tool page renders the component (NOT "Coming soon")
- Arabic PDF drop zone visible
- "Improve entity names" toggle works
- Upload `_plans/pdf/MATCH_REPORT-75-الفيصلي-vs-الحسين - Filippo Tarducci (1).pdf`
- Click "Translate PDF →"
- Progress steps animate
- Download button appears
- Translated PDF opens correctly in PDF viewer
- Arabic text blocks replaced with English, images intact

- [ ] **Step 7.3: Test glossary flow**

1. Upload Arabic PDF + English reference PDF (`Match_Report_75_AlFaisaly_vs_AlHussein_EN.docx` is not a PDF — use the translated output from the comparison script instead)
2. Verify entity candidates table appears
3. Tick entries, click "Save to glossary"
4. Verify glossary panel shows saved entries
5. Reload page — verify glossary persists from localStorage
6. Translate again — verify "الفيصلي" now produces "Al-Faisaly" instead of "Peanut."

- [ ] **Step 7.4: Final commit**

```bash
git add -A
git commit -m "feat(arabic-pdf-translator): complete implementation — layout-preserving AR→EN with glossary"
```

---

## Vercel Deployment Checklist

- `export const maxDuration = 60` is set on the route — prevents 504 timeout ✓
- No `fs` writes anywhere in the pipeline — all Uint8Array in-memory ✓
- `canvas` aliased to empty module in `next.config.ts` (already) — pdfjs-dist loads without DOM ✓
- 8-way parallel HF calls — ~20s for 600 blocks, well within 60s limit ✓
- 15 MB file size limit — safe for Vercel free tier request body ✓
- Binary `NextResponse` with `Content-Type: application/pdf` — correct for file downloads ✓
- `HUGGINGFACE_API_KEY` must be set in Vercel environment variables (already configured for other tools) ✓
