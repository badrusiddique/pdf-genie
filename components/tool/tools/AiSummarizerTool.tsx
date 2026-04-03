'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Sparkles, Copy, Check } from 'lucide-react'
import { ToolLayout } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'

interface ProgressStep {
  label: string
  pct: number
}

const STEPS: ProgressStep[] = [
  { label: 'Uploading PDF…', pct: 5 },
  { label: 'Extracting text…', pct: 30 },
  { label: 'Summarising with BART…', pct: 95 },
  { label: 'Done!', pct: 100 },
]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AiSummarizerTool(_props: { tool: Tool }) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stepLabel, setStepLabel] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup interval on unmount
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

  const handleSummarise = useCallback(async () => {
    if (!file) return
    setStatus('processing')
    setError('')
    setSummary('')

    // Step 1: Uploading
    setProgress(0)
    setStepLabel(STEPS[0].label)
    await new Promise(r => setTimeout(r, 200))
    setProgress(5)

    // Step 2: Extracting (simulate — actual extraction is fast)
    setStepLabel(STEPS[1].label)
    animateProgress(5, 30, 1500)
    await new Promise(r => setTimeout(r, 1600))

    // Step 3: BART summarising (slow — animate 30→90 over ~45s)
    setStepLabel(STEPS[2].label)
    animateProgress(30, 90, 45000)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/v1/process/ai-summarizer', { method: 'POST', body: formData })
      const json = await res.json()

      if (intervalRef.current) clearInterval(intervalRef.current)

      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? `Error ${res.status}`)

      // Step 4: Done
      setProgress(100)
      setStepLabel(STEPS[3].label)
      await new Promise(r => setTimeout(r, 300))
      setSummary(json.summary)
      setStatus('done')
    } catch (err) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setError(err instanceof Error ? err.message : 'Summarization failed')
      setStatus('error')
      setProgress(0)
    }
  }, [file, animateProgress])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [summary])

  const handleReset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setFile(null)
    setSummary('')
    setStatus('idle')
    setError('')
    setProgress(0)
    setStepLabel('')
  }, [])

  const sidebar = (
    <div className="space-y-4">
      <div className="p-3 rounded-lg text-xs leading-relaxed"
        style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.15)', color: '#94A3B8' }}>
        Powered by <strong style={{ color: '#F1F5F9' }}>BART Large CNN</strong> via HuggingFace free API. May take 20–30 s on first run while the model warms up.
      </div>
      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>{error}</p>
      )}
      {status === 'done' && (
        <button onClick={handleReset} className="w-full py-2 text-xs rounded-lg transition-colors"
          style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          Summarise another PDF
        </button>
      )}
    </div>
  )

  const action = (
    <button
      onClick={status === 'done' ? handleCopy : handleSummarise}
      disabled={(!file && status !== 'done') || status === 'processing'}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: (file || status === 'done') ? 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)' : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: (file || status === 'done') ? '0 4px 20px rgba(236,72,153,0.35)' : 'none',
      }}
    >
      <span>{status === 'done' ? (copied ? 'Copied!' : 'Copy Summary') : 'Summarise PDF'}</span>
      {status === 'done'
        ? (copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />)
        : <span className="text-lg">→</span>}
    </button>
  )

  return (
    <ToolLayout
      sidebar={sidebar}
      action={action}
      sidebarHeader={<h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>AI Summarizer</h2>}
    >
      {status === 'processing' ? (
        /* Progress bar UI */
        <div className="flex flex-col items-center justify-center gap-8" style={{ minHeight: '360px' }}>
          {/* Animated icon */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)' }}>
            <Sparkles className="w-8 h-8 animate-pulse" style={{ color: '#EC4899' }} />
          </div>

          {/* Step label */}
          <div className="text-center">
            <p className="text-sm font-medium mb-1" style={{ color: '#E2E8F0' }}>{stepLabel}</p>
            <p className="text-xs" style={{ color: '#475569' }}>
              {progress < 30 ? 'Preparing…' : progress < 90 ? 'AI is reading your document…' : 'Almost done…'}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-sm">
            <div className="flex justify-between text-xs mb-2" style={{ color: '#475569' }}>
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #EC4899, #DB2777)',
                  boxShadow: '0 0 8px rgba(236,72,153,0.6)',
                }}
              />
            </div>

            {/* Step dots */}
            <div className="flex justify-between mt-3">
              {STEPS.slice(0, 3).map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full transition-all duration-300"
                    style={{
                      background: progress >= step.pct ? '#EC4899' : 'rgba(255,255,255,0.15)',
                      boxShadow: progress >= step.pct ? '0 0 6px rgba(236,72,153,0.6)' : 'none',
                    }} />
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs" style={{ color: '#334155' }}>
            BART may take 20–30 s on first run — please don&apos;t close this tab
          </p>
        </div>

      ) : status === 'done' ? (
        /* Summary result */
        <div className="h-full flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>Summary</p>
            <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ color: copied ? '#10B981' : '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 rounded-xl text-sm leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0', whiteSpace: 'pre-wrap' }}>
            {summary}
          </div>
        </div>

      ) : !file ? (
        /* Drop zone */
        <div
          role="button" tabIndex={0} aria-label="Upload PDF to summarise"
          className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all"
          style={{ minHeight: '360px', background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.10)' }}
          onClick={() => document.getElementById('ai-sum-input')?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('ai-sum-input')?.click() }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)' }}>
            <Sparkles className="w-8 h-8" style={{ color: '#EC4899' }} />
          </div>
          <div className="text-center">
            <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>Select a PDF to summarise</p>
            <p className="text-sm" style={{ color: '#475569' }}>Drop here or click · up to 50 MB</p>
          </div>
          <input id="ai-sum-input" type="file" accept="application/pdf" className="sr-only"
            onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
        </div>

      ) : (
        /* File selected, ready to go */
        <div className="flex flex-col items-center gap-4 pt-8">
          <Sparkles className="w-16 h-16" style={{ color: '#EC4899' }} />
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{file.name}</p>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>{formatFileSize(file.size)}</p>
          </div>
          <button onClick={() => setFile(null)} className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Change file
          </button>
        </div>
      )}
    </ToolLayout>
  )
}
