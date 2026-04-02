import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// We'll use a real minimal PDF as a fixture
const FIXTURE_PDF = path.join(process.cwd(), '__tests__/fixtures/sample.pdf')

test.describe('Merge PDF', () => {
  test.beforeAll(async () => {
    // Create a minimal fixture PDF if it doesn't exist
    if (!fs.existsSync(FIXTURE_PDF)) {
      // Create a simple PDF fixture using just bytes
      const minimalPdf = Buffer.from([
        0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, // %PDF-1.4
        0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A,       // comment
        0x31, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A,  // 1 0 obj
        0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65, 0x20,  // <</Type
        0x2F, 0x43, 0x61, 0x74, 0x61, 0x6C, 0x6F, 0x67,  // /Catalog
        0x20, 0x2F, 0x50, 0x61, 0x67, 0x65, 0x73, 0x20,  // /Pages
        0x32, 0x20, 0x30, 0x20, 0x52, 0x3E, 0x3E, 0x0A,  // 2 0 R>>
        0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A,        // endobj
      ])
      fs.writeFileSync(FIXTURE_PDF, minimalPdf)
    }
  })

  test('page loads with correct title', async ({ page }) => {
    await page.goto('/merge-pdf')
    await expect(page).toHaveTitle(/merge pdf/i)
  })

  test('shows drop zone on load', async ({ page }) => {
    await page.goto('/merge-pdf')
    await expect(page.getByRole('button', { name: /upload pdf/i })).toBeVisible()
  })

  test('shows breadcrumb navigation', async ({ page }) => {
    await page.goto('/merge-pdf')
    await expect(page.getByRole('navigation', { name: /breadcrumb/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible()
  })
})
