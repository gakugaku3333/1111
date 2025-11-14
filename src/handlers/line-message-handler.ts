import { WebhookEvent, MessageEvent, TextEventMessage, ImageEventMessage } from '@line/bot-sdk';
import * as line from '@line/bot-sdk';
import { LineBotService } from '../services/line-bot.js';
import { UnifiedAgent } from '../agents/unified-agent.js';
import { CalendarAgent } from '../agents/calendar-agent.js';
import { TasksAgent } from '../agents/tasks-agent.js';
import { GeminiService } from '../services/gemini.js';
import { FamilyMemberManager } from '../models/family-member.js';
import https from 'https';

/**
 * LINEメッセージハンドラー
 */
export class LineMessageHandler {
  private lineBotService: LineBotService;
  private unifiedAgent: UnifiedAgent;
  private calendarAgent: CalendarAgent;
  private tasksAgent: TasksAgent;
  private geminiService: GeminiService;
  private familyManager: FamilyMemberManager;
  private lineClient: line.messagingApi.MessagingApiClient;

  constructor(
    lineBotService: LineBotService,
    unifiedAgent: UnifiedAgent,
    calendarAgent: CalendarAgent,
    tasksAgent: TasksAgent,
    geminiService: GeminiService,
    familyManager: FamilyMemberManager
  ) {
    this.lineBotService = lineBotService;
    this.unifiedAgent = unifiedAgent;
    this.calendarAgent = calendarAgent;
    this.tasksAgent = tasksAgent;
    this.geminiService = geminiService;
    this.familyManager = familyManager;

    // LINE APIクライアントの初期化
    this.lineClient = new line.messagingApi.MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    });
  }

  /**
   * Webhookイベントを処理
   */
  async handleEvent(event: WebhookEvent): Promise<void> {
    if (event.type !== 'message') {
      return;
    }

    const messageEvent = event as MessageEvent;
    const replyToken = messageEvent.replyToken;

    // 画像メッセージの処理
    if (messageEvent.message.type === 'image') {
      await this.handleImageMessage(messageEvent, replyToken);
      return;
    }

    // テキストメッセージの処理
    if (messageEvent.message.type !== 'text') {
      return;
    }

    const textMessage = messageEvent.message as TextEventMessage;
    const userMessage = textMessage.text.trim();

    try {
      // ヘルプコマンド
      if (userMessage === 'ヘルプ' || userMessage === 'help') {
        await this.handleHelp(replyToken);
        return;
      }

      // メニューコマンド
      if (userMessage === 'メニュー' || userMessage === 'menu') {
        await this.handleMenu(replyToken);
        return;
      }

      // 予定一覧
      if (userMessage.includes('予定') && userMessage.includes('一覧')) {
        await this.handleListEvents(replyToken, userMessage);
        return;
      }

      // タスク一覧
      if (userMessage.includes('タスク') && userMessage.includes('一覧')) {
        await this.handleListTasks(replyToken, userMessage);
        return;
      }

      // 今日の予定
      if (userMessage === '今日の予定' || userMessage === '今日') {
        await this.handleToday(replyToken);
        return;
      }

      // 今週の予定
      if (userMessage === '今週の予定' || userMessage === '今週') {
        await this.handleThisWeek(replyToken);
        return;
      }

      // 自然言語コマンドを統合agentで処理
      await this.handleNaturalLanguage(replyToken, userMessage);
    } catch (error) {
      console.error('メッセージ処理エラー:', error);
      await this.lineBotService.sendError(
        replyToken,
        error instanceof Error ? error.message : '予期しないエラーが発生しました'
      );
    }
  }

  /**
   * ヘルプメッセージを送信
   */
  private async handleHelp(replyToken: string): Promise<void> {
    const helpText = `🏠 家族AIアシスタント

【使い方】
自然な日本語で話しかけてください！

【予定の追加】
「母：歯医者 5/10 10:00〜11:00」
「父：会議 明日 14:00〜15:00」

【タスクの追加】
「長男：宿題を終わらせる 明日まで」
「母：買い物に行く 今週中」

【予定の確認】
「今日の予定」
「今週の予定」
「父の来週の予定を見せて」

【タスクの確認】
「タスク一覧」
「長男のタスク」

【クイックメニュー】
「メニュー」と入力`;

    await this.lineBotService.sendText(replyToken, helpText);
  }

  /**
   * メニューを送信（クイックリプライ付き）
   */
  private async handleMenu(replyToken: string): Promise<void> {
    const actions = [
      '今日の予定',
      '今週の予定',
      'タスク一覧',
      'ヘルプ',
    ];

    await this.lineBotService.sendRichMenu(
      replyToken,
      'メニューから選択するか、自由に話しかけてください',
      actions
    );
  }

  /**
   * 予定一覧を取得
   */
  private async handleListEvents(replyToken: string, message: string): Promise<void> {
    const result = await this.calendarAgent.execute(message);

    if (result.success && result.data?.events) {
      await this.lineBotService.sendEventsList(replyToken, result.data.events);
    } else {
      await this.lineBotService.sendText(replyToken, result.message);
    }
  }

  /**
   * タスク一覧を取得
   */
  private async handleListTasks(replyToken: string, message: string): Promise<void> {
    const result = await this.tasksAgent.execute(message);

    if (result.success && result.data?.tasks) {
      await this.lineBotService.sendTasksList(replyToken, result.data.tasks);
    } else {
      await this.lineBotService.sendText(replyToken, result.message);
    }
  }

  /**
   * 今日の予定を取得
   */
  private async handleToday(replyToken: string): Promise<void> {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const message = `全員の今日の予定を見せて`;
    const result = await this.calendarAgent.execute(message);

    if (result.success && result.data?.events) {
      await this.lineBotService.sendEventsList(replyToken, result.data.events);
    } else {
      await this.lineBotService.sendText(replyToken, '今日の予定はありません');
    }
  }

  /**
   * 今週の予定を取得
   */
  private async handleThisWeek(replyToken: string): Promise<void> {
    const message = `全員の今週の予定を見せて`;
    const result = await this.calendarAgent.execute(message);

    if (result.success && result.data?.events) {
      await this.lineBotService.sendEventsList(replyToken, result.data.events);
    } else {
      await this.lineBotService.sendText(replyToken, '今週の予定はありません');
    }
  }

  /**
   * 自然言語コマンドを処理
   */
  private async handleNaturalLanguage(replyToken: string, message: string): Promise<void> {
    // 統合agentで処理
    const result = await this.unifiedAgent.execute(message);

    // 結果をLINEで送信
    if (result.success) {
      if (result.data?.events) {
        await this.lineBotService.sendEventsList(replyToken, result.data.events);
      } else if (result.data?.tasks) {
        await this.lineBotService.sendTasksList(replyToken, result.data.tasks);
      } else {
        await this.lineBotService.sendText(replyToken, `✅ ${result.message}`);
      }
    } else {
      await this.lineBotService.sendError(replyToken, result.message);
    }
  }

  /**
   * 画像メッセージを処理
   */
  private async handleImageMessage(messageEvent: MessageEvent, replyToken: string): Promise<void> {
    try {
      await this.lineBotService.sendText(replyToken, '📸 画像を解析しています...');

      const imageMessage = messageEvent.message as ImageEventMessage;
      const messageId = imageMessage.id;

      // LINE APIから画像を取得
      const imageBuffer = await this.downloadImage(messageId);
      const imageBase64 = imageBuffer.toString('base64');

      // Geminiで画像を解析
      const analysis = await this.geminiService.analyzeImage(
        imageBase64,
        'image/jpeg',
        this.familyManager.getMemberNames()
      );

      // 結果を確認メッセージで表示
      if (analysis.events.length === 0 && analysis.tasks.length === 0) {
        await this.lineBotService.sendText(
          replyToken,
          '画像から予定やタスクを検出できませんでした。\n' +
          `画像内容: ${analysis.summary}`
        );
        return;
      }

      // 確認メッセージを作成
      let confirmMessage = '📋 以下の予定・タスクを検出しました：\n\n';

      if (analysis.events.length > 0) {
        confirmMessage += '【予定】\n';
        analysis.events.forEach((event, index) => {
          const member = event.member ? `[${event.member}] ` : '';
          const time = event.start ? `\n  📅 ${new Date(event.start).toLocaleString('ja-JP')}` : '';
          confirmMessage += `${index + 1}. ${member}${event.summary}${time}\n`;
        });
        confirmMessage += '\n';
      }

      if (analysis.tasks.length > 0) {
        confirmMessage += '【タスク】\n';
        analysis.tasks.forEach((task, index) => {
          const member = task.member ? `[${task.member}] ` : '';
          const due = task.due ? `\n  ⏰ 期限: ${new Date(task.due).toLocaleDateString('ja-JP')}` : '';
          confirmMessage += `${index + 1}. ${member}${task.title}${due}\n`;
        });
      }

      confirmMessage += '\n✅ これらをカレンダーとタスクに追加しますか？\n';
      confirmMessage += '「はい」または「追加」と返信してください。';

      await this.lineBotService.sendText(replyToken, confirmMessage);

      // TODO: 確認後の処理（ポストバックアクション）を実装
      // 現在は簡易版として、ユーザーが「はい」と返信したら自動追加する

    } catch (error) {
      console.error('画像処理エラー:', error);
      await this.lineBotService.sendError(
        replyToken,
        '画像の処理中にエラーが発生しました'
      );
    }
  }

  /**
   * LINE APIから画像をダウンロード
   */
  private async downloadImage(messageId: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api-data.line.me',
        path: `/v2/bot/message/${messageId}/content`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      };

      https.get(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });
  }
}
