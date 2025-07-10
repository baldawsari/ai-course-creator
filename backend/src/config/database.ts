import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './environment';


// Database types
export interface Database {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          config: Record<string, any> | null;
          status: 'draft' | 'processing' | 'completed' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          config?: Record<string, any> | null;
          status?: 'draft' | 'processing' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          config?: Record<string, any> | null;
          status?: 'draft' | 'processing' | 'completed' | 'failed';
          updated_at?: string;
        };
      };
      course_resources: {
        Row: {
          id: string;
          course_id: string;
          file_name: string;
          file_type: string;
          storage_path: string;
          extracted_content: string | null;
          status: 'uploaded' | 'processing' | 'processed' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          file_name: string;
          file_type: string;
          storage_path: string;
          extracted_content?: string | null;
          status?: 'uploaded' | 'processing' | 'processed' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          file_name?: string;
          file_type?: string;
          storage_path?: string;
          extracted_content?: string | null;
          status?: 'uploaded' | 'processing' | 'processed' | 'failed';
          updated_at?: string;
        };
      };
      course_sessions: {
        Row: {
          id: string;
          course_id: string;
          session_number: number;
          title: string;
          objectives: string[] | null;
          topics: string[] | null;
          activities: Record<string, any>[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          session_number: number;
          title: string;
          objectives?: string[] | null;
          topics?: string[] | null;
          activities?: Record<string, any>[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          session_number?: number;
          title?: string;
          objectives?: string[] | null;
          topics?: string[] | null;
          activities?: Record<string, any>[] | null;
          updated_at?: string;
        };
      };
      content_embeddings: {
        Row: {
          id: string;
          resource_id: string;
          chunk_index: number;
          chunk_text: string;
          metadata: Record<string, any> | null;
          vector_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          chunk_index: number;
          chunk_text: string;
          metadata?: Record<string, any> | null;
          vector_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          resource_id?: string;
          chunk_index?: number;
          chunk_text?: string;
          metadata?: Record<string, any> | null;
          vector_id?: string | null;
        };
      };
      generation_jobs: {
        Row: {
          id: string;
          course_id: string;
          status: 'pending' | 'running' | 'completed' | 'failed';
          progress: number;
          error_message: string | null;
          result: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          status?: 'pending' | 'running' | 'completed' | 'failed';
          progress?: number;
          error_message?: string | null;
          result?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          status?: 'pending' | 'running' | 'completed' | 'failed';
          progress?: number;
          error_message?: string | null;
          result?: Record<string, any> | null;
          updated_at?: string;
        };
      };
    };
  };
}

// Supabase client configuration
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public' as const,
  },
  global: {
    headers: {
      'x-my-custom-header': 'ai-course-creator',
    },
  },
};

// Create Supabase clients
export const supabase: SupabaseClient<Database> = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  supabaseConfig
);

export const supabaseAdmin: SupabaseClient<Database> = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  {
    ...supabaseConfig,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

// Connection health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const { data: _data, error } = await supabase.from('courses').select('count').limit(1);
    
    if (error) {
      console.error('Database health check failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
};

// Retry logic wrapper
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
};

// Query helpers and utilities
export class DatabaseHelper {
  static async executeWithRetry<T>(
    query: () => Promise<{ data: T | null; error: any }>,
    maxRetries: number = 3
  ): Promise<T> {
    return withRetry(async () => {
      const { data, error } = await query();
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No data returned from query');
      }
      
      return data;
    }, maxRetries);
  }

  static async paginate<T>(
    tableName: keyof Database['public']['Tables'],
    page: number = 1,
    limit: number = 10,
    filters?: Record<string, any>,
    orderBy?: { column: string; ascending?: boolean }
  ): Promise<{ data: T[]; count: number; totalPages: number }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from(tableName).select('*', { count: 'exact' });

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Pagination query failed: ${error.message}`);
    }

    return {
      data: data as T[],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  static async safeDelete(
    tableName: keyof Database['public']['Tables'],
    id: string,
    userId?: string
  ): Promise<void> {
    let query = supabase.from(tableName).delete().eq('id', id);

    // Add user ownership check if userId provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;

    if (error) {
      throw new Error(`Delete operation failed: ${error.message}`);
    }
  }

  static async upsert<T>(
    tableName: keyof Database['public']['Tables'],
    data: any,
    onConflict?: string
  ): Promise<T> {
    const query = supabase
      .from(tableName)
      .upsert(data, { onConflict: onConflict || 'id' })
      .select()
      .single();

    const { data: result, error } = await query;

    if (error) {
      throw new Error(`Upsert operation failed: ${error.message}`);
    }

    return result as T;
  }
}

// Connection pool monitoring (for debugging)
export const getConnectionInfo = () => {
  return {
    url: env.SUPABASE_URL,
    isConfigured: !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
    timestamp: new Date().toISOString(),
  };
};

export default supabase;