# pdf-genie

> Every PDF tool, beautifully simple.

An open-source PDF toolkit with 31 free tools - merge, split, compress, convert, edit, sign, and more. Built with Next.js, TypeScript, and pdf-lib. No signup. No file storage. Privacy-first.

**Live:** [pdf-genie.vercel.app](https://pdf-genie.vercel.app) | **Repo:** [github.com/badrusiddique/pdf-genie](https://github.com/badrusiddique/pdf-genie)

---

## Table of Contents

- [Features](#features)
- [Tools](#tools)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Running Tests](#running-tests)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Architecture Notes](#architecture-notes)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

- **31 PDF tools** across 7 categories - all free, all in one place
- **Privacy-first** - files processed in your browser when possible; never stored on any server
- **No signup required** - drop a file and go
- **Mobile-friendly** - works on phones and tablets
- **Open source** - MIT licensed, contributions welcome

---

## Tools

### Organize PDF
| Tool | Description |
|---|---|
| Merge PDF | Combine multiple PDFs into one, reorder by drag and drop |
| Split PDF | Split by page ranges, every page, or fixed chunk size |
| Remove Pages | Select and delete unwanted pages using a thumbnail grid |
| Extract Pages | Pull out specific pages into a new PDF |
| Organize PDF | Reorder, rotate, and delete pages with drag-and-drop |
| Scan to PDF | Convert JPG/PNG images into a PDF document |

### Optimize PDF
| Tool | Description |
|---|---|
| Compress PDF | Reduce file size with three quality levels (extreme, recommended, less) |
| Repair PDF | Attempt recovery of corrupted or damaged PDF files |
| OCR PDF | Make scanned PDFs searchable using Tesseract.js (100+ languages) |

### Convert to PDF
| Tool | Description |
|---|---|
| JPG to PDF | Convert images to PDF with page size, margin, and orientation options |
| Word to PDF | Convert DOCX/DOC files to PDF |
| PowerPoint to PDF | Convert PPTX presentations to PDF (text and basic shapes preserved) |
| Excel to PDF | Convert XLSX/XLS spreadsheets to PDF |
| HTML to PDF | Convert a URL, uploaded HTML file, or pasted HTML to PDF |

### Convert from PDF
| Tool | Description |
|---|---|
| PDF to JPG | Convert pages to JPG images or extract embedded images |
| PDF to Word | Extract text content into an editable DOCX file |
| PDF to PowerPoint | Convert pages into a PPTX presentation |
| PDF to Excel | Extract table content into an XLSX spreadsheet |
| PDF to PDF/A | Convert to archival PDF/A format (1b or 2b) |

### Edit PDF
| Tool | Description |
|---|---|
| Rotate PDF | Rotate individual pages left or right, filter by orientation |
| Add Page Numbers | Customise position, format, font, and page range |
| Add Watermark | Add text or image watermark with opacity and rotation controls |
| Crop PDF | Visual drag-crop box to define the keep area per page |
| Edit PDF | Add text, shapes, freehand drawing, and images |

### PDF Security
| Tool | Description |
|---|---|
| Unlock PDF | Remove password protection |
| Protect PDF | Encrypt with open and/or permissions password |
| Sign PDF | Draw, type, or upload a signature and place it on the PDF |
| Redact PDF | Permanently black out sensitive text and regions |
| Compare PDF | Side-by-side diff with text and overlay comparison modes |

### PDF Intelligence
| Tool | Description |
|---|---|
| AI Summarizer | Generate a short, medium, or long summary using HuggingFace BART |
| Translate PDF | Translate to 14 languages using HuggingFace Helsinki-NLP models |

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript (strict) | Industry standard, optimal Vercel integration |
| Styling | Tailwind CSS v4 + CSS custom properties | Design token control without a component library lock-in |
| Animation | Framer Motion | Drag-drop affordance, staggered reveals, micro-interactions |
| Client PDF | pdf-lib + pdfjs-dist | Merge, split, rotate, watermark, render thumbnails |
| OCR | Tesseract.js | Browser WASM - files never leave the device |
| Server convert | mammoth + ExcelJS + puppeteer-core + @sparticuz/chromium-min | Word/Excel/HTML to PDF on Vercel serverless |
| Drag and drop | @dnd-kit/core + @dnd-kit/sortable | Accessible, keyboard-friendly |
| AI | HuggingFace Inference API (free tier) | Summarizer and translation without a paid API |
| Unit tests | Vitest | Fast, ESM-native |
| E2E tests | Playwright | Cross-browser, accessibility audits |
| CI/CD | GitHub Actions + Vercel | Lint, typecheck, test, deploy on every PR |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+

```bash
# Install pnpm if you don't have it
npm install -g pnpm
```

### 1. Clone the repo

```bash
git clone https://github.com/badrusiddique/pdf-genie.git
cd pdf-genie
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your values (see [Environment Variables](#environment-variables)).

### 4. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
pdf-genie/
- app/                        # Next.js App Router
  - page.tsx                  # Homepage - hero + filterable tool grid
  - layout.tsx                # Root layout, fonts, metadata
  - [tool]/
    - page.tsx                # Dynamic tool page (all 31 tools use this)
    - metadata.ts             # Per-tool OpenGraph metadata
  - api/v1/                   # Versioned API (mobile-ready)
    - process/[tool]/         # Server-side PDF conversions
    - ai/summarize/           # HuggingFace BART summarizer
    - ai/translate/           # HuggingFace Helsinki-NLP translator
- components/
  - ui/                       # Button, Badge, Spinner primitives
  - tool/                     # ToolDropzone, ToolPageShell, ToolResult
    - tools/                  # Per-tool client components
  - layout/                   # Navbar (mega-menu), Footer, ToolGrid
- config/
  - tools.ts                  # Single source of truth for all 31 tools
- lib/
  - pdf/                      # Client-side PDF functions (merge, split, etc.)
  - convert/                  # Server-side converters (Word, Excel, HTML)
  - ai/                       # HuggingFace client functions
  - file-utils.ts             # File validation, size formatting
  - utils.ts                  # cn() utility (clsx + tailwind-merge)
- workers/
  - pdf.worker.ts             # Web Worker - runs pdf-lib off the main thread
- __tests__/
  - unit/                     # Vitest unit tests
  - integration/              # API route tests
  - fixtures/                 # Sample PDF, DOCX, XLSX, JPG files
- e2e/                        # Playwright E2E tests
  - organize/                 # Phase 1 specs
  - qa/                       # QA-as-code post-phase verification
```

### Key design decisions

**`config/tools.ts` is the single source of truth.** Every tool's slug, name, description, category, accepted formats, and file limits live here. The homepage grid, tool pages, API routes, and future mobile app all read from this file.

**API routes are versioned at `/api/v1/`.** A future React Native mobile app can call the same endpoints without breaking changes when the web app migrates to `/api/v2/`.

**Client-side processing by default.** Simple operations (merge, split, rotate, watermark) run entirely in the browser using pdf-lib inside a Web Worker, so files never leave the device. Server-side routes are only used for operations that require Node.js libraries (Word/Excel conversion, compression with sharp).

---

## Running Tests

### Unit tests (Vitest)

```bash
pnpm test           # run once
pnpm test:watch     # watch mode
pnpm test:ui        # Vitest UI in browser
```

### Type checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
```

### E2E tests (Playwright)

```bash
# Install browsers first (one-time)
pnpm playwright install

# Run all E2E tests
pnpm e2e

# Run a specific project
pnpm e2e --project=chromium
pnpm e2e --project=mobile

# Run a specific spec
pnpm e2e e2e/qa/phase-1-qa.spec.ts
```

> E2E tests require the dev server running (`pnpm dev`) unless you run `pnpm build && pnpm start` first.

### All checks at once

```bash
pnpm typecheck && pnpm lint && pnpm test
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `HUGGINGFACE_API_KEY` | For AI tools | Free API key from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

The app runs without `HUGGINGFACE_API_KEY` - the AI tools (Summarizer and Translate) will show a graceful "AI service unavailable" message instead of crashing.

---

## Deployment

### Deploy to Vercel (recommended)

1. Fork this repo
2. Import it at [vercel.com/new](https://vercel.com/new)
3. Add `HUGGINGFACE_API_KEY` in Project Settings > Environment Variables
4. Deploy

Vercel auto-deploys on every push to `main` and creates preview deployments for pull requests.

### Deploy manually

```bash
pnpm build
pnpm start
```

### Vercel limits (free Hobby tier)

- Serverless function timeout: 10 seconds
- Request body size: 50 MB
- Client-side operations (pdf-lib) have no server timeout and can handle files up to 200 MB

---

## Contributing

Contributions are welcome. Here is how to get started:

1. Fork the repo and create a branch: `git checkout -b feat/my-feature`
2. Make your changes following the patterns in the codebase
3. Write tests - new lib functions need unit tests, new tool pages need E2E tests
4. Run the full check: `pnpm typecheck && pnpm lint && pnpm test`
5. Open a pull request

### Adding a new tool

1. Add the tool entry to `config/tools.ts` (slug, name, description, category, icon, limits)
2. Create `components/tool/tools/YourToolName.tsx` - the client component for the tool
3. Add a case to `app/[tool]/page.tsx` to load your component
4. Add `lib/pdf/yourOperation.ts` for client-side processing or `lib/convert/yourConverter.ts` for server-side
5. Write unit tests in `__tests__/unit/lib/`
6. Add an E2E spec in `e2e/`

### Code style

- Strict TypeScript - no `any` types
- Component files use PascalCase, utility files use camelCase
- All client components that use state or browser APIs need `'use client'`
- PDF processing functions are pure async functions returning `Uint8Array`
- Commit messages follow conventional commits: `feat:`, `fix:`, `test:`, `refactor:`, `ci:`

---

## Architecture Notes

### Known limitations

**PowerPoint to PDF** - PPTX conversion is done by parsing the ZIP/XML structure and rendering to HTML via headless Chromium. Complex animations, embedded fonts, and advanced formatting are not preserved (~70% fidelity). This is a serverless constraint - full fidelity requires LibreOffice.

**PDF to Word/Excel/PowerPoint** - Text content is extracted and placed into the output format. Original layout, images, and multi-column formatting are not preserved.

**PDF/A conversion** - Metadata compliance (XMP, font embedding flags) is applied via pdf-lib. Full spec validation requires Ghostscript, which is not available on serverless. Satisfies ~80% of PDF/A-1b requirements.

**OCR** - Runs Tesseract.js in the browser. Accuracy depends on scan quality. Large PDFs (50+ pages) may be slow on low-end devices.

### Mobile app (Phase 8)

The architecture is prepared for a React Native / Expo mobile app:

- All API routes are versioned at `/api/v1/`
- `lib/pdf/*`, `lib/convert/*`, and `lib/ai/*` have no Next.js dependencies and can be published as an npm package
- `config/tools.ts` is framework-agnostic and importable in React Native
- API responses use a consistent envelope: `{ success: boolean, data?: T, error?: { code, message } }`

---

## Roadmap

### Released
- [x] Phase 1 - Organize PDF (merge, split, remove, extract, organize, scan)

### In progress
- [ ] Phase 2 - Optimize PDF (compress, repair, OCR)

### Planned
- [ ] Phase 3 - Convert to PDF (JPG, Word, PowerPoint, Excel, HTML)
- [ ] Phase 4 - Convert from PDF (JPG, Word, PowerPoint, Excel, PDF/A)
- [ ] Phase 5 - Edit PDF (rotate, page numbers, watermark, crop, edit)
- [ ] Phase 6 - PDF Security (unlock, protect, sign, redact, compare)
- [ ] Phase 7 - PDF Intelligence (AI summarizer, translate)
- [ ] Phase 8 - Mobile app (React Native / Expo)

---

## License

MIT - see [LICENSE](LICENSE) for details.
