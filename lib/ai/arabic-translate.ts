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

// Runs at most `concurrency` promises in parallel — keeps Vercel under 60s timeout
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

  // Build fixed-size chunks for batch API calls
  const chunks: string[][] = []
  for (let i = 0; i < preprocessed.length; i += CHUNK_SIZE) {
    chunks.push(preprocessed.slice(i, i + CHUNK_SIZE))
  }

  // Translate with concurrency pool — 8 parallel HF calls
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
  // Extract proper noun candidates from reference (all-caps sequences or TitleCase multi-word)
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

    // Find a reference phrase that's absent from the model output
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
