import React from 'react'

export function ChangeHistory({ onClose }: { onClose: () => void }) {
  return (
    <div data-testid="change-history-modal">
      Change History Modal
      <button onClick={onClose} data-testid="close-history">Close</button>
    </div>
  )
}