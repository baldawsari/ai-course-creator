-- =============================================
-- AI Course Creator Database Schema
-- Migration 002: Row Level Security Policies
-- =============================================

-- =============================================
-- RLS POLICIES FOR COURSES TABLE
-- =============================================

-- Users can only see their own courses
CREATE POLICY "Users can view own courses" ON public.courses
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own courses
CREATE POLICY "Users can insert own courses" ON public.courses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own courses
CREATE POLICY "Users can update own courses" ON public.courses
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own courses
CREATE POLICY "Users can delete own courses" ON public.courses
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES FOR COURSE_RESOURCES TABLE
-- =============================================

-- Users can only see resources from their own courses
CREATE POLICY "Users can view own course resources" ON public.course_resources
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_resources.course_id 
            AND courses.user_id = auth.uid()
        )
    );

-- Users can insert resources to their own courses
CREATE POLICY "Users can insert own course resources" ON public.course_resources
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_resources.course_id 
            AND courses.user_id = auth.uid()
        )
    );

-- Users can update resources from their own courses
CREATE POLICY "Users can update own course resources" ON public.course_resources
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_resources.course_id 
            AND courses.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_resources.course_id 
            AND courses.user_id = auth.uid()
        )
    );

-- Users can delete resources from their own courses
CREATE POLICY "Users can delete own course resources" ON public.course_resources
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_resources.course_id 
            AND courses.user_id = auth.uid()
        )
    );

-- =============================================
-- RLS POLICIES FOR COURSE_SESSIONS TABLE
-- =============================================

-- Users can only see sessions from their own courses
CREATE POLICY "Users can view own course sessions" ON public.course_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_sessions.course_id 
            AND courses.user_id = auth.uid()
        )
    );

-- Users can insert sessions to their own courses
CREATE POLICY "Users can insert own course sessions" ON public.course_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_sessions.course_id 
            AND courses.user_id = auth.uid()
        )
    );

-- Users can update sessions from their own courses
CREATE POLICY "Users can update own course sessions" ON public.course_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_sessions.course_id 
            AND courses.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_sessions.course_id 
            AND courses.user_id = auth.uid()
        )
    );

-- Users can delete sessions from their own courses
CREATE POLICY "Users can delete own course sessions" ON public.course_sessions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_sessions.course_id 
            AND courses.user_id = auth.uid()
        )
    );

-- =============================================
-- RLS POLICIES FOR CONTENT_EMBEDDINGS TABLE
-- =============================================

-- Users can only see embeddings from their own course resources
CREATE POLICY "Users can view own content embeddings" ON public.content_embeddings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.course_resources cr
            JOIN public.courses c ON c.id = cr.course_id
            WHERE cr.id = content_embeddings.resource_id 
            AND c.user_id = auth.uid()
        )
    );

-- Users can insert embeddings to their own course resources
CREATE POLICY "Users can insert own content embeddings" ON public.content_embeddings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.course_resources cr
            JOIN public.courses c ON c.id = cr.course_id
            WHERE cr.id = content_embeddings.resource_id 
            AND c.user_id = auth.uid()
        )
    );

-- Users can update embeddings from their own course resources
CREATE POLICY "Users can update own content embeddings" ON public.content_embeddings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.course_resources cr
            JOIN public.courses c ON c.id = cr.course_id
            WHERE cr.id = content_embeddings.resource_id 
            AND c.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.course_resources cr
            JOIN public.courses c ON c.id = cr.course_id
            WHERE cr.id = content_embeddings.resource_id 
            AND c.user_id = auth.uid()
        )
    );

-- Users can delete embeddings from their own course resources
CREATE POLICY "Users can delete own content embeddings" ON public.content_embeddings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.course_resources cr
            JOIN public.courses c ON c.id = cr.course_id
            WHERE cr.id = content_embeddings.resource_id 
            AND c.user_id = auth.uid()
        )
    );

-- =============================================
-- RLS POLICIES FOR GENERATION_JOBS TABLE
-- =============================================

-- Users can only see generation jobs for their own courses
CREATE POLICY "Users can view own generation jobs" ON public.generation_jobs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = generation_jobs.course_id 
            AND courses.user_id = auth.uid()
        )
    );

-- Users can insert generation jobs for their own courses
CREATE POLICY "Users can insert own generation jobs" ON public.generation_jobs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = generation_jobs.course_id 
            AND courses.user_id = auth.uid()
        )
    );

-- Users can update generation jobs for their own courses
CREATE POLICY "Users can update own generation jobs" ON public.generation_jobs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = generation_jobs.course_id 
            AND courses.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = generation_jobs.course_id 
            AND courses.user_id = auth.uid()
        )
    );

-- Users can delete generation jobs for their own courses
CREATE POLICY "Users can delete own generation jobs" ON public.generation_jobs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = generation_jobs.course_id 
            AND courses.user_id = auth.uid()
        )
    );

-- =============================================
-- ADDITIONAL SECURITY FUNCTIONS
-- =============================================

-- Function to check if user owns a course
CREATE OR REPLACE FUNCTION auth.user_owns_course(course_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.courses 
        WHERE id = course_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's course count
CREATE OR REPLACE FUNCTION auth.get_user_course_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) FROM public.courses 
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- GRANTS FOR PUBLIC SCHEMA
-- =============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on tables
GRANT ALL ON public.courses TO authenticated;
GRANT ALL ON public.course_resources TO authenticated;
GRANT ALL ON public.course_sessions TO authenticated;
GRANT ALL ON public.content_embeddings TO authenticated;
GRANT ALL ON public.generation_jobs TO authenticated;

-- Grant permissions on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;