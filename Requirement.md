# Dune Analytics データ自動取得システム要件定義書

## 1. システム概要

### 1.1 目的
World Morphoプロトコルおよび関連DEXのオンチェーンデータを、Dune Analyticsから自動的に取得し、PostgreSQLデータベースに格納するシステムを構築する。

### 1.2 システム構成
- **実行環境**: Vercel Functions (サーバーレス)
- **データベース**: PostgreSQL
- **データソース**: Dune Analytics API
- **スケジューリング**: Vercel Cron Jobs

### 1.3 対象データ
- Morpho Collateral History (Query ID: 5963629)
- Morpho Borrow History (Query ID: 5963670)
- DEX Volume History (Query ID: 5963703)
- Morpho Earn History (Query ID: 5963349)

## 2. 機能要件

### 2.1 データ取得機能

#### 2.1.1 初回データ移行
- Results フォルダ内の既存JSONデータを全てPostgreSQLへインポート
- 重複データの除外処理を実装（day + 各種識別子でユニーク制約）

#### 2.1.2 日次データ取得
- **実行時間**: 日本時間 午前10時（UTC 01:00）
- **取得対象**: 当日分のデータのみ（{{p_date}}パラメータに当日の日付を設定）
- **実行フロー**:
  1. Dune APIへクエリ実行リクエストを送信
  2. 実行完了まで待機（ポーリング間隔: 5秒、タイムアウト: 5分）
  3. 結果を取得
  4. データベースへUPSERT処理

#### 2.1.3 エラーハンドリング
- API実行失敗時は最大3回リトライ
- タイムアウト発生時はアラート通知
- 部分的な成功の場合、成功したデータのみ保存

### 2.2 データ処理機能

#### 2.2.1 データ変換
- Dune APIレスポンス（JSON）からPostgreSQLへの変換
- NULL値の適切な処理
- 数値精度の保持（NUMERIC型使用）

#### 2.2.2 重複排除
- UPSERT処理による既存データの更新
- プライマリキー/ユニークキーによる重複チェック

## 3. データモデル

### 3.1 テーブル定義

#### 3.1.1 morpho_collateral_history
```sql
CREATE TABLE morpho_collateral_history (
    day TIMESTAMP NOT NULL,
    collateral_token VARCHAR(42) NOT NULL,
    collateral_symbol VARCHAR(20) NOT NULL,
    collateral_amount NUMERIC(38, 18) NOT NULL,
    collateral_amount_usd NUMERIC(38, 18),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (day, collateral_token)
);

CREATE INDEX idx_morpho_collateral_day ON morpho_collateral_history(day DESC);
CREATE INDEX idx_morpho_collateral_token ON morpho_collateral_history(collateral_token);
```

#### 3.1.2 morpho_borrow_history
```sql
CREATE TABLE morpho_borrow_history (
    day TIMESTAMP NOT NULL,
    loan_token VARCHAR(42) NOT NULL,
    loan_symbol VARCHAR(20) NOT NULL,
    borrow_amount NUMERIC(38, 18) NOT NULL,
    borrow_amount_usd NUMERIC(38, 18),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (day, loan_token)
);

CREATE INDEX idx_morpho_borrow_day ON morpho_borrow_history(day DESC);
CREATE INDEX idx_morpho_borrow_token ON morpho_borrow_history(loan_token);
```

#### 3.1.3 dex_volume_history
```sql
CREATE TABLE dex_volume_history (
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

CREATE INDEX idx_dex_volume_date ON dex_volume_history(date DESC);
CREATE INDEX idx_dex_volume_blockchain ON dex_volume_history(blockchain);
```

#### 3.1.4 morpho_earn_history
```sql
CREATE TABLE morpho_earn_history (
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

CREATE INDEX idx_morpho_earn_day ON morpho_earn_history(day DESC);
CREATE INDEX idx_morpho_earn_vault ON morpho_earn_history(vault_address);
```

### 3.2 メタデータテーブル

#### 3.2.1 dune_execution_log
```sql
CREATE TABLE dune_execution_log (
    id SERIAL PRIMARY KEY,
    query_id INTEGER NOT NULL,
    query_name VARCHAR(100) NOT NULL,
    execution_id VARCHAR(50),
    execution_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'PENDING', 'EXECUTING', 'COMPLETED', 'FAILED'
    row_count INTEGER,
    error_message TEXT,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_execution_log_date ON dune_execution_log(execution_date DESC);
CREATE INDEX idx_execution_log_status ON dune_execution_log(status);
```

## 4. 初期データ移行仕様

### 4.1 移行処理フロー
1. **JSONファイル読込**: Results フォルダ内の4つのJSONファイルを読込
2. **データ変換**: JSON構造からSQLのINSERT文へ変換
3. **バッチ処理**: 1000件ずつのバッチでINSERT実行
4. **トランザクション管理**: テーブル単位でトランザクションを管理

### 4.2 移行SQLスクリプト生成仕様
```javascript
// 生成されるSQL例
INSERT INTO morpho_collateral_history
    (day, collateral_token, collateral_symbol, collateral_amount, collateral_amount_usd)
VALUES
    ('2025-10-15 00:00:00.000', '0x2cfc85d8e48f8eab294be644d9e25c3030863003', 'WLD', 3353921.674644785, 3198701.3061251207),
    -- ... 追加のデータ
ON CONFLICT (day, collateral_token)
DO UPDATE SET
    collateral_amount = EXCLUDED.collateral_amount,
    collateral_amount_usd = EXCLUDED.collateral_amount_usd,
    updated_at = CURRENT_TIMESTAMP;
```

### 4.3 移行スクリプト実行順序
1. morpho_collateral_history
2. morpho_borrow_history
3. dex_volume_history
4. morpho_earn_history
5. dune_execution_log（初期状態記録）

## 5. 日次処理仕様

### 5.1 スケジューリング設定
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/dune-fetch",
    "schedule": "0 1 * * *"  // UTC 01:00 (JST 10:00)
  }]
}
```

### 5.2 処理フロー
```mermaid
graph TD
    A[Cron Job起動<br/>JST 10:00] --> B[現在日付取得]
    B --> C{各Query ID<br/>ループ処理}
    C --> D[Dune APIへ<br/>クエリ実行要求]
    D --> E[実行完了待機<br/>最大5分]
    E --> F{実行成功?}
    F -->|Yes| G[結果取得]
    F -->|No| H[リトライ<br/>最大3回]
    H --> D
    G --> I[データベースへ<br/>UPSERT]
    I --> J[ログ記録]
    J --> K{全Query<br/>完了?}
    K -->|No| C
    K -->|Yes| L[完了通知]
```

### 5.3 日付パラメータ仕様
- **パラメータ名**: `{{p_date}}`
- **フォーマット**: `YYYY-MM-DD`
- **タイムゾーン**: UTC基準
- **生成方法**:
  ```javascript
  // 日本時間10時実行時、UTCでは前日扱いなので調整
  const jstDate = new Date();
  const utcDate = new Date(jstDate.getTime() - (9 * 60 * 60 * 1000));
  const p_date = utcDate.toISOString().split('T')[0];
  ```

### 5.4 UPSERT処理仕様
各テーブルのプライマリキーに基づく重複処理：
- 既存レコードがある場合: 数値フィールドを更新、updated_atを現在時刻に更新
- 新規レコードの場合: 通常のINSERT処理

## 6. API連携仕様

### 6.1 Dune API エンドポイント
- **Base URL**: `https://api.dune.com/api/v1`
- **Query実行**: `POST /query/{query_id}/execute`
- **ステータス確認**: `GET /execution/{execution_id}/status`
- **結果取得**: `GET /execution/{execution_id}/results`

### 6.2 認証方式
- **Header名**: `x-dune-api-key`
- **API Key管理**: Vercel環境変数 `DUNE_API_KEY`

### 6.3 レート制限対応
- 同時実行数: 最大2クエリ
- リクエスト間隔: 1秒以上
- 429エラー時: exponential backoff（1秒→2秒→4秒）

## 7. エラー処理仕様

### 7.1 エラー種別と対応
| エラー種別 | 対応処理 | アラート |
|-----------|---------|----------|
| API認証エラー | 処理中断、管理者通知 | 必須 |
| タイムアウト | 3回リトライ後、次回実行待ち | 必須 |
| データ不整合 | 該当レコードスキップ、ログ記録 | 任意 |
| DB接続エラー | 5回リトライ後、処理中断 | 必須 |

### 7.2 ログ出力
- **正常時**: INFO レベル（実行開始、完了、取得件数）
- **警告時**: WARN レベル（リトライ、部分失敗）
- **エラー時**: ERROR レベル（処理中断、API/DBエラー）

## 8. 非機能要件

### 8.1 パフォーマンス要件
- **日次処理完了時間**: 30分以内
- **同時接続数**: Dune API 最大2、PostgreSQL 最大5
- **タイムアウト設定**: API呼び出し 30秒、全体処理 30分

### 8.2 可用性要件
- **稼働率目標**: 99.5%（月間ダウンタイム 約3.6時間）
- **リトライ機能**: 自動リトライ3回
- **フェイルオーバー**: Vercel Functions の自動フェイルオーバー利用

### 8.3 セキュリティ要件
- **API Key保護**: 環境変数での管理、コード内ハードコード禁止
- **データベース接続**: SSL/TLS暗号化必須
- **ログ出力**: 機密情報（API Key、パスワード）の除外

### 8.4 監視要件
- **死活監視**: Vercel ダッシュボード
- **実行ログ**: Vercel Functions ログ
- **アラート通知**: 処理失敗時のメール/Slack通知

## 9. 環境構成

### 9.1 必須環境変数
```env
# Dune Analytics
DUNE_API_KEY=your_dune_api_key

# PostgreSQL
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_SSL=true

# Monitoring (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
ALERT_EMAIL=admin@example.com
```

### 9.2 依存パッケージ
```json
{
  "dependencies": {
    "pg": "^8.11.0",
    "node-fetch": "^3.3.0",
    "@vercel/postgres": "^0.5.0"
  }
}
```

## 10. 移行計画

### 10.1 フェーズ1: 環境構築（Day 1-2）
- Vercelプロジェクト作成
- PostgreSQLデータベース準備
- 環境変数設定

### 10.2 フェーズ2: 初期データ移行（Day 3-4）
- テーブル作成
- 既存データのインポート
- データ整合性確認

### 10.3 フェーズ3: 日次処理実装（Day 5-7）
- API連携実装
- Cron Job設定
- エラーハンドリング実装

### 10.4 フェーズ4: テスト・監視設定（Day 8-10）
- 統合テスト
- 負荷テスト
- 監視・アラート設定

## 11. 運用保守

### 11.1 日常運用
- 実行ログの確認（毎日）
- データ整合性チェック（週次）
- パフォーマンス分析（月次）

### 11.2 定期メンテナンス
- 古いログデータの削除（90日以前）
- インデックスの再構築（四半期）
- セキュリティパッチ適用（随時）

### 11.3 障害対応
- 優先度1（緊急）: データ取得完全停止
- 優先度2（高）: 部分的なデータ欠損
- 優先度3（中）: パフォーマンス劣化
- 優先度4（低）: UIの不具合

## 付録A: Query ID一覧

| Query ID | 名称 | テーブル | 更新頻度 |
|----------|------|----------|----------|
| 5963629 | World Morpho Collateral History | morpho_collateral_history | 日次 |
| 5963670 | World Morpho Borrow History | morpho_borrow_history | 日次 |
| 5963703 | World DEX Volume History | dex_volume_history | 日次 |
| 5963349 | World Morpho Earn History | morpho_earn_history | 日次 |

## 付録B: データ型マッピング

| Dune型 | PostgreSQL型 | 備考 |
|--------|-------------|------|
| number | NUMERIC(38,18) | 高精度を保持 |
| string | VARCHAR | 長さは用途別 |
| date/timestamp | TIMESTAMP | UTC基準 |
| null | NULL | NULLを許可 |

---

*Document Version: 1.0.0*
*Last Updated: 2025-10-15*