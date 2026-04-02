import type { Tool } from '@/config/tools'
import { CATEGORY_LABELS } from '@/config/tools'
import { CategoryBadge } from '@/components/ui'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface ToolPageShellProps {
  tool: Tool
  children: React.ReactNode
}

export function ToolPageShell({ tool, children }: ToolPageShellProps) {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-[--color-muted] mb-6">
        <Link href="/" className="hover:text-[--color-text] transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span>{CATEGORY_LABELS[tool.category]}</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[--color-text]">{tool.name}</span>
      </nav>

      {/* Tool header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <CategoryBadge category={tool.category} label={CATEGORY_LABELS[tool.category]} />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[--color-primary] mb-2">
          {tool.name}
        </h1>
        <p className="text-[--color-muted] text-base">{tool.description}</p>
      </div>

      {/* Tool content */}
      <div className="bg-[--color-surface] rounded-[--radius-xl] border border-[--color-border] shadow-[--shadow] p-6 sm:p-8">
        {children}
      </div>
    </main>
  )
}
