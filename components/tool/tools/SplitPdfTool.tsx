'use client'

import { useState, useCallback } from 'react'
import JSZip from 'jszip'
import { ToolDropzone, ToolResult, type UploadedFile } from '@/components/tool'
import { Button } from '@/components/ui'
import type { Tool } from '@/config/tools'

type SplitMode = 'ranges' | 'pages' | 'chunks'

interface SplitPdfToolProps { tool: Tool }

export function SplitPdfTool({ tool }: SplitPdfToolProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [mode, setMode] = useState<SplitMode>('pages')
  const [rangeInput, setRangeInput] = useState('1-3, 4-6')
  const [chunkSize, setChunkSize] = useState(2)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState('')

  const handleSplit = useCallback(async () => {
    if (!files[0]) return
    setStatus('processing')
    setError('')

    try {
      const pdfBytes = new Uint8Array(await files[0].file.arrayBuffer())
      let results: Uint8Array[]

      if (mode === 'pages') {
        const { splitPdfToPages } = await import('@/lib/pdf/split')
        results = await splitPdfToPages(pdfBytes)
      } else if (mode === 'chunks') {
        const { splitPdfIntoChunks } = await import('@/lib/pdf/split')
        results = await splitPdfIntoChunks(pdfBytes, chunkSize)
      } else {
        // Parse range input: "1-3, 4-6"
        const { splitPdfByRanges } = await import('@/lib/pdf/split')
        const ranges = rangeInput.split(',').map(r => {
          const parts = r.trim().split('-').map(Number)
          return { from: parts[0], to: parts[1] ?? parts[0] }
        })
        results = await splitPdfByRanges(pdfBytes, ranges)
      }

      // Package into a zip
      const zip = new JSZip()
      const baseName = files[0].file.name.replace(/\.pdf$/i, '')
      results.forEach((pdf, i) => {
        zip.file(`${baseName}-part${i + 1}.pdf`, pdf)
      })
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      setDownloadUrl(url)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Split failed')
      setStatus('error')
    }
  }, [files, mode, rangeInput, chunkSize])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFiles([])
    setDownloadUrl('')
    setStatus('idle')
    setError('')
  }, [downloadUrl])

  if (status === 'done') {
    const baseName = files[0]?.file.name.replace(/\.pdf$/i, '') ?? 'split'
    return <ToolResult downloadUrl={downloadUrl} fileName={`${baseName}-split.zip`} onReset={handleReset} />
  }

  return (
    <div className="space-y-6">
      <ToolDropzone tool={tool} files={files} onFilesChange={setFiles} disabled={status === 'processing'} />

      {files.length > 0 && (
        <>
          {/* Mode tabs */}
          <div className="flex rounded-[--radius] border border-[--color-border] overflow-hidden text-sm">
            {(['pages', 'ranges', 'chunks'] as SplitMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 capitalize transition-colors ${
                  mode === m
                    ? 'bg-[--color-primary] text-white'
                    : 'bg-[--color-surface] text-[--color-muted] hover:bg-[--color-bg]'
                }`}
              >
                {m === 'pages' ? 'Every page' : m === 'ranges' ? 'By range' : 'Fixed chunks'}
              </button>
            ))}
          </div>

          {mode === 'ranges' && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-[--color-text]">
                Page ranges (comma-separated)
              </label>
              <input
                type="text"
                value={rangeInput}
                onChange={e => setRangeInput(e.target.value)}
                placeholder="e.g. 1-3, 4-6, 7-10"
                className="w-full px-3 py-2 text-sm rounded-[--radius] border border-[--color-border] bg-[--color-surface] text-[--color-text] focus:outline-none focus:ring-2 focus:ring-[--color-primary]/30"
              />
              <p className="text-xs text-[--color-muted]">Each range becomes a separate PDF</p>
            </div>
          )}

          {mode === 'chunks' && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-[--color-text]">Pages per chunk</label>
              <input
                type="number"
                min={1}
                value={chunkSize}
                onChange={e => setChunkSize(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm rounded-[--radius] border border-[--color-border] bg-[--color-surface] text-[--color-text] focus:outline-none focus:ring-2 focus:ring-[--color-primary]/30"
              />
            </div>
          )}

          {error && <p role="alert" className="text-sm text-[--color-error]">{error}</p>}

          <Button
            onClick={handleSplit}
            disabled={status === 'processing'}
            loading={status === 'processing'}
            size="lg"
            className="w-full"
          >
            {status === 'processing' ? 'Splitting…' : 'Split PDF'}
          </Button>
        </>
      )}
    </div>
  )
}
