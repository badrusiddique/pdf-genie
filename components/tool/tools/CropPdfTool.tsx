'use client'

import { useState, useCallback, useRef } from 'react'
import { Crop, Info } from 'lucide-react'
import { ToolLayout, ToolResult, PdfThumbnail } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'

// ── Margin state ──────────────────────────────────────────────────
interface Margins {
  top: number
  right: number
  bottom: number
  left: number
}

// ── Drop zone ─────────────────────────────────────────────────────
function DropZone({ tool, onFile }: { tool: Tool; onFile: (f: File) => void }) {
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const accept = (files: FileList | null) => {
    const pdf = Array.from(files ?? []).find(f => f.type === 'application/pdf')
    if (pdf) onFile(pdf)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload a PDF file to crop"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
      style={{
        minHeight: '360px',
        background: over ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)',
        border: `2px dashed ${over ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.10)'}`,
      }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files) }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: over ? 'rgba(245,158,11,0.20)' : 'rgba(255,255,255,0.04)' }}
      >
        <Crop className="w-8 h-8" style={{ color: over ? '#F59E0B' : '#475569' }} />
      </div>
      <div className="text-center">
        <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>
          {over ? 'Drop PDF here' : 'Select a PDF to crop'}
        </p>
        <p className="text-sm" style={{ color: '#475569' }}>
          Drop here or click to browse · up to {tool.maxSizeMB} MB
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={e => accept(e.target.files)}
      />
    </div>
  )
}

// ── Margin input row ──────────────────────────────────────────────
function MarginInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 text-xs font-medium shrink-0" style={{ color: '#94A3B8' }}>
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={49}
        step={1}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 accent-amber-400 disabled:opacity-50"
        aria-label={`${label} margin`}
      />
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number"
          min={0}
          max={49}
          step={1}
          value={value}
          disabled={disabled}
          onChange={e => {
            const v = Math.max(0, Math.min(49, Number(e.target.value)))
            onChange(isNaN(v) ? 0 : v)
          }}
          className="w-10 text-center text-sm rounded-md disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: '#F1F5F9',
            padding: '2px 4px',
          }}
          aria-label={`${label} margin value`}
        />
        <span className="text-xs" style={{ color: '#475569' }}>%</span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
interface CropPdfToolProps { tool: Tool }

export function CropPdfTool({ tool }: CropPdfToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [margins, setMargins] = useState<Margins>({ top: 0, right: 0, bottom: 0, left: 0 })
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [outputFileName, setOutputFileName] = useState('cropped.pdf')
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const setMargin = useCallback((side: keyof Margins) => (value: number) => {
    setMargins(prev => ({ ...prev, [side]: value }))
  }, [])

  const handleCrop = useCallback(async () => {
    if (!file) return
    const ac = new AbortController()
    abortRef.current = ac
    setStatus('processing')
    setError('')

    try {
      // Read file bytes
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      if (ac.signal.aborted) return

      // Get page dimensions using pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = ''
      const pdfDoc = await pdfjsLib.getDocument({
        data: bytes,
        useWorkerFetch: false,
        isEvalSupported: false,
      }).promise
      if (ac.signal.aborted) return

      const page = await pdfDoc.getPage(1)
      const viewport = page.getViewport({ scale: 1 })
      const { width: w, height: h } = viewport

      // Calculate crop box (PDF coords: bottom-left origin)
      const topPct    = margins.top    / 100
      const rightPct  = margins.right  / 100
      const bottomPct = margins.bottom / 100
      const leftPct   = margins.left   / 100

      const cropBox = {
        x:      leftPct   * w,
        y:      bottomPct * h,
        width:  (1 - leftPct - rightPct)  * w,
        height: (1 - topPct - bottomPct) * h,
      }

      if (cropBox.width <= 0 || cropBox.height <= 0) {
        throw new Error('Margins are too large — no visible area remains after cropping.')
      }

      if (ac.signal.aborted) return

      // Apply crop
      const { cropPdf } = await import('@/lib/pdf/cropPdf')
      const result = await cropPdf(bytes, cropBox)
      if (ac.signal.aborted) return

      const baseName = file.name.replace(/\.pdf$/i, '')
      const fileName = `${baseName}_cropped.pdf`
      const blob = new Blob([result.buffer as ArrayBuffer], { type: 'application/pdf' })

      setOutputFileName(fileName)
      setDownloadUrl(URL.createObjectURL(blob))
      setStatus('done')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Crop failed')
        setStatus('error')
      } else {
        setStatus('idle')
      }
    }
  }, [file, margins])

  const handleReset = useCallback(() => {
    abortRef.current?.abort()
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFile(null)
    setMargins({ top: 0, right: 0, bottom: 0, left: 0 })
    setDownloadUrl('')
    setOutputFileName('cropped.pdf')
    setStatus('idle')
    setError('')
  }, [downloadUrl])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    setStatus('idle')
  }, [])

  // ── Done state ──
  if (status === 'done' && downloadUrl) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ToolResult downloadUrl={downloadUrl} fileName={outputFileName} onReset={handleReset} />
      </div>
    )
  }

  const isProcessing = status === 'processing'
  const hasNoMargins = margins.top === 0 && margins.right === 0 && margins.bottom === 0 && margins.left === 0

  // ── Sidebar ──
  const sidebar = (
    <div className="space-y-5">
      {/* Margin controls */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>
          Margins to remove
        </p>
        <div className="space-y-3">
          <MarginInput label="Top"    value={margins.top}    onChange={setMargin('top')}    disabled={isProcessing} />
          <MarginInput label="Right"  value={margins.right}  onChange={setMargin('right')}  disabled={isProcessing} />
          <MarginInput label="Bottom" value={margins.bottom} onChange={setMargin('bottom')} disabled={isProcessing} />
          <MarginInput label="Left"   value={margins.left}   onChange={setMargin('left')}   disabled={isProcessing} />
        </div>
      </div>

      {/* Apply to all pages badge */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}
      >
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: '#F59E0B' }} />
        <span style={{ color: '#FCD34D' }}>Applied to all pages</span>
      </div>

      {/* Info tip */}
      <div
        className="flex gap-2.5 p-3 rounded-lg text-xs leading-relaxed"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
        <span style={{ color: '#94A3B8' }}>
          Each margin trims that percentage from the corresponding edge. Set all to 0 to keep the original page area.
        </span>
      </div>

      {/* Warning: no margins set */}
      {file && hasNoMargins && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.06)' }}>
          All margins are 0% — crop will produce an identical PDF.
        </p>
      )}

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </p>
      )}

      {/* Processing indicator + cancel */}
      {isProcessing && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
            <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin shrink-0" />
            Cropping PDF…
          </div>
          <button
            onClick={handleCancel}
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
      onClick={handleCrop}
      disabled={!file || isProcessing}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: file ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'rgba(255,255,255,0.05)',
        color: '#060B18',
        boxShadow: file ? '0 4px 20px rgba(245,158,11,0.35)' : 'none',
      }}
    >
      <span>Crop PDF</span>
      <span className="text-lg">→</span>
    </button>
  )

  // ── Sidebar header ──
  const sidebarHeader = (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>
        Crop PDF
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
            disabled={isProcessing}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Change file
          </button>
        </div>
      )}
    </ToolLayout>
  )
}
