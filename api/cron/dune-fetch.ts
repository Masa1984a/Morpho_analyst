/**
 * Vercel Cron Job Handler - Daily Data Fetch from Dune Analytics
 * Scheduled to run daily at JST 12:00 (UTC 03:00)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createDuneClient } from '../../lib/dune-client';
import {
  upsertCollateralHistory,
  upsertBorrowHistory,
  upsertDexVolumeHistory,
  upsertEarnHistory,
  upsertWLDPriceHistory,
  insertExecutionLog,
  updateExecutionLogStatus,
} from '../../lib/db';
import type {
  QueryConfig,
  CollateralRow,
  BorrowRow,
  DexVolumeRow,
  EarnRow,
  WLDPriceRow,
  FetchResult,
} from '../../lib/types';

// Query configurations
const QUERY_CONFIGS: QueryConfig[] = [
  {
    queryId: 5963629,
    queryName: 'World Morpho Collateral History',
    tableName: 'morpho_collateral_history',
    upsertHandler: async (rows: CollateralRow[]) =>
      upsertCollateralHistory(rows),
  },
  {
    queryId: 5963670,
    queryName: 'World Morpho Borrow History',
    tableName: 'morpho_borrow_history',
    upsertHandler: async (rows: BorrowRow[]) => upsertBorrowHistory(rows),
  },
  {
    queryId: 5963703,
    queryName: 'World DEX Volume History',
    tableName: 'dex_volume_history',
    upsertHandler: async (rows: DexVolumeRow[]) => upsertDexVolumeHistory(rows),
  },
  {
    queryId: 5963349,
    queryName: 'World Morpho Earn History',
    tableName: 'morpho_earn_history',
    upsertHandler: async (rows: EarnRow[]) => upsertEarnHistory(rows),
  },
  {
    queryId: 5982584,
    queryName: 'WLD Daily Price History',
    tableName: 'wld_price_history',
    upsertHandler: async (rows: WLDPriceRow[]) => upsertWLDPriceHistory(rows),
  },
];

/**
 * Get current date in YYYY-MM-DD format for query parameter
 */
function getCurrentDate(): string {
  // JST 12:00 execution time corresponds to UTC 03:00
  // We want to fetch data for the current UTC date
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Process a single query
 */
async function processQuery(
  config: QueryConfig,
  client: ReturnType<typeof createDuneClient>,
  targetDate: string
): Promise<FetchResult> {
  const startedAt = new Date();
  let executionId = '';

  try {
    console.log(`\n📊 Processing: ${config.queryName}`);
    console.log(`   Query ID: ${config.queryId}`);
    console.log(`   Target Date: ${targetDate}`);

    // Create execution log entry
    await insertExecutionLog({
      query_id: config.queryId,
      query_name: config.queryName,
      execution_id: null,
      execution_date: new Date(targetDate),
      status: 'PENDING',
      row_count: null,
      error_message: null,
      started_at: startedAt,
      completed_at: null,
    });

    // Execute query with date parameter
    executionId = await client.executeQuery(config.queryId, {
      p_date: targetDate,
    });

    // Update log with execution ID
    await updateExecutionLogStatus(executionId, 'EXECUTING');

    // Wait for completion (max 5 minutes)
    const success = await client.waitForExecution(executionId, 300000, 5000);

    if (!success) {
      await updateExecutionLogStatus(
        executionId,
        'FAILED',
        0,
        'Query execution timeout or failed'
      );
      return {
        queryId: config.queryId,
        queryName: config.queryName,
        executionId,
        status: 'failed',
        rowCount: 0,
        errorMessage: 'Query execution timeout or failed',
        startedAt,
        completedAt: new Date(),
      };
    }

    // Get results
    const results = await client.getExecutionResults(executionId);
    const rows = results.result.rows;

    console.log(`   ✓ Retrieved ${rows.length} rows`);

    // Upsert to database
    const rowsAffected = await config.upsertHandler(rows);

    console.log(`   ✓ Upserted ${rowsAffected} rows to ${config.tableName}`);

    // Update log
    await updateExecutionLogStatus(executionId, 'COMPLETED', rows.length);

    return {
      queryId: config.queryId,
      queryName: config.queryName,
      executionId,
      status: 'success',
      rowCount: rows.length,
      startedAt,
      completedAt: new Date(),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`   ✗ Error: ${errorMessage}`);

    if (executionId) {
      await updateExecutionLogStatus(executionId, 'FAILED', 0, errorMessage);
    }

    return {
      queryId: config.queryId,
      queryName: config.queryName,
      executionId: executionId || '',
      status: 'failed',
      rowCount: 0,
      errorMessage,
      startedAt,
      completedAt: new Date(),
    };
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
  console.log('Dune Analytics Daily Data Fetch');
  console.log('='.repeat(60));
  console.log(`Execution Time: ${new Date().toISOString()}`);

  const targetDate = getCurrentDate();
  console.log(`Target Date: ${targetDate}`);

  try {
    // Create Dune API client
    const client = createDuneClient();

    const results: FetchResult[] = [];

    // Process each query sequentially with delay to respect rate limits
    for (let i = 0; i < QUERY_CONFIGS.length; i++) {
      const config = QUERY_CONFIGS[i];

      const result = await processQuery(config, client, targetDate);
      results.push(result);

      // Wait 1 second between queries (except after the last one)
      if (i < QUERY_CONFIGS.length - 1) {
        console.log('   ⏳ Waiting 1 second before next query...');
        await sleep(1000);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Execution Summary');
    console.log('='.repeat(60));

    const successCount = results.filter((r) => r.status === 'success').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;
    const totalRows = results.reduce((sum, r) => sum + r.rowCount, 0);

    console.log(`Total Queries: ${results.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log(`Total Rows Fetched: ${totalRows}`);

    results.forEach((result) => {
      const statusIcon = result.status === 'success' ? '✓' : '✗';
      console.log(
        `${statusIcon} ${result.queryName}: ${result.rowCount} rows ${result.errorMessage ? `(${result.errorMessage})` : ''}`
      );
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
        totalRows,
      },
      results: results.map((r) => ({
        queryId: r.queryId,
        queryName: r.queryName,
        executionId: r.executionId,
        status: r.status,
        rowCount: r.rowCount,
        errorMessage: r.errorMessage,
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
