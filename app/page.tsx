import { Metadata } from 'next'
import { tools } from '@/config/tools'
import { ToolGrid } from '@/components/layout/ToolGrid'
import { GenieLampIcon } from '@/components/ui/GenieLampIcon'
import { StarField } from '@/components/layout/StarField'
import { HeroCTA } from '@/components/layout/HeroCTA'

export const metadata: Metadata = {
  title: 'PDF Genie - Every PDF tool, beautifully simple',
  description: 'Free online PDF tools - merge, split, compress, convert, edit, sign and more. 31 tools, no signup required, 100% private.',
  openGraph: {
    title: 'PDF Genie - Every PDF tool, beautifully simple',
    description: 'Free online PDF tools. No signup required.',
  },
}

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-20 text-center overflow-hidden">
        <StarField />

        {/* Glow orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.20) 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(236,72,153,0.06) 0%, transparent 70%)' }} />
        </div>

        {/* Floating genie icon above heading */}
        <div className="flex justify-center mb-6">
          <div className="animate-float" style={{ filter: 'drop-shadow(0 0 20px rgba(124,58,237,0.5))' }}>
            <GenieLampIcon className="w-16 h-16" animated />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-medium" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#A78BFA' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          31 free tools - no signup - files never stored
        </div>

        {/* Headline */}
        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold text-balance leading-[1.05] mb-6">
          <span style={{ color: '#F1F5F9' }}>Every PDF tool,</span>
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 50%, #F59E0B 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shimmer 4s linear infinite',
          }}>
            beautifully simple.
          </span>
        </h1>

        <p className="text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-10 text-balance" style={{ color: '#94A3B8' }}>
          Merge, split, compress, convert, edit, and sign PDFs.
          Browser-based when possible - your files stay private.
        </p>

        {/* CTA row — client component (needs hover handlers) */}
        <HeroCTA />
      </section>

      {/* Tool grid section */}
      <section id="tools" className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* Section label */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.3))' }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#7C3AED' }}>31 TOOLS</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.3), transparent)' }} />
        </div>
        <ToolGrid tools={tools} />
      </section>

      {/* Trust strip */}
      <section className="py-12 mx-4 sm:mx-6 mb-8 rounded-2xl" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: '🔒', title: 'Private by design', desc: 'Files never stored on servers' },
              { icon: '⚡', title: 'Browser processing', desc: 'Runs locally when possible' },
              { icon: '🆓', title: 'Always free', desc: 'No signup, no limits' },
              { icon: '📖', title: 'Open source', desc: 'MIT licensed on GitHub' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="text-2xl mb-2">{icon}</div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#F1F5F9' }}>{title}</p>
                <p className="text-xs" style={{ color: '#64748B' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
