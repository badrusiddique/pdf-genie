import type { Tool } from '@/config/tools'
import { CATEGORY_LABELS } from '@/config/tools'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface ToolPageShellProps {
  tool: Tool
  /** Tool component — renders its own ToolLayout internally */
  children: React.ReactNode
}

/**
 * Provides the top header band (breadcrumb + tool title) and wraps the page.
 * The actual two-column workspace layout is rendered by each tool component
 * via <ToolLayout />, so this shell stays server-renderable.
 */
export function ToolPageShell({ tool, children }: ToolPageShellProps) {
  const gradientFrom: Record<Tool['category'], string> = {
    organize:       'from-blue-600/10',
    optimize:       'from-emerald-600/10',
    'convert-to':   'from-amber-600/10',
    'convert-from': 'from-orange-600/10',
    edit:           'from-violet-600/10',
    security:       'from-rose-600/10',
    intelligence:   'from-pink-600/10',
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* Tool header */}
      <div
        className={`bg-gradient-to-b ${gradientFrom[tool.category]} to-transparent px-6 sm:px-8 pt-8 pb-6 shrink-0`}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs mb-4"
          style={{ color: '#475569' }}
        >
          <Link href="/" className="hover:text-[#94A3B8] transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3 opacity-40" />
          <Link href="/" className="hover:text-[#94A3B8] transition-colors">
            {CATEGORY_LABELS[tool.category]}
          </Link>
          <ChevronRight className="w-3 h-3 opacity-40" />
          <span style={{ color: '#94A3B8' }}>{tool.name}</span>
        </nav>

        <h1
          className="font-display text-2xl sm:text-3xl font-semibold"
          style={{ color: '#F1F5F9' }}
        >
          {tool.name}
        </h1>
      </div>

      {/* Tool workspace — rendered by tool component via ToolLayout */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
