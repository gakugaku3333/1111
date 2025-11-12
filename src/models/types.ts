/**
 * 家族メンバー情報
 */
export interface FamilyMember {
  name: string;
  calendarId?: string; // Google Calendar ID（各メンバー専用カレンダー）
  taskListId?: string; // Google Tasks List ID（各メンバー専用タスクリスト）
}

/**
 * カレンダーイベント
 */
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  member: string; // 家族メンバー名
  location?: string;
}

/**
 * タスク情報
 */
export interface Task {
  id?: string;
  title: string;
  notes?: string;
  due?: Date;
  member: string; // 家族メンバー名
  status: 'needsAction' | 'completed';
}

/**
 * 自然言語からのパース結果（カレンダー）
 */
export interface ParsedCalendarCommand {
  action: 'add' | 'list' | 'delete';
  member?: string;
  event?: {
    summary: string;
    start?: Date;
    end?: Date;
    description?: string;
    location?: string;
  };
  period?: {
    start: Date;
    end: Date;
  };
  eventId?: string;
}

/**
 * 自然言語からのパース結果（タスク）
 */
export interface ParsedTaskCommand {
  action: 'add' | 'list' | 'complete' | 'delete';
  member?: string;
  task?: {
    title: string;
    notes?: string;
    due?: Date;
  };
  taskId?: string;
}

/**
 * 統合agentのパース結果
 */
export interface ParsedUnifiedCommand {
  type: 'calendar' | 'task';
  calendarCommand?: ParsedCalendarCommand;
  taskCommand?: ParsedTaskCommand;
}

/**
 * Agent実行結果
 */
export interface AgentResult {
  success: boolean;
  message: string;
  data?: any;
}
