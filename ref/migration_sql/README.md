# 初期データ移行手順

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
\i 01_create_schema.sql
\i 02_insert_collateral.sql
\i 03_insert_borrow.sql
\i 04_insert_dex.sql
\i 05_insert_earn.sql
COMMIT;
```

## 注意事項

- 各INSERT文にはON CONFLICT句が含まれているため、重複実行しても安全です
- 大量データの場合、バッチサイズ（1000件）ごとに処理されます
- updated_atフィールドは自動的に更新されます
