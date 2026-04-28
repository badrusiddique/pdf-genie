'use client'

import { useState, useCallback, useEffect } from 'react'
import { FileDown } from 'lucide-react'
import { ToolLayout, ToolResult, PdfThumbnail } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'
import type { NumberPosition, PageNumberOptions } from '@/lib/pdf/addPageNumbers'

// ── Position grid cells ──────────────────────────────────────────────────────

const POSITIONS: { value: NumberPosition; label: string; row: number; col: number }[] = [
  { value: 'top-left',      label: 'Top left',      row: 0, col: 0 },
  { value: 'top-center',    label: 'Top center',    row: 0, col: 1 },
  { value: 'top-right',     label: 'Top right',     row: 0, col: 2 },
  { value: 'bottom-left',   label: 'Bottom left',   row: 1, col: 0 },
  { value: 'bottom-center', label: 'Bottom center', row: 1, col: 1 },
  { value: 'bottom-right',  label: 'Bottom right',  row: 1, col: 2 },
]

// Compact page-corner SVG icon to show active/inactive state inside each cell
const ROW_LABEL = ['Top', 'Bottom']
const COL_LABEL = ['Left', 'Center', 'Right']

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_OPTS: PageNumberOptions = {
  position: 'bottom-center',
  fontSize: 10,
  startFrom: 1,
  margin: 20,
  format: 'Page n of p',
}

// ── Drop zone ─────────────────────────────────────────────────────────────────

function DropZone({ tool, onFile }: { tool: Tool; onFile: (f: File) => void }) {
  const [over, setOver] = useState(false)
  const inputId = 'add-page-numbers-file-input'

  const accept = (files: FileList | null) => {
    const pdf = Array.from(files ?? []).find(f => f.type === 'application/pdf')
    if (pdf) onFile(pdf)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload a PDF file to add page numbers"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
      style={{
        minHeight: '360px',
        background: over ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
        border: `2px dashed ${over ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.10)'}`,
      }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files) }}
      onClick={() => document.getElementById(inputId)?.click()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById(inputId)?.click() }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: over ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.04)' }}
      >
        <FileDown className="w-8 h-8" style={{ color: over ? '#7C3AED' : '#475569' }} />
      </div>
      <div className="text-center">
        <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>
          {over ? 'Drop PDF here' : 'Select a PDF to number'}
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

// ── Segmented button group helper ────────────────────────────────────────────

function SegmentGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
        {label}
      </p>
      <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        {options.map((opt, i) => {
          const active = opt.value === value
          return (
            <button
              key={String(opt.value)}
              onClick={() => onChange(opt.value)}
              className="flex-1 py-2 text-xs font-medium transition-all duration-150"
              style={{
                background: active ? 'rgba(124,58,237,0.22)' : 'rgba(255,255,255,0.03)',
                color: active ? '#A78BFA' : '#94A3B8',
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                outline: active ? '1px solid rgba(124,58,237,0.45)' : 'none',
                outlineOffset: '-1px',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface AddPageNumbersToolProps { tool: Tool }

export function AddPageNumbersTool({ tool }: AddPageNumbersToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [opts, setOpts] = useState<PageNumberOptions>(DEFAULT_OPTS)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState('')

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  const setOpt = useCallback(<K extends keyof PageNumberOptions>(key: K, val: PageNumberOptions[K]) => {
    setOpts(prev => ({ ...prev, [key]: val }))
  }, [])

  const handleProcess = useCallback(async () => {
    if (!file) return
    setStatus('processing')
    setError('')

    try {
      const { addPageNumbers } = await import('@/lib/pdf/addPageNumbers')
      const bytes = new Uint8Array(await file.arrayBuffer())
      const result = await addPageNumbers(bytes, opts)
      const blob = new Blob([result.buffer as ArrayBuffer], { type: 'application/pdf' })
      setDownloadUrl(URL.createObjectURL(blob))
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add page numbers')
      setStatus('error')
    }
  }, [file, opts])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFile(null)
    setDownloadUrl('')
    setStatus('idle')
    setError('')
    setOpts(DEFAULT_OPTS)
  }, [downloadUrl])

  // ── Done state ──────────────────────────────────────────────────────────────
  if (status === 'done' && downloadUrl) {
    const baseName = file?.name.replace(/\.pdf$/i, '') ?? 'document'
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ToolResult
          downloadUrl={downloadUrl}
          fileName={`${baseName}_numbered.pdf`}
          onReset={handleReset}
        />
      </div>
    )
  }

  // ── Position grid ───────────────────────────────────────────────────────────
  const positionGrid = (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
        Position
      </p>
      <div
        className="grid grid-cols-3 gap-1.5 p-2 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        role="radiogroup"
        aria-label="Page number position"
      >
        {POSITIONS.map(pos => {
          const active = opts.position === pos.value
          return (
            <button
              key={pos.value}
              role="radio"
              aria-checked={active}
              aria-label={pos.label}
              onClick={() => setOpt('position', pos.value)}
              className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{
                background: active ? 'rgba(124,58,237,0.22)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.07)'}`,
                color: active ? '#A78BFA' : '#64748B',
              }}
            >
              {/* Mini page diagram with dot */}
              <svg
                width="28"
                height="20"
                viewBox="0 0 28 20"
                fill="none"
                aria-hidden="true"
              >
                <rect x="1" y="1" width="26" height="18" rx="2"
                  stroke={active ? '#7C3AED' : '#334155'}
                  strokeWidth="1.2"
                  fill={active ? 'rgba(124,58,237,0.10)' : 'rgba(255,255,255,0.03)'}
                />
                {/* Number dot placed at position */}
                <circle
                  cx={pos.col === 0 ? 6 : pos.col === 1 ? 14 : 22}
                  cy={pos.row === 0 ? 5 : 15}
                  r="2.2"
                  fill={active ? '#7C3AED' : '#334155'}
                />
              </svg>
              <span>
                {ROW_LABEL[pos.row]}<br />{COL_LABEL[pos.col]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  const sidebar = (
    <div className="space-y-5">
      {positionGrid}

      <SegmentGroup
        label="Format"
        options={[
          { value: 'n' as const, label: '1' },
          { value: 'Page n' as const, label: 'Page 1' },
          { value: 'Page n of p' as const, label: 'Page 1 of N' },
        ]}
        value={opts.format}
        onChange={v => setOpt('format', v)}
      />

      <SegmentGroup
        label="Font size"
        options={[
          { value: 8, label: '8' },
          { value: 10, label: '10' },
          { value: 12, label: '12' },
        ]}
        value={opts.fontSize}
        onChange={v => setOpt('fontSize', v)}
      />

      {/* Start from */}
      <div>
        <label
          htmlFor="apn-start-from"
          className="text-xs font-semibold uppercase tracking-wider block mb-2"
          style={{ color: '#475569' }}
        >
          Start from
        </label>
        <input
          id="apn-start-from"
          type="number"
          min={1}
          max={9999}
          value={opts.startFrom}
          onChange={e => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v) && v >= 1) setOpt('startFrom', v)
          }}
          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: '#E2E8F0',
          }}
        />
        <p className="text-xs mt-1.5" style={{ color: '#475569' }}>
          First page will show this number
        </p>
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

      {/* Processing spinner */}
      {status === 'processing' && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
          <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin shrink-0" />
          Adding page numbers…
        </div>
      )}
    </div>
  )

  // ── Action button ───────────────────────────────────────────────────────────
  const action = (
    <button
      onClick={handleProcess}
      disabled={!file || status === 'processing'}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: file ? 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: file ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
      }}
    >
      <span>Add Page Numbers</span>
      <span className="text-lg">→</span>
    </button>
  )

  // ── Sidebar header ──────────────────────────────────────────────────────────
  const sidebarHeader = (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>
        Options
      </h2>
      {file && (
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>
          1 file
        </span>
      )}
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
            onClick={() => { setFile(null); setStatus('idle'); setError('') }}
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
