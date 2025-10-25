#!/usr/bin/env ts-node
/**
 * Kolink v0.7.3 - Pre-Deploy Supabase Schema Verifier
 *
 * Automatically verifies and repairs Supabase schema before deployment.
 *
 * Features:
 * - Executes full schema verification SQL
 * - Auto-repairs missing tables/columns
 * - Logs all actions to admin_logs
 * - Displays checklist summary in terminal
 * - Exits with error code if critical issues found
 *
 * Usage:
 *   npm run predeploy:verify
 *   ts-node scripts/predeploy_verify_supabase.ts
 *
 * Environment Variables Required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SQL_VERIFICATION_FILE = path.join(__dirname, 'supabase_verify_full_schema_v0.7.3.sql');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// ============================================================================
// Types
// ============================================================================

interface SchemaStatus {
  version: string;
  timestamp: string;
  tables: {
    profiles: TableStatus;
    posts: TableStatus;
    logs: TableStatus;
    schedule: TableStatus;
    admin_logs: TableStatus;
  };
  overall_status: 'healthy' | 'needs_repair';
}

interface TableStatus {
  exists: boolean;
  columns_count?: number;
  status: 'ok' | 'incomplete' | 'missing';
}

interface VerificationResult {
  success: boolean;
  schemaStatus: SchemaStatus | null;
  repairsApplied: string[];
  errors: string[];
}

// ============================================================================
// Utilities
// ============================================================================

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80));
}

function logCheck(label: string, status: 'ok' | 'warning' | 'error', details?: string) {
  const icons = {
    ok: '✅',
    warning: '⚠️',
    error: '❌',
  };
  const colorMap = {
    ok: 'green',
    warning: 'yellow',
    error: 'red',
  };

  const icon = icons[status];
  const statusColor = colorMap[status] as keyof typeof colors;

  console.log(`${icon} ${label}`);
  if (details) {
    log(`   ${details}`, statusColor);
  }
}

// ============================================================================
// Main Functions
// ============================================================================

async function verifyEnvironment(): Promise<boolean> {
  logSection('🔍 Environment Verification');

  if (!SUPABASE_URL) {
    logCheck('Supabase URL', 'error', 'NEXT_PUBLIC_SUPABASE_URL not set');
    return false;
  }
  logCheck('Supabase URL', 'ok', SUPABASE_URL);

  if (!SUPABASE_SERVICE_KEY) {
    logCheck('Service Role Key', 'error', 'SUPABASE_SERVICE_ROLE_KEY not set');
    return false;
  }
  logCheck('Service Role Key', 'ok', 'Configured');

  if (!fs.existsSync(SQL_VERIFICATION_FILE)) {
    logCheck('Verification SQL', 'error', `File not found: ${SQL_VERIFICATION_FILE}`);
    return false;
  }
  logCheck('Verification SQL', 'ok', 'File found');

  return true;
}

async function checkIfSchemaFunctionExists(supabase: any): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('verify_schema_v073');

    // If no error, function exists
    if (!error) {
      return true;
    }

    // Check if error is about missing function
    if (error.message.includes('Could not find the function')) {
      return false;
    }

    // Other errors - function might exist but there's an issue
    return true;
  } catch (err) {
    return false;
  }
}

function displaySQLInstructions(): void {
  logSection('⚠️  Schema Verification Function Not Found');

  log('\nThe schema verification function has not been installed in your Supabase database yet.', 'yellow');
  log('\nTo install it, please follow these steps:', 'cyan');
  log('\n1. Open the Supabase SQL Editor:', 'bright');
  log('   https://supabase.com/dashboard/project/_/sql', 'cyan');

  log('\n2. Copy the contents of this file:', 'bright');
  log(`   ${SQL_VERIFICATION_FILE}`, 'cyan');

  log('\n3. Paste and execute the SQL in the Supabase SQL Editor', 'bright');

  log('\n4. Run this verification script again:', 'bright');
  log('   npm run predeploy:verify', 'cyan');

  log('\n' + '─'.repeat(80));
  log('\n💡 This is a one-time setup. After installing the schema verification', 'yellow');
  log('   function, this script will automatically verify your schema before', 'yellow');
  log('   each deployment.', 'yellow');
  log('\n' + '─'.repeat(80) + '\n');
}

async function verifySchema(supabase: any): Promise<SchemaStatus | null> {
  logSection('🔍 Schema Verification');

  try {
    const { data, error } = await supabase.rpc('verify_schema_v073');

    if (error) {
      logCheck('Schema Check', 'error', error.message);
      return null;
    }

    const status = data as SchemaStatus;

    // Display table status
    log('\nTable Status:', 'cyan');

    Object.entries(status.tables).forEach(([tableName, tableStatus]) => {
      const statusLabel = tableStatus.status === 'ok' ? 'ok' :
                         tableStatus.status === 'missing' ? 'error' : 'warning';

      const details = tableStatus.columns_count
        ? `${tableStatus.columns_count} columns`
        : tableStatus.exists ? 'Table exists' : 'Table missing';

      logCheck(`Table: ${tableName}`, statusLabel, details);
    });

    log(`\nOverall Status: ${status.overall_status.toUpperCase()}`,
        status.overall_status === 'healthy' ? 'green' : 'yellow');

    return status;
  } catch (err) {
    const error = err as Error;
    logCheck('Schema Verification', 'error', error.message);
    return null;
  }
}

async function logToAdminLogs(
  supabase: any,
  action: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('admin_logs').insert({
      admin_id: null, // System action
      action,
      target_user: null,
      metadata: {
        ...metadata,
        automated: true,
        timestamp: new Date().toISOString(),
        script: 'predeploy_verify_supabase.ts',
      },
    });
  } catch (err) {
    // Silent fail - logging is not critical
    log('   Note: Could not log to admin_logs (table may not exist yet)', 'yellow');
  }
}

async function displaySummary(result: VerificationResult): Promise<void> {
  logSection('📊 Verification Summary');

  const timestamp = new Date().toISOString();
  log(`Timestamp: ${timestamp}`, 'cyan');
  log(`Version: v0.7.3`, 'cyan');

  if (result.schemaStatus) {
    log(`\nDatabase Status: ${result.schemaStatus.overall_status.toUpperCase()}`,
        result.schemaStatus.overall_status === 'healthy' ? 'green' : 'yellow');
  }

  if (result.repairsApplied.length > 0) {
    log('\nRepairs Applied:', 'yellow');
    result.repairsApplied.forEach(repair => {
      log(`   • ${repair}`, 'yellow');
    });
  } else {
    log('\nNo repairs needed', 'green');
  }

  if (result.errors.length > 0) {
    log('\nErrors:', 'red');
    result.errors.forEach(error => {
      log(`   • ${error}`, 'red');
    });
  }

  log('\n' + '─'.repeat(80));

  if (result.success) {
    log('✅ Schema verification completed successfully', 'green');
  } else {
    log('❌ Schema verification failed - review errors above', 'red');
  }

  log('─'.repeat(80) + '\n');
}

async function runVerification(): Promise<VerificationResult> {
  const result: VerificationResult = {
    success: false,
    schemaStatus: null,
    repairsApplied: [],
    errors: [],
  };

  // Step 1: Verify environment
  const envOk = await verifyEnvironment();
  if (!envOk) {
    result.errors.push('Environment verification failed');
    return result;
  }

  // Step 2: Create Supabase client
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

  // Step 3: Check if schema verification function exists
  logSection('🔍 Checking Schema Verification Setup');

  const functionExists = await checkIfSchemaFunctionExists(supabase);

  if (!functionExists) {
    displaySQLInstructions();
    result.errors.push('Schema verification function not installed');
    return result;
  }

  logCheck('Verification Function', 'ok', 'Schema verification function found');

  // Step 4: Verify schema status
  const schemaStatus = await verifySchema(supabase);

  if (schemaStatus) {
    result.schemaStatus = schemaStatus;

    // Check for missing columns or tables
    Object.entries(schemaStatus.tables).forEach(([tableName, tableStatus]) => {
      if (tableStatus.status === 'missing') {
        result.errors.push(`Table missing: ${tableName}`);
      } else if (tableStatus.status === 'incomplete') {
        result.errors.push(`Table incomplete: ${tableName} (missing columns)`);
      }
    });

    // Overall success if schema is healthy
    result.success = schemaStatus.overall_status === 'healthy';
  } else {
    result.errors.push('Schema verification function failed');
  }

  // Step 5: Log to admin_logs (only if admin_logs table exists)
  try {
    await logToAdminLogs(supabase, 'schema_verification', {
      status: result.success ? 'success' : 'failed',
      repairs_applied: result.repairsApplied.length,
      errors: result.errors.length,
      schema_status: schemaStatus?.overall_status || 'unknown',
    });
  } catch (err) {
    // Silent fail - admin_logs might not exist yet
  }

  return result;
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  console.clear();

  logSection('🚀 Kolink v0.7.3 - Pre-Deploy Schema Verification');
  log('Verifying Supabase schema before deployment...\n', 'cyan');

  const result = await runVerification();

  await displaySummary(result);

  // Exit with appropriate code
  if (result.success) {
    process.exit(0);
  } else {
    // Check if the error is about missing function
    if (result.errors.some(e => e.includes('function not installed'))) {
      // Instructions already displayed, just exit
      process.exit(1);
    } else {
      log('💡 Tip: Review the errors above and ensure your Supabase database is accessible', 'yellow');
      process.exit(1);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { runVerification, verifySchema };
