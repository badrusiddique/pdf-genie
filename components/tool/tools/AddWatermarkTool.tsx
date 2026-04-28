'use client'

import { useState, useCallback } from 'react'
import { Stamp } from 'lucide-react'
import { ToolLayout, ToolResult, PdfThumbnail } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'
import { addWatermark } from '@/lib/pdf/addWatermark'

// ── Constants ─────────────────────────────────────────────────────
const OPACITY_OPTIONS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
]

const ROTATION_OPTIONS = [
  { label: 'None', value: 0 },
  { label: '45°', value: 45 },
  { label: 'Diagonal', value: -45 },
]

const FONT_SIZE_OPTIONS = [
  { label: 'Small', value: 24 },
  { label: 'Medium', value: 48 },
  { label: 'Large', value: 72 },
]

const WATERMARK_COLOR: [number, number, number] = [0.5, 0.5, 0.5]

// ── Drop zone ─────────────────────────────────────────────────────
function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const [over, setOver] = useState(false)
  const inputId = 'watermark-file-input'

  const accept = (files: FileList | null) => {
    const pdf = Array.from(files ?? []).find(f => f.type === 'application/pdf')
    if (pdf) onFile(pdf)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload a PDF file to add a watermark"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
      style={{
        minHeight: '360px',
        background: over ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)',
        border: `2px dashed ${over ? 'rgba(245,158,11,0.55)' : 'rgba(255,255,255,0.10)'}`,
      }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files) }}
      onClick={() => document.getElementById(inputId)?.click()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById(inputId)?.click() }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: over ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)' }}
      >
        <Stamp className="w-8 h-8" style={{ color: over ? '#F59E0B' : '#475569' }} />
      </div>
      <div className="text-center">
        <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>
          {over ? 'Drop PDF here' : 'Select a PDF to watermark'}
        </p>
        <p className="text-sm" style={{ color: '#475569' }}>
          Drop here or click to browse · up to 100 MB
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

// ── Option button ──────────────────────────────────────────────────
function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
      style={{
        background: selected ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.08)'}`,
        color: selected ? '#F59E0B' : '#94A3B8',
      }}
    >
      {label}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────
interface AddWatermarkToolProps { tool: Tool }

export function AddWatermarkTool({ tool: _tool }: AddWatermarkToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [watermarkText, setWatermarkText] = useState('')
  const [opacity, setOpacity] = useState(0.5)
  const [rotation, setRotation] = useState(45)
  const [fontSize, setFontSize] = useState(48)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState('')

  const handleProcess = useCallback(async () => {
    if (!file) return

    setStatus('processing')
    setError('')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const inputBytes = new Uint8Array(arrayBuffer)

      const resultBytes = await addWatermark(inputBytes, {
        text: watermarkText.trim() || 'CONFIDENTIAL',
        opacity,
        rotation,
        fontSize,
        color: WATERMARK_COLOR,
      })

      const blob = new Blob([resultBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      setDownloadUrl(URL.createObjectURL(blob))
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add watermark')
      setStatus('error')
    }
  }, [file, watermarkText, opacity, rotation, fontSize])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFile(null)
    setDownloadUrl('')
    setStatus('idle')
    setError('')
  }, [downloadUrl])

  // ── Done state ──
  if (status === 'done' && downloadUrl) {
    const stem = file ? file.name.replace(/\.pdf$/i, '') : 'document'
    const filename = `${stem}_watermarked.pdf`

    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ToolResult downloadUrl={downloadUrl} fileName={filename} onReset={handleReset} />
      </div>
    )
  }

  // ── Sidebar label helper ──
  const labelClass = 'text-xs font-semibold uppercase tracking-wider mb-2'

  // ── Sidebar ──
  const sidebar = (
    <div className="space-y-5">
      {/* Watermark text */}
      <div>
        <p className={labelClass} style={{ color: '#475569' }}>
          Watermark text
        </p>
        <input
          type="text"
          value={watermarkText}
          onChange={e => setWatermarkText(e.target.value)}
          placeholder="CONFIDENTIAL"
          maxLength={80}
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all duration-150"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: '#E2E8F0',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.50)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
        />
      </div>

      {/* Opacity */}
      <div>
        <p className={labelClass} style={{ color: '#475569' }}>
          Opacity
        </p>
        <div className="flex gap-2">
          {OPACITY_OPTIONS.map(opt => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={opacity === opt.value}
              onClick={() => setOpacity(opt.value)}
            />
          ))}
        </div>
      </div>

      {/* Rotation */}
      <div>
        <p className={labelClass} style={{ color: '#475569' }}>
          Rotation
        </p>
        <div className="flex gap-2">
          {ROTATION_OPTIONS.map(opt => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={rotation === opt.value}
              onClick={() => setRotation(opt.value)}
            />
          ))}
        </div>
      </div>

      {/* Font size */}
      <div>
        <p className={labelClass} style={{ color: '#475569' }}>
          Font size
        </p>
        <div className="flex gap-2">
          {FONT_SIZE_OPTIONS.map(opt => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={fontSize === opt.value}
              onClick={() => setFontSize(opt.value)}
            />
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          {error}
        </p>
      )}

      {/* Processing indicator */}
      {status === 'processing' && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
          <div className="w-4 h-4 border-2 rounded-full animate-spin shrink-0"
            style={{ borderColor: 'rgba(245,158,11,0.30)', borderTopColor: '#F59E0B' }}
          />
          Adding watermark…
        </div>
      )}
    </div>
  )

  // ── Action button ──
  const canProcess = !!file && status !== 'processing'

  const action = (
    <button
      onClick={handleProcess}
      disabled={!canProcess}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: canProcess
          ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
          : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: canProcess ? '0 4px 20px rgba(245,158,11,0.35)' : 'none',
      }}
    >
      <span>Add Watermark</span>
      <span className="text-lg">→</span>
    </button>
  )

  // ── Sidebar header ──
  const sidebarHeader = (
    <div className="flex items-center gap-2.5">
      <Stamp className="w-4 h-4 shrink-0" style={{ color: '#F59E0B' }} />
      <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>
        Add Watermark
      </h2>
    </div>
  )

  return (
    <ToolLayout sidebar={sidebar} action={action} sidebarHeader={sidebarHeader}>
      {!file ? (
        <DropZone onFile={setFile} />
      ) : (
        <div className="flex flex-col items-center gap-5 pt-4">
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <PdfThumbnail file={file} width={220} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{file.name}</p>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>{formatFileSize(file.size)}</p>
          </div>
          {/* Watermark preview badge */}
          <div
            className="px-3 py-1.5 rounded-lg text-xs font-mono"
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.20)',
              color: '#F59E0B',
            }}
          >
            &quot;{watermarkText.trim() || 'CONFIDENTIAL'}&quot; · {ROTATION_OPTIONS.find(r => r.value === rotation)?.label} · {OPACITY_OPTIONS.find(o => o.value === opacity)?.label}
          </div>
          <button
            onClick={() => setFile(null)}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: '#94A3B8',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Change file
          </button>
        </div>
      )}
    </ToolLayout>
  )
}
