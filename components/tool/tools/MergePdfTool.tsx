'use client'

import { useState, useCallback } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  horizontalListSortingStrategy, arrayMove, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, X, ArrowUpDown, Info, GitMerge } from 'lucide-react'
import { ToolLayout, ToolResult, PdfThumbnail, type UploadedFile } from '@/components/tool'
import type { Tool } from '@/config/tools'
import { formatFileSize } from '@/lib/file-utils'
import { cn } from '@/lib/utils'

// ── Sortable PDF thumbnail card ──────────────────────────────────
function SortableCard({
  uploadedFile,
  index,
  onRemove,
  disabled,
}: {
  uploadedFile: UploadedFile
  index: number
  onRemove: (id: string) => void
  disabled: boolean
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: uploadedFile.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative flex flex-col cursor-grab rounded-lg overflow-hidden shrink-0',
        'transition-all duration-200',
        isDragging ? 'opacity-60 scale-95 shadow-2xl z-50' : 'hover:scale-[1.02]',
      )}
      {...attributes}
      {...listeners}
    >
      {/* Remove button */}
      <button
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
        onClick={e => { e.stopPropagation(); onRemove(uploadedFile.id) }}
        disabled={disabled}
        aria-label={`Remove ${uploadedFile.file.name}`}
        onPointerDown={e => e.stopPropagation()}
      >
        <X className="w-3 h-3" />
      </button>

      {/* Order badge */}
      <div
        className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
        style={{ background: 'rgba(6,182,212,0.9)', color: '#fff' }}
      >
        {index + 1}
      </div>

      {/* PDF thumbnail */}
      <div
        className="group rounded-lg overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.10)', background: '#1a1730' }}
      >
        <PdfThumbnail file={uploadedFile.file} width={160} />
      </div>

      {/* Filename */}
      <div className="pt-2 px-1">
        <p
          className="text-xs font-medium truncate text-center"
          style={{ color: '#E2E8F0', maxWidth: '160px' }}
          title={uploadedFile.file.name}
        >
          {uploadedFile.file.name}
        </p>
        <p className="text-[10px] text-center mt-0.5" style={{ color: '#475569' }}>
          {formatFileSize(uploadedFile.file.size)}
        </p>
      </div>
    </li>
  )
}

// ── Add file card ─────────────────────────────────────────────────
function AddFileCard({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 flex flex-col items-center justify-center rounded-lg transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
      style={{
        width: '160px',
        height: '226px', // matches A4 ratio thumbnail
        background: 'rgba(6,182,212,0.06)',
        border: '2px dashed rgba(6,182,212,0.3)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(6,182,212,0.12)'
        e.currentTarget.style.borderColor = 'rgba(6,182,212,0.6)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(6,182,212,0.06)'
        e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'
      }}
      aria-label="Add more PDF files"
    >
      <Plus className="w-8 h-8 mb-2" style={{ color: '#06B6D4' }} />
      <span className="text-xs font-medium" style={{ color: '#06B6D4' }}>Add PDF</span>
    </button>
  )
}

// ── Drop zone (empty state) ───────────────────────────────────────
function EmptyDropZone({
  tool,
  onFiles,
}: {
  tool: Tool
  onFiles: (files: File[]) => void
}) {
  const [over, setOver] = useState(false)
  const inputId = 'merge-file-input'

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload PDF files"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
      style={{
        minHeight: '360px',
        background: over ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.02)',
        border: `2px dashed ${over ? 'rgba(6,182,212,0.6)' : 'rgba(255,255,255,0.10)'}`,
      }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault()
        setOver(false)
        onFiles(Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf'))
      }}
      onClick={() => document.getElementById(inputId)?.click()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById(inputId)?.click() }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: over ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.04)' }}
      >
        <GitMerge className="w-8 h-8" style={{ color: over ? '#22D3EE' : '#475569' }} />
      </div>
      <div className="text-center">
        <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>
          {over ? 'Drop PDFs here' : 'Select PDF files to merge'}
        </p>
        <p className="text-sm" style={{ color: '#475569' }}>
          Drop files here or click to browse · up to {tool.maxFiles} files · {tool.maxSizeMB} MB each
        </p>
      </div>
      <input
        id={inputId}
        type="file"
        accept="application/pdf"
        multiple
        className="sr-only"
        onChange={e => onFiles(Array.from(e.target.files ?? []))}
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
interface MergePdfToolProps { tool: Tool }

export function MergePdfTool({ tool }: MergePdfToolProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState('')
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter(f => f.type === 'application/pdf').slice(0, tool.maxFiles - files.length)
    setFiles(prev => [
      ...prev,
      ...valid.map(f => ({ file: f, id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}` })),
    ])
  }, [files.length, tool.maxFiles])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e
    if (over && active.id !== over.id) {
      setFiles(items => {
        const a = items.findIndex(i => i.id === active.id)
        const b = items.findIndex(i => i.id === over.id)
        return arrayMove(items, a, b)
      })
    }
  }, [])

  const sortByName = useCallback(() => {
    setFiles(f => [...f].sort((a, b) => a.file.name.localeCompare(b.file.name)))
  }, [])

  const handleMerge = useCallback(async () => {
    if (files.length < 2) return
    const ac = new AbortController()
    setAbortController(ac)
    setStatus('processing')
    setError('')

    try {
      const { mergePdfs } = await import('@/lib/pdf/merge')
      const pdfs = await Promise.all(files.map(f => f.file.arrayBuffer().then(b => new Uint8Array(b))))
      if (ac.signal.aborted) return

      const merged = await mergePdfs(pdfs)
      if (ac.signal.aborted) return

      const blob = new Blob([merged.buffer as ArrayBuffer], { type: 'application/pdf' })
      setDownloadUrl(URL.createObjectURL(blob))
      setStatus('done')
    } catch (err) {
      if (!ac.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Merge failed')
        setStatus('error')
      }
    }
  }, [files])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFiles([])
    setDownloadUrl('')
    setStatus('idle')
    setError('')
  }, [downloadUrl])

  // ── Done state ──
  if (status === 'done') {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ToolResult downloadUrl={downloadUrl} fileName="merged.pdf" onReset={handleReset} />
      </div>
    )
  }

  // ── Sidebar content ──
  const sidebar = (
    <div className="space-y-5">
      {/* Tip */}
      <div
        className="flex gap-2.5 p-3 rounded-lg text-xs leading-relaxed"
        style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#22D3EE' }} />
        <span style={{ color: '#94A3B8' }}>
          {files.length > 0
            ? 'Drag and drop the PDF cards to set the merge order.'
            : 'Select multiple PDF files. You can reorder them before merging.'}
        </span>
      </div>

      {/* Sort button */}
      {files.length > 1 && (
        <button
          onClick={sortByName}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#94A3B8',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#F1F5F9' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94A3B8' }}
        >
          <ArrowUpDown className="w-4 h-4 shrink-0" />
          Sort by name
        </button>
      )}

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm px-3 py-2 rounded-lg" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </p>
      )}

      {/* Status when processing */}
      {status === 'processing' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
            <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin shrink-0" />
            Merging {files.length} PDFs…
          </div>
          <button
            onClick={() => { abortController?.abort(); setStatus('idle') }}
            className="w-full py-2 text-xs rounded-lg transition-colors"
            style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )

  // ── Sticky action button ──
  const action = (
    <button
      onClick={handleMerge}
      disabled={files.length < 2 || status === 'processing'}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: files.length >= 2 ? 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: files.length >= 2 ? '0 4px 20px rgba(6,182,212,0.35)' : 'none',
      }}
    >
      <span>Merge PDF</span>
      <span className="text-lg">→</span>
    </button>
  )

  // ── Sidebar header ──
  const sidebarHeader = (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>
        Merge PDF
      </h2>
      {files.length > 0 && (
        <span
          className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
          style={{ background: '#06B6D4', color: '#fff' }}
        >
          {files.length}
        </span>
      )}
    </div>
  )

  return (
    <ToolLayout sidebar={sidebar} action={action} sidebarHeader={sidebarHeader}>
      {files.length === 0 ? (
        // Empty drop zone
        <EmptyDropZone tool={tool} onFiles={addFiles} />
      ) : (
        // File thumbnail grid — horizontal scroll, drag-to-reorder
        <div className="h-full">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={files.map(f => f.id)}
              strategy={horizontalListSortingStrategy}
            >
              <ul className="flex flex-wrap gap-5 content-start">
                {files.map((f, i) => (
                  <SortableCard
                    key={f.id}
                    uploadedFile={f}
                    index={i}
                    onRemove={removeFile}
                    disabled={status === 'processing'}
                  />
                ))}

                {/* Add more */}
                {files.length < tool.maxFiles && (
                  <AddFileCard
                    disabled={status === 'processing'}
                    onClick={() => {
                      const inp = document.createElement('input')
                      inp.type = 'file'
                      inp.accept = 'application/pdf'
                      inp.multiple = true
                      inp.onchange = (e) => {
                        addFiles(Array.from((e.target as HTMLInputElement).files ?? []))
                      }
                      inp.click()
                    }}
                  />
                )}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </ToolLayout>
  )
}
