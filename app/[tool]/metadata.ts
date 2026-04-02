import type { Metadata } from 'next'
import { getToolBySlug, CATEGORY_LABELS } from '@/config/tools'

interface Props {
  params: Promise<{ tool: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool: slug } = await params
  const tool = getToolBySlug(slug)
  if (!tool) return { title: 'Tool not found' }

  return {
    title: tool.name,
    description: `${tool.description} Free, fast, and secure. No signup required.`,
    openGraph: {
      title: `${tool.name} — pdf-genie`,
      description: tool.description,
    },
    other: {
      'schema:type': 'WebApplication',
    },
  }
}
