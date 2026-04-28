'use client'

import { useState, useCallback, useRef } from 'react'
import { ScanText, Info, ChevronDown } from 'lucide-react'
import { ToolLayout, ToolResult, PdfThumbnail } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'

// ── Language options ──────────────────────────────────────────────
const LANGUAGES = [
  { code: 'eng', label: 'English' },
  { code: 'ara', label: 'Arabic' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'spa', label: 'Spanish' },
  { code: 'ita', label: 'Italian' },
  { code: 'por', label: 'Portuguese' },
  { code: 'rus', label: 'Russian' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
  { code: 'jpn', label: 'Japanese' },
]

// ── Drop zone ─────────────────────────────────────────────────────
function DropZone({ tool, onFile }: { tool: Tool; onFile: (f: File) => void }) {
  const [over, setOver] = useState(false)
  const inputId = 'ocr-pdf-file-input'

  const accept = (files: FileList | null) => {
    const pdf = Array.from(files ?? []).find(f => f.type === 'application/pdf')
    if (pdf) onFile(pdf)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload a scanned PDF to make searchable"
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
        <ScanText className="w-8 h-8" style={{ color: over ? '#22D3EE' : '#475569' }} />
      </div>
      <div className="text-center">
        <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>
          {over ? 'Drop PDF here' : 'Select a scanned PDF'}
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
interface OcrPdfToolProps { tool: Tool }

export function OcrPdfTool({ tool }: OcrPdfToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState('eng')
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState('')

  // Per-page progress state
  const [stagLabel, setStagLabel] = useState('')
  const [pageProgress, setPageProgress] = useState(0)  // 0-100 overall
  const [ocrProgress, setOcrProgress] = useState(0)    // 0-100 per page OCR

  // Hidden canvas used for pdfjs rendering (reused each page)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Store output filename separately so it survives reset
  const outputNameRef = useRef('')

  const handleOcr = useCallback(async () => {
    if (!file) return
    setStatus('processing')
    setError('')
    setPageProgress(0)
    setOcrProgress(0)
    setStagLabel('Initialising…')

    try {
      // ── Step 1: load pdfjs ──────────────────────────────────────
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = ''

      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useWorkerFetch: false,
        isEvalSupported: false,
      }).promise

      const totalPages = pdfDoc.numPages

      // ── Step 2: load pdf-lib + font ─────────────────────────────
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
      const newDoc = await PDFDocument.create()
      const font = await newDoc.embedFont(StandardFonts.Helvetica)

      // ── Step 3: process each page ───────────────────────────────
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        // --- Render page to canvas ---
        setStagLabel(`Rendering page ${pageNum} of ${totalPages}…`)
        setPageProgress(Math.round(((pageNum - 1) / totalPages) * 90))
        setOcrProgress(0)

        const page = await pdfDoc.getPage(pageNum)
        const viewport = page.getViewport({ scale: 2 })
        const viewportWidth = viewport.width
        const viewportHeight = viewport.height

        const canvas = canvasRef.current
        if (!canvas) throw new Error('Canvas not available')
        canvas.width = viewportWidth
        canvas.height = viewportHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Cannot get 2D context')

        // White background so scan looks clean on the new page
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, viewportWidth, viewportHeight)

        await page.render({ canvasContext: ctx, viewport, canvas }).promise

        // --- Run OCR ---
        setStagLabel(`Running OCR on page ${pageNum}…`)
        setOcrProgress(0)

        const { createWorker } = await import('tesseract.js')
        const worker = await createWorker(language, 1, {
          logger: (m: { progress?: number }) => {
            if (typeof m.progress === 'number') {
              setOcrProgress(Math.round(m.progress * 100))
            }
          },
        })

        const { data } = await worker.recognize(canvas)
        await worker.terminate()
        setOcrProgress(100)

        // --- Build page in new PDF ---
        setStagLabel(`Building searchable PDF…`)

        // Convert canvas image to PNG bytes
        const imageBlob: Blob = await new Promise((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas.toBlob returned null')), 'image/png')
        })
        const imageArrayBuffer = await imageBlob.arrayBuffer()
        const embeddedImg = await newDoc.embedPng(new Uint8Array(imageArrayBuffer))

        // Add page at original rendered dimensions
        const newPage = newDoc.addPage([viewportWidth, viewportHeight])

        // Draw the page image as background
        newPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: viewportWidth,
          height: viewportHeight,
        })

        // Draw invisible word-level text overlay (makes PDF searchable / selectable)
        // Cast through unknown to avoid strict lib type mismatch with tesseract.js types
        const words = (data as unknown as {
          words: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }>
        }).words

        for (const word of words) {
          if (!word.text.trim()) continue
          const wordHeight = word.bbox.y1 - word.bbox.y0
          if (wordHeight <= 0) continue
          try {
            // pdf-lib y-axis is bottom-up; pdfjs/Tesseract is top-down
            newPage.drawText(word.text, {
              x: word.bbox.x0,
              y: viewportHeight - word.bbox.y1,
              size: wordHeight,
              font,
              color: rgb(1, 1, 1),
              opacity: 0.002,
            })
          } catch {
            // Skip words that cannot be rendered (e.g. unsupported glyphs)
          }
        }
      }

      setStagLabel('Done!')
      setPageProgress(100)
      setOcrProgress(100)

      // ── Step 4: serialise and offer download ────────────────────
      const pdfBytes = await newDoc.save()
      // Use ArrayBuffer to avoid Uint8Array<ArrayBufferLike> BlobPart type mismatch
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      outputNameRef.current = file.name.replace(/\.pdf$/i, '') + '_searchable.pdf'
      setDownloadUrl(url)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR processing failed')
      setStatus('error')
      setPageProgress(0)
      setOcrProgress(0)
    }
  }, [file, language])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFile(null)
    setDownloadUrl('')
    setStatus('idle')
    setError('')
    setPageProgress(0)
    setOcrProgress(0)
    setStagLabel('')
  }, [downloadUrl])

  // ── Sidebar ────────────────────────────────────────────────────
  const sidebar = (
    <div className="space-y-5">
      {/* Language selector */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
          Language
        </p>
        <div className="relative">
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            disabled={status === 'processing'}
            className="w-full appearance-none px-3 py-2.5 pr-8 rounded-lg text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#E2E8F0',
            }}
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code} style={{ background: '#0F172A' }}>
                {lang.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: '#475569' }}
          />
        </div>
      </div>

      {/* Info note */}
      <div
        className="flex gap-2.5 p-3 rounded-lg text-xs leading-relaxed"
        style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)' }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#22D3EE' }} />
        <span style={{ color: '#94A3B8' }}>
          Works best on scanned / image PDFs. Tesseract model downloads on first use (~4 MB per language).
        </span>
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </p>
      )}

      {/* Reset after done */}
      {status === 'done' && (
        <button
          onClick={handleReset}
          className="w-full py-2 text-xs rounded-lg transition-colors"
          style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          Process another PDF
        </button>
      )}
    </div>
  )

  // ── Action button ──────────────────────────────────────────────
  const action = (
    <button
      onClick={handleOcr}
      disabled={!file || status === 'processing' || status === 'done'}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: file && status === 'idle' ? 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: file && status === 'idle' ? '0 4px 20px rgba(6,182,212,0.35)' : 'none',
      }}
    >
      <span>Make Searchable</span>
      <span className="text-lg">→</span>
    </button>
  )

  // ── Sidebar header ─────────────────────────────────────────────
  const sidebarHeader = (
    <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>
      OCR PDF
    </h2>
  )

  // ── Done state ─────────────────────────────────────────────────
  if (status === 'done' && downloadUrl) {
    return (
      <ToolLayout sidebar={sidebar} action={action} sidebarHeader={sidebarHeader}>
        <div className="max-w-xl mx-auto px-6 py-12">
          <ToolResult
            downloadUrl={downloadUrl}
            fileName={outputNameRef.current}
            onReset={handleReset}
          />
        </div>
      </ToolLayout>
    )
  }

  return (
    <>
      {/* Hidden canvas for pdfjs rendering — reused per page */}
      <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden />

      <ToolLayout sidebar={sidebar} action={action} sidebarHeader={sidebarHeader}>
        {status === 'processing' ? (
          /* ── Progress view ───────────────────────────────────── */
          <div className="flex flex-col items-center justify-center gap-8" style={{ minHeight: '360px' }}>
            {/* Animated icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)' }}
            >
              <ScanText className="w-8 h-8 animate-pulse" style={{ color: '#06B6D4' }} />
            </div>

            {/* Stage label */}
            <div className="text-center">
              <p className="text-sm font-medium mb-1" style={{ color: '#E2E8F0' }}>{stagLabel}</p>
              <p className="text-xs" style={{ color: '#475569' }}>Please keep this tab open</p>
            </div>

            {/* Overall progress bar */}
            <div className="w-full max-w-sm space-y-4">
              {/* Overall */}
              <div>
                <div className="flex justify-between text-xs mb-1.5" style={{ color: '#475569' }}>
                  <span>Overall</span>
                  <span>{pageProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pageProgress}%`,
                      background: 'linear-gradient(90deg, #06B6D4, #0891B2)',
                      boxShadow: '0 0 8px rgba(6,182,212,0.6)',
                    }}
                  />
                </div>
              </div>

              {/* Per-page OCR sub-progress */}
              <div>
                <div className="flex justify-between text-xs mb-1.5" style={{ color: '#475569' }}>
                  <span>OCR</span>
                  <span>{ocrProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${ocrProgress}%`,
                      background: 'linear-gradient(90deg, #22D3EE, #06B6D4)',
                    }}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs" style={{ color: '#334155' }}>
              Multi-page documents may take a while — Tesseract runs page-by-page in the browser
            </p>
          </div>

        ) : !file ? (
          /* ── Dropzone ─────────────────────────────────────────── */
          <DropZone tool={tool} onFile={setFile} />

        ) : (
          /* ── File selected ────────────────────────────────────── */
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
    </>
  )
}
