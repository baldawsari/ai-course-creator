-- =============================================
-- AI Course Creator Database Schema
-- Migration 003: Storage Buckets and Optimization
-- =============================================

-- =============================================
-- STORAGE BUCKETS CONFIGURATION
-- =============================================

-- Create storage bucket for course files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'course-files',
    'course-files',
    false, -- Private bucket
    52428800, -- 50MB limit
    ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'text/markdown',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage bucket for exported course content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'course-exports',
    'course-exports',
    false, -- Private bucket
    104857600, -- 100MB limit
    ARRAY[
        'application/zip',
        'application/pdf',
        'text/html',
        'application/json'
    ]
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================
-- STORAGE RLS POLICIES
-- =============================================

-- Policy for course-files bucket
CREATE POLICY "Users can upload their own course files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'course-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own course files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'course-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own course files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'course-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    ) WITH CHECK (
        bucket_id = 'course-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own course files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'course-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy for course-exports bucket
CREATE POLICY "Users can access their own course exports" ON storage.objects
    FOR ALL USING (
        bucket_id = 'course-exports' AND
        auth.uid()::text = (storage.foldername(name))[1]
    ) WITH CHECK (
        bucket_id = 'course-exports' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- =============================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- =============================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_courses_user_status ON public.courses(user_id, status);
CREATE INDEX IF NOT EXISTS idx_courses_user_updated ON public.courses(user_id, updated_at DESC);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_courses_config_gin ON public.courses USING GIN(config);
CREATE INDEX IF NOT EXISTS idx_course_sessions_activities_gin ON public.course_sessions USING GIN(activities);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_metadata_gin ON public.content_embeddings USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_result_gin ON public.generation_jobs USING GIN(result);

-- Text search indexes
CREATE INDEX IF NOT EXISTS idx_courses_title_text ON public.courses USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_courses_description_text ON public.courses USING GIN(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_course_resources_filename_text ON public.course_resources USING GIN(to_tsvector('english', file_name));
CREATE INDEX IF NOT EXISTS idx_content_embeddings_chunk_text ON public.content_embeddings USING GIN(to_tsvector('english', chunk_text));

-- Array indexes for course sessions
CREATE INDEX IF NOT EXISTS idx_course_sessions_objectives_gin ON public.course_sessions USING GIN(objectives);
CREATE INDEX IF NOT EXISTS idx_course_sessions_topics_gin ON public.course_sessions USING GIN(topics);

-- =============================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- =============================================

-- User course statistics view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_course_stats AS
SELECT 
    user_id,
    COUNT(*) as total_courses,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_courses,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_courses,
    COUNT(*) FILTER (WHERE status = 'draft') as draft_courses,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_courses,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_completion_time_hours,
    MAX(updated_at) as last_activity
FROM public.courses
GROUP BY user_id;

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_course_stats_user_id ON public.user_course_stats(user_id);

-- Course resource statistics view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.course_resource_stats AS
SELECT 
    c.id as course_id,
    c.user_id,
    COUNT(cr.*) as total_resources,
    COUNT(cr.*) FILTER (WHERE cr.status = 'processed') as processed_resources,
    COUNT(cr.*) FILTER (WHERE cr.status = 'processing') as processing_resources,
    COUNT(cr.*) FILTER (WHERE cr.status = 'failed') as failed_resources,
    COUNT(DISTINCT cr.file_type) as unique_file_types,
    SUM(LENGTH(cr.extracted_content)) as total_content_length
FROM public.courses c
LEFT JOIN public.course_resources cr ON c.id = cr.course_id
GROUP BY c.id, c.user_id;

-- Create unique index for course resource stats
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_resource_stats_course_id ON public.course_resource_stats(course_id);

-- =============================================
-- FUNCTIONS FOR REFRESHING MATERIALIZED VIEWS
-- =============================================

-- Function to refresh user course stats
CREATE OR REPLACE FUNCTION refresh_user_course_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_course_stats;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh course resource stats
CREATE OR REPLACE FUNCTION refresh_course_resource_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.course_resource_stats;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to clean up old generation jobs
CREATE OR REPLACE FUNCTION cleanup_old_generation_jobs(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.generation_jobs
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_old
    AND status IN ('completed', 'failed');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get course completion percentage
CREATE OR REPLACE FUNCTION get_course_completion_percentage(course_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    total_resources INTEGER;
    processed_resources INTEGER;
    completion_percentage NUMERIC;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'processed')
    INTO total_resources, processed_resources
    FROM public.course_resources
    WHERE course_resources.course_id = get_course_completion_percentage.course_id;
    
    IF total_resources = 0 THEN
        RETURN 0;
    END IF;
    
    completion_percentage := (processed_resources::NUMERIC / total_resources::NUMERIC) * 100;
    RETURN ROUND(completion_percentage, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to get user storage usage
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    file_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_files', COUNT(*),
        'total_size_bytes', COALESCE(SUM(metadata->>'size')::bigint, 0),
        'file_types', jsonb_agg(DISTINCT metadata->>'mimetype'),
        'oldest_file', MIN(created_at),
        'newest_file', MAX(created_at)
    )
    INTO file_stats
    FROM storage.objects
    WHERE bucket_id IN ('course-files', 'course-exports')
    AND owner = get_user_storage_usage.user_id;
    
    RETURN COALESCE(file_stats, '{"total_files": 0, "total_size_bytes": 0, "file_types": [], "oldest_file": null, "newest_file": null}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- GRANTS FOR UTILITY FUNCTIONS
-- =============================================

GRANT EXECUTE ON FUNCTION refresh_user_course_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_course_resource_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_course_completion_percentage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_storage_usage(UUID) TO authenticated;