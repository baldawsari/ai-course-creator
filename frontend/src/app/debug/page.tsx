export default function DebugPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
      <div className="space-y-2">
        <p>This is a simple debug page to test if the app is working.</p>
        <p>Environment variables:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>API URL: {process.env.NEXT_PUBLIC_API_URL || 'Not set'}</li>
          <li>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}</li>
          <li>App Name: {process.env.NEXT_PUBLIC_APP_NAME || 'Not set'}</li>
        </ul>
      </div>
    </div>
  )
}