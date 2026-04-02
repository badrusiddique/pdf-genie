'use client'

import { useEffect, useRef } from 'react'
import { Download, RotateCcw, CheckCircle2 } from 'lucide-react'

interface ToolResultProps {
  downloadUrl: string
  fileName: string
  onReset: () => void
}

export function ToolResult({ downloadUrl, fileName, onReset }: ToolResultProps) {
  const downloadRef = useRef<HTMLAnchorElement>(null)

  // Auto-trigger download after 800ms
  useEffect(() => {
    const timer = setTimeout(() => downloadRef.current?.click(), 800)
    return () => clearTimeout(timer)
  }, [downloadUrl])

  return (
    <div
      className="rounded-2xl p-8 sm:p-12 text-center"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Animated success icon */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          {/* Pulse rings */}
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'rgba(16,185,129,0.15)', animationDuration: '1.5s' }}
          />
          <div
            className="absolute -inset-3 rounded-full"
            style={{
              background: 'rgba(16,185,129,0.08)',
              animation: 'pulseGlow 2s ease-in-out infinite',
            }}
          />
          {/* Icon */}
          <div
            className="relative w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.3) 100%)',
              border: '1px solid rgba(16,185,129,0.3)',
              boxShadow: '0 0 30px rgba(16,185,129,0.2)',
            }}
          >
            <CheckCircle2
              className="w-10 h-10"
              style={{ color: '#10B981' }}
            />
          </div>
        </div>
      </div>

      {/* Heading */}
      <h3
        className="font-display text-2xl sm:text-3xl font-semibold mb-2"
        style={{ color: '#F1F5F9' }}
      >
        Complete!
      </h3>
      <p className="text-sm mb-2" style={{ color: '#94A3B8' }}>
        Your PDF has been processed successfully
      </p>

      {/* File name */}
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono mb-8"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#94A3B8',
        }}
      >
        <span style={{ color: '#10B981' }}>↓</span>
        {fileName}
      </div>

      {/* Hidden auto-download anchor */}
      <a ref={downloadRef} href={downloadUrl} download={fileName} className="sr-only" aria-hidden>
        Download
      </a>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
        <a
          href={downloadUrl}
          download={fileName}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 no-underline"
          style={{
            background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
            color: '#ffffff',
            boxShadow: '0 4px 20px rgba(6,182,212,0.35)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(6,182,212,0.45)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(6,182,212,0.35)'
          }}
        >
          <Download className="w-4 h-4 shrink-0" />
          Download file
        </a>
        <button
          onClick={onReset}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: '#94A3B8',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.09)'
            e.currentTarget.style.color = '#F1F5F9'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.color = '#94A3B8'
          }}
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          Process another PDF
        </button>
      </div>
    </div>
  )
}
