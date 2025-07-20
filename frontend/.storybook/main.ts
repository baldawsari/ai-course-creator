import type { StorybookConfig } from '@storybook/nextjs'
import path from 'path'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-onboarding',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-viewport',
    '@storybook/addon-design-tokens',
    '@storybook/addon-docs',
    '@storybook/addon-controls',
    '@storybook/addon-actions',
    '@storybook/addon-backgrounds',
    '@storybook/addon-measure',
    '@storybook/addon-outline',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  webpackFinal: async (config) => {
    // Handle path aliases
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../src'),
        '@/components': path.resolve(__dirname, '../src/components'),
        '@/lib': path.resolve(__dirname, '../src/lib'),
        '@/hooks': path.resolve(__dirname, '../src/hooks'),
        '@/types': path.resolve(__dirname, '../src/types'),
        '@/utils': path.resolve(__dirname, '../src/lib/utils'),
      }
    }

    // Handle CSS
    const rules = config.module?.rules || []
    const fileLoaderRule = rules.find((rule) => {
      if (typeof rule !== 'string' && rule?.test instanceof RegExp) {
        return rule.test.test('.svg')
      }
    })
    
    if (fileLoaderRule && typeof fileLoaderRule !== 'string') {
      fileLoaderRule.exclude = /\.svg$/
    }

    rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    })

    return config
  },
  env: (config) => ({
    ...config,
    NEXT_PUBLIC_API_URL: 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL: 'http://localhost:3001',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  }),
  staticDirs: ['../public'],
  docs: {
    autodocs: 'tag',
  },
}