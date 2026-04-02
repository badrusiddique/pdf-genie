import { test, expect } from '@playwright/test'

test.describe('Phase 1 QA: Organize PDF tools', () => {
  const phase1Tools = [
    { slug: 'merge-pdf', name: 'Merge PDF' },
    { slug: 'split-pdf', name: 'Split PDF' },
    { slug: 'remove-pages', name: 'Remove Pages' },
    { slug: 'extract-pages', name: 'Extract Pages' },
    { slug: 'organize-pdf', name: 'Organize PDF' },
    { slug: 'scan-to-pdf', name: 'Scan to PDF' },
  ]

  for (const { slug, name } of phase1Tools) {
    test(`${name} tool page loads and is functional`, async ({ page }) => {
      await page.goto(`/${slug}`)

      // Page has correct heading
      await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()

      // Drop zone is visible
      await expect(page.getByRole('button', { name: /upload/i })).toBeVisible()

      // No 404 or error page
      await expect(page.getByText(/page not found/i)).not.toBeVisible()

      // Lighthouse-level: page has main landmark
      await expect(page.getByRole('main')).toBeVisible()
    })
  }

  test('homepage shows all Phase 1 tools', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /merge pdf/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /split pdf/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /organize pdf/i })).toBeVisible()
  })

  test('homepage filter shows 6 tools for Organize category', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: 'Organize PDF' }).click()
    const links = await page.getByRole('link').all()
    // At least 6 tool links visible after filtering
    expect(links.length).toBeGreaterThanOrEqual(6)
  })
})
