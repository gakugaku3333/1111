import * as line from '@line/bot-sdk';

/**
 * LINE Bot サービスクラス
 */
export class LineBotService {
  private client: line.messagingApi.MessagingApiClient;

  constructor() {
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!channelAccessToken) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN が設定されていません。');
    }

    this.client = new line.messagingApi.MessagingApiClient({
      channelAccessToken,
    });
  }

  /**
   * テキストメッセージを送信
   */
  async sendText(replyToken: string, text: string): Promise<void> {
    await this.client.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text,
        },
      ],
    });
  }

  /**
   * リッチメニューを送信
   */
  async sendRichMenu(replyToken: string, text: string, actions: string[]): Promise<void> {
    const quickReply: line.messagingApi.QuickReply = {
      items: actions.map((action) => ({
        type: 'action',
        action: {
          type: 'message',
          label: action,
          text: action,
        },
      })),
    };

    await this.client.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text,
          quickReply,
        },
      ],
    });
  }

  /**
   * 予定一覧をフレックスメッセージで送信
   */
  async sendEventsList(replyToken: string, events: any[]): Promise<void> {
    if (events.length === 0) {
      await this.sendText(replyToken, '予定はありません');
      return;
    }

    const bubbles = events.slice(0, 10).map((event) => ({
      type: 'bubble' as const,
      body: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          {
            type: 'text' as const,
            text: event.summary,
            weight: 'bold' as const,
            size: 'lg' as const,
          },
          {
            type: 'box' as const,
            layout: 'vertical' as const,
            margin: 'md' as const,
            spacing: 'sm' as const,
            contents: [
              {
                type: 'box' as const,
                layout: 'baseline' as const,
                contents: [
                  {
                    type: 'text' as const,
                    text: '👤',
                    size: 'sm' as const,
                    flex: 0,
                  },
                  {
                    type: 'text' as const,
                    text: event.member,
                    size: 'sm' as const,
                    margin: 'sm' as const,
                  },
                ],
              },
              {
                type: 'box' as const,
                layout: 'baseline' as const,
                contents: [
                  {
                    type: 'text' as const,
                    text: '📅',
                    size: 'sm' as const,
                    flex: 0,
                  },
                  {
                    type: 'text' as const,
                    text: new Date(event.start).toLocaleString('ja-JP'),
                    size: 'sm' as const,
                    margin: 'sm' as const,
                  },
                ],
              },
            ],
          },
        ],
      },
    }));

    await this.client.replyMessage({
      replyToken,
      messages: [
        {
          type: 'flex',
          altText: `予定が${events.length}件あります`,
          contents: {
            type: 'carousel',
            contents: bubbles,
          },
        },
      ],
    });
  }

  /**
   * タスク一覧をフレックスメッセージで送信
   */
  async sendTasksList(replyToken: string, tasks: any[]): Promise<void> {
    if (tasks.length === 0) {
      await this.sendText(replyToken, 'タスクはありません');
      return;
    }

    const bubbles = tasks.slice(0, 10).map((task) => ({
      type: 'bubble' as const,
      body: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          {
            type: 'text' as const,
            text: task.title,
            weight: 'bold' as const,
            size: 'lg' as const,
          },
          {
            type: 'box' as const,
            layout: 'vertical' as const,
            margin: 'md' as const,
            spacing: 'sm' as const,
            contents: [
              {
                type: 'box' as const,
                layout: 'baseline' as const,
                contents: [
                  {
                    type: 'text' as const,
                    text: '👤',
                    size: 'sm' as const,
                    flex: 0,
                  },
                  {
                    type: 'text' as const,
                    text: task.member,
                    size: 'sm' as const,
                    margin: 'sm' as const,
                  },
                ],
              },
              ...(task.due
                ? [
                    {
                      type: 'box' as const,
                      layout: 'baseline' as const,
                      contents: [
                        {
                          type: 'text' as const,
                          text: '⏰',
                          size: 'sm' as const,
                          flex: 0,
                        },
                        {
                          type: 'text' as const,
                          text: new Date(task.due).toLocaleDateString('ja-JP'),
                          size: 'sm' as const,
                          margin: 'sm' as const,
                        },
                      ],
                    },
                  ]
                : []),
            ],
          },
        ],
      },
    }));

    await this.client.replyMessage({
      replyToken,
      messages: [
        {
          type: 'flex',
          altText: `タスクが${tasks.length}件あります`,
          contents: {
            type: 'carousel',
            contents: bubbles,
          },
        },
      ],
    });
  }

  /**
   * エラーメッセージを送信
   */
  async sendError(replyToken: string, error: string): Promise<void> {
    await this.sendText(replyToken, `❌ エラー: ${error}`);
  }
}
