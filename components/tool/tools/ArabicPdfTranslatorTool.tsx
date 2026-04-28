'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Languages, Download, Plus, X, ChevronRight, BookOpen, Sparkles } from 'lucide-react'
import { ToolLayout } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'

interface GlossaryEntry { ar: string; en: string; source: 'reference' | 'manual' }
interface EntityCandidate { ar: string; en_model: string; en_reference: string }

const STORAGE_KEY = 'arabic-translator-glossary'
const STEPS = [
  { label: 'Uploading PDF…', pct: 5 },
  { label: 'Extracting Arabic text blocks…', pct: 20 },
  { label: 'Translating with Helsinki-NLP…', pct: 90 },
  { label: 'Rebuilding PDF layout…', pct: 98 },
  { label: 'Done!', pct: 100 },
]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ArabicPdfTranslatorTool(_props: { tool: Tool }) {
  const [arabicFile, setArabicFile] = useState<File | null>(null)
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'extracting' | 'translating' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [stepLabel, setStepLabel] = useState('')
  const [error, setError] = useState('')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultName, setResultName] = useState('')
  const [glossary, setGlossary] = useState<GlossaryEntry[]>([])
  const [entityCandidates, setEntityCandidates] = useState<EntityCandidate[]>([])
  const [newAr, setNewAr] = useState('')
  const [newEn, setNewEn] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setGlossary(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(glossary)) } catch { /* ignore */ }
  }, [glossary])

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const animateProgress = useCallback((from: number, to: number, durationMs: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const steps = 40
    const stepPct = (to - from) / steps
    const stepMs = durationMs / steps
    let current = from
    intervalRef.current = setInterval(() => {
      current += stepPct
      if (current >= to) {
        current = to
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
      setProgress(Math.round(current))
    }, stepMs)
  }, [])

  const addGlossaryEntry = useCallback((ar: string, en: string, source: GlossaryEntry['source'] = 'manual') => {
    if (!ar.trim() || !en.trim()) return
    setGlossary(prev => {
      const idx = prev.findIndex(e => e.ar === ar.trim())
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = { ar: ar.trim(), en: en.trim(), source }
        return updated
      }
      return [...prev, { ar: ar.trim(), en: en.trim(), source }]
    })
  }, [])

  const removeGlossaryEntry = useCallback((ar: string) => {
    setGlossary(prev => prev.filter(e => e.ar !== ar))
  }, [])

  const handleTranslate = useCallback(async () => {
    if (!arabicFile) return
    setStatus('translating')
    setError('')

    setProgress(0)
    setStepLabel(STEPS[0].label)
    await new Promise(r => setTimeout(r, 200))
    setProgress(5)

    setStepLabel(STEPS[1].label)
    animateProgress(5, 20, 2000)
    await new Promise(r => setTimeout(r, 2100))

    setStepLabel(STEPS[2].label)
    animateProgress(20, 88, 50000)

    try {
      const formData = new FormData()
      formData.append('arabic_pdf', arabicFile)
      if (referenceFile) formData.append('reference_pdf', referenceFile)
      formData.append('glossary', JSON.stringify(glossary))

      const res = await fetch('/api/v1/process/arabic-pdf-translator', { method: 'POST', body: formData })

      if (intervalRef.current) clearInterval(intervalRef.current)

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(
          (json as { error?: { message?: string } })?.error?.message ?? `Error ${res.status}`
        )
      }

      setStepLabel(STEPS[3].label)
      setProgress(98)

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const cd = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      const rawName = match?.[1]?.replace(/['"]/g, '') ?? ''
      const name = rawName ? decodeURIComponent(rawName) : arabicFile.name.replace(/\.pdf$/i, '_EN.pdf')

      setProgress(100)
      setStepLabel(STEPS[4].label)
      await new Promise(r => setTimeout(r, 300))

      setResultUrl(url)
      setResultName(name)
      setStatus('done')
    } catch (err) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setError(err instanceof Error ? err.message : 'Translation failed')
      setStatus('error')
      setProgress(0)
    }
  }, [arabicFile, referenceFile, glossary, animateProgress])

  const handleExtractEntities = useCallback(async () => {
    if (!arabicFile || !referenceFile) return
    setStatus('extracting')
    setError('')
    try {
      const formData = new FormData()
      formData.append('arabic_pdf', arabicFile)
      formData.append('reference_pdf', referenceFile)
      formData.append('glossary', JSON.stringify(glossary))
      formData.append('extract_entities_only', 'true')

      const res = await fetch('/api/v1/process/arabic-pdf-translator', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? `Error ${res.status}`)
      setEntityCandidates((json as { entities?: EntityCandidate[] }).entities ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Entity extraction failed')
    } finally {
      setStatus('idle')
    }
  }, [arabicFile, referenceFile, glossary])

  const handleDownload = useCallback(() => {
    if (!resultUrl) return
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = resultName
    a.click()
  }, [resultUrl, resultName])

  const handleReset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setArabicFile(null)
    setReferenceFile(null)
    setStatus('idle')
    setError('')
    setResultUrl(null)
    setResultName('')
    setProgress(0)
    setStepLabel('')
    setEntityCandidates([])
  }, [resultUrl])

  const isProcessing = status === 'translating' || status === 'extracting'

  const sidebar = (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs leading-relaxed"
        style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', color: '#94A3B8' }}>
        Powered by <strong style={{ color: '#F1F5F9' }}>Helsinki-NLP opus-mt-tc-big-ar-en</strong> via HuggingFace. May take 30–60 s depending on PDF length.
      </div>

      {entityCandidates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A78BFA' }}>
            Entity Suggestions ({entityCandidates.length})
          </p>
          <p className="text-xs" style={{ color: '#475569' }}>Found in reference — click + to add to glossary</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {entityCandidates.map((c, i) => {
              const alreadyAdded = glossary.some(g => g.ar === c.ar)
              return (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-xs"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate text-right" style={{ color: '#E2E8F0', direction: 'rtl' }}>{c.ar}</span>
                    <span className="block truncate" style={{ color: '#64748B' }}>
                      {c.en_model} → <strong style={{ color: '#A78BFA' }}>{c.en_reference}</strong>
                    </span>
                  </div>
                  <button
                    disabled={alreadyAdded}
                    onClick={() => addGlossaryEntry(c.ar, c.en_reference, 'reference')}
                    className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-40"
                    style={{
                      background: alreadyAdded ? 'rgba(16,185,129,0.12)' : 'rgba(124,58,237,0.15)',
                      color: alreadyAdded ? '#10B981' : '#A78BFA',
                    }}
                    title={alreadyAdded ? 'Already in glossary' : 'Add to glossary'}
                  >
                    {alreadyAdded ? '✓' : <Plus className="w-3 h-3" />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#94A3B8' }}>
          <BookOpen className="w-3.5 h-3.5" /> Glossary ({glossary.length})
        </p>
        {glossary.length > 0 && (
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {glossary.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="flex-1 truncate text-right" style={{ color: '#CBD5E1', direction: 'rtl' }}>{entry.ar}</span>
                <ChevronRight className="w-3 h-3 shrink-0" style={{ color: '#334155' }} />
                <span className="flex-1 truncate" style={{ color: '#94A3B8' }}>{entry.en}</span>
                <button onClick={() => removeGlossaryEntry(entry.ar)}
                  className="shrink-0 w-4 h-4 rounded flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                  style={{ color: '#EF4444' }} title="Remove">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-1.5">
          <input
            value={newAr}
            onChange={e => setNewAr(e.target.value)}
            placeholder="Arabic"
            dir="rtl"
            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0' }}
          />
          <input
            value={newEn}
            onChange={e => setNewEn(e.target.value)}
            placeholder="English"
            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0' }}
          />
          <button
            onClick={() => { addGlossaryEntry(newAr, newEn); setNewAr(''); setNewEn('') }}
            disabled={!newAr.trim() || !newEn.trim()}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 transition-opacity"
            style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA' }}
            title="Add to glossary"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>{error}</p>
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
      onClick={status === 'done' ? handleDownload : handleTranslate}
      disabled={!arabicFile || isProcessing}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: arabicFile ? 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: arabicFile ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
      }}
    >
      <span>{status === 'done' ? 'Download English PDF' : 'Translate PDF'}</span>
      {status === 'done' ? <Download className="w-4 h-4" /> : <span className="text-lg">→</span>}
    </button>
  )

  return (
    <ToolLayout
      sidebar={sidebar}
      action={action}
      sidebarHeader={<h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>Arabic PDF Translator</h2>}
    >
      {isProcessing ? (
        <div className="flex flex-col items-center justify-center gap-8" style={{ minHeight: '360px' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <Languages className="w-8 h-8 animate-pulse" style={{ color: '#7C3AED' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium mb-1" style={{ color: '#E2E8F0' }}>{stepLabel}</p>
            <p className="text-xs" style={{ color: '#475569' }}>
              {status === 'extracting'
                ? 'Reading entity names from reference…'
                : progress < 20
                  ? 'Preparing…'
                  : progress < 88
                    ? 'AI is translating your document…'
                    : 'Rebuilding layout…'}
            </p>
          </div>
          {status === 'translating' && (
            <div className="w-full max-w-sm">
              <div className="flex justify-between text-xs mb-2" style={{ color: '#475569' }}>
                <span>Progress</span><span>{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #7C3AED, #6D28D9)',
                    boxShadow: '0 0 8px rgba(124,58,237,0.6)',
                  }} />
              </div>
            </div>
          )}
          <p className="text-xs" style={{ color: '#334155' }}>
            Please don&apos;t close this tab while translating
          </p>
        </div>

      ) : status === 'done' ? (
        <div className="flex flex-col items-center justify-center gap-6" style={{ minHeight: '360px' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <Sparkles className="w-8 h-8" style={{ color: '#10B981' }} />
          </div>
          <div className="text-center">
            <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>Translation complete!</p>
            <p className="text-sm" style={{ color: '#475569' }}>{resultName}</p>
          </div>
          <a href={resultUrl ?? '#'} download={resultName}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}>
            <Download className="w-4 h-4" /> Download PDF
          </a>
        </div>

      ) : (
        <div className="flex flex-col gap-4" style={{ minHeight: '360px' }}>
          <DropZone
            id="arabic-pdf-input"
            file={arabicFile}
            onFile={setArabicFile}
            required
            label="Arabic PDF"
            hint="Required · up to 15 MB"
            accept="application/pdf"
          />
          <DropZone
            id="reference-pdf-input"
            file={referenceFile}
            onFile={setReferenceFile}
            required={false}
            label="Reference English PDF"
            hint="Optional · helps improve name translation · up to 15 MB"
            accept="application/pdf"
          />
          {arabicFile && referenceFile && entityCandidates.length === 0 && (
            <button
              onClick={handleExtractEntities}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', color: '#A78BFA' }}>
              <Sparkles className="w-4 h-4" />
              Extract entity names from reference PDF
            </button>
          )}
        </div>
      )}
    </ToolLayout>
  )
}

interface DropZoneProps {
  id: string
  file: File | null
  onFile: (file: File | null) => void
  required: boolean
  label: string
  hint: string
  accept: string
}

function DropZone({ id, file, onFile, required, label, hint, accept }: DropZoneProps) {
  if (file) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(124,58,237,0.15)' }}>
          <Languages className="w-4 h-4" style={{ color: '#A78BFA' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: '#E2E8F0' }}>{file.name}</p>
          <p className="text-xs" style={{ color: '#475569' }}>{formatFileSize(file.size)}</p>
        </div>
        <button onClick={() => onFile(null)} className="shrink-0 text-xs px-2.5 py-1 rounded-lg"
          style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          Remove
        </button>
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Upload ${label}`}
      className="flex flex-col items-center justify-center gap-3 rounded-xl cursor-pointer transition-all flex-1"
      style={{
        minHeight: '140px',
        background: 'rgba(255,255,255,0.02)',
        border: `2px dashed ${required ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.08)'}`,
      }}
      onClick={() => document.getElementById(id)?.click()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById(id)?.click() }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: required ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${required ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.08)'}`,
        }}>
        <Languages className="w-5 h-5" style={{ color: required ? '#A78BFA' : '#475569' }} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: required ? '#E2E8F0' : '#64748B' }}>
          {label}{!required && <span className="text-xs ml-1.5" style={{ color: '#334155' }}>optional</span>}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#334155' }}>{hint}</p>
      </div>
      <input id={id} type="file" accept={accept} className="sr-only"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}
