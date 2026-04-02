import Link from 'next/link'
import { GenieLampIcon } from '@/components/ui/GenieLampIcon'
import { CATEGORIES, CATEGORY_LABELS, getToolsByCategory } from '@/config/tools'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{ background: 'rgba(2,11,16,0.95)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <GenieLampIcon className="w-8 h-8" animated />
              <span className="font-display text-sm font-bold tracking-[0.2em] uppercase" style={{ color: '#F1F5F9' }}>
                PDF <span style={{ color: '#F59E0B' }}>GENIE</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed mb-5" style={{ color: '#475569' }}>
              Every PDF tool, beautifully simple. Free, open-source, and privacy-first.
            </p>
            <a
              href="https://github.com/badrusiddique/pdf-genie"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all duration-200"
              style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#22D3EE' }}
            >
              ★ Star on GitHub
            </a>
          </div>

          {/* Tool columns - first 4 categories */}
          {CATEGORIES.slice(0, 4).map(category => (
            <div key={category}>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#06B6D4', letterSpacing: '0.12em' }}>
                {CATEGORY_LABELS[category]}
              </p>
              <ul className="space-y-2">
                {getToolsByCategory(category).map(tool => (
                  <li key={tool.slug}>
                    <Link
                      href={`/${tool.slug}`}
                      className="text-xs transition-colors duration-150 hover:text-[#94A3B8]"
                      style={{ color: '#475569' }}
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
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-xs" style={{ color: '#334155' }}>
            © {year} PDF Genie. Open source under the MIT License.
          </p>
          <div className="flex items-center gap-6 text-xs" style={{ color: '#334155' }}>
            <a href="https://github.com/badrusiddique/pdf-genie" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#94A3B8]">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
