import { describe, it, expect } from 'vitest'
import { parsePptxSlides, slidesToHtml } from '@/lib/convert/pptxToPdf'
import JSZip from 'jszip'

async function createMinimalPptx(slides: { title: string; body: string }[]): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('\n  ')}
</Types>`)
  const pptFolder = zip.folder('ppt')!
  const slidesFolder = pptFolder.folder('slides')!
  slides.forEach(({ title, body }, i) => {
    slidesFolder.file(`slide${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp><p:txBody><a:p><a:r><a:t>${title}</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:txBody><a:p><a:r><a:t>${body}</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`)
  })
  const buf = await zip.generateAsync({ type: 'arraybuffer' })
  return new Uint8Array(buf)
}

describe('parsePptxSlides', () => {
  it('throws for empty input', async () => {
    await expect(parsePptxSlides(new Uint8Array(0))).rejects.toThrow()
  })

  it('extracts text content from slides', async () => {
    const pptx = await createMinimalPptx([
      { title: 'Hello World', body: 'First slide body' },
      { title: 'Slide Two', body: 'Another slide' },
    ])
    const slides = await parsePptxSlides(pptx)
    expect(slides).toHaveLength(2)
    expect(slides[0].texts.join(' ')).toContain('Hello World')
    expect(slides[0].texts.join(' ')).toContain('First slide body')
    expect(slides[1].texts.join(' ')).toContain('Slide Two')
  })

  it('returns empty texts array for slides with no text', async () => {
    const pptx = await createMinimalPptx([{ title: '', body: '' }])
    const slides = await parsePptxSlides(pptx)
    expect(slides[0].texts).toEqual([])
  })
})

describe('slidesToHtml', () => {
  it('generates one slide div per slide', () => {
    const slides = [
      { index: 1, texts: ['Title One', 'Body text'] },
      { index: 2, texts: ['Title Two'] },
    ]
    const html = slidesToHtml(slides)
    const matches = html.match(/class="slide"/g)
    expect(matches).toHaveLength(2)
    expect(html).toContain('Title One')
    expect(html).toContain('Body text')
  })
})
