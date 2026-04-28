'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { FileText, Info, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { ToolLayout } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'
import type { PDFDocumentProxy } from 'pdfjs-dist'

// ── Types ──────────────────────────────────────────────────────────

type Stage = 'upload' | 'loading' | 'compare'

interface ComparePdfToolProps { tool: Tool }

// ── Drop zone panel ───────────────────────────────────────────────

interface DropPanelProps {
  id: string
  label: string
  file: File | null
  onFile: (f: File) => void
  onClear: () => void
}

function DropPanel({ id, label, file, onFile, onClear }: DropPanelProps) {
  const [over, setOver] = useState(false)
  const inputId = `compare-input-${id}`

  const accept = (files: FileList | null) => {
    const pdf = Array.from(files ?? []).find(f => f.type === 'application/pdf')
    if (pdf) onFile(pdf)
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-center" style={{ color: '#7C3AED' }}>
        {label}
      </p>

      {file ? (
        // File selected state
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl p-6"
          style={{
            minHeight: '220px',
            background: 'rgba(124,58,237,0.06)',
            border: '2px solid rgba(124,58,237,0.25)',
          }}
        >
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.12)' }}
          >
            <FileText className="w-7 h-7" style={{ color: '#7C3AED' }} />
          </div>
          <div className="text-center">
            <p
              className="text-sm font-medium break-all line-clamp-2"
              style={{ color: '#E2E8F0' }}
            >
              {file.name}
            </p>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>
              {formatFileSize(file.size)}
            </p>
          </div>
          <button
            onClick={onClear}
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
      ) : (
        // Drop zone state
        <div
          role="button"
          tabIndex={0}
          aria-label={`Upload ${label}`}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer transition-all duration-200"
          style={{
            minHeight: '220px',
            background: over ? 'rgba(124,58,237,0.10)' : 'rgba(255,255,255,0.02)',
            border: `2px dashed ${over ? 'rgba(124,58,237,0.60)' : 'rgba(255,255,255,0.10)'}`,
          }}
          onDragOver={e => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files) }}
          onClick={() => document.getElementById(inputId)?.click()}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') document.getElementById(inputId)?.click()
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: over ? 'rgba(124,58,237,0.20)' : 'rgba(255,255,255,0.04)' }}
          >
            <FileText className="w-6 h-6" style={{ color: over ? '#7C3AED' : '#475569' }} />
          </div>
          <div className="text-center px-4">
            <p className="text-sm font-medium mb-0.5" style={{ color: '#E2E8F0' }}>
              {over ? 'Drop PDF here' : 'Select PDF'}
            </p>
            <p className="text-xs" style={{ color: '#475569' }}>
              Drop here or click to browse
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
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

export function ComparePdfTool({ tool: _tool }: ComparePdfToolProps) {
  const [fileA, setFileA] = useState<File | null>(null)
  const [fileB, setFileB] = useState<File | null>(null)
  const [stage, setStage] = useState<Stage>('upload')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPagesA, setTotalPagesA] = useState(0)
  const [totalPagesB, setTotalPagesB] = useState(0)
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')
  const [error, setError] = useState('')

  // PDFDocumentProxy stored in refs — not serializable, must not trigger re-renders
  const docARef = useRef<PDFDocumentProxy | null>(null)
  const docBRef = useRef<PDFDocumentProxy | null>(null)

  const canvasARef = useRef<HTMLCanvasElement>(null)
  const canvasBRef = useRef<HTMLCanvasElement>(null)

  // Track ongoing render tasks to cancel stale ones
  const renderTaskARef = useRef<{ cancel: () => void } | null>(null)
  const renderTaskBRef = useRef<{ cancel: () => void } | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      docARef.current?.destroy()
      docBRef.current?.destroy()
    }
  }, [])

  // ── Render a page to a canvas ──
  const renderPage = useCallback(async (
    pdfDoc: PDFDocumentProxy,
    pageNum: number,
    canvas: HTMLCanvasElement,
    cancelRef: React.MutableRefObject<{ cancel: () => void } | null>,
  ) => {
    // Cancel any in-progress render on this canvas
    cancelRef.current?.cancel()
    cancelRef.current = null

    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.2 })
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    const task = page.render({ canvasContext: ctx, viewport, canvas })
    cancelRef.current = task
    await task.promise
    cancelRef.current = null
  }, [])

  // ── Extract page text ──
  const getPageText = useCallback(async (
    pdfDoc: PDFDocumentProxy,
    pageNum: number,
  ): Promise<string> => {
    const page = await pdfDoc.getPage(pageNum)
    const content = await page.getTextContent()
    return content.items
      .filter((i): i is { str: string } & typeof i => 'str' in i)
      .map(i => (i as { str: string }).str)
      .join(' ')
  }, [])

  // ── Render current page whenever page or stage changes ──
  useEffect(() => {
    if (stage !== 'compare') return
    if (!docARef.current || !docBRef.current) return

    const docA = docARef.current
    const docB = docBRef.current

    ;(async () => {
      try {
        const [ta, tb] = await Promise.all([
          getPageText(docA, currentPage),
          getPageText(docB, Math.min(currentPage, totalPagesB)),
        ])
        setTextA(ta)
        setTextB(tb)

        if (canvasARef.current) {
          await renderPage(docA, currentPage, canvasARef.current, renderTaskARef)
        }
        if (canvasBRef.current) {
          await renderPage(docB, Math.min(currentPage, totalPagesB), canvasBRef.current, renderTaskBRef)
        }
      } catch (err) {
        if ((err as Error).name !== 'RenderingCancelledException') {
          setError(err instanceof Error ? err.message : 'Render error')
        }
      }
    })()
  }, [stage, currentPage, totalPagesB, renderPage, getPageText])

  // ── Load both PDFs and enter compare stage ──
  const handleCompare = useCallback(async () => {
    if (!fileA || !fileB) return
    setStage('loading')
    setError('')

    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = ''

      const [bytesA, bytesB] = await Promise.all([
        fileA.arrayBuffer().then(b => new Uint8Array(b)),
        fileB.arrayBuffer().then(b => new Uint8Array(b)),
      ])

      // Destroy previous docs if any
      docARef.current?.destroy()
      docBRef.current?.destroy()

      const [docA, docB] = await Promise.all([
        pdfjsLib.getDocument({
          data: bytesA,
          useWorkerFetch: false,
          isEvalSupported: false,
        }).promise,
        pdfjsLib.getDocument({
          data: bytesB,
          useWorkerFetch: false,
          isEvalSupported: false,
        }).promise,
      ])

      docARef.current = docA
      docBRef.current = docB

      setTotalPagesA(docA.numPages)
      setTotalPagesB(docB.numPages)
      setCurrentPage(1)
      setStage('compare')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDFs')
      setStage('upload')
    }
  }, [fileA, fileB])

  // ── Reset ──
  const handleReset = useCallback(() => {
    renderTaskARef.current?.cancel()
    renderTaskBRef.current?.cancel()
    docARef.current?.destroy()
    docBRef.current?.destroy()
    docARef.current = null
    docBRef.current = null
    setFileA(null)
    setFileB(null)
    setStage('upload')
    setCurrentPage(1)
    setTotalPagesA(0)
    setTotalPagesB(0)
    setTextA('')
    setTextB('')
    setError('')
  }, [])

  // ── Page navigation ──
  const totalPages = Math.max(totalPagesA, totalPagesB)
  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages

  // ── Sidebar ──
  const sidebar = (
    <div className="space-y-5">
      {stage === 'compare' && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
            Document info
          </p>
          <div className="space-y-2 text-xs" style={{ color: '#94A3B8' }}>
            <div className="flex justify-between">
              <span>Original pages</span>
              <span style={{ color: '#E2E8F0' }}>{totalPagesA}</span>
            </div>
            <div className="flex justify-between">
              <span>Modified pages</span>
              <span style={{ color: '#E2E8F0' }}>{totalPagesB}</span>
            </div>
          </div>
        </div>
      )}

      <div
        className="flex gap-2.5 p-3 rounded-lg text-xs leading-relaxed"
        style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#7C3AED' }} />
        <span style={{ color: '#94A3B8' }}>
          Shows pages side-by-side. Text differences highlighted below each viewer.
        </span>
      </div>

      {stage === 'compare' && (
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
          style={{
            color: '#94A3B8',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <RotateCcw className="w-4 h-4" />
          Compare new PDFs
        </button>
      )}

      {error && (
        <p
          role="alert"
          className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          {error}
        </p>
      )}

      {stage === 'loading' && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
          <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin shrink-0" />
          Loading PDFs…
        </div>
      )}
    </div>
  )

  // ── Action button ──
  const bothLoaded = fileA !== null && fileB !== null
  const action = (
    <button
      onClick={stage === 'compare' ? handleReset : handleCompare}
      disabled={(!bothLoaded && stage === 'upload') || stage === 'loading'}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: (bothLoaded || stage === 'compare')
          ? 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)'
          : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: (bothLoaded || stage === 'compare') ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
      }}
    >
      <span>{stage === 'compare' ? 'New Comparison' : 'Compare PDFs'}</span>
      <span className="text-lg">→</span>
    </button>
  )

  // ── Sidebar header ──
  const sidebarHeader = (
    <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>
      Compare PDFs
    </h2>
  )

  // ── Upload stage workspace ──
  if (stage === 'upload' || stage === 'loading') {
    return (
      <ToolLayout sidebar={sidebar} action={action} sidebarHeader={sidebarHeader}>
        <div className="flex flex-col gap-6 h-full">
          {/* Drop zone panels side-by-side */}
          <div className="flex gap-4">
            <DropPanel
              id="a"
              label="Original PDF"
              file={fileA}
              onFile={setFileA}
              onClear={() => setFileA(null)}
            />
            {/* Divider */}
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px' }}
            >
              <div
                className="px-2 py-1 rounded-full text-xs font-bold"
                style={{
                  background: '#060B18',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#475569',
                  writingMode: 'horizontal-tb',
                }}
              >
                VS
              </div>
            </div>
            <DropPanel
              id="b"
              label="Modified PDF"
              file={fileB}
              onFile={setFileB}
              onClear={() => setFileB(null)}
            />
          </div>

          {/* Instructions when nothing loaded yet */}
          {!fileA && !fileB && (
            <p className="text-center text-sm" style={{ color: '#475569' }}>
              Upload both PDFs above, then click &ldquo;Compare PDFs →&rdquo; to start.
            </p>
          )}
          {(fileA || fileB) && !bothLoaded && (
            <p className="text-center text-sm" style={{ color: '#475569' }}>
              {fileA ? 'Now upload the Modified PDF →' : '← Upload the Original PDF first'}
            </p>
          )}
          {bothLoaded && stage === 'upload' && (
            <p className="text-center text-sm" style={{ color: '#7C3AED' }}>
              Both PDFs ready — click &ldquo;Compare PDFs →&rdquo; to begin.
            </p>
          )}
        </div>
      </ToolLayout>
    )
  }

  // ── Compare stage workspace ──
  return (
    <ToolLayout sidebar={sidebar} action={action} sidebarHeader={sidebarHeader}>
      <div className="flex flex-col gap-5 h-full min-h-0">
        {/* Page navigation */}
        <div className="flex items-center justify-center gap-4 shrink-0">
          <button
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={!canGoPrev}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              color: canGoPrev ? '#E2E8F0' : '#475569',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>

          <span className="text-sm font-medium tabular-nums" style={{ color: '#94A3B8' }}>
            Page{' '}
            <span style={{ color: '#F1F5F9' }}>{currentPage}</span>
            {' '}of{' '}
            <span style={{ color: '#F1F5F9' }}>{totalPages}</span>
          </span>

          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={!canGoNext}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              color: canGoNext ? '#E2E8F0' : '#475569',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas viewers side-by-side */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Original */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-center shrink-0" style={{ color: '#7C3AED' }}>
              Original · {fileA?.name}
            </p>
            <div
              className="flex-1 rounded-xl overflow-auto flex items-start justify-center p-2"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {currentPage > totalPagesA ? (
                <div
                  className="flex flex-col items-center justify-center gap-2 w-full h-full min-h-[200px] rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', color: '#475569' }}
                >
                  <FileText className="w-8 h-8" />
                  <p className="text-xs">No page {currentPage}</p>
                </div>
              ) : (
                <canvas
                  ref={canvasARef}
                  className="rounded shadow-lg max-w-full h-auto"
                  style={{ display: 'block' }}
                />
              )}
            </div>
          </div>

          {/* Vertical divider */}
          <div
            className="shrink-0 self-stretch"
            style={{ width: '1px', background: 'rgba(255,255,255,0.06)' }}
          />

          {/* Modified */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-center shrink-0" style={{ color: '#7C3AED' }}>
              Modified · {fileB?.name}
            </p>
            <div
              className="flex-1 rounded-xl overflow-auto flex items-start justify-center p-2"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {currentPage > totalPagesB ? (
                <div
                  className="flex flex-col items-center justify-center gap-2 w-full h-full min-h-[200px] rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', color: '#475569' }}
                >
                  <FileText className="w-8 h-8" />
                  <p className="text-xs">No page {currentPage}</p>
                </div>
              ) : (
                <canvas
                  ref={canvasBRef}
                  className="rounded shadow-lg max-w-full h-auto"
                  style={{ display: 'block' }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Text diff section */}
        <div
          className="shrink-0 rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="px-4 py-2 flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
              Page text · page {currentPage}
            </span>
          </div>
          <div className="flex divide-x" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {/* Text A */}
            <div className="flex-1 min-w-0 p-3">
              <p className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#7C3AED' }}>
                Original
              </p>
              <pre
                className="text-xs whitespace-pre-wrap break-words leading-relaxed max-h-32 overflow-y-auto"
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  color: currentPage > totalPagesA ? '#475569' : '#94A3B8',
                }}
              >
                {currentPage > totalPagesA
                  ? '— no page —'
                  : textA || '(no text on this page)'}
              </pre>
            </div>

            <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

            {/* Text B */}
            <div className="flex-1 min-w-0 p-3">
              <p className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#7C3AED' }}>
                Modified
              </p>
              <pre
                className="text-xs whitespace-pre-wrap break-words leading-relaxed max-h-32 overflow-y-auto"
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  color: currentPage > totalPagesB ? '#475569' : '#94A3B8',
                }}
              >
                {currentPage > totalPagesB
                  ? '— no page —'
                  : textB || '(no text on this page)'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
