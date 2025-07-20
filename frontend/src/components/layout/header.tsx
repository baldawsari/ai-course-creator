'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Header() {
  const pathname = usePathname()
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-custom flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-gradient">AI Course Creator</span>
        </Link>
        
        <nav className="flex items-center space-x-6 ml-8">
          <Link 
            href="/dashboard" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Dashboard
          </Link>
          <Link 
            href="/courses" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === '/courses' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Courses
          </Link>
          <Link 
            href="/documents" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === '/documents' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Documents
          </Link>
        </nav>
        
        <div className="ml-auto flex items-center space-x-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}