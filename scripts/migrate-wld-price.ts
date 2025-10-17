/**
 * WLD Price History Migration Script
 * Fetches and imports WLD daily price data from 2023-01-01 onwards via Dune API
 */

import { createDuneClient } from '../lib/dune-client';
import { upsertWLDPriceHistory, closePool } from '../lib/db';
import type { WLDPriceRow } from '../lib/types';

const WLD_QUERY_ID = 5982584;
const START_DATE = '2023-01-01';

/**
 * Main migration function
 */
async function migrateWLDPrice() {
  console.log('='.repeat(60));
  console.log('WLD Price History Migration');
  console.log('='.repeat(60));
  console.log(`Query ID: ${WLD_QUERY_ID}`);
  console.log(`Start Date: ${START_DATE} (UTC)`);
  console.log('');

  const startTime = Date.now();

  try {
    // Create Dune API client
    console.log('📡 Connecting to Dune Analytics API...');
    const client = createDuneClient();

    // Execute query with start date parameter
    console.log(`🔍 Executing query ${WLD_QUERY_ID}...`);
    const executionId = await client.executeQuery(WLD_QUERY_ID, {
      p_date: START_DATE,
    });
    console.log(`   Execution ID: ${executionId}`);

    // Wait for completion (max 5 minutes)
    console.log('⏳ Waiting for query execution to complete...');
    const success = await client.waitForExecution(executionId, 300000, 5000);

    if (!success) {
      console.error('✗ Query execution failed or timed out');
      process.exit(1);
    }

    // Get results
    console.log('📥 Retrieving results...');
    const results = await client.getExecutionResults<WLDPriceRow>(executionId);
    const rows = results.result.rows;

    console.log(`   Retrieved ${rows.length} rows`);

    if (rows.length === 0) {
      console.log('⚠ Warning: No data returned from query');
      console.log('   This may be expected if the previous day\'s closing price has not been finalized yet.');
      console.log('');
      console.log('✓ Migration completed (0 rows processed)');
      return 0;
    }

    // Display sample data
    if (rows.length > 0) {
      console.log('');
      console.log('Sample data (first 3 rows):');
      console.log('-'.repeat(60));
      rows.slice(0, 3).forEach((row) => {
        console.log(`  ${row.date} | ${row.symbol} | $${row.close_price}`);
      });
      console.log('-'.repeat(60));
      console.log('');
    }

    // Upsert to database in batches
    console.log('💾 Inserting data into database...');
    const batchSize = 1000;
    let totalInserted = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const inserted = await upsertWLDPriceHistory(batch);
      totalInserted += inserted;
      console.log(
        `   Batch ${Math.floor(i / batchSize) + 1}: ${inserted} rows upserted`
      );
    }

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('='.repeat(60));
    console.log('✓ Migration completed successfully');
    console.log(`  Total rows retrieved: ${rows.length}`);
    console.log(`  Total rows upserted: ${totalInserted}`);
    console.log(`  Elapsed time: ${elapsedTime}s`);
    console.log('='.repeat(60));

    return totalInserted;
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('✗ Migration failed');
    console.error('='.repeat(60));
    console.error('Error details:', error);
    throw error;
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    await migrateWLDPrice();
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Fatal error:', error);
    await closePool();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { migrateWLDPrice };
