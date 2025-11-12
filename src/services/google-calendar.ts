import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { CalendarEvent } from '../models/types.js';
import fs from 'fs';
import path from 'path';

/**
 * Google Calendar API サービスクラス
 */
export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;
  private auth: OAuth2Client;

  constructor() {
    this.auth = this.initAuth();
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
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
   * 認証URLを取得（初回認証用）
   */
  getAuthUrl(): string {
    const SCOPES = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/tasks'
    ];

    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
  }

  /**
   * 認証コードからトークンを取得
   */
  async getToken(code: string): Promise<void> {
    const { tokens } = await this.auth.getToken(code);
    this.auth.setCredentials(tokens);

    // トークンを保存
    const tokenPath = path.join(process.cwd(), 'token.json');
    fs.writeFileSync(tokenPath, JSON.stringify(tokens));
  }

  /**
   * イベントを追加
   */
  async addEvent(calendarId: string, event: CalendarEvent): Promise<string> {
    const response = await this.calendar.events.insert({
      calendarId: calendarId,
      requestBody: {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: process.env.TIMEZONE || 'Asia/Tokyo',
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: process.env.TIMEZONE || 'Asia/Tokyo',
        },
      },
    });

    return response.data.id!;
  }

  /**
   * 期間を指定してイベント一覧を取得
   */
  async listEvents(
    calendarId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const response = await this.calendar.events.list({
      calendarId: calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    return events.map((item) => ({
      id: item.id,
      summary: item.summary || '',
      description: item.description,
      start: new Date(item.start?.dateTime || item.start?.date || ''),
      end: new Date(item.end?.dateTime || item.end?.date || ''),
      member: '', // この段階では特定できないため空
      location: item.location,
    }));
  }

  /**
   * イベントを削除
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
    });
  }

  /**
   * カレンダーリストを取得
   */
  async listCalendars(): Promise<{ id: string; summary: string }[]> {
    const response = await this.calendar.calendarList.list();
    const calendars = response.data.items || [];

    return calendars.map((cal) => ({
      id: cal.id!,
      summary: cal.summary || '',
    }));
  }

  /**
   * 新しいカレンダーを作成
   */
  async createCalendar(summary: string): Promise<string> {
    const response = await this.calendar.calendars.insert({
      requestBody: {
        summary: summary,
        timeZone: process.env.TIMEZONE || 'Asia/Tokyo',
      },
    });

    return response.data.id!;
  }
}
