import { chunkText } from '@/lib/pdf/extractText'
import { hfInference } from './huggingface'

const SUMMARIZATION_MODEL = 'facebook/bart-large-cnn'
const CHUNK_WORDS = 400
const MIN_WORDS_FOR_CHUNK = 10

const KIMI_ENDPOINT = 'https://router.huggingface.co/hf-inference/models/moonshotai/Kimi-K2.5/v1/chat/completions'
const KIMI_MODEL = 'moonshotai/Kimi-K2.5'
const MAX_TEXT_CHARS = 15000 // Kimi has 256k context window; 15k chars is a safe chunk for free tier

interface BartResponse { summary_text: string }

export function prepareChunksForSummary(text: string): string[] {
  return chunkText(text.trim(), CHUNK_WORDS)
    .filter(c => c.split(/\s+/).length >= MIN_WORDS_FOR_CHUNK)
}

export function combineSummaries(summaries: string[]): string {
  if (summaries.length === 1) return summaries[0]
  return summaries.join('\n\n')
}

export async function summarizeText(text: string, apiKey: string): Promise<string> {
  const chunks = prepareChunksForSummary(text)
  if (chunks.length === 0) {
    throw new Error('No readable text found in the PDF to summarize.')
  }

  const summaries = await Promise.all(
    chunks.map(async chunk => {
      const result = await hfInference<BartResponse[]>(
        SUMMARIZATION_MODEL,
        { inputs: chunk, parameters: { max_length: 150, min_length: 40, do_sample: false } },
        apiKey,
      )
      return result[0]?.summary_text ?? ''
    }),
  )

  return combineSummaries(summaries.filter(s => s.length > 0))
}

/**
 * Summarises text using Kimi K2.5 via HuggingFace.
 * Better quality than BART but slower (30-60s on first cold start).
 */
export async function summarizeWithKimi(text: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY is not configured')
  if (!text.trim()) throw new Error('No readable text found in the PDF to summarize.')

  const truncated = text.slice(0, MAX_TEXT_CHARS)

  const res = await fetch(KIMI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: KIMI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a precise document summariser. Produce a clear, well-structured summary covering the main points, key findings, and important conclusions. Use plain prose — no bullet points unless they appear naturally in the source.',
        },
        {
          role: 'user',
          content: `Summarise the following document:\n\n${truncated}`,
        },
      ],
      max_tokens: 600,
      temperature: 0.3,
      stream: false,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    if (res.status === 503) {
      throw new Error('Kimi K2.5 is warming up. Please wait 30 seconds and try again.')
    }
    throw new Error(err.error ?? `Kimi API error: ${res.status}`)
  }

  const json = await res.json() as { choices: { message: { content: string } }[] }
  const summary = json.choices?.[0]?.message?.content?.trim()
  if (!summary) throw new Error('No summary returned from Kimi K2.5.')
  return summary
}
