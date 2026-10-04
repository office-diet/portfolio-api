# 公開API設計・仕様書（Public API Specs）

開発した公開APIの技術仕様です。  
Postman 公開ドキュメントと連携し、エンドポイントの詳細を記載します。

---

# 1. 概要

Base URL: http://groupchat-alb-550437281.ap-northeast-1.elb.amazonaws.com/api/public  
認証方式: x-api-key  
レスポンス形式: JSON  
利用可能メソッド: GET

---

# 2. 認証

すべてのAPIは以下のヘッダーが必須です。

x-api-key: ＜your-api-key＞

---

# 3. Endpoints

## 3.1 GET /users

ユーザ一覧を取得します。
| Name | Type | Required | Description |
|------|------|----------|-------------|
| limit | number | no | 取得件数（デフォルト: 50） |
| offset | number | no | 開始位置（デフォルト: 0）※limit x offset |
| order | string | no | "asc" または "desc"（デフォルト: desc） |


```json
// Response Example:
[  
  {  
    "id": "0e5141ea-bed3-41bf-b82a-f89d870e3f4c",
    "userName": "さやか",
    "os": "iOS",
    "device": "mobile",
    "browser": "Safari",
    "lang": "ja",
    "timezone": "Asia/Tokyo",
    "enterAt": "2026/9/25 8:01:49",
    "exitAt": "2026/9/25 8:01:49"
  }
]
```
---

## 3.2 GET /users/:id

指定したユーザを取得します。

| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | uuid | yes | ユーザID |
```json
// Response Example:
[
    {
        "id": "0e5141ea-bed3-41bf-b82a-f89d870e3f4c",
        "userName": "さやか",
        "os": "iOS",
        "device": "mobile",
        "browser": "Safari",
        "lang": "ja",
        "timezone": "Asia/Tokyo",
        "enterAt": "2026/9/25 8:01:49",
        "exitAt": "2026/9/25 8:01:49"
    }
]
```
---

## 3.3 GET /messages

メッセージ一覧を取得します。
| Name | Type | Required | Description |
|------|------|----------|-------------|
| user_id | uuid | no | ユーザID |
| limit | number | no | 取得件数（デフォルト: 50） |
| offset | number | no | 開始位置（デフォルト: 0）※limit x offset |
| order | string | no | "asc" または "desc"（デフォルト: desc） |
```json
// Response Example:
[
    {
        "id": "0a76962a-5c08-4c31-9ab3-ca4b1cf45876",
        "userId": "88dbac5b-37f9-47e6-a917-fa2278b25c64",
        "userName": "臼ちゃん",
        "message": "お、匿名チャットかぁ。こういうのって最初はちょっとドキドキするよね。\n\n硬い挨拶とかはなしで、本当に気軽に入ってもらえたら嬉しいな。好きなことのつぶやきでも、ちょっとした雑談でも、なんでも大歓迎って感じで！\n\n「はじめましての人も、そうじゃない人も、自分のペースでのんびりしていってねー」みたいな、ゆる〜い空気が作れるといいよね。",
        "dflag": false,
        "createdAt": "2026/9/25 8:05:11"
    }
]
```
---

## 3.4 GET /messages/:id

指定したメッセージを取得します。
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | uuid | yes | メッセージID |

```json
// Response Example:
[
    {
        "id": "0a76962a-5c08-4c31-9ab3-ca4b1cf45876",
        "userId": "88dbac5b-37f9-47e6-a917-fa2278b25c64",
        "userName": "臼ちゃん",
        "message": "お、匿名チャットかぁ。こういうのって最初はちょっとドキドキするよね。\n\n硬い挨拶とかはなしで、本当に気軽に入ってもらえたら嬉しいな。好きなことのつぶやきでも、ちょっとした雑談でも、なんでも大歓迎って感じで！\n\n「はじめましての人も、そうじゃない人も、自分のペースでのんびりしていってねー」みたいな、ゆる〜い空気が作れるといいよね。",
        "dflag": false,
        "createdAt": "2026/9/25 8:05:11"
    }
]


```
---

# 4. Error Responses
| code | type | description |
|------|------|-------------|
| 400 | Bad Request | uuid、limit、offsetの不正エラー |
| 401 | Unauthorized | API Keyエラー|
| 404 | Not Found  | リソースエラー、該当データなし|
| 500 | Internal Server Error| サーバエラー|

---

# 5. その他ドキュメント

[👉Postman公開ドキュメント](https://documenter.getpostman.com/view/58691642/2sBYHNXP2Y)
[👉APIテスト用エクセルVBAツール](https://drive.google.com/uc?export=download&id=1VLBGY-C8RoiwJNEuWG2SEoAJd-7qmD4b)
