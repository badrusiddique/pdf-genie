import { notFound } from 'next/navigation'
import { getToolBySlug } from '@/config/tools'
import { ToolPageShell } from '@/components/tool'
import { generateMetadata as generateToolMetadata } from './metadata'

export { generateToolMetadata as generateMetadata }

// Generate static params for all tools at build time
export async function generateStaticParams() {
  const { tools } = await import('@/config/tools')
  return tools.map(tool => ({ tool: tool.slug }))
}

interface ToolPageProps {
  params: Promise<{ tool: string }>
}

// Lazy-load tool-specific components
async function getToolComponent(slug: string) {
  switch (slug) {
    case 'merge-pdf': return (await import('@/components/tool/tools/MergePdfTool')).MergePdfTool
    case 'split-pdf': return (await import('@/components/tool/tools/SplitPdfTool')).SplitPdfTool
    case 'remove-pages': return (await import('@/components/tool/tools/RemovePagesTool')).RemovePagesTool
    case 'extract-pages': return (await import('@/components/tool/tools/ExtractPagesTool')).ExtractPagesTool
    case 'organize-pdf': return (await import('@/components/tool/tools/OrganizePdfTool')).OrganizePdfTool
    case 'scan-to-pdf': return (await import('@/components/tool/tools/ScanToPdfTool')).ScanToPdfTool
    case 'compress-pdf': return (await import('@/components/tool/tools/CompressPdfTool')).CompressPdfTool
    case 'jpg-to-pdf': return (await import('@/components/tool/tools/JpgToPdfTool')).JpgToPdfTool
    case 'html-to-pdf': return (await import('@/components/tool/tools/HtmlToPdfTool')).HtmlToPdfTool
    case 'word-to-pdf': return (await import('@/components/tool/tools/WordToPdfTool')).WordToPdfTool
    case 'excel-to-pdf': return (await import('@/components/tool/tools/ExcelToPdfTool')).ExcelToPdfTool
    case 'powerpoint-to-pdf': return (await import('@/components/tool/tools/PowerPointToPdfTool')).PowerPointToPdfTool
    case 'ai-summarizer': return (await import('@/components/tool/tools/AiSummarizerTool')).AiSummarizerTool
    case 'translate-pdf': return (await import('@/components/tool/tools/TranslatePdfTool')).TranslatePdfTool
    case 'pdf-qa': return (await import('@/components/tool/tools/PdfQaTool')).PdfQaTool
    case 'arabic-pdf-translator': return (await import('@/components/tool/tools/ArabicPdfTranslatorTool')).ArabicPdfTranslatorTool
    default: return null
  }
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { tool: slug } = await params
  const tool = getToolBySlug(slug)
  if (!tool) notFound()

  const ToolComponent = await getToolComponent(slug)

  return (
    <ToolPageShell tool={tool}>
      {ToolComponent
        ? <ToolComponent tool={tool} />
        : (
          <div className="text-center py-12 text-[--color-muted]">
            <p className="font-display text-2xl mb-2">Coming soon</p>
            <p className="text-sm">This tool is being built. Check back soon.</p>
          </div>
        )
      }
    </ToolPageShell>
  )
}
