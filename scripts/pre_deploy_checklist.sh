#!/bin/bash
# Pre-Deploy Checklist Script
# Verifica que el proyecto esté listo para producción

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   KOLINK PRE-DEPLOY CHECKLIST                 ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Function to print status
function print_check() {
    local status=$1
    local message=$2
    if [ "$status" == "OK" ]; then
        echo -e "  ${GREEN}✓${NC} $message"
    elif [ "$status" == "WARN" ]; then
        echo -e "  ${YELLOW}⚠${NC} $message"
        ((WARNINGS++))
    else
        echo -e "  ${RED}✗${NC} $message"
        ((ERRORS++))
    fi
}

# 1. Environment Variables Check
echo -e "${BLUE}[1/10]${NC} Checking Environment Variables..."
if [ -f ".env.local" ]; then
    print_check "WARN" "⚠️  CRITICAL: .env.local found! DO NOT commit this file!"
    echo -e "      ${YELLOW}Action: Remove sensitive keys and use Vercel env vars${NC}"
fi

required_vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "OPENAI_API_KEY"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
)

for var in "${required_vars[@]}"; do
    if grep -q "$var" .env.local 2>/dev/null || [ ! -z "${!var}" ]; then
        print_check "OK" "$var configured"
    else
        print_check "ERROR" "$var missing"
    fi
done
echo ""

# 2. Security Audit
echo -e "${BLUE}[2/10]${NC} Running Security Audit..."
npm audit --audit-level=high > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_check "OK" "No high/critical vulnerabilities found"
else
    print_check "WARN" "Security vulnerabilities detected. Run 'npm audit' for details"
fi
echo ""

# 3. Console.log Check
echo -e "${BLUE}[3/10]${NC} Checking for console.log statements..."
CONSOLE_COUNT=$(grep -r "console\.log\|console\.info" src/pages/api/ --include='*.ts' --include='*.tsx' | wc -l)
if [ "$CONSOLE_COUNT" -gt 0 ]; then
    print_check "ERROR" "Found $CONSOLE_COUNT console.log/info statements in API routes"
    echo -e "      ${RED}Action: Replace with proper logger${NC}"
else
    print_check "OK" "No console.log in API routes"
fi
echo ""

# 4. TypeScript Compilation
echo -e "${BLUE}[4/10]${NC} TypeScript Compilation Check..."
npx tsc --noEmit > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_check "OK" "TypeScript compiles without errors"
else
    print_check "ERROR" "TypeScript compilation errors detected"
fi
echo ""

# 5. ESLint Check
echo -e "${BLUE}[5/10]${NC} Running ESLint..."
npm run lint > /dev/null 2>&1
LINT_EXIT=$?
if [ $LINT_EXIT -eq 0 ]; then
    print_check "OK" "No linting errors"
else
    WARNING_COUNT=$(npm run lint 2>&1 | grep -c "warning")
    print_check "WARN" "ESLint warnings found ($WARNING_COUNT warnings)"
fi
echo ""

# 6. Build Test
echo -e "${BLUE}[6/10]${NC} Testing Production Build..."
if [ -d ".next" ]; then
    BUILD_SIZE=$(du -sh .next | cut -f1)
    print_check "OK" "Build exists (size: $BUILD_SIZE)"

    if [[ $BUILD_SIZE == *"M"* ]]; then
        SIZE_NUM=$(echo $BUILD_SIZE | sed 's/M//')
        if (( $(echo "$SIZE_NUM > 5" | bc -l) )); then
            print_check "WARN" "Build size >5MB. Consider optimization"
        fi
    fi
else
    print_check "WARN" "Build not found. Run 'npm run build' to verify"
fi
echo ""

# 7. Database Migrations Check
echo -e "${BLUE}[7/10]${NC} Checking Database Migrations..."
MIGRATION_COUNT=$(ls -1 docs/database/*.sql 2>/dev/null | wc -l)
if [ "$MIGRATION_COUNT" -gt 0 ]; then
    print_check "OK" "Found $MIGRATION_COUNT migration files"
else
    print_check "WARN" "No migration files found"
fi
echo ""

# 8. Test Coverage
echo -e "${BLUE}[8/10]${NC} Checking Test Coverage..."
UNIT_TESTS=$(find src/__tests__ -name "*.test.ts*" 2>/dev/null | wc -l)
E2E_TESTS=$(find e2e -name "*.spec.ts" 2>/dev/null | wc -l)

if [ "$UNIT_TESTS" -gt 10 ]; then
    print_check "OK" "Unit tests: $UNIT_TESTS files"
else
    print_check "WARN" "Low unit test coverage: $UNIT_TESTS files (recommend >20)"
fi

if [ "$E2E_TESTS" -gt 5 ]; then
    print_check "OK" "E2E tests: $E2E_TESTS files"
else
    print_check "WARN" "Low E2E test coverage: $E2E_TESTS files"
fi
echo ""

# 9. Dependencies Audit
echo -e "${BLUE}[9/10]${NC} Checking Dependencies..."
OUTDATED_COUNT=$(npm outdated 2>/dev/null | wc -l)
if [ "$OUTDATED_COUNT" -gt 10 ]; then
    print_check "WARN" "Many outdated dependencies ($OUTDATED_COUNT). Consider updating"
else
    print_check "OK" "Dependencies relatively up-to-date"
fi
echo ""

# 10. Documentation Check
echo -e "${BLUE}[10/10]${NC} Documentation Verification..."
REQUIRED_DOCS=(
    "README.md"
    "CLAUDE.md"
    "docs/production/PRODUCTION_READINESS_REPORT.md"
)

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        print_check "OK" "$doc exists"
    else
        print_check "WARN" "$doc missing"
    fi
done
echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo -e "${GREEN}Ready for deployment!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS WARNING(S)${NC}"
    echo -e "${YELLOW}Review warnings before deploying${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS ERROR(S), $WARNINGS WARNING(S)${NC}"
    echo -e "${RED}Fix errors before deploying to production${NC}"
    echo ""
    echo -e "${YELLOW}Critical Actions Required:${NC}"
    if [ -f ".env.local" ]; then
        echo -e "  1. ${RED}Remove or rotate credentials in .env.local${NC}"
    fi
    if [ "$CONSOLE_COUNT" -gt 0 ]; then
        echo -e "  2. ${RED}Remove console.log from production code${NC}"
    fi
    exit 1
fi
