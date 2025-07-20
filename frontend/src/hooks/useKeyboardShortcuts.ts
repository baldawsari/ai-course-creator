import { useEffect } from 'react'

interface KeyboardShortcuts {
  [key: string]: () => void
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, metaKey, ctrlKey, shiftKey, altKey } = event
      
      // Build the shortcut string
      let shortcut = ''
      
      if (metaKey || ctrlKey) shortcut += 'mod+'
      if (shiftKey) shortcut += 'shift+'
      if (altKey) shortcut += 'alt+'
      
      shortcut += key.toLowerCase()

      // Check if this shortcut exists
      if (shortcuts[shortcut]) {
        event.preventDefault()
        shortcuts[shortcut]()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts])
}