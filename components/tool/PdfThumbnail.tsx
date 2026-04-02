'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'

let workerConfigured = false

interface PdfThumbnailProps {
  file: File
  pageNumber?: number
  width?: number
  className?: string
}

export function PdfThumbnail({ file, pageNumber = 1, width = 180, className = '' }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading')
  const height = Math.round(width * 1.414) // A4 ratio

  useEffect(() => {
    let cancelled = false
    setState('loading')

    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')

        if (!workerConfigured) {
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
          workerConfigured = true
        }

        const data = await file.arrayBuffer()
        if (cancelled) return

        const pdf = await pdfjs.getDocument({ data }).promise
        if (cancelled) return

        const page = await pdf.getPage(pageNumber)
        if (cancelled) return

        const baseViewport = page.getViewport({ scale: 1 })
        const scale = width / baseViewport.width
        const viewport = page.getViewport({ scale })

        const canvas = canvasRef.current
        if (!canvas || cancelled) return

        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({
          canvasContext: canvas.getContext('2d')!,
          viewport,
          canvas,
        }).promise

        if (!cancelled) setState('done')
      } catch {
        if (!cancelled) setState('error')
      }
    })()

    return () => { cancelled = true }
  }, [file, pageNumber, width])

  return (
    <div className={`relative ${className}`} style={{ width: `${width}px` }}>
      {/* Skeleton while loading */}
      {state === 'loading' && (
        <div
          className="rounded animate-pulse"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            background: 'rgba(255,255,255,0.06)',
          }}
        />
      )}

      {/* Actual rendered canvas */}
      <canvas
        ref={canvasRef}
        className="rounded w-full h-auto"
        style={{ display: state === 'done' ? 'block' : 'none' }}
      />

      {/* Fallback on error */}
      {state === 'error' && (
        <div
          className="rounded flex flex-col items-center justify-center gap-2"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <FileText className="w-8 h-8" style={{ color: '#475569' }} />
          <span className="text-xs" style={{ color: '#475569' }}>PDF</span>
        </div>
      )}
    </div>
  )
}
