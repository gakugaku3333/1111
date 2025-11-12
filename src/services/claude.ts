import Anthropic from '@anthropic-ai/sdk';
import { ParsedCalendarCommand, ParsedTaskCommand, ParsedUnifiedCommand } from '../models/types.js';

/**
 * Claude API 自然言語処理サービス
 */
export class ClaudeService {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY が設定されていません。.envファイルを確認してください。');
    }

    this.client = new Anthropic({ apiKey });
  }

  /**
   * カレンダーコマンドをパース
   */
  async parseCalendarCommand(input: string, memberNames: string[]): Promise<ParsedCalendarCommand> {
    const systemPrompt = `あなたは家族のカレンダー管理アシスタントです。
自然言語の入力を解析して、以下のJSON形式で返してください。

家族メンバー: ${memberNames.join(', ')}

出力形式:
{
  "action": "add" | "list" | "delete",
  "member": "メンバー名",
  "event": {
    "summary": "予定のタイトル",
    "start": "ISO8601形式の開始日時",
    "end": "ISO8601形式の終了日時",
    "description": "説明（任意）",
    "location": "場所（任意）"
  },
  "period": {
    "start": "ISO8601形式の開始日時",
    "end": "ISO8601形式の終了日時"
  },
  "eventId": "イベントID（削除時のみ）"
}

例:
入力: "母：歯医者 5/10 10:00〜11:00 を登録して"
出力: {"action":"add","member":"母","event":{"summary":"歯医者","start":"2025-05-10T10:00:00+09:00","end":"2025-05-10T11:00:00+09:00"}}

入力: "父の来週の予定を見せて"
出力: {"action":"list","member":"父","period":{"start":"2025-11-17T00:00:00+09:00","end":"2025-11-24T00:00:00+09:00"}}

重要:
- 日付が省略されている場合は、文脈から推測してください
- 時刻のみの場合は、今日または最も近い未来の日付を使用してください
- JSONのみを返し、説明は不要です`;

    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: input,
        },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type === 'text') {
      try {
        return JSON.parse(content.text);
      } catch (error) {
        throw new Error(`JSONのパースに失敗しました: ${content.text}`);
      }
    }

    throw new Error('予期しないレスポンス形式です');
  }

  /**
   * タスクコマンドをパース
   */
  async parseTaskCommand(input: string, memberNames: string[]): Promise<ParsedTaskCommand> {
    const systemPrompt = `あなたは家族のタスク管理アシスタントです。
自然言語の入力を解析して、以下のJSON形式で返してください。

家族メンバー: ${memberNames.join(', ')}

出力形式:
{
  "action": "add" | "list" | "complete" | "delete",
  "member": "メンバー名",
  "task": {
    "title": "タスクのタイトル",
    "notes": "メモ（任意）",
    "due": "ISO8601形式の期日（任意）"
  },
  "taskId": "タスクID（完了・削除時のみ）"
}

例:
入力: "長男：宿題を終わらせる 明日まで"
出力: {"action":"add","member":"長男","task":{"title":"宿題を終わらせる","due":"2025-11-13T23:59:59+09:00"}}

入力: "母のタスク一覧を見せて"
出力: {"action":"list","member":"母"}

重要:
- 期日が省略されている場合は、dueフィールドを省略してください
- 「明日」「来週」などの相対的な表現は具体的な日時に変換してください
- JSONのみを返し、説明は不要です`;

    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: input,
        },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type === 'text') {
      try {
        return JSON.parse(content.text);
      } catch (error) {
        throw new Error(`JSONのパースに失敗しました: ${content.text}`);
      }
    }

    throw new Error('予期しないレスポンス形式です');
  }

  /**
   * 統合コマンドをパース（予定かタスクかを自動判別）
   */
  async parseUnifiedCommand(input: string, memberNames: string[]): Promise<ParsedUnifiedCommand> {
    const systemPrompt = `あなたは家族の予定とタスクを管理するアシスタントです。
自然言語の入力を解析して、「予定」か「タスク」かを判別し、適切な形式で返してください。

家族メンバー: ${memberNames.join(', ')}

判別基準:
- 時刻が明確に指定されている → 予定（calendar）
- 「〜する」「やる」などの行動 → タスク（task）
- 「会議」「診察」「レッスン」など → 予定（calendar）
- 「宿題」「買い物」「掃除」など → タスク（task）

出力形式:
{
  "type": "calendar" | "task",
  "calendarCommand": { /* ParsedCalendarCommandの形式 */ },
  "taskCommand": { /* ParsedTaskCommandの形式 */ }
}

例:
入力: "母：歯医者 5/10 10:00〜11:00"
出力: {"type":"calendar","calendarCommand":{"action":"add","member":"母","event":{"summary":"歯医者","start":"2025-05-10T10:00:00+09:00","end":"2025-05-10T11:00:00+09:00"}}}

入力: "長男：宿題を終わらせる 明日まで"
出力: {"type":"task","taskCommand":{"action":"add","member":"長男","task":{"title":"宿題を終わらせる","due":"2025-11-13T23:59:59+09:00"}}}

JSONのみを返し、説明は不要です`;

    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: input,
        },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type === 'text') {
      try {
        return JSON.parse(content.text);
      } catch (error) {
        throw new Error(`JSONのパースに失敗しました: ${content.text}`);
      }
    }

    throw new Error('予期しないレスポンス形式です');
  }
}
