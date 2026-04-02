// PDF Web Worker — runs pdf-lib operations off the main thread
// This prevents large PDF processing from blocking the UI

import { mergePdfs } from '@/lib/pdf/merge'
import { splitPdfByRanges, splitPdfToPages, splitPdfIntoChunks } from '@/lib/pdf/split'
import { removePagesFromPdf } from '@/lib/pdf/removePages'
import { extractPagesFromPdf } from '@/lib/pdf/extractPages'
import { organizePdf } from '@/lib/pdf/organize'
import { imagesToPdf } from '@/lib/pdf/scanToPdf'

export type WorkerMessage =
  | { type: 'merge'; pdfs: Uint8Array[] }
  | { type: 'split-ranges'; pdf: Uint8Array; ranges: { from: number; to: number }[] }
  | { type: 'split-pages'; pdf: Uint8Array }
  | { type: 'split-chunks'; pdf: Uint8Array; chunkSize: number }
  | { type: 'remove-pages'; pdf: Uint8Array; pageNumbers: number[] }
  | { type: 'extract-pages'; pdf: Uint8Array; pageNumbers: number[] }
  | { type: 'organize'; pdf: Uint8Array; operations: { sourceIndex: number; rotation?: 0 | 90 | 180 | 270 }[] }
  | { type: 'scan-to-pdf'; images: { bytes: Uint8Array; mimeType: 'image/jpeg' | 'image/png' }[]; options?: Record<string, unknown> }

export type WorkerResponse =
  | { type: 'success'; result: Uint8Array | Uint8Array[] }
  | { type: 'error'; message: string }

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  try {
    let result: Uint8Array | Uint8Array[]

    switch (e.data.type) {
      case 'merge':
        result = await mergePdfs(e.data.pdfs)
        break
      case 'split-ranges':
        result = await splitPdfByRanges(e.data.pdf, e.data.ranges)
        break
      case 'split-pages':
        result = await splitPdfToPages(e.data.pdf)
        break
      case 'split-chunks':
        result = await splitPdfIntoChunks(e.data.pdf, e.data.chunkSize)
        break
      case 'remove-pages':
        result = await removePagesFromPdf(e.data.pdf, e.data.pageNumbers)
        break
      case 'extract-pages':
        result = await extractPagesFromPdf(e.data.pdf, e.data.pageNumbers)
        break
      case 'organize':
        result = await organizePdf(e.data.pdf, e.data.operations)
        break
      case 'scan-to-pdf':
        result = await imagesToPdf(e.data.images, e.data.options as Parameters<typeof imagesToPdf>[1])
        break
      default:
        throw new Error(`Unknown worker message type`)
    }

    self.postMessage({ type: 'success', result } satisfies WorkerResponse)
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    } satisfies WorkerResponse)
  }
}
