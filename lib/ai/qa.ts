import { hfInference } from './huggingface'

const BART_MODEL = 'facebook/bart-large-cnn'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Splits text into section-aware chunks.
 * Detects ALL-CAPS headers (common in resumes, reports) and splits there.
 * Falls back to sentence-level splitting for documents without headers.
 */
export function splitIntoSections(text: string): string[] {
  // Detect ALL-CAPS section headers (2+ words or a single word >= 4 chars)
  const headerPattern = /\b([A-Z]{2}[A-Z\s&\/]{1,30})\b(?=\s)/g
  const matches = [...text.matchAll(headerPattern)]

  if (matches.length >= 2) {
    // Section-based split: each section header starts a new chunk
    const sections: string[] = []
    let lastIdx = 0
    for (const match of matches) {
      const slice = text.slice(lastIdx, match.index).trim()
      if (slice.length > 20) sections.push(slice)
      lastIdx = match.index!
    }
    sections.push(text.slice(lastIdx).trim())
    return sections.filter(s => s.trim().length > 20)
  }

  // No headers — split by sentences (50 words per chunk)
  const words = text.trim().split(/\s+/)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += 50) {
    chunks.push(words.slice(i, i + 50).join(' '))
  }
  return chunks.filter(s => s.trim().length > 0)
}

function scoreSection(section: string, questionWords: string[]): number {
  const lower = section.toLowerCase()
  return questionWords.filter(w => w.length > 2 && lower.includes(w)).length
}

/**
 * Finds the most relevant text sections for a question.
 * Exported for unit testing.
 */
export function findRelevantChunks(question: string, context: string, maxChunks: number): string[] {
  if (!context.trim()) return []
  const sections = splitIntoSections(context)
  if (sections.length === 0) return []
  const qWords = question.toLowerCase().split(/\W+/).filter(w => w.length > 2)
  return sections
    .map(s => ({ s, score: scoreSection(s, qWords) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .map(({ s }) => s)
}

/**
 * Joins sections for display.
 * Exported for unit testing.
 */
export function buildQaContext(chunks: string[]): string {
  return chunks.join('\n\n---\n\n')
}

interface BartResponse { summary_text: string }

/**
 * Answers a question from document context.
 *
 * Strategy:
 * 1. Split document into sections (by ALL-CAPS headers or sentences)
 * 2. Find sections most relevant to the question via keyword scoring
 * 3. If the relevant section is short (< 100 words) — return it directly as the answer
 *    (it IS the answer — e.g. an education section listing degrees)
 * 4. If the relevant section is long — summarize with BART to get a concise answer
 */
export async function answerQuestion(
  question: string,
  fullContext: string,
  apiKey: string,
): Promise<{ answer: string; score: number }> {
  if (!question.trim()) throw new Error('Question cannot be empty')
  if (!fullContext.trim()) throw new Error('No document context available')

  const sections = splitIntoSections(fullContext)
  if (sections.length === 0) {
    return { answer: 'No readable text found in the uploaded document(s).', score: 0 }
  }

  const qWords = question.toLowerCase().split(/\W+/).filter(w => w.length > 2)

  const scored = sections
    .map(s => ({ s, score: scoreSection(s, qWords) }))
    .sort((a, b) => b.score - a.score)

  // Take the top 2 most relevant sections
  const topSections = scored.filter(x => x.score > 0).slice(0, 2).map(x => x.s)
  const relevant = topSections.length > 0 ? topSections : sections.slice(0, 2)
  const relevantText = relevant.join('\n\n').trim()

  const wordCount = relevantText.split(/\s+/).length

  // Short relevant section → return it directly (it IS the answer)
  if (wordCount <= 120) {
    // Clean up repetitive whitespace while preserving structure
    const clean = relevantText.replace(/\s{3,}/g, '  ').trim()
    return { answer: clean, score: scored[0]?.score > 0 ? 0.8 : 0.3 }
  }

  // Longer section → summarize with BART
  const result = await hfInference<BartResponse[]>(
    BART_MODEL,
    { inputs: relevantText, parameters: { max_length: 200, min_length: 30, do_sample: false } },
    apiKey,
  )

  const answer = result[0]?.summary_text?.trim()
  if (!answer) {
    return {
      answer: "I couldn't find a clear answer in the uploaded document(s). Try rephrasing your question.",
      score: 0,
    }
  }

  return { answer, score: 1 }
}
