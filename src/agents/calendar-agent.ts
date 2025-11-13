import { GoogleCalendarService } from '../services/google-calendar.js';
import { GeminiService } from '../services/gemini.js';
import { FamilyMemberManager } from '../models/family-member.js';
import { AgentResult, CalendarEvent } from '../models/types.js';

/**
 * Phase 1: Calendar Agent
 * 自然言語でGoogle Calendarを操作するエージェント
 */
export class CalendarAgent {
  private calendarService: GoogleCalendarService;
  private geminiService: GeminiService;
  private familyManager: FamilyMemberManager;

  constructor(
    calendarService: GoogleCalendarService,
    geminiService: GeminiService,
    familyManager: FamilyMemberManager
  ) {
    this.calendarService = calendarService;
    this.geminiService = geminiService;
    this.familyManager = familyManager;
  }

  /**
   * 自然言語コマンドを実行
   *
   * 使用例:
   * - "母：歯医者 5/10 10:00〜11:00 を登録して"
   * - "父の来週の予定を見せて"
   * - "長男の明日の予定を削除して"
   */
  async execute(input: string): Promise<AgentResult> {
    try {
      // 自然言語をパース
      const command = await this.geminiService.parseCalendarCommand(
        input,
        this.familyManager.getMemberNames()
      );

      // アクションに応じて実行
      switch (command.action) {
        case 'add':
          return await this.addEvent(command);
        case 'list':
          return await this.listEvents(command);
        case 'delete':
          return await this.deleteEvent(command);
        default:
          return {
            success: false,
            message: `未対応のアクション: ${command.action}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 予定を追加
   */
  private async addEvent(command: any): Promise<AgentResult> {
    if (!command.member || !command.event) {
      return {
        success: false,
        message: 'メンバーまたはイベント情報が不足しています',
      };
    }

    const member = this.familyManager.getMember(command.member);
    if (!member) {
      return {
        success: false,
        message: `メンバー「${command.member}」が見つかりません`,
      };
    }

    // カレンダーIDが未設定の場合は、プライマリカレンダーを使用
    const calendarId = member.calendarId || 'primary';

    const event: CalendarEvent = {
      summary: command.event.summary,
      description: command.event.description,
      location: command.event.location,
      start: new Date(command.event.start),
      end: new Date(command.event.end),
      member: command.member,
    };

    const eventId = await this.calendarService.addEvent(calendarId, event);

    return {
      success: true,
      message: `予定「${event.summary}」を追加しました（${command.member}）`,
      data: { eventId },
    };
  }

  /**
   * 予定一覧を取得
   */
  private async listEvents(command: any): Promise<AgentResult> {
    if (!command.period) {
      return {
        success: false,
        message: '期間情報が不足しています',
      };
    }

    const member = command.member
      ? this.familyManager.getMember(command.member)
      : null;

    // メンバー指定がある場合
    if (command.member) {
      if (!member) {
        return {
          success: false,
          message: `メンバー「${command.member}」が見つかりません`,
        };
      }

      const calendarId = member.calendarId || 'primary';
      const events = await this.calendarService.listEvents(
        calendarId,
        new Date(command.period.start),
        new Date(command.period.end)
      );

      return {
        success: true,
        message: `${command.member}の予定を${events.length}件取得しました`,
        data: { events },
      };
    }

    // 全メンバーの予定を取得
    const allEvents: CalendarEvent[] = [];
    for (const m of this.familyManager.getAllMembers()) {
      const calendarId = m.calendarId || 'primary';
      const events = await this.calendarService.listEvents(
        calendarId,
        new Date(command.period.start),
        new Date(command.period.end)
      );
      events.forEach((e) => (e.member = m.name));
      allEvents.push(...events);
    }

    return {
      success: true,
      message: `全員の予定を${allEvents.length}件取得しました`,
      data: { events: allEvents },
    };
  }

  /**
   * 予定を削除
   */
  private async deleteEvent(command: any): Promise<AgentResult> {
    if (!command.member || !command.eventId) {
      return {
        success: false,
        message: 'メンバーまたはイベントIDが不足しています',
      };
    }

    const member = this.familyManager.getMember(command.member);
    if (!member) {
      return {
        success: false,
        message: `メンバー「${command.member}」が見つかりません`,
      };
    }

    const calendarId = member.calendarId || 'primary';
    await this.calendarService.deleteEvent(calendarId, command.eventId);

    return {
      success: true,
      message: `予定を削除しました（${command.member}）`,
    };
  }

  /**
   * 家族メンバー用のカレンダーを自動作成
   */
  async setupMemberCalendars(): Promise<void> {
    const existingCalendars = await this.calendarService.listCalendars();

    for (const member of this.familyManager.getAllMembers()) {
      const calendarName = `家族カレンダー - ${member.name}`;

      // 既存のカレンダーを検索
      const existing = existingCalendars.find((cal) => cal.summary === calendarName);

      if (existing) {
        this.familyManager.setCalendarId(member.name, existing.id);
      } else {
        // 新規作成
        const calendarId = await this.calendarService.createCalendar(calendarName);
        this.familyManager.setCalendarId(member.name, calendarId);
      }
    }
  }
}
