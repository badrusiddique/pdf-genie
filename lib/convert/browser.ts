import chromium from '@sparticuz/chromium-min'
import puppeteer from 'puppeteer-core'

/**
 * Launches a headless Chromium instance compatible with Vercel serverless.
 * Downloads chromium from the public S3 bucket on first cold start.
 * Caller is responsible for closing the browser.
 */
export async function launchBrowser() {
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
