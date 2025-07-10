const { createClient } = require('@supabase/supabase-js');
const { getDatabaseConfig } = require('./index');

class SupabaseConfig {
  constructor() {
    this.config = null;
    this.client = null;
    this.adminClient = null;
  }

  initialize() {
    if (this.config) return;

    this.config = getDatabaseConfig().supabase;
    
    this.validateConfig();
    this.createClients();
    
    console.log('Supabase configuration initialized');
  }

  validateConfig() {
    const required = ['url', 'anonKey', 'serviceKey'];
    const missing = required.filter(key => !this.config[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing Supabase configuration: ${missing.join(', ')}`);
    }

    if (!this.config.url.startsWith('https://')) {
      throw new Error('Supabase URL must use HTTPS');
    }

    if (this.config.anonKey.length < 100) {
      throw new Error('Supabase anonymous key appears to be invalid');
    }

    if (this.config.serviceKey.length < 100) {
      throw new Error('Supabase service key appears to be invalid');
    }
  }

  createClients() {
    const clientOptions = {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'ai-course-creator-backend',
        },
      },
    };

    this.client = createClient(
      this.config.url,
      this.config.anonKey,
      clientOptions
    );

    this.adminClient = createClient(
      this.config.url,
      this.config.serviceKey,
      {
        ...clientOptions,
        auth: {
          ...clientOptions.auth,
          persistSession: false,
        },
      }
    );
  }

  getClient() {
    if (!this.client) {
      throw new Error('Supabase client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  getAdminClient() {
    if (!this.adminClient) {
      throw new Error('Supabase admin client not initialized. Call initialize() first.');
    }
    return this.adminClient;
  }

  async testConnection() {
    try {
      const { data, error } = await this.adminClient
        .from('documents')
        .select('count')
        .limit(1);

      if (error) {
        console.warn('Supabase connection test warning:', error.message);
        return false;
      }

      console.log('Supabase connection test successful');
      return true;
    } catch (error) {
      console.error('Supabase connection test failed:', error.message);
      return false;
    }
  }

  getTableConfig(tableName) {
    const tableConfigs = {
      documents: {
        columns: ['id', 'title', 'content', 'user_id', 'created_at', 'updated_at'],
        requiredColumns: ['title', 'content', 'user_id'],
        indexes: ['user_id', 'created_at'],
      },
      courses: {
        columns: ['id', 'title', 'description', 'content', 'document_id', 'user_id', 'created_at', 'updated_at'],
        requiredColumns: ['title', 'content', 'document_id', 'user_id'],
        indexes: ['user_id', 'document_id', 'created_at'],
      },
      users: {
        columns: ['id', 'email', 'full_name', 'avatar_url', 'created_at', 'updated_at'],
        requiredColumns: ['email'],
        indexes: ['email', 'created_at'],
      },
      processing_jobs: {
        columns: ['id', 'type', 'status', 'data', 'result', 'error', 'created_at', 'updated_at'],
        requiredColumns: ['type', 'status'],
        indexes: ['status', 'type', 'created_at'],
      },
      quality_metrics: {
        columns: ['id', 'document_id', 'readability_score', 'complexity_score', 'coherence_score', 'overall_score', 'created_at'],
        requiredColumns: ['document_id'],
        indexes: ['document_id', 'overall_score'],
      },
      vector_collections: {
        columns: ['id', 'collection_name', 'document_id', 'status', 'vector_count', 'created_at', 'updated_at'],
        requiredColumns: ['collection_name', 'document_id'],
        indexes: ['collection_name', 'document_id', 'status'],
      },
    };

    return tableConfigs[tableName] || null;
  }

  async validateSchema() {
    const tables = Object.keys(this.getTableConfig());
    const results = {};

    for (const table of tables) {
      try {
        const { data, error } = await this.adminClient
          .from(table)
          .select('*')
          .limit(1);

        results[table] = {
          exists: !error,
          error: error?.message || null,
        };
      } catch (error) {
        results[table] = {
          exists: false,
          error: error.message,
        };
      }
    }

    return results;
  }

  getRLSPolicy(tableName, operation) {
    const policies = {
      documents: {
        select: 'auth.uid() = user_id',
        insert: 'auth.uid() = user_id',
        update: 'auth.uid() = user_id',
        delete: 'auth.uid() = user_id',
      },
      courses: {
        select: 'auth.uid() = user_id',
        insert: 'auth.uid() = user_id',
        update: 'auth.uid() = user_id',
        delete: 'auth.uid() = user_id',
      },
      processing_jobs: {
        select: 'true',
        insert: 'true',
        update: 'true',
        delete: 'true',
      },
      quality_metrics: {
        select: 'EXISTS (SELECT 1 FROM documents WHERE documents.id = quality_metrics.document_id AND documents.user_id = auth.uid())',
        insert: 'EXISTS (SELECT 1 FROM documents WHERE documents.id = quality_metrics.document_id AND documents.user_id = auth.uid())',
        update: 'EXISTS (SELECT 1 FROM documents WHERE documents.id = quality_metrics.document_id AND documents.user_id = auth.uid())',
        delete: 'EXISTS (SELECT 1 FROM documents WHERE documents.id = quality_metrics.document_id AND documents.user_id = auth.uid())',
      },
      vector_collections: {
        select: 'EXISTS (SELECT 1 FROM documents WHERE documents.id = vector_collections.document_id AND documents.user_id = auth.uid())',
        insert: 'EXISTS (SELECT 1 FROM documents WHERE documents.id = vector_collections.document_id AND documents.user_id = auth.uid())',
        update: 'EXISTS (SELECT 1 FROM documents WHERE documents.id = vector_collections.document_id AND documents.user_id = auth.uid())',
        delete: 'EXISTS (SELECT 1 FROM documents WHERE documents.id = vector_collections.document_id AND documents.user_id = auth.uid())',
      },
    };

    return policies[tableName]?.[operation] || null;
  }

  getConfig() {
    return {
      url: this.config.url,
      hasAnonKey: !!this.config.anonKey,
      hasServiceKey: !!this.config.serviceKey,
      clientInitialized: !!this.client,
      adminClientInitialized: !!this.adminClient,
    };
  }
}

const supabaseConfig = new SupabaseConfig();

module.exports = {
  supabaseConfig,
  initialize: () => supabaseConfig.initialize(),
  getClient: () => supabaseConfig.getClient(),
  getAdminClient: () => supabaseConfig.getAdminClient(),
  testConnection: () => supabaseConfig.testConnection(),
  validateSchema: () => supabaseConfig.validateSchema(),
  getTableConfig: (tableName) => supabaseConfig.getTableConfig(tableName),
  getRLSPolicy: (tableName, operation) => supabaseConfig.getRLSPolicy(tableName, operation),
  getConfig: () => supabaseConfig.getConfig(),
};