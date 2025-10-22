-- Create admin_notifications table for sending messages to users
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_id ON admin_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own notifications
CREATE POLICY "Users can read own notifications"
  ON admin_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON admin_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;

-- Optional: Function to clean up expired notifications (run daily via pg_cron or trigger)
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_notifications
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a view for unread notifications count
CREATE OR REPLACE VIEW user_unread_notifications AS
SELECT
  user_id,
  COUNT(*) as unread_count
FROM admin_notifications
WHERE read = false AND expires_at > now()
GROUP BY user_id;

COMMENT ON TABLE admin_notifications IS 'Admin messages sent to users in real-time';
COMMENT ON COLUMN admin_notifications.type IS 'Notification type: info, warning, success, error';
COMMENT ON COLUMN admin_notifications.expires_at IS 'Auto-delete after this date';
