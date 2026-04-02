interface GenieLampIconProps {
  className?: string
  animated?: boolean
}

export function GenieLampIcon({ className, animated = false }: GenieLampIconProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="lampGrad" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </radialGradient>
        <radialGradient id="flameGrad" cx="50%" cy="80%" r="50%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="flameGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Lamp body */}
      <path
        d="M8 28 C8 22 12 16 20 16 C28 16 32 22 32 28 L30 32 H10 Z"
        fill="url(#lampGrad)"
        filter="url(#glow)"
      />

      {/* Lamp spout */}
      <path
        d="M30 26 C34 24 36 22 35 20 C34 18 31 20 30 23"
        stroke="#A78BFA"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Lamp handle */}
      <path
        d="M8 26 C4 24 3 22 5 20 C7 18 9 20 8 23"
        stroke="#A78BFA"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Base */}
      <rect x="9" y="32" width="22" height="3" rx="1.5" fill="#6D28D9" />

      {/* Flame stem */}
      <rect x="19" y="12" width="2" height="4" rx="1" fill="#C4B5FD" />

      {/* Flame */}
      <ellipse
        cx="20" cy="10"
        rx="4" ry="5"
        fill="url(#flameGrad)"
        filter="url(#flameGlow)"
        className={animated ? 'animate-pulse-glow' : ''}
      />

      {/* Inner flame highlight */}
      <ellipse cx="20" cy="11" rx="1.5" ry="2.5" fill="#FEF3C7" opacity="0.8" />

      {/* Magic sparkles */}
      <circle cx="12" cy="8" r="1" fill="#F59E0B" opacity="0.7" className={animated ? 'animate-star-twinkle' : ''} />
      <circle cx="28" cy="6" r="1.2" fill="#A78BFA" opacity="0.8" className={animated ? 'animate-star-twinkle' : ''} style={{ animationDelay: '1s' }} />
      <circle cx="33" cy="12" r="0.8" fill="#EC4899" opacity="0.6" className={animated ? 'animate-star-twinkle' : ''} style={{ animationDelay: '2s' }} />
    </svg>
  )
}
