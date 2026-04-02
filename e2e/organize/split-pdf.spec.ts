import { test, expect } from '@playwright/test'

test.describe('Split PDF', () => {
  test('page loads with correct title', async ({ page }) => {
    await page.goto('/split-pdf')
    await expect(page).toHaveTitle(/split pdf/i)
  })

  test('shows drop zone on load', async ({ page }) => {
    await page.goto('/split-pdf')
    await expect(page.getByRole('button', { name: /upload pdf/i })).toBeVisible()
  })

  test('shows breadcrumb navigation', async ({ page }) => {
    await page.goto('/split-pdf')
    await expect(page.getByRole('navigation', { name: /breadcrumb/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible()
  })

  test('shows correct tool heading', async ({ page }) => {
    await page.goto('/split-pdf')
    await expect(page.getByRole('heading', { name: /split pdf/i, level: 1 })).toBeVisible()
  })
})
