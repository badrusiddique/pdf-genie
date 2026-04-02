'use client'

import { useState, useCallback, useEffect } from 'react'
import { ToolDropzone, ToolResult, type UploadedFile } from '@/components/tool'
import { Button } from '@/components/ui'
import type { Tool } from '@/config/tools'

interface ExtractPagesToolProps { tool: Tool }

export function ExtractPagesTool({ tool }: ExtractPagesToolProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [pageInput, setPageInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  const handleExtract = useCallback(async () => {
    if (!files[0] || !pageInput.trim()) return
    setStatus('processing')
    setError('')

    try {
      const pageNumbers = pageInput
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n) && n > 0)

      if (pageNumbers.length === 0) {
        setError('Enter at least one valid page number')
        setStatus('error')
        return
      }

      const { extractPagesFromPdf } = await import('@/lib/pdf/extractPages')
      const pdfBytes = new Uint8Array(await files[0].file.arrayBuffer())
      const result = await extractPagesFromPdf(pdfBytes, pageNumbers)

      const blob = new Blob([result.buffer as ArrayBuffer], { type: 'application/pdf' })
      setDownloadUrl(URL.createObjectURL(blob))
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract pages')
      setStatus('error')
    }
  }, [files, pageInput])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFiles([])
    setPageInput('')
    setDownloadUrl('')
    setStatus('idle')
    setError('')
  }, [downloadUrl])

  if (status === 'done') {
    const baseName = files[0]?.file.name.replace(/\.pdf$/i, '') ?? 'document'
    return <ToolResult downloadUrl={downloadUrl} fileName={`${baseName}-extracted.pdf`} onReset={handleReset} />
  }

  return (
    <div className="space-y-6">
      <ToolDropzone tool={tool} files={files} onFilesChange={setFiles} disabled={status === 'processing'} />

      {files.length > 0 && (
        <>
          <div className="space-y-1">
            <label htmlFor="pages-to-extract" className="text-sm font-medium" style={{ color: '#E2E8F0' }}>
              Pages to extract
            </label>
            <input
              id="pages-to-extract"
              type="text"
              value={pageInput}
              onChange={e => setPageInput(e.target.value)}
              placeholder="e.g. 1, 3, 5"
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2"
              style={{
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(255,255,255,0.04)',
                color: '#E2E8F0',
              }}
            />
            <p className="text-xs" style={{ color: '#94A3B8' }}>Enter page numbers separated by commas (1-indexed)</p>
          </div>

          {error && <p role="alert" className="text-sm" style={{ color: '#EF4444' }}>{error}</p>}

          <Button
            onClick={handleExtract}
            disabled={status === 'processing' || !pageInput.trim()}
            loading={status === 'processing'}
            size="lg"
            className="w-full"
          >
            {status === 'processing' ? 'Extracting…' : 'Extract Pages'}
          </Button>
        </>
      )}
    </div>
  )
}
