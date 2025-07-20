import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container-custom section-padding">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gradient mb-6">
            AI Course Creator
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Generate interactive HTML course materials using advanced RAG technology. 
            Transform your documents into engaging learning experiences.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card className="hover-glow">
            <CardHeader>
              <CardTitle className="text-primary">🚀 Quick Start</CardTitle>
              <CardDescription>
                Upload your documents and generate courses in minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Support for PDFs, Word documents, and URLs with intelligent content processing
              </p>
            </CardContent>
          </Card>

          <Card className="hover-glow">
            <CardHeader>
              <CardTitle className="text-accent">🎯 Smart RAG</CardTitle>
              <CardDescription>
                Advanced retrieval-augmented generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Hybrid search with vector database and AI reranking for accurate content
              </p>
            </CardContent>
          </Card>

          <Card className="hover-glow">
            <CardHeader>
              <CardTitle className="text-success">📚 Multi-Format</CardTitle>
              <CardDescription>
                Export to HTML, PDF, and PowerPoint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Professional templates with customizable branding and themes
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="text-lg px-8 light-burst">
            <Link href="/dashboard">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-lg px-8">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}