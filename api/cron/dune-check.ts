/**
 * Vercel Cron Job Handler - Check Query Status and Process Results
 * Scheduled to run hourly
 *
 * This handler checks the status of executing queries and processes
 * completed results by saving them to the database.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createDuneClient } from '../../lib/dune-client';
import {
  upsertCollateralHistory,
  upsertBorrowHistory,
  upsertDexVolumeHistory,
  upsertEarnHistory,
  upsertWLDPriceHistory,
  getPendingExecutions,
  updateExecutionLogStatus,
} from '../../lib/db';
import type {
  CollateralRow,
  BorrowRow,
  DexVolumeRow,
  EarnRow,
  WLDPriceRow,
  DuneExecutionLog,
} from '../../lib/types';

/**
 * Get upsert handler by query ID
 */
function getUpsertHandler(queryId: number) {
  const handlers: Record<number, (rows: any[]) => Promise<number>> = {
    5963629: async (rows: CollateralRow[]) => upsertCollateralHistory(rows),
    5963670: async (rows: BorrowRow[]) => upsertBorrowHistory(rows),
    5963703: async (rows: DexVolumeRow[]) => upsertDexVolumeHistory(rows),
    5963349: async (rows: EarnRow[]) => upsertEarnHistory(rows),
    5982584: async (rows: WLDPriceRow[]) => upsertWLDPriceHistory(rows),
  };

  return handlers[queryId];
}

/**
 * Get table name by query ID
 */
function getTableName(queryId: number): string {
  const tableNames: Record<number, string> = {
    5963629: 'morpho_collateral_history',
    5963670: 'morpho_borrow_history',
    5963703: 'dex_volume_history',
    5963349: 'morpho_earn_history',
    5982584: 'wld_price_history',
  };

  return tableNames[queryId] || 'unknown';
}

/**
 * Process a single execution
 */
async function processExecution(
  log: DuneExecutionLog,
  client: ReturnType<typeof createDuneClient>
): Promise<{
  executionId: string;
  queryName: string;
  status: 'completed' | 'failed' | 'pending';
  rowCount?: number;
  errorMessage?: string;
}> {
  const executionId = log.execution_id!;

  try {
    console.log(`\n📊 Checking: ${log.query_name}`);
    console.log(`   Execution ID: ${executionId}`);
    console.log(`   Started At: ${log.started_at.toISOString()}`);

    // Check execution status
    const statusResponse = await client.checkExecutionStatus(executionId);
    const state = statusResponse.state;

    console.log(`   Current Status: ${state}`);

    // If still executing, skip
    if (
      state === 'QUERY_STATE_EXECUTING' ||
      state === 'QUERY_STATE_PENDING'
    ) {
      console.log('   ⏳ Still executing, will check again later');
      return {
        executionId,
        queryName: log.query_name,
        status: 'pending',
      };
    }

    // If failed or cancelled, update log
    if (state === 'QUERY_STATE_FAILED' || state === 'QUERY_STATE_CANCELLED') {
      console.error(`   ✗ Query failed: ${state}`);
      await updateExecutionLogStatus(
        executionId,
        'FAILED',
        0,
        `Query ${state === 'QUERY_STATE_FAILED' ? 'failed' : 'was cancelled'}`
      );
      return {
        executionId,
        queryName: log.query_name,
        status: 'failed',
        errorMessage: `Query ${state === 'QUERY_STATE_FAILED' ? 'failed' : 'was cancelled'}`,
      };
    }

    // If completed, get results and save to database
    if (state === 'QUERY_STATE_COMPLETED') {
      console.log('   ✓ Query completed, fetching results...');

      // Get results
      const results = await client.getExecutionResults(executionId);
      const rows = results.result.rows;

      console.log(`   ✓ Retrieved ${rows.length} rows`);

      // Get upsert handler
      const upsertHandler = getUpsertHandler(log.query_id);
      if (!upsertHandler) {
        throw new Error(`No upsert handler found for query ID ${log.query_id}`);
      }

      // Upsert to database
      const rowsAffected = await upsertHandler(rows);
      const tableName = getTableName(log.query_id);

      console.log(`   ✓ Upserted ${rowsAffected} rows to ${tableName}`);

      // Update log
      await updateExecutionLogStatus(executionId, 'COMPLETED', rows.length);

      return {
        executionId,
        queryName: log.query_name,
        status: 'completed',
        rowCount: rows.length,
      };
    }

    // Unknown state
    throw new Error(`Unknown execution state: ${state}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`   ✗ Error: ${errorMessage}`);

    await updateExecutionLogStatus(executionId, 'FAILED', 0, errorMessage);

    return {
      executionId,
      queryName: log.query_name,
      status: 'failed',
      errorMessage,
    };
  }
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
  console.log('Dune Analytics - Check Query Status');
  console.log('='.repeat(60));
  console.log(`Execution Time: ${new Date().toISOString()}`);

  try {
    // Get pending executions
    const pendingExecutions = await getPendingExecutions();

    console.log(`\nFound ${pendingExecutions.length} pending execution(s)`);

    if (pendingExecutions.length === 0) {
      console.log('No pending executions to check');
      return res.status(200).json({
        success: true,
        executedAt: new Date().toISOString(),
        summary: {
          totalChecked: 0,
          completed: 0,
          failed: 0,
          stillPending: 0,
        },
        results: [],
      });
    }

    // Create Dune API client
    const client = createDuneClient();

    const results: Array<{
      executionId: string;
      queryName: string;
      status: 'completed' | 'failed' | 'pending';
      rowCount?: number;
      errorMessage?: string;
    }> = [];

    // Process each pending execution
    for (const log of pendingExecutions) {
      const result = await processExecution(log, client);
      results.push(result);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Check Summary');
    console.log('='.repeat(60));

    const completedCount = results.filter((r) => r.status === 'completed').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;
    const pendingCount = results.filter((r) => r.status === 'pending').length;
    const totalRows = results.reduce((sum, r) => sum + (r.rowCount || 0), 0);

    console.log(`Total Checked: ${results.length}`);
    console.log(`Completed: ${completedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log(`Still Pending: ${pendingCount}`);
    console.log(`Total Rows Processed: ${totalRows}`);

    results.forEach((result) => {
      let statusIcon = '⏳';
      if (result.status === 'completed') statusIcon = '✓';
      if (result.status === 'failed') statusIcon = '✗';

      const detail = result.status === 'completed'
        ? `${result.rowCount} rows`
        : result.status === 'failed'
        ? `Error: ${result.errorMessage}`
        : 'Still executing';

      console.log(`${statusIcon} ${result.queryName}: ${detail}`);
    });

    console.log('='.repeat(60));

    // Return response
    return res.status(200).json({
      success: true,
      executedAt: new Date().toISOString(),
      summary: {
        totalChecked: results.length,
        completed: completedCount,
        failed: failedCount,
        stillPending: pendingCount,
        totalRows,
      },
      results: results.map((r) => ({
        executionId: r.executionId,
        queryName: r.queryName,
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
