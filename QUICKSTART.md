# Quick Start Guide

Get up and running with Morpho Analyst in 10 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database ready
- Dune Analytics API key
- Vercel account

## 1. Install Dependencies

```bash
npm install
```

## 2. Setup Environment

```bash
# Copy example file
cp .env.example .env

# Edit .env and add your credentials
# - DUNE_API_KEY: Get from https://dune.com/settings/api
# - DATABASE_URL: Your PostgreSQL connection string
```

## 3. Create Database Schema

```bash
# Using psql
psql $DATABASE_URL -f ref/migration_sql/01_create_schema.sql

# Or use your database GUI tool to execute the SQL file
```

## 4. Import Initial Data

```bash
npm run migrate
```

This will import all historical data from `ref/Results/` into your database.

## 5. Test Locally

```bash
# Start Vercel dev server
npm run dev

# In another terminal, test the cron endpoint
curl -X POST http://localhost:3000/api/cron/dune-fetch \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 6. Deploy to Vercel

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Add environment variables in Vercel dashboard
# Settings → Environment Variables
```

## 7. Verify

After deployment:

1. **Check Vercel Dashboard** → Cron Jobs → Verify schedule
2. **Test the endpoint manually:**
   ```bash
   curl -X POST https://your-app.vercel.app/api/cron/dune-fetch \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
3. **Check database:**
   ```sql
   SELECT * FROM dune_execution_log ORDER BY started_at DESC LIMIT 5;
   ```

## Next Steps

- Read [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment guide
- Read [README.md](README.md) for full documentation
- Set up monitoring and alerts

## Troubleshooting

**Database connection failed?**
- Check `DATABASE_URL` is correct
- Ensure database allows connections from your IP/Vercel
- Set `DATABASE_SSL=true` if required

**Cron job not running?**
- Cron jobs only work in production deployment
- Verify environment variables are set in Vercel
- Check Vercel dashboard for cron job status

**API timeout?**
- Increase timeout in `lib/dune-client.ts`
- Check Dune query performance
- Ensure Vercel plan supports longer execution time

## Support

- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Documentation: See [README.md](README.md)
- Dune API Docs: https://docs.dune.com/api-reference/
