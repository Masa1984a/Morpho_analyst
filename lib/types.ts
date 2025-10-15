/**
 * TypeScript type definitions for Morpho Analyst system
 */

// ===== Dune API Types =====

export interface DuneExecutionResponse {
  execution_id: string;
  state: DuneExecutionState;
}

export type DuneExecutionState =
  | 'QUERY_STATE_PENDING'
  | 'QUERY_STATE_EXECUTING'
  | 'QUERY_STATE_COMPLETED'
  | 'QUERY_STATE_FAILED'
  | 'QUERY_STATE_CANCELLED';

export interface DuneStatusResponse {
  execution_id: string;
  query_id: number;
  state: DuneExecutionState;
  submitted_at?: string;
  execution_started_at?: string;
  execution_ended_at?: string;
  result_set_bytes?: number;
  result_set_row_count?: number;
}

export interface DuneResultResponse<T = any> {
  execution_id: string;
  query_id: number;
  is_execution_finished: boolean;
  state: DuneExecutionState;
  submitted_at: string;
  expires_at: string;
  execution_started_at: string;
  execution_ended_at: string;
  result: {
    rows: T[];
    metadata: {
      column_names: string[];
      column_types: string[];
      row_count: number;
      result_set_bytes: number;
      total_row_count: number;
      datapoint_count: number;
      pending_time_millis: number;
      execution_time_millis: number;
    };
  };
}

// ===== Query Configuration =====

export interface QueryConfig {
  queryId: number;
  queryName: string;
  tableName: string;
  upsertHandler: (rows: any[]) => Promise<number>;
}

// ===== Database Table Types =====

export interface MorphoCollateralHistory {
  day: Date;
  collateral_token: string;
  collateral_symbol: string;
  collateral_amount: number;
  collateral_amount_usd: number | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface MorphoBorrowHistory {
  day: Date;
  loan_token: string;
  loan_symbol: string;
  borrow_amount: number;
  borrow_amount_usd: number | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface DexVolumeHistory {
  date: Date;
  blockchain: string;
  chain_volume_wld: number;
  chain_volume_usd: number;
  chain_num_swaps: number;
  total_volume_wld: number;
  total_volume_usd: number;
  total_num_swaps: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface MorphoEarnHistory {
  day: Date;
  vault_address: string;
  vault_symbol: string;
  vault_asset: string;
  vault_asset_symbol: string;
  conversion_rate: number;
  delta_assets: number;
  delta_shares: number;
  total_shares: number;
  tvl_usd: number | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface DuneExecutionLog {
  id?: number;
  query_id: number;
  query_name: string;
  execution_id: string | null;
  execution_date: Date;
  status: ExecutionStatus;
  row_count: number | null;
  error_message: string | null;
  started_at: Date;
  completed_at: Date | null;
  created_at?: Date;
}

export type ExecutionStatus = 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';

// ===== Dune Result Row Types =====

export interface CollateralRow {
  day: string;
  collateral_token: string;
  collateral_symbol: string;
  collateral_amount: number;
  collateral_amount_usd: number | null;
}

export interface BorrowRow {
  day: string;
  loan_token: string;
  loan_symbol: string;
  borrow_amount: number;
  borrow_amount_usd: number | null;
}

export interface DexVolumeRow {
  date: string;
  blockchain: string;
  chain_volume_wld: number;
  chain_volume_usd: number;
  chain_num_swaps: number;
  total_volume_wld: number;
  total_volume_usd: number;
  total_num_swaps: number;
}

export interface EarnRow {
  day: string;
  vault_address: string;
  vault_symbol: string;
  vault_asset: string;
  vault_asset_symbol: string;
  conversion_rate: number;
  delta_assets: number;
  delta_shares: number;
  total_shares: number;
  tvl_usd: number | null;
}

// ===== Utility Types =====

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface FetchResult {
  queryId: number;
  queryName: string;
  executionId: string;
  status: 'success' | 'failed';
  rowCount: number;
  errorMessage?: string;
  startedAt: Date;
  completedAt: Date;
}
