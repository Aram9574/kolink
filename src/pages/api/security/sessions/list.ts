import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/security/sessions/list
 * Get all active sessions for the authenticated user
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from session
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get active sessions using the stored function
    const { data: sessions, error: sessionsError } = await supabase
      .rpc('get_active_sessions', { p_user_id: user.id });

    if (sessionsError) {
      throw sessionsError;
    }

    res.status(200).json({
      success: true,
      sessions: sessions || [],
    });
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    res.status(500).json({
      error: 'Failed to fetch sessions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
