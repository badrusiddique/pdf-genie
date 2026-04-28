'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Edit3, MousePointer, Type, Square, Minus, Pen } from 'lucide-react'
import { ToolLayout, ToolResult } from '@/components/tool'
import { formatFileSize } from '@/lib/file-utils'
import type { Tool } from '@/config/tools'

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = 'upload' | 'edit'
type ActiveTool = 'select' | 'text' | 'rect' | 'line' | 'draw'

type Annotation =
  | { type: 'rect';  page: number; x: number; y: number; w: number; h: number; color: string; lineWidth: number }
  | { type: 'line';  page: number; x1: number; y1: number; x2: number; y2: number; color: string; lineWidth: number }
  | { type: 'draw';  page: number; points: [number, number][]; color: string; lineWidth: number }
  | { type: 'text';  page: number; x: number; y: number; text: string; fontSize: number; color: string }

interface PendingText {
  x: number  // canvas screen coords
  y: number
  pdfX: number  // PDF-space coords
  pdfY: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16) / 255
  const g = parseInt(clean.substring(2, 4), 16) / 255
  const b = parseInt(clean.substring(4, 6), 16) / 255
  return { r, g, b }
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
      aria-label="Upload a PDF to edit"
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
        <Edit3 className="w-8 h-8" style={{ color: over ? '#7C3AED' : '#475569' }} />
      </div>
      <div className="text-center">
        <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>
          {over ? 'Drop PDF here' : 'Select a PDF to annotate'}
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

// ── Tool button ───────────────────────────────────────────────────────────────

function ToolBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150"
      style={{
        background: active ? 'rgba(124,58,237,0.30)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${active ? 'rgba(124,58,237,0.60)' : 'rgba(255,255,255,0.08)'}`,
        color: active ? '#A78BFA' : '#64748B',
      }}
    >
      {children}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function EditPdfTool({ tool }: { tool: Tool }) {
  // Stage & file
  const [stage, setStage]         = useState<Stage>('upload')
  const [file, setFile]           = useState<File | null>(null)

  // PDF state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages]   = useState(0)
  const [scale, setScale]             = useState(1.0)
  const [pageHeight, setPageHeight]   = useState(0)  // PDF points

  // Annotations
  const [annotations, setAnnotations] = useState<Annotation[]>([])

  // Tool state
  const [activeTool, setActiveTool] = useState<ActiveTool>('draw')
  const [color, setColor]           = useState('#EF4444')
  const [lineWidth, setLineWidth]   = useState(2)
  const [fontSize, setFontSize]     = useState(14)
  const [pendingText, setPendingText] = useState<PendingText | null>(null)
  const [pendingTextValue, setPendingTextValue] = useState('')

  // Result
  const [downloadUrl, setDownloadUrl] = useState('')
  const [outputFileName, setOutputFileName] = useState('edited.pdf')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [selectTooltip, setSelectTooltip] = useState(false)

  // Refs
  const baseCanvasRef    = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const pdfBytesRef      = useRef<Uint8Array | null>(null)
  const pdfjsDocRef      = useRef<import('pdfjs-dist').PDFDocumentProxy | null>(null)
  const renderTaskRef    = useRef<import('pdfjs-dist').RenderTask | null>(null)

  // Drawing state refs (avoid re-renders during mouse move)
  const isDrawingRef  = useRef(false)
  const drawStartRef  = useRef<{ x: number; y: number } | null>(null)
  const drawPointsRef = useRef<[number, number][]>([])

  // ── Annotation helpers ──────────────────────────────────────────────────────

  const toPdfX = useCallback((canvasX: number) => canvasX / scale, [scale])
  const toPdfY = useCallback((canvasY: number) => pageHeight - canvasY / scale, [scale, pageHeight])

  // ── Redraw overlay ──────────────────────────────────────────────────────────

  const redrawAnnotations = useCallback((anns: Annotation[], pg: number, sc: number, pH: number) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const pageAnns = anns.filter(a => a.page === pg)
    for (const ann of pageAnns) {
      ctx.strokeStyle = ann.color
      if (ann.type !== 'text') ctx.lineWidth = ann.lineWidth

      if (ann.type === 'rect') {
        const cx = ann.x * sc
        const cy = (pH - ann.y - ann.h) * sc
        ctx.strokeRect(cx, cy, ann.w * sc, ann.h * sc)
      } else if (ann.type === 'line') {
        ctx.beginPath()
        ctx.moveTo(ann.x1 * sc, (pH - ann.y1) * sc)
        ctx.lineTo(ann.x2 * sc, (pH - ann.y2) * sc)
        ctx.stroke()
      } else if (ann.type === 'draw') {
        if (ann.points.length < 2) continue
        ctx.beginPath()
        const [fx, fy] = ann.points[0]
        ctx.moveTo(fx * sc, (pH - fy) * sc)
        for (let i = 1; i < ann.points.length; i++) {
          const [px, py] = ann.points[i]
          ctx.lineTo(px * sc, (pH - py) * sc)
        }
        ctx.stroke()
      } else if (ann.type === 'text') {
        ctx.fillStyle = ann.color
        ctx.font = `${ann.fontSize * sc}px sans-serif`
        ctx.fillText(ann.text, ann.x * sc, (pH - ann.y) * sc)
      }
    }
  }, [])

  // ── Load page ───────────────────────────────────────────────────────────────

  const renderPage = useCallback(async (pageNum: number, anns: Annotation[]) => {
    const doc = pdfjsDocRef.current
    const baseCanvas = baseCanvasRef.current
    const overlayCanvas = overlayCanvasRef.current
    if (!doc || !baseCanvas || !overlayCanvas) return

    // Cancel any in-progress render
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel() } catch { /* ignore */ }
      renderTaskRef.current = null
    }

    const page = await doc.getPage(pageNum)
    const viewport = page.getViewport({ scale })

    baseCanvas.width   = viewport.width
    baseCanvas.height  = viewport.height
    overlayCanvas.width  = viewport.width
    overlayCanvas.height = viewport.height

    const ctx = baseCanvas.getContext('2d')
    if (!ctx) return

    const task = page.render({ canvas: baseCanvas, canvasContext: ctx, viewport })
    renderTaskRef.current = task
    try {
      await task.promise
    } catch (e) {
      if ((e as Error).name === 'RenderingCancelledException') return
      throw e
    }
    renderTaskRef.current = null

    const nativeVp = page.getViewport({ scale: 1 })
    setPageHeight(nativeVp.height)

    redrawAnnotations(anns, pageNum, scale, nativeVp.height)
  }, [scale, redrawAnnotations])

  // ── File selected ───────────────────────────────────────────────────────────

  const handleFileSelected = useCallback(async (f: File) => {
    setFile(f)
    setError('')
    setAnnotations([])
    setCurrentPage(1)
    setStage('edit')

    const arrayBuffer = await f.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    pdfBytesRef.current = bytes

    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = ''

    const doc = await pdfjsLib.getDocument({
      data: bytes,
      useWorkerFetch: false,
      isEvalSupported: false,
    }).promise

    pdfjsDocRef.current = doc
    setTotalPages(doc.numPages)
  }, [])

  // ── Render when page/scale changes ─────────────────────────────────────────

  useEffect(() => {
    if (stage !== 'edit' || !pdfjsDocRef.current) return
    renderPage(currentPage, annotations)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, scale, stage])

  // Keep overlay in sync when annotations change
  useEffect(() => {
    if (stage !== 'edit') return
    redrawAnnotations(annotations, currentPage, scale, pageHeight)
  }, [annotations, currentPage, scale, pageHeight, stage, redrawAnnotations])

  // ── Canvas coords ───────────────────────────────────────────────────────────

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  // ── Mouse handlers ──────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'select') {
      setSelectTooltip(true)
      setTimeout(() => setSelectTooltip(false), 2000)
      return
    }
    if (activeTool === 'text') {
      const { x, y } = getCanvasCoords(e)
      setPendingText({
        x,
        y,
        pdfX: toPdfX(x),
        pdfY: toPdfY(y),
      })
      setPendingTextValue('')
      return
    }

    const { x, y } = getCanvasCoords(e)
    isDrawingRef.current = true
    drawStartRef.current = { x, y }
    drawPointsRef.current = [[toPdfX(x), toPdfY(y)]]
  }, [activeTool, getCanvasCoords, toPdfX, toPdfY])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const { x, y } = getCanvasCoords(e)
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (activeTool === 'draw') {
      drawPointsRef.current.push([toPdfX(x), toPdfY(y)])
      // Live preview: redraw saved + current stroke
      redrawAnnotations(annotations, currentPage, scale, pageHeight)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      const pts = drawPointsRef.current
      if (pts.length > 0) {
        ctx.moveTo(pts[0][0] * scale, (pageHeight - pts[0][1]) * scale)
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i][0] * scale, (pageHeight - pts[i][1]) * scale)
        }
        ctx.stroke()
      }
    } else if (activeTool === 'rect' && drawStartRef.current) {
      const start = drawStartRef.current
      redrawAnnotations(annotations, currentPage, scale, pageHeight)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.strokeRect(start.x, start.y, x - start.x, y - start.y)
    } else if (activeTool === 'line' && drawStartRef.current) {
      const start = drawStartRef.current
      redrawAnnotations(annotations, currentPage, scale, pageHeight)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }, [activeTool, annotations, color, currentPage, getCanvasCoords, lineWidth, pageHeight, redrawAnnotations, scale, toPdfX, toPdfY])

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const { x, y } = getCanvasCoords(e)

    if (activeTool === 'draw') {
      const pts = drawPointsRef.current
      if (pts.length > 1) {
        setAnnotations(prev => [...prev, {
          type: 'draw',
          page: currentPage,
          points: pts,
          color,
          lineWidth,
        }])
      }
      drawPointsRef.current = []
    } else if (activeTool === 'rect' && drawStartRef.current) {
      const start = drawStartRef.current
      const sx = toPdfX(start.x)
      const sy = toPdfY(start.y)
      const ex = toPdfX(x)
      const ey = toPdfY(y)
      const rx = Math.min(sx, ex)
      const ry = Math.min(sy, ey)
      const rw = Math.abs(ex - sx)
      const rh = Math.abs(ey - sy)
      if (rw > 1 && rh > 1) {
        setAnnotations(prev => [...prev, {
          type: 'rect',
          page: currentPage,
          x: rx,
          y: ry,
          w: rw,
          h: rh,
          color,
          lineWidth,
        }])
      }
    } else if (activeTool === 'line' && drawStartRef.current) {
      const start = drawStartRef.current
      setAnnotations(prev => [...prev, {
        type: 'line',
        page: currentPage,
        x1: toPdfX(start.x),
        y1: toPdfY(start.y),
        x2: toPdfX(x),
        y2: toPdfY(y),
        color,
        lineWidth,
      }])
    }

    drawStartRef.current = null
  }, [activeTool, color, currentPage, getCanvasCoords, lineWidth, toPdfX, toPdfY])

  // ── Finalize text input ─────────────────────────────────────────────────────

  const finalizeText = useCallback(() => {
    if (!pendingText || !pendingTextValue.trim()) {
      setPendingText(null)
      setPendingTextValue('')
      return
    }
    setAnnotations(prev => [...prev, {
      type: 'text',
      page: currentPage,
      x: pendingText.pdfX,
      y: pendingText.pdfY,
      text: pendingTextValue.trim(),
      fontSize,
      color,
    }])
    setPendingText(null)
    setPendingTextValue('')
  }, [pendingText, pendingTextValue, currentPage, fontSize, color])

  // ── Save / download ─────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!file || !pdfBytesRef.current) return
    setSaving(true)
    setError('')

    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
      const pdfDoc = await PDFDocument.load(pdfBytesRef.current)
      const pages  = pdfDoc.getPages()
      const font   = await pdfDoc.embedFont(StandardFonts.Helvetica)

      for (const ann of annotations) {
        const page = pages[ann.page - 1]
        if (!page) continue
        const { height: pH } = page.getSize()
        const { r, g, b } = hexToRgb01(ann.color)
        const annColor = rgb(r, g, b)

        if (ann.type === 'rect') {
          // y-flip: PDF origin bottom-left
          // ann.y is the BOTTOM of the rect in PDF coords (already in PDF space)
          page.drawRectangle({
            x: ann.x,
            y: ann.y,
            width: ann.w,
            height: ann.h,
            borderColor: annColor,
            borderWidth: ann.lineWidth,
            opacity: 0,
          })
        } else if (ann.type === 'line') {
          page.drawLine({
            start: { x: ann.x1, y: ann.y1 },
            end:   { x: ann.x2, y: ann.y2 },
            color: annColor,
            thickness: ann.lineWidth,
          })
        } else if (ann.type === 'draw') {
          for (let i = 0; i < ann.points.length - 1; i++) {
            const [x1, y1] = ann.points[i]
            const [x2, y2] = ann.points[i + 1]
            page.drawLine({
              start: { x: x1, y: y1 },
              end:   { x: x2, y: y2 },
              color: annColor,
              thickness: ann.lineWidth,
            })
          }
        } else if (ann.type === 'text') {
          // ann.y is already in PDF coords (bottom-left origin)
          // Adjust for font baseline — subtract fontSize so text appears above the click point
          page.drawText(ann.text, {
            x: ann.x,
            y: ann.y - ann.fontSize,
            size: ann.fontSize,
            color: annColor,
            font,
            maxWidth: pH, // generous fallback
          })
        }
      }

      const savedBytes = await pdfDoc.save()
      const blob = new Blob([savedBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const name = `${file.name.replace(/\.pdf$/i, '')}_edited.pdf`
      setOutputFileName(name)
      setDownloadUrl(URL.createObjectURL(blob))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save PDF')
    } finally {
      setSaving(false)
    }
  }, [file, annotations])

  // ── Reset ───────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    // Cancel pending render
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel() } catch { /* ignore */ }
      renderTaskRef.current = null
    }
    pdfjsDocRef.current = null
    pdfBytesRef.current = null
    setFile(null)
    setStage('upload')
    setAnnotations([])
    setCurrentPage(1)
    setTotalPages(0)
    setDownloadUrl('')
    setError('')
    setPendingText(null)
    setPendingTextValue('')
  }, [downloadUrl])

  // ── Done screen ───────────────────────────────────────────────────────────

  if (downloadUrl) {
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

      {/* Color */}
      <div>
        <p className={labelClass} style={{ color: '#475569' }}>Color</p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
            aria-label="Annotation color"
          />
          <span className="text-xs font-mono" style={{ color: '#94A3B8' }}>{color}</span>
          <div className="flex gap-1.5 ml-auto">
            {['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#000000'].map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c,
                  outline: color === c ? `2px solid #A78BFA` : '2px solid transparent',
                  outlineOffset: '2px',
                }}
                aria-label={`Set color ${c}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Stroke width */}
      <div>
        <p className={labelClass} style={{ color: '#475569' }}>
          Stroke width — {lineWidth}px
        </p>
        <input
          type="range"
          min={1}
          max={12}
          step={1}
          value={lineWidth}
          onChange={e => setLineWidth(Number(e.target.value))}
          className="w-full accent-purple-500"
          aria-label="Stroke width"
        />
      </div>

      {/* Font size (only relevant for text) */}
      <div style={{ opacity: activeTool === 'text' ? 1 : 0.4 }}>
        <p className={labelClass} style={{ color: '#475569' }}>
          Font size — {fontSize}pt
        </p>
        <input
          type="range"
          min={8}
          max={72}
          step={2}
          value={fontSize}
          onChange={e => setFontSize(Number(e.target.value))}
          className="w-full accent-purple-500"
          aria-label="Font size"
          disabled={activeTool !== 'text'}
        />
      </div>

      {/* Clear page annotations */}
      {stage === 'edit' && annotations.some(a => a.page === currentPage) && (
        <button
          type="button"
          onClick={() => setAnnotations(prev => prev.filter(a => a.page !== currentPage))}
          className="w-full py-2 text-xs rounded-lg transition-colors"
          style={{
            color: '#EF4444',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.18)',
          }}
        >
          Clear page annotations
        </button>
      )}

      {/* Annotation count */}
      {annotations.length > 0 && (
        <p className="text-xs" style={{ color: '#475569' }}>
          {annotations.length} annotation{annotations.length !== 1 ? 's' : ''} total
          {' · '}
          {annotations.filter(a => a.page === currentPage).length} on this page
        </p>
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

      {/* Saving indicator */}
      {saving && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
          <div
            className="w-4 h-4 border-2 rounded-full animate-spin shrink-0"
            style={{ borderColor: 'rgba(124,58,237,0.30)', borderTopColor: '#7C3AED' }}
          />
          Saving annotations…
        </div>
      )}
    </div>
  )

  // ── Action button ─────────────────────────────────────────────────────────

  const canSave = stage === 'edit' && !!file && !saving
  const action = (
    <button
      type="button"
      onClick={handleSave}
      disabled={!canSave}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: canSave
          ? 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)'
          : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: canSave ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
      }}
    >
      <span>Save Changes</span>
      <span className="text-lg">→</span>
    </button>
  )

  // ── Sidebar header ────────────────────────────────────────────────────────

  const sidebarHeader = (
    <div className="flex items-center gap-2.5">
      <Edit3 className="w-4 h-4 shrink-0" style={{ color: '#7C3AED' }} />
      <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>
        Edit PDF
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

  // ── Edit stage ────────────────────────────────────────────────────────────

  const toolButtons: { id: ActiveTool; icon: React.ReactNode; title: string }[] = [
    { id: 'select', icon: <MousePointer className="w-4 h-4" />, title: 'Select (coming soon)' },
    { id: 'text',   icon: <Type className="w-4 h-4" />,         title: 'Text' },
    { id: 'rect',   icon: <Square className="w-4 h-4" />,       title: 'Rectangle' },
    { id: 'line',   icon: <Minus className="w-4 h-4" />,        title: 'Line' },
    { id: 'draw',   icon: <Pen className="w-4 h-4" />,          title: 'Freehand draw' },
  ]

  // Cursor style for overlay canvas
  const cursorStyle =
    activeTool === 'text'   ? 'text' :
    activeTool === 'select' ? 'default' :
    'crosshair'

  return (
    <ToolLayout sidebar={sidebar} action={action} sidebarHeader={sidebarHeader}>
      <div className="flex flex-col gap-3 h-full">

        {/* File info + change */}
        {file && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" style={{ color: '#E2E8F0' }}>
                {file.name}
              </p>
              <p className="text-xs" style={{ color: '#475569' }}>
                {formatFileSize(file.size)} · {totalPages} page{totalPages !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs px-3 py-1.5 rounded-lg shrink-0 transition-colors"
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

        {/* Toolbar + page nav */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Tool buttons */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {toolButtons.map(tb => (
              <div key={tb.id} className="relative">
                <ToolBtn
                  active={activeTool === tb.id}
                  onClick={() => setActiveTool(tb.id)}
                  title={tb.title}
                >
                  {tb.icon}
                </ToolBtn>
              </div>
            ))}
          </div>

          {/* Select tooltip */}
          {selectTooltip && (
            <span
              className="text-xs px-2 py-1 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#94A3B8',
              }}
            >
              Selection coming soon
            </span>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Scale */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScale(s => Math.max(0.4, +(s - 0.1).toFixed(1)))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-sm font-bold transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="text-xs w-10 text-center" style={{ color: '#94A3B8' }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale(s => Math.min(3.0, +(s + 0.1).toFixed(1)))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-sm font-bold transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}
              aria-label="Zoom in"
            >
              +
            </button>
          </div>

          {/* Page navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}
                aria-label="Previous page"
              >
                ‹
              </button>
              <span className="text-xs whitespace-nowrap" style={{ color: '#94A3B8' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* Canvas area */}
        <div
          className="flex-1 overflow-auto rounded-xl flex items-start justify-center pt-2"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="relative inline-block"
            style={{ lineHeight: 0 }}
          >
            {/* Base canvas — pdfjs renders here */}
            <canvas
              ref={baseCanvasRef}
              style={{ display: 'block' }}
            />
            {/* Overlay canvas — annotation capture */}
            <canvas
              ref={overlayCanvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'auto',
                cursor: cursorStyle,
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            {/* Inline text input */}
            {pendingText && (
              <input
                autoFocus
                type="text"
                value={pendingTextValue}
                onChange={e => setPendingTextValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') finalizeText()
                  if (e.key === 'Escape') { setPendingText(null); setPendingTextValue('') }
                }}
                onBlur={finalizeText}
                placeholder="Type here…"
                className="absolute outline-none rounded px-1"
                style={{
                  left: pendingText.x,
                  top: pendingText.y - fontSize * scale,
                  fontSize: `${fontSize * scale}px`,
                  color: color,
                  background: 'rgba(6,11,24,0.85)',
                  border: `1px solid ${color}55`,
                  minWidth: '80px',
                  pointerEvents: 'auto',
                  zIndex: 10,
                  lineHeight: 1.2,
                }}
              />
            )}
          </div>
        </div>

      </div>
    </ToolLayout>
  )
}
