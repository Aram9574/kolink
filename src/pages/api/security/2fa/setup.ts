import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { generateTOTPSecret, generateBackupCodes, generateQRCodeURL, hashBackupCode, encryptSecret } from '@/lib/security/twoFactor';

/**
 * POST /api/security/2fa/setup
 * Initialize 2FA setup for a user
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

    // Generate TOTP secret
    const secret = generateTOTPSecret();

    // Generate backup codes
    const backupCodes = generateBackupCodes(8);
    const hashedBackupCodes = backupCodes.map(code => hashBackupCode(code));

    // Encrypt secret for storage (use env variable for encryption key)
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const encryptedSecret = encryptSecret(secret, encryptionKey);

    // Generate QR code URL
    const qrCodeUrl = generateQRCodeURL(secret, user.email || '', 'Kolink');

    // Store in database (not yet verified)
    const { error: insertError } = await supabase
      .from('user_2fa_settings')
      .upsert({
        user_id: user.id,
        secret: encryptedSecret,
        backup_codes: hashedBackupCodes,
        method: 'totp',
        enabled: false, // Not enabled until verified
        verified_at: null,
      }, {
        onConflict: 'user_id'
      });

    if (insertError) {
      throw insertError;
    }

    // Return setup data (secret in plain text for QR code generation on client)
    res.status(200).json({
      success: true,
      data: {
        secret,
        qrCodeUrl,
        backupCodes, // Show once, user must save them
      },
    });
  } catch (error) {
    logger.error('2FA setup error:', error);
    res.status(500).json({
      error: 'Failed to setup 2FA',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
