'use client'

import { useState, useCallback } from 'react'
import { FileDown, Info } from 'lucide-react'
import { ToolLayout, ToolResult, PdfThumbnail } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'
import type { CompressionLevel } from '@/lib/pdf/compress'

// ── Level selector ────────────────────────────────────────────────
const LEVELS: { value: CompressionLevel; label: string; hint: string }[] = [
  { value: 'extreme', label: 'Extreme', hint: 'Smallest file, removes all metadata' },
  { value: 'recommended', label: 'Recommended', hint: 'Best balance of size and quality' },
  { value: 'less', label: 'Less compression', hint: 'Preserves all metadata' },
]

// ── Drop zone ─────────────────────────────────────────────────────
function DropZone({ tool, onFile }: { tool: Tool; onFile: (f: File) => void }) {
  const [over, setOver] = useState(false)
  const inputId = 'compress-file-input'

  const accept = (files: FileList | null) => {
    const pdf = Array.from(files ?? []).find(f => f.type === 'application/pdf')
    if (pdf) onFile(pdf)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload a PDF file to compress"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
      style={{
        minHeight: '360px',
        background: over ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.02)',
        border: `2px dashed ${over ? 'rgba(6,182,212,0.6)' : 'rgba(255,255,255,0.10)'}`,
      }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files) }}
      onClick={() => document.getElementById(inputId)?.click()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById(inputId)?.click() }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: over ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.04)' }}
      >
        <FileDown className="w-8 h-8" style={{ color: over ? '#22D3EE' : '#475569' }} />
      </div>
      <div className="text-center">
        <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>
          {over ? 'Drop PDF here' : 'Select a PDF to compress'}
        </p>
        <p className="text-sm" style={{ color: '#475569' }}>
          Drop here or click to browse · up to {tool.maxSizeMB} MB
        </p>
      </div>
      <input
        id={inputId}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={e => accept(e.target.files)}
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
interface CompressPdfToolProps { tool: Tool }

export function CompressPdfTool({ tool }: CompressPdfToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [level, setLevel] = useState<CompressionLevel>('recommended')
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [savings, setSavings] = useState<{ original: number; compressed: number } | null>(null)
  const [error, setError] = useState('')
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const handleCompress = useCallback(async () => {
    if (!file) return
    const ac = new AbortController()
    setAbortController(ac)
    setStatus('processing')
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('level', level)

      const res = await fetch('/api/v1/process/compress-pdf', {
        method: 'POST',
        body: formData,
        signal: ac.signal,
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error?.message ?? `Server error ${res.status}`)
      }

      const originalSize = Number(res.headers.get('X-Original-Size') ?? file.size)
      const compressedSize = Number(res.headers.get('X-Compressed-Size') ?? 0)

      const blob = await res.blob()
      setDownloadUrl(URL.createObjectURL(blob))
      setSavings({ original: originalSize, compressed: compressedSize })
      setStatus('done')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Compression failed')
        setStatus('error')
      }
    }
  }, [file, level])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFile(null)
    setDownloadUrl('')
    setSavings(null)
    setStatus('idle')
    setError('')
  }, [downloadUrl])

  // ── Done state ──
  if (status === 'done' && downloadUrl && savings) {
    const savedBytes = savings.original - savings.compressed
    const savedPct = Math.round((savedBytes / savings.original) * 100)
    const filename = file ? `${file.name.replace(/\.pdf$/i, '')}_compressed.pdf` : 'compressed.pdf'

    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        {/* Size savings banner */}
        <div
          className="mb-6 p-4 rounded-xl text-center"
          style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.20)' }}
        >
          <p className="text-sm mb-1" style={{ color: '#94A3B8' }}>
            {savedPct < 0 ? 'Result' : 'File size reduced by'}
          </p>
          <p className="font-display text-3xl font-bold" style={{ color: '#22D3EE' }}>
            {savedPct > 0 ? `${savedPct}%` : savedPct === 0 ? 'No change' : 'File grew (already optimised)'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#475569' }}>
            {formatFileSize(savings.original)} → {formatFileSize(savings.compressed)}
          </p>
        </div>
        <ToolResult downloadUrl={downloadUrl} fileName={filename} onReset={handleReset} />
      </div>
    )
  }

  // ── Sidebar ──
  const sidebar = (
    <div className="space-y-5">
      {/* Compression level */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>
          Compression level
        </p>
        <div className="space-y-2">
          {LEVELS.map(l => (
            <button
              key={l.value}
              onClick={() => setLevel(l.value)}
              className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150"
              style={{
                background: level === l.value ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${level === l.value ? 'rgba(6,182,212,0.40)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <div
                className="mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center"
                style={{ borderColor: level === l.value ? '#06B6D4' : '#334155' }}
              >
                {level === l.value && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#06B6D4' }} />
                )}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: level === l.value ? '#F1F5F9' : '#94A3B8' }}>
                  {l.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{l.hint}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div
        className="flex gap-2.5 p-3 rounded-lg text-xs leading-relaxed"
        style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)' }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#22D3EE' }} />
        <span style={{ color: '#94A3B8' }}>
          Compression works best on PDFs with many embedded images or redundant metadata.
        </span>
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </p>
      )}

      {/* Processing */}
      {status === 'processing' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
            <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin shrink-0" />
            Compressing PDF…
          </div>
          <button
            onClick={() => { abortController?.abort(); setStatus('idle') }}
            className="w-full py-2 text-xs rounded-lg transition-colors"
            style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )

  // ── Action button ──
  const action = (
    <button
      onClick={handleCompress}
      disabled={!file || status === 'processing'}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: file ? 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: file ? '0 4px 20px rgba(6,182,212,0.35)' : 'none',
      }}
    >
      <span>Compress PDF</span>
      <span className="text-lg">→</span>
    </button>
  )

  // ── Sidebar header ──
  const sidebarHeader = (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>
        Compress PDF
      </h2>
    </div>
  )

  return (
    <ToolLayout sidebar={sidebar} action={action} sidebarHeader={sidebarHeader}>
      {!file ? (
        <DropZone tool={tool} onFile={setFile} />
      ) : (
        <div className="flex flex-col items-center gap-5 pt-4">
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
            <PdfThumbnail file={file} width={220} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{file.name}</p>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>{formatFileSize(file.size)}</p>
          </div>
          <button
            onClick={() => setFile(null)}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Change file
          </button>
        </div>
      )}
    </ToolLayout>
  )
}
