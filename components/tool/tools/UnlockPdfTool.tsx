'use client'

import { useState, useCallback } from 'react'
import { Unlock, Info } from 'lucide-react'
import { ToolLayout, ToolResult, PdfThumbnail } from '@/components/tool'
import { unlockPdf } from '@/lib/pdf/unlockPdf'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'

export function UnlockPdfTool({ tool }: { tool: Tool }) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)

  const handleUnlock = useCallback(async () => {
    if (!file) return
    setStatus('processing')
    setError('')
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const result = await unlockPdf(bytes)
      const blob = new Blob([result as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
      setDownloadUrl(URL.createObjectURL(blob))
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unlock failed')
      setStatus('error')
    }
  }, [file])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFile(null); setDownloadUrl(''); setStatus('idle'); setError('')
  }, [downloadUrl])

  const outputFileName = file
    ? `${file.name.replace(/\.pdf$/i, '')}_unlocked.pdf`
    : 'unlocked.pdf'

  if (status === 'done' && downloadUrl) {
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

  const sidebar = (
    <div className="space-y-4">
      <div
        className="flex gap-2.5 p-3 rounded-lg text-xs leading-relaxed"
        style={{
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.15)',
          color: '#94A3B8',
        }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#10B981' }} />
        <span>
          Removes user/owner password restrictions. Owner password allows unlocking without the password.
        </span>
      </div>
      {error && (
        <p
          role="alert"
          className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}
        >
          {error}
        </p>
      )}
      {status === 'processing' && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
          <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          Unlocking…
        </div>
      )}
    </div>
  )

  const action = (
    <button
      onClick={handleUnlock}
      disabled={!file || status === 'processing'}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: file
          ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
          : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: file ? '0 4px 20px rgba(16,185,129,0.35)' : 'none',
      }}
    >
      <span>Unlock PDF →</span>
    </button>
  )

  return (
    <ToolLayout
      sidebar={sidebar}
      action={action}
      sidebarHeader={
        <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>
          Unlock PDF
        </h2>
      }
    >
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload PDF to unlock"
          className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
          style={{
            minHeight: '360px',
            background: over ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
            border: `2px dashed ${over ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.10)'}`,
          }}
          onDragOver={e => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={e => {
            e.preventDefault()
            setOver(false)
            const f = e.dataTransfer.files[0]
            if (f) setFile(f)
          }}
          onClick={() => document.getElementById('unlock-input')?.click()}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') document.getElementById('unlock-input')?.click()
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: over ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)' }}
          >
            <Unlock className="w-8 h-8" style={{ color: over ? '#10B981' : '#475569' }} />
          </div>
          <div className="text-center">
            <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>
              Select a locked PDF to unlock
            </p>
            <p className="text-sm" style={{ color: '#475569' }}>
              Drop here or click · up to {tool.maxSizeMB} MB
            </p>
          </div>
          <input
            id="unlock-input"
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) setFile(f)
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 pt-4">
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <PdfThumbnail file={file} width={220} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{file.name}</p>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>{formatFileSize(file.size)}</p>
          </div>
          <button
            onClick={() => setFile(null)}
            className="text-xs px-3 py-1.5 rounded-lg"
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
    </ToolLayout>
  )
}
