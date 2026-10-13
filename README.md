# 💬 Realtime Anonymous Chat App (chat-app)

> ユーザー登録やログインの手間を一切排除し、**アクセスした瞬間から誰でも即座に参加できる**完全匿名のリアルタイム・グループチャットアプリケーションです。
> バックエンドに常駐する生成AI（Gemini / Groq）とのシームレスな対話や、Docker・AWSを用いた堅牢なインフラ構築など、モダンなWebエンジニアリングの全体像を実装・検証しています。
> **Docker, Node.js, TypeScript, React, Vite初挑戦** の状態でアプリを完成させました！ 

---

## ✨ログイン認証・編集・削除機能追加（2026/10/12）
* **背景:** 実務を想定したログイン認証・CRUD処理を実装。
* **こだわり:** 任意のタイミングで発生するログイン・編集・削除処理をあえてREST APIで実装。公開REST API開発で学んだ知見をフル活用しながらJWTの学習も実現しました。
![update 002](./readme_images/update_002.jpg)

---

## ✨公開REST APIを追加開発（2026/10/04）
* **背景:** 実務を想定したREST APIの設計・開発に挑戦。
* **こだわり:** 実務を想定したエラーハンドリング、およびTypeScriptによる厳密な型定義を実施。  
今後の機能追加（認証・WS拡張）を見据えた構成。  
アプリを作るだけではなく、データを使う立場も想定しVBAツールを公開。  
![update 001](./readme_images/update_001.jpg)
[👉公開API 通信仕様書 (public api Specs)](./docs/public-api-specs.md)  
[👉Postman公開ドキュメント](https://documenter.getpostman.com/view/58691642/2sBYHNXP2Y)  
[👉APIテスト用エクセルVBAツール](https://drive.google.com/uc?export=download&id=1VLBGY-C8RoiwJNEuWG2SEoAJd-7qmD4b)  

---

## 🖼️️ アプリケーション画面
![App Screenshot](./readme_images/app-image.jpg)

---

## 🚀 開発背景・目的
* **背景:** 単なる静的なCRUDアプリではなく、双方向通信（WebSocket）や外部API連携、複数コンテナによるインフラ構築など、**「動きが多く、実運用を想定したモダンなWebアプリケーション」** の全体像を短期間で習得・実装するために開発しました。
* **こだわり:** ユーザーがアクセスした際に「常に誰か（またはAI）がいて会話が弾んでいる安心感」を演出しつつ、プロの現場を意識した堅牢なアーキテクチャで構築しています。
* **学習・開発期間:** 6年前にAWSやHerokuへRuby on Railsアプリをデプロイした経験はあるもののアプリは削除済みで、さらに技術も完全に失念してしまいました。面接時にアピールできるポートフォリオやアプリがないため、シルバーウィークに思い立ちAWS、docker、Node.js、TypeScript、React、Viteの学習を開始。学習・構築・完成まで約11日で完走しました！

---

## 🛠️ システムアーキテクチャ
本アプリケーションは、スケーラビリティと分離性を考慮し、フロントとエンドは完全に別開発を実施。Docker Composeを用いて独立したコンテナで開発しました。
![Architecture](./readme_images/architecture-image.jpg)

* **フロントエンド:** HTML, CSS, JavaScript（Nginxコンテナ上で静的配信）
* **バックエンド:** Node.js, TypeScript, WebSocket (WebSocket、REST API)
* **データベース:** PostgreSQL
* **インフラ・デプロイ:** AWS (EC2, ALB), Docker / Docker Compose
* **外部連携API:** Google Gemini API, Groq API
#### フロントエンド開発（別コンテナにて開発）
* **フロントエンド:** React, Vite, TypeScript, Chakra UI（別コンテナにて開発）  
[👉フロントエンド開発リポジトリはこちら](https://github.com/office-diet/portfolio-react-front)
---
## 📖 詳細な設計・仕様ドキュメント
本プロジェクトの内部設計や通信仕様の詳細については、以下のドキュメントをご参照ください。
* **[データベース設計書 (Database Schema)](./docs/database-schema.md)**
  * PostgreSQLを用いたテーブル設計（`chat_logs`, `visitors`, `users` ）、インデックス、初期データの構造を定義しています。
* **[WebSocket 通信仕様書 (WebSocket Specs)](./docs/websocket-specs.md)**
  * クライアント・サーバー間のリアルタイム通信におけるメッセージ型定義（TypeScript）やイベント設計をまとめています。
* **[Private / Public API 通信仕様書 (rest api Specs)](./docs/restapi-specs.md)**
  * 任意のタイミングで発生する「ログイン・編集・削除」に使用するAPI通信の設計をまとめています。
* **[簡易版ポートフォリオ・スライド (Google Drive)](https://drive.google.com/file/d/1QVz69x2bxvEy3y62eVaxzeCQg1Fvcegj/view?usp=sharing)**  
  * 本アプリの全体像を説明する資料。リンクからGoogle Drive上のPDFファイルをご覧いただけます。
---
## ✨ 主な機能・技術的ハイライト

1. **リアルタイム双方向通信（WebSocket）**
   * バックエンド（Node.js）とフロントエンド間でWebSocketを構築し、ラグのないメッセージ送受信を実現。
   * WebSocketの非同期性とReactの `useState` による「処理順序の矛盾」を防ぐための、すべての通信データをスタックし、スタックからステート制御を実施する工夫を実装。
   * ALBによる自動切断を回避するため、バックエンドより定期的なping送信を実施。
2. **ログイン認証・編集・削除機能の実装（REST API）**
   * リアルタイムなチャットとは違い、任意のタイミングで発生する処理はAPIで実装。
   * JWT認証機能でユーザのログイン状況を管理
   * ログインユーザは自身のチャットの編集・削除権限を付与。
3. **AI（Gemini / Groq）の常駐と自動応答**
   * バックエンド側にAI連携レイヤーを実装し、チャットの盛り上がりをサポートする自動返信や対話機能を統合。
4. **プロの現場を意識したインフラ・ビルド設計**
   * フロントエンドのビルド成果物（`dist`）のみをNginxコンテナにマウント・配信することで、イメージの軽量化とセキュリティ・役割分担を明確化。
   * AWS (ALB + EC2) を用いた安定したルーティングと可用性の確保。
5. **洗練されたUI/UX**
   * Chakra UIを採用し、モダンでニュートラルなダーク/ライト調のチャットインターフェースを実現。
   * `useRef` を活用したスマートな自動スクロール制御（過去ログ閲覧時の視点固定など）。
6. **定数を外部JSONファイrにすることによりReactの不満点を解消**
   * デプロイ時には通常のHTML・CSS・JSにコンパイルするため「定数の管理」が非常に面倒でした。その不便な点を解消するために各種定数を外部のJSONファイルに切り分け。デプロイ時にも簡単に定数を変更できる仕様にしました。

---

## ⚙️ ローカルでの起動方法 (Getting Started)

開発環境やローカルマシンで動作させるための手順です。

### 前提条件
 * Docker / Docker Compose がインストールされていること

### 手順
1. **リポジトリのクローン**  
   ```bash
   git clone https://github.com/office-diet/portfolio-api.git
   cd portfolio-api
   ```
2. **環境変数(.env)の設定**  
   ルートディレクトリに`.env`ファイルを作成し必要なAPIキーなどを記述してください。
    ```env
    # PostgreSQL
    POSTGRES_USER=sample
    POSTGRES_PASSWORD=sample
    POSTGRES_DB=sample

    # Backend DB connection
    DB_URL=sample

    # Backend GEMINI API KEY
    GEMINI_API_KEY=sample

    # Backend GEMINI API KEY
    GROQ_API_KEY=sample
    ```
3. **設定ファイルを編集**
   WebSocket、およびAPIの通信先を記入した public/config.json を環境に合わせて編集。各種定数を外部ファイルにすることにより、コンパイル後もデプロイ時も外部ファイルで接続先を切り替えることができます。
   ```json
   {
      "wsUrl": "ws://localhost:3000/ws",
      "signinUrl": "http://localhost:3000/api/private/signin",
      "loginUrl": "http://localhost:3000/api/private/login",
      "logoutUrl": "http://localhost:3000/api/private/logout",
      "chatUrl": "http://localhost:3000/api/private/chats"
   }
   ```


4. **Docekr Composeのビルドと起動**
     ルートディレクトリにて下記コマンドを実行。
    ```bash
    docker compose build
    docker compose up -d
    ```
    コード全体の修正を実施した際は下記コマンドがおすすめです。
    古いファイルやキャッシュの影響による意図しない挙動を防ぐことができます。
    ※DBも削除・再作成されるので注意！
    ```bash
    docker compose down -v
    docker compose build --no-cache
    docker compose up -d
    ```
    その他、バックエンドだけ修正した場合はこんな感じ
    ```bash
    docker compose build --no-cache backend
    docker compose up -d backend
    ```
5. **アクセス**
    ブラウザで `http://localhost:8080` にアクセス
6. **備忘録：URL末尾の扱いについて**
    開発環境とAWSではURLの挙動が違いました。次回は環境変数で対応する予定ですが、、、忘れるなよ！自分！
    ```
   // AWSは /ws　だと通信できません
   ws://[application_url].com/ws/
   const wss = new WebSocketServer({ server, path: "/ws/" });

   // Localは /ws/ だと通信できません
   ws://localhost:[port].com/ws
   const wss = new WebSocketServer({ server, path: "/ws" });
    ```

### 💡今後の展望・アップデート予定
 * AWSの ECS／ECR／RDS 構成に挑戦
 * ログイン機能追加（実装済：2026/10/12）
 * メッセージ編集・削除機能追加（実装済：2026/10/12）