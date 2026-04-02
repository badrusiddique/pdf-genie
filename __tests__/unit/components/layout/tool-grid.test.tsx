import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { ToolGrid } from '@/components/layout/ToolGrid'
import { tools } from '@/config/tools'

describe('ToolGrid', () => {
  it('renders all tools initially', () => {
    render(<ToolGrid tools={tools} />)
    expect(screen.getAllByRole('link').length).toBe(tools.length)
  })

  it('renders All filter as selected by default', () => {
    render(<ToolGrid tools={tools} />)
    const allTab = screen.getByRole('tab', { name: 'All' })
    expect(allTab).toHaveAttribute('aria-selected', 'true')
  })

  it('filters tools when category tab clicked', async () => {
    const user = userEvent.setup()
    render(<ToolGrid tools={tools} />)
    const organizeTab = screen.getByRole('tab', { name: 'Organize PDF' })
    await user.click(organizeTab)
    expect(organizeTab).toHaveAttribute('aria-selected', 'true')
    // Organize PDF has 6 tools
    expect(screen.getAllByRole('link').length).toBe(6)
  })

  it('shows tool names as links', () => {
    render(<ToolGrid tools={tools} />)
    expect(screen.getByRole('link', { name: /merge pdf/i })).toBeInTheDocument()
  })

  it('tool links point to correct slugs', () => {
    render(<ToolGrid tools={tools} />)
    const mergeLink = screen.getByRole('link', { name: /merge pdf/i })
    expect(mergeLink).toHaveAttribute('href', '/merge-pdf')
  })
})
