'use client'

interface ToolLayoutProps {
  /** Main workspace area — file thumbnails, page previews, dropzone */
  children: React.ReactNode
  /** Sidebar content — mode tabs, options, info */
  sidebar: React.ReactNode
  /** Sticky CTA button pinned to bottom of sidebar */
  action: React.ReactNode
  /** Optional: extra sidebar header controls (e.g. file count badge, sort) */
  sidebarHeader?: React.ReactNode
}

/**
 * Two-column tool workspace layout.
 * Left: large scrollable workspace (files, pages, dropzone).
 * Right: fixed 280px sidebar with scrollable controls + sticky action button.
 *
 * This matches the ilovepdf tool page pattern — workspace takes up most of the
 * screen, controls are always visible on the right, CTA never scrolls away.
 */
export function ToolLayout({ children, sidebar, action, sidebarHeader }: ToolLayoutProps) {
  return (
    <div
      className="flex"
      style={{
        height: 'calc(100vh - 64px)',  // viewport minus navbar height
        overflow: 'hidden',
      }}
    >
      {/* ── Workspace ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 min-w-0">
        {children}
      </div>

      {/* ── Sidebar ───────────────────────────────────────── */}
      <div
        className="flex flex-col shrink-0"
        style={{
          width: '300px',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Sidebar header */}
        {sidebarHeader && (
          <div
            className="px-5 py-4 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            {sidebarHeader}
          </div>
        )}

        {/* Scrollable controls */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {sidebar}
        </div>

        {/* Sticky action button */}
        <div
          className="px-5 py-4 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {action}
        </div>
      </div>
    </div>
  )
}
