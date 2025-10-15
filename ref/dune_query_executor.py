"""
Dune Analytics Query Executor
Query ID: 5963250を実行し、結果をJSON形式で保存するPythonスクリプト
"""

import os
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional
import requests
from dotenv import load_dotenv


class DuneAPIClient:
    """Dune Analytics APIクライアント"""

    def __init__(self, api_key: str):
        """
        Dune APIクライアントを初期化

        Args:
            api_key: Dune API Key
        """
        self.api_key = api_key
        self.base_url = "https://api.dune.com/api/v1"
        self.headers = {"x-dune-api-key": api_key}

    def execute_query(self, query_id: int, params: Optional[Dict[str, Any]] = None) -> str:
        """
        クエリを実行して実行IDを取得

        Args:
            query_id: Duneクエリ ID
            params: クエリパラメータ（オプション）

        Returns:
            execution_id: 実行ID
        """
        url = f"{self.base_url}/query/{query_id}/execute"

        body = {}
        if params:
            body["query_parameters"] = params

        response = requests.post(url, headers=self.headers, json=body)
        response.raise_for_status()

        result = response.json()
        print(f"✓ クエリ実行開始: execution_id={result['execution_id']}")
        return result['execution_id']

    def check_execution_status(self, execution_id: str) -> Dict[str, Any]:
        """
        実行ステータスを確認

        Args:
            execution_id: 実行ID

        Returns:
            ステータス情報
        """
        url = f"{self.base_url}/execution/{execution_id}/status"

        response = requests.get(url, headers=self.headers)
        response.raise_for_status()

        return response.json()

    def get_execution_results(self, execution_id: str) -> Dict[str, Any]:
        """
        実行結果を取得（JSON形式）

        Args:
            execution_id: 実行ID

        Returns:
            クエリ実行結果
        """
        url = f"{self.base_url}/execution/{execution_id}/results"

        response = requests.get(url, headers=self.headers)
        response.raise_for_status()

        return response.json()

    def wait_for_execution(self, execution_id: str, timeout: int = 300, poll_interval: int = 5) -> bool:
        """
        クエリ実行が完了するまで待機

        Args:
            execution_id: 実行ID
            timeout: タイムアウト秒数（デフォルト: 300秒）
            poll_interval: ポーリング間隔（デフォルト: 5秒）

        Returns:
            成功した場合True、タイムアウトした場合False
        """
        start_time = time.time()

        while time.time() - start_time < timeout:
            status_response = self.check_execution_status(execution_id)
            state = status_response.get('state', 'UNKNOWN')

            print(f"  実行ステータス: {state}")

            if state == "QUERY_STATE_COMPLETED":
                print("✓ クエリ実行完了")
                return True
            elif state in ["QUERY_STATE_FAILED", "QUERY_STATE_CANCELLED"]:
                print(f"✗ クエリ実行失敗: {state}")
                return False

            time.sleep(poll_interval)

        print("✗ タイムアウト: クエリ実行が時間内に完了しませんでした")
        return False


def generate_sql_insert_statements(data: Dict[str, Any], table_name: str = "dune_results") -> str:
    """
    JSON結果からSQL INSERT文を生成

    Args:
        data: Duneクエリ結果
        table_name: テーブル名

    Returns:
        SQL INSERT文
    """
    if 'result' not in data or 'rows' not in data['result']:
        return "-- No data found"

    rows = data['result']['rows']
    if not rows:
        return "-- No rows found"

    # カラム名を取得
    columns = list(rows[0].keys())
    columns_str = ', '.join([f"`{col}`" for col in columns])

    sql_statements = []
    sql_statements.append(f"-- SQL INSERT statements for table: {table_name}")
    sql_statements.append(f"-- Generated at: {datetime.now().isoformat()}")
    sql_statements.append(f"-- Total rows: {len(rows)}")
    sql_statements.append("")

    for row in rows:
        values = []
        for col in columns:
            value = row.get(col)
            if value is None:
                values.append("NULL")
            elif isinstance(value, (int, float)):
                values.append(str(value))
            else:
                # 文字列の場合、エスケープ処理
                escaped_value = str(value).replace("'", "''")
                values.append(f"'{escaped_value}'")

        values_str = ', '.join(values)
        sql_statements.append(f"INSERT INTO {table_name} ({columns_str}) VALUES ({values_str});")

    return '\n'.join(sql_statements)


def main():
    """メイン処理"""
    print("=" * 60)
    print("Dune Analytics Query Executor")
    print("=" * 60)

    # .envファイルから環境変数を読み込み
    load_dotenv()

    # API Keyの取得
    api_key = os.getenv('DUNE_API_KEY')
    if not api_key:
        print("✗ エラー: DUNE_API_KEYが.envファイルに設定されていません")
        print("  .envファイルを作成し、DUNE_API_KEY=your_api_key_hereを追加してください")
        sys.exit(1)

    # Query IDの取得（Requirement.txtから）
    QUERY_ID = 5963629  # Requirement.txtに記載のQuery ID

    print(f"Query ID: {QUERY_ID}")
    print("=" * 60)

    try:
        # Duneクライアントの初期化
        client = DuneAPIClient(api_key)

        # クエリを実行
        print("\n1. クエリを実行中...")
        execution_id = client.execute_query(QUERY_ID)

        # 実行完了まで待機
        print("\n2. 実行完了を待機中...")
        success = client.wait_for_execution(execution_id)

        if not success:
            print("✗ クエリ実行に失敗しました")
            sys.exit(1)

        # 結果を取得
        print("\n3. 結果を取得中...")
        results = client.get_execution_results(execution_id)

        # Result.jsonに保存
        print("\n4. 結果をResult.jsonに保存中...")
        result_file = "Result.json"
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"✓ 結果を {result_file} に保存しました")

        # 結果のサマリを表示
        if 'result' in results and 'rows' in results['result']:
            row_count = len(results['result']['rows'])
            print(f"\n取得データ:")
            print(f"  - 行数: {row_count}")

            if row_count > 0:
                columns = list(results['result']['rows'][0].keys())
                print(f"  - カラム: {', '.join(columns)}")

                # 最初の数行を表示
                print(f"\n  最初の3行のプレビュー:")
                for i, row in enumerate(results['result']['rows'][:3], 1):
                    print(f"  {i}. {json.dumps(row, ensure_ascii=False)[:100]}...")

        # SQL INSERT文を生成
        print("\n5. SQL INSERT文を生成中...")
        sql_statements = generate_sql_insert_statements(results, table_name="price_data")

        sql_file = "insert_statements.sql"
        with open(sql_file, 'w', encoding='utf-8') as f:
            f.write(sql_statements)
        print(f"✓ SQL INSERT文を {sql_file} に保存しました")

        # メタデータ情報も保存
        metadata_file = "execution_metadata.json"
        metadata = {
            "query_id": QUERY_ID,
            "execution_id": execution_id,
            "execution_time": datetime.now().isoformat(),
            "row_count": len(results.get('result', {}).get('rows', [])),
            "columns": list(results['result']['rows'][0].keys()) if results.get('result', {}).get('rows') else []
        }
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        print(f"✓ メタデータを {metadata_file} に保存しました")

        print("\n" + "=" * 60)
        print("✓ 処理が正常に完了しました")
        print("=" * 60)

    except requests.exceptions.RequestException as e:
        print(f"\n✗ APIリクエストエラー: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ 予期しないエラー: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()