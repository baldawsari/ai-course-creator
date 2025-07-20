import { useState, useCallback, useMemo, useEffect } from 'react'

export interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  success: string
  warning: string
  error: string
}

export interface TypographySettings {
  heading: string
  body: string
  mono: string
  size: number
  lineHeight: number
  headingScale: number
}

export interface SpacingSettings {
  sections: number
  paragraphs: number
  elements: number
  margins: number
  padding: number
}

export interface ComponentSettings {
  showProgress: boolean
  showToc: boolean
  showComments: boolean
  showActivities: boolean
  showNavigation: boolean
  showFooter: boolean
  showBreadcrumbs: boolean
  enableSearch: boolean
}

export interface AnimationSettings {
  enabled: boolean
  duration: number
  easing: string
  reduceMotion: boolean
  pageTransitions: boolean
  hoverEffects: boolean
}

export interface LayoutSettings {
  maxWidth: string
  sidebar: 'left' | 'right' | 'none'
  sidebarWidth: number
  headerHeight: number
  footerHeight: number
  gridColumns: number
}

export interface DesignSettings {
  template: string
  colors: ColorPalette
  typography: TypographySettings
  spacing: SpacingSettings
  components: ComponentSettings
  animations: AnimationSettings
  layout: LayoutSettings
  customCSS: string
  branding: {
    logo?: string
    organizationName?: string
    primaryColor?: string
    secondaryColor?: string
  }
}

export interface DesignPreset {
  id: string
  name: string
  description: string
  settings: DesignSettings
  isDefault?: boolean
  createdAt: Date
  updatedAt: Date
}

const DEFAULT_SETTINGS: DesignSettings = {
  template: 'modern-glass',
  colors: {
    primary: '#7C3AED',
    secondary: '#F59E0B',
    accent: '#06B6D4',
    background: '#FFFFFF',
    text: '#1F2937',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444'
  },
  typography: {
    heading: 'Lexend',
    body: 'Plus Jakarta Sans',
    mono: 'ui-monospace',
    size: 16,
    lineHeight: 1.6,
    headingScale: 1.25
  },
  spacing: {
    sections: 32,
    paragraphs: 16,
    elements: 8,
    margins: 24,
    padding: 16
  },
  components: {
    showProgress: true,
    showToc: true,
    showComments: false,
    showActivities: true,
    showNavigation: true,
    showFooter: true,
    showBreadcrumbs: true,
    enableSearch: true
  },
  animations: {
    enabled: true,
    duration: 300,
    easing: 'ease-out',
    reduceMotion: false,
    pageTransitions: true,
    hoverEffects: true
  },
  layout: {
    maxWidth: '1200px',
    sidebar: 'left',
    sidebarWidth: 280,
    headerHeight: 64,
    footerHeight: 120,
    gridColumns: 12
  },
  customCSS: '',
  branding: {}
}

export function useDesignSettings(initialSettings?: Partial<DesignSettings>) {
  const [settings, setSettings] = useState<DesignSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...initialSettings
  }))

  const [presets, setPresets] = useState<DesignPreset[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Generate CSS variables from settings
  const cssVariables = useMemo(() => {
    const vars: Record<string, string> = {}

    // Color variables
    Object.entries(settings.colors).forEach(([key, value]) => {
      vars[`--color-${key}`] = value
    })

    // Typography variables
    vars['--font-heading'] = settings.typography.heading
    vars['--font-body'] = settings.typography.body
    vars['--font-mono'] = settings.typography.mono
    vars['--font-size-base'] = `${settings.typography.size}px`
    vars['--line-height-base'] = settings.typography.lineHeight.toString()
    vars['--heading-scale'] = settings.typography.headingScale.toString()

    // Spacing variables
    Object.entries(settings.spacing).forEach(([key, value]) => {
      vars[`--spacing-${key}`] = `${value}px`
    })

    // Layout variables
    vars['--max-width'] = settings.layout.maxWidth
    vars['--sidebar-width'] = `${settings.layout.sidebarWidth}px`
    vars['--header-height'] = `${settings.layout.headerHeight}px`
    vars['--footer-height'] = `${settings.layout.footerHeight}px`

    // Animation variables
    vars['--animation-duration'] = `${settings.animations.duration}ms`
    vars['--animation-easing'] = settings.animations.easing

    return vars
  }, [settings])

  // Generate compiled CSS
  const compiledCSS = useMemo(() => {
    const variables = Object.entries(cssVariables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n')

    const baseCSS = `
:root {
${variables}
}

/* Base styles */
body {
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  color: var(--color-text);
  background-color: var(--color-background);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  color: var(--color-primary);
}

.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--spacing-margins);
}

/* Animation controls */
${!settings.animations.enabled ? `
*, *::before, *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}
` : ''}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Custom user CSS */
${settings.customCSS}
`

    return baseCSS
  }, [cssVariables, settings.customCSS, settings.animations.enabled])

  // Settings updaters
  const updateColors = useCallback((colors: Partial<ColorPalette>) => {
    setSettings(prev => ({
      ...prev,
      colors: { ...prev.colors, ...colors }
    }))
    setIsDirty(true)
  }, [])

  const updateTypography = useCallback((typography: Partial<TypographySettings>) => {
    setSettings(prev => ({
      ...prev,
      typography: { ...prev.typography, ...typography }
    }))
    setIsDirty(true)
  }, [])

  const updateSpacing = useCallback((spacing: Partial<SpacingSettings>) => {
    setSettings(prev => ({
      ...prev,
      spacing: { ...prev.spacing, ...spacing }
    }))
    setIsDirty(true)
  }, [])

  const updateComponents = useCallback((components: Partial<ComponentSettings>) => {
    setSettings(prev => ({
      ...prev,
      components: { ...prev.components, ...components }
    }))
    setIsDirty(true)
  }, [])

  const updateAnimations = useCallback((animations: Partial<AnimationSettings>) => {
    setSettings(prev => ({
      ...prev,
      animations: { ...prev.animations, ...animations }
    }))
    setIsDirty(true)
  }, [])

  const updateLayout = useCallback((layout: Partial<LayoutSettings>) => {
    setSettings(prev => ({
      ...prev,
      layout: { ...prev.layout, ...layout }
    }))
    setIsDirty(true)
  }, [])

  const updateCustomCSS = useCallback((customCSS: string) => {
    setSettings(prev => ({ ...prev, customCSS }))
    setIsDirty(true)
  }, [])

  const updateBranding = useCallback((branding: Partial<DesignSettings['branding']>) => {
    setSettings(prev => ({
      ...prev,
      branding: { ...prev.branding, ...branding }
    }))
    setIsDirty(true)
  }, [])

  // Generic setting updater
  const updateSetting = useCallback((section: keyof DesignSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
    setIsDirty(true)
  }, [])

  // Preset management
  const saveAsPreset = useCallback(async (name: string, description: string) => {
    const preset: DesignPreset = {
      id: `preset-${Date.now()}`,
      name,
      description,
      settings: { ...settings },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    setPresets(prev => [...prev, preset])
    return preset
  }, [settings])

  const loadPreset = useCallback((preset: DesignPreset) => {
    setSettings(preset.settings)
    setIsDirty(true)
  }, [])

  const deletePreset = useCallback((presetId: string) => {
    setPresets(prev => prev.filter(p => p.id !== presetId))
  }, [])

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    setIsDirty(true)
  }, [])

  // Validation
  const validateSettings = useCallback(() => {
    const errors: string[] = []

    // Validate colors
    Object.entries(settings.colors).forEach(([key, value]) => {
      if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
        errors.push(`Invalid color value for ${key}: ${value}`)
      }
    })

    // Validate spacing values
    Object.entries(settings.spacing).forEach(([key, value]) => {
      if (value < 0 || value > 200) {
        errors.push(`Spacing value for ${key} must be between 0 and 200px`)
      }
    })

    // Validate typography
    if (settings.typography.size < 10 || settings.typography.size > 32) {
      errors.push('Base font size must be between 10 and 32px')
    }

    if (settings.typography.lineHeight < 1 || settings.typography.lineHeight > 3) {
      errors.push('Line height must be between 1 and 3')
    }

    return errors
  }, [settings])

  // Theme detection
  const applyColorScheme = useCallback((scheme: 'light' | 'dark' | 'auto') => {
    let colors: Partial<ColorPalette>

    if (scheme === 'light') {
      colors = {
        background: '#FFFFFF',
        text: '#1F2937'
      }
    } else if (scheme === 'dark') {
      colors = {
        background: '#111827',
        text: '#F9FAFB'
      }
    } else {
      // Auto - detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      colors = prefersDark ? {
        background: '#111827',
        text: '#F9FAFB'
      } : {
        background: '#FFFFFF',
        text: '#1F2937'
      }
    }

    updateColors(colors)
  }, [updateColors])

  // Export/Import
  const exportSettings = useCallback(() => {
    return {
      version: '1.0',
      settings,
      exported: new Date().toISOString()
    }
  }, [settings])

  const importSettings = useCallback((importedData: any) => {
    try {
      if (importedData.version === '1.0' && importedData.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...importedData.settings })
        setIsDirty(true)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to import settings:', error)
      return false
    }
  }, [])

  // Auto-save effect (optional)
  useEffect(() => {
    if (isDirty) {
      const timer = setTimeout(() => {
        // Auto-save logic here if needed
        setIsDirty(false)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [isDirty])

  return {
    // Current state
    settings,
    presets,
    isDirty,
    isLoading,
    cssVariables,
    compiledCSS,

    // Section updaters
    updateColors,
    updateTypography,
    updateSpacing,
    updateComponents,
    updateAnimations,
    updateLayout,
    updateCustomCSS,
    updateBranding,
    updateSetting,

    // Preset management
    saveAsPreset,
    loadPreset,
    deletePreset,
    resetToDefaults,

    // Utilities
    validateSettings,
    applyColorScheme,
    exportSettings,
    importSettings
  }
}