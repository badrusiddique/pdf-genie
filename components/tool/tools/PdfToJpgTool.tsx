'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { FileImage } from 'lucide-react'
import { ToolLayout, ToolResult } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'

type Quality = 'normal' | 'high'

// ── Drop zone ─────────────────────────────────────────────────────
function DropZone({ tool, onFile }: { tool: Tool; onFile: (f: File) => void }) {
  const [over, setOver] = useState(false)
  const inputId = 'pdf-to-jpg-file-input'

  const accept = (files: FileList | null) => {
    const pdf = Array.from(files ?? []).find(f => f.type === 'application/pdf')
    if (pdf) onFile(pdf)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload a PDF to convert to JPG images"
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
        <FileImage className="w-8 h-8" style={{ color: over ? '#22D3EE' : '#475569' }} />
      </div>
      <div className="text-center">
        <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>
          {over ? 'Drop PDF here' : 'Select a PDF to convert'}
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

// ── Main component ─────────────────────────────────────────────────
interface PdfToJpgToolProps { tool: Tool }

export function PdfToJpgTool({ tool }: PdfToJpgToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [quality, setQuality] = useState<Quality>('high')
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [downloadName, setDownloadName] = useState('')
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    return () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl) }
  }, [downloadUrl])

  const baseName = file ? file.name.replace(/\.pdf$/i, '') : 'document'
  const zipName = `${baseName}_pages.zip`

  const handleConvert = useCallback(async () => {
    if (!file) return
    setStatus('processing')
    setError('')
    setProgress('Loading PDF…')

    try {
      // Read file bytes
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      // Dynamic import of pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = ''

      const doc = await pdfjsLib.getDocument({
        data: bytes,
        useWorkerFetch: false,
        isEvalSupported: false,
      }).promise

      const totalPages = doc.numPages
      const scale = quality === 'high' ? 3.0 : 2.0
      const jpegQuality = quality === 'high' ? 0.92 : 0.75

      const blobs: Blob[] = []

      for (let i = 1; i <= totalPages; i++) {
        setProgress(`Rendering page ${i} of ${totalPages}…`)

        const page = await doc.getPage(i)
        const viewport = page.getViewport({ scale })

        // Use hidden canvas in DOM (OffscreenCanvas not universally supported in Safari)
        const canvas = canvasRef.current ?? document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height

        const renderContext = { canvas, viewport }
        await page.render(renderContext).promise

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            b => { if (b) resolve(b); else reject(new Error(`Failed to extract page ${i} as JPEG`)) },
            'image/jpeg',
            jpegQuality,
          )
        })

        blobs.push(blob)
        page.cleanup()
      }

      doc.destroy()

      if (blobs.length === 1) {
        // Single page: download directly as JPG
        const url = URL.createObjectURL(blobs[0])
        const name = `${baseName}_page_1.jpg`
        setDownloadUrl(url)
        setDownloadName(name)
      } else {
        // Multiple pages: bundle into ZIP
        setProgress('Packaging ZIP…')
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()
        blobs.forEach((blob, idx) => {
          zip.file(`page_${idx + 1}.jpg`, blob)
        })
        const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })
        const zipBlob = new Blob([zipBuffer], { type: 'application/zip' })
        const url = URL.createObjectURL(zipBlob)
        setDownloadUrl(url)
        setDownloadName(zipName)
      }

      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
      setStatus('error')
    }
  }, [file, quality, baseName, zipName])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFile(null)
    setDownloadUrl('')
    setDownloadName('')
    setProgress('')
    setStatus('idle')
    setError('')
  }, [downloadUrl])

  // ── Done state ──
  if (status === 'done' && downloadUrl && downloadName) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ToolResult downloadUrl={downloadUrl} fileName={downloadName} onReset={handleReset} />
      </div>
    )
  }

  // ── Sidebar ──
  const sidebar = (
    <div className="space-y-5">
      {/* Quality selector */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
          Image quality
        </p>
        <div className="space-y-1.5">
          {([
            { value: 'normal' as Quality, label: 'Normal', hint: '2× scale · smaller files' },
            { value: 'high' as Quality, label: 'High', hint: '3× scale · sharper images' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setQuality(opt.value)}
              className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150"
              style={{
                background: quality === opt.value ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${quality === opt.value ? 'rgba(6,182,212,0.40)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <div
                className="mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center"
                style={{ borderColor: quality === opt.value ? '#06B6D4' : '#334155' }}
              >
                {quality === opt.value && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#06B6D4' }} />
                )}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: quality === opt.value ? '#F1F5F9' : '#94A3B8' }}>
                  {opt.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{opt.hint}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Output preview */}
      {file && (
        <div
          className="px-3 py-2.5 rounded-lg text-xs"
          style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)' }}
        >
          <p className="font-medium mb-0.5" style={{ color: '#22D3EE' }}>Output</p>
          <p style={{ color: '#94A3B8' }}>{zipName}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </p>
      )}

      {/* Processing progress */}
      {status === 'processing' && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
          <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin shrink-0" />
          <span>{progress}</span>
        </div>
      )}
    </div>
  )

  // ── Action button ──
  const action = (
    <button
      onClick={handleConvert}
      disabled={!file || status === 'processing'}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: file ? 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: file ? '0 4px 20px rgba(6,182,212,0.35)' : 'none',
      }}
    >
      <span>Convert to JPG</span>
      <span className="text-lg">→</span>
    </button>
  )

  // ── Sidebar header ──
  const sidebarHeader = (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>
        PDF to JPG
      </h2>
    </div>
  )

  return (
    <ToolLayout sidebar={sidebar} action={action} sidebarHeader={sidebarHeader}>
      {/* Hidden canvas used for rendering PDF pages */}
      <canvas ref={canvasRef} className="sr-only" aria-hidden />

      {!file ? (
        <DropZone tool={tool} onFile={setFile} />
      ) : (
        <div className="flex flex-col items-center gap-5 pt-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)' }}
          >
            <FileImage className="w-8 h-8" style={{ color: '#22D3EE' }} />
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
