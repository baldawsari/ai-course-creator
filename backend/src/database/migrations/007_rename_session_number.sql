-- =============================================
-- AI Course Creator Database Schema
-- Migration 007: Rename session_number to sequence_number
-- =============================================

-- Drop the existing unique constraint
ALTER TABLE public.course_sessions DROP CONSTRAINT IF EXISTS course_sessions_course_id_session_number_key;

-- Rename the column
ALTER TABLE public.course_sessions RENAME COLUMN session_number TO sequence_number;

-- Recreate the unique constraint with new column name
ALTER TABLE public.course_sessions ADD CONSTRAINT course_sessions_course_id_sequence_number_key UNIQUE(course_id, sequence_number);

-- Drop old index
DROP INDEX IF EXISTS idx_course_sessions_number;

-- Create new index with renamed column
CREATE INDEX IF NOT EXISTS idx_course_sessions_sequence ON public.course_sessions(course_id, sequence_number);