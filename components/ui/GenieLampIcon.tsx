interface GenieLampIconProps {
  className?: string
  variant?: 'cobalt' | 'white'
}

export function GenieLampIcon({ className, variant = 'cobalt' }: GenieLampIconProps) {
  const bodyFill = variant === 'white' ? 'white' : '#1B3A6B'
  const baseFill = variant === 'white' ? 'white' : '#1B3A6B'

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* Lamp body */}
      <path
        d="M12 3C9.5 3 7.5 4.5 7 6.5C6.5 8.5 7.5 10 9 11L8 18H16L15 11C16.5 10 17.5 8.5 17 6.5C16.5 4.5 14.5 3 12 3Z"
        fill={bodyFill}
      />
      {/* Flame */}
      <path
        d="M12 1C12 1 10 3 11 5C10 4 8.5 4.5 9 6C9 4 11 3.5 12 1Z"
        fill="#F59E0B"
      />
      <path
        d="M12 1C12 1 14 3 13 5C14 4 15.5 4.5 15 6C15 4 13 3.5 12 1Z"
        fill="#F59E0B"
        opacity="0.7"
      />
      {/* Base */}
      <rect x="7" y="18" width="10" height="2" rx="1" fill={baseFill} />
      <rect x="9" y="20" width="6" height="1.5" rx="0.75" fill={baseFill} opacity="0.6" />
    </svg>
  )
}
