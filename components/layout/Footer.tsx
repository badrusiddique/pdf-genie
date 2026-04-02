import Link from 'next/link'
import { CATEGORIES, CATEGORY_LABELS, getToolsByCategory } from '@/config/tools'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[--color-primary] text-white/80 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl" aria-hidden>🪔</span>
              <span className="font-display text-lg font-semibold text-white">pdf-genie</span>
            </div>
            <p className="text-sm leading-relaxed text-white/60">
              Every PDF tool, beautifully simple. Free, open-source, and privacy-first.
            </p>
            <a
              href="https://github.com/badrusiddique/pdf-genie"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 text-sm text-white/60 hover:text-white transition-colors"
            >
              ★ Star on GitHub
            </a>
          </div>

          {/* Tool category columns — show first 3 categories */}
          {CATEGORIES.slice(0, 3).map(category => (
            <div key={category}>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
                {CATEGORY_LABELS[category]}
              </p>
              <ul className="space-y-1.5">
                {getToolsByCategory(category).map(tool => (
                  <li key={tool.slug}>
                    <Link
                      href={`/${tool.slug}`}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {tool.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <p>© {year} pdf-genie. Open source under the MIT License.</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com/badrusiddique/pdf-genie" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
