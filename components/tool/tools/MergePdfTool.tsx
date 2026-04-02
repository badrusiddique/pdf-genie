'use client'

import { useState, useCallback } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ArrowUpDown } from 'lucide-react'
import { ToolDropzone, ToolResult, ToolWorkspace, type UploadedFile } from '@/components/tool'
import { Button } from '@/components/ui'
import type { Tool } from '@/config/tools'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/file-utils'

// Sortable file item for drag-to-reorder
function SortableFileItem({ uploadedFile, onRemove, disabled }: {
  uploadedFile: UploadedFile
  onRemove: (id: string) => void
  disabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: uploadedFile.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 bg-[--color-surface] border border-[--color-border] rounded-[--radius-lg] transition-shadow',
        isDragging && 'shadow-[--shadow-lg] opacity-75',
      )}
    >
      <button
        className="cursor-grab text-[--color-muted] hover:text-[--color-text] p-1 touch-none"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-10 h-10 rounded bg-[--color-bg] flex items-center justify-center shrink-0">
        <span className="text-xs text-[--color-muted] font-mono">PDF</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[--color-text] truncate">{uploadedFile.file.name}</p>
        <p className="text-xs text-[--color-muted]">{formatFileSize(uploadedFile.file.size)}</p>
      </div>
      <button
        onClick={() => onRemove(uploadedFile.id)}
        disabled={disabled}
        className="p-1.5 text-[--color-muted] hover:text-[--color-error] rounded transition-colors"
        aria-label={`Remove ${uploadedFile.file.name}`}
      >
        ×
      </button>
    </li>
  )
}

interface MergePdfToolProps { tool: Tool }

export function MergePdfTool({ tool }: MergePdfToolProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setFiles(items => {
        const oldIndex = items.findIndex(i => i.id === active.id)
        const newIndex = items.findIndex(i => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
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
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      setStatus('done')
    } catch (err) {
      if (!ac.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Merge failed')
        setStatus('error')
      }
    }
  }, [files])

  const handleCancel = useCallback(() => {
    abortController?.abort()
    setStatus('idle')
  }, [abortController])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFiles([])
    setDownloadUrl('')
    setStatus('idle')
    setError('')
  }, [downloadUrl])

  if (status === 'done') {
    return <ToolResult downloadUrl={downloadUrl} fileName="merged.pdf" onReset={handleReset} />
  }

  return (
    <ToolWorkspace processing={status === 'processing'} processingLabel="Merging your PDFs…">
    <div className="space-y-6">
      {files.length === 0 ? (
        <ToolDropzone tool={tool} files={files} onFilesChange={setFiles} disabled={status === 'processing'} />
      ) : (
        <div className="space-y-3">
          {/* File reorder controls */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[--color-text]">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
            <button
              onClick={sortByName}
              className="flex items-center gap-1.5 text-xs text-[--color-primary] hover:underline"
            >
              <ArrowUpDown className="w-3 h-3" />
              Sort by name
            </button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={files.map(f => f.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {files.map(f => (
                  <SortableFileItem
                    key={f.id}
                    uploadedFile={f}
                    onRemove={id => setFiles(prev => prev.filter(f => f.id !== id))}
                    disabled={status === 'processing'}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          {/* Add more files */}
          {files.length < tool.maxFiles && (
            <ToolDropzone
              tool={tool}
              files={files}
              onFilesChange={setFiles}
              disabled={status === 'processing'}
            />
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm mt-2" style={{ color: '#EF4444' }}>{error}</p>
      )}

      {files.length >= 2 && (
        <div className="flex gap-3">
          <Button
            onClick={handleMerge}
            disabled={status === 'processing'}
            loading={status === 'processing'}
            size="lg"
            className="flex-1"
          >
            {status === 'processing' ? 'Merging…' : `Merge ${files.length} PDFs`}
          </Button>
          {status === 'processing' && (
            <Button variant="secondary" size="lg" onClick={handleCancel}>Cancel</Button>
          )}
        </div>
      )}

      {files.length === 1 && (
        <p className="text-sm text-center" style={{ color: '#64748B' }}>Add at least one more PDF to merge</p>
      )}
    </div>
    </ToolWorkspace>
  )
}
