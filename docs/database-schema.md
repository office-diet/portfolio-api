# 🗄️ データベース設計書 (Database Schema)

本アプリケーション（Realtime Anonymous Chat App）で使用するPostgreSQLのデータベース設計およびテーブル定義について記載します。

---

## 1. 概要
* **DBMS:** PostgreSQL 15+
* **タイムゾーン:** `Asia/Tokyo` (JST)  
  ※PostgreSQLではtimestampはすべてUTCなのでTypeScript側で修正
* **拡張機能 (Extension):** `uuid-ossp` (UUID自動生成のため)

---

## 2. テーブル一覧

| テーブル名 | 概要 | 主キー (PK) |
| :--- | :--- | :--- |
| [`chat_logs`](#1-chat_logsテーブル) | チャットのメッセージ履歴および発言者を管理するテーブル | `id` (UUID) |
| [`visitors`](#2-visitorsテーブル) | アプリにアクセスした訪問者のセッション・デバイス情報を管理するテーブル | `id` (UUID) |

---

## 3. テーブル定義

### ① `chat_logs` テーブル
チャット上のメッセージ履歴、発言者の識別、および論理削除フラグ等を保持します。

| カラム名 | データ型 | NULL | 制限・デフォルト値 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `PRIMARY KEY`, デフォルト: `uuid_generate_v4()` | メッセージ固有の識別ID |
| `visitor_id` | `UUID` | NOT NULL | - | 発言した訪問者のID (`visitors.id` と紐付け) |
| `name` | `TEXT` | NOT NULL | - | 発言時の表示名（ゲスト名やAI名など） |
| `message` | `TEXT` | NOT NULL | - | 発言内容（本文） |
| `dflag` | `BOOLEAN` | NOT NULL | デフォルト: `FALSE` | 論理削除フラグ (`true`で削除済み) |
| `created_at` | `TIMESTAMP` | NOT NULL | デフォルト: `NOW()` (UTC) | メッセージ投稿日時 |

---

### ② `visitors` テーブル
アプリケーションにアクセスしたユーザーのクライアント環境（OS、デバイス、ブラウザなど）や訪問・退出時間を管理します。

| カラム名 | データ型 | NULL | 制限・デフォルト値 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NOT NULL | `PRIMARY KEY`, デフォルト: `uuid_generate_v4()` | 訪問者固有の識別ID |
| `name` | `TEXT` | NOT NULL | - | 訪問者のユーザー名 |
| `os` | `TEXT` | NOT NULL | - | クライアントのOS情報 |
| `device` | `TEXT` | N/T | - | デバイス種別 (PC / mobile など) |
| `browser` | `TEXT` | NOT NULL | - | 使用ブラウザ情報 |
| `lang` | `TEXT` | NOT NULL | - | 言語設定 |
| `timezone` | `TEXT` | NOT NULL | - | タイムゾーン |
| `enter_at` | `TIMESTAMP` | NOT NULL | デフォルト: `NOW()` (UTC) | アクセス（入室）日時 |
| `exit_at` | `TIMESTAMP` | NOT NULL | デフォルト: `NOW()` (UTC) | 退出日時 |

---

## 4. 初期データ (Seed Data)
アプリケーション起動時・デプロイ時に、常時チャットに入室しているAI2名の情報を入力し、IDの発行を実施します。

```sql
INSERT INTO visitors (name, os, device, browser, lang, timezone)
VALUES 
  ('臼ちゃん', 'Windows', 'PC', 'Chrome', 'ja', 'Asia/Tokyo'),
  ('さやか', 'iOS', 'mobile', 'Safari', 'ja', 'Asia/Tokyo');