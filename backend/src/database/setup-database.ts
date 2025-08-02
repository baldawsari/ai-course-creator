import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Since we can't execute arbitrary SQL through the Supabase client,
// let's create a setup that tests what exists and provides clear instructions

async function checkDatabaseSetup() {
  console.log('🔍 AI Course Creator Database Setup Checker');
  console.log('==========================================\n');

  const checks = {
    connection: false,
    courses_table: false,
    course_resources_table: false,
    course_sessions_table: false,
    content_embeddings_table: false,
    generation_jobs_table: false,
    storage_bucket: false
  };

  // 1. Test connection
  console.log('1️⃣ Testing database connection...');
  try {
    const { error } = await supabase.from('courses').select('count').limit(1);
    if (!error || error.code === '42P01') { // 42P01 = table does not exist
      checks.connection = true;
      console.log('✅ Database connection successful\n');
    } else {
      console.log('❌ Database connection failed:', error.message, '\n');
    }
  } catch (err) {
    console.log('❌ Database connection failed:', err, '\n');
  }

  // 2. Check tables
  const tables = ['courses', 'course_resources', 'course_sessions', 'content_embeddings', 'generation_jobs'];
  console.log('2️⃣ Checking for required tables...');
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (!error) {
        checks[`${table}_table` as keyof typeof checks] = true;
        console.log(`✅ Table '${table}' exists`);
      } else if (error.code === '42P01') {
        console.log(`❌ Table '${table}' does not exist`);
      } else {
        console.log(`⚠️  Table '${table}' exists but has issues:`, error.message);
      }
    } catch (err) {
      console.log(`❌ Error checking table '${table}':`, err);
    }
  }

  // 3. Check storage bucket
  console.log('\n3️⃣ Checking storage buckets...');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (!error && buckets) {
      const courseFilesBucket = buckets.find(b => b.name === 'course-files');
      if (courseFilesBucket) {
        checks.storage_bucket = true;
        console.log('✅ Storage bucket "course-files" exists');
      } else {
        console.log('❌ Storage bucket "course-files" does not exist');
      }
    } else {
      console.log('⚠️  Could not check storage buckets:', error?.message);
    }
  } catch (err) {
    console.log('❌ Error checking storage buckets:', err);
  }

  // Summary
  console.log('\n📊 Setup Summary');
  console.log('================');
  const allChecks = Object.entries(checks);
  const passedChecks = allChecks.filter(([_, passed]) => passed).length;
  console.log(`Total checks: ${allChecks.length}`);
  console.log(`Passed: ${passedChecks}`);
  console.log(`Failed: ${allChecks.length - passedChecks}\n`);

  if (passedChecks < allChecks.length) {
    console.log('⚠️  DATABASE SETUP INCOMPLETE\n');
    console.log('📝 To complete setup, you need to:\n');
    console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy the contents of /backend/all-migrations.sql');
    console.log('5. Paste and run in the SQL Editor\n');
    
    console.log('🔗 Quick link to your project:');
    const projectRef = process.env.SUPABASE_URL!.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (projectRef) {
      console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql\n`);
    }

    // Provide the first migration as immediate help
    console.log('💡 Quick Start - Run this first migration to enable SQL execution:\n');
    console.log('```sql');
    console.log(`-- Create function to execute dynamic SQL
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;`);
    console.log('```\n');
  } else {
    console.log('🎉 DATABASE SETUP COMPLETE!\n');
    console.log('✅ All tables and storage buckets are properly configured.');
    console.log('✅ Your application is ready to use!\n');
  }

  return checks;
}

// Test data insertion (only if tables exist)
async function testDataOperations(checks: any) {
  if (!checks.courses_table) {
    console.log('⏭️  Skipping data operations test (tables not ready)\n');
    return;
  }

  console.log('4️⃣ Testing data operations...');
  
  try {
    // Try to create a test course
    const testCourse = {
      user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      title: 'Test Course',
      description: 'This is a test course',
      status: 'draft'
    };

    const { data, error } = await supabase
      .from('courses')
      .insert([testCourse])
      .select()
      .single();

    if (!error) {
      console.log('✅ Successfully created test course');
      
      // Clean up
      if (data?.id) {
        await supabase.from('courses').delete().eq('id', data.id);
        console.log('✅ Successfully cleaned up test data');
      }
    } else {
      console.log('⚠️  Could not create test course:', error.message);
      if (error.message.includes('user_id')) {
        console.log('   This is expected - foreign key constraint requires valid user');
      }
    }
  } catch (err) {
    console.log('❌ Data operations test failed:', err);
  }
}

// Main execution
async function main() {
  const checks = await checkDatabaseSetup();
  await testDataOperations(checks);
  
  console.log('\n📚 Next Steps:');
  console.log('=============');
  if (Object.values(checks).every(v => v)) {
    console.log('1. Start the backend: npm run dev');
    console.log('2. Start the frontend: cd frontend && npm run dev');
    console.log('3. Create a user account');
    console.log('4. Start creating courses!');
  } else {
    console.log('1. Run the migrations in Supabase SQL Editor');
    console.log('2. Re-run this script to verify: npm run test:db');
    console.log('3. Once all checks pass, start the application');
  }
}

// Run the setup checker
main().catch(console.error);