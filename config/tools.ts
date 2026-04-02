export type ToolCategory =
  | 'organize'
  | 'optimize'
  | 'convert-to'
  | 'convert-from'
  | 'edit'
  | 'security'
  | 'intelligence'

export type ProcessingMode = 'client' | 'server' | 'ai'

export type Tool = {
  slug: string
  name: string
  description: string
  category: ToolCategory
  icon: string
  processingMode: ProcessingMode
  acceptedFormats: string[]
  multiple: boolean
  maxFiles: number
  maxSizeMB: number
}

export const tools: Tool[] = [
  // Organize PDF (6 tools)
  {
    slug: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDFs into one',
    category: 'organize',
    icon: 'Merge',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: true,
    maxFiles: 20,
    maxSizeMB: 100,
  },
  {
    slug: 'split-pdf',
    name: 'Split PDF',
    description: 'Split a PDF into multiple files',
    category: 'organize',
    icon: 'Scissors',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 100,
  },
  {
    slug: 'remove-pages',
    name: 'Remove PDF Pages',
    description: 'Delete unwanted pages from your PDF',
    category: 'organize',
    icon: 'Trash2',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 100,
  },
  {
    slug: 'extract-pages',
    name: 'Extract PDF Pages',
    description: 'Pull out specific pages into a new PDF',
    category: 'organize',
    icon: 'FileOutput',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 100,
  },
  {
    slug: 'organize-pdf',
    name: 'Organize PDF',
    description: 'Reorder, rotate and delete pages',
    category: 'organize',
    icon: 'LayoutGrid',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: true,
    maxFiles: 5,
    maxSizeMB: 100,
  },
  {
    slug: 'scan-to-pdf',
    name: 'Scan to PDF',
    description: 'Convert images into a PDF document',
    category: 'organize',
    icon: 'ScanLine',
    processingMode: 'client',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    multiple: true,
    maxFiles: 20,
    maxSizeMB: 40,
  },

  // Optimize PDF (3 tools)
  {
    slug: 'compress-pdf',
    name: 'Compress PDF',
    description: 'Reduce PDF file size while keeping quality',
    category: 'optimize',
    icon: 'FileDown',
    processingMode: 'server',
    acceptedFormats: ['application/pdf'],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 50,
  },
  {
    slug: 'repair-pdf',
    name: 'Repair PDF',
    description: 'Fix corrupted or damaged PDF files',
    category: 'optimize',
    icon: 'Wrench',
    processingMode: 'server',
    acceptedFormats: ['application/pdf'],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 50,
  },
  {
    slug: 'ocr-pdf',
    name: 'OCR PDF',
    description: 'Make scanned PDFs searchable and selectable',
    category: 'optimize',
    icon: 'Search',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 15,
  },

  // Convert to PDF (5 tools)
  {
    slug: 'jpg-to-pdf',
    name: 'JPG to PDF',
    description: 'Convert images to PDF format',
    category: 'convert-to',
    icon: 'ImageIcon',
    processingMode: 'client',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    multiple: true,
    maxFiles: 20,
    maxSizeMB: 40,
  },
  {
    slug: 'word-to-pdf',
    name: 'Word to PDF',
    description: 'Convert Word documents to PDF',
    category: 'convert-to',
    icon: 'FileText',
    processingMode: 'server',
    acceptedFormats: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 15,
  },
  {
    slug: 'powerpoint-to-pdf',
    name: 'PowerPoint to PDF',
    description: 'Convert presentations to PDF',
    category: 'convert-to',
    icon: 'Presentation',
    processingMode: 'server',
    acceptedFormats: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 15,
  },
  {
    slug: 'excel-to-pdf',
    name: 'Excel to PDF',
    description: 'Convert spreadsheets to PDF',
    category: 'convert-to',
    icon: 'Table',
    processingMode: 'server',
    acceptedFormats: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 15,
  },
  {
    slug: 'html-to-pdf',
    name: 'HTML to PDF',
    description: 'Convert web pages to PDF',
    category: 'convert-to',
    icon: 'Globe',
    processingMode: 'server',
    acceptedFormats: ['text/html'],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 15,
  },

  // Convert from PDF (5 tools)
  {
    slug: 'pdf-to-jpg',
    name: 'PDF to JPG',
    description: 'Convert PDF pages to image files',
    category: 'convert-from',
    icon: 'Image',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: true,
    maxFiles: 2,
    maxSizeMB: 50,
  },
  {
    slug: 'pdf-to-word',
    name: 'PDF to Word',
    description: 'Convert PDF to editable Word document',
    category: 'convert-from',
    icon: 'FileText',
    processingMode: 'server',
    acceptedFormats: ['application/pdf'],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 15,
  },
  {
    slug: 'pdf-to-powerpoint',
    name: 'PDF to PowerPoint',
    description: 'Convert PDF to PowerPoint presentation',
    category: 'convert-from',
    icon: 'Presentation',
    processingMode: 'server',
    acceptedFormats: ['application/pdf'],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 15,
  },
  {
    slug: 'pdf-to-excel',
    name: 'PDF to Excel',
    description: 'Convert PDF tables to Excel spreadsheet',
    category: 'convert-from',
    icon: 'Table',
    processingMode: 'server',
    acceptedFormats: ['application/pdf'],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 15,
  },
  {
    slug: 'pdf-to-pdfa',
    name: 'PDF to PDF/A',
    description: 'Convert PDF to archival PDF/A format',
    category: 'convert-from',
    icon: 'Archive',
    processingMode: 'server',
    acceptedFormats: ['application/pdf'],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 50,
  },

  // Edit PDF (5 tools)
  {
    slug: 'rotate-pdf',
    name: 'Rotate PDF',
    description: 'Rotate PDF pages to the right orientation',
    category: 'edit',
    icon: 'RotateCw',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: true,
    maxFiles: 20,
    maxSizeMB: 100,
  },
  {
    slug: 'add-page-numbers',
    name: 'Add PDF Page Numbers',
    description: 'Add page numbers to your PDF',
    category: 'edit',
    icon: 'Hash',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: true,
    maxFiles: 2,
    maxSizeMB: 100,
  },
  {
    slug: 'add-watermark',
    name: 'Add PDF Watermark',
    description: 'Stamp text or image over your PDF pages',
    category: 'edit',
    icon: 'Stamp',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: true,
    maxFiles: 2,
    maxSizeMB: 100,
  },
  {
    slug: 'crop-pdf',
    name: 'Crop PDF',
    description: 'Crop PDF pages to a specific region',
    category: 'edit',
    icon: 'Crop',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 100,
  },
  {
    slug: 'edit-pdf',
    name: 'Edit PDF',
    description: 'Add text, shapes and annotations to PDF',
    category: 'edit',
    icon: 'PenLine',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 100,
  },

  // PDF Security (5 tools)
  {
    slug: 'unlock-pdf',
    name: 'Unlock PDF',
    description: 'Remove password protection from a PDF',
    category: 'security',
    icon: 'LockOpen',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: true,
    maxFiles: 2,
    maxSizeMB: 100,
  },
  {
    slug: 'protect-pdf',
    name: 'Protect PDF',
    description: 'Add password protection to your PDF',
    category: 'security',
    icon: 'Lock',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: true,
    maxFiles: 2,
    maxSizeMB: 100,
  },
  {
    slug: 'sign-pdf',
    name: 'Sign PDF',
    description: 'Add your signature to a PDF document',
    category: 'security',
    icon: 'PenTool',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: true,
    maxFiles: 3,
    maxSizeMB: 50,
  },
  {
    slug: 'redact-pdf',
    name: 'Redact PDF',
    description: 'Permanently remove sensitive information',
    category: 'security',
    icon: 'EyeOff',
    processingMode: 'server',
    acceptedFormats: ['application/pdf'],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 50,
  },
  {
    slug: 'compare-pdf',
    name: 'Compare PDF',
    description: 'Show differences between two PDF files',
    category: 'security',
    icon: 'GitCompare',
    processingMode: 'client',
    acceptedFormats: ['application/pdf'],
    multiple: true,
    maxFiles: 2,
    maxSizeMB: 100,
  },

  // PDF Intelligence (2 tools)
  {
    slug: 'ai-summarizer',
    name: 'AI Summarizer',
    description: 'Generate a concise summary of your PDF',
    category: 'intelligence',
    icon: 'Sparkles',
    processingMode: 'ai',
    acceptedFormats: ['application/pdf'],
    multiple: true,
    maxFiles: 4,
    maxSizeMB: 50,
  },
  {
    slug: 'translate-pdf',
    name: 'Translate PDF',
    description: 'Translate your PDF into another language',
    category: 'intelligence',
    icon: 'Languages',
    processingMode: 'ai',
    acceptedFormats: ['application/pdf'],
    multiple: false,
    maxFiles: 1,
    maxSizeMB: 15,
  },
]

/** Returns all tools belonging to the given category, in registration order. */
export function getToolsByCategory(category: ToolCategory): Tool[] {
  return tools.filter((t) => t.category === category)
}

/** Returns the tool with the given slug, or undefined if not found. */
export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug)
}

/** Human-readable display labels for each tool category. Used by UI filter tabs. */
export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  organize: 'Organize PDF',
  optimize: 'Optimize PDF',
  'convert-to': 'Convert to PDF',
  'convert-from': 'Convert from PDF',
  edit: 'Edit PDF',
  security: 'PDF Security',
  intelligence: 'PDF Intelligence',
}

/** Ordered list of all tool categories. Determines tab order on the homepage. */
export const CATEGORIES: ToolCategory[] = [
  'organize',
  'optimize',
  'convert-to',
  'convert-from',
  'edit',
  'security',
  'intelligence',
]
