/**
 * PostgreSQL Database Client
 * Provides connection pooling and query execution for Vercel Postgres
 */

import { Pool, QueryResult, QueryResultRow } from 'pg';
import type {
  MorphoCollateralHistory,
  MorphoBorrowHistory,
  DexVolumeHistory,
  MorphoEarnHistory,
  DuneExecutionLog,
  CollateralRow,
  BorrowRow,
  DexVolumeRow,
  EarnRow,
} from './types';

// Global connection pool for serverless environments
let pool: Pool | null = null;

/**
 * Get or create PostgreSQL connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 5, // Maximum number of connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return pool;
}

/**
 * Execute a SQL query
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const client = getPool();
  try {
    return await client.query<T>(text, params);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Close the database connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// ===== UPSERT Functions =====

/**
 * Upsert morpho collateral history data
 */
export async function upsertCollateralHistory(
  rows: CollateralRow[]
): Promise<number> {
  if (rows.length === 0) return 0;

  const values: any[] = [];
  const valuePlaceholders: string[] = [];

  rows.forEach((row, index) => {
    const offset = index * 5;
    valuePlaceholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`
    );
    values.push(
      new Date(row.day),
      row.collateral_token,
      row.collateral_symbol,
      row.collateral_amount,
      row.collateral_amount_usd
    );
  });

  const sql = `
    INSERT INTO morpho_collateral_history
      (day, collateral_token, collateral_symbol, collateral_amount, collateral_amount_usd)
    VALUES ${valuePlaceholders.join(', ')}
    ON CONFLICT (day, collateral_token)
    DO UPDATE SET
      collateral_symbol = EXCLUDED.collateral_symbol,
      collateral_amount = EXCLUDED.collateral_amount,
      collateral_amount_usd = EXCLUDED.collateral_amount_usd,
      updated_at = CURRENT_TIMESTAMP
  `;

  const result = await query(sql, values);
  return result.rowCount || 0;
}

/**
 * Upsert morpho borrow history data
 */
export async function upsertBorrowHistory(rows: BorrowRow[]): Promise<number> {
  if (rows.length === 0) return 0;

  const values: any[] = [];
  const valuePlaceholders: string[] = [];

  rows.forEach((row, index) => {
    const offset = index * 5;
    valuePlaceholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`
    );
    values.push(
      new Date(row.day),
      row.loan_token,
      row.loan_symbol,
      row.borrow_amount,
      row.borrow_amount_usd
    );
  });

  const sql = `
    INSERT INTO morpho_borrow_history
      (day, loan_token, loan_symbol, borrow_amount, borrow_amount_usd)
    VALUES ${valuePlaceholders.join(', ')}
    ON CONFLICT (day, loan_token)
    DO UPDATE SET
      loan_symbol = EXCLUDED.loan_symbol,
      borrow_amount = EXCLUDED.borrow_amount,
      borrow_amount_usd = EXCLUDED.borrow_amount_usd,
      updated_at = CURRENT_TIMESTAMP
  `;

  const result = await query(sql, values);
  return result.rowCount || 0;
}

/**
 * Upsert DEX volume history data
 */
export async function upsertDexVolumeHistory(
  rows: DexVolumeRow[]
): Promise<number> {
  if (rows.length === 0) return 0;

  const values: any[] = [];
  const valuePlaceholders: string[] = [];

  rows.forEach((row, index) => {
    const offset = index * 8;
    valuePlaceholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
    );
    values.push(
      new Date(row.date),
      row.blockchain,
      row.chain_volume_wld,
      row.chain_volume_usd,
      row.chain_num_swaps,
      row.total_volume_wld,
      row.total_volume_usd,
      row.total_num_swaps
    );
  });

  const sql = `
    INSERT INTO dex_volume_history
      (date, blockchain, chain_volume_wld, chain_volume_usd, chain_num_swaps,
       total_volume_wld, total_volume_usd, total_num_swaps)
    VALUES ${valuePlaceholders.join(', ')}
    ON CONFLICT (date, blockchain)
    DO UPDATE SET
      chain_volume_wld = EXCLUDED.chain_volume_wld,
      chain_volume_usd = EXCLUDED.chain_volume_usd,
      chain_num_swaps = EXCLUDED.chain_num_swaps,
      total_volume_wld = EXCLUDED.total_volume_wld,
      total_volume_usd = EXCLUDED.total_volume_usd,
      total_num_swaps = EXCLUDED.total_num_swaps,
      updated_at = CURRENT_TIMESTAMP
  `;

  const result = await query(sql, values);
  return result.rowCount || 0;
}

/**
 * Upsert morpho earn history data
 */
export async function upsertEarnHistory(rows: EarnRow[]): Promise<number> {
  if (rows.length === 0) return 0;

  const values: any[] = [];
  const valuePlaceholders: string[] = [];

  rows.forEach((row, index) => {
    const offset = index * 10;
    valuePlaceholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
    );
    values.push(
      new Date(row.day),
      row.vault_address,
      row.vault_symbol,
      row.vault_asset,
      row.vault_asset_symbol,
      row.conversion_rate,
      row.delta_assets,
      row.delta_shares,
      row.total_shares,
      row.tvl_usd
    );
  });

  const sql = `
    INSERT INTO morpho_earn_history
      (day, vault_address, vault_symbol, vault_asset, vault_asset_symbol,
       conversion_rate, delta_assets, delta_shares, total_shares, tvl_usd)
    VALUES ${valuePlaceholders.join(', ')}
    ON CONFLICT (day, vault_address)
    DO UPDATE SET
      vault_symbol = EXCLUDED.vault_symbol,
      vault_asset = EXCLUDED.vault_asset,
      vault_asset_symbol = EXCLUDED.vault_asset_symbol,
      conversion_rate = EXCLUDED.conversion_rate,
      delta_assets = EXCLUDED.delta_assets,
      delta_shares = EXCLUDED.delta_shares,
      total_shares = EXCLUDED.total_shares,
      tvl_usd = EXCLUDED.tvl_usd,
      updated_at = CURRENT_TIMESTAMP
  `;

  const result = await query(sql, values);
  return result.rowCount || 0;
}

/**
 * Insert execution log entry
 */
export async function insertExecutionLog(
  log: Omit<DuneExecutionLog, 'id' | 'created_at'>
): Promise<number> {
  const sql = `
    INSERT INTO dune_execution_log
      (query_id, query_name, execution_id, execution_date, status,
       row_count, error_message, started_at, completed_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `;

  const values = [
    log.query_id,
    log.query_name,
    log.execution_id,
    log.execution_date,
    log.status,
    log.row_count,
    log.error_message,
    log.started_at,
    log.completed_at,
  ];

  const result = await query<{ id: number }>(sql, values);
  return result.rows[0]?.id || 0;
}

/**
 * Update execution log status
 */
export async function updateExecutionLogStatus(
  executionId: string,
  status: 'EXECUTING' | 'COMPLETED' | 'FAILED',
  rowCount?: number,
  errorMessage?: string
): Promise<void> {
  const sql = `
    UPDATE dune_execution_log
    SET status = $1,
        row_count = $2,
        error_message = $3,
        completed_at = CURRENT_TIMESTAMP
    WHERE execution_id = $4
  `;

  await query(sql, [status, rowCount || null, errorMessage || null, executionId]);
}
