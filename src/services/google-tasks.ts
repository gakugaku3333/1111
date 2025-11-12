import { google, tasks_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Task } from '../models/types.js';
import fs from 'fs';
import path from 'path';

/**
 * Google Tasks API サービスクラス
 */
export class GoogleTasksService {
  private tasks: tasks_v1.Tasks;
  private auth: OAuth2Client;

  constructor() {
    this.auth = this.initAuth();
    this.tasks = google.tasks({ version: 'v1', auth: this.auth });
  }

  /**
   * OAuth2認証の初期化
   */
  private initAuth(): OAuth2Client {
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    const tokenPath = path.join(process.cwd(), 'token.json');

    if (!fs.existsSync(credentialsPath)) {
      throw new Error('credentials.json が見つかりません。Google Cloud Consoleから取得してください。');
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // トークンが存在する場合は読み込む
    if (fs.existsSync(tokenPath)) {
      const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
      oAuth2Client.setCredentials(token);
    }

    return oAuth2Client;
  }

  /**
   * タスクを追加
   */
  async addTask(taskListId: string, task: Task): Promise<string> {
    const response = await this.tasks.tasks.insert({
      tasklist: taskListId,
      requestBody: {
        title: task.title,
        notes: task.notes,
        due: task.due?.toISOString(),
        status: task.status,
      },
    });

    return response.data.id!;
  }

  /**
   * 未完了タスク一覧を取得
   */
  async listTasks(taskListId: string): Promise<Task[]> {
    const response = await this.tasks.tasks.list({
      tasklist: taskListId,
      showCompleted: false,
      showHidden: false,
    });

    const tasks = response.data.items || [];
    return tasks.map((item) => ({
      id: item.id,
      title: item.title || '',
      notes: item.notes,
      due: item.due ? new Date(item.due) : undefined,
      member: '', // この段階では特定できないため空
      status: (item.status as 'needsAction' | 'completed') || 'needsAction',
    }));
  }

  /**
   * タスクを完了にする
   */
  async completeTask(taskListId: string, taskId: string): Promise<void> {
    await this.tasks.tasks.patch({
      tasklist: taskListId,
      task: taskId,
      requestBody: {
        status: 'completed',
      },
    });
  }

  /**
   * タスクを削除
   */
  async deleteTask(taskListId: string, taskId: string): Promise<void> {
    await this.tasks.tasks.delete({
      tasklist: taskListId,
      task: taskId,
    });
  }

  /**
   * タスクリスト一覧を取得
   */
  async listTaskLists(): Promise<{ id: string; title: string }[]> {
    const response = await this.tasks.tasklists.list();
    const taskLists = response.data.items || [];

    return taskLists.map((list) => ({
      id: list.id!,
      title: list.title || '',
    }));
  }

  /**
   * 新しいタスクリストを作成
   */
  async createTaskList(title: string): Promise<string> {
    const response = await this.tasks.tasklists.insert({
      requestBody: {
        title: title,
      },
    });

    return response.data.id!;
  }
}
