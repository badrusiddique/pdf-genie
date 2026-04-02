# pdf-genie — Claude Code Guidelines

## QA Gate: Run Before Every Commit

**Non-negotiable. All checks must pass with zero errors before any `git commit`.**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Run them in this exact order. If any step fails — STOP. Fix it first. Do not commit broken code.

### What each check catches

| Check | Command | Catches |
|---|---|---|
| TypeScript | `pnpm typecheck` | Type errors, missing props, invalid imports |
| Lint | `pnpm lint` | React rules violations, `Math.random()` in render, event handlers on server components, unused vars |
| Unit tests | `pnpm test` | Regressions in PDF processing logic, UI component behaviour |
| Build | `pnpm build` | SSR failures, missing client/server boundaries, broken static generation |
| **UI smoke test** | `pnpm dev` + Playwright | **Tool pages render real UI, not "Coming soon"** |

### Post-Phase Review Protocol (mandatory before marking any phase complete)

Two passes required. Do not commit or claim phase complete until both are done.

**Pass 1 — Code review**
- Invoke `superpowers:requesting-code-review` skill
- Checks: TypeScript strictness, error boundaries, test quality, security, code readability

**Pass 2 — Playwright functional QA**
- Start dev server: `pnpm dev`
- Use `webapp-testing` skill to test every affected tool page
- Confirm tool renders its real component, NOT the "Coming soon" fallback
- Verify against ilovepdf.com parity: file type acceptance, output validity, error handling, mobile usability
- Write a Playwright spec at `e2e/qa/phase-N-qa.spec.ts` that runs in CI as regression guard

**Report to user before committing:**
- List every page smoke-tested and its result
- Confirm code review pass/fail
- Confirm E2E spec written and passing

**Never claim QA passes based on static checks alone.** `typecheck + lint + test + build` cannot detect a missing component case in a runtime switch — that requires a real browser test.

### Common failure patterns to watch for

**Server vs Client component violations (Next.js App Router)**
- `app/page.tsx` and `components/layout/Footer.tsx` are SERVER components
- Server components CANNOT have: `onMouseEnter`, `onMouseLeave`, `onClick`, `useState`, `useEffect`, or any event handler props
- If you need interactivity, extract it to a `'use client'` sub-component
- Symptom: `Error: Event handlers cannot be passed to Client Component props` at runtime

**`Math.random()` and impure functions in render**
- ESLint `react-hooks/purity` forbids `Math.random()`, `Date.now()` etc. inside component render
- Use `useMemo(() => ..., [])` in a `'use client'` component, or deterministic seeded values
- Symptom: `Cannot call impure function during render` lint error

**CSS variable references in Tailwind v4**
- `text-[--color-accent]` does NOT reliably generate `color: var(--color-accent)`
- Use direct hex values (`text-[#F59E0B]`) or inline styles (`style={{ color: '#F59E0B' }}`)
- Symptom: Colour looks wrong or inherits parent colour

**`'use client'` placement**
- Must be the FIRST line of the file, before any imports
- Symptom: `TypeError: Cannot read properties of undefined` during SSR

## Project Architecture

### Server vs Client component map
- `app/page.tsx` — SERVER. Exports `metadata`. No hooks, no event handlers.
- `app/[tool]/page.tsx` — SERVER. Exports `metadata` + `generateStaticParams`.
- `app/layout.tsx` — SERVER.
- `components/tool/tools/*.tsx` — CLIENT (`'use client'`). Manage file state and processing.
- `components/layout/Navbar.tsx` — CLIENT. Has open/close state.
- `components/layout/ToolGrid.tsx` — CLIENT. Has filter state.
- `components/layout/Footer.tsx` — SERVER. No interactivity — use CSS hover classes, not JS handlers.
- `components/layout/StarField.tsx` — CLIENT. Uses `useMemo` for stable seeded star positions.
- `components/layout/HeroCTA.tsx` — CLIENT. Has hover handlers.

### PDF processing rules
- All `lib/pdf/*.ts` functions are pure async — no DOM, no Next.js, no side effects
- Accept `Uint8Array` input, return `Uint8Array` output
- Throw descriptive errors naming the bad value
- Tests use real PDF bytes via `__tests__/unit/lib/pdf/helpers.ts`

### API routes
- Versioned under `app/api/v1/` (mobile-ready)
- Process files in memory, stream back — never write to disk
- File size limit: 50 MB (Vercel serverless payload cap)

### Design system
- Dark atmospheric theme: `#060B18` bg, `#7C3AED` purple primary, `#F59E0B` amber accent
- Fonts: Fraunces (display) + Instrument Sans (UI) via `next/font/google`
- Animations: `animate-float`, `animate-pulse-glow`, `animate-star-twinkle` in `globals.css`
- Glass utility: `.glass` class in `globals.css` (backdrop-filter: blur)
- NEVER use `text-[--color-*]` Tailwind CSS variable syntax — use direct hex

## Commit Convention

Conventional commits, no AI/Claude attribution:

```
feat(scope): description
fix(scope): description
test(scope): description
refactor(scope): description
docs: description
ci: description
```

## Adding a New Tool

1. Add entry to `config/tools.ts`
2. Create `components/tool/tools/YourToolTool.tsx` with `'use client'`
3. Add `case 'your-slug':` to `app/[tool]/page.tsx`
4. Add `lib/pdf/yourOp.ts` (client) or `lib/convert/yourConverter.ts` (server)
5. Write unit tests with real file fixtures
6. Run full QA gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
