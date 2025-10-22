-- Supabase Edge Function or Webhook Trigger for Welcome Emails
-- This script creates a PostgreSQL function and trigger that sends a welcome email
-- when a new user profile is created

-- Option 1: Using Supabase Edge Functions (Recommended)
-- Create an Edge Function to call your API endpoint
-- File: supabase/functions/send-welcome-email/index.ts

/*
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const { record } = await req.json()

    // Call your welcome email webhook
    const response = await fetch('https://kolink-gamma.vercel.app/api/emails/welcome-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      },
      body: JSON.stringify({
        userId: record.id,
      }),
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: response.ok ? 200 : 500,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
*/

-- Then create a database webhook in Supabase Dashboard:
-- 1. Go to Database > Webhooks
-- 2. Create new webhook with:
--    - Name: send-welcome-email
--    - Table: profiles
--    - Events: INSERT
--    - Type: Edge Function
--    - Edge Function: send-welcome-email

-- Option 2: Using Database Trigger with HTTP Request (Alternative)
-- NOTE: This requires the pg_net extension enabled in Supabase

-- Enable pg_net extension (run once)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to send welcome email via HTTP
CREATE OR REPLACE FUNCTION trigger_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Make HTTP request to welcome email webhook
  SELECT net.http_post(
    url := 'https://kolink-gamma.vercel.app/api/emails/welcome-webhook',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', current_setting('app.supabase_service_role_key', true)
    ),
    body := jsonb_build_object(
      'userId', NEW.id::text
    )
  ) INTO request_id;

  -- Log the request
  RAISE NOTICE 'Welcome email webhook triggered for user %, request_id: %', NEW.id, request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after a new profile is created
DROP TRIGGER IF EXISTS on_profile_created_send_welcome ON profiles;

CREATE TRIGGER on_profile_created_send_welcome
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_welcome_email();

-- Option 3: Manual Testing via SQL (for development)
-- Run this to test the welcome email for a specific user:
/*
SELECT net.http_post(
  url := 'https://kolink-gamma.vercel.app/api/emails/welcome-webhook',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-webhook-secret', current_setting('app.supabase_service_role_key', true)
  ),
  body := jsonb_build_object(
    'userId', 'YOUR_USER_ID_HERE'
  )
);
*/

-- To set the service role key as a database setting (run once):
-- ALTER DATABASE postgres SET app.supabase_service_role_key TO 'your-service-role-key-here';

-- Verify trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_profile_created_send_welcome';

COMMENT ON FUNCTION trigger_welcome_email() IS 'Sends HTTP request to welcome email webhook when new profile is created';
COMMENT ON TRIGGER on_profile_created_send_welcome ON profiles IS 'Triggers welcome email on new user registration';
