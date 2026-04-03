import { chunkText } from '@/lib/pdf/extractText'
import { hfInference } from './huggingface'

const QA_MODEL = 'deepset/roberta-base-squad2'
const CHUNK_WORDS = 500
const MAX_CONTEXT_CHUNKS = 5
const LOW_CONFIDENCE_THRESHOLD = 0.05

function scoreChunk(chunk: string, questionWords: string[]): number {
  const lower = chunk.toLowerCase()
  return questionWords.filter(w => w.length > 3 && lower.includes(w)).length
}

export function findRelevantChunks(question: string, context: string, maxChunks: number): string[] {
  if (!context.trim()) return []
  const chunks = chunkText(context, CHUNK_WORDS)
  if (chunks.length === 0) return []
  const qWords = question.toLowerCase().split(/\W+/).filter(w => w.length > 2)
  return chunks
    .map(chunk => ({ chunk, score: scoreChunk(chunk, qWords) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .map(({ chunk }) => chunk)
}

export function buildQaContext(chunks: string[]): string {
  return chunks.join('\n\n---\n\n')
}

interface RobertaQaResponse { answer: string; score: number; start: number; end: number }

export async function answerQuestion(
  question: string,
  fullContext: string,
  apiKey: string,
): Promise<{ answer: string; score: number }> {
  if (!question.trim()) throw new Error('Question cannot be empty')
  if (!fullContext.trim()) throw new Error('No document context available')

  const chunks = findRelevantChunks(question, fullContext, MAX_CONTEXT_CHUNKS)
  const context = buildQaContext(chunks) || fullContext.slice(0, 3000)

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
