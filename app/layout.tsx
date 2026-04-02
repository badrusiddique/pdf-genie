import type { Metadata } from 'next'
import { Fraunces, Instrument_Sans } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout'
import { Footer } from '@/components/layout'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz', 'SOFT', 'WONK'],
})

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'pdf-genie — Every PDF tool, beautifully simple',
    template: '%s | pdf-genie',
  },
  description: 'Free online PDF tools — merge, split, compress, convert, edit, sign and more. Fast, private, no signup required.',
  keywords: ['PDF', 'merge PDF', 'split PDF', 'compress PDF', 'convert PDF', 'PDF tools'],
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    siteName: 'pdf-genie',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${instrumentSans.variable}`}>
      <body className="min-h-screen" style={{ background: '#060B18', color: '#F1F5F9' }}>
        <Navbar />
        <div className="pt-14">{children}</div>
        <Footer />
      </body>
    </html>
  )
}
