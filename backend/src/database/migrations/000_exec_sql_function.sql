-- =============================================
-- AI Course Creator Database Schema
-- Migration 000: Execute SQL Function (Required for migrations)
-- =============================================

-- Create function to execute dynamic SQL (needed for migration runner)
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;