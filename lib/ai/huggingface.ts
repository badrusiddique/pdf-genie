const HF_API_BASE = 'https://router.huggingface.co/hf-inference/models'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000

interface HFError { error?: string; estimated_time?: number }

/**
 * Calls the HuggingFace free Inference API.
 * Retries automatically on model cold-start (503 loading).
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

    if (res.status === 503 && body.error?.includes('loading')) {
      const waitMs = Math.min((body.estimated_time ?? 20) * 1000, RETRY_DELAY_MS)
      await new Promise(r => setTimeout(r, waitMs))
      lastError = new Error(`Model is loading, retrying…`)
      continue
    }

    if (res.status === 429) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
      lastError = new Error('Rate limit reached. Please try again shortly.')
      continue
    }

    throw new Error(body.error ?? `HuggingFace API error: ${res.status}`)
  }

  throw lastError ?? new Error('HuggingFace API failed after retries')
}
