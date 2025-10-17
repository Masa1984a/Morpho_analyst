-- WLD Price History Table Creation Script
-- Generated at: 2025-10-18
-- Purpose: Store daily closing prices for WLD (Worldcoin)

-- Drop existing table (optional - comment out if not needed)
-- DROP TABLE IF EXISTS wld_price_history CASCADE;

-- Create wld_price_history table
CREATE TABLE IF NOT EXISTS wld_price_history (
    date DATE NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    close_price NUMERIC(38, 18) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (date)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_wld_price_date ON wld_price_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_wld_price_symbol ON wld_price_history(symbol);

-- Apply trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_wld_price_history_updated_at ON wld_price_history;
CREATE TRIGGER update_wld_price_history_updated_at
    BEFORE UPDATE ON wld_price_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE wld_price_history IS 'Daily closing prices for WLD (Worldcoin) from 2023-01-01 onwards';
COMMENT ON COLUMN wld_price_history.date IS 'Date in UTC timezone';
COMMENT ON COLUMN wld_price_history.symbol IS 'Token symbol (WLD)';
COMMENT ON COLUMN wld_price_history.close_price IS 'Closing price in USD';
