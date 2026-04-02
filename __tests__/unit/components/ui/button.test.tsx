import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('shows spinner when loading', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('is disabled when loading', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when disabled prop passed', () => {
    render(<Button disabled>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="primary">btn</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-cyan-600')
    rerender(<Button variant="ghost">btn</Button>)
    expect(screen.getByRole('button')).toHaveClass('text-cyan-400')
  })
})
