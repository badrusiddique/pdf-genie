/** Check if a file's magic bytes match a PDF (%PDF = 25 50 44 46) */
export async function isPdfByMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 4).arrayBuffer()
  const bytes = new Uint8Array(buffer)
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
}

/** Format bytes to human-readable string */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Check if file size is within limit */
export function isWithinSizeLimit(file: File, maxSizeMB: number): boolean {
  return file.size <= maxSizeMB * 1024 * 1024
}

/** Get file extension (lowercase, without dot) */
export function getFileExtension(file: File): string {
  const parts = file.name.split('.')
  if (parts.length < 2) return ''
  return parts.pop()?.toLowerCase() ?? ''
}
