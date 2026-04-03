import { htmlToPdfBuffer } from './browser'

/**
 * Wraps an HTML fragment in a complete document with print-friendly defaults.
 * If already a full document (contains <html>), returns as-is.
 */
export function buildHtmlDocument(html: string): string {
  if (/<html[\s>]/i.test(html)) return html
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.6; color: #111; margin: 0; padding: 0; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
    pre, code { font-family: 'Courier New', monospace; font-size: 10pt; background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
    h1, h2, h3 { page-break-after: avoid; }
    p { orphans: 3; widows: 3; }
  </style>
</head>
<body>
${html}
</body>
</html>`
}

/**
 * Converts an HTML string to a PDF Uint8Array using headless Chromium.
 * Input can be a fragment or a full document.
 */
export async function convertHtmlToPdf(html: string): Promise<Uint8Array> {
  if (!html || html.trim().length === 0) {
    throw new Error('HTML content cannot be empty')
  }
  const fullDocument = buildHtmlDocument(html)
  const buffer = await htmlToPdfBuffer(fullDocument, {
    format: 'A4',
    margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
  })
  return new Uint8Array(buffer)
}
