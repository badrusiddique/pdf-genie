import { cn } from '@/lib/utils'
import { type ToolCategory } from '@/config/tools'

const categoryColors: Record<ToolCategory, string> = {
  organize: 'bg-blue-50 text-blue-700 border-blue-200',
  optimize: 'bg-green-50 text-green-700 border-green-200',
  'convert-to': 'bg-amber-50 text-amber-700 border-amber-200',
  'convert-from': 'bg-orange-50 text-orange-700 border-orange-200',
  edit: 'bg-purple-50 text-purple-700 border-purple-200',
  security: 'bg-red-50 text-red-700 border-red-200',
  intelligence: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

interface BadgeProps {
  category: ToolCategory
  label: string
  className?: string
}

export function CategoryBadge({ category, label, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border',
        categoryColors[category],
        className,
      )}
    >
      {label}
    </span>
  )
}
