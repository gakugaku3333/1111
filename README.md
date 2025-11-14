# 🏠 家族AIアシスタントシステム

家族全員が自然言語で予定とタスクを一元管理できるAIアシスタントシステムです。

## 📱 iPhone/スマホで使う（LINE Bot）

**推奨**: LINEボットとして使えば、iPhoneから簡単に予定やタスクを管理できます！

### LINEボットの特徴
- 📱 iPhoneのLINEアプリから直接操作
- 🎤 音声入力も使える
- 🔔 通知機能
- 👨‍👩‍👧‍👦 家族全員で同じボットを共有
- 🎨 美しいカード形式で予定・タスクを表示

## ✨ 主な機能

### Phase 1: Calendar-agent（予定管理）
- ✅ Google Calendarへの予定追加
- ✅ 期間指定での予定一覧取得
- ✅ 予定の削除
- ✅ 自然言語での操作（「母：歯医者 5/10 10:00〜11:00 を登録して」）
- ✅ 家族メンバーごとの予定管理

### Phase 2: Tasks-agent（タスク管理）
- ✅ Google Tasksへのタスク追加
- ✅ 未完了タスクの一覧表示
- ✅ タスクの完了マーク
- ✅ 期日指定の柔軟な解釈
- ✅ 家族ごとのタスクリスト管理

### Phase 3: 統合agent（最終形態）
- ✅ 予定とタスクを１つのインターフェースで操作
- ✅ 「予定」「タスク」の意図を自動判別
- ✅ A/Bテストによる最適化

### Phase 4: 画像・PDF解析（NEW!）
- ✅ 画像・PDFから予定・タスクを自動抽出
- ✅ Gemini 2.5 Flash Visionによるマルチモーダル解析
- ✅ スケジュール表、手書きメモ、スクリーンショット、PDFに対応
- ✅ ユーザー確認後に自動追加

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`を`.env`にコピーして、必要な情報を設定してください。

```bash
cp .env.example .env
```

`.env`ファイルを編集：

```env
GEMINI_API_KEY=your_gemini_api_key_here
FAMILY_MEMBERS=父,母,長男,長女
TIMEZONE=Asia/Tokyo
```

### 3. Google API認証情報の取得

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. Google Calendar API と Google Tasks API を有効化
4. OAuth 2.0 クライアント ID を作成（デスクトップアプリケーション）
5. `credentials.json`としてダウンロードし、プロジェクトルートに配置

### 4. LINE Bot の設定（iPhone/スマホで使う場合）

#### 4-1. LINE Developers でチャンネルを作成

1. [LINE Developers](https://developers.line.biz/) にアクセス
2. プロバイダーを作成
3. 「Messaging API」チャンネルを作成
4. 以下の情報を`.env`に追加：
   - `LINE_CHANNEL_SECRET`（Basic settings から）
   - `LINE_CHANNEL_ACCESS_TOKEN`（Messaging API から）

#### 4-2. Webhook URLを設定

開発環境の場合、ngrokを使用：

```bash
# ngrokのインストール（初回のみ）
brew install ngrok  # macOSの場合

# ngrokでトンネルを作成
ngrok http 3000
```

ngrokが表示するHTTPS URLをコピーして、LINE Developers Consoleで設定：
- Webhook URL: `https://your-ngrok-url.ngrok.io/webhook`
- 「Webhookの利用」をONにする

#### 4-3. LINEボットを起動

```bash
npm run bot
```

#### 4-4. iPhoneでLINEボットを友だち追加

LINE Developers Consoleに表示されるQRコードをiPhoneのLINEでスキャン！

### 5. 初回認証（Google Calendar/Tasks）

```bash
npm run dev -- --setup
```

ブラウザで認証URLが表示されるので、Googleアカウントでログインして認証してください。
認証コードが発行されたら、それをコピーしてターミナルに貼り付けます。

## 📖 使い方

### 📱 LINEボット（iPhone推奨）

LINEで友だち追加したら、普通にメッセージを送るだけ！

#### 使用例

**予定を追加:**
```
母：歯医者 5/10 10:00〜11:00
```

**タスクを追加:**
```
長男：宿題を終わらせる 明日まで
```

**今日の予定を確認:**
```
今日の予定
```

**クイックメニュー:**
```
メニュー
```

**ヘルプ:**
```
ヘルプ
```

**📸 画像・PDFから予定・タスクを追加:**
```
画像またはPDFファイルを送信するだけ！
- スケジュール表の写真
- 手書きメモ
- スクリーンショット
- PDFファイル（学校のお便り、イベント案内など）
→ Gemini 2.5 Flashが自動で解析して予定・タスクを抽出
```

#### LINEボットの機能
- 🎨 予定・タスクをカード形式で美しく表示
- ⚡ クイックリプライで素早く操作
- 🔍 自然言語で柔軟に理解
- 👨‍👩‍👧‍👦 家族全員の予定をまとめて確認
- 📸 **NEW!** 画像・PDFから予定・タスクを自動抽出（Gemini Vision）

### デモの実行

```bash
npm run dev -- --demo
```

### 💻 CLIモード（開発・テスト用）

#### 対話モード

```bash
npm run dev -- --interactive
```

対話モードでは、以下のような自然言語コマンドを入力できます：

```
> 母：歯医者 5/10 10:00〜11:00
✅ 予定「歯医者」を追加しました（母）

> 長男：宿題を終わらせる 明日まで
✅ タスク「宿題を終わらせる」を追加しました（長男）

> 父の来週の予定を見せて
📋 父の予定を3件取得しました
  - 会議 (2025-05-12 14:00)
  - ゴルフ (2025-05-14 09:00)
  - 歯医者 (2025-05-15 10:00)
```

## 🏗️ プロジェクト構成

```
family-ai-assistant/
├── src/
│   ├── agents/
│   │   ├── calendar-agent.ts    # Phase 1: カレンダー操作
│   │   ├── tasks-agent.ts       # Phase 2: タスク操作
│   │   └── unified-agent.ts     # Phase 3: 統合agent
│   ├── services/
│   │   ├── google-calendar.ts   # Google Calendar API wrapper
│   │   ├── google-tasks.ts      # Google Tasks API wrapper
│   │   ├── gemini.ts            # Gemini API（自然言語処理）
│   │   └── line-bot.ts          # LINE Bot API wrapper
│   ├── handlers/
│   │   └── line-message-handler.ts  # LINEメッセージハンドラー
│   ├── models/
│   │   ├── family-member.ts     # 家族メンバー管理
│   │   └── types.ts             # 型定義
│   ├── index.ts                 # CLIエントリーポイント
│   └── line-bot.ts              # LINEボットサーバー
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🧪 使用例

### Calendar Agent（Phase 1）

```typescript
import { CalendarAgent } from './agents/calendar-agent.js';

// 予定を追加
await calendarAgent.execute('母：歯医者 5/10 10:00〜11:00 を登録して');

// 予定を一覧表示
await calendarAgent.execute('父の来週の予定を見せて');

// 予定を削除
await calendarAgent.execute('長男の明日の予定を削除して');
```

### Tasks Agent（Phase 2）

```typescript
import { TasksAgent } from './agents/tasks-agent.js';

// タスクを追加
await tasksAgent.execute('長男：宿題を終わらせる 明日まで');

// タスク一覧を表示
await tasksAgent.execute('母のタスク一覧を見せて');

// タスクを完了
await tasksAgent.execute('父のタスクを完了にして');
```

### Unified Agent（Phase 3）

```typescript
import { UnifiedAgent } from './agents/unified-agent.js';

// 予定かタスクかを自動判別
await unifiedAgent.execute('父：会議 明日 14:00〜15:00');
await unifiedAgent.execute('母：買い物に行く 今週中');

// A/Bテスト
await unifiedAgent.executeWithABTest('長女：ピアノの練習をする', 'A');
await unifiedAgent.executeWithABTest('長女：ピアノの練習をする', 'B');
```

## 🔧 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js
- **AI**: Google Gemini API（自然言語理解）
- **Google APIs**: googleapis（Calendar & Tasks）
- **LINE Bot**: @line/bot-sdk（Messaging API）
- **Webサーバー**: Express.js

## 🎯 自然言語の判別ロジック

### 予定（Calendar）として判別されるケース
- 時刻が明確に指定されている（例：「10:00〜11:00」）
- 「会議」「診察」「レッスン」などのキーワード

### タスク（Task）として判別されるケース
- 「〜する」「やる」などの行動を表す表現
- 「宿題」「買い物」「掃除」などのキーワード
- 期日のみが指定されている（時刻なし）

### A/Bテスト
- **Variant A**: Gemini APIによる高精度な判別
- **Variant B**: ルールベース判別 + Gemini APIのハイブリッド

## 📝 ライセンス

MIT

## 🤝 コントリビューション

プルリクエストを歓迎します！
