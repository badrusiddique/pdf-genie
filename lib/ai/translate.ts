import { chunkText } from '@/lib/pdf/extractText'
import { hfInference } from './huggingface'

export interface LanguageEntry { label: string; model: string }

export const SUPPORTED_LANGUAGES: Record<string, LanguageEntry> = {
  es: { label: 'Spanish',    model: 'Helsinki-NLP/opus-mt-en-es' },
  fr: { label: 'French',     model: 'Helsinki-NLP/opus-mt-en-fr' },
  de: { label: 'German',     model: 'Helsinki-NLP/opus-mt-en-de' },
  it: { label: 'Italian',    model: 'Helsinki-NLP/opus-mt-en-it' },
  pt: { label: 'Portuguese', model: 'Helsinki-NLP/opus-mt-en-ROMANCE' },
  nl: { label: 'Dutch',      model: 'Helsinki-NLP/opus-mt-en-nl' },
  ru: { label: 'Russian',    model: 'Helsinki-NLP/opus-mt-en-ru' },
  zh: { label: 'Chinese',    model: 'Helsinki-NLP/opus-mt-en-zh' },
  ar: { label: 'Arabic',     model: 'Helsinki-NLP/opus-mt-en-ar' },
  tr: { label: 'Turkish',    model: 'Helsinki-NLP/opus-mt-en-tr' },
}

export function validateTargetLanguage(code: string): boolean {
  return code.length > 0 && code in SUPPORTED_LANGUAGES
}

export function getTranslationModel(code: string): string {
  const entry = SUPPORTED_LANGUAGES[code]
  if (!entry) throw new Error(`Unsupported target language: ${code}`)
  return entry.model
}

interface TranslationResponse { translation_text: string }

export async function translateText(text: string, targetLangCode: string, apiKey: string): Promise<string> {
  if (!validateTargetLanguage(targetLangCode)) {
    throw new Error(`Unsupported language: ${targetLangCode}`)
  }

  const chunks = chunkText(text.trim(), 200).filter(c => c.trim().length > 0)
  if (chunks.length === 0) {
    throw new Error('No readable text found in the PDF to translate.')
  }

  const model = getTranslationModel(targetLangCode)

  const translations = await Promise.all(
    chunks.map(async chunk => {
      const result = await hfInference<TranslationResponse[]>(model, { inputs: chunk }, apiKey)
      return result[0]?.translation_text ?? ''
    }),
  )

  return translations.filter(t => t.length > 0).join(' ')
}
