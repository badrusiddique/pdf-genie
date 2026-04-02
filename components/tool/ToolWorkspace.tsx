'use client'

// Wraps the interactive tool area with consistent card styling and processing overlay
interface ToolWorkspaceProps {
  children: React.ReactNode
  processing?: boolean
  processingLabel?: string
}

export function ToolWorkspace({
  children,
  processing = false,
  processingLabel = 'Processing your PDF…',
}: ToolWorkspaceProps) {
  return (
    <div className="relative">
      {/* Processing overlay */}
      {processing && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 rounded-2xl"
          style={{
            background: 'rgba(2,11,16,0.85)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          aria-live="polite"
          aria-label={processingLabel}
        >
          {/* Spinner ring */}
          <div className="relative w-14 h-14">
            <div
              className="absolute inset-0 rounded-full animate-spin"
              style={{
                border: '3px solid transparent',
                borderTopColor: '#06B6D4',
                borderRightColor: 'rgba(6,182,212,0.3)',
              }}
            />
            <div
              className="absolute inset-2 rounded-full animate-pulse"
              style={{ background: 'rgba(6,182,212,0.15)' }}
            />
          </div>

          {/* Label */}
          <div className="text-center">
            <p className="text-sm font-medium mb-1" style={{ color: '#F1F5F9' }}>
              {processingLabel}
            </p>
            <p className="text-xs" style={{ color: '#64748B' }}>
              This may take a moment — don&apos;t close this tab
            </p>
          </div>

          {/* Animated dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: '#06B6D4',
                  animation: `pulseGlow 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className="rounded-2xl p-6 sm:p-8"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
