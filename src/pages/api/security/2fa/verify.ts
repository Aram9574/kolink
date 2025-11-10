import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { verifyTOTP, verifyBackupCode, decryptSecret, checkRateLimit, recordAttempt, resetAttempts } from '@/lib/security/twoFactor';
import { withErrorHandler, safeDatabaseOperation } from '@/lib/middleware/errorHandler';
import { UnauthorizedError, BadRequestError, NotFoundError, InternalServerError, RateLimitError } from '@/lib/errors/ApiError';

/**
 * POST /api/security/2fa/verify
 * Verify 2FA code and enable 2FA or authenticate
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, isSetup = false } = req.body;

  if (!code) {
    throw new BadRequestError('Code is required');
  }

  // Get user from session
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new UnauthorizedError('Token requerido');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new UnauthorizedError('Sesión inválida');
  }

  // Rate limiting
  const rateLimitKey = `2fa_verify:${user.id}`;
  const rateLimit = checkRateLimit(rateLimitKey, 5, 300);

  if (!rateLimit.allowed) {
    throw new RateLimitError(rateLimit.retryAfter, {
      remainingAttempts: 0
    });
  }

  // Get 2FA settings
  const { data: tfaSettings, error: fetchError } = await supabase
    .from('user_2fa_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (fetchError || !tfaSettings) {
    throw new NotFoundError('2FA configuration');
  }

  // Decrypt secret
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new InternalServerError('Encryption key not configured');
  }

    const secret = decryptSecret(tfaSettings.secret, encryptionKey);

    let isValid = false;
    let usedBackupCode = false;

    // Verify TOTP code
    if (code.length === 6 && /^\d+$/.test(code)) {
      isValid = verifyTOTP(code, secret);
    }
    // Verify backup code if TOTP failed
    else if (code.length === 9 && code.includes('-')) {
      // Check against backup codes
      const backupCodes = tfaSettings.backup_codes || [];
      for (const hashedCode of backupCodes) {
        if (verifyBackupCode(code, hashedCode)) {
          isValid = true;
          usedBackupCode = true;

          // Remove used backup code
          const updatedCodes = backupCodes.filter((c: string) => c !== hashedCode);
          await supabase
            .from('user_2fa_settings')
            .update({ backup_codes: updatedCodes })
            .eq('user_id', user.id);

          break;
        }
      }
    }

    // Record attempt
    await supabase
      .from('user_2fa_attempts')
      .insert({
        user_id: user.id,
        success: isValid,
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        user_agent: req.headers['user-agent'],
        failure_reason: isValid ? null : 'Invalid code',
      });

    if (!isValid) {
      recordAttempt(rateLimitKey);
      return res.status(400).json({
        error: 'Invalid code',
        remainingAttempts: rateLimit.remainingAttempts,
      });
    }

    // Reset rate limit on success
    resetAttempts(rateLimitKey);

    // If this is setup verification, enable 2FA
    if (isSetup) {
      await supabase
        .from('user_2fa_settings')
        .update({
          enabled: true,
          verified_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      // Create security alert
      await supabase.rpc('create_security_alert', {
        p_user_id: user.id,
        p_alert_type: '2fa_enabled',
        p_severity: 'medium',
        p_title: 'Autenticación de dos factores activada',
        p_message: 'La autenticación de dos factores se ha activado exitosamente en tu cuenta.',
        p_metadata: { method: 'totp' },
      });
    }

  res.status(200).json({
    success: true,
    verified: true,
    usedBackupCode,
    remainingBackupCodes: usedBackupCode ? (tfaSettings.backup_codes?.length || 0) - 1 : tfaSettings.backup_codes?.length || 0,
  });
}

export default withErrorHandler(handler);
