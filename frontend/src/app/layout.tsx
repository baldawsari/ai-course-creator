import type { Metadata } from 'next'
import { Lexend, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const lexend = Lexend({ 
  subsets: ['latin'],
  variable: '--font-lexend',
})

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
})

export const metadata: Metadata = {
  title: 'AI Course Creator',
  description: 'Generate interactive HTML course materials using advanced RAG technology',
  keywords: ['AI', 'course', 'creator', 'education', 'RAG', 'learning'],
  authors: [{ name: 'AI Course Creator Team' }],
  creator: 'AI Course Creator',
  publisher: 'AI Course Creator',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://ai-course-creator.com'),
  openGraph: {
    title: 'AI Course Creator',
    description: 'Generate interactive HTML course materials using advanced RAG technology',
    url: 'https://ai-course-creator.com',
    siteName: 'AI Course Creator',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI Course Creator',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Course Creator',
    description: 'Generate interactive HTML course materials using advanced RAG technology',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${lexend.variable} ${plusJakartaSans.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}