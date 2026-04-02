'use client'

export function HeroCTA() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <a
        href="#tools"
        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
          color: '#ffffff',
          boxShadow: '0 0 30px rgba(6,182,212,0.4), 0 4px 15px rgba(0,0,0,0.3)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow =
            '0 0 40px rgba(6,182,212,0.55), 0 8px 20px rgba(0,0,0,0.3)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow =
            '0 0 30px rgba(6,182,212,0.4), 0 4px 15px rgba(0,0,0,0.3)'
        }}
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
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
          e.currentTarget.style.color = '#F1F5F9'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          e.currentTarget.style.color = '#94A3B8'
        }}
      >
        ★ View on GitHub
      </a>
    </div>
  )
}
