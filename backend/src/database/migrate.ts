import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Migration {
  id: string;
  filename: string;
  sql: string;
}

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Create migrations table if it doesn't exist
const createMigrationsTable = async (): Promise<void> => {
  // First, create the exec_sql function
  const execSqlFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
    RETURNS void AS $$
    BEGIN
        EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  const { error: funcError } = await supabaseAdmin.rpc('query', { query: execSqlFunction });
  
  if (funcError) {
    console.log('Note: Could not create exec_sql function, trying direct approach...');
  }

  // Create migrations table directly
  const migrationsTableSql = `
    CREATE TABLE IF NOT EXISTS public.migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const { error } = await supabaseAdmin.rpc('query', { query: migrationsTableSql });

  if (error) {
    // Try alternative approach
    console.log('Trying alternative approach to create migrations table...');
    
    try {
      // Use REST API directly
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_KEY!
        },
        body: JSON.stringify({ query: migrationsTableSql })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      console.log('✅ Migrations table created successfully');
    } catch (apiError: any) {
      throw new Error(`Failed to create migrations table: ${apiError.message}`);
    }
  } else {
    console.log('✅ Migrations table created successfully');
  }
};

// Get list of executed migrations
const getExecutedMigrations = async (): Promise<string[]> => {
  const { data, error } = await supabaseAdmin
    .from('migrations')
    .select('filename')
    .order('id');

  if (error) {
    throw new Error(`Failed to get executed migrations: ${error.message}`);
  }

  return data.map(row => row.filename);
};

// Read migration files from directory
const readMigrationFiles = (): Migration[] => {
  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  return files.map(filename => ({
    id: filename.replace('.sql', ''),
    filename,
    sql: readFileSync(join(migrationsDir, filename), 'utf-8')
  }));
};

// Execute a single migration
const executeMigration = async (migration: Migration): Promise<void> => {
  try {
    console.log(`Executing migration: ${migration.filename}`);

    // Execute the migration SQL
    const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', {
      sql: migration.sql
    });

    if (sqlError) {
      throw new Error(`SQL execution failed: ${sqlError.message}`);
    }

    // Record the migration as executed
    const { error: recordError } = await supabaseAdmin
      .from('migrations')
      .insert({ filename: migration.filename });

    if (recordError) {
      throw new Error(`Failed to record migration: ${recordError.message}`);
    }

    console.log(`✅ Migration completed: ${migration.filename}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${migration.filename}`, error);
    throw error;
  }
};

// Main migration function
export const runMigrations = async (): Promise<void> => {
  try {
    console.log('🚀 Starting database migrations...');

    // Create migrations table
    await createMigrationsTable();

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`📋 Found ${executedMigrations.length} executed migrations`);

    // Read migration files
    const migrationFiles = readMigrationFiles();
    console.log(`📁 Found ${migrationFiles.length} migration files`);

    // Filter pending migrations
    const pendingMigrations = migrationFiles.filter(
      migration => !executedMigrations.includes(migration.filename)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`⏳ Executing ${pendingMigrations.length} pending migrations...`);

    // Execute pending migrations
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
};

// Rollback function (basic implementation)
export const rollbackMigration = async (filename?: string): Promise<void> => {
  try {
    console.log('⚠️  Rollback functionality is not implemented yet');
    console.log('Please manually revert the database changes if needed');
    
    if (filename) {
      const { error } = await supabaseAdmin
        .from('migrations')
        .delete()
        .eq('filename', filename);

      if (error) {
        throw new Error(`Failed to remove migration record: ${error.message}`);
      }

      console.log(`📝 Removed migration record: ${filename}`);
    }
  } catch (error) {
    console.error('💥 Rollback failed:', error);
    throw error;
  }
};

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const filename = process.argv[3];

  switch (command) {
    case 'up':
      runMigrations();
      break;
    case 'rollback':
      rollbackMigration(filename);
      break;
    default:
      console.log('Usage:');
      console.log('  npm run migration:run     - Run pending migrations');
      console.log('  npm run migration:rollback [filename] - Rollback migration');
      break;
  }
}