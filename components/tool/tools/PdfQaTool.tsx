'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { MessageSquare, Send, X, FileText, Sparkles, User } from 'lucide-react'
import { ToolLayout } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
}

interface PdfQaToolProps { tool: Tool }

export function PdfQaTool({ tool }: PdfQaToolProps) {
  const [files, setFiles] = useState<File[]>([])
  const [context, setContext] = useState<string | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [stage, setStage] = useState<'upload' | 'indexing' | 'chat'>('upload')
  const [error, setError] = useState('')
  const [asking, setAsking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, asking])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

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
        content: `I've read ${files.length} PDF${files.length > 1 ? 's' : ''}. Ask me anything about the content — I'll answer based only on what's in your documents.`,
      }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process PDFs')
      setStage('upload')
    }
  }, [files])

  const handleSend = useCallback(async () => {
    if (!input.trim() || !context || asking) return
    const userContent = input.trim()
    setInput('')

    const newMessages: DisplayMessage[] = [...messages, { role: 'user', content: userContent }]
    setMessages(newMessages)
    setAsking(true)

    try {
      const res = await fetch('/api/v1/process/pdf-qa/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userContent, context }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? `Error ${res.status}`)
      setMessages(prev => [...prev, { role: 'assistant', content: json.answer }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I ran into an issue: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }])
    } finally {
      setAsking(false)
    }
  }, [input, context, asking, messages])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

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
            Documents loaded
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
        Powered by <strong style={{ color: '#F1F5F9' }}>RoBERTa</strong> via HuggingFace. Extracts answers directly from your document text — fast responses, no hallucination. Up to {tool.maxFiles} PDFs, 15 MB each.
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
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
              <span className="text-xs" style={{ color: '#10B981' }}>RoBERTa</span>
            </div>
          )}
        </div>
      }
    >
      {stage === 'upload' ? (
        /* ── Upload stage ── */
        <div className="flex flex-col gap-4">
          <div
            role="button" tabIndex={0} aria-label="Upload PDFs for Q&A"
            className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all"
            style={{ minHeight: '220px', background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.10)' }}
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
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)' }}>
              <MessageSquare className="w-7 h-7" style={{ color: '#EC4899' }} />
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
                <div key={`${f.name}-${i}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <FileText className="w-4 h-4 shrink-0" style={{ color: '#EC4899' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#E2E8F0' }}>{f.name}</p>
                    <p className="text-[10px]" style={{ color: '#475569' }}>{formatFileSize(f.size)}</p>
                  </div>
                  <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove ${f.name}`} style={{ color: '#475569' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      ) : stage === 'indexing' ? (
        /* ── Indexing stage ── */
        <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: '360px' }}>
          <div className="w-12 h-12 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>Reading your PDFs…</p>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>First run may take 20–30 s (model warm-up)</p>
          </div>
        </div>

      ) : (
        /* ── Chat stage ── */
        <div className="flex flex-col" style={{ height: '520px' }}>
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                  style={msg.role === 'assistant' ? {
                    background: 'linear-gradient(135deg, #EC4899, #DB2777)',
                  } : {
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}>
                  {msg.role === 'assistant'
                    ? <Sparkles className="w-3.5 h-3.5" style={{ color: '#fff' }} />
                    : <User className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />}
                </div>

                {/* Bubble */}
                <div
                  className="max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={msg.role === 'user' ? {
                    background: 'linear-gradient(135deg, #EC4899, #DB2777)',
                    color: '#fff',
                    borderTopRightRadius: '4px',
                  } : {
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: '#E2E8F0',
                    borderTopLeftRadius: '4px',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {asking && (
              <div className="flex gap-2.5 flex-row">
                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: '#fff' }} />
                </div>
                <div className="px-4 py-3 rounded-2xl flex items-center gap-1.5"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderTopLeftRadius: '4px' }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: '#94A3B8', animationDelay: `${j * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="mt-4 flex gap-2 items-end">
            <div className="flex-1 flex items-end rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your PDFs… (Enter to send)"
                disabled={asking}
                rows={1}
                className="flex-1 px-4 py-3 text-sm outline-none resize-none bg-transparent"
                style={{ color: '#F1F5F9', minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || asking}
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: input.trim() && !asking ? 'linear-gradient(135deg, #EC4899, #DB2777)' : 'rgba(255,255,255,0.08)',
                boxShadow: input.trim() && !asking ? '0 4px 12px rgba(236,72,153,0.4)' : 'none',
              }}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" style={{ color: '#fff' }} />
            </button>
          </div>
          <p className="text-center text-[10px] mt-2" style={{ color: '#334155' }}>
            Shift+Enter for new line · answers grounded in your documents
          </p>
        </div>
      )}
    </ToolLayout>
  )
}
