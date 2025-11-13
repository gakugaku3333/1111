# 📱 iPhoneで使うための簡単セットアップガイド

## 🚀 5ステップで始められます！

### ステップ1: 必要なものを準備

- [ ] iPhoneとLINEアプリ
- [ ] Googleアカウント
- [ ] Google Gemini APIキー（[こちら](https://ai.google.dev/)から取得）

### ステップ2: プロジェクトをセットアップ

```bash
# 1. 依存関係をインストール
npm install

# 2. 環境変数を設定
cp .env.example .env
```

`.env`ファイルを編集して、以下を設定：
```
GEMINI_API_KEY=xxxxx
FAMILY_MEMBERS=父,母,長男,長女
```

### ステップ3: Google APIを設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成
3. **Google Calendar API** と **Google Tasks API** を有効化
4. **OAuth 2.0 クライアント ID** を作成（デスクトップアプリ）
5. `credentials.json` をダウンロードしてプロジェクトルートに配置
6. 認証を実行：
   ```bash
   npm run dev -- --setup
   ```

### ステップ4: LINE Botを作成

1. [LINE Developers](https://developers.line.biz/) にアクセス
2. **プロバイダー** を作成
3. **Messaging API チャンネル** を作成
4. 以下を`.env`に追加：
   ```
   LINE_CHANNEL_SECRET=xxxxx（Basic settingsから取得）
   LINE_CHANNEL_ACCESS_TOKEN=xxxxx（Messaging APIから取得）
   ```

### ステップ5: iPhoneで使い始める

#### 開発環境の場合

```bash
# ターミナル1: ngrokでトンネルを作成
ngrok http 3000

# ターミナル2: LINEボットを起動
npm run bot
```

ngrokのHTTPS URL（例: `https://xxxx.ngrok.io`）をコピーして：
1. LINE Developers Console → Messaging API settings
2. **Webhook URL** に `https://xxxx.ngrok.io/webhook` を設定
3. **Webhookの利用** をONにする

#### iPhoneでLINEボットを友だち追加

LINE Developers ConsoleにあるQRコードをiPhoneのLINEでスキャン！

---

## 💬 使い方の例

LINEでメッセージを送るだけ！

```
母：歯医者 5/10 10:00〜11:00
→ 予定を自動で追加

長男：宿題を終わらせる 明日まで
→ タスクを自動で追加

今日の予定
→ 今日の予定を表示

メニュー
→ クイックメニューを表示
```

---

## 🎤 便利な使い方

### iPhoneの音声入力を使う
1. LINEのメッセージ入力欄でマイクアイコンをタップ
2. 「母：歯医者 5月10日 午前10時から11時」と話す
3. 送信ボタンをタップ

### 家族全員で共有
- 同じLINEボットを家族全員が友だち追加
- 誰でも予定・タスクを追加できる
- メンバー名（父、母など）で自動で振り分け

---

## ❓ トラブルシューティング

### ボットが反応しない
- [ ] Webhook URLが正しく設定されているか確認
- [ ] ngrokが起動しているか確認
- [ ] `npm run bot` が実行されているか確認

### 予定が追加されない
- [ ] Google Calendar APIの認証が完了しているか確認
- [ ] `credentials.json` と `token.json` が存在するか確認

### LINE Botの設定が分からない
- [ ] README.mdの詳細な手順を参照
- [ ] LINE Developers Consoleのドキュメントを確認

---

## 📚 さらに詳しく

詳細な情報は `README.md` をご覧ください。
