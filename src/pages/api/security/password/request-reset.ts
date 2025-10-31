import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

/**
 * POST /api/security/password/request-reset
 * Request a password reset token
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get user by email
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .limit(1);

    // Always return success even if user doesn't exist (security)
    if (userError || !users || users.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Si el correo existe, recibirás un enlace de recuperación',
      });
    }

    const user = users[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store token in database
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        user_agent: req.headers['user-agent'],
      });

    if (insertError) {
      throw insertError;
    }

    // Send reset email (using Resend)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const resetUrl = `${siteUrl}/reset-password?token=${resetToken}`;

    try {
      await fetch(`${siteUrl}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Recupera tu contraseña de Kolink',
          template: 'password-reset',
          data: {
            resetUrl,
            email,
            expiresIn: '1 hora',
          },
        }),
      });
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Don't fail the request if email fails
    }

    // Create security alert
    await supabase.rpc('create_security_alert', {
      p_user_id: user.id,
      p_alert_type: 'password_reset_requested',
      p_severity: 'medium',
      p_title: 'Solicitud de recuperación de contraseña',
      p_message: 'Se solicitó un enlace de recuperación de contraseña para tu cuenta. Si no fuiste tú, ignora este mensaje.',
      p_metadata: {
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Si el correo existe, recibirás un enlace de recuperación',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      error: 'Failed to request password reset',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
