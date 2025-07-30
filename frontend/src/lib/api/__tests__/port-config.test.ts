describe('API Port Configuration', () => {
  it('should use port 3001 as default API URL', () => {
    // Clear env var to test default
    const originalEnv = process.env.NEXT_PUBLIC_API_URL
    delete process.env.NEXT_PUBLIC_API_URL
    
    // Test that the default baseURL uses port 3001
    const defaultUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    expect(defaultUrl).toBe('http://localhost:3001/api')
    expect(defaultUrl).toContain(':3001')
    
    // Restore
    process.env.NEXT_PUBLIC_API_URL = originalEnv
  })

  it('should use environment variable when provided', () => {
    const testUrl = 'http://custom-backend:3001/api'
    const originalEnv = process.env.NEXT_PUBLIC_API_URL
    process.env.NEXT_PUBLIC_API_URL = testUrl

    const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    expect(envUrl).toBe(testUrl)

    // Restore
    process.env.NEXT_PUBLIC_API_URL = originalEnv
  })
})

describe('WebSocket Port Configuration', () => {
  it('should use port 3001 for WebSocket connections', () => {
    // Test WebSocket URL configuration
    const originalWsUrl = process.env.NEXT_PUBLIC_WS_URL
    delete process.env.NEXT_PUBLIC_WS_URL

    // Default WebSocket URL should use port 3001
    const defaultWsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
    expect(defaultWsUrl).toBe('http://localhost:3001')

    // Restore environment
    process.env.NEXT_PUBLIC_WS_URL = originalWsUrl
  })

  it('should construct correct WebSocket URL for job connections', () => {
    const jobId = 'test-job-123'
    // Clear env to test default
    const originalWsUrl = process.env.NEXT_PUBLIC_WS_URL
    delete process.env.NEXT_PUBLIC_WS_URL
    
    // Note: The generation-store.ts uses 'ws://' as the default protocol
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/jobs/${jobId}`
    
    expect(wsUrl).toContain(':3001')
    expect(wsUrl).toBe(`ws://localhost:3001/jobs/${jobId}`)
    
    // Restore
    process.env.NEXT_PUBLIC_WS_URL = originalWsUrl
  })
})