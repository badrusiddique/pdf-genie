import { describe, it, expect } from 'vitest'
import { workbookToHtml } from '@/lib/convert/excelToPdf'
import ExcelJS from 'exceljs'

async function createTestXlsx(sheets: { name: string; rows: (string | number)[][] }[]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name)
    for (const row of sheet.rows) ws.addRow(row)
  }
  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}

describe('workbookToHtml', () => {
  it('throws for empty input', async () => {
    await expect(workbookToHtml(new Uint8Array(0))).rejects.toThrow()
  })

  it('converts a simple workbook to HTML containing table and cell data', async () => {
    const xlsx = await createTestXlsx([{
      name: 'Sheet1',
      rows: [['Name', 'Age', 'City'], ['Alice', 30, 'London'], ['Bob', 25, 'Paris']],
    }])
    const html = await workbookToHtml(xlsx)
    expect(html).toContain('<table')
    expect(html).toContain('Alice')
    expect(html).toContain('London')
  })

  it('includes all sheet names in the output', async () => {
    const xlsx = await createTestXlsx([
      { name: 'Sales', rows: [['Q1', 100]] },
      { name: 'Inventory', rows: [['Item', 'Count']] },
    ])
    const html = await workbookToHtml(xlsx)
    expect(html).toContain('Sales')
    expect(html).toContain('Inventory')
  })
})
