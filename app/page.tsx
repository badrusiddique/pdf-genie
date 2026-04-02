import { Metadata } from 'next'
import { tools } from '@/config/tools'
import { ToolGrid } from '@/components/layout/ToolGrid'

export const metadata: Metadata = {
  title: 'PDF GENIE — Every PDF tool, beautifully simple',
  description: 'Free online PDF tools — merge, split, compress, convert, edit, sign and more. 31 tools, no signup required, 100% private.',
  openGraph: {
    title: 'PDF GENIE — Every PDF tool, beautifully simple',
    description: 'Free online PDF tools. No signup required.',
  },
}

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-14 text-center relative">
        {/* Subtle background orb */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden
        >
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #1B3A6B 0%, transparent 70%)' }}
          />
        </div>

        {/* Pill badge above headline */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E5E0D8] bg-white text-xs font-medium text-[#6B7280] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
          31 free tools · no signup · runs in your browser
        </div>

        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-semibold text-[#1B3A6B] text-balance mb-5 leading-[1.1]">
          Every PDF tool,
          <br />
          <span style={{ color: '#F59E0B' }}>beautifully simple.</span>
        </h1>

        <p className="text-base sm:text-lg text-[#6B7280] max-w-xl mx-auto text-balance leading-relaxed">
          Merge, split, compress, convert, edit, and sign PDFs.
          Files never leave your device unless you need server processing.
        </p>
      </section>

      {/* Tool grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <ToolGrid tools={tools} />
      </section>

      {/* Trust strip */}
      <section style={{ backgroundColor: '#1B3A6B' }} className="py-10 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
            {[
              { icon: '🔒', text: 'Files never stored on our servers' },
              { icon: '⚡', text: 'Browser processing when possible' },
              { icon: '🆓', text: '100% free, no signup' },
              { icon: '📖', text: 'Open source on GitHub' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                <span className="text-base">{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
