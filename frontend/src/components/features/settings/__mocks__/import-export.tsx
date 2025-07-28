import React from 'react'

export function ImportExportSettings({ onClose }: { onClose: () => void }) {
  return (
    <div data-testid="import-export-modal">
      Import/Export Modal
      <button onClick={onClose} data-testid="close-import-export">Close</button>
    </div>
  )
}