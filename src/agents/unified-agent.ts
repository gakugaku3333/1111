import { CalendarAgent } from './calendar-agent.js';
import { TasksAgent } from './tasks-agent.js';
import { GeminiService } from '../services/gemini.js';
import { FamilyMemberManager } from '../models/family-member.js';
import { AgentResult } from '../models/types.js';

/**
 * Phase 3: Unified Agent
 * 予定とタスクを統合して自動判別するエージェント
 */
export class UnifiedAgent {
  private calendarAgent: CalendarAgent;
  private tasksAgent: TasksAgent;
  private geminiService: GeminiService;
  private familyManager: FamilyMemberManager;

  constructor(
    calendarAgent: CalendarAgent,
    tasksAgent: TasksAgent,
    geminiService: GeminiService,
    familyManager: FamilyMemberManager
  ) {
    this.calendarAgent = calendarAgent;
    this.tasksAgent = tasksAgent;
    this.geminiService = geminiService;
    this.familyManager = familyManager;
  }

  /**
   * 自然言語コマンドを実行（予定 or タスクを自動判別）
   *
   * 使用例:
   * - "母：歯医者 5/10 10:00〜11:00" → 自動的にカレンダーに追加
   * - "長男：宿題を終わらせる 明日まで" → 自動的にタスクに追加
   * - "父の今週の予定とタスクを見せて" → 両方を取得
   */
  async execute(input: string): Promise<AgentResult> {
    try {
      // 自然言語を解析して予定かタスクかを判別
      const command = await this.geminiService.parseUnifiedCommand(
        input,
        this.familyManager.getMemberNames()
      );

      if (command.type === 'calendar' && command.calendarCommand) {
        // カレンダーagentに委譲
        return await this.executeCalendarCommand(command.calendarCommand);
      } else if (command.type === 'task' && command.taskCommand) {
        // タスクagentに委譲
        return await this.executeTaskCommand(command.taskCommand);
      } else {
        return {
          success: false,
          message: '予定またはタスクのコマンドを判別できませんでした',
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
   * カレンダーコマンドを実行
   */
  private async executeCalendarCommand(command: any): Promise<AgentResult> {
    // CalendarAgentの内部メソッドを直接呼び出す代わりに、
    // 自然言語形式に変換してexecuteを呼び出す
    // （より簡潔にするため、ここでは内部メソッドを再利用）

    switch (command.action) {
      case 'add':
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

        // CalendarAgentに委譲
        const addCommand = `${command.member}：${command.event.summary} ${new Date(command.event.start).toLocaleString('ja-JP')}〜${new Date(command.event.end).toLocaleString('ja-JP')} を登録して`;
        return await this.calendarAgent.execute(addCommand);

      case 'list':
      case 'delete':
        // その他のアクションも同様に処理
        // 実装は簡略化のため省略（実際にはCalendarAgentのメソッドを呼び出す）
        return {
          success: false,
          message: 'この機能は実装中です',
        };

      default:
        return {
          success: false,
          message: `未対応のアクション: ${command.action}`,
        };
    }
  }

  /**
   * タスクコマンドを実行
   */
  private async executeTaskCommand(command: any): Promise<AgentResult> {
    switch (command.action) {
      case 'add':
        if (!command.member || !command.task) {
          return {
            success: false,
            message: 'メンバーまたはタスク情報が不足しています',
          };
        }

        const member = this.familyManager.getMember(command.member);
        if (!member) {
          return {
            success: false,
            message: `メンバー「${command.member}」が見つかりません`,
          };
        }

        // TasksAgentに委譲
        const addCommand = command.task.due
          ? `${command.member}：${command.task.title} ${new Date(command.task.due).toLocaleDateString('ja-JP')}まで`
          : `${command.member}：${command.task.title}`;
        return await this.tasksAgent.execute(addCommand);

      case 'list':
      case 'complete':
      case 'delete':
        // その他のアクションも同様に処理
        return {
          success: false,
          message: 'この機能は実装中です',
        };

      default:
        return {
          success: false,
          message: `未対応のアクション: ${command.action}`,
        };
    }
  }

  /**
   * 複合クエリの実行（予定とタスクを同時に取得など）
   *
   * 使用例: "父の今週の予定とタスクを全部見せて"
   */
  async executeComplex(input: string): Promise<AgentResult> {
    try {
      // まず統合コマンドとして解析
      const command = await this.geminiService.parseUnifiedCommand(
        input,
        this.familyManager.getMemberNames()
      );

      // 両方のデータを取得する場合
      if (input.includes('予定') && input.includes('タスク')) {
        const calendarResult = await this.calendarAgent.execute(input);
        const tasksResult = await this.tasksAgent.execute(input);

        return {
          success: calendarResult.success && tasksResult.success,
          message: `${calendarResult.message}\n${tasksResult.message}`,
          data: {
            calendar: calendarResult.data,
            tasks: tasksResult.data,
          },
        };
      }

      // 通常の処理
      return await this.execute(input);
    } catch (error) {
      return {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * A/Bテスト用メソッド
   * 異なる判別アルゴリズムを比較する
   */
  async executeWithABTest(input: string, variant: 'A' | 'B'): Promise<AgentResult> {
    // Variant A: Claudeの判別を使用（現在の実装）
    if (variant === 'A') {
      return await this.execute(input);
    }

    // Variant B: ルールベースの判別を併用
    if (variant === 'B') {
      // 時刻パターンがある場合は予定
      const timePattern = /\d{1,2}:\d{2}|午前|午後/;
      if (timePattern.test(input)) {
        return await this.calendarAgent.execute(input);
      }

      // 「する」「やる」などのパターンがある場合はタスク
      const taskPattern = /する|やる|終わらせる|完了|済ませる/;
      if (taskPattern.test(input)) {
        return await this.tasksAgent.execute(input);
      }

      // どちらでもない場合はClaudeに判別させる
      return await this.execute(input);
    }

    return {
      success: false,
      message: '無効なvariantです',
    };
  }
}
