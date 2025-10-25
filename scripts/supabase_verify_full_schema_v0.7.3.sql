-- ============================================================================
-- Kolink v0.7.3 - Schema Verification & Auto-Repair SQL
-- ============================================================================
-- Description: Comprehensive schema validation and automatic repair
-- Usage: Called by predeploy_verify_supabase.ts before each deployment
-- ============================================================================

-- ============================================================================
-- PART 1: VERIFICATION FUNCTIONS
-- ============================================================================

-- Function: Get table columns
CREATE OR REPLACE FUNCTION public.get_table_columns(p_table_name text)
RETURNS TABLE(column_name text, data_type text, is_nullable text) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
  AND c.table_name = p_table_name
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if table exists
CREATE OR REPLACE FUNCTION public.table_exists(p_table_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = p_table_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if column exists
CREATE OR REPLACE FUNCTION public.column_exists(p_table_name text, p_column_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = p_table_name
    AND column_name = p_column_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 2: REQUIRED SCHEMA DEFINITION (v0.7.3)
-- ============================================================================

-- Table: profiles (extended schema)
DO $$
BEGIN
  -- Core columns (should already exist)
  IF NOT column_exists('profiles', 'id') THEN
    RAISE EXCEPTION 'Critical: profiles.id column missing. Database integrity compromised.';
  END IF;

  -- Extended columns for v0.7.3
  IF NOT column_exists('profiles', 'bio') THEN
    ALTER TABLE public.profiles ADD COLUMN bio text;
    RAISE NOTICE 'Added column: profiles.bio';
  END IF;

  IF NOT column_exists('profiles', 'headline') THEN
    ALTER TABLE public.profiles ADD COLUMN headline text;
    RAISE NOTICE 'Added column: profiles.headline';
  END IF;

  IF NOT column_exists('profiles', 'expertise') THEN
    ALTER TABLE public.profiles ADD COLUMN expertise text[];
    RAISE NOTICE 'Added column: profiles.expertise';
  END IF;

  IF NOT column_exists('profiles', 'tone_profile') THEN
    ALTER TABLE public.profiles ADD COLUMN tone_profile jsonb DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added column: profiles.tone_profile';
  END IF;

  IF NOT column_exists('profiles', 'profile_embedding') THEN
    ALTER TABLE public.profiles ADD COLUMN profile_embedding vector(1536);
    RAISE NOTICE 'Added column: profiles.profile_embedding';
  END IF;

  IF NOT column_exists('profiles', 'location') THEN
    ALTER TABLE public.profiles ADD COLUMN location text;
    RAISE NOTICE 'Added column: profiles.location';
  END IF;

  IF NOT column_exists('profiles', 'website') THEN
    ALTER TABLE public.profiles ADD COLUMN website text;
    RAISE NOTICE 'Added column: profiles.website';
  END IF;

  IF NOT column_exists('profiles', 'photo_url') THEN
    ALTER TABLE public.profiles ADD COLUMN photo_url text;
    RAISE NOTICE 'Added column: profiles.photo_url';
  END IF;

  IF NOT column_exists('profiles', 'company') THEN
    ALTER TABLE public.profiles ADD COLUMN company text;
    RAISE NOTICE 'Added column: profiles.company';
  END IF;

  IF NOT column_exists('profiles', 'position') THEN
    ALTER TABLE public.profiles ADD COLUMN position text;
    RAISE NOTICE 'Added column: profiles.position';
  END IF;

  IF NOT column_exists('profiles', 'linkedin_url') THEN
    ALTER TABLE public.profiles ADD COLUMN linkedin_url text;
    RAISE NOTICE 'Added column: profiles.linkedin_url';
  END IF;

  IF NOT column_exists('profiles', 'interests') THEN
    ALTER TABLE public.profiles ADD COLUMN interests text[];
    RAISE NOTICE 'Added column: profiles.interests';
  END IF;

  IF NOT column_exists('profiles', 'language') THEN
    ALTER TABLE public.profiles ADD COLUMN language text DEFAULT 'es';
    RAISE NOTICE 'Added column: profiles.language';
  END IF;

  IF NOT column_exists('profiles', 'timezone') THEN
    ALTER TABLE public.profiles ADD COLUMN timezone text DEFAULT 'Europe/Madrid';
    RAISE NOTICE 'Added column: profiles.timezone';
  END IF;

  -- Role column (for admin access)
  IF NOT column_exists('profiles', 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'user' CHECK (role IN ('user', 'admin'));
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
    RAISE NOTICE 'Added column: profiles.role';
  END IF;
END $$;

-- Table: posts (verify extended schema)
DO $$
BEGIN
  IF NOT column_exists('posts', 'hashtags') THEN
    ALTER TABLE public.posts ADD COLUMN hashtags text[];
    RAISE NOTICE 'Added column: posts.hashtags';
  END IF;

  IF NOT column_exists('posts', 'metadata') THEN
    ALTER TABLE public.posts ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added column: posts.metadata';
  END IF;

  IF NOT column_exists('posts', 'viral_score') THEN
    ALTER TABLE public.posts ADD COLUMN viral_score integer;
    RAISE NOTICE 'Added column: posts.viral_score';
  END IF;

  IF NOT column_exists('posts', 'style') THEN
    ALTER TABLE public.posts ADD COLUMN style text;
    RAISE NOTICE 'Added column: posts.style';
  END IF;

  IF NOT column_exists('posts', 'post_embedding') THEN
    ALTER TABLE public.posts ADD COLUMN post_embedding vector(1536);
    RAISE NOTICE 'Added column: posts.post_embedding';
  END IF;
END $$;

-- Table: logs (verify existence and structure)
DO $$
BEGIN
  IF NOT table_exists('logs') THEN
    CREATE TABLE public.logs (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
      type text NOT NULL CHECK (type IN ('login', 'generation', 'payment', 'error', 'profile_update', 'other')),
      message text NOT NULL,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
    );

    CREATE INDEX idx_logs_user_id ON public.logs(user_id);
    CREATE INDEX idx_logs_type ON public.logs(type);
    CREATE INDEX idx_logs_created_at ON public.logs(created_at DESC);

    ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view their own logs"
      ON public.logs
      FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Admins can view all logs"
      ON public.logs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );

    CREATE POLICY "Service role can insert logs"
      ON public.logs
      FOR INSERT
      WITH CHECK (true);

    RAISE NOTICE 'Created table: logs';
  END IF;
END $$;

-- Table: admin_logs (verify existence and structure)
DO $$
BEGIN
  IF NOT table_exists('admin_logs') THEN
    CREATE TABLE public.admin_logs (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      action text NOT NULL,
      target_user uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
    );

    CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs(admin_id);
    CREATE INDEX idx_admin_logs_target_user ON public.admin_logs(target_user);
    CREATE INDEX idx_admin_logs_created_at ON public.admin_logs(created_at DESC);

    ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Admin logs viewable by admins only"
      ON public.admin_logs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );

    CREATE POLICY "Admin logs insertable by admins only"
      ON public.admin_logs
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );

    RAISE NOTICE 'Created table: admin_logs';
  END IF;
END $$;

-- Table: schedule (verify existence and structure)
DO $$
BEGIN
  IF NOT table_exists('schedule') THEN
    CREATE TABLE public.schedule (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      content text NOT NULL,
      scheduled_for timestamptz NOT NULL,
      status text DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'cancelled')),
      post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    CREATE INDEX idx_schedule_user_id ON public.schedule(user_id);
    CREATE INDEX idx_schedule_scheduled_for ON public.schedule(scheduled_for);
    CREATE INDEX idx_schedule_status ON public.schedule(status);

    ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view their own schedule"
      ON public.schedule
      FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own schedule"
      ON public.schedule
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own schedule"
      ON public.schedule
      FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own schedule"
      ON public.schedule
      FOR DELETE
      USING (auth.uid() = user_id);

    RAISE NOTICE 'Created table: schedule';
  END IF;
END $$;

-- ============================================================================
-- PART 3: VERIFICATION SUMMARY FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_schema_v073()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  profiles_cols integer;
  posts_cols integer;
  logs_exists boolean;
  schedule_exists boolean;
  admin_logs_exists boolean;
BEGIN
  -- Count columns in profiles
  SELECT COUNT(*) INTO profiles_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'profiles';

  -- Count columns in posts
  SELECT COUNT(*) INTO posts_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'posts';

  -- Check table existence
  logs_exists := table_exists('logs');
  schedule_exists := table_exists('schedule');
  admin_logs_exists := table_exists('admin_logs');

  -- Build result JSON
  result := jsonb_build_object(
    'version', '0.7.3',
    'timestamp', now(),
    'tables', jsonb_build_object(
      'profiles', jsonb_build_object(
        'exists', true,
        'columns_count', profiles_cols,
        'status', CASE WHEN profiles_cols >= 20 THEN 'ok' ELSE 'incomplete' END
      ),
      'posts', jsonb_build_object(
        'exists', true,
        'columns_count', posts_cols,
        'status', CASE WHEN posts_cols >= 8 THEN 'ok' ELSE 'incomplete' END
      ),
      'logs', jsonb_build_object(
        'exists', logs_exists,
        'status', CASE WHEN logs_exists THEN 'ok' ELSE 'missing' END
      ),
      'schedule', jsonb_build_object(
        'exists', schedule_exists,
        'status', CASE WHEN schedule_exists THEN 'ok' ELSE 'missing' END
      ),
      'admin_logs', jsonb_build_object(
        'exists', admin_logs_exists,
        'status', CASE WHEN admin_logs_exists THEN 'ok' ELSE 'missing' END
      )
    ),
    'overall_status', CASE
      WHEN profiles_cols >= 20 AND posts_cols >= 8 AND logs_exists AND schedule_exists AND admin_logs_exists
      THEN 'healthy'
      ELSE 'needs_repair'
    END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION COMPLETE
-- ============================================================================

COMMENT ON FUNCTION public.verify_schema_v073() IS 'Kolink v0.7.3 - Schema verification and status report';
