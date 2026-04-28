'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { EyeOff, ChevronLeft, ChevronRight, Trash2, Check } from 'lucide-react'
import { ToolLayout, ToolResult } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'

// ── Types ──────────────────────────────────────────────────────────

interface Rect {
  x: number      // PDF-space coords (points, origin bottom-left)
  y: number
  w: number
  h: number
  page: number   // 1-indexed
}

// ── Drop zone ──────────────────────────────────────────────────────

function DropZone({ tool, onFile }: { tool: Tool; onFile: (f: File) => void }) {
  const [over, setOver] = useState(false)
  const accept = (files: FileList | null) => {
    const pdf = Array.from(files ?? []).find(f => f.type === 'application/pdf')
    if (pdf) onFile(pdf)
  }
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload PDF to redact"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
      style={{
        minHeight: '360px',
        background: over ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
        border: `2px dashed ${over ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.10)'}`,
      }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files) }}
      onClick={() => document.getElementById('redact-file-input')?.click()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('redact-file-input')?.click() }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: over ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)' }}
      >
        <EyeOff className="w-8 h-8" style={{ color: over ? '#EF4444' : '#475569' }} />
      </div>
      <div className="text-center">
        <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>
          {over ? 'Drop PDF here' : 'Select a PDF to redact'}
        </p>
        <p className="text-sm" style={{ color: '#475569' }}>
          Drop here or click · up to {tool.maxSizeMB} MB
        </p>
      </div>
      <input
        id="redact-file-input"
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={e => accept(e.target.files)}
      />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────

export function RedactPdfTool({ tool }: { tool: Tool }) {
  const [file, setFile]               = useState<File | null>(null)
  const [stage, setStage]             = useState<'upload' | 'edit' | 'processing' | 'done'>('upload')
  const [pageCount, setPageCount]     = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [rects, setRects]             = useState<Rect[]>([])
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError]             = useState('')
  const [drawing, setDrawing]         = useState(false)
  const [dragStart, setDragStart]     = useState<{ cx: number; cy: number } | null>(null)
  const [draftRect, setDraftRect]     = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  // pdfjs document proxy stored in ref — mutable, must not trigger re-renders
  const pdfDocRef    = useRef<import('pdfjs-dist').PDFDocumentProxy | null>(null)
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayRef    = useRef<HTMLCanvasElement | null>(null)
  const renderTaskRef = useRef<import('pdfjs-dist').RenderTask | null>(null)
  // PDF coordinate space for current page (needed for coordinate conversion)
  const pdfViewportRef = useRef<import('pdfjs-dist').PageViewport | null>(null)

  // ── Load PDF on file select ────────────────────────────────────────

  const loadPdf = useCallback(async (f: File) => {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = ''
    const bytes = new Uint8Array(await f.arrayBuffer())
    const doc = await pdfjsLib.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false }).promise
    pdfDocRef.current = doc
    setPageCount(doc.numPages)
    setCurrentPage(1)
    setRects([])
    setStage('edit')
  }, [])

  const handleFileSelect = useCallback((f: File) => {
    setFile(f)
    setError('')
    loadPdf(f).catch(() => setError('Could not load PDF'))
  }, [loadPdf])

  // ── Render current page to base canvas ────────────────────────────

  const SCALE = 1.5

  const renderPage = useCallback(async (pageNum: number) => {
    const doc = pdfDocRef.current
    const canvas = baseCanvasRef.current
    if (!doc || !canvas) return

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
      renderTaskRef.current = null
    }

    const page = await doc.getPage(pageNum)
    const vp = page.getViewport({ scale: SCALE })
    pdfViewportRef.current = vp
    canvas.width  = vp.width
    canvas.height = vp.height
    if (overlayRef.current) {
      overlayRef.current.width  = vp.width
      overlayRef.current.height = vp.height
    }

    const ctx = canvas.getContext('2d')!
    const task = page.render({ canvasContext: ctx, viewport: vp, canvas })
    renderTaskRef.current = task
    try {
      await task.promise
    } catch {
      // cancelled — ignore
    }
  }, [])

  useEffect(() => {
    if (stage === 'edit') renderPage(currentPage)
  }, [stage, currentPage, renderPage])

  // Redraw overlay whenever rects or draft change
  useEffect(() => {
    const canvas = overlayRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Committed rects for this page
    const vp = pdfViewportRef.current
    if (vp) {
      for (const r of rects.filter(r => r.page === currentPage)) {
        // Convert PDF coords → canvas coords (y-axis flip)
        const cx = r.x * SCALE
        const cy = (vp.height / SCALE - r.y - r.h) * SCALE
        const cw = r.w * SCALE
        const ch = r.h * SCALE
        ctx.fillStyle = '#000000'
        ctx.fillRect(cx, cy, cw, ch)
      }
    }

    // Draft rect being drawn
    if (draftRect) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.strokeStyle = '#EF4444'
      ctx.lineWidth = 2
      ctx.fillRect(draftRect.x, draftRect.y, draftRect.w, draftRect.h)
      ctx.strokeRect(draftRect.x, draftRect.y, draftRect.w, draftRect.h)
    }
  }, [rects, draftRect, currentPage])

  // ── Mouse drawing on overlay canvas ───────────────────────────────

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      cx: (e.clientX - rect.left) * (canvas.width / rect.width),
      cy: (e.clientY - rect.top)  * (canvas.height / rect.height),
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e)
    setDragStart(pos)
    setDrawing(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !dragStart) return
    const pos = getCanvasPos(e)
    setDraftRect({
      x: Math.min(dragStart.cx, pos.cx),
      y: Math.min(dragStart.cy, pos.cy),
      w: Math.abs(pos.cx - dragStart.cx),
      h: Math.abs(pos.cy - dragStart.cy),
    })
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !dragStart) return
    setDrawing(false)
    const pos = getCanvasPos(e)
    const vp = pdfViewportRef.current
    if (!vp) { setDraftRect(null); setDragStart(null); return }

    const cx = Math.min(dragStart.cx, pos.cx)
    const cy = Math.min(dragStart.cy, pos.cy)
    const cw = Math.abs(pos.cx - dragStart.cx)
    const ch = Math.abs(pos.cy - dragStart.cy)

    // Ignore tiny accidental clicks
    if (cw < 5 || ch < 5) { setDraftRect(null); setDragStart(null); return }

    // Convert canvas coords → PDF coords (y-axis flip)
    const pdfX = cx / SCALE
    const pdfY = (vp.height / SCALE) - (cy / SCALE) - (ch / SCALE)
    const pdfW = cw / SCALE
    const pdfH = ch / SCALE

    setRects(prev => [...prev, { x: pdfX, y: pdfY, w: pdfW, h: pdfH, page: currentPage }])
    setDraftRect(null)
    setDragStart(null)
  }

  // ── Apply redactions via pdf-lib ───────────────────────────────────

  const handleApply = useCallback(async () => {
    if (!file || rects.length === 0) return
    setStage('processing')
    setError('')
    try {
      const { PDFDocument, rgb } = await import('pdf-lib')
      const bytes = new Uint8Array(await file.arrayBuffer())
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
      const pages = doc.getPages()

      for (const r of rects) {
        const page = pages[r.page - 1]
        if (!page) continue
        page.drawRectangle({
          x: r.x,
          y: r.y,
          width: r.w,
          height: r.h,
          color: rgb(0, 0, 0),
          borderWidth: 0,
          // Draw twice to ensure opacity=1 coverage
          opacity: 1,
        })
      }

      const saved = Uint8Array.from(await doc.save())
      const blob = new Blob([saved.buffer as ArrayBuffer], { type: 'application/pdf' })
      setDownloadUrl(URL.createObjectURL(blob))
      setStage('done')
    } catch {
      setError('Redaction failed. Please try again.')
      setStage('edit')
    }
  }, [file, rects])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    if (pdfDocRef.current) { pdfDocRef.current.destroy(); pdfDocRef.current = null }
    setFile(null); setStage('upload'); setRects([]); setDownloadUrl(''); setError('')
    setCurrentPage(1); setPageCount(0)
  }, [downloadUrl])

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
      pdfDocRef.current?.destroy()
    }
  }, [downloadUrl])

  const outputName = file ? `${file.name.replace(/\.pdf$/i, '')}_redacted.pdf` : 'redacted.pdf'

  const pageRectCount = rects.filter(r => r.page === currentPage).length
  const totalRects    = rects.length

  // ── Done ──────────────────────────────────────────────────────────

  if (stage === 'done' && downloadUrl) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ToolResult downloadUrl={downloadUrl} fileName={outputName} onReset={handleReset} />
      </div>
    )
  }

  // ── Sidebar ───────────────────────────────────────────────────────

  const sidebar = (
    <div className="space-y-4">
      {stage === 'edit' && (
        <>
          {/* Page info */}
          <div className="text-xs" style={{ color: '#94A3B8' }}>
            <p>
              <span className="font-semibold" style={{ color: '#E2E8F0' }}>{totalRects}</span> redaction
              {totalRects !== 1 ? 's' : ''} added
              {totalRects > 0 && pageRectCount > 0 && (
                <span style={{ color: '#64748B' }}> ({pageRectCount} on this page)</span>
              )}
            </p>
          </div>

          {/* Redaction list for current page */}
          {pageRectCount > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium" style={{ color: '#64748B' }}>Page {currentPage}</p>
              {rects
                .map((r, i) => ({ r, i }))
                .filter(({ r }) => r.page === currentPage)
                .map(({ i }) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                  >
                    <span style={{ color: '#94A3B8' }}>Region {i + 1}</span>
                    <button
                      onClick={() => setRects(prev => prev.filter((_, idx) => idx !== i))}
                      className="p-0.5 rounded transition-colors hover:bg-red-500/20"
                      style={{ color: '#EF4444' }}
                      aria-label="Remove redaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              }
            </div>
          )}

          {/* Instructions */}
          <div
            className="p-3 rounded-lg text-xs leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#64748B' }}
          >
            <p className="font-medium mb-1" style={{ color: '#94A3B8' }}>How to redact</p>
            <p>Drag over any area to mark it for permanent redaction. Redacted regions become solid black rectangles in the output PDF.</p>
          </div>
        </>
      )}

      {stage === 'processing' && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
          <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          Applying redactions…
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </p>
      )}

      {file && stage === 'edit' && (
        <div className="text-center">
          <p className="text-xs font-medium truncate" style={{ color: '#E2E8F0' }}>{file.name}</p>
          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{formatFileSize(file.size)}</p>
        </div>
      )}
    </div>
  )

  // ── Action button ──────────────────────────────────────────────────

  const canApply = stage === 'edit' && totalRects > 0
  const action = (
    <button
      onClick={canApply ? handleApply : undefined}
      disabled={!canApply}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: canApply
          ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
          : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: canApply ? '0 4px 20px rgba(239,68,68,0.35)' : 'none',
      }}
    >
      <span className="flex items-center gap-2">
        <Check className="w-4 h-4" />
        Apply Redactions
      </span>
      <span className="text-lg">→</span>
    </button>
  )

  // ── Render ────────────────────────────────────────────────────────

  return (
    <ToolLayout
      sidebar={sidebar}
      action={action}
      sidebarHeader={
        <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>
          Redact PDF
        </h2>
      }
    >
      {stage === 'upload' || stage === 'processing' ? (
        <DropZone tool={tool} onFile={handleFileSelect} />
      ) : (
        <div className="flex flex-col gap-3">
          {/* Page navigation */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-30"
              style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="text-xs" style={{ color: '#64748B' }}>
              Page <span style={{ color: '#E2E8F0' }}>{currentPage}</span> of {pageCount}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
              disabled={currentPage >= pageCount}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-30"
              style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Canvas area */}
          <div
            className="relative overflow-auto rounded-xl"
            style={{ border: '1px solid rgba(255,255,255,0.08)', maxHeight: '560px' }}
          >
            {/* Base PDF render */}
            <canvas ref={baseCanvasRef} style={{ display: 'block' }} />
            {/* Overlay for drawing — positioned on top */}
            <canvas
              ref={overlayRef}
              className="absolute inset-0"
              style={{ cursor: 'crosshair' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { if (drawing) { setDrawing(false); setDraftRect(null); setDragStart(null) } }}
            />
          </div>

          <p className="text-xs text-center" style={{ color: '#475569' }}>
            Drag to draw a redaction region
            {pageRectCount > 0 && ` · ${pageRectCount} region${pageRectCount !== 1 ? 's' : ''} on this page`}
          </p>
        </div>
      )}
    </ToolLayout>
  )
}
