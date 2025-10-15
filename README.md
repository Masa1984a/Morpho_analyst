# Morpho Analyst - Dune Analytics Data Auto-Fetch System

Automated system for fetching World Morpho Protocol data from Dune Analytics and storing it in PostgreSQL, deployed on Vercel Functions.

## Overview

This system automatically retrieves on-chain data for the World Morpho Protocol from Dune Analytics on a daily schedule and stores it in a PostgreSQL database.

### Features

- Automated daily data fetch from 4 Dune Analytics queries
- **REST API for data access** with Bearer Token authentication
- Serverless execution on Vercel Functions
- PostgreSQL database with automatic UPSERT handling
- Scheduled execution via Vercel Cron Jobs (Daily at JST 12:00 / UTC 03:00)
- Comprehensive error handling and retry logic
- Execution logging and monitoring
- Date range filtering and pagination support

### Data Sources

| Query ID | Name | Table | Update Frequency |
|----------|------|-------|------------------|
| 5963629 | World Morpho Collateral History | morpho_collateral_history | Daily |
| 5963670 | World Morpho Borrow History | morpho_borrow_history | Daily |
| 5963703 | World DEX Volume History | dex_volume_history | Daily |
| 5963349 | World Morpho Earn History | morpho_earn_history | Daily |

## Prerequisites

- Node.js 18.x or later
- PostgreSQL database (Vercel Postgres, Supabase, or other PostgreSQL provider)
- Dune Analytics API key
- Vercel account for deployment

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd morpho_analyst

# Install dependencies
npm install
```

### 2. Database Setup

Execute the schema creation script on your PostgreSQL database:

```bash
# Run the schema creation SQL
psql $DATABASE_URL -f ref/migration_sql/01_create_schema.sql
```

This will create:
- 4 data tables (morpho_collateral_history, morpho_borrow_history, dex_volume_history, morpho_earn_history)
- 1 metadata table (dune_execution_log)
- Indexes for optimized queries
- Triggers for automatic timestamp updates

### 3. Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
DUNE_API_KEY=your_actual_dune_api_key
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_SSL=true
CRON_SECRET=generate_a_random_secret
MIGRATION_SECRET=generate_another_random_secret
API_SECRET=generate_api_secret_for_data_access
```

**Generate random secrets:**
```bash
# Linux/Mac
openssl rand -base64 32

# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Getting a Dune API Key:**
1. Go to [Dune Analytics](https://dune.com/)
2. Sign in to your account
3. Navigate to Settings → API
4. Click "Create new API key"
5. Copy the generated key

### 4. Initial Data Migration

Import existing historical data from JSON files:

**Option A: Using npm script (Local)**
```bash
npm run migrate
```

**Option B: Using API endpoint (After deployment)**
```bash
curl -X POST https://your-vercel-app.vercel.app/api/migrate/initial-import \
  -H "Authorization: Bearer YOUR_MIGRATION_SECRET"
```

### 5. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 6. Configure Vercel Environment Variables

In the Vercel dashboard, add the following environment variables:

1. Go to your project → Settings → Environment Variables
2. Add each variable from your `.env` file
3. Make sure to select "Production", "Preview", and "Development" as needed

### 7. Enable Cron Jobs

Vercel automatically detects the `vercel.json` cron configuration. The cron job will start running after deployment.

**Cron Schedule:** Daily at UTC 01:00 (JST 10:00)

## Project Structure

```
morpho_analyst/
├── api/
│   ├── cron/
│   │   └── dune-fetch.ts          # Daily cron job handler
│   ├── data/
│   │   ├── collateral.ts          # Collateral History API
│   │   ├── borrow.ts              # Borrow History API
│   │   ├── dex-volume.ts          # DEX Volume API
│   │   └── earn.ts                # Earn History API
│   └── migrate/
│       └── initial-import.ts       # Manual migration endpoint
├── lib/
│   ├── api-auth.ts                 # API authentication utilities
│   ├── db.ts                       # Database client and UPSERT functions
│   ├── dune-client.ts              # Dune Analytics API client
│   └── types.ts                    # TypeScript type definitions
├── scripts/
│   └── migrate-data.ts             # Initial data migration script
├── ref/
│   ├── Results/                    # Existing JSON data files
│   ├── migration_sql/              # SQL schema files
│   └── Dune_Query/                 # Query definitions
├── .env.example                    # Environment variables template
├── package.json                    # NPM dependencies
├── tsconfig.json                   # TypeScript configuration
├── vercel.json                     # Vercel configuration
└── README.md                       # This file
```

## Usage

### REST API Access

The system provides REST API endpoints to access the stored data. See [API_SPECIFICATION.md](API_SPECIFICATION.md) for complete documentation.

#### Quick Start

```bash
# Get collateral data (latest 100 records)
curl -X GET "https://your-app.vercel.app/api/data/collateral" \
  -H "Authorization: Bearer YOUR_API_SECRET"

# Get borrow data with date range
curl -X GET "https://your-app.vercel.app/api/data/borrow?from=2025-10-01&to=2025-10-15" \
  -H "Authorization: Bearer YOUR_API_SECRET"

# Get DEX volume with pagination
curl -X GET "https://your-app.vercel.app/api/data/dex-volume?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_API_SECRET"

# Get earn data
curl -X GET "https://your-app.vercel.app/api/data/earn?from=2025-10-01" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

#### Available Endpoints

| Endpoint | Description | Documentation |
|----------|-------------|---------------|
| `GET /api/data/collateral` | Morpho担保履歴 | [API Spec](API_SPECIFICATION.md#1-morpho担保履歴取得) |
| `GET /api/data/borrow` | Morpho借入履歴 | [API Spec](API_SPECIFICATION.md#2-morpho借入履歴取得) |
| `GET /api/data/dex-volume` | DEX取引量履歴 | [API Spec](API_SPECIFICATION.md#3-dex取引量履歴取得) |
| `GET /api/data/earn` | Morpho Earn履歴 | [API Spec](API_SPECIFICATION.md#4-morpho-earn履歴取得) |

### Manual Data Fetch

You can manually trigger a data fetch:

```bash
curl -X POST https://your-vercel-app.vercel.app/api/cron/dune-fetch \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Check Execution Logs

Query the `dune_execution_log` table to see execution history:

```sql
SELECT
  query_name,
  execution_date,
  status,
  row_count,
  started_at,
  completed_at
FROM dune_execution_log
ORDER BY execution_date DESC
LIMIT 10;
```

### View Latest Data

```sql
-- Latest collateral data
SELECT * FROM morpho_collateral_history
ORDER BY day DESC LIMIT 10;

-- Latest borrow data
SELECT * FROM morpho_borrow_history
ORDER BY day DESC LIMIT 10;

-- Latest DEX volume data
SELECT * FROM dex_volume_history
ORDER BY date DESC LIMIT 10;

-- Latest earn data
SELECT * FROM morpho_earn_history
ORDER BY day DESC LIMIT 10;
```

## Development

### Local Development

```bash
# Run Vercel dev server
npm run dev

# Build TypeScript
npm run build

# Run migration locally
npm run migrate
```

### Testing the Cron Endpoint Locally

```bash
curl -X POST http://localhost:3000/api/cron/dune-fetch \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Error Handling

The system includes comprehensive error handling:

- **API Errors**: Automatic retry with exponential backoff (max 3 retries)
- **Timeouts**: 5-minute timeout for query execution
- **Rate Limiting**: 1-second delay between queries, 429 error handling
- **Database Errors**: Transaction-based UPSERT with rollback on failure
- **Logging**: All executions logged to `dune_execution_log` table

## Monitoring

### Vercel Dashboard

Monitor function execution in the Vercel dashboard:
- Go to your project → Functions
- View logs, execution time, and errors

### Database Queries

Check system health with SQL queries:

```sql
-- Check recent execution status
SELECT
  query_name,
  status,
  COUNT(*) as count
FROM dune_execution_log
WHERE execution_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY query_name, status;

-- Check for failures
SELECT *
FROM dune_execution_log
WHERE status = 'FAILED'
ORDER BY started_at DESC
LIMIT 10;
```

## Troubleshooting

### Issue: "DUNE_API_KEY is required"

**Solution:** Ensure `DUNE_API_KEY` is set in your Vercel environment variables.

### Issue: "Database connection failed"

**Solution:**
1. Verify `DATABASE_URL` is correct
2. Check if your database allows connections from Vercel IP addresses
3. Ensure `DATABASE_SSL=true` if your database requires SSL

### Issue: Cron job not executing

**Solution:**
1. Check if `CRON_SECRET` is set in Vercel environment variables
2. Verify the cron configuration in `vercel.json`
3. Check Vercel dashboard for cron job status
4. Cron jobs only run in production, not in development

### Issue: Query execution timeout

**Solution:**
- Large datasets may take longer to process
- The timeout is set to 5 minutes by default
- Check Dune Analytics dashboard to ensure query is optimized

## Performance

- **Daily Processing Time**: ~5-15 minutes (depends on data volume)
- **Database Connections**: Maximum 5 concurrent connections
- **API Rate Limits**:
  - Maximum 2 concurrent queries
  - 1-second delay between requests
  - Exponential backoff for 429 errors

## Security

- API keys stored as Vercel environment variables
- Cron endpoint protected by `CRON_SECRET`
- Migration endpoint protected by `MIGRATION_SECRET`
- **Data API endpoints protected by `API_SECRET`**
- Database connections use SSL/TLS encryption
- No sensitive data logged in execution logs
- All communication over HTTPS

## Maintenance

### Regular Tasks

- **Daily**: Monitor execution logs for failures
- **Weekly**: Check data integrity and consistency
- **Monthly**: Review performance metrics and optimize queries
- **Quarterly**: Clean up old execution logs (>90 days)

### Cleanup Old Logs

```sql
DELETE FROM dune_execution_log
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
```

## License

MIT

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Vercel function logs
3. Check database execution logs
4. Refer to [Dune API Documentation](https://docs.dune.com/api-reference/)

## References

- [Dune Analytics API Documentation](https://docs.dune.com/api-reference/)
- [Vercel Functions Documentation](https://vercel.com/docs/functions)
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
