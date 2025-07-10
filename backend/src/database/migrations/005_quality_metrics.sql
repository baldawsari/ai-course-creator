-- Migration: Add quality metrics to course_resources table
-- Description: Adds columns for storing document quality scores and reports

-- Add quality metrics columns to course_resources
ALTER TABLE course_resources
ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS quality_report JSONB,
ADD COLUMN IF NOT EXISTS processing_metadata JSONB;

-- Add index for quality score queries
CREATE INDEX IF NOT EXISTS idx_course_resources_quality_score 
ON course_resources(quality_score) 
WHERE quality_score IS NOT NULL;

-- Add composite index for course quality filtering
CREATE INDEX IF NOT EXISTS idx_course_resources_course_quality 
ON course_resources(course_id, quality_score DESC) 
WHERE status = 'processed';

-- Update content_embeddings to include chunk metadata
ALTER TABLE content_embeddings
ADD COLUMN IF NOT EXISTS chunk_index INTEGER,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add index for chunk retrieval
CREATE INDEX IF NOT EXISTS idx_content_embeddings_chunk_index 
ON content_embeddings(resource_id, chunk_index);

-- Create quality thresholds configuration table
CREATE TABLE IF NOT EXISTS quality_thresholds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    min_score NUMERIC(5,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default quality thresholds
INSERT INTO quality_thresholds (name, min_score, description) VALUES
    ('premium', 85, 'Premium quality content suitable for professional courses'),
    ('recommended', 70, 'Recommended quality for effective learning'),
    ('minimum', 50, 'Minimum acceptable quality for course inclusion')
ON CONFLICT (name) DO NOTHING;

-- Create view for quality statistics
CREATE OR REPLACE VIEW course_quality_stats AS
SELECT 
    cr.course_id,
    COUNT(*) as total_resources,
    COUNT(*) FILTER (WHERE cr.quality_score >= 85) as premium_resources,
    COUNT(*) FILTER (WHERE cr.quality_score >= 70 AND cr.quality_score < 85) as recommended_resources,
    COUNT(*) FILTER (WHERE cr.quality_score >= 50 AND cr.quality_score < 70) as acceptable_resources,
    COUNT(*) FILTER (WHERE cr.quality_score < 50) as below_threshold_resources,
    AVG(cr.quality_score) as avg_quality_score,
    MIN(cr.quality_score) as min_quality_score,
    MAX(cr.quality_score) as max_quality_score
FROM course_resources cr
WHERE cr.status = 'processed' AND cr.quality_score IS NOT NULL
GROUP BY cr.course_id;

-- Add RLS policies for quality thresholds table
ALTER TABLE quality_thresholds ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read quality thresholds
CREATE POLICY "quality_thresholds_read_policy" ON quality_thresholds
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can modify quality thresholds
CREATE POLICY "quality_thresholds_write_policy" ON quality_thresholds
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Create function to get resources by quality tier
CREATE OR REPLACE FUNCTION get_resources_by_quality_tier(
    p_course_id UUID,
    p_tier VARCHAR(50) DEFAULT 'recommended'
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    quality_score NUMERIC(5,2),
    quality_report JSONB,
    processing_metadata JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_min_score NUMERIC(5,2);
    v_max_score NUMERIC(5,2);
BEGIN
    -- Get threshold for the requested tier
    SELECT min_score INTO v_min_score
    FROM quality_thresholds
    WHERE name = p_tier;
    
    -- Set default if tier not found
    IF v_min_score IS NULL THEN
        v_min_score := 70; -- Default to recommended
    END IF;
    
    -- Set max score based on tier
    CASE p_tier
        WHEN 'premium' THEN v_max_score := 100;
        WHEN 'recommended' THEN v_max_score := 84.99;
        WHEN 'minimum' THEN v_max_score := 69.99;
        ELSE v_max_score := 100;
    END CASE;
    
    RETURN QUERY
    SELECT 
        cr.id,
        cr.title,
        cr.quality_score,
        cr.quality_report,
        cr.processing_metadata
    FROM course_resources cr
    WHERE cr.course_id = p_course_id
        AND cr.status = 'processed'
        AND cr.quality_score >= v_min_score
        AND cr.quality_score <= v_max_score
    ORDER BY cr.quality_score DESC;
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quality_thresholds_updated_at
    BEFORE UPDATE ON quality_thresholds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN course_resources.quality_score IS 'Overall quality score (0-100) from document processing';
COMMENT ON COLUMN course_resources.quality_report IS 'Detailed quality assessment including readability, coherence, and errors';
COMMENT ON COLUMN course_resources.processing_metadata IS 'Metadata from document processing including chunks, language, processing time';
COMMENT ON COLUMN content_embeddings.chunk_index IS 'Index of the chunk within the document';
COMMENT ON COLUMN content_embeddings.metadata IS 'Additional metadata for the chunk including position and strategy';