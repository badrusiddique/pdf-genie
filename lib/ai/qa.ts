import { chunkText } from '@/lib/pdf/extractText'
import { hfInference } from './huggingface'

const QA_MODEL = 'deepset/roberta-base-squad2'
const CHUNK_WORDS = 500
const MAX_CONTEXT_CHUNKS = 5
const LOW_CONFIDENCE_THRESHOLD = 0.05

const KIMI_MODEL = 'moonshotai/Kimi-K2.5'
const KIMI_ENDPOINT = `https://api-inference.huggingface.co/models/${KIMI_MODEL}/v1/chat/completions`
const MAX_CONTEXT_CHARS = 8000

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

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

/**
 * Sends a conversation with PDF context to Kimi K2.5 via HuggingFace.
 * history is all previous turns (user + assistant); the last user message is already included.
 */
export async function chatWithKimi(
  history: ChatMessage[],
  fullContext: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY is not configured')
  if (history.length === 0) throw new Error('No messages in conversation')

  const lastQuestion = history[history.length - 1].content

  // Find relevant context chunks for the latest question
  const chunks = findRelevantChunks(lastQuestion, fullContext, 5)
  const context = buildQaContext(chunks) || fullContext.slice(0, MAX_CONTEXT_CHARS)

  const systemPrompt = `You are a helpful document assistant. Answer questions based ONLY on the provided document context. If the answer is not in the context, say so clearly — do not make up information. Be concise and direct.

Document context:
${context.slice(0, MAX_CONTEXT_CHARS)}`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
  ]

  const res = await fetch(KIMI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: KIMI_MODEL,
      messages,
      max_tokens: 500,
      temperature: 0.3,
      stream: false,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    // Model loading (503) — give user a useful message
    if (res.status === 503) {
      throw new Error('Kimi K2.5 is warming up. Please try again in 30 seconds.')
    }
    throw new Error(err.error ?? `Kimi API error: ${res.status}`)
  }

  const json = await res.json() as { choices: { message: { content: string } }[] }
  const answer = json.choices?.[0]?.message?.content?.trim()
  if (!answer) throw new Error('No response from Kimi K2.5')
  return answer
}
