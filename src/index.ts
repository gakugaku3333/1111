import dotenv from 'dotenv';
import { GoogleCalendarService } from './services/google-calendar.js';
import { GoogleTasksService } from './services/google-tasks.js';
import { ClaudeService } from './services/claude.js';
import { FamilyMemberManager } from './models/family-member.js';
import { CalendarAgent } from './agents/calendar-agent.js';
import { TasksAgent } from './agents/tasks-agent.js';
import { UnifiedAgent } from './agents/unified-agent.js';

// 環境変数を読み込む
dotenv.config();

/**
 * 家族AIアシスタントシステム
 * メインエントリーポイント
 */
class FamilyAIAssistant {
  private calendarService: GoogleCalendarService;
  private tasksService: GoogleTasksService;
  private claudeService: ClaudeService;
  private familyManager: FamilyMemberManager;

  private calendarAgent: CalendarAgent;
  private tasksAgent: TasksAgent;
  private unifiedAgent: UnifiedAgent;

  constructor() {
    // 家族メンバーの初期化
    const memberNames = (process.env.FAMILY_MEMBERS || '父,母,長男,長女').split(',');
    this.familyManager = new FamilyMemberManager(memberNames);

    // サービスの初期化
    this.calendarService = new GoogleCalendarService();
    this.tasksService = new GoogleTasksService();
    this.claudeService = new ClaudeService();

    // Agentの初期化
    this.calendarAgent = new CalendarAgent(
      this.calendarService,
      this.claudeService,
      this.familyManager
    );

    this.tasksAgent = new TasksAgent(
      this.tasksService,
      this.claudeService,
      this.familyManager
    );

    this.unifiedAgent = new UnifiedAgent(
      this.calendarAgent,
      this.tasksAgent,
      this.claudeService,
      this.familyManager
    );
  }

  /**
   * 初期セットアップ
   * 家族メンバーごとのカレンダーとタスクリストを作成
   */
  async setup(): Promise<void> {
    console.log('📅 家族メンバー用のカレンダーを作成中...');
    await this.calendarAgent.setupMemberCalendars();

    console.log('✅ 家族メンバー用のタスクリストを作成中...');
    await this.tasksAgent.setupMemberTaskLists();

    console.log('✨ セットアップ完了！');
  }

  /**
   * Phase 1: カレンダー操作のデモ
   */
  async demoCalendar(): Promise<void> {
    console.log('\n=== Phase 1: Calendar Agent Demo ===\n');

    // 予定を追加
    const addResult = await this.calendarAgent.execute(
      '母：歯医者 2025/05/10 10:00〜11:00 を登録して'
    );
    console.log(`✅ ${addResult.message}`);

    // 予定を一覧表示
    const listResult = await this.calendarAgent.execute('母の来週の予定を見せて');
    console.log(`📋 ${listResult.message}`);
    if (listResult.data?.events) {
      listResult.data.events.forEach((event: any) => {
        console.log(`  - ${event.summary} (${event.start.toLocaleString('ja-JP')})`);
      });
    }
  }

  /**
   * Phase 2: タスク操作のデモ
   */
  async demoTasks(): Promise<void> {
    console.log('\n=== Phase 2: Tasks Agent Demo ===\n');

    // タスクを追加
    const addResult = await this.tasksAgent.execute(
      '長男：宿題を終わらせる 明日まで'
    );
    console.log(`✅ ${addResult.message}`);

    // タスクを一覧表示
    const listResult = await this.tasksAgent.execute('長男のタスク一覧を見せて');
    console.log(`📋 ${listResult.message}`);
    if (listResult.data?.tasks) {
      listResult.data.tasks.forEach((task: any) => {
        const due = task.due ? ` (期限: ${task.due.toLocaleDateString('ja-JP')})` : '';
        console.log(`  - ${task.title}${due}`);
      });
    }
  }

  /**
   * Phase 3: 統合Agent操作のデモ
   */
  async demoUnified(): Promise<void> {
    console.log('\n=== Phase 3: Unified Agent Demo ===\n');

    // 予定を自動判別して追加
    const eventResult = await this.unifiedAgent.execute(
      '父：会議 明日 14:00〜15:00'
    );
    console.log(`📅 ${eventResult.message}`);

    // タスクを自動判別して追加
    const taskResult = await this.unifiedAgent.execute(
      '母：買い物に行く 今週中'
    );
    console.log(`✅ ${taskResult.message}`);

    // A/Bテスト
    console.log('\n--- A/Bテスト ---');
    const abResultA = await this.unifiedAgent.executeWithABTest(
      '長女：ピアノの練習をする',
      'A'
    );
    console.log(`[Variant A] ${abResultA.message}`);

    const abResultB = await this.unifiedAgent.executeWithABTest(
      '長女：ピアノの練習をする',
      'B'
    );
    console.log(`[Variant B] ${abResultB.message}`);
  }

  /**
   * 対話モードの起動
   */
  async interactive(): Promise<void> {
    console.log('\n💬 対話モードを起動します...');
    console.log('コマンドを入力してください（終了するには "exit" を入力）\n');

    // 標準入力から読み取り（簡易版）
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const prompt = () => {
      rl.question('> ', async (input: string) => {
        if (input.toLowerCase() === 'exit') {
          console.log('👋 終了します');
          rl.close();
          return;
        }

        const result = await this.unifiedAgent.execute(input);
        console.log(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);

        if (result.data) {
          console.log(JSON.stringify(result.data, null, 2));
        }

        prompt();
      });
    };

    prompt();
  }
}

// メイン実行
async function main() {
  console.log('🏠 家族AIアシスタントシステム 起動中...\n');

  const assistant = new FamilyAIAssistant();

  // コマンドライン引数を確認
  const args = process.argv.slice(2);

  if (args.includes('--setup')) {
    await assistant.setup();
  } else if (args.includes('--demo')) {
    await assistant.demoCalendar();
    await assistant.demoTasks();
    await assistant.demoUnified();
  } else if (args.includes('--interactive')) {
    await assistant.interactive();
  } else {
    console.log('使用方法:');
    console.log('  npm run dev -- --setup         # 初期セットアップ');
    console.log('  npm run dev -- --demo          # デモ実行');
    console.log('  npm run dev -- --interactive   # 対話モード');
  }
}

main().catch((error) => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
