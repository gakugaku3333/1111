import { FamilyMember } from './types.js';

/**
 * 家族メンバー管理クラス
 */
export class FamilyMemberManager {
  private members: Map<string, FamilyMember>;

  constructor(memberNames: string[]) {
    this.members = new Map();

    // 環境変数から家族メンバーを初期化
    for (const name of memberNames) {
      this.members.set(name, {
        name,
        calendarId: undefined, // 実際の使用時に設定
        taskListId: undefined, // 実際の使用時に設定
      });
    }
  }

  /**
   * メンバー情報を取得
   */
  getMember(name: string): FamilyMember | undefined {
    return this.members.get(name);
  }

  /**
   * 全メンバーを取得
   */
  getAllMembers(): FamilyMember[] {
    return Array.from(this.members.values());
  }

  /**
   * メンバーのカレンダーIDを設定
   */
  setCalendarId(memberName: string, calendarId: string): void {
    const member = this.members.get(memberName);
    if (member) {
      member.calendarId = calendarId;
    }
  }

  /**
   * メンバーのタスクリストIDを設定
   */
  setTaskListId(memberName: string, taskListId: string): void {
    const member = this.members.get(memberName);
    if (member) {
      member.taskListId = taskListId;
    }
  }

  /**
   * メンバー名が存在するかチェック
   */
  hasMember(name: string): boolean {
    return this.members.has(name);
  }

  /**
   * メンバー名のリストを取得
   */
  getMemberNames(): string[] {
    return Array.from(this.members.keys());
  }
}
