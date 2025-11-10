import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version?: string;
  checks?: {
    database: 'ok' | 'error';
    environment: 'ok' | 'error';
  };
  message?: string;
  missing?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  const timestamp = new Date().toISOString();
  const version = process.env.VERCEL_GIT_COMMIT_SHA || 'dev';

  try {
    // Check 1: Database connectivity
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let databaseStatus: 'ok' | 'error' = 'ok';

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);

        if (error) {
          logger.error('[Health] Database check failed:', error.message);
          databaseStatus = 'error';
        }
      } catch (err) {
        logger.error('[Health] Database connection failed:', err);
        databaseStatus = 'error';
      }
    } else {
      databaseStatus = 'error';
    }

    // Check 2: Critical environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'OPENAI_API_KEY',
      'NEXT_PUBLIC_SENTRY_DSN',
    ];

    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    const environmentStatus: 'ok' | 'error' = missingVars.length === 0 ? 'ok' : 'error';

    // Determine overall status
    const overallStatus = databaseStatus === 'ok' && environmentStatus === 'ok' ? 'ok' : 'error';

    if (overallStatus === 'error') {
      return res.status(500).json({
        status: 'error',
        timestamp,
        version,
        checks: {
          database: databaseStatus,
          environment: environmentStatus,
        },
        message: missingVars.length > 0
          ? 'Missing environment variables'
          : 'Database connection failed',
        missing: missingVars.length > 0 ? missingVars : undefined,
      });
    }

    // All checks passed
    return res.status(200).json({
      status: 'ok',
      timestamp,
      version,
      checks: {
        database: 'ok',
        environment: 'ok',
      },
    });

  } catch (error: unknown) {
    logger.error('[Health] Health check failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Health check failed';
    return res.status(500).json({
      status: 'error',
      timestamp,
      version,
      message: errorMessage,
    });
  }
}
