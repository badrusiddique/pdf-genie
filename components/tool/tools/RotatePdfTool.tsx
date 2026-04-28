'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import JSZip from 'jszip'
import { RotateCw, X, Info, Plus } from 'lucide-react'
import { ToolLayout, ToolResult, PdfThumbnail } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'
import type { RotateAngle } from '@/lib/pdf/rotatePdf'

// ── Angle options ─────────────────────────────────────────────────
const ANGLES: { value: RotateAngle; label: string; hint: string }[] = [
  { value: 90,  label: '90° clockwise',  hint: 'Rotate right once' },
  { value: 180, label: '180°',            hint: 'Flip upside-down' },
  { value: 270, label: '270° clockwise', hint: 'Rotate right three times (or left once)' },
]

// ── Unique ID helper (stable per file) ───────────────────────────
function fileId(f: File): string {
  return `${f.name}-${f.size}-${f.lastModified}`
}

interface FileEntry {
  id: string
  file: File
}

// ── Drop zone (empty state) ───────────────────────────────────────
function EmptyDropZone({
  tool,
  onFiles,
}: {
  tool: Tool
  onFiles: (files: File[]) => void
}) {
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const accept = (list: FileList | null) => {
    const pdfs = Array.from(list ?? []).filter(f => f.type === 'application/pdf')
    if (pdfs.length) onFiles(pdfs)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload PDF files to rotate"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
      style={{
        minHeight: '360px',
        background: over ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
        border: `2px dashed ${over ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.10)'}`,
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
        <RotateCw className="w-8 h-8" style={{ color: over ? '#A78BFA' : '#475569' }} />
      </div>
      <div className="text-center">
        <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>
          {over ? 'Drop PDFs here' : 'Select PDFs to rotate'}
        </p>
        <p className="text-sm" style={{ color: '#475569' }}>
          Drop files here or click to browse · up to {tool.maxFiles} files · {tool.maxSizeMB} MB each
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="sr-only"
        onChange={e => accept(e.target.files)}
      />
    </div>
  )
}

// ── Single file row ───────────────────────────────────────────────
function FileRow({
  entry,
  onRemove,
  disabled,
}: {
  entry: FileEntry
  onRemove: (id: string) => void
  disabled: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Thumbnail */}
      <div
        className="shrink-0 rounded-lg overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <PdfThumbnail file={entry.file} width={48} />
      </div>

      {/* Name + size */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: '#E2E8F0' }}
          title={entry.file.name}
        >
          {entry.file.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
          {formatFileSize(entry.file.size)}
        </p>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(entry.id)}
        disabled={disabled}
        aria-label={`Remove ${entry.file.name}`}
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
        style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.18)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)' }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
interface RotatePdfToolProps { tool: Tool }

export function RotatePdfTool({ tool }: RotatePdfToolProps) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [angle, setAngle] = useState<RotateAngle>(90)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [outputFileName, setOutputFileName] = useState('rotated.pdf')
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  const addFiles = useCallback((incoming: File[]) => {
    setFiles(prev => {
      const existingIds = new Set(prev.map(e => e.id))
      const novel = incoming
        .filter(f => f.type === 'application/pdf')
        .filter(f => !existingIds.has(fileId(f)))
        .slice(0, tool.maxFiles - prev.length)
      return [...prev, ...novel.map(f => ({ id: fileId(f), file: f }))]
    })
    setError('')
  }, [tool.maxFiles])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(e => e.id !== id))
  }, [])

  const handleRotate = useCallback(async () => {
    if (files.length === 0) return
    const ac = new AbortController()
    abortRef.current = ac
    setStatus('processing')
    setError('')

    try {
      const { rotatePdf } = await import('@/lib/pdf/rotatePdf')

      // Read all files in parallel
      const buffers = await Promise.all(
        files.map(e => e.file.arrayBuffer().then(b => new Uint8Array(b)))
      )
      if (ac.signal.aborted) return

      // Process each file
      const results = await Promise.all(
        buffers.map((bytes, i) => {
          if (ac.signal.aborted) throw new DOMException('Aborted', 'AbortError')
          return rotatePdf(bytes, angle).then(out => ({ out, name: files[i].file.name }))
        })
      )
      if (ac.signal.aborted) return

      let blob: Blob
      let fileName: string

      if (results.length === 1) {
        // Single file — download as PDF
        const baseName = results[0].name.replace(/\.pdf$/i, '')
        fileName = `${baseName}_rotated.pdf`
        blob = new Blob([results[0].out.buffer as ArrayBuffer], { type: 'application/pdf' })
      } else {
        // Multiple files — bundle into ZIP
        const zip = new JSZip()
        for (const { out, name } of results) {
          const baseName = name.replace(/\.pdf$/i, '')
          zip.file(`${baseName}_rotated.pdf`, out)
        }
        blob = await zip.generateAsync({ type: 'blob' })
        fileName = 'rotated_pdfs.zip'
      }

      setOutputFileName(fileName)
      setDownloadUrl(URL.createObjectURL(blob))
      setStatus('done')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Rotation failed')
        setStatus('error')
      } else {
        setStatus('idle')
      }
    }
  }, [files, angle])

  const handleReset = useCallback(() => {
    abortRef.current?.abort()
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFiles([])
    setDownloadUrl('')
    setOutputFileName('rotated.pdf')
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

  // ── Sidebar: angle selector ──
  const sidebar = (
    <div className="space-y-5">
      {/* Angle selector */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>
          Rotation angle
        </p>
        <div className="space-y-2">
          {ANGLES.map(opt => (
            <button
              key={opt.value}
              onClick={() => setAngle(opt.value)}
              className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150"
              style={{
                background: angle === opt.value ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${angle === opt.value ? 'rgba(124,58,237,0.40)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {/* Custom radio indicator */}
              <div
                className="mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center"
                style={{ borderColor: angle === opt.value ? '#7C3AED' : '#334155' }}
              >
                {angle === opt.value && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7C3AED' }} />
                )}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: angle === opt.value ? '#F1F5F9' : '#94A3B8' }}>
                  {opt.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{opt.hint}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Info tip */}
      <div
        className="flex gap-2.5 p-3 rounded-lg text-xs leading-relaxed"
        style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#A78BFA' }} />
        <span style={{ color: '#94A3B8' }}>
          {files.length > 1
            ? `All ${files.length} PDFs will be rotated by the same angle and packaged in a ZIP archive.`
            : 'All pages in the PDF will be rotated by the selected angle.'}
        </span>
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </p>
      )}

      {/* Processing indicator + cancel */}
      {status === 'processing' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
            <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin shrink-0" />
            Rotating {files.length === 1 ? 'PDF' : `${files.length} PDFs`}…
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
  const hasFiles = files.length > 0
  const action = (
    <button
      onClick={handleRotate}
      disabled={!hasFiles || status === 'processing'}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: hasFiles ? 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: hasFiles ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
      }}
    >
      <span>Rotate PDF</span>
      <span className="text-lg">→</span>
    </button>
  )

  // ── Sidebar header ──
  const sidebarHeader = (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>
        Rotate PDF
      </h2>
      {files.length > 0 && (
        <span
          className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
          style={{ background: '#7C3AED', color: '#fff' }}
        >
          {files.length}
        </span>
      )}
    </div>
  )

  return (
    <ToolLayout sidebar={sidebar} action={action} sidebarHeader={sidebarHeader}>
      {files.length === 0 ? (
        <EmptyDropZone tool={tool} onFiles={addFiles} />
      ) : (
        <div className="space-y-3">
          {/* File list */}
          <div className="space-y-2">
            {files.map(entry => (
              <FileRow
                key={entry.id}
                entry={entry}
                onRemove={removeFile}
                disabled={status === 'processing'}
              />
            ))}
          </div>

          {/* Add more files button */}
          {files.length < tool.maxFiles && (
            <>
              <button
                onClick={() => addInputRef.current?.click()}
                disabled={status === 'processing'}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 disabled:opacity-50"
                style={{
                  background: 'rgba(124,58,237,0.06)',
                  border: '2px dashed rgba(124,58,237,0.30)',
                  color: '#A78BFA',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget
                  el.style.background = 'rgba(124,58,237,0.12)'
                  el.style.borderColor = 'rgba(124,58,237,0.60)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  el.style.background = 'rgba(124,58,237,0.06)'
                  el.style.borderColor = 'rgba(124,58,237,0.30)'
                }}
              >
                <Plus className="w-4 h-4 shrink-0" />
                Add more PDFs
                <span className="ml-auto text-xs" style={{ color: '#475569' }}>
                  {files.length} / {tool.maxFiles}
                </span>
              </button>
              <input
                ref={addInputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="sr-only"
                onChange={e => {
                  addFiles(Array.from(e.target.files ?? []))
                  // Reset input so the same file can be re-selected after removal
                  e.target.value = ''
                }}
              />
            </>
          )}
        </div>
      )}
    </ToolLayout>
  )
}
