import JSZip from 'jszip'
import { htmlToPdfBuffer } from './browser'

export interface ParsedSlide {
  index: number
  texts: string[]
}

/**
 * Parses a PPTX file and extracts text from each slide.
 * PPTX is a ZIP containing XML; we parse ppt/slides/slide*.xml.
 * Exported for unit testing — no browser dependency.
 */
export async function parsePptxSlides(pptxBytes: Uint8Array): Promise<ParsedSlide[]> {
  if (pptxBytes.length === 0) {
    throw new Error('PPTX input is empty')
  }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(pptxBytes.buffer as ArrayBuffer)
  } catch {
    throw new Error('Failed to parse PPTX file. The file may be corrupt or not a valid PowerPoint document.')
  }

  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)![0])
      const numB = parseInt(b.match(/\d+/)![0])
      return numA - numB
    })

  if (slideFiles.length === 0) {
    throw new Error('No slides found in the PowerPoint file.')
  }

  const slides: ParsedSlide[] = []
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async('text')
    const textMatches = xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)
    const texts = Array.from(textMatches)
      .map(m => m[1].trim())
      .filter(t => t.length > 0)
    slides.push({ index: i + 1, texts })
  }

  return slides
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Renders parsed slides as an HTML document, one slide per page.
 * Exported for unit testing.
 */
export function slidesToHtml(slides: ParsedSlide[]): string {
  const slideHtml = slides.map(slide => {
    const [title, ...bodyTexts] = slide.texts
    return `
      <div class="slide">
        <div class="slide-number">${slide.index} / ${slides.length}</div>
        ${title ? `<h1 class="slide-title">${escapeHtml(title)}</h1>` : ''}
        <div class="slide-body">
          ${bodyTexts.map(t => `<p>${escapeHtml(t)}</p>`).join('')}
        </div>
      </div>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    @page { size: 960px 540px; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
    .slide {
      width: 960px; height: 540px;
      display: flex; flex-direction: column; justify-content: center;
      padding: 60px 80px;
      background: #fff;
      page-break-after: always;
      position: relative;
      border-bottom: 4px solid #0891B2;
    }
    .slide:last-child { page-break-after: avoid; }
    .slide-number {
      position: absolute; top: 20px; right: 30px;
      font-size: 11px; color: #94a3b8;
    }
    .slide-title {
      font-size: 36px; font-weight: 700; color: #0c1a2e;
      margin: 0 0 20px; line-height: 1.2;
    }
    .slide-body p {
      font-size: 20px; color: #334155; margin: 8px 0; line-height: 1.5;
    }
  </style>
</head>
<body>
${slideHtml}
</body>
</html>`
}

/**
 * Converts a PPTX Uint8Array to a PDF Uint8Array.
 * Text content preserved; graphics/animations/images not rendered.
 */
export async function convertPptxToPdf(pptxBytes: Uint8Array): Promise<Uint8Array> {
  const slides = await parsePptxSlides(pptxBytes)
  const html = slidesToHtml(slides)
  const buffer = await htmlToPdfBuffer(html, {
    format: 'Letter',
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  })
  return new Uint8Array(buffer)
}
