'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { CATEGORIES, CATEGORY_LABELS, getToolsByCategory } from '@/config/tools'
import { cn } from '@/lib/utils'

export function Navbar() {
  const [megaOpen, setMegaOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[--color-surface] border-b border-[--color-border] shadow-[--shadow-sm]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6" aria-label="Main navigation">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setMobileOpen(false)}>
          <span className="text-xl" aria-hidden>🪔</span>
          <span className="font-display text-lg font-semibold text-[--color-primary]">pdf-genie</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {/* All Tools mega-menu trigger */}
          <div className="relative">
            <button
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-[--radius] transition-colors',
                'text-[--color-text] hover:bg-[--color-bg]',
                megaOpen && 'bg-[--color-bg]',
              )}
              onMouseEnter={() => setMegaOpen(true)}
              onMouseLeave={() => setMegaOpen(false)}
              onClick={() => setMegaOpen(v => !v)}
              aria-expanded={megaOpen}
              aria-haspopup="true"
            >
              All PDF Tools
              <ChevronDown className={cn('w-4 h-4 transition-transform', megaOpen && 'rotate-180')} />
            </button>

            {/* Mega-menu dropdown */}
            {megaOpen && (
              <div
                className="absolute top-full left-0 mt-1 w-[720px] bg-[--color-surface] border border-[--color-border] rounded-[--radius-lg] shadow-[--shadow-lg] p-6 grid grid-cols-3 gap-6"
                onMouseEnter={() => setMegaOpen(true)}
                onMouseLeave={() => setMegaOpen(false)}
                role="menu"
              >
                {CATEGORIES.map(category => {
                  const categoryTools = getToolsByCategory(category).slice(0, 6)
                  return (
                    <div key={category}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[--color-muted] mb-2">
                        {CATEGORY_LABELS[category]}
                      </p>
                      <ul className="space-y-1">
                        {categoryTools.map(tool => (
                          <li key={tool.slug}>
                            <Link
                              href={`/${tool.slug}`}
                              className="block text-sm text-[--color-text] hover:text-[--color-primary] py-0.5 transition-colors"
                              onClick={() => setMegaOpen(false)}
                              role="menuitem"
                            >
                              {tool.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick links */}
          {['merge-pdf', 'split-pdf', 'compress-pdf'].map(slug => {
            const href = `/${slug}`
            const label = slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
            return (
              <Link
                key={slug}
                href={href}
                className="px-3 py-2 text-sm font-medium text-[--color-text] hover:text-[--color-primary] hover:bg-[--color-bg] rounded-[--radius] transition-colors"
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* Mobile hamburger */}
        <button
          className="ml-auto md:hidden p-2 rounded-[--radius] text-[--color-text] hover:bg-[--color-bg] transition-colors"
          onClick={() => setMobileOpen(v => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[--color-border] bg-[--color-surface] max-h-[80vh] overflow-y-auto">
          {CATEGORIES.map(category => {
            const categoryTools = getToolsByCategory(category)
            return (
              <div key={category} className="px-4 py-3 border-b border-[--color-border] last:border-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[--color-muted] mb-2">
                  {CATEGORY_LABELS[category]}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {categoryTools.map(tool => (
                    <Link
                      key={tool.slug}
                      href={`/${tool.slug}`}
                      className="text-sm text-[--color-text] hover:text-[--color-primary] py-1 transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      {tool.name}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </header>
  )
}
