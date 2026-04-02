'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { CATEGORIES, CATEGORY_LABELS, getToolsByCategory } from '@/config/tools'
import { cn } from '@/lib/utils'
import { GenieLampIcon } from '@/components/ui/GenieLampIcon'

export function Navbar() {
  const [megaOpen, setMegaOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E5E0D8]"
      style={{ boxShadow: '0 1px 0 0 rgba(0,0,0,0.06)' }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6" aria-label="Main navigation">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group" aria-label="pdf-genie" onClick={() => setMobileOpen(false)}>
          <GenieLampIcon className="w-7 h-7" />
          <span className="font-display text-base font-bold tracking-widest uppercase text-[#1B3A6B]">
            PDF GENIE
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {/* All Tools mega-menu trigger */}
          <div className="relative">
            <button
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                'text-[#1A1A1A] hover:text-[#1B3A6B] hover:bg-[#F5F0E8]',
                megaOpen && 'bg-[#F5F0E8] text-[#1B3A6B]',
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
                className="absolute top-full left-0 mt-1 w-[720px] bg-white border border-[#E5E0D8] rounded-xl shadow-lg p-6 grid grid-cols-3 gap-6"
                onMouseEnter={() => setMegaOpen(true)}
                onMouseLeave={() => setMegaOpen(false)}
                role="menu"
              >
                {CATEGORIES.map(category => {
                  const categoryTools = getToolsByCategory(category).slice(0, 6)
                  return (
                    <div key={category}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-2">
                        {CATEGORY_LABELS[category]}
                      </p>
                      <ul className="space-y-1">
                        {categoryTools.map(tool => (
                          <li key={tool.slug}>
                            <Link
                              href={`/${tool.slug}`}
                              className="block text-sm text-[#1A1A1A] hover:text-[#1B3A6B] py-0.5 transition-colors"
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
                className="px-3 py-2 text-sm font-medium text-[#1A1A1A] hover:text-[#1B3A6B] hover:bg-[#F5F0E8] rounded-lg transition-colors"
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* Mobile hamburger */}
        <button
          className="ml-auto md:hidden p-2 rounded-lg text-[#1A1A1A] hover:bg-[#F5F0E8] transition-colors"
          onClick={() => setMobileOpen(v => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E5E0D8] bg-white max-h-[80vh] overflow-y-auto">
          {CATEGORIES.map(category => {
            const categoryTools = getToolsByCategory(category)
            return (
              <div key={category} className="px-4 py-3 border-b border-[#E5E0D8] last:border-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-2">
                  {CATEGORY_LABELS[category]}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {categoryTools.map(tool => (
                    <Link
                      key={tool.slug}
                      href={`/${tool.slug}`}
                      className="text-sm text-[#1A1A1A] hover:text-[#1B3A6B] py-1 transition-colors"
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
