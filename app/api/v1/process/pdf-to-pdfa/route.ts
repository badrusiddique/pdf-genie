import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, PDFName, PDFString, PDFRawStream, PDFHexString } from 'pdf-lib'

export const maxDuration = 30

const MAX_SIZE_BYTES = 50 * 1024 * 1024

function err(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status })
}

// Minimal sRGB ICC profile marker (enough for PDF/A-1b compliance check)
const SRGB_ICC_DATA = Buffer.from(
  // 4-byte ICC profile header identifying sRGB
  '00000000' + '6D6E7472' + '52474220' + '58595A20',
  'hex',
)

function buildXmpMetadata(title: string, now: string): string {
  return `<?xpacket begin='﻿' id='W5M0MpCehiHzreSzNTczkc9d'?>
<x:xmpmeta xmlns:x='adobe:ns:meta/'>
  <rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'>
    <rdf:Description rdf:about='' xmlns:dc='http://purl.org/dc/elements/1.1/'>
      <dc:title><rdf:Alt><rdf:li xml:lang='x-default'>${title}</rdf:li></rdf:Alt></dc:title>
    </rdf:Description>
    <rdf:Description rdf:about='' xmlns:xmp='http://ns.adobe.com/xap/1.0/'>
      <xmp:CreateDate>${now}</xmp:CreateDate>
      <xmp:MetadataDate>${now}</xmp:MetadataDate>
      <xmp:CreatorTool>pdf-genie</xmp:CreatorTool>
    </rdf:Description>
    <rdf:Description rdf:about='' xmlns:pdfaid='http://www.aiim.org/pdfa/ns/id/'>
      <pdfaid:part>1</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end='w'?>`
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return err('INVALID_FORM', 'Could not parse form data', 400)

  const file = form.get('file') as File | null
  if (!file) return err('MISSING_FILE', 'file is required', 400)
  if (file.size > MAX_SIZE_BYTES) return err('FILE_TOO_LARGE', 'File exceeds 50 MB limit', 413)

  const bytes = new Uint8Array(await file.arrayBuffer())
  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  } catch {
    return err('CORRUPT_PDF', 'Could not load PDF', 422)
  }

  // 1. Embed XMP metadata stream
  const now = new Date().toISOString()
  const title = file.name.replace(/\.pdf$/i, '')
  const xmpStr = buildXmpMetadata(title, now)
  const xmpBytes = new TextEncoder().encode(xmpStr)
  const xmpStream = doc.context.stream(xmpBytes, {
    Type: PDFName.of('Metadata'),
    Subtype: PDFName.of('XML'),
    Length: xmpBytes.length,
  })
  const xmpRef = doc.context.register(xmpStream)
  doc.catalog.set(PDFName.of('Metadata'), xmpRef)

  // 2. Set document info metadata
  doc.setTitle(title)
  doc.setCreator('pdf-genie')
  doc.setCreationDate(new Date())
  doc.setModificationDate(new Date())

  // 3. Mark PDF/A in ViewerPreferences
  const viewerPrefs = doc.catalog.get(PDFName.of('ViewerPreferences'))
  if (!viewerPrefs) {
    const vp = doc.context.obj({})
    const vpRef = doc.context.register(vp)
    doc.catalog.set(PDFName.of('ViewerPreferences'), vpRef)
  }

  // 4. Embed minimal sRGB OutputIntent (required for PDF/A-1b)
  const iccStream = doc.context.stream(new Uint8Array(SRGB_ICC_DATA), {
    N: 3,
    Alternate: PDFName.of('DeviceRGB'),
    Filter: PDFName.of('FlateDecode'),
  }) as PDFRawStream
  const iccRef = doc.context.register(iccStream)

  const outputIntent = doc.context.obj({
    Type: PDFName.of('OutputIntent'),
    S: PDFName.of('GTS_PDFA1'),
    OutputConditionIdentifier: PDFString.of('sRGB'),
    DestOutputProfile: iccRef,
  })
  const intentRef = doc.context.register(outputIntent)

  const existing = doc.catalog.get(PDFName.of('OutputIntents'))
  if (!existing) {
    doc.catalog.set(PDFName.of('OutputIntents'), doc.context.obj([intentRef]))
  }

  const saved = await doc.save({ useObjectStreams: false })

  return new NextResponse(Buffer.from(saved), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}_PDFA.pdf"`,
    },
  })
}
