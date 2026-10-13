# 公開API設計・仕様書（Public API Specs）

開発した公開APIの技術仕様です。  
Postman 公開ドキュメントと連携し、エンドポイントの詳細を記載します。

---

# 1. 概要

Base URL: http://groupchat-alb-550437281.ap-northeast-1.elb.amazonaws.com/api/private  
認証方式: JWT  
レスポンス形式: JSON  
利用可能メソッド: POST, PATCH, DELETE

---

# 2. 認証

すべてのAPIはJWT認証を行っています。

---

# 3. Endpoints

## 3.1 POST /signin

アカウントを作成します。
この段階で「匿名ユーザのvisitorId」を送信することによって、  
サインイン成功後、サインイン前のチャットとアカウントを紐づけます。

```json
// Request Example:
{  
    name: "name",
    email: "test@test.com",
    password: "password",
    visitorId: "visitorId-old",
}
```

```json
// Response Example:
// サインイン成功
{ 
    message: "signin", 
    name: "name", 
    email: "email", 
    visitorId: "visitorId"
}
// サインイン失敗
{ message: "ユーザ名が既に使用されています。\n重複のないユーザ名を使用してください。" }
{ message: "メールアドレスが既に登録されています。\n重複のないメールアドレスを登録してください。" }
{ message: "ユーザー登録に失敗しました（サーバエラー）" }
```

---

## 3.2 POST /login

既存アカウントにログインします。
この段階で「匿名ユーザのvisitorId」を送信することによって、
ログイン成功後、ログイン前のチャットとアカウントを紐づけます。
```json
// Request Example:
{
    email: "test@test.com",
    password: "password",
    visitorId: "visitorId-old"
}
```

```json
// Response Example:
// ログイン成功
{
    message: "signin", 
    name: name, 
    email: email, 
    visitorId: userId
}
// ログイン失敗
{ message: "メールアドレスが登録されていません" }
{ message: "パスワードが不正です" }
{ message: "ユーザー登録に失敗しました（サーバエラー）" }
```
---

## 3.3 POST /logout

ログアウトはクッキーの削除＋フロントの再描画で実現しています。

```json
// Response Example:
// ログアウト成功
{ message: "logout" }
// ログアウト失敗
{ message: "ログインが必要です" }
```
---

## 3.4 PATCH /chats/:id

指定したメッセージを編集します。  
JWT認証を実施しアカウントを特定、本人のチャットメッセージのみ編集を許可します。  
※編集直後にWebSocketで全ユーザに配信されます。

```json
// Request Example:
{ message: "new message" }
```

```json
// Response Example:
// 編集成功
{ message: "ok" }
// 編集失敗
{ message: "編集できないメッセージです" }
```
## 3.5 DELETE /chats/:id

指定したメッセージを削除します。  
JWT認証を実施しアカウントを特定、本人のチャットメッセージのみ削除を許可します。  
※論理的策削除を実装しました。あえて、再編集・復活できる状態にしています。  
※編集直後にWebSocketで全ユーザに配信されます。

```json
// Request Example:
{ message: "new message" }
```

```json
// Response Example:
// 編集成功
{ message: "ok" }
// 編集失敗
{ message: "削除できないメッセージです" }
```
---

# 4. Error Responses
| code | type | description |
|------|------|-------------|
| 400 | Bad Request | uuid、limit、offsetの不正エラー |
| 401 | Unauthorized | 未ログインエラー |
| 404 | Not Found  | リソースエラー、該当データなし|
| 500 | Internal Server Error| サーバエラー|

---

# 5. その他ドキュメント

[👉Postman公開ドキュメント](https://documenter.getpostman.com/view/58691642/2sBYHNXP2Y)
[👉APIテスト用エクセルVBAツール](https://drive.google.com/uc?export=download&id=1VLBGY-C8RoiwJNEuWG2SEoAJd-7qmD4b)
