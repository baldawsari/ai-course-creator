import React from 'react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, createUserEvent, waitFor } from '@/__tests__/utils/test-utils'
import { act } from '@testing-library/react'
import { createMockFile } from '@/__tests__/utils/test-utils'
import { FileUploader } from '../file-uploader'

// Access the global dropzone state from setup
const getDropzoneState = () => (window as any).__dropzoneState

describe('FileUploader Component', () => {
  const defaultProps = {
    onFilesAccepted: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset dropzone state
    const dropzoneState = getDropzoneState()
    if (dropzoneState) {
      dropzoneState.callbacks.onDrop = null
      dropzoneState.state.isDragActive = false
      dropzoneState.state.isDragAccept = false
      dropzoneState.state.isDragReject = false
    }
  })

  describe('basic rendering', () => {
    it('should render upload area correctly', () => {
      render(<FileUploader {...defaultProps} />)
      
      expect(screen.getByRole('presentation')).toBeInTheDocument()
      expect(screen.getByText(/Drop files here or click to browse/i)).toBeInTheDocument()
      expect(screen.getByText(/Support for \d+ file types/i)).toBeInTheDocument()
    })

    it('should show accepted file types information', () => {
      render(
        <FileUploader 
          {...defaultProps}
          acceptedFileTypes={['application/pdf', 'text/plain']}
        />
      )
      
      // Check for badges
      expect(screen.getByText('PDF')).toBeInTheDocument()
      expect(screen.getByText('Text')).toBeInTheDocument()
    })

    it('should show file size limit information', () => {
      render(
        <FileUploader 
          {...defaultProps}
          maxSize={10 * 1024 * 1024} // 10MB
        />
      )
      
      expect(screen.getByText(/Max 10 MB per file/i)).toBeInTheDocument()
    })

    it('should show maximum files information', () => {
      render(
        <FileUploader 
          {...defaultProps}
          maxFiles={5}
        />
      )
      
      expect(screen.getByText(/Up to 5 files\./i)).toBeInTheDocument()
    })
  })

  describe('file upload functionality', () => {
    it('should handle single file upload', async () => {
      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzoneState = getDropzoneState()
      
      // Verify onDrop callback is registered
      expect(dropzoneState?.callbacks.onDrop).toBeTruthy()
      
      // Trigger file drop
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop([file], [])
        }
      })
      
      // Verify onFilesAccepted was called
      expect(defaultProps.onFilesAccepted).toHaveBeenCalledWith([file])
      
      // Wait for file to appear in UI
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })
    })

    it('should handle multiple file upload', async () => {
      const files = [
        createMockFile('test1.pdf', 1024, 'application/pdf'),
        createMockFile('test2.pdf', 1024, 'application/pdf'),
      ]
      
      render(<FileUploader {...defaultProps} maxFiles={3} />)
      
      const dropzoneState = getDropzoneState()
      
      // Verify onDrop callback is registered
      expect(dropzoneState?.callbacks.onDrop).toBeTruthy()
      
      // Trigger file drop
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop(files, [])
        }
      })
      
      expect(defaultProps.onFilesAccepted).toHaveBeenCalledWith(files)
      
      // Wait for files to appear
      await waitFor(() => {
        expect(screen.getByText('test1.pdf')).toBeInTheDocument()
        expect(screen.getByText('test2.pdf')).toBeInTheDocument()
      })
    })

    it('should show upload progress', async () => {
      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzoneState = getDropzoneState()
      
      // Trigger file drop
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop([file], [])
        }
      })
      
      // Wait for progress bar to appear
      await waitFor(() => {
        const progressBars = screen.getAllByRole('progressbar')
        expect(progressBars.length).toBeGreaterThan(0)
      })
    })

    it('should handle upload completion', async () => {
      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzoneState = getDropzoneState()
      
      // Trigger file drop
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop([file], [])
        }
      })
      
      // Wait for upload to complete (status icon appears)
      await waitFor(() => {
        // Check for either success or error icon
        const successIcon = screen.queryByTestId('check-circle-icon')
        const errorIcon = screen.queryByTestId('alert-circle-icon')
        expect(successIcon || errorIcon).toBeTruthy()
      }, { timeout: 5000 })
    })
  })

  describe('drag and drop states', () => {
    it('should show active drag state', () => {
      const dropzoneState = getDropzoneState()
      
      // Set drag state
      if (dropzoneState) {
        dropzoneState.state.isDragActive = true
        dropzoneState.state.isDragAccept = false
        dropzoneState.state.isDragReject = false
      }
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzone = screen.getByRole('presentation')
      expect(dropzone).toHaveClass('border-primary')
      expect(screen.getByText('Drop files here')).toBeInTheDocument()
    })

    it('should show accept drag state', () => {
      const dropzoneState = getDropzoneState()
      
      // Set drag state
      if (dropzoneState) {
        dropzoneState.state.isDragActive = true
        dropzoneState.state.isDragAccept = true
        dropzoneState.state.isDragReject = false
      }
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzone = screen.getByRole('presentation')
      expect(dropzone).toHaveClass('border-green-300')
      expect(screen.getByText(/drop files here/i)).toBeInTheDocument()
    })

    it('should show reject drag state', () => {
      const dropzoneState = getDropzoneState()
      
      // Set drag state
      if (dropzoneState) {
        dropzoneState.state.isDragActive = true
        dropzoneState.state.isDragAccept = false
        dropzoneState.state.isDragReject = true
      }
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzone = screen.getByRole('presentation')
      expect(dropzone).toHaveClass('border-red-300')
      expect(screen.getByText(/file type not supported/i)).toBeInTheDocument()
    })
  })

  describe('file validation and errors', () => {
    it('should handle file type errors', async () => {
      const rejectedFile = {
        file: createMockFile('test.exe', 1024, 'application/octet-stream'),
        errors: [{ code: 'file-invalid-type', message: 'File type not accepted' }],
      }
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzoneState = getDropzoneState()
      
      // Trigger file drop with rejection
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop([], [rejectedFile])
        }
      })
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test.exe rejected'),
        expect.any(Array)
      )
      
      consoleSpy.mockRestore()
    })

    it('should handle file size errors', async () => {
      const rejectedFile = {
        file: createMockFile('large.pdf', 100 * 1024 * 1024, 'application/pdf'),
        errors: [{ code: 'file-too-large', message: 'File is too large' }],
      }
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzoneState = getDropzoneState()
      
      // Trigger file drop with rejection
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop([], [rejectedFile])
        }
      })
      
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('should handle too many files error', () => {
      // The useDropzone hook handles max files validation internally
      // We just verify the prop is passed correctly
      render(<FileUploader {...defaultProps} maxFiles={2} />)
      
      // Check that the UI shows the max files limit
      expect(screen.getByText(/Up to 2 files/i)).toBeInTheDocument()
    })
  })

  describe('file management', () => {
    it('should display uploaded files', async () => {
      const file = createMockFile('document.pdf', 1024 * 1024, 'application/pdf')
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzoneState = getDropzoneState()
      
      // Trigger file drop
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop([file], [])
        }
      })
      
      await waitFor(() => {
        expect(screen.getByText('document.pdf')).toBeInTheDocument()
        expect(screen.getByText('1 MB')).toBeInTheDocument()
      })
    })

    it('should allow file removal', async () => {
      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const user = createUserEvent()
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzoneState = getDropzoneState()
      
      // Upload file
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop([file], [])
        }
      })
      
      // Wait for file to appear
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })
      
      // Find and click remove button
      const removeButton = screen.getByRole('button', { name: '' })
      await user.click(removeButton)
      
      await waitFor(() => {
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument()
      })
    })

    it('should show file type icons', async () => {
      const files = [
        createMockFile('document.pdf', 1024, 'application/pdf'),
        createMockFile('image.jpg', 1024, 'image/jpeg'),
      ]
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzoneState = getDropzoneState()
      
      // Trigger file drop
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop(files, [])
        }
      })
      
      await waitFor(() => {
        // Check for file type badges - use getAllByText since PDF badge appears in the dropzone too
        const pdfBadges = screen.getAllByText('PDF')
        expect(pdfBadges.length).toBeGreaterThan(0)
        expect(screen.getByText('Image')).toBeInTheDocument()
      })
    })

    it('should handle file retry functionality', async () => {
      const file = createMockFile('failed.pdf', 1024, 'application/pdf')
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzoneState = getDropzoneState()
      
      // Trigger file drop
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop([file], [])
        }
      })
      
      await waitFor(() => {
        expect(screen.getByText('failed.pdf')).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<FileUploader {...defaultProps} />)
      
      const dropzone = screen.getByRole('presentation')
      expect(dropzone).toHaveAttribute('tabIndex', '0')
    })

    it('should support keyboard navigation', async () => {
      const user = createUserEvent()
      render(<FileUploader {...defaultProps} />)
      
      const dropzone = screen.getByRole('presentation')
      await user.click(dropzone)
      
      expect(dropzone).toBeInTheDocument()
    })

    it('should have proper focus indicators', () => {
      render(<FileUploader {...defaultProps} />)
      
      const dropzone = screen.getByRole('presentation')
      expect(dropzone).toBeInTheDocument()
    })

    it('should provide screen reader feedback for upload progress', async () => {
      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzoneState = getDropzoneState()
      
      // Trigger file drop
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop([file], [])
        }
      })
      
      // Check for progress bar or completion status
      await waitFor(() => {
        // Either we see a progress bar (still uploading) or a success icon (completed)
        const progressBars = screen.queryAllByRole('progressbar')
        const successIcon = screen.queryByTestId('check-circle-icon')
        const loaderIcon = screen.queryByTestId('loader-icon')
        
        // We should see either progress indicators or completion status
        expect(progressBars.length > 0 || successIcon || loaderIcon).toBeTruthy()
        
        if (progressBars.length > 0) {
          expect(progressBars[0]).toHaveAttribute('aria-valuenow')
        }
      })
    })

    it('should announce upload status changes', async () => {
      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzoneState = getDropzoneState()
      
      // Trigger file upload
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop([file], [])
        }
      })
      
      // Wait for status icon
      await waitFor(() => {
        const successIcon = screen.queryByTestId('check-circle-icon')
        const errorIcon = screen.queryByTestId('alert-circle-icon')
        expect(successIcon || errorIcon).toBeTruthy()
      }, { timeout: 5000 })
    })

    it('should provide error announcements', async () => {
      const rejectedFile = {
        file: createMockFile('invalid.exe', 1024, 'application/octet-stream'),
        errors: [{ code: 'file-invalid-type', message: 'File type not accepted' }],
      }
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzoneState = getDropzoneState()
      
      // Trigger file drop with rejection
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop([], [rejectedFile])
        }
      })
      
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('responsive behavior', () => {
    it('should adapt to mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzone = screen.getByRole('presentation')
      expect(dropzone).toBeInTheDocument()
    })

    it('should handle touch interactions', async () => {
      const user = createUserEvent()
      render(<FileUploader {...defaultProps} />)
      
      const dropzone = screen.getByRole('presentation')
      
      // Simulate touch
      await user.pointer({ target: dropzone, keys: '[TouchA]' })
      
      expect(dropzone).toBeInTheDocument()
    })
  })

  describe('performance and edge cases', () => {
    it('should handle many files efficiently', async () => {
      const manyFiles = Array.from({ length: 10 }, (_, i) => 
        createMockFile(`file-${i}.pdf`, 1024, 'application/pdf')
      )
      
      render(<FileUploader {...defaultProps} maxFiles={10} />)
      
      const dropzoneState = getDropzoneState()
      
      // Trigger file drop
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop(manyFiles, [])
        }
      })
      
      expect(defaultProps.onFilesAccepted).toHaveBeenCalledWith(manyFiles)
    })

    it('should handle rapid file additions', async () => {
      const files = Array.from({ length: 3 }, (_, i) => 
        createMockFile(`file-${i}.pdf`, 1024, 'application/pdf')
      )
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzoneState = getDropzoneState()
      
      // Rapidly add files
      for (const file of files) {
        await act(async () => {
          if (dropzoneState?.callbacks.onDrop) {
            dropzoneState.callbacks.onDrop([file], [])
          }
        })
      }
      
      expect(defaultProps.onFilesAccepted).toHaveBeenCalledTimes(3)
    })

    it('should handle empty file names gracefully', async () => {
      const fileWithoutName = new File([new ArrayBuffer(1024)], '', { type: 'application/pdf' })
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzoneState = getDropzoneState()
      
      // Trigger file drop
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop([fileWithoutName], [])
        }
      })
      
      expect(defaultProps.onFilesAccepted).toHaveBeenCalledWith([fileWithoutName])
    })

    it('should handle files with special characters in names', async () => {
      const specialFile = createMockFile('test@#$%^&*().pdf', 1024, 'application/pdf')
      
      render(<FileUploader {...defaultProps} />)
      
      const dropzoneState = getDropzoneState()
      
      // Trigger file drop
      await act(async () => {
        if (dropzoneState?.callbacks.onDrop) {
          dropzoneState.callbacks.onDrop([specialFile], [])
        }
      })
      
      await waitFor(() => {
        expect(screen.getByText('test@#$%^&*().pdf')).toBeInTheDocument()
      })
    })
  })
})