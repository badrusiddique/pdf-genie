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

// Category color accent for icon bg
const categoryAccent: Record<ToolCategory, string> = {
  organize: 'bg-blue-50 text-blue-600',
  optimize: 'bg-green-50 text-green-600',
  'convert-to': 'bg-amber-50 text-amber-600',
  'convert-from': 'bg-orange-50 text-orange-600',
  edit: 'bg-purple-50 text-purple-600',
  security: 'bg-red-50 text-red-600',
  intelligence: 'bg-indigo-50 text-indigo-600',
}

function ToolCard({ tool, index }: { tool: Tool; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      layout
    >
      <Link
        href={`/${tool.slug}`}
        className={cn(
          'group flex flex-col gap-3 p-5 bg-[--color-surface] rounded-[--radius-lg]',
          'border border-[--color-border] hover:border-[--color-primary]/30',
          'shadow-[--shadow-sm] hover:shadow-[--shadow-md]',
          'transition-all duration-200 hover:-translate-y-0.5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]',
        )}
      >
        <div className={cn('w-10 h-10 rounded-[--radius] flex items-center justify-center shrink-0', categoryAccent[tool.category])}>
          <ToolIcon name={tool.icon} className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-[--color-text] group-hover:text-[--color-primary] transition-colors leading-tight mb-1">
            {tool.name}
          </h3>
          <p className="text-xs text-[--color-muted] leading-relaxed line-clamp-2">{tool.description}</p>
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
      <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Filter by category">
        <button
          role="tab"
          aria-selected={activeCategory === 'all'}
          onClick={() => setActiveCategory('all')}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-full border transition-all',
            activeCategory === 'all'
              ? 'bg-[--color-primary] text-white border-[--color-primary]'
              : 'bg-[--color-surface] text-[--color-muted] border-[--color-border] hover:border-[--color-primary]/40 hover:text-[--color-text]',
          )}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            role="tab"
            aria-selected={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-full border transition-all',
              activeCategory === cat
                ? 'bg-[--color-primary] text-white border-[--color-primary]'
                : 'bg-[--color-surface] text-[--color-muted] border-[--color-border] hover:border-[--color-primary]/40 hover:text-[--color-text]',
            )}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Tool cards grid */}
      <motion.div
        layout
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((tool, i) => (
            <ToolCard key={tool.slug} tool={tool} index={i} />
          ))}
        </AnimatePresence>
      </motion.div>

      <p className="mt-4 text-xs text-[--color-muted] text-right">
        {filtered.length} tool{filtered.length !== 1 ? 's' : ''}
        {activeCategory !== 'all' && ` in ${CATEGORY_LABELS[activeCategory]}`}
      </p>
    </section>
  )
}
