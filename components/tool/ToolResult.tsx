'use client'

import { useEffect, useRef } from 'react'
import { CheckCircle2, Download, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'

interface ToolResultProps {
  downloadUrl: string
  fileName: string
  onReset: () => void
}

export function ToolResult({ downloadUrl, fileName, onReset }: ToolResultProps) {
  const downloadRef = useRef<HTMLAnchorElement>(null)

  // Auto-trigger download after 800ms
  useEffect(() => {
    const timer = setTimeout(() => {
      downloadRef.current?.click()
    }, 800)
    return () => clearTimeout(timer)
  }, [downloadUrl])

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="w-16 h-16 rounded-full bg-[--color-success]/10 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-[--color-success]" />
      </div>

      <div>
        <h3 className="font-display text-xl font-semibold text-[--color-text] mb-1">Done!</h3>
        <p className="text-sm text-[--color-muted]">Your file is ready to download</p>
      </div>

      {/* Hidden auto-download anchor */}
      <a ref={downloadRef} href={downloadUrl} download={fileName} className="sr-only" aria-hidden>
        Download
      </a>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <a
          href={downloadUrl}
          download={fileName}
          className={cn(
            'inline-flex items-center justify-center gap-2 font-medium rounded-[--radius] transition-all duration-[--transition]',
            'px-6 py-3 text-base',
            'bg-[--color-primary] text-white hover:bg-[--color-primary-hover] shadow-sm',
            'flex-1 no-underline',
          )}
        >
          <Download className="w-4 h-4" />
          Download
        </a>
        <Button variant="secondary" size="lg" onClick={onReset} className="flex-1">
          <RotateCcw className="w-4 h-4" />
          Process another
        </Button>
      </div>
    </div>
  )
}
