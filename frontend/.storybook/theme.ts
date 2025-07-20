import { create } from '@storybook/theming/create'

export default create({
  base: 'light',
  
  // Brand
  brandTitle: 'AI Course Creator',
  brandUrl: 'https://ai-course-creator.com',
  brandImage: '/logo.svg',
  brandTarget: '_self',

  // Colors
  colorPrimary: '#7c3aed', // Royal Purple
  colorSecondary: '#f59e0b', // Golden Amber

  // UI
  appBg: '#ffffff',
  appContentBg: '#ffffff',
  appBorderColor: '#e5e7eb',
  appBorderRadius: 8,

  // Text
  textColor: '#1f2937',
  textInverseColor: '#ffffff',

  // Toolbar
  barTextColor: '#6b7280',
  barSelectedColor: '#7c3aed',
  barBg: '#f9fafb',

  // Form
  inputBg: '#ffffff',
  inputBorder: '#d1d5db',
  inputTextColor: '#1f2937',
  inputBorderRadius: 6,

  // Fonts
  fontBase: '"Plus Jakarta Sans", "Inter", sans-serif',
  fontCode: '"Fira Code", "Monaco", "Consolas", monospace',
})