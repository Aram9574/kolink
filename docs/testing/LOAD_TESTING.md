# Load Testing Guide with K6

## Overview

This guide explains how to perform load testing on Kolink using k6, an open-source load testing tool.

## Installation

### macOS
```bash
brew install k6
```

### Linux
```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /usr/share/keyrings/k6-archive-keyring.list
sudo apt-get update
sudo apt-get install k6
```

### Windows
```powershell
choco install k6
```

### Verify Installation
```bash
k6 version
```

## Running Load Tests

### 1. Test Local Development

```bash
# Start the development server first
npm run dev

# In another terminal, run the load test
k6 run scripts/load-test.js
```

### 2. Test Production

```bash
k6 run --env BASE_URL=https://kolink.es scripts/load-test.js
```

### 3. Custom Configuration

```bash
# Test with 50 users for 1 minute
k6 run --vus 50 --duration 1m scripts/load-test.js

# Test with 200 users (higher load)
k6 run --env BASE_URL=https://kolink.es scripts/load-test.js \
  --stage 1m:50,2m:100,3m:200,1m:200,30s:0
```

## Test Stages

The default load test has 5 stages over ~5 minutes:

| Stage | Duration | Target Users | Purpose |
|-------|----------|--------------|---------|
| 1 | 30s | 10 | Warm up |
| 2 | 1m | 50 | Ramp up |
| 3 | 2m | 100 | Peak load |
| 4 | 1m | 100 | Sustain peak |
| 5 | 30s | 0 | Cool down |

## Metrics and Thresholds

### Key Metrics

1. **HTTP Request Duration (p95)**: 95% of requests should complete in <3s
2. **HTTP Request Failure Rate**: Should be <5%
3. **Landing Page Duration (p95)**: Should load in <2s
4. **API Health Check (p95)**: Should respond in <500ms

### Success Criteria

- ✅ **p95 < 3s**: 95% of requests complete in under 3 seconds
- ✅ **Error Rate < 5%**: Less than 5% of requests fail
- ✅ **100 Concurrent Users**: System handles 100 simultaneous users
- ✅ **Stable Performance**: No degradation during sustained load

## Interpreting Results

### Good Results Example

```
📊 Load Test Summary
--------------------------------------------------

HTTP Requests:
  Total: 12,450
  Rate: 41.5 req/s
  Duration:
    - p50: 245.32ms
    - p95: 1,834.21ms
    - p99: 2,456.78ms
    - max: 2,891.45ms

Error Rate:
  HTTP Failures: 0.12%
  Custom Errors: 0.08%

Page Performance:
  Landing Page p95: 1,567.89ms
  Health API p95: 234.56ms

Virtual Users:
  Min: 0
  Max: 100

✅ PASSED
```

### Warning Signs

- ⚠️ **p95 > 3s**: Performance degradation under load
- ⚠️ **Error Rate > 5%**: Too many failures
- ⚠️ **Increasing response times**: System struggling to keep up
- ⚠️ **Memory leaks**: Response times increase over time

## What to Test

### Pages Tested

1. **Landing Page** (`/`)
   - Static content
   - Should load in <2s

2. **Health Check API** (`/api/health`)
   - Critical monitoring endpoint
   - Should respond in <500ms

3. **Sign In Page** (`/signin`)
   - Form rendering
   - Static assets

4. **Sign Up Page** (`/signup`)
   - Form rendering
   - Validation scripts

### Think Time

The test includes realistic "think time" between requests:
- 1s after landing page
- 1s after health check
- 1s after sign in page
- 2s before next cycle

This simulates real user behavior.

## Troubleshooting

### Test Fails with Connection Error

```bash
# Make sure the app is running
npm run dev  # or verify production is accessible

# Test health endpoint manually
curl http://localhost:3000/api/health
```

### High Error Rates

Possible causes:
- Database connection issues
- Rate limiting kicking in
- Server resource exhaustion
- Third-party API failures (OpenAI, Stripe, etc.)

### Performance Degradation

Check:
- Database query performance
- API response times
- Memory usage
- CPU utilization
- Network latency

## Advanced Testing

### Testing Specific Endpoints

Create custom k6 scripts for specific scenarios:

```javascript
// scripts/load-test-api.js
import http from 'k6/http';

export default function () {
  // Test API endpoint with authentication
  const headers = {
    'Authorization': 'Bearer YOUR_TEST_TOKEN',
    'Content-Type': 'application/json',
  };

  const payload = JSON.stringify({
    prompt: 'Test prompt',
    userId: 'test-user-id',
  });

  http.post('${BASE_URL}/api/generate', payload, { headers });
}
```

### Stress Testing

Push the system beyond normal load:

```bash
k6 run --env BASE_URL=https://kolink.es scripts/load-test.js \
  --stage 30s:50,1m:100,2m:200,3m:500,1m:500,30s:0
```

### Spike Testing

Sudden traffic spikes:

```bash
k6 run --env BASE_URL=https://kolink.es scripts/load-test.js \
  --stage 10s:0,10s:500,10s:0
```

## Monitoring During Tests

### Vercel Logs

```bash
# Monitor production logs during test
vercel logs --follow
```

### Sentry

Check Sentry dashboard for:
- Error spikes
- Performance issues
- Slow transactions

### Database

Monitor Supabase dashboard for:
- Connection pool usage
- Slow queries
- Database CPU/memory

## Best Practices

1. **Test Before Deploy**: Run load tests before major releases
2. **Baseline Performance**: Establish baseline metrics
3. **Progressive Testing**: Start with low load, increase gradually
4. **Monitor Resources**: Watch server metrics during tests
5. **Test Realistic Scenarios**: Mimic actual user behavior
6. **Schedule Off-Peak**: Run production tests during low-traffic periods
7. **Clean Up**: Reset test data after load tests

## Integration with CI/CD

### GitHub Actions

Add to `.github/workflows/load-test.yml`:

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly at 2 AM Sunday
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load test
        run: k6 run --env BASE_URL=https://kolink.es scripts/load-test.js

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: load-test-results
          path: load-test-results.json
```

## Results Archive

Store test results for comparison:

```bash
# Run test and save results
k6 run scripts/load-test.js > load-test-results-$(date +%Y%m%d).txt

# Or use JSON output
k6 run scripts/load-test.js --out json=load-test-results.json
```

## Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| p95 Response Time | <3s | - | ⏳ Pending |
| Error Rate | <5% | - | ⏳ Pending |
| Peak Users | 100 | - | ⏳ Pending |
| Landing Page Load | <2s | - | ⏳ Pending |
| Health API Response | <500ms | - | ⏳ Pending |

## Next Steps

1. **Install k6**: `brew install k6`
2. **Run Test Locally**: `k6 run scripts/load-test.js`
3. **Fix Issues**: Address any failures
4. **Test Production**: `k6 run --env BASE_URL=https://kolink.es scripts/load-test.js`
5. **Document Results**: Update performance targets table
6. **Schedule Regular Tests**: Add to CI/CD pipeline

## Resources

- [K6 Documentation](https://k6.io/docs/)
- [K6 Cloud](https://k6.io/cloud/) - Advanced metrics and analysis
- [Grafana k6 OSS](https://github.com/grafana/k6) - GitHub repository
- [K6 Examples](https://k6.io/docs/examples/) - Test script examples
