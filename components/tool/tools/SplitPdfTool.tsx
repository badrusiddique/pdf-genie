'use client'

import { useState, useCallback } from 'react'
import JSZip from 'jszip'
import { LayoutGrid, AlignJustify, Gauge, Plus } from 'lucide-react'
import { ToolLayout, ToolResult, PdfThumbnail, type UploadedFile } from '@/components/tool'
import type { Tool } from '@/config/tools'

type SplitMode = 'ranges' | 'pages' | 'chunks'

interface Range { from: number; to: number }

interface SplitPdfToolProps { tool: Tool }

export function SplitPdfTool({ tool }: SplitPdfToolProps) {
  const [file, setFile] = useState<UploadedFile | null>(null)
  const [mode, setMode] = useState<SplitMode>('ranges')
  const [ranges, setRanges] = useState<Range[]>([{ from: 1, to: 3 }])
  const [mergeRanges, setMergeRanges] = useState(false)
  const [chunkSize, setChunkSize] = useState(2)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)

  const handleSplit = useCallback(async () => {
    if (!file) return
    setStatus('processing')
    setError('')

    try {
      const pdfBytes = new Uint8Array(await file.file.arrayBuffer())
      let results: Uint8Array[]

      if (mode === 'pages') {
        const { splitPdfToPages } = await import('@/lib/pdf/split')
        results = await splitPdfToPages(pdfBytes)
      } else if (mode === 'chunks') {
        const { splitPdfIntoChunks } = await import('@/lib/pdf/split')
        results = await splitPdfIntoChunks(pdfBytes, chunkSize)
      } else {
        const { splitPdfByRanges } = await import('@/lib/pdf/split')
        results = await splitPdfByRanges(pdfBytes, ranges)
      }

      const baseName = file.file.name.replace(/\.pdf$/i, '')
      const zip = new JSZip()
      results.forEach((pdf, i) => zip.file(`${baseName}-part${i + 1}.pdf`, pdf))
      const blob = await zip.generateAsync({ type: 'blob' })
      setDownloadUrl(URL.createObjectURL(blob))
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Split failed')
      setStatus('error')
    }
  }, [file, mode, ranges, chunkSize])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFile(null)
    setDownloadUrl('')
    setStatus('idle')
    setError('')
  }, [downloadUrl])

  const addRange = () => setRanges(r => [...r, { from: 1, to: 1 }])
  const updateRange = (i: number, field: keyof Range, val: number) =>
    setRanges(r => r.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  const removeRange = (i: number) => setRanges(r => r.filter((_, idx) => idx !== i))

  const selectFile = (f: File) => {
    if (f.type !== 'application/pdf') return
    setFile({ file: f, id: `${f.name}-${f.size}-${Date.now()}` })
    setError('')
  }

  // ── Done state ──
  if (status === 'done') {
    const baseName = file?.file.name.replace(/\.pdf$/i, '') ?? 'split'
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ToolResult downloadUrl={downloadUrl} fileName={`${baseName}-split.zip`} onReset={handleReset} />
      </div>
    )
  }

  // ── Sidebar ──
  const modes: { id: SplitMode; label: string; Icon: React.ElementType }[] = [
    { id: 'ranges', label: 'Range', Icon: LayoutGrid },
    { id: 'pages',  label: 'Pages', Icon: AlignJustify },
    { id: 'chunks', label: 'Size',  Icon: Gauge },
  ]

  const sidebar = (
    <div className="space-y-5">
      {/* Mode tabs */}
      <div className="grid grid-cols-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        {modes.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className="flex flex-col items-center gap-1.5 py-3 text-xs font-medium transition-all duration-150"
            style={{
              background: mode === id ? 'rgba(124,58,237,0.2)' : 'transparent',
              color: mode === id ? '#A78BFA' : '#64748B',
              borderRight: id !== 'chunks' ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </div>

      {/* Range options */}
      {mode === 'ranges' && (
        <div className="space-y-3">
          {ranges.map((range, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>Range {i + 1}</span>
                {ranges.length > 1 && (
                  <button onClick={() => removeRange(i)} className="text-xs" style={{ color: '#EF4444' }}>Remove</button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] mb-1 block" style={{ color: '#64748B' }}>from page</label>
                  <input
                    type="number"
                    min={1}
                    value={range.from}
                    onChange={e => updateRange(i, 'from', Math.max(1, Number(e.target.value)))}
                    className="w-full px-2 py-1.5 text-sm rounded-lg"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: '#F1F5F9',
                      outline: 'none',
                    }}
                  />
                </div>
                <span className="text-xs mt-4" style={{ color: '#475569' }}>to</span>
                <div className="flex-1">
                  <label className="text-[10px] mb-1 block" style={{ color: '#64748B' }}>to page</label>
                  <input
                    type="number"
                    min={range.from}
                    value={range.to}
                    onChange={e => updateRange(i, 'to', Math.max(range.from, Number(e.target.value)))}
                    className="w-full px-2 py-1.5 text-sm rounded-lg"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: '#F1F5F9',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addRange}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              border: '1px dashed rgba(124,58,237,0.4)',
              color: '#A78BFA',
              background: 'transparent',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Range
          </button>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mergeRanges}
              onChange={e => setMergeRanges(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: '#7C3AED' }}
            />
            <span className="text-xs" style={{ color: '#94A3B8' }}>Merge all ranges in one PDF file.</span>
          </label>
        </div>
      )}

      {/* Pages mode */}
      {mode === 'pages' && (
        <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
          Every page will be extracted as a separate PDF file, packaged in a ZIP archive.
        </p>
      )}

      {/* Chunks mode */}
      {mode === 'chunks' && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: '#94A3B8' }}>Pages per chunk</label>
          <input
            type="number"
            min={1}
            value={chunkSize}
            onChange={e => setChunkSize(Math.max(1, Number(e.target.value)))}
            className="w-full px-3 py-2 text-sm rounded-lg"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#F1F5F9',
              outline: 'none',
            }}
          />
          <p className="text-xs" style={{ color: '#475569' }}>The PDF will be split into equal chunks of this size.</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p role="alert" className="text-xs px-3 py-2 rounded-lg" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </p>
      )}

      {/* Processing */}
      {status === 'processing' && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
          <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin shrink-0" />
          Splitting PDF…
        </div>
      )}
    </div>
  )

  const action = (
    <button
      onClick={handleSplit}
      disabled={!file || status === 'processing'}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: file ? 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: file ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
      }}
    >
      <span>Split PDF</span>
      <span className="text-lg">→</span>
    </button>
  )

  const sidebarHeader = (
    <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>
      Split
    </h2>
  )

  return (
    <ToolLayout sidebar={sidebar} action={action} sidebarHeader={sidebarHeader}>
      {!file ? (
        // Drop zone
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a PDF to split"
          className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
          style={{
            minHeight: '360px',
            background: over ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
            border: `2px dashed ${over ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.10)'}`,
          }}
          onDragOver={e => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={e => {
            e.preventDefault()
            setOver(false)
            const f = e.dataTransfer.files[0]
            if (f) selectFile(f)
          }}
          onClick={() => {
            const inp = document.createElement('input')
            inp.type = 'file'; inp.accept = 'application/pdf'
            inp.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0]
              if (f) selectFile(f)
            }
            inp.click()
          }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') (e.currentTarget as HTMLElement).click() }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: over ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)' }}
          >
            <LayoutGrid className="w-8 h-8" style={{ color: over ? '#A78BFA' : '#475569' }} />
          </div>
          <div className="text-center">
            <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>
              {over ? 'Drop PDF here' : 'Select a PDF to split'}
            </p>
            <p className="text-sm" style={{ color: '#475569' }}>
              Drop a file here or click to browse · up to {tool.maxSizeMB} MB
            </p>
          </div>
        </div>
      ) : (
        // File loaded — show thumbnail
        <div className="h-full flex flex-col gap-5">
          <div
            className="flex items-start gap-5 p-5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <PdfThumbnail file={file.file} width={120} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium mb-1 truncate" style={{ color: '#F1F5F9' }}>
                {file.file.name}
              </p>
              <p className="text-sm mb-3" style={{ color: '#64748B' }}>
                {(file.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button
                onClick={handleReset}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                Remove file
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  )
}
