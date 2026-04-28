'use client'

import { useState, useCallback } from 'react'
import { Wrench, AlertTriangle } from 'lucide-react'
import { ToolLayout, ToolResult, PdfThumbnail } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'

export function RepairPdfTool({ tool }: { tool: Tool }) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)

  const handleRepair = useCallback(async () => {
    if (!file) return
    setStatus('processing')
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/v1/process/repair-pdf', { method: 'POST', body: formData })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error?.message ?? `Error ${res.status}`)
      }
      const blob = await res.blob()
      setDownloadUrl(URL.createObjectURL(blob))
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repair failed')
      setStatus('error')
    }
  }, [file])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFile(null); setDownloadUrl(''); setStatus('idle'); setError('')
  }, [downloadUrl])

  if (status === 'done' && downloadUrl) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ToolResult
          downloadUrl={downloadUrl}
          fileName={file ? `${file.name.replace(/\.pdf$/i, '')}_repaired.pdf` : 'repaired.pdf'}
          onReset={handleReset}
        />
      </div>
    )
  }

  const sidebar = (
    <div className="space-y-4">
      <div className="flex gap-2.5 p-3 rounded-lg text-xs leading-relaxed"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#94A3B8' }}>
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
        <span>Re-serialises the PDF structure. Works on minor corruption. Severely damaged files may not recover.</span>
      </div>
      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>{error}</p>
      )}
      {status === 'processing' && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
          <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          Repairing…
        </div>
      )}
    </div>
  )

  const action = (
    <button onClick={handleRepair} disabled={!file || status === 'processing'}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: file ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'rgba(255,255,255,0.05)',
        color: '#ffffff', boxShadow: file ? '0 4px 20px rgba(245,158,11,0.35)' : 'none',
      }}>
      <span>Repair PDF</span><span className="text-lg">→</span>
    </button>
  )

  return (
    <ToolLayout sidebar={sidebar} action={action}
      sidebarHeader={<h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>Repair PDF</h2>}>
      {!file ? (
        <div role="button" tabIndex={0} aria-label="Upload PDF to repair"
          className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
          style={{ minHeight: '360px', background: over ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)', border: `2px dashed ${over ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.10)'}` }}
          onDragOver={e => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
          onClick={() => document.getElementById('repair-input')?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('repair-input')?.click() }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: over ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)' }}>
            <Wrench className="w-8 h-8" style={{ color: over ? '#F59E0B' : '#475569' }} />
          </div>
          <div className="text-center">
            <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>Select a damaged PDF to repair</p>
            <p className="text-sm" style={{ color: '#475569' }}>Drop here or click · up to {tool.maxSizeMB} MB</p>
          </div>
          <input id="repair-input" type="file" accept="application/pdf" className="sr-only"
            onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 pt-4">
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
            <PdfThumbnail file={file} width={220} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{file.name}</p>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>{formatFileSize(file.size)}</p>
          </div>
          <button onClick={() => setFile(null)} className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Change file
          </button>
        </div>
      )}
    </ToolLayout>
  )
}
