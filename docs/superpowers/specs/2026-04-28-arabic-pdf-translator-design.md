# Arabic PDF Translator — Design Spec

**Date:** 2026-04-28  
**Status:** Approved  
**Scope:** New dedicated tool in pdf-genie Intelligence category

---

## Context

Users regularly upload Arabic match report PDFs (same structure each week) and need English output PDFs with layout preserved. The existing `translate-pdf` tool only translates FROM English TO other languages and returns plain text — no layout preservation. This new tool handles Arabic→English specifically, preserves visual layout, and builds a persistent glossary so entity names (team names, venues, league names) are corrected automatically on every run.

Best free model identified via comparison script: `Helsinki-NLP/opus-mt-tc-big-ar-en` (chrF 32.8 vs 26.5 for the standard model).

---

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `config/tools.ts` | Add `arabic-pdf-translator` entry to Intelligence category |
| `app/[tool]/page.tsx` | Add switch case for new tool |
| `components/tool/tools/ArabicPdfTranslatorTool.tsx` | Client component (`'use client'`) |
| `app/api/v1/process/arabic-pdf-translator/route.ts` | API route |
| `lib/ai/arabic-translate.ts` | Translation + two-pass glossary apply |
| `lib/pdf/layout-extractor.ts` | Extract text blocks + bounding boxes via pdfjs-dist |
| `lib/pdf/layout-reconstructor.ts` | Rebuild PDF with translated text via pdf-lib |

### New Dependency

- `pdf-lib` — draw white redaction rectangles + insert English text at exact positions

### Data Flow

```
[Client] Arabic PDF + optional reference PDF + glossary JSON (from localStorage)
    ↓ FormData POST /api/v1/process/arabic-pdf-translator
[Server]
  1. layout-extractor.ts  → text blocks [{page, bbox, text, fontSize}] — Arabic spans only
  2. arabic-translate.ts  → pre-pass: replace known glossary entities in Arabic source
  3. arabic-translate.ts  → batch-translate via opus-mt-tc-big-ar-en (chunks of 8, retry 503)
  4. arabic-translate.ts  → post-pass: apply glossary to translated output
  5. layout-reconstructor → white rect over each Arabic bbox, insert English text at same position
  6. Return binary PDF
[Client] Blob → download as <original-name>_EN.pdf
```

**Entity extraction mode** (reference PDF provided, `extract_entities_only=true`):
- Runs steps 1–3 only, extracts reference text, diffs model output vs reference
- Returns `{ar, en_model, en_reference}[]` — frontend shows review table, user saves to localStorage

---

## UI Layout

```
Sidebar                        | Main content
-------------------------------|----------------------------------
[Tool header + icon]           | [Primary drop zone: Arabic PDF]
[Error display]                |
                               | ▼ Improve entity names (toggle)
▼ Improve entity names         |   [Secondary drop zone: English ref PDF]
  [Reference PDF drop zone]    |   [Entity pairs review table]
                               |   (shown after reference uploaded)
Glossary (N saved)             |
  الفيصلي → Al-Faisaly  ✕    | [Translate PDF →] button
  الحسين  → Al-Hussein  ✕    |
  [Clear all]                  | [Progress: Extracting... / Translating N blocks... / Rebuilding PDF...]
                               |
[Reset]                        | [⬇ Download English PDF]
```

**UX notes:**
- Reference upload section collapsed by default — not in the way for normal use
- After reference upload: checkbox table shows `Arabic | Model said | Reference says | Save?`
- User ticks entries → "Save to glossary" → persisted to localStorage
- Download triggers a real `<a download>` click on a Blob URL (not inline display)
- Progress steps match server phases: Extracting text → Translating (N/total blocks) → Rebuilding PDF → Done

---

## Translation Pipeline

### `lib/pdf/layout-extractor.ts`

```ts
extractArabicBlocks(pdfBytes: Uint8Array): Promise<TextBlock[]>
// Uses pdfjs-dist getTextContent() per page
// Filters spans where text contains Unicode range 0x0600–0x06FF (Arabic)
// Returns: { page, bbox: [x0,y0,x1,y1], text, fontSize }[]
```

### `lib/ai/arabic-translate.ts`

```ts
translateArabicBlocks(
  blocks: TextBlock[],
  glossary: GlossaryEntry[],
  apiKey: string
): Promise<string[]>
```

1. **Pre-pass**: exact-match replace Arabic glossary entries in each block's text
2. **Batch translate**: chunks of 8, POST to `router.huggingface.co/hf-inference/models/Helsinki-NLP/opus-mt-tc-big-ar-en`, retry on 503 (2s/4s/8s backoff)
3. **Post-pass**: apply glossary to translated output strings

### `lib/pdf/layout-reconstructor.ts`

```ts
rebuildPdf(
  sourceBytes: Uint8Array,
  blocks: TextBlock[],
  translations: string[]
): Promise<Uint8Array>
```

- Loads PDF with `pdf-lib`
- Per block: `page.drawRectangle({ ...bbox, color: rgb(1,1,1) })` to blank Arabic
- `page.drawText(translation, { x, y, size: clamp(fontSize, 6, 24), font: Helvetica })`
- Returns modified PDF bytes

### `app/api/v1/process/arabic-pdf-translator/route.ts`

```
POST FormData:
  arabic_pdf            File     required  max 50MB
  reference_pdf         File     optional
  glossary              string   optional  JSON GlossaryEntry[]
  extract_entities_only string   optional  "true"

Response (translation):    Content-Type: application/pdf, binary bytes
Response (entity extract): { success: true, entities: [{ar, en_model, en_reference}] }
Error:                     { success: false, error: { code, message } }
```

---

## Glossary

### localStorage

```ts
// key: "arabic-translator-glossary"
type GlossaryEntry = { ar: string; en: string; source: "reference" | "manual" }
```

### Entity Extraction Algorithm

1. Translate Arabic PDF blocks with model → `model_output[]`
2. Extract text from reference English PDF
3. Tokenise reference into capitalized phrases (proper nouns, team names)
4. Find phrases in reference that don't appear in model output
5. Walk back to source Arabic block at same position → pair as `{ar, en_model, en_reference}`
6. Return only entries where `en_model ≠ en_reference`

### Glossary Management UI

- Sidebar lists all entries with ✕ delete button per entry
- "Clear all" button at bottom
- Count badge updates live
- Glossary JSON sent in FormData on every translation request

---

## Tool Config Entry

```ts
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
  maxSizeMB: 50,
}
```

---

## Verification Checklist

- [ ] Tool page renders at `/arabic-pdf-translator` (not "Coming soon")
- [ ] Arabic PDF upload → translated English PDF downloads correctly
- [ ] Layout preserved: images, borders, non-Arabic text untouched
- [ ] Reference PDF upload → entity pairs table shown
- [ ] Selected pairs saved to localStorage, persist on page reload
- [ ] Glossary entries applied: "الفيصلي" translates as "Al-Faisaly" not "Peanut."
- [ ] Glossary panel shows all saved entries, delete and clear-all work
- [ ] Progress steps update correctly during translation
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all pass
