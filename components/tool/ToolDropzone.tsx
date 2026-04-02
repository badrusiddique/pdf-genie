'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, X, FileText, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize, isWithinSizeLimit } from '@/lib/file-utils'
import type { Tool } from '@/config/tools'

export interface UploadedFile {
  file: File
  id: string
  previewUrl?: string  // For image files
}

interface ToolDropzoneProps {
  tool: Tool
  onFilesChange: (files: UploadedFile[]) => void
  files: UploadedFile[]
  disabled?: boolean
}

export function ToolDropzone({ tool, onFilesChange, files, disabled }: ToolDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isImageTool = tool.acceptedFormats.some(f => f.startsWith('image/'))

  const validateAndAdd = useCallback((newFiles: File[]) => {
    setError(null)

    // Check if adding would exceed maxFiles
    const totalAfter = files.length + newFiles.length
    if (totalAfter > tool.maxFiles) {
      setError(`Maximum ${tool.maxFiles} file${tool.maxFiles > 1 ? 's' : ''} allowed`)
      return
    }

    // Validate each file
    const validFiles: UploadedFile[] = []
    for (const file of newFiles) {
      // MIME type check
      const isValidType = tool.acceptedFormats.includes(file.type) ||
        (isImageTool && file.type.startsWith('image/'))
      if (!isValidType) {
        setError(`Invalid file type: ${file.name}. Accepted: ${tool.acceptedFormats.join(', ')}`)
        return
      }

      // Size check
      if (!isWithinSizeLimit(file, tool.maxSizeMB)) {
        setError(`${file.name} exceeds the ${tool.maxSizeMB} MB limit`)
        return
      }

      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      validFiles.push({ file, id, previewUrl })
    }

    onFilesChange(tool.multiple ? [...files, ...validFiles] : validFiles)
  }, [files, tool, onFilesChange, isImageTool])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled) return
    const dropped = Array.from(e.dataTransfer.files)
    validateAndAdd(dropped)
  }, [disabled, validateAndAdd])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length) validateAndAdd(selected)
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }, [validateAndAdd])

  const removeFile = useCallback((id: string) => {
    const updated = files.filter(f => f.id !== id)
    onFilesChange(updated)
    setError(null)
  }, [files, onFilesChange])

  const acceptString = tool.acceptedFormats.join(',')

  // Empty state — show drop zone
  if (files.length === 0) {
    return (
      <div className="w-full">
        <div
          role="button"
          tabIndex={0}
          aria-label={`Upload ${tool.acceptedFormats.includes('application/pdf') ? 'PDF' : 'files'}`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
          className={cn(
            'relative flex flex-col items-center justify-center gap-4',
            'w-full min-h-[240px] rounded-[--radius-xl] cursor-pointer',
            'border-2 border-dashed transition-all duration-200',
            isDragOver
              ? 'border-[--color-accent] bg-[--color-accent]/5 scale-[1.01]'
              : 'border-[--color-border] bg-[--color-surface] hover:border-[--color-primary]/40 hover:bg-[--color-bg]',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <div className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center transition-colors',
            isDragOver ? 'bg-[--color-accent]/10' : 'bg-[--color-bg]',
          )}>
            {isImageTool
              ? <ImageIcon className="w-7 h-7 text-[--color-primary]" />
              : <Upload className="w-7 h-7 text-[--color-primary]" />
            }
          </div>
          <div className="text-center px-4">
            <p className="font-medium text-[--color-text] mb-1">
              {isDragOver ? 'Drop files here' : 'Drop files here or click to browse'}
            </p>
            <p className="text-sm text-[--color-muted]">
              {isImageTool ? 'JPG, PNG, WebP' : 'PDF files'} · up to {tool.maxSizeMB} MB
              {tool.multiple && tool.maxFiles > 1 ? ` · up to ${tool.maxFiles} files` : ''}
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-3 flex items-center gap-2 text-sm text-[--color-error]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={acceptString}
          multiple={tool.multiple}
          className="sr-only"
          onChange={handleInputChange}
          aria-hidden
        />
      </div>
    )
  }

  // Files loaded — show compact file list
  return (
    <div className="w-full">
      <ul className="space-y-2 mb-3" aria-label="Selected files">
        {files.map((uploadedFile) => (
          <li
            key={uploadedFile.id}
            className="flex items-center gap-3 p-3 bg-[--color-surface] border border-[--color-border] rounded-[--radius-lg]"
          >
            {uploadedFile.previewUrl
              ? <img src={uploadedFile.previewUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
              : <div className="w-10 h-10 rounded bg-[--color-bg] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[--color-primary]" />
                </div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[--color-text] truncate">{uploadedFile.file.name}</p>
              <p className="text-xs text-[--color-muted]">{formatFileSize(uploadedFile.file.size)}</p>
            </div>
            <button
              onClick={() => removeFile(uploadedFile.id)}
              className="p-1.5 rounded-[--radius] text-[--color-muted] hover:text-[--color-error] hover:bg-[--color-error]/5 transition-colors"
              aria-label={`Remove ${uploadedFile.file.name}`}
              disabled={disabled}
            >
              <X className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>

      {/* Add more files button (multi-file tools only) */}
      {tool.multiple && files.length < tool.maxFiles && (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="w-full py-2 text-sm text-[--color-primary] hover:bg-[--color-primary]/5 rounded-[--radius] border border-dashed border-[--color-primary]/30 transition-colors"
        >
          + Add more files ({files.length}/{tool.maxFiles})
        </button>
      )}

      {error && (
        <div role="alert" className="mt-3 flex items-center gap-2 text-sm text-[--color-error]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={acceptString}
        multiple={tool.multiple}
        className="sr-only"
        onChange={handleInputChange}
        aria-hidden
      />
    </div>
  )
}
