/**
 * Vercel Cron Job Handler - Submit Queries to Dune Analytics
 * Scheduled to run daily at JST 12:00 (UTC 03:00)
 *
 * This handler only submits queries and does not wait for completion.
 * Query results are processed by dune-check.ts which runs hourly.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createDuneClient } from '../../lib/dune-client';
import {
  insertExecutionLog,
  updateExecutionLogStatus,
} from '../../lib/db';
import type { QueryConfig } from '../../lib/types';

// Query configurations
const QUERY_CONFIGS: QueryConfig[] = [
  {
    queryId: 5963629,
    queryName: 'World Morpho Collateral History',
    tableName: 'morpho_collateral_history',
    upsertHandler: async () => 0, // Not used in submit
  },
  {
    queryId: 5963670,
    queryName: 'World Morpho Borrow History',
    tableName: 'morpho_borrow_history',
    upsertHandler: async () => 0, // Not used in submit
  },
  {
    queryId: 5963703,
    queryName: 'World DEX Volume History',
    tableName: 'dex_volume_history',
    upsertHandler: async () => 0, // Not used in submit
  },
  {
    queryId: 5963349,
    queryName: 'World Morpho Earn History',
    tableName: 'morpho_earn_history',
    upsertHandler: async () => 0, // Not used in submit
  },
  {
    queryId: 5982584,
    queryName: 'WLD Daily Price History',
    tableName: 'wld_price_history',
    upsertHandler: async () => 0, // Not used in submit
  },
];

/**
 * Get previous date in YYYY-MM-DD format for query parameter
 * Returns yesterday's date (UTC) to fetch completed daily data
 */
function getPreviousDate(): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - 1);
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Submit a single query
 */
async function submitQuery(
  config: QueryConfig,
  client: ReturnType<typeof createDuneClient>,
  targetDate: string
): Promise<{ success: boolean; executionId?: string; error?: string }> {
  const startedAt = new Date();

  try {
    console.log(`\n📊 Submitting: ${config.queryName}`);
    console.log(`   Query ID: ${config.queryId}`);
    console.log(`   Target Date: ${targetDate}`);

    // Execute query with date parameter
    const executionId = await client.executeQuery(config.queryId, {
      p_date: targetDate,
    });

    console.log(`   ✓ Execution ID: ${executionId}`);

    // Create execution log entry with EXECUTING status
    await insertExecutionLog({
      query_id: config.queryId,
      query_name: config.queryName,
      execution_id: executionId,
      execution_date: new Date(targetDate),
      status: 'EXECUTING',
      row_count: null,
      error_message: null,
      started_at: startedAt,
      completed_at: null,
    });

    return { success: true, executionId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`   ✗ Error: ${errorMessage}`);

    return { success: false, error: errorMessage };
  }
}

/**
 * Add delay between requests to respect rate limits
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main cron handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify cron secret for security
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('='.repeat(60));
  console.log('Dune Analytics - Submit Queries');
  console.log('='.repeat(60));
  console.log(`Execution Time: ${new Date().toISOString()}`);

  const targetDate = getPreviousDate();
  console.log(`Target Date (Previous Day): ${targetDate}`);

  try {
    // Create Dune API client
    const client = createDuneClient();

    const results: Array<{
      queryId: number;
      queryName: string;
      success: boolean;
      executionId?: string;
      error?: string;
    }> = [];

    // Submit each query sequentially with delay to respect rate limits
    for (let i = 0; i < QUERY_CONFIGS.length; i++) {
      const config = QUERY_CONFIGS[i];

      const result = await submitQuery(config, client, targetDate);
      results.push({
        queryId: config.queryId,
        queryName: config.queryName,
        success: result.success,
        executionId: result.executionId,
        error: result.error,
      });

      // Wait 1 second between queries (except after the last one)
      if (i < QUERY_CONFIGS.length - 1) {
        console.log('   ⏳ Waiting 1 second before next query...');
        await sleep(1000);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Submission Summary');
    console.log('='.repeat(60));

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    console.log(`Total Queries: ${results.length}`);
    console.log(`Successfully Submitted: ${successCount}`);
    console.log(`Failed: ${failedCount}`);

    results.forEach((result) => {
      const statusIcon = result.success ? '✓' : '✗';
      const detail = result.success
        ? `Execution ID: ${result.executionId}`
        : `Error: ${result.error}`;
      console.log(`${statusIcon} ${result.queryName} - ${detail}`);
    });

    console.log('='.repeat(60));

    // Return response
    return res.status(200).json({
      success: true,
      targetDate,
      executedAt: new Date().toISOString(),
      summary: {
        totalQueries: results.length,
        successCount,
        failedCount,
      },
      results: results.map((r) => ({
        queryId: r.queryId,
        queryName: r.queryName,
        success: r.success,
        executionId: r.executionId,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error('\n✗ Fatal error during cron execution:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executedAt: new Date().toISOString(),
    });
  }
}
