# Deployment Guide - Morpho Analyst

Step-by-step deployment instructions for the Morpho Analyst system.

## Phase 1: Environment Preparation (Day 1-2)

### 1.1 Vercel Project Setup

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Link Project** (from project root)
   ```bash
   vercel link
   ```

### 1.2 PostgreSQL Database Setup

Choose one of the following PostgreSQL providers:

**Option A: Vercel Postgres**
```bash
# Create Vercel Postgres database
vercel postgres create morpho-analyst-db
```

**Option B: Supabase**
1. Go to [Supabase](https://supabase.com/)
2. Create new project
3. Copy connection string from Settings → Database

**Option C: Other PostgreSQL Provider**
- Ensure SSL is supported
- Note the connection string

### 1.3 Get Dune Analytics API Key

1. Visit [Dune Analytics](https://dune.com/)
2. Sign in to your account
3. Go to Settings → API
4. Click "Create new API key"
5. Copy the API key (you won't be able to see it again!)

## Phase 2: Database Schema Creation (Day 3)

### 2.1 Create Database Schema

Execute the schema creation SQL:

```bash
# Set your database URL
export DATABASE_URL="postgresql://user:password@host:port/database"

# Run schema creation
psql $DATABASE_URL -f ref/migration_sql/01_create_schema.sql
```

Or manually execute the SQL file in your database GUI tool.

### 2.2 Verify Schema

```sql
-- Check if all tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- Expected output:
-- morpho_collateral_history
-- morpho_borrow_history
-- dex_volume_history
-- morpho_earn_history
-- dune_execution_log
```

## Phase 3: Initial Data Migration (Day 3-4)

### 3.1 Set Local Environment Variables

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DUNE_API_KEY=your_actual_api_key
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_SSL=true
CRON_SECRET=$(openssl rand -base64 32)
MIGRATION_SECRET=$(openssl rand -base64 32)
```

### 3.2 Install Dependencies

```bash
npm install
```

### 3.3 Run Initial Migration

```bash
npm run migrate
```

Expected output:
```
============================================================
Initial Data Migration - Morpho Analyst
============================================================

📊 Morpho Collateral History
------------------------------------------------------------
  Reading Result_Collateral.json...
  Processing XXX collateral rows...
  ✓ Successfully processed XXX rows

📊 Morpho Borrow History
...

✓ Migration completed successfully
  Total rows processed: XXXX
  Elapsed time: XX.XXs
```

### 3.4 Verify Data

```sql
-- Check row counts
SELECT 'morpho_collateral_history' as table_name, COUNT(*) as rows FROM morpho_collateral_history
UNION ALL
SELECT 'morpho_borrow_history', COUNT(*) FROM morpho_borrow_history
UNION ALL
SELECT 'dex_volume_history', COUNT(*) FROM dex_volume_history
UNION ALL
SELECT 'morpho_earn_history', COUNT(*) FROM morpho_earn_history;
```

## Phase 4: Vercel Deployment (Day 5-6)

### 4.1 Configure Vercel Environment Variables

```bash
# Add environment variables to Vercel
vercel env add DUNE_API_KEY production
vercel env add DATABASE_URL production
vercel env add DATABASE_SSL production
vercel env add CRON_SECRET production
vercel env add MIGRATION_SECRET production
```

Or use the Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Add each variable
3. Select "Production", "Preview", and "Development" environments

### 4.2 Deploy to Production

```bash
# Deploy to production
vercel --prod
```

### 4.3 Verify Deployment

Check deployment URL (e.g., `https://morpho-analyst.vercel.app`)

## Phase 5: Testing (Day 7-8)

### 5.1 Test Cron Endpoint Manually

```bash
# Replace with your actual deployment URL and CRON_SECRET
curl -X POST https://your-app.vercel.app/api/cron/dune-fetch \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "targetDate": "2025-10-15",
  "executedAt": "2025-10-15T01:00:00.000Z",
  "summary": {
    "totalQueries": 4,
    "successCount": 4,
    "failedCount": 0,
    "totalRows": XXX
  },
  "results": [...]
}
```

### 5.2 Check Execution Logs

```sql
SELECT
  query_name,
  execution_date,
  status,
  row_count,
  started_at,
  completed_at,
  error_message
FROM dune_execution_log
ORDER BY started_at DESC
LIMIT 10;
```

### 5.3 Verify Cron Job Configuration

1. Go to Vercel Dashboard → Your Project → Cron Jobs
2. Verify the cron job is listed
3. Check schedule: `0 1 * * *` (UTC 01:00)

## Phase 6: Monitoring Setup (Day 9-10)

### 6.1 Enable Vercel Logs

1. Go to Vercel Dashboard → Your Project → Logs
2. Set up log retention (if using Pro plan)

### 6.2 Create Monitoring Dashboard

Create a database view for monitoring:

```sql
CREATE OR REPLACE VIEW execution_summary AS
SELECT
  DATE(execution_date) as date,
  COUNT(*) as total_executions,
  SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
  SUM(row_count) as total_rows_fetched
FROM dune_execution_log
GROUP BY DATE(execution_date)
ORDER BY date DESC;
```

### 6.3 Optional: Set Up Slack Notifications

1. Create Slack webhook URL
2. Add to Vercel environment variables:
   ```bash
   vercel env add SLACK_WEBHOOK_URL production
   ```

3. Add notification logic to `api/cron/dune-fetch.ts`:
   ```typescript
   if (failedCount > 0 && process.env.SLACK_WEBHOOK_URL) {
     await fetch(process.env.SLACK_WEBHOOK_URL, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         text: `⚠️ Morpho Analyst: ${failedCount} queries failed`
       })
     });
   }
   ```

## Phase 7: Production Verification

### 7.1 Wait for First Automatic Execution

The cron job runs daily at UTC 01:00 (JST 10:00).

After the first automatic run:
1. Check Vercel function logs
2. Query execution logs table
3. Verify new data was inserted

### 7.2 Checklist

- [ ] Database schema created
- [ ] Initial data migration completed
- [ ] Vercel deployment successful
- [ ] Environment variables configured
- [ ] Cron job configured and verified
- [ ] Manual test execution successful
- [ ] Monitoring dashboard created
- [ ] First automatic execution successful

## Rollback Procedure

If you need to rollback:

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

## Common Issues

### Issue: Vercel timeout during cron execution

**Solution:** Vercel has a 60-second timeout for Hobby plan, 300 seconds for Pro plan. Ensure you're on Pro plan or optimize queries.

### Issue: Database connection pool exhausted

**Solution:** The code uses a maximum of 5 connections. If you see this error:
1. Check for connection leaks
2. Ensure `closePool()` is called in migration script
3. Reduce concurrent queries in cron job

### Issue: Cron job not triggering

**Solution:**
1. Cron jobs only work in production
2. Verify `vercel.json` is in root directory
3. Check Vercel dashboard for cron job status
4. Ensure you're on a paid Vercel plan (cron jobs require Pro plan)

## Maintenance Commands

```bash
# View recent deployments
vercel ls

# View environment variables
vercel env ls

# Pull environment variables to local
vercel env pull

# View function logs
vercel logs

# Redeploy (without changes)
vercel --prod --force
```

## Next Steps After Deployment

1. Monitor execution logs daily for the first week
2. Set up data quality checks
3. Create dashboards for data visualization
4. Configure backup strategy for database
5. Document any custom configurations or changes
