# 🔍 Kolink v0.7.3 - Automatic Schema Verification System

## Overview

This system automatically verifies and repairs the Supabase database schema before each deployment, ensuring database integrity and preventing deployment failures due to schema mismatches.

---

## 📁 Files

### 1. `supabase_verify_full_schema_v0.7.3.sql`

**Purpose:** Complete SQL script for schema verification and auto-repair.

**Features:**
- Creates helper functions: `table_exists()`, `column_exists()`, `get_table_columns()`
- Verifies all required tables: `profiles`, `posts`, `logs`, `admin_logs`, `schedule`
- Auto-adds missing columns to `profiles` and `posts`
- Creates missing tables with proper RLS policies
- Provides `verify_schema_v073()` function for status reporting

**Usage:** Executed automatically by `predeploy_verify_supabase.ts`

---

### 2. `predeploy_verify_supabase.ts`

**Purpose:** TypeScript script that runs before each deployment.

**Features:**
- ✅ Loads environment variables from `.env.local`
- ✅ Verifies schema verification function is installed
- ✅ Checks current schema status via RPC call
- ✅ Reports missing tables/columns
- ✅ Logs actions to `admin_logs` table
- ✅ Displays colorful checklist in terminal
- ✅ Exits with error code if critical issues found

**Note:** This script verifies the schema but does NOT automatically modify your database. All schema modifications must be done through the SQL file in the Supabase SQL Editor.

**Usage:**
```bash
# Run manually
npm run predeploy:verify

# Runs automatically before build
npm run build  # prebuild hook executes verification first
```

---

## 🚀 How It Works

### CI/CD Behavior

**Important:** The verification script automatically detects CI environments and behaves accordingly:

- **In CI (GitHub Actions, Vercel, etc.):**
  - If Supabase credentials are NOT configured → **Skips verification** (exits with code 0)
  - If Supabase credentials ARE configured → Runs full verification
  - This allows builds to succeed even without database access

- **In Local Development:**
  - Always requires Supabase credentials
  - Fails if credentials are missing or schema is invalid

**To enable schema verification in CI:**
Add these secrets to your GitHub repository settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### First-Time Setup (Required)

**Before running the verification script for the first time**, you must install the schema verification functions in your Supabase database:

1. **Open Supabase SQL Editor**: https://supabase.com/dashboard/project/_/sql
2. **Copy the SQL file**: `scripts/supabase_verify_full_schema_v0.7.3.sql`
3. **Paste and execute** the SQL in the Supabase SQL Editor
4. **Run verification**: `npm run predeploy:verify`

This is a **one-time setup**. The SQL script creates:
- Helper functions for schema validation
- Auto-repair logic for missing columns
- Schema verification reporting function
- All necessary tables with RLS policies

---

### Automatic Execution (After Setup)

Once the SQL functions are installed, the `prebuild` hook in `package.json` ensures verification runs before every build:

```json
{
  "scripts": {
    "prebuild": "ts-node scripts/predeploy_verify_supabase.ts",
    "build": "next build --turbopack"
  }
}
```

**Workflow:**
1. Developer runs `npm run build`
2. `prebuild` hook runs `predeploy_verify_supabase.ts`
3. Script checks if verification function exists
4. Script verifies current schema status
5. If successful (exit code 0): build continues
6. If failed (exit code 1): build stops, developer must fix issues

---

### Manual Execution

Run verification manually anytime:

```bash
# Full verification and repair
npm run predeploy:verify

# Or directly
ts-node scripts/predeploy_verify_supabase.ts
```

---

## 📊 Terminal Output Example

```
================================================================================
🚀 Kolink v0.7.3 - Pre-Deploy Schema Verification
================================================================================
Verifying Supabase schema before deployment...

================================================================================
🔍 Environment Verification
================================================================================
✅ Supabase URL
   https://crdtxyfvbosjiddirtzc.supabase.co
✅ Service Role Key
   Configured
✅ Verification SQL
   File found

================================================================================
🔧 Executing Schema Verification & Repair SQL
================================================================================

Executing 45 SQL statements...
✅ SQL Execution
   Verification and repair SQL executed

================================================================================
🔍 Schema Verification
================================================================================

Table Status:
✅ Table: profiles
   23 columns
✅ Table: posts
   10 columns
✅ Table: logs
   Table exists
✅ Table: schedule
   Table exists
✅ Table: admin_logs
   Table exists

Overall Status: HEALTHY

================================================================================
📊 Verification Summary
================================================================================
Timestamp: 2025-01-25T18:30:45.123Z
Version: v0.7.3

Database Status: HEALTHY

No repairs needed

────────────────────────────────────────────────────────────────────────────────
✅ Schema verification completed successfully
────────────────────────────────────────────────────────────────────────────────
```

---

## 🔧 What Gets Verified & Auto-Repaired

### How Auto-Repair Works

When you run the SQL file (`supabase_verify_full_schema_v0.7.3.sql`) in Supabase SQL Editor, it automatically:
1. Checks for missing columns in existing tables
2. Adds any missing columns with appropriate defaults
3. Creates missing tables with full RLS policies
4. Creates helper functions for ongoing verification

The TypeScript verification script (`predeploy_verify_supabase.ts`) then **reports** the current state but does **not** modify the database.

---

### Profiles Table

**Required Columns (v0.7.3):**
- Core: `id`, `email`, `plan`, `credits`, `role`
- Profile: `bio`, `headline`, `expertise`, `tone_profile`, `profile_embedding`
- Contact: `location`, `website`, `photo_url`, `linkedin_url`
- Professional: `company`, `position`, `interests`
- Settings: `language`, `timezone`

**Auto-Repair (via SQL):** Missing columns are added automatically when you run the SQL file.

---

### Posts Table

**Required Columns:**
- Core: `id`, `prompt`, `generated_text`, `user_id`, `created_at`
- Extended: `hashtags`, `metadata`, `viral_score`, `style`, `post_embedding`

**Auto-Repair (via SQL):** Missing columns are added automatically when you run the SQL file.

---

### System Tables

**Verified Tables:**
- `logs` - Event logging
- `admin_logs` - Admin action audit trail
- `schedule` - Content scheduling

**Auto-Repair (via SQL):** If tables don't exist when you run the SQL file, they are created with:
- Proper column definitions
- Indexes for performance
- RLS (Row Level Security) policies
- Foreign key constraints

---

## 🛠️ Configuration

### Environment Variables (Required)

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important:** Service role key is required for schema modifications.

---

### Customization

To modify required columns, edit:

```sql
-- scripts/supabase_verify_full_schema_v0.7.3.sql

-- Example: Add new column to profiles
IF NOT column_exists('profiles', 'new_column') THEN
  ALTER TABLE public.profiles ADD COLUMN new_column text;
  RAISE NOTICE 'Added column: profiles.new_column';
END IF;
```

---

## 🚨 Error Handling

### Common Errors

#### 1. Environment Variables Missing

```
❌ Supabase URL
   NEXT_PUBLIC_SUPABASE_URL not set
```

**Solution:** Add variables to `.env.local`

---

#### 2. Connection Failed

```
❌ Schema Verification
   Error: connect ECONNREFUSED
```

**Solution:**
- Check Supabase project is active
- Verify URL is correct
- Check network connection

---

#### 3. Permission Denied

```
❌ SQL Execution
   Error: permission denied for table profiles
```

**Solution:** Ensure using `SUPABASE_SERVICE_ROLE_KEY`, not anon key.

---

## 📝 Logging to Admin Logs

All verification runs are logged to `admin_logs`:

```sql
SELECT * FROM admin_logs
WHERE action = 'schema_verification'
ORDER BY created_at DESC
LIMIT 10;
```

**Log metadata includes:**
- `status`: 'success' or 'failed'
- `repairs_applied`: Number of repairs made
- `errors`: Number of errors encountered
- `schema_status`: 'healthy' or 'needs_repair'
- `automated`: true
- `script`: 'predeploy_verify_supabase.ts'

---

## 🔄 Vercel Integration

### Automatic Deployment Checks

When you push to GitHub, Vercel will:

1. Clone repository
2. Install dependencies
3. Run `prebuild` hook → **Schema verification runs here**
4. If verification succeeds: Continue to `build`
5. If verification fails: **Deployment stops**

**Benefits:**
- Prevents deploying with incompatible schema
- Catches database issues before production
- Auto-repairs simple issues (missing columns)
- Provides clear error messages in Vercel logs

---

### Viewing Logs in Vercel

1. Go to Vercel Dashboard
2. Select deployment
3. Click on "Building" phase
4. Look for "prebuild" section
5. You'll see the full verification output

---

## 🧪 Testing Locally

### Test Full Verification

```bash
npm run predeploy:verify
```

### Test Schema Check Only

```bash
npm run schema:check
```

### Simulate Failed Verification

1. Temporarily rename a column in Supabase
2. Run verification
3. Watch auto-repair in action
4. Verify column is recreated

---

## 🎯 Best Practices

### 1. Always Run Before Major Deployments

```bash
# Before pushing to production
npm run predeploy:verify
npm run build
git push
```

### 2. Review Verification Output

Don't ignore warnings:
- Yellow warnings = minor issues, auto-repaired
- Red errors = critical issues, deployment will fail

### 3. Keep SQL Updated

When adding new schema requirements:
1. Update `supabase_verify_full_schema_v0.7.3.sql`
2. Test locally: `npm run predeploy:verify`
3. Commit both SQL and TypeScript changes

### 4. Monitor Admin Logs

Periodically check for verification issues:

```sql
SELECT
  created_at,
  metadata->>'status' as status,
  metadata->>'repairs_applied' as repairs,
  metadata->>'schema_status' as schema_status
FROM admin_logs
WHERE action = 'schema_verification'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🔮 Future Enhancements

Planned improvements:

- [ ] Slack/Email notifications for failed verifications
- [ ] Automatic rollback if repair fails
- [ ] Schema version migration tracking
- [ ] Performance metrics for large databases
- [ ] Support for custom validation rules
- [ ] Integration with CI/CD pipelines

---

## 📞 Troubleshooting

### Script Won't Execute

```bash
# Make sure ts-node is available
npx ts-node scripts/predeploy_verify_supabase.ts

# Or install globally
npm install -g ts-node
```

### SQL File Not Found

```
❌ Verification SQL
   File not found: /path/to/supabase_verify_full_schema_v0.7.3.sql
```

**Solution:** Ensure file exists in `scripts/` directory.

### Verification Passes but Build Fails

This script only verifies schema, not code compatibility.

**Next steps:**
1. Check TypeScript errors: `npm run lint`
2. Review recent code changes
3. Check Supabase client compatibility

---

## 📚 Related Documentation

- [Kolink v0.5/v0.6 Deployment Guide](../KOLINK_V05_V06_DEPLOYMENT.md)
- [Supabase Schema Documentation](../supabase/migrations/)
- [Package.json Scripts](../package.json)

---

## ✨ Summary

This automatic verification system ensures:

✅ **Database integrity** before every deployment
✅ **Auto-repair** of missing columns and tables
✅ **Clear feedback** via terminal checklist
✅ **Audit trail** in admin_logs
✅ **Zero-config** integration with Vercel

**Result:** Fewer deployment failures, better database consistency, peace of mind.

---

**Version:** v0.7.3
**Last Updated:** 2025-01-25
**Status:** ✅ Production Ready
