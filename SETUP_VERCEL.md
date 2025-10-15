# Vercel セットアップガイド（推奨フロー）

Vercel Project + Vercel Postgres を使った最も簡単なセットアップ方法です。

## 前提条件

- Vercelアカウント（無料でOK、ただしCron JobsはHobbyプラン以上）
- Node.js 18.x以上
- Dune Analytics APIキー

## ステップ1: Vercel Projectを作成

### 方法A: Vercel Dashboard から作成（推奨）

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. "Add New..." → "Project" をクリック
3. "Import Git Repository" または "Continue with Other Git Provider"
4. リポジトリを選択（まだない場合は後でデプロイ）
5. Project名を入力（例：`morpho-analyst`）
6. Framework Preset: "Other"
7. **まだデプロイしない** - "Skip for now" または一旦キャンセル

### 方法B: Vercel CLI から作成

```bash
# Vercel CLI インストール
npm install -g vercel

# ログイン
vercel login

# プロジェクトをリンク
cd morpho_analyst
vercel link
```

プロンプトに従って：
- Set up and deploy? → **No** (後でデプロイ)
- Link to existing project? → **No**
- Project name: `morpho-analyst`
- In which directory? → `./`

## ステップ2: Vercel Postgres データベースを作成

### Vercel Dashboard で作成

1. プロジェクトページに移動
2. **"Storage"** タブをクリック
3. "Create Database" をクリック
4. **"Postgres"** を選択
5. データベース設定：
   - Database Name: `morpho-analyst-db`
   - Region: お好みのリージョン（例：Tokyo）
6. "Create" をクリック

### 自動設定される環境変数

Vercel Postgresを作成すると、以下の環境変数が**自動で追加**されます：
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

## ステップ3: 追加の環境変数を設定

Vercel Dashboardで：

1. プロジェクト → **"Settings"** → **"Environment Variables"**
2. 以下の変数を追加：

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `DATABASE_URL` | `POSTGRES_URL`の値をコピー | Production, Preview, Development |
| `DATABASE_SSL` | `true` | Production, Preview, Development |
| `DUNE_API_KEY` | Dune APIキー | Production, Preview, Development |
| `CRON_SECRET` | ランダム文字列（※下記参照） | Production |
| `MIGRATION_SECRET` | ランダム文字列（※下記参照） | Production |

**ランダム文字列の生成方法：**

```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# オンラインツール
# https://randomkeygen.com/
```

### または CLI から追加

```bash
# ローカルの.envから値を取得して追加
vercel env add DUNE_API_KEY production
vercel env add DATABASE_SSL production
vercel env add CRON_SECRET production
vercel env add MIGRATION_SECRET production
```

## ステップ4: データベーススキーマを作成

### 方法A: Vercel Dashboard から（GUI）

1. プロジェクト → Storage → データベースをクリック
2. **"Query"** タブを開く
3. `ref/migration_sql/01_create_schema.sql` の内容をコピー
4. クエリエディタに貼り付け
5. "Run Query" をクリック

### 方法B: ローカルから psql で実行

```bash
# 1. 環境変数をローカルにダウンロード
vercel env pull .env.local

# 2. DATABASE_URLを取得
# Linux/Mac
export DATABASE_URL=$(grep POSTGRES_URL= .env.local | head -1 | cut -d '=' -f2-)

# Windows (PowerShell)
$env:DATABASE_URL = (Get-Content .env.local | Select-String "POSTGRES_URL=" | Select-Object -First 1).Line.Split('=', 2)[1]

# 3. スキーマ作成
psql $DATABASE_URL -f ref/migration_sql/01_create_schema.sql
```

### 方法C: Node.js スクリプトで実行（psqlなしでOK）

```bash
# schema作成スクリプトを実行
node -e "
const fs = require('fs');
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await client.connect();
  const sql = fs.readFileSync('ref/migration_sql/01_create_schema.sql', 'utf8');
  await client.query(sql);
  console.log('✓ Schema created');
  await client.end();
})();
"
```

## ステップ5: ローカル環境のセットアップ

```bash
# 1. 依存関係インストール
npm install

# 2. 環境変数をダウンロード
vercel env pull .env.local

# 3. .env.localを.envにコピー（必要に応じて編集）
cp .env.local .env
```

## ステップ6: 初期データ移行（ローカル実行）

```bash
# 既存のJSONデータをPostgreSQLにインポート
npm run migrate
```

出力例：
```
============================================================
Initial Data Migration - Morpho Analyst
============================================================

📊 Morpho Collateral History
------------------------------------------------------------
  Reading Result_Collateral.json...
  Processing XXX collateral rows...
  ✓ Successfully processed XXX rows

...

✓ Migration completed successfully
  Total rows processed: XXXX
```

## ステップ7: ローカルでテスト（オプション）

```bash
# Vercel Dev サーバー起動
npm run dev

# 別ターミナルでテスト
curl -X POST http://localhost:3000/api/cron/dune-fetch \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## ステップ8: Vercelにデプロイ

```bash
# プロダクションデプロイ
vercel --prod
```

デプロイ完了後、URLが表示されます（例：`https://morpho-analyst.vercel.app`）

## ステップ9: Cron Jobの確認

1. Vercel Dashboard → Your Project → **"Cron Jobs"** タブ
2. 以下が表示されているか確認：
   - Path: `/api/cron/dune-fetch`
   - Schedule: `0 1 * * *` (UTC 01:00 = JST 10:00)
   - Status: Enabled

**注意：** Cron Jobsは本番環境（Production）でのみ動作します。

## ステップ10: 動作確認

### 手動でCron Jobをテスト

```bash
curl -X POST https://your-app.vercel.app/api/cron/dune-fetch \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

期待されるレスポンス：
```json
{
  "success": true,
  "targetDate": "2025-10-15",
  "summary": {
    "totalQueries": 4,
    "successCount": 4,
    "failedCount": 0,
    "totalRows": XXX
  }
}
```

### データベースで確認

Vercel Dashboard → Storage → Query タブで：

```sql
-- 実行ログ確認
SELECT
  query_name,
  execution_date,
  status,
  row_count,
  started_at,
  completed_at
FROM dune_execution_log
ORDER BY started_at DESC
LIMIT 10;

-- データ確認
SELECT COUNT(*) as count, 'collateral' as table FROM morpho_collateral_history
UNION ALL
SELECT COUNT(*), 'borrow' FROM morpho_borrow_history
UNION ALL
SELECT COUNT(*), 'dex_volume' FROM dex_volume_history
UNION ALL
SELECT COUNT(*), 'earn' FROM morpho_earn_history;
```

## 完了！

システムが正常に動作しています。以下のタイミングで自動実行されます：
- **毎日 UTC 01:00（日本時間 10:00）**

## トラブルシューティング

### DATABASE_URLが見つからない

```bash
# 環境変数を再ダウンロード
vercel env pull .env.local --force

# 確認
cat .env.local | grep POSTGRES_URL
```

### Cron Jobが実行されない

1. Vercel Dashboard → Cron Jobs で Status を確認
2. Hobby プラン以上が必要（無料プランではCron Jobは使えません）
3. `CRON_SECRET` が正しく設定されているか確認

### データベース接続エラー

```bash
# SSL設定を確認
vercel env ls | grep DATABASE_SSL

# なければ追加
vercel env add DATABASE_SSL
# → Value: true
```

### ローカルでのテストが失敗

```bash
# .env ファイルが正しいか確認
cat .env

# 環境変数を再取得
vercel env pull .env.local
cp .env.local .env
```

## 次のステップ

- [README.md](README.md) で全機能を確認
- [DEPLOYMENT.md](DEPLOYMENT.md) で詳細なデプロイ手順を確認
- モニタリング・アラートの設定
- データ可視化ダッシュボードの構築

## 参考リンク

- [Vercel Postgres Documentation](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
