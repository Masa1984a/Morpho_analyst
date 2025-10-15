-- PostgreSQL Schema Creation Script
-- Generated at: 2025-10-15T18:28:54.286563

-- Drop existing tables (optional - comment out if not needed)
-- DROP TABLE IF EXISTS morpho_collateral_history CASCADE;
-- DROP TABLE IF EXISTS morpho_borrow_history CASCADE;
-- DROP TABLE IF EXISTS dex_volume_history CASCADE;
-- DROP TABLE IF EXISTS morpho_earn_history CASCADE;
-- DROP TABLE IF EXISTS dune_execution_log CASCADE;

-- Create morpho_collateral_history table
CREATE TABLE IF NOT EXISTS morpho_collateral_history (
    day TIMESTAMP NOT NULL,
    collateral_token VARCHAR(42) NOT NULL,
    collateral_symbol VARCHAR(20) NOT NULL,
    collateral_amount NUMERIC(38, 18) NOT NULL,
    collateral_amount_usd NUMERIC(38, 18),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (day, collateral_token)
);

CREATE INDEX IF NOT EXISTS idx_morpho_collateral_day ON morpho_collateral_history(day DESC);
CREATE INDEX IF NOT EXISTS idx_morpho_collateral_token ON morpho_collateral_history(collateral_token);

-- Create morpho_borrow_history table
CREATE TABLE IF NOT EXISTS morpho_borrow_history (
    day TIMESTAMP NOT NULL,
    loan_token VARCHAR(42) NOT NULL,
    loan_symbol VARCHAR(20) NOT NULL,
    borrow_amount NUMERIC(38, 18) NOT NULL,
    borrow_amount_usd NUMERIC(38, 18),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (day, loan_token)
);

CREATE INDEX IF NOT EXISTS idx_morpho_borrow_day ON morpho_borrow_history(day DESC);
CREATE INDEX IF NOT EXISTS idx_morpho_borrow_token ON morpho_borrow_history(loan_token);

-- Create dex_volume_history table
CREATE TABLE IF NOT EXISTS dex_volume_history (
    date TIMESTAMP NOT NULL,
    blockchain VARCHAR(20) NOT NULL,
    chain_volume_wld NUMERIC(38, 18) NOT NULL,
    chain_volume_usd NUMERIC(38, 18) NOT NULL,
    chain_num_swaps INTEGER NOT NULL,
    total_volume_wld NUMERIC(38, 18) NOT NULL,
    total_volume_usd NUMERIC(38, 18) NOT NULL,
    total_num_swaps INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (date, blockchain)
);

CREATE INDEX IF NOT EXISTS idx_dex_volume_date ON dex_volume_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_dex_volume_blockchain ON dex_volume_history(blockchain);

-- Create morpho_earn_history table
CREATE TABLE IF NOT EXISTS morpho_earn_history (
    day TIMESTAMP NOT NULL,
    vault_address VARCHAR(42) NOT NULL,
    vault_symbol VARCHAR(20) NOT NULL,
    vault_asset VARCHAR(42) NOT NULL,
    vault_asset_symbol VARCHAR(20) NOT NULL,
    conversion_rate NUMERIC(38, 18) NOT NULL,
    delta_assets NUMERIC(38, 18) NOT NULL,
    delta_shares NUMERIC(38, 18) NOT NULL,
    total_shares NUMERIC(38, 18) NOT NULL,
    tvl_usd NUMERIC(38, 18),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (day, vault_address)
);

CREATE INDEX IF NOT EXISTS idx_morpho_earn_day ON morpho_earn_history(day DESC);
CREATE INDEX IF NOT EXISTS idx_morpho_earn_vault ON morpho_earn_history(vault_address);

-- Create dune_execution_log table
CREATE TABLE IF NOT EXISTS dune_execution_log (
    id SERIAL PRIMARY KEY,
    query_id INTEGER NOT NULL,
    query_name VARCHAR(100) NOT NULL,
    execution_id VARCHAR(50),
    execution_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    row_count INTEGER,
    error_message TEXT,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_execution_log_date ON dune_execution_log(execution_date DESC);
CREATE INDEX IF NOT EXISTS idx_execution_log_status ON dune_execution_log(status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
DROP TRIGGER IF EXISTS update_morpho_collateral_history_updated_at ON morpho_collateral_history;
CREATE TRIGGER update_morpho_collateral_history_updated_at
    BEFORE UPDATE ON morpho_collateral_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_morpho_borrow_history_updated_at ON morpho_borrow_history;
CREATE TRIGGER update_morpho_borrow_history_updated_at
    BEFORE UPDATE ON morpho_borrow_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dex_volume_history_updated_at ON dex_volume_history;
CREATE TRIGGER update_dex_volume_history_updated_at
    BEFORE UPDATE ON dex_volume_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_morpho_earn_history_updated_at ON morpho_earn_history;
CREATE TRIGGER update_morpho_earn_history_updated_at
    BEFORE UPDATE ON morpho_earn_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
