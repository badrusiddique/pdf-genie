import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-violet-700 text-white hover:bg-violet-800 shadow-sm',
  secondary: 'bg-white/6 text-[#F1F5F9] border border-white/10 hover:bg-white/10',
  ghost:     'text-violet-400 hover:bg-violet-400/10',
  danger:    'bg-red-600 text-white hover:opacity-90',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <span
            role="status"
            aria-label="Loading"
            className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0"
          />
        )}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
