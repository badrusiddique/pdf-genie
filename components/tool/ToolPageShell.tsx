import type { Tool } from '@/config/tools'
import { CATEGORY_LABELS } from '@/config/tools'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface ToolPageShellProps {
  tool: Tool
  children: React.ReactNode
}

const categoryGradient: Record<Tool['category'], string> = {
  organize:       'from-blue-600/20 to-transparent',
  optimize:       'from-emerald-600/20 to-transparent',
  'convert-to':   'from-amber-600/20 to-transparent',
  'convert-from': 'from-orange-600/20 to-transparent',
  edit:           'from-violet-600/20 to-transparent',
  security:       'from-rose-600/20 to-transparent',
  intelligence:   'from-pink-600/20 to-transparent',
}

const categoryIconBg: Record<Tool['category'], string> = {
  organize:       'from-blue-500 to-blue-700',
  optimize:       'from-emerald-500 to-emerald-700',
  'convert-to':   'from-amber-500 to-amber-700',
  'convert-from': 'from-orange-500 to-orange-700',
  edit:           'from-violet-500 to-violet-700',
  security:       'from-rose-500 to-rose-700',
  intelligence:   'from-pink-500 to-pink-700',
}

export function ToolPageShell({ tool, children }: ToolPageShellProps) {
  return (
    <main className="min-h-screen">
      {/* Gradient header band */}
      <div className={`bg-gradient-to-b ${categoryGradient[tool.category]} border-b border-white/5`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-10">

          {/* Breadcrumb — pure server, no hover handlers */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs mb-6" style={{ color: '#475569' }}>
            <Link href="/" className="hover:text-[#94A3B8] transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3 opacity-40" />
            <Link href="/" className="hover:text-[#94A3B8] transition-colors">{CATEGORY_LABELS[tool.category]}</Link>
            <ChevronRight className="w-3 h-3 opacity-40" />
            <span style={{ color: '#94A3B8' }}>{tool.name}</span>
          </nav>

          {/* Tool identity */}
          <div className="flex items-start gap-5">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${categoryIconBg[tool.category]} flex items-center justify-center shrink-0`}
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
              aria-hidden
            >
              <span className="text-xl text-white/80">✦</span>
            </div>
            <div>
              <h1
                className="font-display text-3xl sm:text-4xl font-semibold mb-2 leading-tight"
                style={{ color: '#F1F5F9' }}
              >
                {tool.name}
              </h1>
              <p className="text-base" style={{ color: '#94A3B8' }}>
                {tool.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {children}
      </div>
    </main>
  )
}
