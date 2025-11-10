#!/bin/bash
# Script to replace console.log/info/warn/error with logger

echo "🔄 Replacing console.log/info/warn/error with logger..."

# Find all .ts and .tsx files with console statements
files=$(grep -rl "console\.\(log\|info\|warn\|error\)" src/pages/api/ src/pages/*.tsx src/components/ --include="*.ts" --include="*.tsx" 2>/dev/null)

if [ -z "$files" ]; then
    echo "✅ No console.log found!"
    exit 0
fi

count=0
for file in $files; do
    echo "📝 Processing: $file"
    
    # Add import if not present
    if ! grep -q "import.*logger.*from.*@/lib/logger" "$file"; then
        # Find first import line
        first_import=$(grep -n "^import" "$file" | head -1 | cut -d: -f1)
        if [ -n "$first_import" ]; then
            sed -i.bak "${first_import}i\\
import { logger } from '@/lib/logger';
" "$file"
        else
            # No imports, add at top after any comments
            sed -i.bak "1i\\
import { logger } from '@/lib/logger';\\

" "$file"
        fi
    fi
    
    # Replace console.log with logger.debug (only in development)
    sed -i.bak 's/console\.log(/logger.debug(/g' "$file"

    # Replace console.info with logger.info
    sed -i.bak 's/console\.info(/logger.info(/g' "$file"

    # Replace console.warn with logger.warn
    sed -i.bak 's/console\.warn(/logger.warn(/g' "$file"

    # Replace console.error with logger.error
    # Note: logger.error signature is different (message, error, context)
    # Manual review may be needed for complex cases
    sed -i.bak 's/console\.error(/logger.error(/g' "$file"

    # Remove backup files
    rm -f "${file}.bak"
    
    ((count++))
done

echo ""
echo "✅ Processed $count files"
echo "🔍 Verifying..."

remaining=$(grep -r "console\.\(log\|info\|warn\|error\)" src/pages/api/ src/pages/*.tsx src/components/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "logger.ts" | grep -v "eslint-disable" | wc -l)
echo "📊 Remaining console statements: $remaining"
echo ""
echo "⚠️  Note: Some console.error replacements may need manual review"
echo "    logger.error() uses signature: logger.error(message, error, context)"
