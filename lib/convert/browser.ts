import chromium from '@sparticuz/chromium-min'
import puppeteer from 'puppeteer-core'

// Local Chrome paths for development (macOS / Linux)
const DEV_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
  '/Applications/Chromium.app/Contents/MacOS/Chromium',           // macOS Chromium
  '/usr/bin/google-chrome',                                        // Linux
  '/usr/bin/chromium-browser',                                     // Linux
]

async function findLocalChrome(): Promise<string | null> {
  const { existsSync } = await import('fs')
  return DEV_CHROME_PATHS.find(p => existsSync(p)) ?? null
}

/**
 * Launches a headless Chromium instance.
 * - Development: uses locally installed Chrome (avoids downloading Linux binary on macOS)
 * - Production (Vercel): downloads @sparticuz/chromium from S3
 */
export async function launchBrowser() {
  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    const localChrome = process.env.CHROME_EXECUTABLE_PATH ?? await findLocalChrome()
    if (!localChrome) {
      throw new Error('No local Chrome found for development. Install Google Chrome or set CHROME_EXECUTABLE_PATH.')
    }
    return puppeteer.launch({
      executablePath: localChrome,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1280, height: 720 },
    })
  }

  // Production: use serverless Chromium
  const executablePath = await chromium.executablePath(
    'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
  )
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 720 },
    executablePath,
    headless: true,
  })
}

/**
 * Renders an HTML string to a PDF buffer using headless Chromium.
 * @param html - Full HTML document string (must include <html><body>)
 * @param options - PDF options
 */
export async function htmlToPdfBuffer(
  html: string,
  options: {
    format?: 'A4' | 'Letter'
    margin?: { top: string; bottom: string; left: string; right: string }
  } = {}
): Promise<Buffer> {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: options.format ?? 'A4',
      margin: options.margin ?? { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
      printBackground: true,
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
