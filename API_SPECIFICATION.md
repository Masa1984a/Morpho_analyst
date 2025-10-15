# Morpho Analyst API 仕様書

World Morphoプロトコルのオンチェーンデータ（担保、借入、DEX取引量、Earn）を取得するためのREST API

## 基本情報

| 項目 | 値 |
|------|-----|
| **Base URL** | `https://morpho-analyst-[your-deployment].vercel.app` |
| **プロトコル** | HTTPS |
| **データ形式** | JSON |
| **文字エンコーディング** | UTF-8 |
| **タイムゾーン** | UTC |

## 認証

全てのエンドポイントは Bearer Token 認証が必要です。

### リクエストヘッダー

```
Authorization: Bearer YOUR_API_SECRET
```

### 認証エラー

認証に失敗した場合、`401 Unauthorized` が返されます。

```json
{
  "error": "Unauthorized"
}
```

---

## エンドポイント一覧

### 1. Morpho担保履歴取得

Morphoプロトコルの担保（Collateral）履歴データを取得します。

#### エンドポイント

```
GET /api/data/collateral
```

#### クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `from` | String (YYYY-MM-DD) | ❌ | なし | 開始日（この日以降のデータを取得） |
| `to` | String (YYYY-MM-DD) | ❌ | なし | 終了日（この日以前のデータを取得） |
| `limit` | Number | ❌ | `100` | 取得件数（最小: 1、最大: 1000） |
| `offset` | Number | ❌ | `0` | スキップする件数（ページネーション用） |

#### リクエスト例

```bash
# 全データ取得（最新100件）
curl -X GET "https://morpho-analyst.vercel.app/api/data/collateral" \
  -H "Authorization: Bearer YOUR_API_SECRET"

# 期間指定
curl -X GET "https://morpho-analyst.vercel.app/api/data/collateral?from=2025-10-01&to=2025-10-15" \
  -H "Authorization: Bearer YOUR_API_SECRET"

# ページネーション
curl -X GET "https://morpho-analyst.vercel.app/api/data/collateral?limit=50&offset=100" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

#### レスポンス

**Status Code**: `200 OK`

```json
{
  "data": [
    {
      "day": "2025-10-15T00:00:00.000Z",
      "collateral_token": "0x2cfc85d8e48f8eab294be644d9e25c3030863003",
      "collateral_symbol": "WLD",
      "collateral_amount": "3353921.674644785000",
      "collateral_amount_usd": "3198701.306125120700",
      "created_at": "2025-10-15T12:00:00.000Z",
      "updated_at": "2025-10-15T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 628,
    "limit": 100,
    "offset": 0,
    "count": 100
  },
  "filters": {
    "from": null,
    "to": null
  }
}
```

#### レスポンスフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `data` | Array | 担保データの配列 |
| `data[].day` | String (ISO 8601) | 日付 |
| `data[].collateral_token` | String | 担保トークンアドレス（Ethereum） |
| `data[].collateral_symbol` | String | トークンシンボル（例: WLD, WBTC） |
| `data[].collateral_amount` | String (Decimal) | 担保数量 |
| `data[].collateral_amount_usd` | String (Decimal) | 担保のUSD換算額（null の場合あり） |
| `data[].created_at` | String (ISO 8601) | レコード作成日時 |
| `data[].updated_at` | String (ISO 8601) | レコード更新日時 |
| `meta` | Object | メタデータ |
| `meta.total` | Number | 条件に一致する全レコード数 |
| `meta.limit` | Number | 取得件数上限 |
| `meta.offset` | Number | スキップした件数 |
| `meta.count` | Number | 実際に返されたレコード数 |
| `filters` | Object | 適用されたフィルタ |

---

### 2. Morpho借入履歴取得

Morphoプロトコルの借入（Borrow）履歴データを取得します。

#### エンドポイント

```
GET /api/data/borrow
```

#### クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `from` | String (YYYY-MM-DD) | ❌ | なし | 開始日 |
| `to` | String (YYYY-MM-DD) | ❌ | なし | 終了日 |
| `limit` | Number | ❌ | `100` | 取得件数（最小: 1、最大: 1000） |
| `offset` | Number | ❌ | `0` | スキップする件数 |

#### リクエスト例

```bash
# 最新30日間のデータ
curl -X GET "https://morpho-analyst.vercel.app/api/data/borrow?from=2025-09-15&to=2025-10-15" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

#### レスポンス

**Status Code**: `200 OK`

```json
{
  "data": [
    {
      "day": "2025-10-15T00:00:00.000Z",
      "loan_token": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "loan_symbol": "USDC",
      "borrow_amount": "5000000.000000000000",
      "borrow_amount_usd": "5000000.000000000000",
      "created_at": "2025-10-15T12:00:00.000Z",
      "updated_at": "2025-10-15T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 414,
    "limit": 100,
    "offset": 0,
    "count": 100
  },
  "filters": {
    "from": "2025-09-15",
    "to": "2025-10-15"
  }
}
```

#### レスポンスフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `data[].day` | String (ISO 8601) | 日付 |
| `data[].loan_token` | String | 借入トークンアドレス |
| `data[].loan_symbol` | String | トークンシンボル |
| `data[].borrow_amount` | String (Decimal) | 借入数量 |
| `data[].borrow_amount_usd` | String (Decimal) | 借入のUSD換算額（null の場合あり） |

---

### 3. DEX取引量履歴取得

WorldトークンのDEX取引量履歴データを取得します。

#### エンドポイント

```
GET /api/data/dex-volume
```

#### クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `from` | String (YYYY-MM-DD) | ❌ | なし | 開始日 |
| `to` | String (YYYY-MM-DD) | ❌ | なし | 終了日 |
| `limit` | Number | ❌ | `100` | 取得件数（最小: 1、最大: 1000） |
| `offset` | Number | ❌ | `0` | スキップする件数 |

#### リクエスト例

```bash
curl -X GET "https://morpho-analyst.vercel.app/api/data/dex-volume?from=2025-10-01" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

#### レスポンス

**Status Code**: `200 OK`

```json
{
  "data": [
    {
      "date": "2025-10-15T00:00:00.000Z",
      "blockchain": "ethereum",
      "chain_volume_wld": "1500000.000000000000",
      "chain_volume_usd": "1800000.000000000000",
      "chain_num_swaps": 1234,
      "total_volume_wld": "2500000.000000000000",
      "total_volume_usd": "3000000.000000000000",
      "total_num_swaps": 2345,
      "created_at": "2025-10-15T12:00:00.000Z",
      "updated_at": "2025-10-15T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 507,
    "limit": 100,
    "offset": 0,
    "count": 100
  },
  "filters": {
    "from": "2025-10-01",
    "to": null
  }
}
```

#### レスポンスフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `data[].date` | String (ISO 8601) | 日付 |
| `data[].blockchain` | String | ブロックチェーン名（例: ethereum, optimism） |
| `data[].chain_volume_wld` | String (Decimal) | そのチェーンでのWLD取引量 |
| `data[].chain_volume_usd` | String (Decimal) | そのチェーンでのUSD換算取引量 |
| `data[].chain_num_swaps` | Number | そのチェーンでのスワップ回数 |
| `data[].total_volume_wld` | String (Decimal) | 全チェーン合計のWLD取引量 |
| `data[].total_volume_usd` | String (Decimal) | 全チェーン合計のUSD換算取引量 |
| `data[].total_num_swaps` | Number | 全チェーン合計のスワップ回数 |

---

### 4. Morpho Earn履歴取得

Morpho Earnの履歴データ（Vault情報、TVL等）を取得します。

#### エンドポイント

```
GET /api/data/earn
```

#### クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `from` | String (YYYY-MM-DD) | ❌ | なし | 開始日 |
| `to` | String (YYYY-MM-DD) | ❌ | なし | 終了日 |
| `limit` | Number | ❌ | `100` | 取得件数（最小: 1、最大: 1000） |
| `offset` | Number | ❌ | `0` | スキップする件数 |

#### リクエスト例

```bash
curl -X GET "https://morpho-analyst.vercel.app/api/data/earn?limit=50" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

#### レスポンス

**Status Code**: `200 OK`

```json
{
  "data": [
    {
      "day": "2025-10-15T00:00:00.000Z",
      "vault_address": "0x1234567890abcdef1234567890abcdef12345678",
      "vault_symbol": "mWLD",
      "vault_asset": "0x2cfc85d8e48f8eab294be644d9e25c3030863003",
      "vault_asset_symbol": "WLD",
      "conversion_rate": "1.050000000000",
      "delta_assets": "100000.000000000000",
      "delta_shares": "95238.095238095238",
      "total_shares": "10000000.000000000000",
      "tvl_usd": "12000000.000000000000",
      "created_at": "2025-10-15T12:00:00.000Z",
      "updated_at": "2025-10-15T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 680,
    "limit": 100,
    "offset": 0,
    "count": 100
  },
  "filters": {
    "from": null,
    "to": null
  }
}
```

#### レスポンスフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `data[].day` | String (ISO 8601) | 日付 |
| `data[].vault_address` | String | Vaultコントラクトアドレス |
| `data[].vault_symbol` | String | Vaultシンボル（例: mWLD） |
| `data[].vault_asset` | String | 原資産トークンアドレス |
| `data[].vault_asset_symbol` | String | 原資産シンボル（例: WLD） |
| `data[].conversion_rate` | String (Decimal) | シェアと原資産の変換レート |
| `data[].delta_assets` | String (Decimal) | 原資産の増減 |
| `data[].delta_shares` | String (Decimal) | シェアの増減 |
| `data[].total_shares` | String (Decimal) | 総シェア数 |
| `data[].tvl_usd` | String (Decimal) | TVL（Total Value Locked）USD換算（null の場合あり） |

---

## 共通仕様

### ページネーション

全てのエンドポイントで `limit` と `offset` を使ったページネーションが可能です。

```bash
# 1ページ目（0-99）
GET /api/data/collateral?limit=100&offset=0

# 2ページ目（100-199）
GET /api/data/collateral?limit=100&offset=100

# 3ページ目（200-299）
GET /api/data/collateral?limit=100&offset=200
```

### 日付フィルタ

`from` と `to` パラメータで期間を指定できます。

```bash
# 特定日のデータ
GET /api/data/borrow?from=2025-10-15&to=2025-10-15

# 期間指定（1ヶ月）
GET /api/data/borrow?from=2025-09-15&to=2025-10-15

# 開始日のみ指定（それ以降のデータ）
GET /api/data/borrow?from=2025-10-01

# 終了日のみ指定（それ以前のデータ）
GET /api/data/borrow?to=2025-10-15
```

### エラーレスポンス

#### 認証エラー

**Status Code**: `401 Unauthorized`

```json
{
  "error": "Unauthorized"
}
```

#### メソッド不許可

**Status Code**: `405 Method Not Allowed`

```json
{
  "error": "Method not allowed"
}
```

#### サーバーエラー

**Status Code**: `500 Internal Server Error`

```json
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

---

## データ更新頻度

| データ | 更新頻度 | 説明 |
|--------|---------|------|
| 担保履歴 | 日次 | 日本時間 12:00（UTC 03:00） |
| 借入履歴 | 日次 | 日本時間 12:00（UTC 03:00） |
| DEX取引量 | 日次 | 日本時間 12:00（UTC 03:00） |
| Earn履歴 | 日次 | 日本時間 12:00（UTC 03:00） |

**注意**: Cron Jobが実行されるため、データは毎日自動的に更新されます。

---

## 使用例

### JavaScript (fetch API)

```javascript
const BASE_URL = 'https://morpho-analyst.vercel.app';
const API_SECRET = 'YOUR_API_SECRET';

const headers = {
  'Authorization': `Bearer ${API_SECRET}`
};

// 担保データ取得
async function getCollateralData(from, to) {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const url = `${BASE_URL}/api/data/collateral?${params}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// 使用例
getCollateralData('2025-10-01', '2025-10-15')
  .then(data => {
    console.log(`Total records: ${data.meta.total}`);
    console.log(`Returned: ${data.data.length} records`);
    data.data.forEach(item => {
      console.log(`${item.day}: ${item.collateral_symbol} - ${item.collateral_amount}`);
    });
  })
  .catch(error => console.error('Error:', error));
```

### Python (requests)

```python
import requests
from datetime import datetime, timedelta

BASE_URL = 'https://morpho-analyst.vercel.app'
API_SECRET = 'YOUR_API_SECRET'

headers = {
    'Authorization': f'Bearer {API_SECRET}'
}

def get_borrow_data(from_date=None, to_date=None, limit=100):
    """借入データ取得"""
    params = {'limit': limit}
    if from_date:
        params['from'] = from_date
    if to_date:
        params['to'] = to_date

    response = requests.get(
        f'{BASE_URL}/api/data/borrow',
        headers=headers,
        params=params
    )
    response.raise_for_status()
    return response.json()

# 使用例：過去30日間のデータ
today = datetime.now().date()
thirty_days_ago = today - timedelta(days=30)

data = get_borrow_data(
    from_date=thirty_days_ago.isoformat(),
    to_date=today.isoformat()
)

print(f"Total: {data['meta']['total']} records")
for item in data['data']:
    print(f"{item['day']}: {item['loan_symbol']} - {item['borrow_amount']}")
```

### TypeScript (Next.js)

```typescript
interface CollateralData {
  day: string;
  collateral_token: string;
  collateral_symbol: string;
  collateral_amount: string;
  collateral_amount_usd: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    count: number;
  };
  filters: {
    from: string | null;
    to: string | null;
  };
}

async function fetchCollateralData(
  from?: string,
  to?: string
): Promise<ApiResponse<CollateralData>> {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const response = await fetch(
    `${process.env.MORPHO_API_URL}/api/data/collateral?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.MORPHO_API_SECRET}`
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }

  return response.json();
}

// 使用例（Server Component）
export default async function DashboardPage() {
  const data = await fetchCollateralData('2025-10-01', '2025-10-15');

  return (
    <div>
      <h1>Collateral History</h1>
      <p>Total: {data.meta.total} records</p>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Token</th>
            <th>Amount</th>
            <th>USD Value</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((item) => (
            <tr key={`${item.day}-${item.collateral_token}`}>
              <td>{new Date(item.day).toLocaleDateString()}</td>
              <td>{item.collateral_symbol}</td>
              <td>{parseFloat(item.collateral_amount).toFixed(2)}</td>
              <td>${parseFloat(item.collateral_amount_usd || '0').toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### cURL

```bash
# 環境変数設定
export API_URL="https://morpho-analyst.vercel.app"
export API_SECRET="YOUR_API_SECRET"

# 担保データ（最新100件）
curl -X GET "$API_URL/api/data/collateral" \
  -H "Authorization: Bearer $API_SECRET"

# 借入データ（期間指定）
curl -X GET "$API_URL/api/data/borrow?from=2025-10-01&to=2025-10-15" \
  -H "Authorization: Bearer $API_SECRET"

# DEX取引量（ページネーション）
curl -X GET "$API_URL/api/data/dex-volume?limit=50&offset=100" \
  -H "Authorization: Bearer $API_SECRET"

# Earnデータ（JSON整形して表示）
curl -X GET "$API_URL/api/data/earn?from=2025-10-01" \
  -H "Authorization: Bearer $API_SECRET" | jq '.'
```

---

## セットアップ手順

### 1. 環境変数の設定

Vercel Dashboardで以下の環境変数を追加してください：

```env
API_SECRET=your_random_secret_here
```

ランダムなシークレットを生成：

```bash
# Linux/Mac
openssl rand -base64 32

# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 2. デプロイ

```bash
vercel --prod
```

### 3. 動作確認

```bash
curl -X GET "https://your-deployment.vercel.app/api/data/collateral?limit=10" \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

---

## セキュリティ

1. **API Secret保護**: `API_SECRET` は環境変数で管理し、コードにハードコードしない
2. **HTTPS必須**: 全ての通信はHTTPS経由
3. **認証必須**: 全エンドポイントでBearer Token認証を実施
4. **レート制限**: 現在未実装（将来的に追加予定）

---

## 制限事項

- **最大取得件数**: 1リクエストあたり1000件
- **タイムアウト**: 30秒
- **レート制限**: 現在なし（適切な使用を推奨）

---

## サポート

APIに関する質問や問題は、GitHubリポジトリでIssueを作成してください。

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-10-15 | 1.0.0 | 初版リリース - 4エンドポイント実装 |

---

**Base URL**: https://morpho-analyst-[your-deployment].vercel.app

**認証**: `Authorization: Bearer YOUR_API_SECRET`
