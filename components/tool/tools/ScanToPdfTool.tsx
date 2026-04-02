'use client'

import { useState, useCallback } from 'react'
import { ToolDropzone, ToolResult, type UploadedFile } from '@/components/tool'
import { Button } from '@/components/ui'
import type { Tool } from '@/config/tools'
import type { PageSize, PageOrientation, PageMargin } from '@/lib/pdf/scanToPdf'

interface ScanToPdfToolProps { tool: Tool }

export function ScanToPdfTool({ tool }: ScanToPdfToolProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [pageSize, setPageSize] = useState<PageSize>('fit')
  const [orientation, setOrientation] = useState<PageOrientation>('portrait')
  const [margin, setMargin] = useState<PageMargin>('none')
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState('')

  const handleConvert = useCallback(async () => {
    if (files.length === 0) return
    setStatus('processing')
    setError('')

    try {
      const { imagesToPdf } = await import('@/lib/pdf/scanToPdf')

      const imageBuffers = await Promise.all(
        files.map(async f => {
          const bytes = new Uint8Array(await f.file.arrayBuffer())
          const mimeType = (f.file.type === 'image/png' ? 'image/png' : 'image/jpeg') as 'image/jpeg' | 'image/png'
          return { bytes, mimeType }
        }),
      )

      const result = await imagesToPdf(imageBuffers, { pageSize, orientation, margin })
      const blob = new Blob([result.buffer as ArrayBuffer], { type: 'application/pdf' })
      setDownloadUrl(URL.createObjectURL(blob))
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
      setStatus('error')
    }
  }, [files, pageSize, orientation, margin])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFiles([])
    setDownloadUrl('')
    setStatus('idle')
    setError('')
  }, [downloadUrl])

  if (status === 'done') {
    return <ToolResult downloadUrl={downloadUrl} fileName="scanned.pdf" onReset={handleReset} />
  }

  return (
    <div className="space-y-6">
      <ToolDropzone tool={tool} files={files} onFilesChange={setFiles} disabled={status === 'processing'} />

      {files.length > 0 && (
        <>
          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-[--color-text]">Page size</label>
              <select
                value={pageSize}
                onChange={e => setPageSize(e.target.value as PageSize)}
                className="w-full px-3 py-2 text-sm rounded-[--radius] border border-[--color-border] bg-[--color-surface] text-[--color-text] focus:outline-none focus:ring-2 focus:ring-[--color-primary]/30"
              >
                <option value="fit">Fit to image</option>
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[--color-text]">Orientation</label>
              <select
                value={orientation}
                onChange={e => setOrientation(e.target.value as PageOrientation)}
                disabled={pageSize === 'fit'}
                className="w-full px-3 py-2 text-sm rounded-[--radius] border border-[--color-border] bg-[--color-surface] text-[--color-text] focus:outline-none focus:ring-2 focus:ring-[--color-primary]/30 disabled:opacity-50"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[--color-text]">Margin</label>
              <select
                value={margin}
                onChange={e => setMargin(e.target.value as PageMargin)}
                className="w-full px-3 py-2 text-sm rounded-[--radius] border border-[--color-border] bg-[--color-surface] text-[--color-text] focus:outline-none focus:ring-2 focus:ring-[--color-primary]/30"
              >
                <option value="none">None</option>
                <option value="small">Small</option>
                <option value="big">Large</option>
              </select>
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-[--color-error]">{error}</p>}

          <Button
            onClick={handleConvert}
            disabled={status === 'processing'}
            loading={status === 'processing'}
            size="lg"
            className="w-full"
          >
            {status === 'processing'
              ? 'Converting…'
              : `Convert ${files.length} image${files.length > 1 ? 's' : ''} to PDF`}
          </Button>
        </>
      )}
    </div>
  )
}
