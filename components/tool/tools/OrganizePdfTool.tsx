'use client'

import { useState, useCallback } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, RotateCw, Trash2 } from 'lucide-react'
import { ToolDropzone, ToolResult, type UploadedFile } from '@/components/tool'
import { Button } from '@/components/ui'
import type { Tool } from '@/config/tools'
import { cn } from '@/lib/utils'

type Rotation = 0 | 90 | 180 | 270

interface PageEntry {
  id: string
  sourceIndex: number
  label: string
  rotation: Rotation
}

function SortablePageItem({
  entry,
  onRotate,
  onRemove,
  disabled,
}: {
  entry: PageEntry
  onRotate: (id: string) => void
  onRemove: (id: string) => void
  disabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id })
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

      {/* Page thumbnail placeholder */}
      <div
        className="w-10 h-14 rounded bg-[--color-bg] border border-[--color-border] flex items-center justify-center shrink-0 text-xs text-[--color-muted] font-mono"
        style={{ transform: `rotate(${entry.rotation}deg)` }}
      >
        {entry.label}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[--color-text]">Page {entry.label}</p>
        {entry.rotation !== 0 && (
          <p className="text-xs text-[--color-muted]">{entry.rotation}° rotation</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onRotate(entry.id)}
          disabled={disabled}
          className="p-1.5 text-[--color-muted] hover:text-[--color-primary] rounded transition-colors"
          aria-label={`Rotate page ${entry.label}`}
          title="Rotate 90°"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => onRemove(entry.id)}
          disabled={disabled}
          className="p-1.5 text-[--color-muted] hover:text-[--color-error] rounded transition-colors"
          aria-label={`Remove page ${entry.label}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  )
}

interface OrganizePdfToolProps { tool: Tool }

export function OrganizePdfTool({ tool }: OrganizePdfToolProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [pages, setPages] = useState<PageEntry[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Load page count from the PDF
  const handleFilesChange = useCallback(async (newFiles: UploadedFile[]) => {
    setFiles(newFiles)
    if (newFiles.length === 0) {
      setPages([])
      setPageCount(0)
      setStatus('idle')
      return
    }

    setStatus('loading')
    try {
      const { PDFDocument } = await import('pdf-lib')
      const bytes = new Uint8Array(await newFiles[0].file.arrayBuffer())
      const doc = await PDFDocument.load(bytes)
      const count = doc.getPageCount()
      setPageCount(count)
      setPages(
        Array.from({ length: count }, (_, i) => ({
          id: `page-${i}`,
          sourceIndex: i,
          label: String(i + 1),
          rotation: 0,
        })),
      )
      setStatus('ready')
    } catch {
      setError('Could not read PDF page count')
      setStatus('error')
    }
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setPages(items => {
        const oldIndex = items.findIndex(i => i.id === active.id)
        const newIndex = items.findIndex(i => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }, [])

  const handleRotate = useCallback((id: string) => {
    setPages(prev => prev.map(p =>
      p.id === id ? { ...p, rotation: ((p.rotation + 90) % 360) as Rotation } : p,
    ))
  }, [])

  const handleRemove = useCallback((id: string) => {
    setPages(prev => prev.filter(p => p.id !== id))
  }, [])

  const handleOrganize = useCallback(async () => {
    if (!files[0] || pages.length === 0) return
    setStatus('processing')
    setError('')

    try {
      const { organizePdf } = await import('@/lib/pdf/organize')
      const pdfBytes = new Uint8Array(await files[0].file.arrayBuffer())
      const operations = pages.map(p => ({
        sourceIndex: p.sourceIndex,
        rotation: p.rotation,
      }))
      const result = await organizePdf(pdfBytes, operations)

      const blob = new Blob([result.buffer as ArrayBuffer], { type: 'application/pdf' })
      setDownloadUrl(URL.createObjectURL(blob))
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Organize failed')
      setStatus('error')
    }
  }, [files, pages])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFiles([])
    setPages([])
    setPageCount(0)
    setDownloadUrl('')
    setStatus('idle')
    setError('')
  }, [downloadUrl])

  if (status === 'done') {
    const baseName = files[0]?.file.name.replace(/\.pdf$/i, '') ?? 'document'
    return <ToolResult downloadUrl={downloadUrl} fileName={`${baseName}-organized.pdf`} onReset={handleReset} />
  }

  return (
    <div className="space-y-6">
      {(status === 'idle' || status === 'error') && pages.length === 0 && (
        <ToolDropzone tool={tool} files={files} onFilesChange={handleFilesChange} disabled={false} />
      )}

      {status === 'loading' && (
        <div className="flex items-center justify-center py-12 text-[--color-muted] text-sm">
          Loading pages…
        </div>
      )}

      {(status === 'ready' || status === 'processing') && pages.length > 0 && (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[--color-muted]">
              {pages.length} of {pageCount} pages · drag to reorder
            </span>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {pages.map(p => (
                  <SortablePageItem
                    key={p.id}
                    entry={p}
                    onRotate={handleRotate}
                    onRemove={handleRemove}
                    disabled={status === 'processing'}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          {error && <p role="alert" className="text-sm text-[--color-error]">{error}</p>}

          <Button
            onClick={handleOrganize}
            disabled={status === 'processing' || pages.length === 0}
            loading={status === 'processing'}
            size="lg"
            className="w-full"
          >
            {status === 'processing' ? 'Applying…' : 'Apply Changes'}
          </Button>
        </>
      )}
    </div>
  )
}
