'use client'

import { useState, useCallback } from 'react'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { ToolLayout, ToolResult, PdfThumbnail } from '@/components/tool'
import { formatFileSize } from '@/lib/file-utils'
import type { Tool } from '@/config/tools'

// ── Password strength helpers ─────────────────────────────────────────────────

function hasMinLength(p: string) { return p.length >= 8 }
function hasUppercase(p: string) { return /[A-Z]/.test(p) }
function hasNumber(p: string)    { return /[0-9]/.test(p) }

interface StrengthDotProps {
  active: boolean
  color: string
}

function StrengthDot({ active, color }: StrengthDotProps) {
  return (
    <span
      className="w-2.5 h-2.5 rounded-full inline-block transition-colors duration-200"
      style={{
        background: active ? color : 'rgba(255,255,255,0.12)',
        boxShadow: active ? `0 0 6px ${color}80` : 'none',
      }}
    />
  )
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const checks = [
    { label: '8+ chars',   pass: hasMinLength(password), color: '#EF4444' },
    { label: 'Uppercase',  pass: hasUppercase(password), color: '#F59E0B' },
    { label: 'Number',     pass: hasNumber(password),    color: '#10B981' },
  ]

  const passed = checks.filter(c => c.pass).length

  const strengthLabel =
    passed === 0 ? 'Very weak' :
    passed === 1 ? 'Weak'      :
    passed === 2 ? 'Fair'      :
    'Strong'

  const strengthColor =
    passed === 0 ? '#EF4444' :
    passed === 1 ? '#EF4444' :
    passed === 2 ? '#F59E0B' :
    '#10B981'

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          {checks.map((c, i) => (
            <StrengthDot key={i} active={c.pass} color={c.color} />
          ))}
        </div>
        <span className="text-xs" style={{ color: strengthColor }}>{strengthLabel}</span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c, i) => (
          <span key={i} className="text-xs" style={{ color: c.pass ? '#64748B' : '#475569' }}>
            {c.pass ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProtectPdfTool({ tool }: { tool: Tool }) {
  const [file, setFile]               = useState<File | null>(null)
  const [status, setStatus]           = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError]             = useState('')
  const [over, setOver]               = useState(false)

  // Password state
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)

  // Validation
  const passwordTooShort  = password.length > 0 && password.length < 4
  const passwordsMismatch = confirm.length > 0 && password !== confirm
  const canSubmit =
    !!file &&
    password.length >= 4 &&
    password === confirm &&
    status !== 'processing'

  // Processing
  const handleProtect = useCallback(async () => {
    if (!file || !canSubmit) return
    setStatus('processing')
    setError('')
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      const { PDFDocument } = await import('@cantoo/pdf-lib')
      const doc = await PDFDocument.load(bytes as Uint8Array<ArrayBuffer>, { ignoreEncryption: true })
      await doc.encrypt({
        userPassword: password,
        ownerPassword: password,
        permissions: {
          printing: 'highResolution',
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: false,
          contentAccessibility: false,
          documentAssembly: false,
        },
      })
      const encrypted = await doc.save()

      const blob = new Blob([encrypted.buffer as ArrayBuffer], { type: 'application/pdf' })
      setDownloadUrl(URL.createObjectURL(blob))
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Protection failed')
      setStatus('error')
    }
  }, [file, password, canSubmit])

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFile(null)
    setDownloadUrl('')
    setStatus('idle')
    setError('')
    setPassword('')
    setConfirm('')
  }, [downloadUrl])

  const outputFileName = file
    ? `${file.name.replace(/\.pdf$/i, '')}_protected.pdf`
    : 'protected.pdf'

  // ── Done screen ─────────────────────────────────────────────────────────────
  if (status === 'done' && downloadUrl) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ToolResult
          downloadUrl={downloadUrl}
          fileName={outputFileName}
          onReset={handleReset}
        />
      </div>
    )
  }

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  const sidebar = (
    <div className="space-y-5">
      {/* Password field */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: '#94A3B8' }}>
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${passwordTooShort ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.10)'}`,
              color: '#E2E8F0',
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3"
            style={{ color: '#475569' }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword
              ? <EyeOff className="w-4 h-4" />
              : <Eye className="w-4 h-4" />
            }
          </button>
        </div>
        {passwordTooShort && (
          <p className="text-xs" style={{ color: '#EF4444' }}>
            Password must be at least 4 characters
          </p>
        )}
        <PasswordStrength password={password} />
      </div>

      {/* Confirm password field */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: '#94A3B8' }}>
          Confirm Password
        </label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${passwordsMismatch ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.10)'}`,
              color: '#E2E8F0',
            }}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(v => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3"
            style={{ color: '#475569' }}
            aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
          >
            {showConfirm
              ? <EyeOff className="w-4 h-4" />
              : <Eye className="w-4 h-4" />
            }
          </button>
        </div>
        {passwordsMismatch && (
          <p className="text-xs" style={{ color: '#EF4444' }}>
            Passwords do not match
          </p>
        )}
      </div>

      {/* Permissions info */}
      <div
        className="p-3 rounded-lg text-xs leading-relaxed space-y-1"
        style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.15)',
          color: '#94A3B8',
        }}
      >
        <p className="font-medium" style={{ color: '#EF4444' }}>Applied restrictions</p>
        <ul className="space-y-0.5 mt-1">
          <li>• Printing: allowed (high-res)</li>
          <li>• Editing: blocked</li>
          <li>• Copying text: blocked</li>
          <li>• Annotations: blocked</li>
        </ul>
      </div>

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="text-sm px-3 py-2 rounded-lg"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}
        >
          {error}
        </p>
      )}

      {/* Processing indicator */}
      {status === 'processing' && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#94A3B8' }}>
          <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          Encrypting…
        </div>
      )}
    </div>
  )

  // ── Action button ────────────────────────────────────────────────────────────
  const action = (
    <button
      onClick={handleProtect}
      disabled={!canSubmit}
      className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: canSubmit
          ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
          : 'rgba(255,255,255,0.05)',
        color: '#ffffff',
        boxShadow: canSubmit ? '0 4px 20px rgba(239,68,68,0.35)' : 'none',
      }}
    >
      <span>Protect PDF →</span>
    </button>
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <ToolLayout
      sidebar={sidebar}
      action={action}
      sidebarHeader={
        <h2 className="font-display text-base font-semibold" style={{ color: '#F1F5F9' }}>
          Protect PDF
        </h2>
      }
    >
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload PDF to protect"
          className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
          style={{
            minHeight: '360px',
            background: over ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
            border: `2px dashed ${over ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.10)'}`,
          }}
          onDragOver={e => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={e => {
            e.preventDefault()
            setOver(false)
            const f = e.dataTransfer.files[0]
            if (f) setFile(f)
          }}
          onClick={() => document.getElementById('protect-input')?.click()}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') document.getElementById('protect-input')?.click()
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: over ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)' }}
          >
            <Shield className="w-8 h-8" style={{ color: over ? '#EF4444' : '#475569' }} />
          </div>
          <div className="text-center">
            <p className="font-medium mb-1" style={{ color: '#E2E8F0' }}>
              Select a PDF to protect
            </p>
            <p className="text-sm" style={{ color: '#475569' }}>
              Drop here or click · up to {tool.maxSizeMB} MB
            </p>
          </div>
          <input
            id="protect-input"
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) setFile(f)
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 pt-4">
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <PdfThumbnail file={file} width={220} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{file.name}</p>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>{formatFileSize(file.size)}</p>
          </div>
          <button
            onClick={() => setFile(null)}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{
              color: '#94A3B8',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Change file
          </button>
        </div>
      )}
    </ToolLayout>
  )
}
