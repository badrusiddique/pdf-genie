# Changelog

All notable changes to pdf-genie are documented here.

## [Unreleased]

## Phase 3 — Convert to PDF

### Added
- **JPG/PNG to PDF** — client-side conversion with page size (fit/A4/Letter), orientation, and margin options; supports JPEG, PNG, WebP up to 20 files
- **HTML to PDF** — server-side via puppeteer; wraps HTML fragments in print-ready document with CSS reset
- **Word to PDF** — server-side via mammoth (DOCX→HTML) + puppeteer; text and basic formatting preserved
- **Excel to PDF** — server-side via ExcelJS (XLSX→HTML tables) + puppeteer; all sheets rendered with page breaks
- **PowerPoint to PDF** — server-side via jszip XML slide parsing + puppeteer; text content preserved, one page per slide
- **Shared browser launcher** — `lib/convert/browser.ts` with `@sparticuz/chromium-min` + `puppeteer-core` for Vercel-compatible serverless rendering

### Added
- **Compress PDF** — first server-side tool (Phase 2): `lib/pdf/compress.ts` with three compression levels (`screen`, `recommended`, `printer`), using pdf-lib object stream compression and sharp 0.34.5 for image downsampling
- **Compress PDF API route** — `app/api/v1/process/compress-pdf` (POST), versioned under `/api/v1/`, 50 MB file size cap, streams compressed PDF back with size headers (`X-Original-Size`, `X-Compressed-Size`)
- **Compress PDF test suite** — 6 unit tests covering compression levels, invalid input rejection, and size reporting

### Fixed
- `Uint8Array` → `Buffer.from()` in API route response body to satisfy TypeScript's `BodyInit` constraint

---

## [0.3.0] — 2026-04-03

### Added
- Two-column tool layout architecture (`ToolLayout`, `PdfThumbnail`) inspired by ilovepdf UX pattern
- PDF.js worker in `/public` for client-side thumbnail rendering
- Redesigned `MergePdfTool` with thumbnail grid and drag-to-reorder
- Redesigned `SplitPdfTool` with structured range builder

### Changed
- `ToolPageShell` simplified to header-only; workspace state managed by `ToolLayout`
- ESLint config updated to ignore `/public` and generated files

---

## [0.2.0] — 2026-04-03

### Changed
- Color scheme migrated from dark purple/indigo to bright cyan + amber orange
- Background gradients and scrollbar colors refined
- `Button` and `Spinner` refactored from CSS variables to hardcoded Tailwind colors
- `ToolPageShell` redesigned with category-specific gradient headers
- `ToolResult` success screen redesigned with animated celebration UI
- `ToolWorkspace` component created for unified processing states

### Fixed
- CSS variable syntax (`text-[--color-*]`) replaced with direct hex values throughout
- `'use client'` placement issues in breadcrumb component
- PDF tool naming standardised (uppercase "PDF" consistently)

---

## [0.1.0] — 2026-04-02

### Added
- Production homepage with hero section, filterable tool grid, navbar mega-menu, and footer
- Anime-inspired dark mode aesthetic with deep indigo background, animated star field, and genie favicon
- Tool registry with all 31 planned PDF tools (`config/tools.ts`)
- Client-side PDF tools implemented: Merge, Split, Remove Pages, Extract Pages, Rotate, Reorder
- `lib/pdf/` pure async functions: merge, split, remove pages, extract pages
- Design system: Fraunces + Instrument Sans fonts, glass utility, CSS animations (`animate-float`, `animate-pulse-glow`, `animate-star-twinkle`)
- Full unit test suite: 94 tests across 14 files
- CLAUDE.md QA gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` required before every commit
