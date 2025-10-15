/**
 * Application constants and configurations
 */

// Query configurations
export const QUERY_IDS = {
  COLLATERAL: 5963629,
  BORROW: 5963670,
  DEX_VOLUME: 5963703,
  EARN: 5963349,
} as const;

export const QUERY_NAMES = {
  [QUERY_IDS.COLLATERAL]: 'World Morpho Collateral History',
  [QUERY_IDS.BORROW]: 'World Morpho Borrow History',
  [QUERY_IDS.DEX_VOLUME]: 'World DEX Volume History',
  [QUERY_IDS.EARN]: 'World Morpho Earn History',
} as const;

export const TABLE_NAMES = {
  [QUERY_IDS.COLLATERAL]: 'morpho_collateral_history',
  [QUERY_IDS.BORROW]: 'morpho_borrow_history',
  [QUERY_IDS.DEX_VOLUME]: 'dex_volume_history',
  [QUERY_IDS.EARN]: 'morpho_earn_history',
  EXECUTION_LOG: 'dune_execution_log',
} as const;

// API configuration
export const DUNE_API_CONFIG = {
  BASE_URL: 'https://api.dune.com/api/v1',
  TIMEOUT_MS: 300000, // 5 minutes
  POLL_INTERVAL_MS: 5000, // 5 seconds
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 8000,
  BACKOFF_MULTIPLIER: 2,
} as const;

// Database configuration
export const DB_CONFIG = {
  MAX_CONNECTIONS: 5,
  IDLE_TIMEOUT_MS: 30000,
  CONNECTION_TIMEOUT_MS: 10000,
  BATCH_SIZE: 1000,
} as const;

// Rate limiting
export const RATE_LIMIT = {
  MAX_CONCURRENT_QUERIES: 2,
  REQUEST_DELAY_MS: 1000,
} as const;

// Execution states
export const EXECUTION_STATES = {
  PENDING: 'QUERY_STATE_PENDING',
  EXECUTING: 'QUERY_STATE_EXECUTING',
  COMPLETED: 'QUERY_STATE_COMPLETED',
  FAILED: 'QUERY_STATE_FAILED',
  CANCELLED: 'QUERY_STATE_CANCELLED',
} as const;

// Log statuses
export const LOG_STATUSES = {
  PENDING: 'PENDING',
  EXECUTING: 'EXECUTING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

// Cron schedule (UTC 01:00 = JST 10:00)
export const CRON_SCHEDULE = '0 1 * * *';

// Required environment variables
export const REQUIRED_ENV_VARS = {
  PRODUCTION: [
    'DUNE_API_KEY',
    'DATABASE_URL',
    'CRON_SECRET',
  ],
  DEVELOPMENT: [
    'DUNE_API_KEY',
    'DATABASE_URL',
  ],
  MIGRATION: [
    'DATABASE_URL',
  ],
} as const;
