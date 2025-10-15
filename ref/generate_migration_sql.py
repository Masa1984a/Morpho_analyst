"""
初期データ移行用のSQL生成スクリプト
Results フォルダ内のJSONファイルからPostgreSQL用のSQL INSERT文を生成
"""

import json
import os
from datetime import datetime
from typing import List, Dict, Any


class SQLGenerator:
    """SQL文生成クラス"""

    def __init__(self, results_dir: str = "Results"):
        self.results_dir = results_dir

    def escape_sql_string(self, value: Any) -> str:
        """SQL文字列のエスケープ処理"""
        if value is None:
            return "NULL"
        elif isinstance(value, (int, float)):
            return str(value)
        else:
            # 文字列のエスケープ（シングルクォートを二重に）
            escaped = str(value).replace("'", "''")
            return f"'{escaped}'"

    def generate_collateral_sql(self, json_file: str) -> str:
        """Collateral HistoryのSQL生成"""
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        sql_lines = [
            "-- Morpho Collateral History データ移行",
            f"-- Generated at: {datetime.now().isoformat()}",
            f"-- Source: {json_file}",
            ""
        ]

        if 'result' in data and 'rows' in data['result']:
            rows = data['result']['rows']
            sql_lines.append(f"-- Total rows: {len(rows)}")
            sql_lines.append("")

            # バッチごとにINSERT文を生成
            batch_size = 1000
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i+batch_size]

                sql_lines.append(f"-- Batch {i//batch_size + 1}")
                sql_lines.append("INSERT INTO morpho_collateral_history")
                sql_lines.append("    (day, collateral_token, collateral_symbol, collateral_amount, collateral_amount_usd)")
                sql_lines.append("VALUES")

                values_list = []
                for row in batch:
                    values = f"    ({self.escape_sql_string(row['day'])}, " \
                            f"{self.escape_sql_string(row['collateral_token'])}, " \
                            f"{self.escape_sql_string(row['collateral_symbol'])}, " \
                            f"{self.escape_sql_string(row['collateral_amount'])}, " \
                            f"{self.escape_sql_string(row.get('collateral_amount_usd'))})"
                    values_list.append(values)

                sql_lines.append(",\n".join(values_list))
                sql_lines.append("ON CONFLICT (day, collateral_token)")
                sql_lines.append("DO UPDATE SET")
                sql_lines.append("    collateral_amount = EXCLUDED.collateral_amount,")
                sql_lines.append("    collateral_amount_usd = EXCLUDED.collateral_amount_usd,")
                sql_lines.append("    updated_at = CURRENT_TIMESTAMP;")
                sql_lines.append("")

        return "\n".join(sql_lines)

    def generate_borrow_sql(self, json_file: str) -> str:
        """Borrow HistoryのSQL生成"""
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        sql_lines = [
            "-- Morpho Borrow History データ移行",
            f"-- Generated at: {datetime.now().isoformat()}",
            f"-- Source: {json_file}",
            ""
        ]

        if 'result' in data and 'rows' in data['result']:
            rows = data['result']['rows']
            sql_lines.append(f"-- Total rows: {len(rows)}")
            sql_lines.append("")

            batch_size = 1000
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i+batch_size]

                sql_lines.append(f"-- Batch {i//batch_size + 1}")
                sql_lines.append("INSERT INTO morpho_borrow_history")
                sql_lines.append("    (day, loan_token, loan_symbol, borrow_amount, borrow_amount_usd)")
                sql_lines.append("VALUES")

                values_list = []
                for row in batch:
                    values = f"    ({self.escape_sql_string(row['day'])}, " \
                            f"{self.escape_sql_string(row['loan_token'])}, " \
                            f"{self.escape_sql_string(row['loan_symbol'])}, " \
                            f"{self.escape_sql_string(row['borrow_amount'])}, " \
                            f"{self.escape_sql_string(row.get('borrow_amount_usd'))})"
                    values_list.append(values)

                sql_lines.append(",\n".join(values_list))
                sql_lines.append("ON CONFLICT (day, loan_token)")
                sql_lines.append("DO UPDATE SET")
                sql_lines.append("    borrow_amount = EXCLUDED.borrow_amount,")
                sql_lines.append("    borrow_amount_usd = EXCLUDED.borrow_amount_usd,")
                sql_lines.append("    updated_at = CURRENT_TIMESTAMP;")
                sql_lines.append("")

        return "\n".join(sql_lines)

    def generate_dex_sql(self, json_file: str) -> str:
        """DEX Volume HistoryのSQL生成"""
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        sql_lines = [
            "-- DEX Volume History データ移行",
            f"-- Generated at: {datetime.now().isoformat()}",
            f"-- Source: {json_file}",
            ""
        ]

        if 'result' in data and 'rows' in data['result']:
            rows = data['result']['rows']
            sql_lines.append(f"-- Total rows: {len(rows)}")
            sql_lines.append("")

            batch_size = 1000
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i+batch_size]

                sql_lines.append(f"-- Batch {i//batch_size + 1}")
                sql_lines.append("INSERT INTO dex_volume_history")
                sql_lines.append("    (date, blockchain, chain_volume_wld, chain_volume_usd, chain_num_swaps,")
                sql_lines.append("     total_volume_wld, total_volume_usd, total_num_swaps)")
                sql_lines.append("VALUES")

                values_list = []
                for row in batch:
                    values = f"    ({self.escape_sql_string(row['date'])}, " \
                            f"{self.escape_sql_string(row['blockchain'])}, " \
                            f"{self.escape_sql_string(row['chain_volume_wld'])}, " \
                            f"{self.escape_sql_string(row['chain_volume_usd'])}, " \
                            f"{self.escape_sql_string(row['chain_num_swaps'])}, " \
                            f"{self.escape_sql_string(row['total_volume_wld'])}, " \
                            f"{self.escape_sql_string(row['total_volume_usd'])}, " \
                            f"{self.escape_sql_string(row['total_num_swaps'])})"
                    values_list.append(values)

                sql_lines.append(",\n".join(values_list))
                sql_lines.append("ON CONFLICT (date, blockchain)")
                sql_lines.append("DO UPDATE SET")
                sql_lines.append("    chain_volume_wld = EXCLUDED.chain_volume_wld,")
                sql_lines.append("    chain_volume_usd = EXCLUDED.chain_volume_usd,")
                sql_lines.append("    chain_num_swaps = EXCLUDED.chain_num_swaps,")
                sql_lines.append("    total_volume_wld = EXCLUDED.total_volume_wld,")
                sql_lines.append("    total_volume_usd = EXCLUDED.total_volume_usd,")
                sql_lines.append("    total_num_swaps = EXCLUDED.total_num_swaps,")
                sql_lines.append("    updated_at = CURRENT_TIMESTAMP;")
                sql_lines.append("")

        return "\n".join(sql_lines)

    def generate_earn_sql(self, json_file: str) -> str:
        """Earn HistoryのSQL生成"""
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        sql_lines = [
            "-- Morpho Earn History データ移行",
            f"-- Generated at: {datetime.now().isoformat()}",
            f"-- Source: {json_file}",
            ""
        ]

        if 'result' in data and 'rows' in data['result']:
            rows = data['result']['rows']
            sql_lines.append(f"-- Total rows: {len(rows)}")
            sql_lines.append("")

            batch_size = 1000
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i+batch_size]

                sql_lines.append(f"-- Batch {i//batch_size + 1}")
                sql_lines.append("INSERT INTO morpho_earn_history")
                sql_lines.append("    (day, vault_address, vault_symbol, vault_asset, vault_asset_symbol,")
                sql_lines.append("     conversion_rate, delta_assets, delta_shares, total_shares, tvl_usd)")
                sql_lines.append("VALUES")

                values_list = []
                for row in batch:
                    values = f"    ({self.escape_sql_string(row['day'])}, " \
                            f"{self.escape_sql_string(row['vault_address'])}, " \
                            f"{self.escape_sql_string(row['vault_symbol'])}, " \
                            f"{self.escape_sql_string(row['vault_asset'])}, " \
                            f"{self.escape_sql_string(row['vault_asset_symbol'])}, " \
                            f"{self.escape_sql_string(row['conversion_rate'])}, " \
                            f"{self.escape_sql_string(row['delta_assets'])}, " \
                            f"{self.escape_sql_string(row['delta_shares'])}, " \
                            f"{self.escape_sql_string(row['total_shares'])}, " \
                            f"{self.escape_sql_string(row.get('tvl_usd'))})"
                    values_list.append(values)

                sql_lines.append(",\n".join(values_list))
                sql_lines.append("ON CONFLICT (day, vault_address)")
                sql_lines.append("DO UPDATE SET")
                sql_lines.append("    conversion_rate = EXCLUDED.conversion_rate,")
                sql_lines.append("    delta_assets = EXCLUDED.delta_assets,")
                sql_lines.append("    delta_shares = EXCLUDED.delta_shares,")
                sql_lines.append("    total_shares = EXCLUDED.total_shares,")
                sql_lines.append("    tvl_usd = EXCLUDED.tvl_usd,")
                sql_lines.append("    updated_at = CURRENT_TIMESTAMP;")
                sql_lines.append("")

        return "\n".join(sql_lines)

    def generate_schema_sql(self) -> str:
        """テーブル作成SQLを生成"""
        schema_sql = """-- PostgreSQL Schema Creation Script
-- Generated at: {timestamp}

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
""".format(timestamp=datetime.now().isoformat())

        return schema_sql

    def generate_all(self):
        """全てのSQLファイルを生成"""
        # 出力ディレクトリの作成
        output_dir = "migration_sql"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # スキーマ作成SQL
        schema_sql = self.generate_schema_sql()
        with open(os.path.join(output_dir, "01_create_schema.sql"), 'w', encoding='utf-8') as f:
            f.write(schema_sql)
        print(f"[OK] Generated: {output_dir}/01_create_schema.sql")

        # Collateral History
        collateral_sql = self.generate_collateral_sql(os.path.join(self.results_dir, "Result_Collateral.json"))
        with open(os.path.join(output_dir, "02_insert_collateral.sql"), 'w', encoding='utf-8') as f:
            f.write(collateral_sql)
        print(f"[OK] Generated: {output_dir}/02_insert_collateral.sql")

        # Borrow History
        borrow_sql = self.generate_borrow_sql(os.path.join(self.results_dir, "Result_Borrow.json"))
        with open(os.path.join(output_dir, "03_insert_borrow.sql"), 'w', encoding='utf-8') as f:
            f.write(borrow_sql)
        print(f"[OK] Generated: {output_dir}/03_insert_borrow.sql")

        # DEX Volume History
        dex_sql = self.generate_dex_sql(os.path.join(self.results_dir, "Result_DEX.json"))
        with open(os.path.join(output_dir, "04_insert_dex.sql"), 'w', encoding='utf-8') as f:
            f.write(dex_sql)
        print(f"[OK] Generated: {output_dir}/04_insert_dex.sql")

        # Earn History
        earn_sql = self.generate_earn_sql(os.path.join(self.results_dir, "Result_Earn.json"))
        with open(os.path.join(output_dir, "05_insert_earn.sql"), 'w', encoding='utf-8') as f:
            f.write(earn_sql)
        print(f"[OK] Generated: {output_dir}/05_insert_earn.sql")

        # 実行手順を記載したREADME
        readme_content = """# 初期データ移行手順

## 実行順序

1. **スキーマ作成**
   ```sql
   psql -U username -d database_name -f 01_create_schema.sql
   ```

2. **データインポート**
   ```sql
   psql -U username -d database_name -f 02_insert_collateral.sql
   psql -U username -d database_name -f 03_insert_borrow.sql
   psql -U username -d database_name -f 04_insert_dex.sql
   psql -U username -d database_name -f 05_insert_earn.sql
   ```

## 一括実行

全てのSQLファイルを順番に実行:
```bash
for file in *.sql; do
    echo "Executing $file..."
    psql -U username -d database_name -f "$file"
done
```

## トランザクション制御

安全のため、トランザクション内で実行することを推奨:
```sql
BEGIN;
\\i 01_create_schema.sql
\\i 02_insert_collateral.sql
\\i 03_insert_borrow.sql
\\i 04_insert_dex.sql
\\i 05_insert_earn.sql
COMMIT;
```

## 注意事項

- 各INSERT文にはON CONFLICT句が含まれているため、重複実行しても安全です
- 大量データの場合、バッチサイズ（1000件）ごとに処理されます
- updated_atフィールドは自動的に更新されます
"""
        with open(os.path.join(output_dir, "README.md"), 'w', encoding='utf-8') as f:
            f.write(readme_content)
        print(f"[OK] Generated: {output_dir}/README.md")

        print(f"\n[COMPLETE] 全てのSQLファイルが {output_dir} ディレクトリに生成されました")


if __name__ == "__main__":
    generator = SQLGenerator()
    generator.generate_all()