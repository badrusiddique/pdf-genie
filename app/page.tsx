import { Metadata } from 'next'
import { tools } from '@/config/tools'
import { ToolGrid } from '@/components/layout/ToolGrid'
import { GenieLampIcon } from '@/components/ui/GenieLampIcon'

export const metadata: Metadata = {
  title: 'PDF Genie - Every PDF tool, beautifully simple',
  description: 'Free online PDF tools - merge, split, compress, convert, edit, sign and more. 31 tools, no signup required, 100% private.',
  openGraph: {
    title: 'PDF Genie - Every PDF tool, beautifully simple',
    description: 'Free online PDF tools. No signup required.',
  },
}

// Floating star particles (CSS animated, no JS library)
function StarField() {
  const stars = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 60,
    size: Math.random() * 2 + 0.5,
    delay: Math.random() * 4,
    duration: Math.random() * 3 + 2,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {stars.map(star => (
        <div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            background: star.id % 3 === 0 ? '#F59E0B' : star.id % 3 === 1 ? '#A78BFA' : '#ffffff',
            opacity: 0,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-20 text-center overflow-hidden">
        <StarField />

        {/* Glow orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />
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

        {/* CTA row */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="#tools"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
              color: '#ffffff',
              boxShadow: '0 0 30px rgba(124,58,237,0.4), 0 4px 15px rgba(0,0,0,0.3)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(124,58,237,0.5), 0 8px 20px rgba(0,0,0,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(124,58,237,0.4), 0 4px 15px rgba(0,0,0,0.3)' }}
          >
            ✦ Explore all tools
          </a>
          <a
            href="https://github.com/badrusiddique/pdf-genie"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94A3B8',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#F1F5F9' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94A3B8' }}
          >
            ★ View on GitHub
          </a>
        </div>
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
