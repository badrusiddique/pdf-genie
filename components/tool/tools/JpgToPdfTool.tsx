'use client'

import { useState, useCallback, useEffect } from 'react'
import { ImageIcon, X, Plus } from 'lucide-react'
import { ToolLayout, ToolResult } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'
import type { PageSize, PageOrientation, PageMargin } from '@/lib/pdf/scanToPdf'

interface ImageFile { file: File; id: string; preview: string }

const SIZE_OPTIONS: { value: PageSize; label: string }[] = [
  { value: 'fit', label: 'Fit to image' },
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
]

const MARGIN_OPTIONS: { value: PageMargin; label: string }[] = [
  { value: 'none', label: 'No margin' },
  { value: 'small', label: 'Small' },
  { value: 'big', label: 'Large' },
]

async function fileToImageBuffer(
  file: File,
): Promise<{ bytes: Uint8Array; mimeType: 'image/jpeg' | 'image/png' }> {
  // pdf-lib only supports jpeg and png; convert webp via canvas
  if (file.type === 'image/webp') {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Failed to convert WebP to JPEG')); return }
        blob.arrayBuffer().then(buf => resolve({ bytes: new Uint8Array(buf), mimeType: 'image/jpeg' })).catch(reject)
      }, 'image/jpeg', 0.92)
    })
  }
  const buf = await file.arrayBuffer()
  return {
    bytes: new Uint8Array(buf),
    mimeType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
  }
}

interface JpgToPdfToolProps { tool: Tool }

export function JpgToPdfTool({ tool }: JpgToPdfToolProps) {
  const [images, setImages] = useState<ImageFile[]>([])
  const [pageSize, setPageSize] = useState<PageSize>('a4')
  const [orientation, setOrientation] = useState<PageOrientation>('portrait')
  const [margin, setMargin] = useState<PageMargin>('small')
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    return () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl) }
  }, [downloadUrl])

  // Revoke preview URLs on unmount
  useEffect(() => {
    const current = images
    return () => { current.forEach(img => URL.revokeObjectURL(img.preview)) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addImages = useCallback((files: FileList | null) => {
    if (!files) return
    const valid = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, tool.maxFiles - images.length)
    setImages(prev => [
      ...prev,
      ...valid.map(f => ({
        file: f,
        id: `${f.name}-${f.size}-${Date.now()}`,
        preview: URL.createObjectURL(f),
      })),
    ])
  }, [images.length, tool.maxFiles])

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) URL.revokeObjectURL(img.preview)
      return prev.filter(i => i.id !== id)
    })
  }, [])

  const handleConvert = useCallback(async () => {
    if (images.length === 0) return
    setStatus('processing')
    setError('')
    try {
      const { imagesToPdf } = await import('@/lib/pdf/scanToPdf')
      const imageBuffers = await Promise.all(images.map(img => fileToImageBuffer(img.file)))
      const pdf = await imagesToPdf(imageBuffers, { pageSize, orientation, margin })
      const blob = new Blob([pdf.buffer as ArrayBuffer], { type: 'application/pdf' })
      setDownloadUrl(URL.createObjectURL(blob))
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
      setStatus('error')
    }
  }, [images, pageSize, orientation, margin])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    images.forEach(img => URL.revokeObjectURL(img.preview))
    setImages([])
    setDownloadUrl('')
    setStatus('idle')
    setError('')
  }, [downloadUrl, images])

  if (status === 'done') {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ToolResult downloadUrl={downloadUrl} fileName="images.pdf" onReset={handleReset} />
      </div>
    )
  }

  const sidebar = (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>Page size</p>
        <div className="space-y-1.5">
          {SIZE_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setPageSize(opt.value)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all"
              style={{
                background: pageSize === opt.value ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${pageSize === opt.value ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: pageSize === opt.value ? '#F1F5F9' : '#94A3B8',
              }}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {pageSize !== 'fit' && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>Orientation</p>
          <div className="flex gap-2">
            {(['portrait', 'landscape'] as PageOrientation[]).map(o => (
              <button key={o} onClick={() => setOrientation(o)}
                className="flex-1 py-2 rounded-lg text-sm capitalize transition-all"
                style={{
                  background: orientation === o ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${orientation === o ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  color: orientation === o ? '#F1F5F9' : '#94A3B8',
                }}
              >{o}</button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>Margin</p>
        <div className="space-y-1.5">
          {MARGIN_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setMargin(opt.value)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all"
              style={{
                background: margin === opt.value ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${margin === opt.value ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: margin === opt.value ? '#F1F5F9' : '#94A3B8',
              }}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>{error}</p>
      )}

      {status === 'processing' && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
          <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin shrink-0" />
          Converting {images.length} image{images.length > 1 ? 's' : ''}…
        </div>
      )}
    </div>
  )

  const action = (
    <button onClick={handleConvert} disabled={images.length === 0 || status === 'processing'}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: images.length > 0 ? 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: images.length > 0 ? '0 4px 20px rgba(6,182,212,0.35)' : 'none',
      }}
    >
      <span>Convert to PDF</span>
      <span className="text-lg">→</span>
    </button>
  )

  const sidebarHeader = (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>JPG to PDF</h2>
      {images.length > 0 && (
        <span className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
          style={{ background: '#06B6D4', color: '#fff' }}>{images.length}</span>
      )}
    </div>
  )

  return (
    <ToolLayout sidebar={sidebar} action={action} sidebarHeader={sidebarHeader}>
      {images.length === 0 ? (
        <div
          role="button" tabIndex={0} aria-label="Upload images to convert"
          className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
          style={{ minHeight: '360px', background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.10)' }}
          onClick={() => document.getElementById('jpg-input')?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('jpg-input')?.click() }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); addImages(e.dataTransfer.files) }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <ImageIcon className="w-8 h-8" style={{ color: '#475569' }} />
          </div>
          <div className="text-center">
            <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>Select images to convert</p>
            <p className="text-sm" style={{ color: '#475569' }}>JPG, PNG, WebP · up to {tool.maxFiles} files · {tool.maxSizeMB} MB each</p>
          </div>
          <input id="jpg-input" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
            onChange={e => addImages(e.target.files)} />
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 content-start">
          {images.map(img => (
            <div key={img.id} className="relative shrink-0 rounded-lg overflow-hidden"
              style={{ width: '140px', border: '1px solid rgba(255,255,255,0.10)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.preview} alt={img.file.name} className="w-full object-cover" style={{ height: '100px' }} />
              <button onClick={() => removeImage(img.id)}
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
                aria-label={`Remove ${img.file.name}`}>
                <X className="w-3 h-3" />
              </button>
              <div className="px-2 py-1.5">
                <p className="text-xs truncate" style={{ color: '#94A3B8' }}>{img.file.name}</p>
                <p className="text-[10px]" style={{ color: '#475569' }}>{formatFileSize(img.file.size)}</p>
              </div>
            </div>
          ))}
          {images.length < tool.maxFiles && (
            <button
              onClick={() => {
                const inp = document.createElement('input')
                inp.type = 'file'
                inp.accept = 'image/jpeg,image/png,image/webp'
                inp.multiple = true
                inp.onchange = e => addImages((e.target as HTMLInputElement).files)
                inp.click()
              }}
              className="shrink-0 flex flex-col items-center justify-center rounded-lg transition-all"
              style={{ width: '140px', height: '130px', background: 'rgba(6,182,212,0.06)', border: '2px dashed rgba(6,182,212,0.3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,182,212,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(6,182,212,0.06)' }}
            >
              <Plus className="w-6 h-6 mb-1" style={{ color: '#06B6D4' }} />
              <span className="text-xs" style={{ color: '#06B6D4' }}>Add more</span>
            </button>
          )}
        </div>
      )}
    </ToolLayout>
  )
}
