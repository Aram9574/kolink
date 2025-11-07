#!/bin/bash

# Rate Limiting Test Script - Kolink
# Tests distributed rate limiting with Upstash Redis

set -e

# Configuration
ENDPOINT="${1:-https://kolink.es/api/generate}"
REQUESTS="${2:-15}"
USER_ID="test-ratelimit-$(date +%s)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Rate Limiting Test${NC}"
echo -e "=================================="
echo -e "Endpoint: $ENDPOINT"
echo -e "Requests: $REQUESTS"
echo -e "User ID: $USER_ID"
echo ""

# Check if JWT token is available
if [ -z "$JWT_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  JWT_TOKEN not set in environment${NC}"
  echo -e "   Testing without authentication (will fail for protected endpoints)"
  echo ""
fi

# Counters
SUCCESS_COUNT=0
RATE_LIMITED_COUNT=0
ERROR_COUNT=0

echo -e "${BLUE}📊 Sending $REQUESTS requests...${NC}"
echo ""

for i in $(seq 1 $REQUESTS); do
  # Build request
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${JWT_TOKEN:-invalid}" \
    -H "X-User-ID: $USER_ID" \
    -d "{\"prompt\":\"rate limit test $i\",\"userId\":\"$USER_ID\"}" \
    2>/dev/null)

  # Extract status code (last line)
  STATUS=$(echo "$RESPONSE" | tail -n1)

  # Display result
  if [ "$STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Request $i: SUCCESS (200)${NC}"
    ((SUCCESS_COUNT++))
  elif [ "$STATUS" -eq 429 ]; then
    echo -e "${YELLOW}🛑 Request $i: RATE LIMITED (429)${NC}"
    ((RATE_LIMITED_COUNT++))
  else
    echo -e "${RED}❌ Request $i: ERROR ($STATUS)${NC}"
    ((ERROR_COUNT++))
  fi

  # Small delay between requests
  sleep 0.1
done

echo ""
echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}📈 Test Results${NC}"
echo -e "${BLUE}=================================${NC}"
echo -e "${GREEN}Success:       $SUCCESS_COUNT${NC}"
echo -e "${YELLOW}Rate Limited:  $RATE_LIMITED_COUNT${NC}"
echo -e "${RED}Errors:        $ERROR_COUNT${NC}"
echo -e "Total:         $REQUESTS"
echo ""

# Validate results
if [ $RATE_LIMITED_COUNT -gt 0 ]; then
  echo -e "${GREEN}✅ Rate limiting is WORKING${NC}"
  echo -e "   Requests were successfully throttled after limit"
  exit 0
elif [ $SUCCESS_COUNT -eq $REQUESTS ]; then
  echo -e "${YELLOW}⚠️  Rate limiting may NOT be working${NC}"
  echo -e "   All requests succeeded (none were throttled)"
  echo -e "   Possible reasons:"
  echo -e "   - Rate limit > $REQUESTS requests"
  echo -e "   - Redis not configured"
  echo -e "   - Endpoint doesn't use rate limiting"
  echo ""
  echo -e "   Check logs: vercel logs --follow | grep RateLimiter"
  exit 1
else
  echo -e "${RED}❌ Test inconclusive${NC}"
  echo -e "   Too many errors to determine if rate limiting works"
  exit 1
fi
