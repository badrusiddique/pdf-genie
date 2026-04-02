'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import * as LucideIcons from 'lucide-react'
import { type Tool, type ToolCategory, CATEGORIES, CATEGORY_LABELS } from '@/config/tools'
import { cn } from '@/lib/utils'

// Dynamically resolve a Lucide icon by name
function ToolIcon({ name, className }: { name: string; className?: string }) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>
  const Icon = icons[name]
  if (!Icon) return <LucideIcons.FileText className={className} />
  return <Icon className={className} />
}

// More vivid category accent colors
const categoryAccent: Record<ToolCategory, string> = {
  organize: 'bg-blue-100 text-blue-700',
  optimize: 'bg-emerald-100 text-emerald-700',
  'convert-to': 'bg-amber-100 text-amber-700',
  'convert-from': 'bg-orange-100 text-orange-700',
  edit: 'bg-violet-100 text-violet-700',
  security: 'bg-rose-100 text-rose-700',
  intelligence: 'bg-indigo-100 text-indigo-700',
}

function ToolCard({ tool, index }: { tool: Tool; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18, delay: index * 0.025 }}
      layout
    >
      <Link
        href={`/${tool.slug}`}
        className="group flex flex-col gap-4 p-5 bg-white rounded-xl border border-[#E5E0D8] transition-all duration-200 hover:border-[#1B3A6B]/20 hover:shadow-lg hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] focus-visible:ring-offset-2"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        {/* Icon container - larger and more vivid */}
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110',
          categoryAccent[tool.category]
        )}>
          <ToolIcon name={tool.icon} className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-[#1A1A1A] group-hover:text-[#1B3A6B] transition-colors leading-snug mb-1.5">
            {tool.name}
          </h3>
          <p className="text-xs text-[#6B7280] leading-relaxed line-clamp-2">{tool.description}</p>
        </div>
      </Link>
    </motion.div>
  )
}

interface ToolGridProps {
  tools: Tool[]
}

export function ToolGrid({ tools }: ToolGridProps) {
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'all'>('all')

  const filtered = activeCategory === 'all'
    ? tools
    : tools.filter(t => t.category === activeCategory)

  return (
    <section aria-label="PDF tools">
      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2 mb-10" role="tablist" aria-label="Filter by category">
        {/* All button */}
        <button
          role="tab"
          aria-selected={activeCategory === 'all'}
          onClick={() => setActiveCategory('all')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-full border transition-all duration-150',
            activeCategory === 'all'
              ? 'bg-[#1B3A6B] text-white border-[#1B3A6B] shadow-sm'
              : 'bg-white text-[#6B7280] border-[#E5E0D8] hover:border-[#1B3A6B]/40 hover:text-[#1A1A1A]',
          )}
        >
          All
        </button>
        {/* Category buttons */}
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            role="tab"
            aria-selected={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-full border transition-all duration-150 whitespace-nowrap',
              activeCategory === cat
                ? 'bg-[#1B3A6B] text-white border-[#1B3A6B] shadow-sm'
                : 'bg-white text-[#6B7280] border-[#E5E0D8] hover:border-[#1B3A6B]/40 hover:text-[#1A1A1A]',
            )}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Tool cards grid — 5 columns max for breathing room */}
      <motion.div
        layout
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((tool, i) => (
            <ToolCard key={tool.slug} tool={tool} index={i} />
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}
