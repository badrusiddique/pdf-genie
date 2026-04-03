import { chunkText } from '@/lib/pdf/extractText'
import { hfInference } from './huggingface'

const SUMMARIZATION_MODEL = 'facebook/bart-large-cnn'
const CHUNK_WORDS = 400
const MIN_WORDS_FOR_CHUNK = 10

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
