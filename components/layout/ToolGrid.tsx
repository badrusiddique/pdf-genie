'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import * as LucideIcons from 'lucide-react'
import { type Tool, type ToolCategory, CATEGORIES, CATEGORY_LABELS } from '@/config/tools'

function ToolIcon({ name, className }: { name: string; className?: string }) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>
  const Icon = icons[name]
  if (!Icon) return <LucideIcons.FileText className={className} />
  return <Icon className={className} />
}

// Category gradients for icon backgrounds
const categoryGradient: Record<ToolCategory, string> = {
  organize: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
  optimize: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  'convert-to': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  'convert-from': 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
  edit: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  security: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  intelligence: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
}

const categoryGlow: Record<ToolCategory, string> = {
  organize: 'rgba(59,130,246,0.3)',
  optimize: 'rgba(16,185,129,0.3)',
  'convert-to': 'rgba(245,158,11,0.3)',
  'convert-from': 'rgba(249,115,22,0.3)',
  edit: 'rgba(139,92,246,0.3)',
  security: 'rgba(239,68,68,0.3)',
  intelligence: 'rgba(236,72,153,0.3)',
}

function ToolCard({ tool, index }: { tool: Tool; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      layout
    >
      <Link
        href={`/${tool.slug}`}
        className="group flex flex-col gap-4 p-5 rounded-2xl h-full transition-all duration-300 focus-visible:outline-none"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
          e.currentTarget.style.borderColor = 'rgba(124,58,237,0.35)'
          e.currentTarget.style.transform = 'translateY(-3px)'
          e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(124,58,237,0.1)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        {/* Icon with gradient bg */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
          style={{
            background: categoryGradient[tool.category],
            boxShadow: `0 4px 15px ${categoryGlow[tool.category]}`,
          }}
        >
          <ToolIcon name={tool.icon} className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h3
            className="font-semibold text-sm leading-snug mb-1.5 transition-colors duration-200"
            style={{ color: '#F1F5F9' }}
          >
            {tool.name}
          </h3>
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#64748B' }}>
            {tool.description}
          </p>
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
      {/* Category tabs */}
      <div
        className="flex flex-wrap gap-2 mb-10 p-1 rounded-2xl"
        role="tablist"
        aria-label="Filter by category"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          role="tab"
          aria-selected={activeCategory === 'all'}
          onClick={() => setActiveCategory('all')}
          className="px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-200"
          style={activeCategory === 'all' ? {
            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
          } : {
            color: '#64748B',
            background: 'transparent',
          }}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            role="tab"
            aria-selected={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
            className="px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-200 whitespace-nowrap"
            style={activeCategory === cat ? {
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
            } : {
              color: '#64748B',
              background: 'transparent',
            }}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Grid */}
      <motion.div
        layout
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
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
