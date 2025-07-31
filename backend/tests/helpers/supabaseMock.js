/**
 * Shared Supabase mock helper for consistent mocking across all test files
 */

/**
 * Creates a mock Supabase client with chainable methods
 * @returns {Object} Mock Supabase client
 */
function createMockSupabaseClient() {
  const mockChain = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    
    // Storage methods
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: Buffer.from('test'), error: null }),
        remove: jest.fn().mockResolvedValue({ data: [], error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test.url' } }),
        createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://test.signed.url' }, error: null })
      })
    },
    
    // Auth methods
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null }),
      signUp: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' }, session: {} }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      updateUser: jest.fn().mockResolvedValue({ data: { user: {} }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
    },
    
    // RPC methods
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    
    // Realtime methods
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn()
    })
  };
  
  // Add default resolved value for chain termination
  const defaultResolvedValue = { data: [], error: null, count: 0 };
  
  // Make each method resolve to default value if called as promise
  Object.keys(mockChain).forEach(method => {
    if (typeof mockChain[method] === 'function' && method !== 'storage' && method !== 'auth' && method !== 'channel') {
      const originalMethod = mockChain[method];
      mockChain[method] = jest.fn((...args) => {
        const result = originalMethod(...args);
        // Add then/catch to make it thenable
        result.then = jest.fn((cb) => cb(defaultResolvedValue));
        result.catch = jest.fn(() => result);
        return result;
      });
      mockChain[method].mockReturnThis = originalMethod.mockReturnThis.bind(originalMethod);
      mockChain[method].mockResolvedValue = originalMethod.mockResolvedValue.bind(originalMethod);
      mockChain[method].mockRejectedValue = originalMethod.mockRejectedValue.bind(originalMethod);
    }
  });
  
  return mockChain;
}

/**
 * Creates a mock Supabase config instance
 * @returns {Object} Mock Supabase config
 */
function createMockSupabaseConfig() {
  const mockClient = createMockSupabaseClient();
  const mockAdminClient = createMockSupabaseClient();
  
  return {
    initialize: jest.fn(),
    validateConfig: jest.fn(),
    createClients: jest.fn(),
    getClient: jest.fn().mockReturnValue(mockClient),
    getAdminClient: jest.fn().mockReturnValue(mockAdminClient),
    testConnection: jest.fn().mockResolvedValue(true),
    getTableConfig: jest.fn().mockReturnValue({
      columns: ['id', 'created_at', 'updated_at'],
      requiredColumns: [],
      indexes: []
    }),
    validateSchema: jest.fn().mockResolvedValue({}),
    client: mockClient,
    adminClient: mockAdminClient,
    config: {
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key'.padEnd(100, 'x'),
      serviceKey: 'test-service-key'.padEnd(100, 'x')
    }
  };
}

/**
 * Sets up Supabase mocks for a test file
 * Call this in beforeAll() or at the top of your test file
 */
function setupSupabaseMocks() {
  // Mock the createClient function
  jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => createMockSupabaseClient())
  }));
  
  // Mock the supabase config
  const mockConfig = createMockSupabaseConfig();
  
  jest.mock('../../src/config/supabase', () => ({
    __esModule: true,
    default: mockConfig,
    SupabaseConfig: jest.fn(() => mockConfig),
    supabaseConfig: mockConfig
  }));
  
  return mockConfig;
}

/**
 * Helper to set mock return values for Supabase queries
 * @param {Object} mockClient - Mock Supabase client
 * @param {Object} returnValue - Value to return from the query
 */
function setMockReturnValue(mockClient, returnValue) {
  const methods = ['from', 'select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle'];
  methods.forEach(method => {
    if (mockClient[method]) {
      mockClient[method].mockImplementation(() => {
        const result = { ...mockClient };
        result.then = jest.fn((cb) => cb(returnValue));
        result.catch = jest.fn(() => result);
        return result;
      });
    }
  });
}

/**
 * Helper to simulate Supabase errors
 * @param {Object} mockClient - Mock Supabase client
 * @param {Object} error - Error to return
 */
function setMockError(mockClient, error) {
  setMockReturnValue(mockClient, { data: null, error });
}

/**
 * Reset all Supabase mocks
 */
function resetSupabaseMocks() {
  jest.clearAllMocks();
}

module.exports = {
  createMockSupabaseClient,
  createMockSupabaseConfig,
  setupSupabaseMocks,
  setMockReturnValue,
  setMockError,
  resetSupabaseMocks
};