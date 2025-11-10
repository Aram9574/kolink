import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/security/sessions/revoke
 * Revoke a specific session or all sessions except current
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, revokeAll = false } = req.body;

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

    if (revokeAll) {
      // Revoke all sessions except current
      const { error: revokeError } = await supabase
        .from('user_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .neq('session_token', token)
        .is('revoked_at', null);

      if (revokeError) {
        throw revokeError;
      }

      // Create security alert
      await supabase.rpc('create_security_alert', {
        p_user_id: user.id,
        p_alert_type: 'suspicious_activity',
        p_severity: 'high',
        p_title: 'Sesiones cerradas',
        p_message: 'Se cerraron todas las sesiones activas en otros dispositivos.',
        p_metadata: {
          ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Todas las sesiones han sido cerradas',
      });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Revoke specific session
    const { data: revoked, error: revokeError } = await supabase
      .rpc('revoke_session', {
        p_session_id: sessionId,
        p_user_id: user.id,
      });

    if (revokeError) {
      throw revokeError;
    }

    if (!revoked) {
      return res.status(404).json({ error: 'Session not found or already revoked' });
    }

    res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente',
    });
  } catch (error) {
    logger.error('Failed to revoke session:', error);
    res.status(500).json({
      error: 'Failed to revoke session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
