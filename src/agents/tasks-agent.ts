import { GoogleTasksService } from '../services/google-tasks.js';
import { ClaudeService } from '../services/claude.js';
import { FamilyMemberManager } from '../models/family-member.js';
import { AgentResult, Task } from '../models/types.js';

/**
 * Phase 2: Tasks Agent
 * 自然言語でGoogle Tasksを操作するエージェント
 */
export class TasksAgent {
  private tasksService: GoogleTasksService;
  private claudeService: ClaudeService;
  private familyManager: FamilyMemberManager;

  constructor(
    tasksService: GoogleTasksService,
    claudeService: ClaudeService,
    familyManager: FamilyMemberManager
  ) {
    this.tasksService = tasksService;
    this.claudeService = claudeService;
    this.familyManager = familyManager;
  }

  /**
   * 自然言語コマンドを実行
   *
   * 使用例:
   * - "長男：宿題を終わらせる 明日まで"
   * - "母のタスク一覧を見せて"
   * - "父のタスクを完了にして"
   */
  async execute(input: string): Promise<AgentResult> {
    try {
      // 自然言語をパース
      const command = await this.claudeService.parseTaskCommand(
        input,
        this.familyManager.getMemberNames()
      );

      // アクションに応じて実行
      switch (command.action) {
        case 'add':
          return await this.addTask(command);
        case 'list':
          return await this.listTasks(command);
        case 'complete':
          return await this.completeTask(command);
        case 'delete':
          return await this.deleteTask(command);
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
   * タスクを追加
   */
  private async addTask(command: any): Promise<AgentResult> {
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

    // タスクリストIDが未設定の場合は、デフォルトのタスクリストを使用
    const taskListId = member.taskListId || '@default';

    const task: Task = {
      title: command.task.title,
      notes: command.task.notes,
      due: command.task.due ? new Date(command.task.due) : undefined,
      member: command.member,
      status: 'needsAction',
    };

    const taskId = await this.tasksService.addTask(taskListId, task);

    return {
      success: true,
      message: `タスク「${task.title}」を追加しました（${command.member}）`,
      data: { taskId },
    };
  }

  /**
   * タスク一覧を取得
   */
  private async listTasks(command: any): Promise<AgentResult> {
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

      const taskListId = member.taskListId || '@default';
      const tasks = await this.tasksService.listTasks(taskListId);
      tasks.forEach((t) => (t.member = member.name));

      return {
        success: true,
        message: `${command.member}のタスクを${tasks.length}件取得しました`,
        data: { tasks },
      };
    }

    // 全メンバーのタスクを取得
    const allTasks: Task[] = [];
    for (const m of this.familyManager.getAllMembers()) {
      const taskListId = m.taskListId || '@default';
      const tasks = await this.tasksService.listTasks(taskListId);
      tasks.forEach((t) => (t.member = m.name));
      allTasks.push(...tasks);
    }

    return {
      success: true,
      message: `全員のタスクを${allTasks.length}件取得しました`,
      data: { tasks: allTasks },
    };
  }

  /**
   * タスクを完了にする
   */
  private async completeTask(command: any): Promise<AgentResult> {
    if (!command.member || !command.taskId) {
      return {
        success: false,
        message: 'メンバーまたはタスクIDが不足しています',
      };
    }

    const member = this.familyManager.getMember(command.member);
    if (!member) {
      return {
        success: false,
        message: `メンバー「${command.member}」が見つかりません`,
      };
    }

    const taskListId = member.taskListId || '@default';
    await this.tasksService.completeTask(taskListId, command.taskId);

    return {
      success: true,
      message: `タスクを完了にしました（${command.member}）`,
    };
  }

  /**
   * タスクを削除
   */
  private async deleteTask(command: any): Promise<AgentResult> {
    if (!command.member || !command.taskId) {
      return {
        success: false,
        message: 'メンバーまたはタスクIDが不足しています',
      };
    }

    const member = this.familyManager.getMember(command.member);
    if (!member) {
      return {
        success: false,
        message: `メンバー「${command.member}」が見つかりません`,
      };
    }

    const taskListId = member.taskListId || '@default';
    await this.tasksService.deleteTask(taskListId, command.taskId);

    return {
      success: true,
      message: `タスクを削除しました（${command.member}）`,
    };
  }

  /**
   * 家族メンバー用のタスクリストを自動作成
   */
  async setupMemberTaskLists(): Promise<void> {
    const existingLists = await this.tasksService.listTaskLists();

    for (const member of this.familyManager.getAllMembers()) {
      const listName = `${member.name}のタスク`;

      // 既存のタスクリストを検索
      const existing = existingLists.find((list) => list.title === listName);

      if (existing) {
        this.familyManager.setTaskListId(member.name, existing.id);
      } else {
        // 新規作成
        const taskListId = await this.tasksService.createTaskList(listName);
        this.familyManager.setTaskListId(member.name, taskListId);
      }
    }
  }
}
