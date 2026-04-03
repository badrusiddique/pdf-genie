import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

const PHASE3_TOOLS = [
  { slug: 'jpg-to-pdf', ariaLabel: /upload images to convert/i },
  { slug: 'html-to-pdf', ariaLabel: /upload html file/i },
  { slug: 'word-to-pdf', ariaLabel: /upload word document/i },
  { slug: 'excel-to-pdf', ariaLabel: /upload excel file/i },
  { slug: 'powerpoint-to-pdf', ariaLabel: /upload powerpoint file/i },
]

for (const { slug, ariaLabel } of PHASE3_TOOLS) {
  test(`${slug} — renders tool component, not "Coming soon"`, async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    await page.goto(`${BASE}/${slug}`)
    await page.waitForLoadState('networkidle')

    // Must NOT show "Coming soon"
    const bodyText = await page.textContent('body')
    expect(bodyText).not.toContain('Coming soon')
    expect(bodyText).not.toContain('being built')

    // Drop zone must be visible
    const dropzone = page.getByRole('button', { name: ariaLabel })
    await expect(dropzone).toBeVisible()

    // No JS console errors
    expect(errors).toHaveLength(0)
  })
}
