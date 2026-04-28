'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type SignaturePadType from 'signature_pad'
import { PenLine, Keyboard } from 'lucide-react'
import { ToolLayout, ToolResult, PdfThumbnail } from '@/components/tool'
import { formatFileSize } from '@/lib/file-utils'
import type { Tool } from '@/config/tools'

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = 'upload' | 'sign' | 'processing' | 'done'
type SignMode = 'draw' | 'type'
type PageTarget = 'first' | 'last' | 'all'
type Position = 'bottom-right' | 'bottom-center' | 'bottom-left'
type SigSize = 'small' | 'medium' | 'large'

const SIG_WIDTHS: Record<SigSize, number> = {
  small: 80,
  medium: 120,
  large: 160,
}

// ── OptionButton ──────────────────────────────────────────────────────────────

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
      type="button"
      onClick={onClick}
      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
      style={{
        background: selected ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? 'rgba(124,58,237,0.50)' : 'rgba(255,255,255,0.08)'}`,
        color: selected ? '#A78BFA' : '#94A3B8',
      }}
    >
      {label}
    </button>
  )
}

// ── DropZone ──────────────────────────────────────────────────────────────────

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
      aria-label="Upload a PDF to sign"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
      style={{
        minHeight: '360px',
        background: over ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)',
        border: `2px dashed ${over ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.10)'}`,
      }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files) }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: over ? 'rgba(124,58,237,0.20)' : 'rgba(255,255,255,0.04)' }}
      >
        <PenLine className="w-8 h-8" style={{ color: over ? '#7C3AED' : '#475569' }} />
      </div>
      <div className="text-center">
        <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>
          {over ? 'Drop PDF here' : 'Select a PDF to sign'}
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

// ── SignaturePad canvas wrapper ────────────────────────────────────────────────

function DrawPad({
  canvasRef,
  onClear,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onClear: () => void
}) {
  return (
    <div className="space-y-2">
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.12)', display: 'inline-block' }}
      >
        <canvas
          ref={canvasRef}
          width={320}
          height={120}
          style={{ display: 'block', background: '#ffffff', cursor: 'crosshair' }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: '#475569' }}>
          Draw your signature above
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-xs px-3 py-1 rounded-lg transition-colors"
          style={{
            color: '#94A3B8',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          Clear
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SignPdfTool({ tool }: { tool: Tool }) {
  const [stage, setStage]             = useState<Stage>('upload')
  const [file, setFile]               = useState<File | null>(null)
  const [signMode, setSignMode]       = useState<SignMode>('draw')
  const [typedName, setTypedName]     = useState('')
  const [pageTarget, setPageTarget]   = useState<PageTarget>('last')
  const [position, setPosition]       = useState<Position>('bottom-right')
  const [sigSize, setSigSize]         = useState<SigSize>('medium')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError]             = useState('')

  // Signature pad refs
  const canvasRef      = useRef<HTMLCanvasElement | null>(null)
  const padRef         = useRef<SignaturePadType | null>(null)

  // Initialize SignaturePad when entering the sign stage
  useEffect(() => {
    if (stage !== 'sign' || signMode !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return

    let pad: SignaturePadType | null = null

    import('signature_pad').then(mod => {
      const SignaturePadClass = mod.default
      pad = new SignaturePadClass(canvas, {
        minWidth: 1,
        maxWidth: 3,
        penColor: '#1B3A6B',
      })
      padRef.current = pad
    })

    return () => {
      pad?.off()
      padRef.current = null
    }
  }, [stage, signMode])

  const handleFileSelected = useCallback((f: File) => {
    setFile(f)
    setStage('sign')
    setError('')
  }, [])

  const handleClearPad = useCallback(() => {
    padRef.current?.clear()
  }, [])

  const canApply =
    !!file &&
    stage === 'sign' &&
    (signMode === 'type' ? typedName.trim().length > 0 : true)

  const handleApply = useCallback(async () => {
    if (!file) return

    // Validate draw mode eagerly
    if (signMode === 'draw' && (!padRef.current || padRef.current.isEmpty())) {
      setError('Please draw your signature before applying.')
      return
    }
    if (signMode === 'type' && !typedName.trim()) {
      setError('Please type your name before applying.')
      return
    }

    setError('')
    setStage('processing')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      const { PDFDocument } = await import('pdf-lib')

      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
      const pages = doc.getPages()
      const totalPages = pages.length

      // ── Build signature PNG bytes ────────────────────────────────────────────
      let sigPngBytes: Uint8Array

      if (signMode === 'draw') {
        // Get data URL from the pad
        const dataUrl = padRef.current!.toDataURL('image/png')
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
        const binaryStr = atob(base64)
        const binBytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
          binBytes[i] = binaryStr.charCodeAt(i)
        }
        sigPngBytes = binBytes
      } else {
        // Render typed name onto an off-screen canvas
        const offCanvas = document.createElement('canvas')
        offCanvas.width  = 300
        offCanvas.height = 80
        const ctx = offCanvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, 300, 80)
        ctx.fillStyle = '#1B3A6B'
        ctx.font = 'italic 36px Georgia,serif'
        ctx.fillText(typedName.trim(), 10, 55)

        // Convert to PNG bytes via Blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          offCanvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png')
        })
        const buf = await blob.arrayBuffer()
        sigPngBytes = new Uint8Array(buf)
      }

      // ── Embed image ──────────────────────────────────────────────────────────
      const sigImage = await doc.embedPng(sigPngBytes)

      // ── Determine target page indices ────────────────────────────────────────
      let targetIndices: number[]
      if (pageTarget === 'first')      targetIndices = [0]
      else if (pageTarget === 'last')  targetIndices = [totalPages - 1]
      else                             targetIndices = Array.from({ length: totalPages }, (_, i) => i)

      // ── Stamp each target page ───────────────────────────────────────────────
      const sigWidthPt = SIG_WIDTHS[sigSize]
      const aspectRatio = sigImage.height / sigImage.width
      const sigHeightPt = sigWidthPt * aspectRatio
      const MARGIN = 20

      for (const idx of targetIndices) {
        const page = pages[idx]
        const { width: pw } = page.getSize()

        let x: number
        if (position === 'bottom-left')        x = MARGIN
        else if (position === 'bottom-center') x = (pw - sigWidthPt) / 2
        else                                   x = pw - sigWidthPt - MARGIN  // bottom-right

        const y = MARGIN  // bottom edge + margin

        page.drawImage(sigImage, {
          x,
          y,
          width:  sigWidthPt,
          height: sigHeightPt,
        })
      }

      const signed = await doc.save()
      const blob   = new Blob([signed.buffer as ArrayBuffer], { type: 'application/pdf' })
      setDownloadUrl(URL.createObjectURL(blob))
      setStage('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to embed signature')
      setStage('sign')
    }
  }, [file, signMode, typedName, pageTarget, position, sigSize])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFile(null)
    setDownloadUrl('')
    setStage('upload')
    setError('')
    setTypedName('')
    setSignMode('draw')
    padRef.current?.clear()
  }, [downloadUrl])

  const outputFileName = file
    ? `${file.name.replace(/\.pdf$/i, '')}_signed.pdf`
    : 'signed.pdf'

  // ── Done screen ───────────────────────────────────────────────────────────
  if (stage === 'done' && downloadUrl) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ToolResult
          downloadUrl={downloadUrl}
          fileName={outputFileName}
          onReset={handleReset}
        />
      </div>
    )
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const labelClass = 'text-xs font-semibold uppercase tracking-wider mb-2'

  const sidebar = (
    <div className="space-y-5">

      {/* Page target */}
      <div>
        <p className={labelClass} style={{ color: '#475569' }}>Page</p>
        <div className="flex gap-2">
          {(['first', 'last', 'all'] as PageTarget[]).map(t => (
            <OptionButton
              key={t}
              label={t === 'first' ? 'First' : t === 'last' ? 'Last' : 'All'}
              selected={pageTarget === t}
              onClick={() => setPageTarget(t)}
            />
          ))}
        </div>
      </div>

      {/* Position */}
      <div>
        <p className={labelClass} style={{ color: '#475569' }}>Position</p>
        <div className="flex gap-2">
          <OptionButton
            label="Bottom left"
            selected={position === 'bottom-left'}
            onClick={() => setPosition('bottom-left')}
          />
          <OptionButton
            label="Center"
            selected={position === 'bottom-center'}
            onClick={() => setPosition('bottom-center')}
          />
          <OptionButton
            label="Bottom right"
            selected={position === 'bottom-right'}
            onClick={() => setPosition('bottom-right')}
          />
        </div>
      </div>

      {/* Size */}
      <div>
        <p className={labelClass} style={{ color: '#475569' }}>Signature size</p>
        <div className="flex gap-2">
          {(['small', 'medium', 'large'] as SigSize[]).map(s => (
            <OptionButton
              key={s}
              label={s.charAt(0).toUpperCase() + s.slice(1)}
              selected={sigSize === s}
              onClick={() => setSigSize(s)}
            />
          ))}
        </div>
      </div>

      {/* Info box */}
      {stage === 'sign' && (
        <div
          className="p-3 rounded-lg text-xs leading-relaxed"
          style={{
            background: 'rgba(124,58,237,0.06)',
            border: '1px solid rgba(124,58,237,0.18)',
            color: '#94A3B8',
          }}
        >
          <p className="font-medium mb-1" style={{ color: '#A78BFA' }}>
            {signMode === 'draw' ? 'Draw your signature' : 'Type your name'}
          </p>
          {signMode === 'draw'
            ? 'Use mouse or touch to draw your signature in the canvas on the left.'
            : 'Your typed name will be rendered in italic script and embedded as an image.'}
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="text-sm px-3 py-2 rounded-lg"
          style={{
            color: '#EF4444',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.15)',
          }}
        >
          {error}
        </p>
      )}

      {/* Processing indicator */}
      {stage === 'processing' && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
          <div
            className="w-4 h-4 border-2 rounded-full animate-spin shrink-0"
            style={{ borderColor: 'rgba(124,58,237,0.30)', borderTopColor: '#7C3AED' }}
          />
          Embedding signature…
        </div>
      )}
    </div>
  )

  // ── Action button ─────────────────────────────────────────────────────────
  const isDisabled = !canApply

  const action = (
    <button
      type="button"
      onClick={handleApply}
      disabled={isDisabled}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: !isDisabled
          ? 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)'
          : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: !isDisabled ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
      }}
    >
      <span>Apply Signature</span>
      <span className="text-lg">→</span>
    </button>
  )

  // ── Sidebar header ────────────────────────────────────────────────────────
  const sidebarHeader = (
    <div className="flex items-center gap-2.5">
      <PenLine className="w-4 h-4 shrink-0" style={{ color: '#7C3AED' }} />
      <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>
        Sign PDF
      </h2>
    </div>
  )

  // ── Upload stage ──────────────────────────────────────────────────────────
  if (stage === 'upload') {
    return (
      <ToolLayout sidebar={sidebar} action={action} sidebarHeader={sidebarHeader}>
        <DropZone tool={tool} onFile={handleFileSelected} />
      </ToolLayout>
    )
  }

  // ── Sign stage ────────────────────────────────────────────────────────────
  return (
    <ToolLayout sidebar={sidebar} action={action} sidebarHeader={sidebarHeader}>
      <div className="flex flex-col gap-6">

        {/* File info strip */}
        {file && (
          <div className="flex items-center gap-4">
            <div
              className="rounded-xl overflow-hidden shrink-0"
              style={{ border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <PdfThumbnail file={file} width={72} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#E2E8F0' }}>
                {file.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                {formatFileSize(file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setFile(null); setStage('upload') }}
              className="ml-auto text-xs px-3 py-1.5 rounded-lg shrink-0 transition-colors"
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

        {/* Mode tabs */}
        <div>
          <div
            className="inline-flex rounded-xl p-1 gap-1"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <button
              type="button"
              onClick={() => setSignMode('draw')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              style={{
                background: signMode === 'draw' ? 'rgba(124,58,237,0.20)' : 'transparent',
                border: `1px solid ${signMode === 'draw' ? 'rgba(124,58,237,0.40)' : 'transparent'}`,
                color: signMode === 'draw' ? '#A78BFA' : '#94A3B8',
              }}
            >
              <PenLine className="w-4 h-4" />
              Draw
            </button>
            <button
              type="button"
              onClick={() => setSignMode('type')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              style={{
                background: signMode === 'type' ? 'rgba(124,58,237,0.20)' : 'transparent',
                border: `1px solid ${signMode === 'type' ? 'rgba(124,58,237,0.40)' : 'transparent'}`,
                color: signMode === 'type' ? '#A78BFA' : '#94A3B8',
              }}
            >
              <Keyboard className="w-4 h-4" />
              Type
            </button>
          </div>
        </div>

        {/* Signature creation area */}
        {signMode === 'draw' ? (
          <DrawPad canvasRef={canvasRef} onClear={handleClearPad} />
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              value={typedName}
              onChange={e => setTypedName(e.target.value)}
              placeholder="Type your full name"
              maxLength={80}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-150"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#E2E8F0',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.50)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
            />
            {typedName.trim() && (
              <div
                className="px-6 py-4 rounded-xl"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.12)',
                  maxWidth: '320px',
                }}
              >
                <p
                  style={{
                    font: 'italic 28px Georgia, serif',
                    color: '#1B3A6B',
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {typedName}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Placement summary */}
        <div
          className="flex flex-wrap gap-2 text-xs"
          style={{ color: '#64748B' }}
        >
          <span
            className="px-2.5 py-1 rounded-md"
            style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', color: '#A78BFA' }}
          >
            {pageTarget === 'first' ? 'First page' : pageTarget === 'last' ? 'Last page' : 'All pages'}
          </span>
          <span
            className="px-2.5 py-1 rounded-md"
            style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', color: '#A78BFA' }}
          >
            {position === 'bottom-left' ? 'Bottom left' : position === 'bottom-center' ? 'Bottom center' : 'Bottom right'}
          </span>
          <span
            className="px-2.5 py-1 rounded-md"
            style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', color: '#A78BFA' }}
          >
            {SIG_WIDTHS[sigSize]}pt wide
          </span>
        </div>

      </div>
    </ToolLayout>
  )
}

