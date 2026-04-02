'use client'

import { useMemo } from 'react'

// Deterministic pseudo-random so SSR and client produce the same values
function seededValue(index: number, offset: number): number {
  return ((index * 9301 + offset * 49297) % 233280) / 233280
}

export function StarField() {
  const stars = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: seededValue(i, 1) * 100,
        y: seededValue(i, 2) * 60,
        size: seededValue(i, 3) * 2 + 0.5,
        delay: seededValue(i, 4) * 4,
        duration: seededValue(i, 5) * 3 + 2,
      })),
    [],
  )

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
            background:
              star.id % 3 === 0 ? '#F59E0B' : star.id % 3 === 1 ? '#A78BFA' : '#ffffff',
            opacity: 0,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
