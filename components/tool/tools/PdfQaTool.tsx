'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { MessageSquare, Send, X, FileText } from 'lucide-react'
import { ToolLayout } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'

interface Message { role: 'user' | 'assistant'; text: string }

interface PdfQaToolProps { tool: Tool }

export function PdfQaTool({ tool }: PdfQaToolProps) {
  const [files, setFiles] = useState<File[]>([])
  const [context, setContext] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [stage, setStage] = useState<'upload' | 'indexing' | 'chat'>('upload')
  const [error, setError] = useState('')
  const [asking, setAsking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleIndex = useCallback(async () => {
    if (files.length === 0) return
    setStage('indexing')
    setError('')
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))
      const res = await fetch('/api/v1/process/pdf-qa/extract', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? `Error ${res.status}`)
      setContext(json.context)
      setStage('chat')
      setMessages([{
        role: 'assistant',
        text: `Ready! I've read ${files.length} PDF${files.length > 1 ? 's' : ''}. Ask me anything about the content.`,
      }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process PDFs')
      setStage('upload')
    }
  }, [files])

  const handleAsk = useCallback(async () => {
    if (!input.trim() || !context || asking) return
    const question = input.trim()
    setInput('')
    setAsking(true)
    setMessages(prev => [...prev, { role: 'user', text: question }])

    try {
      const res = await fetch('/api/v1/process/pdf-qa/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? `Error ${res.status}`)
      setMessages(prev => [...prev, { role: 'assistant', text: json.answer }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: err instanceof Error ? err.message : 'Failed to get answer',
      }])
    } finally {
      setAsking(false)
    }
  }, [input, context, asking])

  const handleReset = useCallback(() => {
    setFiles([])
    setContext(null)
    setMessages([])
    setInput('')
    setStage('upload')
    setError('')
  }, [])

  const sidebar = (
    <div className="space-y-4">
      {stage === 'chat' && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
            Loaded documents
          </p>
          <div className="space-y-1.5">
            {files.map(f => (
              <div key={f.name} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: '#06B6D4' }} />
                <span className="text-xs truncate" style={{ color: '#94A3B8' }}>{f.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="p-3 rounded-lg text-xs leading-relaxed"
        style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.12)', color: '#94A3B8' }}>
        Powered by <strong style={{ color: '#F1F5F9' }}>RoBERTa</strong> via HuggingFace. Answers are extracted from your document — no hallucination. Up to {tool.maxFiles} PDFs, 15 MB each.
      </div>
      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>{error}</p>
      )}
      {stage !== 'upload' && (
        <button onClick={handleReset} className="w-full py-2 text-xs rounded-lg transition-colors"
          style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          Start over
        </button>
      )}
    </div>
  )

  const action = stage === 'upload' ? (
    <button onClick={handleIndex} disabled={files.length === 0}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: files.length > 0 ? 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)' : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: files.length > 0 ? '0 4px 20px rgba(236,72,153,0.35)' : 'none',
      }}
    >
      <span>Start Q&amp;A Session</span>
      <span className="text-lg">→</span>
    </button>
  ) : undefined

  return (
    <ToolLayout
      sidebar={sidebar}
      action={action}
      sidebarHeader={
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>PDF Q&amp;A</h2>
          {stage === 'chat' && (
            <span className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} title="Ready" />
          )}
        </div>
      }
    >
      {stage === 'upload' ? (
        <div className="flex flex-col gap-5">
          <div
            role="button" tabIndex={0} aria-label="Upload PDFs for Q&A"
            className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all"
            style={{ minHeight: '240px', background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.10)' }}
            onClick={() => document.getElementById('qa-input')?.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('qa-input')?.click() }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              const dropped = Array.from(e.dataTransfer.files)
                .filter(f => f.type === 'application/pdf')
                .slice(0, tool.maxFiles)
              setFiles(prev => [...prev, ...dropped].slice(0, tool.maxFiles))
            }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)' }}>
              <MessageSquare className="w-8 h-8" style={{ color: '#EC4899' }} />
            </div>
            <div className="text-center">
              <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>Upload PDFs to chat with</p>
              <p className="text-sm" style={{ color: '#475569' }}>Up to {tool.maxFiles} PDFs · 15 MB each</p>
            </div>
            <input id="qa-input" type="file" accept="application/pdf" multiple className="sr-only"
              onChange={e => {
                const selected = Array.from(e.target.files ?? []).slice(0, tool.maxFiles)
                setFiles(prev => [...prev, ...selected].slice(0, tool.maxFiles))
              }} />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <FileText className="w-4 h-4 shrink-0" style={{ color: '#06B6D4' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#E2E8F0' }}>{f.name}</p>
                    <p className="text-[10px]" style={{ color: '#475569' }}>{formatFileSize(f.size)}</p>
                  </div>
                  <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove ${f.name}`}
                    style={{ color: '#475569' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : stage === 'indexing' ? (
        <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: '360px' }}>
          <div className="w-12 h-12 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-sm" style={{ color: '#94A3B8' }}>Reading your PDFs… first run may take 20–30 s</p>
        </div>
      ) : (
        <div className="flex flex-col" style={{ minHeight: '400px' }}>
          <div className="flex-1 overflow-y-auto space-y-3 pb-4" style={{ maxHeight: '380px' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={msg.role === 'user' ? {
                    background: 'linear-gradient(135deg, #EC4899, #DB2777)',
                    color: '#fff',
                    borderBottomRightRadius: '4px',
                  } : {
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: '#E2E8F0',
                    borderBottomLeftRadius: '4px',
                  }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {asking && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl flex gap-1.5"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: '#94A3B8', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 mt-4">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk() } }}
              placeholder="Ask a question about your PDFs…"
              disabled={asking}
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#F1F5F9',
              }}
            />
            <button
              onClick={handleAsk}
              disabled={!input.trim() || asking}
              className="px-4 py-3 rounded-xl transition-all disabled:opacity-40"
              style={{
                background: input.trim() ? 'linear-gradient(135deg, #EC4899, #DB2777)' : 'rgba(255,255,255,0.05)',
                color: '#fff',
              }}
              aria-label="Send question"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  )
}
