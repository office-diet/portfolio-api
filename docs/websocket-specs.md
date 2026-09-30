# 🔌 WebSocket 通信仕様書 (WebSocket Specs)

本アプリケーション（Realtime Anonymous Chat App）における、クライアント（React）とサーバー（Node.js）間のリアルタイム双方向通信（WebSocket）のメッセージング仕様および型定義について記載します。

---

## 1. 概要
* **プロトコル:** WebSocket (`ws`)
* **設計方針:** メッセージのペイロード内に `type` プロパティを持たせることで、受信側のサーバーおよびクライアントで柔軟な条件分岐（ルーティング）を実現しています。
* **データマッピング:** データベース（PostgreSQL）から取得した ``created_at`` などのスネークケースのカラム構造（`ChatLogFromSQL`）を、``createdAt`` のようにTypeScript側で扱いやすいキャメルケース（`ChatLogForTS`）へ変換してやり取りしています。

---

## 2. メッセージ型定義 (TypeScript Types)

アプリケーション内で使用されている主な通信・データ型は以下の通りです。

### ① クライアント → サーバー 送信データ
* **入室時 (`JoinInfo`)**  
    ユーザーがチャットルームに入室する際に送信するクライアント環境情報。
    ```ts
    type JoinInfo = {
        type: string;         // data.type === "join"
        visitorName: string;  // ゲスト名（将来用）
        browser: string;
        os: string;
        device: string;
        lang: string;
        timezone: string;
    };
    ```
* **新規チャット送信 (`NewChat`)**  
    ユーザーがチャットルームに入室する際に送信するクライアント環境情報。
    ```ts
    type NewChat = {
        type: string;         // data.type === "chat"
        visitorId: string;
        visitorName: string;
        message: string;
    };
    ```
### ② サーバー → 個別クライアント 返送データ
* **入室完了・初期データ返送 (`NewVisitorReturnData`)**  
    入室処理完了時に、サーバーから直近のチャット履歴等と一緒に返送するデータ。
    ```ts
    type NewVisitorReturnData = {
        type: string;               // data.type === "visitorId"
        visitorId: string;          // PostgreSQL保存時に発行
        visitorName: string;        // GuestName-n （n=訪問人数)
        chatLogs: ChatLogForTS[];   // 直近のチャット履歴一覧
    };
    ```
### ③ サーバー → 全クライアント ブロードキャストデータ
* **新規チャットブロードキャスト (`NewChatReturn`)**  
    投稿されたメッセージを、接続中の全クライアントに配信するデータ。
    ```ts
    type NewChatReturn = {
        type: string;         // data.type === "chat"
        visitorId: string;
        visitorName: string;
        messageId: string;
        message: string;
        createdAt: string;
    };
    ```
* **オンライン人数通知 (`OnlineCount`)**  
    入退室や接続状況の変動に伴い、現在のルーム内人数と合計訪問者数を通知するデータ。
    ```ts
    type OnlineCount = {
        type: string;         // data.type === "online"
        onlineCount: number;  // 現在の室内人数
        visitorCount: number; // 合計訪問者数
    };
    ```
### ④ その他・データ変換レイヤー（ DB ⇄ TypeScript ）
* **DBから直接取得する生データ（スネークケース） (`ChatLogsFromSQL`)**  
    ```ts
    type ChatLogFromSQL = {
        id: string;
        visitor_id: string; // TypeScriptと不一致
        name: string;       // TypeScriptと不一致
        message: string;    // TypeScriptと不一致
        created_at: Date;
    };
    ```
* **TypeScriptで扱うデータ（キャメルケース） (`ChatLogsForTS`)**  
    ```ts
    type ChatLogForTS = {
        id: string;
        visitorId: string;      // 変換
        visitorName: string;    // 変換
        message: string;    
        createdAt: string;      // 変換
    };
    ```
