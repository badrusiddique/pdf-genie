import ExcelJS from 'exceljs'
import { htmlToPdfBuffer } from './browser'

/**
 * Converts XLSX bytes to an HTML string with styled tables, one per sheet.
 * Exported for unit testing — no browser dependency.
 */
export async function workbookToHtml(xlsxBytes: Uint8Array): Promise<string> {
  if (xlsxBytes.length === 0) {
    throw new Error('Excel input is empty')
  }

  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(xlsxBytes.buffer as ArrayBuffer)
  } catch {
    throw new Error('Failed to parse Excel file. The file may be corrupt or not a valid .xlsx document.')
  }

  const sheetsHtml: string[] = []

  wb.eachSheet(sheet => {
    const rows: string[] = []
    sheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
      const values = (row.values as ExcelJS.CellValue[]).slice(1) // index 0 is undefined
      const tag = rowNum === 1 ? 'th' : 'td'
      const cellsHtml = values
        .map(v => `<${tag} style="border:1px solid #d0d7de;padding:6px 10px;white-space:nowrap;">${v ?? ''}</${tag}>`)
        .join('')
      rows.push(`<tr>${cellsHtml}</tr>`)
    })

    sheetsHtml.push(`
      <h2 style="font-family:sans-serif;font-size:14pt;margin:24px 0 8px;color:#24292f;">${sheet.name}</h2>
      <div style="overflow-x:auto;">
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:10pt;width:100%;">
          ${rows.join('\n')}
        </table>
      </div>
    `)
  })

  if (sheetsHtml.length === 0) {
    throw new Error('The Excel file contains no sheets with data.')
  }

  return sheetsHtml.join('\n<hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />\n')
}

/**
 * Converts an XLSX Uint8Array to a PDF Uint8Array.
 */
export async function convertExcelToPdf(xlsxBytes: Uint8Array): Promise<Uint8Array> {
  const bodyHtml = await workbookToHtml(xlsxBytes)
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #111; margin: 0; padding: 16px; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`
  const buffer = await htmlToPdfBuffer(fullHtml, {
    format: 'A4',
    margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
  })
  return new Uint8Array(buffer)
}
