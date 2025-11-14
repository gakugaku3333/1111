import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import * as line from '@line/bot-sdk';
import { GoogleCalendarService } from './services/google-calendar.js';
import { GoogleTasksService } from './services/google-tasks.js';
import { GeminiService } from './services/gemini.js';
import { LineBotService } from './services/line-bot.js';
import { FamilyMemberManager } from './models/family-member.js';
import { CalendarAgent } from './agents/calendar-agent.js';
import { TasksAgent } from './agents/tasks-agent.js';
import { UnifiedAgent } from './agents/unified-agent.js';
import { LineMessageHandler } from './handlers/line-message-handler.js';

// 環境変数を読み込む
dotenv.config();

/**
 * LINE Bot サーバー
 */
class LineBotServer {
  private app: express.Application;
  private lineConfig: line.ClientConfig;
  private messageHandler: LineMessageHandler;

  constructor() {
    // LINE設定
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!channelSecret || !channelAccessToken) {
      throw new Error('LINE_CHANNEL_SECRET と LINE_CHANNEL_ACCESS_TOKEN を設定してください');
    }

    this.lineConfig = {
      channelSecret,
    };

    // Express設定
    this.app = express();

    // 家族メンバーの初期化
    const memberNames = (process.env.FAMILY_MEMBERS || '父,母,長男,長女').split(',');
    const familyManager = new FamilyMemberManager(memberNames);

    // サービスの初期化
    const calendarService = new GoogleCalendarService();
    const tasksService = new GoogleTasksService();
    const geminiService = new GeminiService();
    const lineBotService = new LineBotService();

    // Agentの初期化
    const calendarAgent = new CalendarAgent(
      calendarService,
      geminiService,
      familyManager
    );

    const tasksAgent = new TasksAgent(
      tasksService,
      geminiService,
      familyManager
    );

    const unifiedAgent = new UnifiedAgent(
      calendarAgent,
      tasksAgent,
      geminiService,
      familyManager
    );

    // メッセージハンドラーの初期化
    this.messageHandler = new LineMessageHandler(
      lineBotService,
      unifiedAgent,
      calendarAgent,
      tasksAgent,
      geminiService,
      familyManager
    );

    // ルート設定
    this.setupRoutes();
  }

  /**
   * ルート設定
   */
  private setupRoutes(): void {
    // ヘルスチェック
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Webhook
    this.app.post(
      '/webhook',
      line.middleware(this.lineConfig),
      async (req: Request, res: Response) => {
        try {
          const events: line.WebhookEvent[] = req.body.events;

          // 各イベントを並列処理
          await Promise.all(
            events.map((event) => this.messageHandler.handleEvent(event))
          );

          res.json({ status: 'ok' });
        } catch (error) {
          console.error('Webhook処理エラー:', error);
          res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    );

    // ルートパス
    this.app.get('/', (req: Request, res: Response) => {
      res.send(`
        <html>
          <head>
            <title>家族AIアシスタント</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                max-width: 600px;
                margin: 50px auto;
                padding: 20px;
                line-height: 1.6;
              }
              h1 { color: #00B900; }
              .status {
                padding: 10px;
                background: #e8f5e9;
                border-radius: 5px;
                margin: 20px 0;
              }
              .instructions {
                background: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
              }
              code {
                background: #eeeeee;
                padding: 2px 6px;
                border-radius: 3px;
              }
            </style>
          </head>
          <body>
            <h1>🏠 家族AIアシスタント LINE Bot</h1>
            <div class="status">
              ✅ サーバーは正常に稼働中です
            </div>

            <h2>📱 LINEで使う</h2>
            <div class="instructions">
              <p>1. LINE Developers ConsoleでこのWebhook URLを設定:</p>
              <code>https://your-domain.com/webhook</code>

              <p style="margin-top: 15px;">2. LINEで友だち追加して使い始めましょう！</p>

              <p style="margin-top: 15px;">3. メッセージ例:</p>
              <ul>
                <li>「母：歯医者 5/10 10:00〜11:00」</li>
                <li>「長男：宿題を終わらせる 明日まで」</li>
                <li>「今日の予定」</li>
                <li>「メニュー」</li>
              </ul>
            </div>

            <h2>🔧 開発環境</h2>
            <div class="instructions">
              <p>ngrokを使ってローカルでテスト:</p>
              <code>ngrok http 3000</code>
            </div>
          </body>
        </html>
      `);
    });
  }

  /**
   * サーバー起動
   */
  start(port: number = 3000): void {
    this.app.listen(port, () => {
      console.log(`🚀 LINE Bot サーバーが起動しました`);
      console.log(`📍 ポート: ${port}`);
      console.log(`🔗 Webhook URL: http://localhost:${port}/webhook`);
      console.log(`💡 ngrokを使用する場合: ngrok http ${port}`);
      console.log();
      console.log(`使い方:`);
      console.log(`1. LINE Developers Consoleでチャンネルを作成`);
      console.log(`2. Webhook URLを設定（ngrok使用時はngrokのURLを使用）`);
      console.log(`3. LINEで友だち追加`);
      console.log(`4. メッセージを送信！`);
    });
  }
}

// メイン実行
async function main() {
  try {
    const server = new LineBotServer();
    const port = parseInt(process.env.PORT || '3000', 10);
    server.start(port);
  } catch (error) {
    console.error('❌ サーバー起動エラー:', error);
    process.exit(1);
  }
}

main();
