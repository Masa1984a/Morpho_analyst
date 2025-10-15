# Dune Analytics Query Executor

Dune AnalyticsのAPIを使用してQuery ID: 5963250を実行し、結果をJSON形式で保存するPythonスクリプトです。
取得したデータは自動的にSQL INSERT文にも変換されます。

## 機能

- Dune Analyticsのクエリを実行（Query ID: 5963250）
- 実行結果をJSON形式で保存（`Result.json`）
- SQL INSERT文を自動生成（`insert_statements.sql`）
- 実行メタデータの記録（`execution_metadata.json`）

## 必要な環境

- Python 3.7以上
- Dune Analytics APIキー

## セットアップ

### 1. 依存ライブラリのインストール

```bash
pip install -r requirements.txt
```

### 2. 環境変数の設定

`.env.example`ファイルをコピーして`.env`ファイルを作成し、Dune APIキーを設定します。

**Windows (コマンドプロンプト):**
```cmd
copy .env.example .env
```

**Windows (PowerShell) / Mac / Linux:**
```bash
cp .env.example .env
```

作成した`.env`ファイルを編集して、実際のAPIキーを設定します：

```env
DUNE_API_KEY=your_actual_api_key_here
```

### 3. APIキーの取得方法

1. [Dune Analytics](https://dune.com/)にログイン
2. Settings → API に移動
3. 「Create new API key」をクリック
4. 生成されたAPIキーをコピー

## 使い方

### 基本的な実行

```bash
python dune_query_executor.py
```

### 実行の流れ

1. **クエリ実行**: Query ID 5963250のクエリをDune上で実行
2. **ステータス確認**: 実行完了まで自動的に待機（デフォルト: 最大5分）
3. **結果取得**: JSON形式でデータを取得
4. **ファイル出力**: 以下のファイルが生成されます

## 出力ファイル

| ファイル名 | 説明 |
|----------|-----|
| `Result.json` | Dune APIから取得した生のクエリ結果（JSON形式） |
| `insert_statements.sql` | Result.jsonから生成されたSQL INSERT文 |
| `execution_metadata.json` | 実行時のメタデータ（実行ID、時刻、行数など） |

### Result.jsonの構造

```json
{
  "execution_id": "...",
  "query_id": 5963250,
  "state": "QUERY_STATE_COMPLETED",
  "result": {
    "rows": [
      {
        "column1": "value1",
        "column2": "value2",
        ...
      }
    ],
    "metadata": {
      ...
    }
  }
}
```

### SQL INSERT文の例

```sql
-- SQL INSERT statements for table: price_data
-- Generated at: 2025-10-15T12:00:00
-- Total rows: 100

INSERT INTO price_data (`column1`, `column2`) VALUES ('value1', 'value2');
INSERT INTO price_data (`column1`, `column2`) VALUES ('value3', 'value4');
...
```

## エラーハンドリング

- **APIキー未設定**: `.env`ファイルにAPIキーが設定されていない場合、エラーメッセージが表示されます
- **タイムアウト**: デフォルトでは5分でタイムアウトします（環境変数で変更可能）
- **API制限**: Dune APIのレート制限に達した場合は、時間をおいて再実行してください

## トラブルシューティング

### Q: "DUNE_API_KEYが.envファイルに設定されていません"というエラーが出る

A: `.env`ファイルが正しく作成されているか、APIキーが設定されているか確認してください。

### Q: クエリ実行がタイムアウトする

A: 大きなデータセットの場合、処理に時間がかかることがあります。`.env`ファイルで`EXECUTION_TIMEOUT`を増やしてください：

```env
EXECUTION_TIMEOUT=600  # 10分に設定
```

### Q: "401 Unauthorized"エラーが出る

A: APIキーが正しいか確認してください。新しいAPIキーの生成が必要な場合があります。

## カスタマイズ

### 異なるQuery IDを実行する場合

`dune_query_executor.py`の`QUERY_ID`変数を変更します：

```python
QUERY_ID = 1234567  # 実行したいQuery ID
```

### SQLテーブル名を変更する場合

`generate_sql_insert_statements`関数の`table_name`引数を変更します：

```python
sql_statements = generate_sql_insert_statements(results, table_name="your_table_name")
```

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 参考資料

- [Dune API Documentation](https://docs.dune.com/api-reference/executions/execution-object)
- [Dune Analytics](https://dune.com/)

## サポート

問題が発生した場合は、以下を確認してください：

1. Pythonのバージョン（3.7以上）
2. 依存ライブラリが正しくインストールされているか
3. APIキーが有効であるか
4. ネットワーク接続が正常であるか