import { Metadata } from 'next'
import { tools } from '@/config/tools'
import { ToolGrid } from '@/components/layout/ToolGrid'

export const metadata: Metadata = {
  title: 'pdf-genie — Every PDF tool, beautifully simple',
  description: 'Free online PDF tools — merge, split, compress, convert, edit, sign and more. 31 tools, no signup required, 100% private.',
  openGraph: {
    title: 'pdf-genie — Every PDF tool, beautifully simple',
    description: 'Free online PDF tools. No signup required.',
  },
}

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold text-[--color-primary] text-balance mb-4 leading-tight">
          Every PDF tool,<br />
          <span className="text-[--color-accent]">beautifully simple.</span>
        </h1>
        <p className="text-base sm:text-lg text-[--color-muted] max-w-2xl mx-auto text-balance">
          31 free tools to work with PDFs — merge, split, compress, convert, edit, and more.
          No signup. No limits. Runs in your browser.
        </p>
      </section>

      {/* Tool grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <ToolGrid tools={tools} />
      </section>

      {/* Trust strip */}
      <section className="bg-[--color-surface] border-y border-[--color-border] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap justify-center gap-8 text-sm text-[--color-muted]">
          <span className="flex items-center gap-2">🔒 Files never stored on our servers</span>
          <span className="flex items-center gap-2">⚡ Processed in your browser when possible</span>
          <span className="flex items-center gap-2">🆓 100% free, no signup required</span>
          <span className="flex items-center gap-2">📖 Open source on GitHub</span>
        </div>
      </section>
    </main>
  )
}
