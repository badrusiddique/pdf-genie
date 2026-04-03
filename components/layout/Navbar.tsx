'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown, Menu, X, Sparkles } from 'lucide-react'
import { CATEGORIES, CATEGORY_LABELS, getToolsByCategory } from '@/config/tools'
import { GenieLampIcon } from '@/components/ui/GenieLampIcon'
import { cn } from '@/lib/utils'

const AVAILABLE_SLUGS = new Set([
  'merge-pdf', 'split-pdf', 'remove-pages', 'extract-pages', 'organize-pdf', 'scan-to-pdf',
  'compress-pdf', 'jpg-to-pdf', 'html-to-pdf', 'word-to-pdf', 'excel-to-pdf', 'powerpoint-to-pdf',
  'ai-summarizer', 'translate-pdf', 'pdf-qa',
])

export function Navbar() {
  const [megaOpen, setMegaOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(2,11,16,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6"
        aria-label="Main navigation"
      >
        {/* Brand */}
        <Link
          href="/"
          aria-label="pdf-genie"
          className="flex items-center gap-2.5 shrink-0 group"
          onClick={() => setMobileOpen(false)}
        >
          <GenieLampIcon className="w-8 h-8 transition-transform duration-300 group-hover:scale-110" animated />
          <span
            className="font-display text-sm font-bold tracking-[0.2em] uppercase"
            style={{ color: '#F1F5F9' }}
          >
            PDF{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              GENIE
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {/* All Tools mega-menu */}
          <div
            className="relative"
            onMouseEnter={() => setMegaOpen(true)}
            onMouseLeave={() => setMegaOpen(false)}
          >
            <button
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                'text-[#94A3B8] hover:text-[#F1F5F9]',
                megaOpen && 'text-[#F1F5F9] bg-white/5',
              )}
              style={{ fontSize: '13px' }}
              onClick={() => setMegaOpen(v => !v)}
              aria-expanded={megaOpen}
              aria-haspopup="true"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
              All PDF Tools
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', megaOpen && 'rotate-180')} />
            </button>

            {/* Mega-menu — pt-2 instead of mt-2 keeps hover area continuous with the button */}
            {megaOpen && (
              <div
                className="absolute top-full left-0 pt-2 w-[760px]"
                role="menu"
              >
              <div
                style={{
                  background: 'rgba(7,21,37,0.95)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(6,182,212,0.2)',
                  borderRadius: '16px',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(6,182,212,0.1)',
                  padding: '24px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '20px',
                }}
              >
                {CATEGORIES.map(category => {
                  const categoryTools = getToolsByCategory(category).slice(0, 5)
                  return (
                    <div key={category}>
                      <p style={{ color: '#06B6D4', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                        {CATEGORY_LABELS[category]}
                      </p>
                      <ul className="space-y-1">
                        {categoryTools.map(tool => (
                          <li key={tool.slug}>
                            <Link
                              href={`/${tool.slug}`}
                              className="flex items-center justify-between py-1 transition-colors duration-150"
                              style={{ fontSize: '12px', color: '#94A3B8' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#F1F5F9')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
                              onClick={() => setMegaOpen(false)}
                              role="menuitem"
                            >
                              <span>{tool.name}</span>
                              {!AVAILABLE_SLUGS.has(tool.slug) && (
                                <span style={{
                                  fontSize: '8px',
                                  fontWeight: 700,
                                  letterSpacing: '0.05em',
                                  textTransform: 'uppercase',
                                  background: 'rgba(100,116,139,0.25)',
                                  border: '1px solid rgba(100,116,139,0.3)',
                                  color: '#64748B',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  flexShrink: 0,
                                }}>
                                  Soon
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
              </div>
            )}
          </div>

          {/* Quick links */}
          {([
            { slug: 'merge-pdf', label: 'Merge PDF' },
            { slug: 'split-pdf', label: 'Split PDF' },
            { slug: 'ai-summarizer', label: 'AI Summarizer' },
            { slug: 'pdf-qa', label: 'PDF Q&A' },
          ] as { slug: string; label: string }[]).map(({ slug, label }) => (
            <Link
              key={slug}
              href={`/${slug}`}
              className="px-4 py-2 rounded-lg transition-all duration-200"
              style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 500 }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#F1F5F9'
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#94A3B8'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <a
          href="https://github.com/badrusiddique/pdf-genie"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200"
          style={{
            background: 'rgba(6,182,212,0.15)',
            border: '1px solid rgba(6,182,212,0.3)',
            color: '#22D3EE',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(6,182,212,0.25)'
            e.currentTarget.style.borderColor = 'rgba(6,182,212,0.5)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(6,182,212,0.15)'
            e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'
          }}
        >
          ★ Star on GitHub
        </a>

        {/* Mobile hamburger */}
        <button
          className="ml-auto md:hidden p-2 rounded-lg transition-colors"
          style={{ color: '#94A3B8' }}
          onClick={() => setMobileOpen(v => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden max-h-[80vh] overflow-y-auto"
          style={{
            background: 'rgba(2,11,16,0.98)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {CATEGORIES.map(category => {
            const categoryTools = getToolsByCategory(category)
            return (
              <div key={category} className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#06B6D4', letterSpacing: '0.12em' }}>
                  {CATEGORY_LABELS[category]}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {categoryTools.map(tool => (
                    <Link
                      key={tool.slug}
                      href={`/${tool.slug}`}
                      className="text-sm py-1 transition-colors"
                      style={{ color: '#94A3B8' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#F1F5F9')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
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
