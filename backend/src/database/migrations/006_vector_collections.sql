-- Migration: Vector Collections Metadata
-- Description: Create table to track Qdrant collections and their configurations

-- Create vector_collections table to track collection metadata
CREATE TABLE IF NOT EXISTS vector_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_name TEXT NOT NULL UNIQUE,
    vector_size INTEGER NOT NULL DEFAULT 1024,
    distance_metric TEXT NOT NULL DEFAULT 'Cosine',
    config JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    points_count BIGINT DEFAULT 0,
    indexed_vectors_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vector_collections_name ON vector_collections(collection_name);
CREATE INDEX IF NOT EXISTS idx_vector_collections_status ON vector_collections(status);
CREATE INDEX IF NOT EXISTS idx_vector_collections_created_at ON vector_collections(created_at);

-- Add RLS policies for vector_collections
ALTER TABLE vector_collections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view collections for their courses
CREATE POLICY "vector_collections_select_policy" ON vector_collections
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.instructor_id = auth.uid()
            AND collection_name LIKE '%' || c.id::text || '%'
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role = 'admin'
        )
    );

-- Policy: Only admins and instructors can manage collections
CREATE POLICY "vector_collections_manage_policy" ON vector_collections
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role IN ('admin', 'instructor')
        )
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_vector_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vector_collections_updated_at
    BEFORE UPDATE ON vector_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_vector_collections_updated_at();

-- Add comments for documentation
COMMENT ON TABLE vector_collections IS 'Metadata for Qdrant vector collections';
COMMENT ON COLUMN vector_collections.collection_name IS 'Name of the Qdrant collection';
COMMENT ON COLUMN vector_collections.vector_size IS 'Dimension size of vectors in the collection';
COMMENT ON COLUMN vector_collections.distance_metric IS 'Distance metric used (Cosine, Euclidean, Dot)';
COMMENT ON COLUMN vector_collections.config IS 'Full Qdrant collection configuration';
COMMENT ON COLUMN vector_collections.status IS 'Collection status (active, archived, error)';
COMMENT ON COLUMN vector_collections.points_count IS 'Total number of points in collection';
COMMENT ON COLUMN vector_collections.indexed_vectors_count IS 'Number of indexed vectors';