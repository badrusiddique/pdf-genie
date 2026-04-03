'use client'

import { useState, useCallback } from 'react'
import { Sparkles, Copy, Check } from 'lucide-react'
import { ToolLayout } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'

interface AiSummarizerToolProps { tool: Tool }

export function AiSummarizerTool({ tool: _tool }: AiSummarizerToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSummarise = useCallback(async () => {
    if (!file) return
    setStatus('processing')
    setError('')
    setSummary('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/v1/process/ai-summarizer', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? `Error ${res.status}`)
      setSummary(json.summary)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Summarization failed')
      setStatus('error')
    }
  }, [file])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [summary])

  const handleReset = useCallback(() => {
    setFile(null)
    setSummary('')
    setStatus('idle')
    setError('')
  }, [])

  const sidebar = (
    <div className="space-y-4">
      <div className="p-3 rounded-lg text-xs leading-relaxed"
        style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.15)', color: '#94A3B8' }}>
        Powered by <strong style={{ color: '#F1F5F9' }}>BART Large CNN</strong> via HuggingFace free API. First run may take 20–30 s while the model warms up.
      </div>
      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>{error}</p>
      )}
      {status === 'processing' && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
          <div className="w-4 h-4 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin shrink-0" />
          Summarising with AI… (may take up to 30 s)
        </div>
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
      {status === 'done' ? (
        <div className="h-full flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>Summary</p>
            <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
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
