# Phase 7: Intelligence (AI) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement AI Summarizer, Translate PDF, and PDF Q&A tools using HuggingFace free inference API — no paid model usage.

**Architecture:** PDF text is extracted server-side using `pdfjs-dist` (legacy Node.js build). Summarization uses `facebook/bart-large-cnn` (chunked). Translation uses `Helsinki-NLP/opus-mt-en-*` per language. Q&A uses a stateless two-step approach: PDFs are uploaded once to `/extract` which returns text to the client; then each question hits `/ask` with the stored context + question, using `deepset/roberta-base-squad2` (extractive QA — finds answer spans within the document, no hallucination). Results are displayed as text in the UI.

**Tech Stack:** `pdfjs-dist` (already installed), HuggingFace Inference API (free, key in `HUGGINGFACE_API_KEY` env var), no new npm packages needed.

---

## File Map

### New files
```
lib/pdf/extractText.ts                          — extract plain text from PDF using pdfjs-dist
lib/ai/huggingface.ts                           — HuggingFace Inference API client (fetch wrapper)
lib/ai/summarize.ts                             — chunked summarization logic
lib/ai/translate.ts                             — translation logic + supported language map

app/api/v1/process/ai-summarizer/route.ts       — POST: PDF → summary text
app/api/v1/process/translate-pdf/route.ts       — POST: PDF + target lang → translated text

components/tool/tools/AiSummarizerTool.tsx      — 'use client' tool component
components/tool/tools/TranslatePdfTool.tsx      — 'use client' tool component

__tests__/unit/lib/pdf/extractText.test.ts      — tests text extraction
__tests__/unit/lib/ai/summarize.test.ts         — tests chunking logic
__tests__/unit/lib/ai/translate.test.ts         — tests language map + input validation
```

### Files to modify
```
app/[tool]/page.tsx    — add 2 new cases to getToolComponent switch
```

---

## Task 1: PDF text extraction utility

**Files:**
- Create: `lib/pdf/extractText.ts`
- Create: `__tests__/unit/lib/pdf/extractText.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/unit/lib/pdf/extractText.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { extractPdfText, chunkText } from '@/lib/pdf/extractText'
import { createTestPdf, getPageCount } from '../helpers'

describe('extractPdfText', () => {
  it('throws for empty input', async () => {
    await expect(extractPdfText(new Uint8Array(0))).rejects.toThrow()
  })

  it('throws for non-PDF bytes', async () => {
    await expect(extractPdfText(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow()
  })

  it('returns a string for a valid PDF', async () => {
    const pdf = await createTestPdf(2)
    const text = await extractPdfText(pdf)
    expect(typeof text).toBe('string')
    // pdf-lib generated PDFs may have little visible text, just check it doesn't throw
  })
})

describe('chunkText', () => {
  it('returns single chunk for short text', () => {
    const chunks = chunkText('hello world', 100)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe('hello world')
  })

  it('splits long text into word-boundary chunks', () => {
    const words = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ')
    const chunks = chunkText(words, 50)
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach(chunk => {
      expect(chunk.split(' ').length).toBeLessThanOrEqual(55) // some tolerance
    })
  })

  it('returns empty array for empty string', () => {
    expect(chunkText('', 100)).toEqual([])
  })
})
```

Run: `pnpm test __tests__/unit/lib/pdf/extractText.test.ts`
Expected: FAIL.

- [ ] **Step 2: Create `lib/pdf/extractText.ts`**

```typescript
// Use pdfjs-dist legacy build for Node.js API route compatibility (no Web Worker)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js')

/**
 * Extracts plain text from a PDF Uint8Array.
 * Concatenates all pages separated by double newlines.
 */
export async function extractPdfText(pdfBytes: Uint8Array): Promise<string> {
  if (pdfBytes.length === 0) {
    throw new Error('PDF input is empty')
  }

  // %PDF magic bytes check
  if (
    pdfBytes[0] !== 0x25 || pdfBytes[1] !== 0x50 ||
    pdfBytes[2] !== 0x44 || pdfBytes[3] !== 0x46
  ) {
    throw new Error('Input is not a valid PDF file')
  }

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
    const pageText = content.items
      .map((item: { str?: string }) => item.str ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (pageText) pageTexts.push(pageText)
  }

  return pageTexts.join('\n\n')
}

/**
 * Splits text into chunks of approximately `maxWords` words each,
 * splitting at word boundaries.
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
```

- [ ] **Step 3: Run tests**

```bash
pnpm test __tests__/unit/lib/pdf/extractText.test.ts
```

Expected: all passing (the `extractPdfText` tests may produce empty string for test PDFs — that's fine as long as no throw).

- [ ] **Step 4: Commit**

```bash
git add lib/pdf/extractText.ts __tests__/unit/lib/pdf/extractText.test.ts
git commit -m "feat(pdf): add extractText utility for PDF text extraction via pdfjs-dist"
```

---

## Task 2: HuggingFace client + summarize + translate logic

**Files:**
- Create: `lib/ai/huggingface.ts`
- Create: `lib/ai/summarize.ts`
- Create: `lib/ai/translate.ts`
- Create: `__tests__/unit/lib/ai/summarize.test.ts`
- Create: `__tests__/unit/lib/ai/translate.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/unit/lib/ai/summarize.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { prepareChunksForSummary, combineSummaries } from '@/lib/ai/summarize'

describe('prepareChunksForSummary', () => {
  it('returns empty array for empty text', () => {
    expect(prepareChunksForSummary('')).toEqual([])
  })

  it('returns single chunk for short text', () => {
    const chunks = prepareChunksForSummary('This is a short document.')
    expect(chunks).toHaveLength(1)
  })

  it('splits long text into multiple chunks', () => {
    const longText = Array.from({ length: 1000 }, (_, i) => `word${i}`).join(' ')
    const chunks = prepareChunksForSummary(longText)
    expect(chunks.length).toBeGreaterThan(1)
  })
})

describe('combineSummaries', () => {
  it('joins summaries with newlines', () => {
    const result = combineSummaries(['Part 1 summary.', 'Part 2 summary.'])
    expect(result).toContain('Part 1 summary.')
    expect(result).toContain('Part 2 summary.')
  })

  it('returns single summary unchanged', () => {
    expect(combineSummaries(['Only one part.'])).toBe('Only one part.')
  })
})
```

Create `__tests__/unit/lib/ai/translate.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { SUPPORTED_LANGUAGES, getTranslationModel, validateTargetLanguage } from '@/lib/ai/translate'

describe('SUPPORTED_LANGUAGES', () => {
  it('contains at least 8 languages', () => {
    expect(Object.keys(SUPPORTED_LANGUAGES).length).toBeGreaterThanOrEqual(8)
  })

  it('each entry has code, label, and model', () => {
    for (const [code, entry] of Object.entries(SUPPORTED_LANGUAGES)) {
      expect(typeof code).toBe('string')
      expect(typeof entry.label).toBe('string')
      expect(typeof entry.model).toBe('string')
      expect(entry.model).toContain('Helsinki-NLP')
    }
  })
})

describe('validateTargetLanguage', () => {
  it('returns true for supported language codes', () => {
    const [firstCode] = Object.keys(SUPPORTED_LANGUAGES)
    expect(validateTargetLanguage(firstCode)).toBe(true)
  })

  it('returns false for unsupported codes', () => {
    expect(validateTargetLanguage('klingon')).toBe(false)
    expect(validateTargetLanguage('')).toBe(false)
  })
})

describe('getTranslationModel', () => {
  it('returns the correct Helsinki-NLP model for a supported language', () => {
    const [firstCode, firstEntry] = Object.entries(SUPPORTED_LANGUAGES)[0]
    expect(getTranslationModel(firstCode)).toBe(firstEntry.model)
  })

  it('throws for unsupported language code', () => {
    expect(() => getTranslationModel('klingon')).toThrow()
  })
})
```

Run: `pnpm test __tests__/unit/lib/ai/summarize.test.ts __tests__/unit/lib/ai/translate.test.ts`
Expected: FAIL.

- [ ] **Step 2: Create `lib/ai/huggingface.ts`**

```typescript
const HF_API_BASE = 'https://api-inference.huggingface.co/models'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000

interface HFError { error?: string; estimated_time?: number }

/**
 * Calls the HuggingFace free Inference API for a given model.
 * Automatically retries when the model is warming up (503/loading).
 */
export async function hfInference<T>(
  model: string,
  payload: Record<string, unknown>,
  apiKey: string,
): Promise<T> {
  if (!apiKey) {
    throw new Error('HUGGINGFACE_API_KEY is not configured')
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(`${HF_API_BASE}/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      return res.json() as Promise<T>
    }

    const body = await res.json().catch(() => ({})) as HFError

    // Model is loading (cold start) — wait and retry
    if (res.status === 503 && body.error?.includes('loading')) {
      const waitMs = (body.estimated_time ?? 20) * 1000
      await new Promise(r => setTimeout(r, Math.min(waitMs, RETRY_DELAY_MS)))
      lastError = new Error(`Model loading, retrying... (${body.error})`)
      continue
    }

    // Rate limit
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
      lastError = new Error('Rate limit reached. Please try again shortly.')
      continue
    }

    throw new Error(body.error ?? `HuggingFace API error: ${res.status}`)
  }

  throw lastError ?? new Error('HuggingFace API failed after retries')
}
```

- [ ] **Step 3: Create `lib/ai/summarize.ts`**

```typescript
import { chunkText } from '@/lib/pdf/extractText'
import { hfInference } from './huggingface'

const SUMMARIZATION_MODEL = 'facebook/bart-large-cnn'
const CHUNK_WORDS = 400 // bart-large-cnn max is ~1024 tokens ≈ 700 words, stay safe

/**
 * Splits text into chunks suitable for BART summarization.
 * Exported for unit testing.
 */
export function prepareChunksForSummary(text: string): string[] {
  return chunkText(text.trim(), CHUNK_WORDS).filter(c => c.split(/\s+/).length >= 10)
}

/**
 * Joins multiple partial summaries into a final summary.
 * Exported for unit testing.
 */
export function combineSummaries(summaries: string[]): string {
  if (summaries.length === 1) return summaries[0]
  return summaries.join('\n\n')
}

interface BartSummaryResponse { summary_text: string }

/**
 * Summarizes text using facebook/bart-large-cnn via HuggingFace free API.
 * Handles long documents by chunking and combining partial summaries.
 */
export async function summarizeText(text: string, apiKey: string): Promise<string> {
  const chunks = prepareChunksForSummary(text)

  if (chunks.length === 0) {
    throw new Error('No readable text found in the PDF to summarize.')
  }

  const summaries = await Promise.all(
    chunks.map(async chunk => {
      const result = await hfInference<BartSummaryResponse[]>(
        SUMMARIZATION_MODEL,
        {
          inputs: chunk,
          parameters: { max_length: 150, min_length: 40, do_sample: false },
        },
        apiKey,
      )
      return result[0]?.summary_text ?? ''
    }),
  )

  return combineSummaries(summaries.filter(s => s.length > 0))
}
```

- [ ] **Step 4: Create `lib/ai/translate.ts`**

```typescript
import { chunkText } from '@/lib/pdf/extractText'
import { hfInference } from './huggingface'

export interface LanguageEntry {
  label: string
  model: string
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageEntry> = {
  es: { label: 'Spanish', model: 'Helsinki-NLP/opus-mt-en-es' },
  fr: { label: 'French', model: 'Helsinki-NLP/opus-mt-en-fr' },
  de: { label: 'German', model: 'Helsinki-NLP/opus-mt-en-de' },
  it: { label: 'Italian', model: 'Helsinki-NLP/opus-mt-en-it' },
  pt: { label: 'Portuguese', model: 'Helsinki-NLP/opus-mt-en-ROMANCE' },
  nl: { label: 'Dutch', model: 'Helsinki-NLP/opus-mt-en-nl' },
  ru: { label: 'Russian', model: 'Helsinki-NLP/opus-mt-en-ru' },
  zh: { label: 'Chinese', model: 'Helsinki-NLP/opus-mt-en-zh' },
  ar: { label: 'Arabic', model: 'Helsinki-NLP/opus-mt-en-ar' },
  tr: { label: 'Turkish', model: 'Helsinki-NLP/opus-mt-en-tr' },
}

export function validateTargetLanguage(code: string): boolean {
  return code.length > 0 && code in SUPPORTED_LANGUAGES
}

export function getTranslationModel(code: string): string {
  const entry = SUPPORTED_LANGUAGES[code]
  if (!entry) throw new Error(`Unsupported target language: ${code}`)
  return entry.model
}

const CHUNK_WORDS = 200 // translation models have tighter limits

interface TranslationResponse { translation_text: string }

/**
 * Translates text to the target language using Helsinki-NLP models.
 * Chunks the text to stay within model token limits.
 */
export async function translateText(
  text: string,
  targetLangCode: string,
  apiKey: string,
): Promise<string> {
  if (!validateTargetLanguage(targetLangCode)) {
    throw new Error(`Unsupported language: ${targetLangCode}`)
  }

  const chunks = chunkText(text.trim(), CHUNK_WORDS).filter(c => c.trim().length > 0)

  if (chunks.length === 0) {
    throw new Error('No readable text found in the PDF to translate.')
  }

  const model = getTranslationModel(targetLangCode)

  const translations = await Promise.all(
    chunks.map(async chunk => {
      const result = await hfInference<TranslationResponse[]>(
        model,
        { inputs: chunk },
        apiKey,
      )
      return result[0]?.translation_text ?? ''
    }),
  )

  return translations.filter(t => t.length > 0).join(' ')
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test __tests__/unit/lib/ai/summarize.test.ts __tests__/unit/lib/ai/translate.test.ts
```

Expected: all passing.

- [ ] **Step 6: Run full QA**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: passing, test count increased by the new tests.

- [ ] **Step 7: Commit**

```bash
git add lib/ai/ __tests__/unit/lib/ai/
git commit -m "feat(ai): add HuggingFace client, summarize and translate logic with unit tests"
```

---

## Task 3: AI Summarizer API route + UI

**Files:**
- Create: `app/api/v1/process/ai-summarizer/route.ts`
- Create: `components/tool/tools/AiSummarizerTool.tsx`
- Modify: `app/[tool]/page.tsx`

- [ ] **Step 1: Create `app/api/v1/process/ai-summarizer/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { extractPdfText } from '@/lib/pdf/extractText'
import { summarizeText } from '@/lib/ai/summarize'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json(
      { success: false, error: { code: 'MISSING_FILE', message: 'No PDF file provided' } },
      { status: 400 },
    )
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json(
      { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 50 MB limit' } },
      { status: 413 },
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())

  if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_PDF', message: 'File is not a valid PDF' } },
      { status: 400 },
    )
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY ?? ''

  try {
    const text = await extractPdfText(bytes)
    const summary = await summarizeText(text, apiKey)
    return NextResponse.json({ success: true, summary })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'SUMMARIZE_FAILED', message: err instanceof Error ? err.message : 'Summarization failed' } },
      { status: 422 },
    )
  }
}
```

- [ ] **Step 2: Create `components/tool/tools/AiSummarizerTool.tsx`**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { Sparkles, Copy, Check } from 'lucide-react'
import { ToolLayout } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'

interface AiSummarizerToolProps { tool: Tool }

export function AiSummarizerTool({ tool: _tool }: AiSummarizerToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSummarise = useCallback(async () => {
    if (!file) return
    setStatus('processing')
    setError('')
    setSummary('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/v1/process/ai-summarizer', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? `Error ${res.status}`)
      setSummary(json.summary)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Summarization failed')
      setStatus('error')
    }
  }, [file])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [summary])

  const handleReset = useCallback(() => {
    setFile(null)
    setSummary('')
    setStatus('idle')
    setError('')
  }, [])

  const sidebar = (
    <div className="space-y-4">
      <div className="p-3 rounded-lg text-xs leading-relaxed"
        style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.15)', color: '#94A3B8' }}>
        Powered by <strong style={{ color: '#F1F5F9' }}>BART Large CNN</strong> via HuggingFace. The model reads your PDF text and produces a concise summary. First run may take 20–30 s while the model warms up.
      </div>
      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>{error}</p>
      )}
      {status === 'processing' && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
            <div className="w-4 h-4 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin shrink-0" />
            Summarising with AI… (may take up to 30 s)
          </div>
        </div>
      )}
      {status === 'done' && (
        <button onClick={handleReset} className="w-full py-2 text-xs rounded-lg transition-colors"
          style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          Summarise another PDF
        </button>
      )}
    </div>
  )

  const action = (
    <button
      onClick={status === 'done' ? handleCopy : handleSummarise}
      disabled={(!file && status === 'idle') || status === 'processing'}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: file || status === 'done'
          ? 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)'
          : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: file || status === 'done' ? '0 4px 20px rgba(236,72,153,0.35)' : 'none',
      }}
    >
      <span>{status === 'done' ? (copied ? 'Copied!' : 'Copy Summary') : 'Summarise PDF'}</span>
      {status === 'done'
        ? (copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />)
        : <span className="text-lg">→</span>}
    </button>
  )

  return (
    <ToolLayout
      sidebar={sidebar}
      action={action}
      sidebarHeader={
        <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>AI Summarizer</h2>
      }
    >
      {status === 'done' ? (
        /* Summary result */
        <div className="h-full flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>Summary</p>
            <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: copied ? '#10B981' : '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 rounded-xl text-sm leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0', whiteSpace: 'pre-wrap' }}>
            {summary}
          </div>
        </div>
      ) : !file ? (
        /* Drop zone */
        <div
          role="button" tabIndex={0} aria-label="Upload PDF to summarise"
          className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
          style={{ minHeight: '360px', background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.10)' }}
          onClick={() => document.getElementById('ai-sum-input')?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('ai-sum-input')?.click() }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)' }}>
            <Sparkles className="w-8 h-8" style={{ color: '#EC4899' }} />
          </div>
          <div className="text-center">
            <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>Select a PDF to summarise</p>
            <p className="text-sm" style={{ color: '#475569' }}>Drop here or click · up to 50 MB</p>
          </div>
          <input id="ai-sum-input" type="file" accept="application/pdf" className="sr-only"
            onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
        </div>
      ) : (
        /* File selected */
        <div className="flex flex-col items-center gap-4 pt-8">
          <Sparkles className="w-16 h-16" style={{ color: '#EC4899' }} />
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{file.name}</p>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>{formatFileSize(file.size)}</p>
          </div>
          <button onClick={() => setFile(null)} className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Change file
          </button>
        </div>
      )}
    </ToolLayout>
  )
}
```

- [ ] **Step 3: Register in `app/[tool]/page.tsx`**

```typescript
case 'ai-summarizer': return (await import('@/components/tool/tools/AiSummarizerTool')).AiSummarizerTool
```

- [ ] **Step 4: Run QA gate**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/process/ai-summarizer/ components/tool/tools/AiSummarizerTool.tsx app/\[tool\]/page.tsx
git commit -m "feat(ai-summarizer): PDF text extraction + BART summarization via HuggingFace free API"
```

---

## Task 4: Translate PDF API route + UI

**Files:**
- Create: `app/api/v1/process/translate-pdf/route.ts`
- Create: `components/tool/tools/TranslatePdfTool.tsx`
- Modify: `app/[tool]/page.tsx`

- [ ] **Step 1: Create `app/api/v1/process/translate-pdf/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { extractPdfText } from '@/lib/pdf/extractText'
import { translateText, validateTargetLanguage, SUPPORTED_LANGUAGES } from '@/lib/ai/translate'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const targetLang = (formData.get('targetLang') as string) || ''

  if (!file) {
    return NextResponse.json(
      { success: false, error: { code: 'MISSING_FILE', message: 'No PDF file provided' } },
      { status: 400 },
    )
  }

  if (!validateTargetLanguage(targetLang)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_LANGUAGE', message: `Unsupported language: "${targetLang}". Supported: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}` } },
      { status: 400 },
    )
  }

  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json(
      { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 15 MB limit for translation' } },
      { status: 413 },
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())

  if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_PDF', message: 'File is not a valid PDF' } },
      { status: 400 },
    )
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY ?? ''

  try {
    const text = await extractPdfText(bytes)
    const translated = await translateText(text, targetLang, apiKey)
    return NextResponse.json({
      success: true,
      translated,
      targetLang,
      targetLabel: SUPPORTED_LANGUAGES[targetLang].label,
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'TRANSLATE_FAILED', message: err instanceof Error ? err.message : 'Translation failed' } },
      { status: 422 },
    )
  }
}
```

- [ ] **Step 2: Create `components/tool/tools/TranslatePdfTool.tsx`**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { Languages, Copy, Check } from 'lucide-react'
import { ToolLayout } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'

const LANGUAGES = [
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'ru', label: 'Russian' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'tr', label: 'Turkish' },
]

interface TranslatePdfToolProps { tool: Tool }

export function TranslatePdfTool({ tool: _tool }: TranslatePdfToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [targetLang, setTargetLang] = useState('es')
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [translated, setTranslated] = useState('')
  const [targetLabel, setTargetLabel] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleTranslate = useCallback(async () => {
    if (!file) return
    setStatus('processing')
    setError('')
    setTranslated('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('targetLang', targetLang)
      const res = await fetch('/api/v1/process/translate-pdf', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? `Error ${res.status}`)
      setTranslated(json.translated)
      setTargetLabel(json.targetLabel)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed')
      setStatus('error')
    }
  }, [file, targetLang])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(translated)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [translated])

  const handleReset = useCallback(() => {
    setFile(null)
    setTranslated('')
    setStatus('idle')
    setError('')
  }, [])

  const sidebar = (
    <div className="space-y-5">
      {/* Language selector */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
          Translate to
        </p>
        <div className="space-y-1.5">
          {LANGUAGES.map(lang => (
            <button key={lang.code} onClick={() => setTargetLang(lang.code)}
              disabled={status === 'processing'}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all"
              style={{
                background: targetLang === lang.code ? 'rgba(236,72,153,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${targetLang === lang.code ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: targetLang === lang.code ? '#F1F5F9' : '#94A3B8',
              }}
            >{lang.label}</button>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg text-xs leading-relaxed"
        style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.12)', color: '#94A3B8' }}>
        Powered by <strong style={{ color: '#F1F5F9' }}>Helsinki-NLP</strong> via HuggingFace. First run may take up to 30 s. PDFs up to 15 MB.
      </div>

      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>{error}</p>
      )}
      {status === 'processing' && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
          <div className="w-4 h-4 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin shrink-0" />
          Translating… (may take up to 30 s)
        </div>
      )}
      {status === 'done' && (
        <button onClick={handleReset} className="w-full py-2 text-xs rounded-lg transition-colors"
          style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          Translate another PDF
        </button>
      )}
    </div>
  )

  const action = (
    <button
      onClick={status === 'done' ? handleCopy : handleTranslate}
      disabled={(!file && status === 'idle') || status === 'processing'}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: file || status === 'done'
          ? 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)'
          : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: file || status === 'done' ? '0 4px 20px rgba(236,72,153,0.35)' : 'none',
      }}
    >
      <span>{status === 'done' ? (copied ? 'Copied!' : 'Copy Translation') : 'Translate PDF'}</span>
      {status === 'done'
        ? (copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />)
        : <span className="text-lg">→</span>}
    </button>
  )

  return (
    <ToolLayout
      sidebar={sidebar}
      action={action}
      sidebarHeader={
        <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>Translate PDF</h2>
      }
    >
      {status === 'done' ? (
        <div className="h-full flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
              Translation — {targetLabel}
            </p>
            <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: copied ? '#10B981' : '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 rounded-xl text-sm leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0', whiteSpace: 'pre-wrap' }}>
            {translated}
          </div>
        </div>
      ) : !file ? (
        <div
          role="button" tabIndex={0} aria-label="Upload PDF to translate"
          className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
          style={{ minHeight: '360px', background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.10)' }}
          onClick={() => document.getElementById('translate-input')?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('translate-input')?.click() }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)' }}>
            <Languages className="w-8 h-8" style={{ color: '#EC4899' }} />
          </div>
          <div className="text-center">
            <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>Select a PDF to translate</p>
            <p className="text-sm" style={{ color: '#475569' }}>Drop here or click · up to 15 MB</p>
          </div>
          <input id="translate-input" type="file" accept="application/pdf" className="sr-only"
            onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 pt-8">
          <Languages className="w-16 h-16" style={{ color: '#EC4899' }} />
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{file.name}</p>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>{formatFileSize(file.size)}</p>
          </div>
          <button onClick={() => setFile(null)} className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Change file
          </button>
        </div>
      )}
    </ToolLayout>
  )
}
```

- [ ] **Step 3: Register in `app/[tool]/page.tsx`**

```typescript
case 'translate-pdf': return (await import('@/components/tool/tools/TranslatePdfTool')).TranslatePdfTool
```

- [ ] **Step 4: Run full QA gate**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Expected: all pass.

- [ ] **Step 5: Commit and push**

```bash
git add app/api/v1/process/translate-pdf/ components/tool/tools/TranslatePdfTool.tsx app/\[tool\]/page.tsx
git commit -m "feat(translate-pdf): PDF text extraction + Helsinki-NLP translation via HuggingFace free API"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ AI Summarizer using `facebook/bart-large-cnn` (free HuggingFace) — Task 3
- ✅ Translate PDF using `Helsinki-NLP/opus-mt-en-*` (10 languages) — Task 4
- ✅ No paid model — HuggingFace free inference API only
- ✅ `HUGGINGFACE_API_KEY` from env (already in `.env.local`)
- ✅ PDF text extraction via pdfjs-dist (already installed) — Task 1
- ✅ Chunking for long documents — Tasks 1 + 2
- ✅ Retry logic for cold model starts (up to 3 retries) — Task 2
- ✅ Results displayed as text with copy button — Tasks 3 + 4

**Known limitations (documented in UI):**
- First run: 20–30 s model warm-up on HuggingFace free tier
- Translation outputs text only (not a new PDF)
- Summarization chunk quality may vary for highly technical documents

---

## Task 5: PDF Q&A (lib + API routes + UI)

**Files:**
- Create: `lib/ai/qa.ts`
- Create: `app/api/v1/process/pdf-qa/extract/route.ts`
- Create: `app/api/v1/process/pdf-qa/ask/route.ts`
- Create: `__tests__/unit/lib/ai/qa.test.ts`
- Create: `components/tool/tools/PdfQaTool.tsx`
- Modify: `app/[tool]/page.tsx`

**Approach:** Two-step stateless API.
1. `POST /api/v1/process/pdf-qa/extract` — upload up to 5 PDFs (15 MB each), returns `{ context: string }` (all text joined)
2. `POST /api/v1/process/pdf-qa/ask` — send `{ context, question }`, returns `{ answer, score, start, end }`

**Model:** `deepset/roberta-base-squad2` (extractive QA). Finds answer spans within the document. Fast, free, no hallucination risk. Falls back to "I couldn't find a clear answer in the document." when confidence is low (score < 0.1).

**Context limit:** Top 5 most keyword-relevant chunks (500 words each) sent per question to stay within model limits.

- [ ] **Step 1: Write failing unit tests**

Create `__tests__/unit/lib/ai/qa.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { findRelevantChunks, buildQaContext } from '@/lib/ai/qa'

const SAMPLE_TEXT = `
Chapter 1: Introduction
The pdf-genie project is a web application for manipulating PDF files.
It supports merging, splitting, and compressing PDFs.

Chapter 2: Features
The application includes over 30 tools organized in 7 categories.
Each tool has a dedicated page with a file upload interface.
The design uses a dark atmospheric theme with cyan accents.
`

describe('findRelevantChunks', () => {
  it('returns chunks containing question keywords', () => {
    const chunks = findRelevantChunks('What tools does it support?', SAMPLE_TEXT, 3)
    expect(chunks.length).toBeGreaterThan(0)
    const joined = chunks.join(' ').toLowerCase()
    expect(joined).toMatch(/tool|support|merge|split/)
  })

  it('returns empty array for empty context', () => {
    expect(findRelevantChunks('question?', '', 3)).toEqual([])
  })

  it('limits to maxChunks', () => {
    const chunks = findRelevantChunks('pdf', SAMPLE_TEXT, 2)
    expect(chunks.length).toBeLessThanOrEqual(2)
  })
})

describe('buildQaContext', () => {
  it('joins chunks with separators', () => {
    const result = buildQaContext(['chunk one', 'chunk two'])
    expect(result).toContain('chunk one')
    expect(result).toContain('chunk two')
  })

  it('returns empty string for empty array', () => {
    expect(buildQaContext([])).toBe('')
  })
})
```

Run: `pnpm test __tests__/unit/lib/ai/qa.test.ts`
Expected: FAIL.

- [ ] **Step 2: Create `lib/ai/qa.ts`**

```typescript
import { chunkText } from '@/lib/pdf/extractText'
import { hfInference } from './huggingface'

const QA_MODEL = 'deepset/roberta-base-squad2'
const CHUNK_WORDS = 500
const MAX_CONTEXT_CHUNKS = 5
const LOW_CONFIDENCE_THRESHOLD = 0.05

/**
 * Scores a chunk by how many unique question keywords it contains.
 */
function scoreChunk(chunk: string, questionWords: string[]): number {
  const lowerChunk = chunk.toLowerCase()
  return questionWords.filter(w => w.length > 3 && lowerChunk.includes(w)).length
}

/**
 * Splits context text into chunks and returns the most relevant ones for the question.
 * Exported for unit testing.
 */
export function findRelevantChunks(
  question: string,
  context: string,
  maxChunks: number,
): string[] {
  if (!context.trim()) return []
  const chunks = chunkText(context, CHUNK_WORDS)
  if (chunks.length === 0) return []

  const questionWords = question.toLowerCase().split(/\W+/).filter(w => w.length > 2)

  return chunks
    .map(chunk => ({ chunk, score: scoreChunk(chunk, questionWords) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .map(({ chunk }) => chunk)
}

/**
 * Joins relevant chunks into a single context string for the QA model.
 * Exported for unit testing.
 */
export function buildQaContext(chunks: string[]): string {
  return chunks.join('\n\n---\n\n')
}

interface RobertaQaResponse {
  answer: string
  score: number
  start: number
  end: number
}

/**
 * Answers a question from document context using deepset/roberta-base-squad2.
 * Returns null answer when confidence is too low.
 */
export async function answerQuestion(
  question: string,
  fullContext: string,
  apiKey: string,
): Promise<{ answer: string; score: number }> {
  if (!question.trim()) throw new Error('Question cannot be empty')
  if (!fullContext.trim()) throw new Error('No document context available')

  const relevantChunks = findRelevantChunks(question, fullContext, MAX_CONTEXT_CHUNKS)
  const context = buildQaContext(relevantChunks) || fullContext.slice(0, 3000)

  const result = await hfInference<RobertaQaResponse>(
    QA_MODEL,
    { inputs: { question, context } },
    apiKey,
  )

  if (result.score < LOW_CONFIDENCE_THRESHOLD) {
    return {
      answer: "I couldn't find a clear answer to that in the uploaded document(s). Try rephrasing or ask about something mentioned in the text.",
      score: result.score,
    }
  }

  return { answer: result.answer, score: result.score }
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm test __tests__/unit/lib/ai/qa.test.ts
```

Expected: all passing.

- [ ] **Step 4: Create `app/api/v1/process/pdf-qa/extract/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { extractPdfText } from '@/lib/pdf/extractText'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const files = formData.getAll('files') as File[]

  if (files.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'MISSING_FILES', message: 'No PDF files provided' } },
      { status: 400 },
    )
  }

  if (files.length > 5) {
    return NextResponse.json(
      { success: false, error: { code: 'TOO_MANY_FILES', message: 'Maximum 5 PDFs allowed' } },
      { status: 400 },
    )
  }

  const allTexts: string[] = []

  for (const file of files) {
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: `${file.name} exceeds 15 MB limit` } },
        { status: 413 },
      )
    }

    const bytes = new Uint8Array(await file.arrayBuffer())

    if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PDF', message: `${file.name} is not a valid PDF` } },
        { status: 400 },
      )
    }

    try {
      const text = await extractPdfText(bytes)
      if (text.trim()) allTexts.push(`=== ${file.name} ===\n${text}`)
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'EXTRACT_FAILED', message: `Failed to extract text from ${file.name}` } },
        { status: 422 },
      )
    }
  }

  if (allTexts.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_TEXT', message: 'No readable text found in the uploaded PDF(s)' } },
      { status: 422 },
    )
  }

  return NextResponse.json({ success: true, context: allTexts.join('\n\n') })
}
```

- [ ] **Step 5: Create `app/api/v1/process/pdf-qa/ask/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { answerQuestion } from '@/lib/ai/qa'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)

  if (!body || typeof body.question !== 'string' || typeof body.context !== 'string') {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_BODY', message: 'Request body must include question and context strings' } },
      { status: 400 },
    )
  }

  const { question, context } = body as { question: string; context: string }

  if (!question.trim()) {
    return NextResponse.json(
      { success: false, error: { code: 'EMPTY_QUESTION', message: 'Question cannot be empty' } },
      { status: 400 },
    )
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY ?? ''

  try {
    const result = await answerQuestion(question, context, apiKey)
    return NextResponse.json({ success: true, answer: result.answer, score: result.score })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'QA_FAILED', message: err instanceof Error ? err.message : 'Q&A failed' } },
      { status: 422 },
    )
  }
}
```

- [ ] **Step 6: Create `components/tool/tools/PdfQaTool.tsx`**

```typescript
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { MessageSquare, Send, X, FileText } from 'lucide-react'
import { ToolLayout } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'

interface Message { role: 'user' | 'assistant'; text: string }

interface PdfQaToolProps { tool: Tool }

export function PdfQaTool({ tool }: PdfQaToolProps) {
  const [files, setFiles] = useState<File[]>([])
  const [context, setContext] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [stage, setStage] = useState<'upload' | 'indexing' | 'chat'>('upload')
  const [error, setError] = useState('')
  const [asking, setAsking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleIndex = useCallback(async () => {
    if (files.length === 0) return
    setStage('indexing')
    setError('')
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))
      const res = await fetch('/api/v1/process/pdf-qa/extract', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? `Error ${res.status}`)
      setContext(json.context)
      setStage('chat')
      setMessages([{
        role: 'assistant',
        text: `Ready! I've read ${files.length} PDF${files.length > 1 ? 's' : ''}. Ask me anything about the content.`,
      }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process PDFs')
      setStage('upload')
    }
  }, [files])

  const handleAsk = useCallback(async () => {
    if (!input.trim() || !context || asking) return
    const question = input.trim()
    setInput('')
    setAsking(true)
    setMessages(prev => [...prev, { role: 'user', text: question }])

    try {
      const res = await fetch('/api/v1/process/pdf-qa/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? `Error ${res.status}`)
      setMessages(prev => [...prev, { role: 'assistant', text: json.answer }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: err instanceof Error ? err.message : 'Failed to get answer',
      }])
    } finally {
      setAsking(false)
    }
  }, [input, context, asking])

  const handleReset = useCallback(() => {
    setFiles([])
    setContext(null)
    setMessages([])
    setInput('')
    setStage('upload')
    setError('')
  }, [])

  const sidebar = (
    <div className="space-y-4">
      {stage === 'chat' && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
            Loaded documents
          </p>
          <div className="space-y-1.5">
            {files.map(f => (
              <div key={f.name} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: '#06B6D4' }} />
                <span className="text-xs truncate" style={{ color: '#94A3B8' }}>{f.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 rounded-lg text-xs leading-relaxed"
        style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.12)', color: '#94A3B8' }}>
        Powered by <strong style={{ color: '#F1F5F9' }}>RoBERTa</strong> via HuggingFace. Answers are extracted directly from your document text — no hallucination. Up to {tool.maxFiles} PDFs, 15 MB each, 10 pages recommended.
      </div>

      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>{error}</p>
      )}

      {stage !== 'upload' && (
        <button onClick={handleReset} className="w-full py-2 text-xs rounded-lg transition-colors"
          style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          Start over
        </button>
      )}
    </div>
  )

  const action = stage === 'upload' ? (
    <button onClick={handleIndex} disabled={files.length === 0}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: files.length > 0 ? 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)' : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: files.length > 0 ? '0 4px 20px rgba(236,72,153,0.35)' : 'none',
      }}
    >
      <span>Start Q&amp;A Session</span>
      <span className="text-lg">→</span>
    </button>
  ) : null

  return (
    <ToolLayout
      sidebar={sidebar}
      action={action ?? undefined}
      sidebarHeader={
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>PDF Q&amp;A</h2>
          {stage === 'chat' && (
            <span className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} title="Ready" />
          )}
        </div>
      }
    >
      {stage === 'upload' ? (
        /* Upload zone */
        <div className="flex flex-col gap-5">
          <div
            role="button" tabIndex={0} aria-label="Upload PDFs for Q&A"
            className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all"
            style={{ minHeight: '280px', background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.10)' }}
            onClick={() => document.getElementById('qa-input')?.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('qa-input')?.click() }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf').slice(0, tool.maxFiles)
              setFiles(prev => [...prev, ...dropped].slice(0, tool.maxFiles))
            }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)' }}>
              <MessageSquare className="w-8 h-8" style={{ color: '#EC4899' }} />
            </div>
            <div className="text-center">
              <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>Upload PDFs to chat with</p>
              <p className="text-sm" style={{ color: '#475569' }}>Up to {tool.maxFiles} PDFs · 15 MB each</p>
            </div>
            <input id="qa-input" type="file" accept="application/pdf" multiple className="sr-only"
              onChange={e => {
                const selected = Array.from(e.target.files ?? []).slice(0, tool.maxFiles)
                setFiles(prev => [...prev, ...selected].slice(0, tool.maxFiles))
              }} />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={f.name + i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <FileText className="w-4 h-4 shrink-0" style={{ color: '#06B6D4' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#E2E8F0' }}>{f.name}</p>
                    <p className="text-[10px]" style={{ color: '#475569' }}>{formatFileSize(f.size)}</p>
                  </div>
                  <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove ${f.name}`}
                    style={{ color: '#475569' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : stage === 'indexing' ? (
        /* Processing */
        <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: '360px' }}>
          <div className="w-12 h-12 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-sm" style={{ color: '#94A3B8' }}>Reading your PDFs… first run may take 20–30 s</p>
        </div>
      ) : (
        /* Chat interface */
        <div className="flex flex-col h-full" style={{ minHeight: '400px' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-4" style={{ maxHeight: '400px' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={msg.role === 'user' ? {
                    background: 'linear-gradient(135deg, #EC4899, #DB2777)',
                    color: '#fff',
                    borderBottomRightRadius: '4px',
                  } : {
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: '#E2E8F0',
                    borderBottomLeftRadius: '4px',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {asking && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl flex gap-1.5"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: '#94A3B8', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 mt-4">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk() } }}
              placeholder="Ask a question about your PDFs…"
              disabled={asking}
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#F1F5F9',
              }}
            />
            <button
              onClick={handleAsk}
              disabled={!input.trim() || asking}
              className="px-4 py-3 rounded-xl transition-all disabled:opacity-40"
              style={{
                background: input.trim() ? 'linear-gradient(135deg, #EC4899, #DB2777)' : 'rgba(255,255,255,0.05)',
                color: '#fff',
              }}
              aria-label="Send question"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  )
}
```

- [ ] **Step 7: Register in `app/[tool]/page.tsx`**

```typescript
case 'pdf-qa': return (await import('@/components/tool/tools/PdfQaTool')).PdfQaTool
```

- [ ] **Step 8: Run full QA gate**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Expected: all pass, new tests for `qa.ts` included.

- [ ] **Step 9: Commit**

```bash
git add lib/ai/qa.ts app/api/v1/process/pdf-qa/ components/tool/tools/PdfQaTool.tsx __tests__/unit/lib/ai/qa.test.ts app/\[tool\]/page.tsx config/tools.ts
git commit -m "feat(pdf-qa): chat Q&A session on uploaded PDFs via RoBERTa extractive QA"
```
