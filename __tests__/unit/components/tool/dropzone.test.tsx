import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ToolDropzone } from '@/components/tool/ToolDropzone'
import { tools } from '@/config/tools'

const mergeTool = tools.find(t => t.slug === 'merge-pdf')!

describe('ToolDropzone', () => {
  it('renders empty drop zone when no files', () => {
    render(<ToolDropzone tool={mergeTool} files={[]} onFilesChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /upload pdf/i })).toBeInTheDocument()
  })

  it('shows file list when files present', () => {
    const file: import('@/components/tool/ToolDropzone').UploadedFile = {
      file: new File(['%PDF'], 'test.pdf', { type: 'application/pdf' }),
      id: 'test-id',
    }
    render(<ToolDropzone tool={mergeTool} files={[file]} onFilesChange={vi.fn()} />)
    expect(screen.getByText('test.pdf')).toBeInTheDocument()
  })

  it('shows error for oversized file', async () => {
    const user = userEvent.setup()
    render(<ToolDropzone tool={mergeTool} files={[]} onFilesChange={vi.fn()} />)
    // Simulate file exceeding size limit
    const bigFile = new File([new ArrayBuffer(200 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, bigFile)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('calls onFilesChange with valid file', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ToolDropzone tool={mergeTool} files={[]} onFilesChange={onChange} />)
    const validFile = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, validFile)
    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ file: validFile })
    ]))
  })
})
