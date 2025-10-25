/**
 * Authentication Middleware for Kolink
 *
 * Note: For Next.js Pages Router, authentication is primarily handled
 * client-side in _app.tsx and individual pages using useEffect hooks.
 *
 * This middleware file is a placeholder for future server-side protection
 * if the project migrates to App Router or implements server-side redirects.
 *
 * Current protection pattern:
 * - Each protected page checks session in useEffect
 * - Redirects to /signin if no session
 * - Admin pages additionally check role
 *
 * See examples in:
 * - /src/pages/dashboard.tsx (lines 47-53)
 * - /src/pages/admin.tsx (when implemented)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_req: NextRequest) {
  // For now, just pass through all requests
  // Authentication is handled client-side in pages
  return NextResponse.next();
}

// Note: No matchers configured as we're using client-side auth
// If you want to add server-side protection, uncomment and configure:
// export const config = {
//   matcher: [
//     '/dashboard/:path*',
//     '/admin/:path*',
//     '/calendar/:path*',
//     '/stats/:path*',
//     '/inspiration/:path*',
//   ],
// };
