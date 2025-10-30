/**
 * Email Testing Script
 *
 * Tests all email templates by sending them to a specified email address.
 *
 * Usage:
 *   npx ts-node scripts/test-emails.ts <your-email@example.com>
 *   npx ts-node scripts/test-emails.ts <your-email@example.com> welcome
 *   npx ts-node scripts/test-emails.ts <your-email@example.com> all
 */

import { Resend } from 'resend';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY not found in .env.local');
  console.error('Please add your Resend API key to .env.local');
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

/**
 * Replaces template variables in HTML string
 */
function replaceTemplateVars(html: string, data: Record<string, unknown>): string {
  let result = html;

  // Replace simple variables like {{userName}}
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  }

  // Handle conditional blocks like {{#if hasLowCredits}}...{{/if}}
  result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
    return data[condition] ? content : '';
  });

  return result;
}

/**
 * Loads and processes email template
 */
async function loadEmailTemplate(type: string, data: Record<string, unknown>): Promise<string> {
  const templatePath = path.join(process.cwd(), 'src', 'emails', `${type}.html`);

  try {
    const html = await fs.readFile(templatePath, 'utf-8');
    return replaceTemplateVars(html, data);
  } catch (error) {
    console.error(`❌ Error loading email template ${type}:`, error);
    throw new Error(`Email template ${type} not found`);
  }
}

/**
 * Test data for each email type
 */
const TEST_DATA = {
  'welcome': {
    userName: 'John Doe',
    credits: 50,
    dashboardUrl: `${SITE_URL}/dashboard`,
    siteUrl: SITE_URL,
  },
  'weekly': {
    userName: 'John Doe',
    postsGenerated: 12,
    creditsUsed: 25,
    creditsRemaining: 25,
    currentPlan: 'Basic',
    hasLowCredits: false,
    hasHighActivity: true,
    dashboardUrl: `${SITE_URL}/dashboard`,
    siteUrl: SITE_URL,
  },
  'reset-password': {
    userName: 'John Doe',
    userEmail: 'test@example.com',
    resetUrl: `${SITE_URL}/reset-password?token=sample_token_abc123`,
    expiryMinutes: 60,
    siteUrl: SITE_URL,
  },
  'payment-successful': {
    userName: 'John Doe',
    planName: 'Standard',
    creditsAdded: 150,
    paymentMethod: 'Tarjeta Visa ****1234',
    transactionDate: new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    amount: '19.00',
    currency: 'USD',
    invoiceNumber: 'INV-2025-001234',
    dashboardUrl: `${SITE_URL}/dashboard`,
    siteUrl: SITE_URL,
  },
  'credits-low': {
    userName: 'John Doe',
    creditsRemaining: 5,
    postsThisMonth: 15,
    creditsUsed: 45,
    upgradeUrl: `${SITE_URL}/dashboard#plans`,
    dashboardUrl: `${SITE_URL}/dashboard`,
    siteUrl: SITE_URL,
  },
};

/**
 * Email subjects
 */
const EMAIL_SUBJECTS = {
  'welcome': '¡Bienvenido a Kolink! 🎉',
  'weekly': 'Tu Resumen Semanal de Kolink 📊',
  'reset-password': 'Restablece tu contraseña - Kolink 🔐',
  'payment-successful': '¡Pago exitoso! Tu plan está activo 🎉',
  'credits-low': '⚠️ Tus créditos de Kolink están por agotarse',
};

/**
 * Sends a test email
 */
async function sendTestEmail(to: string, type: string): Promise<void> {
  console.log(`\n📧 Enviando email tipo "${type}" a ${to}...`);

  try {
    const data = TEST_DATA[type as keyof typeof TEST_DATA];
    if (!data) {
      throw new Error(`Unknown email type: ${type}`);
    }

    const html = await loadEmailTemplate(type, data);
    const subject = EMAIL_SUBJECTS[type as keyof typeof EMAIL_SUBJECTS];

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (result.error) {
      console.error(`   ❌ Error: ${result.error.message}`);
    } else {
      console.log(`   ✅ Enviado exitosamente (ID: ${result.data?.id})`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error instanceof Error ? error.message : error);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
📧 Email Testing Script
Usage:
  npx ts-node scripts/test-emails.ts <email> [type]

Examples:
  npx ts-node scripts/test-emails.ts test@example.com
  npx ts-node scripts/test-emails.ts test@example.com welcome
  npx ts-node scripts/test-emails.ts test@example.com all

Available types:
  - welcome           : Welcome email for new users
  - weekly            : Weekly summary email
  - reset-password    : Password reset email
  - payment-successful: Payment confirmation email
  - credits-low       : Low credits warning email
  - all               : Send all emails (for testing)

Configuration:
  FROM_EMAIL: ${FROM_EMAIL}
  SITE_URL: ${SITE_URL}
`);
    process.exit(0);
  }

  const toEmail = args[0];
  const emailType = args[1] || 'all';

  console.log(`
🚀 Kolink Email Testing
========================
To: ${toEmail}
From: ${FROM_EMAIL}
Type: ${emailType}
`);

  if (emailType === 'all') {
    // Send all email types
    const types = Object.keys(TEST_DATA);
    console.log(`📬 Enviando ${types.length} emails...`);

    for (const type of types) {
      await sendTestEmail(toEmail, type);
      // Wait 1 second between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n✅ Proceso completado. Revisa tu inbox: ${toEmail}`);
  } else {
    // Send specific email type
    await sendTestEmail(toEmail, emailType);
    console.log(`\n✅ Email enviado. Revisa tu inbox: ${toEmail}`);
  }
}

// Run main function
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
