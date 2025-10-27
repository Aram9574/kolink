-- Migration: Add preferred_language column to profiles
-- Date: 2025-10-27
-- Sprint: 3
-- Purpose: Allow users to select their preferred language for voice input and content generation

-- Add preferred_language column with default Spanish
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'es-ES'
CHECK (preferred_language IN ('es-ES', 'en-US', 'pt-BR'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.preferred_language IS 'User preferred language for voice input and content generation. Values: es-ES (Spanish), en-US (English), pt-BR (Portuguese)';

-- Create index for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language ON profiles(preferred_language);

-- Verify migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'preferred_language'
  ) THEN
    RAISE NOTICE '✅ Column preferred_language added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add preferred_language column';
  END IF;
END $$;
