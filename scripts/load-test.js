/**
 * K6 Load Test Script for Kolink
 *
 * Tests the application under load with up to 100 concurrent users
 *
 * Installation:
 *   brew install k6
 *
 * Usage:
 *   # Test local development
 *   k6 run scripts/load-test.js
 *
 *   # Test production
 *   k6 run --env BASE_URL=https://kolink.es scripts/load-test.js
 *
 *   # Test with custom users/duration
 *   k6 run --vus 50 --duration 30s scripts/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const landingPageDuration = new Trend('landing_page_duration');
const apiHealthDuration = new Trend('api_health_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm up: Ramp to 10 users over 30s
    { duration: '1m', target: 50 },    // Ramp up: Increase to 50 users over 1min
    { duration: '2m', target: 100 },   // Peak load: Reach 100 users over 2min
    { duration: '1m', target: 100 },   // Sustain: Hold at 100 users for 1min
    { duration: '30s', target: 0 },    // Cool down: Ramp down to 0
  ],

  // Performance thresholds (test will fail if these aren't met)
  thresholds: {
    // 95% of requests should complete in less than 3 seconds
    http_req_duration: ['p(95)<3000'],

    // Error rate should be less than 5%
    http_req_failed: ['rate<0.05'],

    // Custom metric thresholds
    'landing_page_duration': ['p(95)<2000'], // Landing page: <2s
    'api_health_duration': ['p(95)<500'],    // Health API: <500ms
    'errors': ['rate<0.05'],                 // Overall error rate: <5%
  },

  // Graceful shutdown
  gracefulStop: '30s',
};

// Base URL (can be overridden with --env BASE_URL=...)
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

/**
 * Main test function - runs for each virtual user
 */
export default function () {
  // Test 1: Landing page
  const landingResponse = http.get(BASE_URL, {
    tags: { name: 'LandingPage' },
  });

  // Record landing page duration
  landingPageDuration.add(landingResponse.timings.duration);

  check(landingResponse, {
    'landing page status 200': (r) => r.status === 200,
    'landing page load time < 2s': (r) => r.timings.duration < 2000,
    'landing page has title': (r) => r.body.includes('<title>'),
  }) || errorRate.add(1);

  sleep(1); // Think time between requests

  // Test 2: Health check API
  const healthResponse = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'HealthAPI' },
  });

  // Record health API duration
  apiHealthDuration.add(healthResponse.timings.duration);

  check(healthResponse, {
    'health check status 200': (r) => r.status === 200,
    'health check has status': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'ok';
      } catch {
        return false;
      }
    },
    'health API load time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: Sign in page (static page)
  const signinResponse = http.get(`${BASE_URL}/signin`, {
    tags: { name: 'SignInPage' },
  });

  check(signinResponse, {
    'signin page status 200': (r) => r.status === 200,
    'signin page has form': (r) => r.body.includes('type="email"'),
  }) || errorRate.add(1);

  sleep(1);

  // Test 4: Sign up page (static page)
  const signupResponse = http.get(`${BASE_URL}/signup`, {
    tags: { name: 'SignUpPage' },
  });

  check(signupResponse, {
    'signup page status 200': (r) => r.status === 200,
    'signup page has form': (r) => r.body.includes('type="password"'),
  }) || errorRate.add(1);

  sleep(2); // Longer think time between page visits
}

/**
 * Setup function - runs once before the test starts
 */
export function setup() {
  console.log(`\n====================================`);
  console.log(`🚀 K6 Load Test Starting`);
  console.log(`====================================`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Peak Users: 100`);
  console.log(`Test Duration: ~5 minutes`);
  console.log(`====================================\n`);

  // Verify the app is accessible
  const healthCheck = http.get(`${BASE_URL}/api/health`);

  if (healthCheck.status !== 200) {
    console.error(`❌ Health check failed! Status: ${healthCheck.status}`);
    console.error(`Make sure the app is running at ${BASE_URL}`);
    throw new Error('Application not accessible');
  }

  console.log(`✅ Application is accessible\n`);

  return { baseUrl: BASE_URL };
}

/**
 * Teardown function - runs once after the test completes
 */
export function teardown(data) {
  console.log(`\n====================================`);
  console.log(`🏁 Load Test Completed`);
  console.log(`====================================`);
  console.log(`Base URL: ${data.baseUrl}`);
  console.log(`\nCheck the summary above for detailed metrics.`);
  console.log(`====================================\n`);
}

/**
 * Custom summary handler - provides detailed test results
 */
export function handleSummary(data) {
  // Return the default summary (console output)
  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
}

// Helper function to generate text summary
function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors !== false;

  // ANSI color codes
  const colors = {
    reset: enableColors ? '\x1b[0m' : '',
    green: enableColors ? '\x1b[32m' : '',
    red: enableColors ? '\x1b[31m' : '',
    yellow: enableColors ? '\x1b[33m' : '',
    blue: enableColors ? '\x1b[34m' : '',
  };

  let summary = '\n';

  // Test results
  const { metrics } = data;

  summary += `${indent}${colors.blue}📊 Load Test Summary${colors.reset}\n`;
  summary += `${indent}${'-'.repeat(50)}\n\n`;

  // HTTP requests
  const httpReqs = metrics.http_reqs?.values?.count || 0;
  const httpReqDuration = metrics.http_req_duration?.values || {};

  summary += `${indent}${colors.green}HTTP Requests:${colors.reset}\n`;
  summary += `${indent}  Total: ${httpReqs}\n`;
  summary += `${indent}  Rate: ${(httpReqs / (data.state.testRunDurationMs / 1000)).toFixed(2)} req/s\n`;
  summary += `${indent}  Duration:\n`;
  summary += `${indent}    - p50: ${(httpReqDuration.med || 0).toFixed(2)}ms\n`;
  summary += `${indent}    - p95: ${(httpReqDuration['p(95)'] || 0).toFixed(2)}ms\n`;
  summary += `${indent}    - p99: ${(httpReqDuration['p(99)'] || 0).toFixed(2)}ms\n`;
  summary += `${indent}    - max: ${(httpReqDuration.max || 0).toFixed(2)}ms\n\n`;

  // Error rate
  const httpReqFailed = metrics.http_req_failed?.values?.rate || 0;
  const errorRateValue = metrics.errors?.values?.rate || 0;

  const errorColor = (errorRateValue < 0.05) ? colors.green : colors.red;

  summary += `${indent}${errorColor}Error Rate:${colors.reset}\n`;
  summary += `${indent}  HTTP Failures: ${(httpReqFailed * 100).toFixed(2)}%\n`;
  summary += `${indent}  Custom Errors: ${(errorRateValue * 100).toFixed(2)}%\n\n`;

  // Custom metrics
  const landingDuration = metrics.landing_page_duration?.values || {};
  const healthDuration = metrics.api_health_duration?.values || {};

  summary += `${indent}${colors.blue}Page Performance:${colors.reset}\n`;
  summary += `${indent}  Landing Page p95: ${(landingDuration['p(95)'] || 0).toFixed(2)}ms\n`;
  summary += `${indent}  Health API p95: ${(healthDuration['p(95)'] || 0).toFixed(2)}ms\n\n`;

  // VUs
  const vus = metrics.vus?.values || {};

  summary += `${indent}${colors.blue}Virtual Users:${colors.reset}\n`;
  summary += `${indent}  Min: ${vus.min || 0}\n`;
  summary += `${indent}  Max: ${vus.max || 0}\n\n`;

  // Pass/Fail
  const thresholdsPassed = Object.values(data.thresholds || {}).every(t => t.ok);
  const resultColor = thresholdsPassed ? colors.green : colors.red;
  const resultText = thresholdsPassed ? '✅ PASSED' : '❌ FAILED';

  summary += `${indent}${resultColor}${resultText}${colors.reset}\n`;
  summary += `${indent}${'-'.repeat(50)}\n\n`;

  return summary;
}
