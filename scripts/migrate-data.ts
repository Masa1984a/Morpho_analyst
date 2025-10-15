/**
 * Initial Data Migration Script
 * Imports existing JSON data from ref/Results/ into PostgreSQL
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  upsertCollateralHistory,
  upsertBorrowHistory,
  upsertDexVolumeHistory,
  upsertEarnHistory,
  closePool,
} from '../lib/db';
import type {
  DuneResultResponse,
  CollateralRow,
  BorrowRow,
  DexVolumeRow,
  EarnRow,
} from '../lib/types';

interface MigrationConfig {
  fileName: string;
  dataType: 'collateral' | 'borrow' | 'dex' | 'earn';
  description: string;
}

const MIGRATIONS: MigrationConfig[] = [
  {
    fileName: 'Result_Collateral.json',
    dataType: 'collateral',
    description: 'Morpho Collateral History',
  },
  {
    fileName: 'Result_Borrow.json',
    dataType: 'borrow',
    description: 'Morpho Borrow History',
  },
  {
    fileName: 'Result_DEX.json',
    dataType: 'dex',
    description: 'DEX Volume History',
  },
  {
    fileName: 'Result_Earn.json',
    dataType: 'earn',
    description: 'Morpho Earn History',
  },
];

/**
 * Read JSON file and parse
 */
function readJsonFile<T>(filePath: string): DuneResultResponse<T> {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Process collateral data
 */
async function processCollateralData(
  data: DuneResultResponse<CollateralRow>
): Promise<number> {
  const rows = data.result.rows;
  console.log(`  Processing ${rows.length} collateral rows...`);

  // Process in batches of 1000
  const batchSize = 1000;
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const inserted = await upsertCollateralHistory(batch);
    totalInserted += inserted;
    console.log(`    Batch ${Math.floor(i / batchSize) + 1}: ${inserted} rows`);
  }

  return totalInserted;
}

/**
 * Process borrow data
 */
async function processBorrowData(
  data: DuneResultResponse<BorrowRow>
): Promise<number> {
  const rows = data.result.rows;
  console.log(`  Processing ${rows.length} borrow rows...`);

  const batchSize = 1000;
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const inserted = await upsertBorrowHistory(batch);
    totalInserted += inserted;
    console.log(`    Batch ${Math.floor(i / batchSize) + 1}: ${inserted} rows`);
  }

  return totalInserted;
}

/**
 * Process DEX volume data
 */
async function processDexData(
  data: DuneResultResponse<DexVolumeRow>
): Promise<number> {
  const rows = data.result.rows;
  console.log(`  Processing ${rows.length} DEX volume rows...`);

  const batchSize = 1000;
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const inserted = await upsertDexVolumeHistory(batch);
    totalInserted += inserted;
    console.log(`    Batch ${Math.floor(i / batchSize) + 1}: ${inserted} rows`);
  }

  return totalInserted;
}

/**
 * Process earn data
 */
async function processEarnData(
  data: DuneResultResponse<EarnRow>
): Promise<number> {
  const rows = data.result.rows;
  console.log(`  Processing ${rows.length} earn rows...`);

  const batchSize = 1000;
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const inserted = await upsertEarnHistory(batch);
    totalInserted += inserted;
    console.log(`    Batch ${Math.floor(i / batchSize) + 1}: ${inserted} rows`);
  }

  return totalInserted;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('='.repeat(60));
  console.log('Initial Data Migration - Morpho Analyst');
  console.log('='.repeat(60));

  const resultsDir = path.join(__dirname, '..', 'ref', 'Results');

  // Check if Results directory exists
  if (!fs.existsSync(resultsDir)) {
    console.error(`✗ Error: Results directory not found at ${resultsDir}`);
    process.exit(1);
  }

  console.log(`\nResults directory: ${resultsDir}\n`);

  let totalProcessed = 0;
  const startTime = Date.now();

  for (const migration of MIGRATIONS) {
    const filePath = path.join(resultsDir, migration.fileName);

    console.log(`\n📊 ${migration.description}`);
    console.log('-'.repeat(60));

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠ Warning: File not found - ${migration.fileName}`);
        continue;
      }

      // Read JSON file
      console.log(`  Reading ${migration.fileName}...`);
      let rowsProcessed = 0;

      switch (migration.dataType) {
        case 'collateral': {
          const data = readJsonFile<CollateralRow>(filePath);
          rowsProcessed = await processCollateralData(data);
          break;
        }
        case 'borrow': {
          const data = readJsonFile<BorrowRow>(filePath);
          rowsProcessed = await processBorrowData(data);
          break;
        }
        case 'dex': {
          const data = readJsonFile<DexVolumeRow>(filePath);
          rowsProcessed = await processDexData(data);
          break;
        }
        case 'earn': {
          const data = readJsonFile<EarnRow>(filePath);
          rowsProcessed = await processEarnData(data);
          break;
        }
      }

      console.log(`  ✓ Successfully processed ${rowsProcessed} rows`);
      totalProcessed += rowsProcessed;
    } catch (error) {
      console.error(`  ✗ Error processing ${migration.fileName}:`, error);
      throw error;
    }
  }

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('✓ Migration completed successfully');
  console.log(`  Total rows processed: ${totalProcessed}`);
  console.log(`  Elapsed time: ${elapsedTime}s`);
  console.log('='.repeat(60));
}

/**
 * Execute migration
 */
async function main() {
  try {
    await migrate();
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    await closePool();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { migrate };
