'use client'

import { useState, useCallback, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { ToolLayout, ToolResult } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'

interface HtmlToPdfToolProps { tool: Tool }

export function HtmlToPdfTool({ tool: _tool }: HtmlToPdfToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    return () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl) }
  }, [downloadUrl])

  const handleConvert = useCallback(async () => {
    if (!file) return
    setStatus('processing')
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/v1/process/html-to-pdf', { method: 'POST', body: formData })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error?.message ?? `Server error ${res.status}`)
      }
      const blob = await res.blob()
      setDownloadUrl(URL.createObjectURL(blob))
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
      setStatus('error')
    }
  }, [file])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFile(null)
    setDownloadUrl('')
    setStatus('idle')
    setError('')
  }, [downloadUrl])

  if (status === 'done') {
    const filename = file ? `${file.name.replace(/\.html?$/i, '')}.pdf` : 'converted.pdf'
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ToolResult downloadUrl={downloadUrl} fileName={filename} onReset={handleReset} />
      </div>
    )
  }

  const sidebar = (
    <div className="space-y-4">
      <div className="p-3 rounded-lg text-xs leading-relaxed"
        style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)', color: '#94A3B8' }}>
        Upload an HTML file. External CSS and images referenced by absolute URL will be included. Local asset paths will not resolve.
      </div>
      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>{error}</p>
      )}
      {status === 'processing' && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
          <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin shrink-0" />
          Rendering HTML to PDF…
        </div>
      )}
    </div>
  )

  const action = (
    <button onClick={handleConvert} disabled={!file || status === 'processing'}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: file ? 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: file ? '0 4px 20px rgba(6,182,212,0.35)' : 'none',
      }}
    >
      <span>Convert to PDF</span>
      <span className="text-lg">→</span>
    </button>
  )

  return (
    <ToolLayout
      sidebar={sidebar}
      action={action}
      sidebarHeader={<h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>HTML to PDF</h2>}
    >
      {!file ? (
        <div
          role="button" tabIndex={0} aria-label="Upload HTML file"
          className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
          style={{ minHeight: '360px', background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.10)' }}
          onClick={() => document.getElementById('html-input')?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('html-input')?.click() }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Globe className="w-8 h-8" style={{ color: '#475569' }} />
          </div>
          <div className="text-center">
            <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>Select an HTML file</p>
            <p className="text-sm" style={{ color: '#475569' }}>Drop here or click to browse · up to 5 MB</p>
          </div>
          <input id="html-input" type="file" accept=".html,.htm,text/html" className="sr-only"
            onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 pt-8">
          <Globe className="w-16 h-16" style={{ color: '#06B6D4' }} />
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{file.name}</p>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>{formatFileSize(file.size)}</p>
          </div>
          <button onClick={() => setFile(null)} className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Change file
          </button>
        </div>
      )}
    </ToolLayout>
  )
}
