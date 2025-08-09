// Teams Notification Scheduler Service
// Handles recurring and scheduled notifications to Microsoft Teams from Next.js

import { graphService } from "./microsoftGraphService";

export interface ScheduledNotification {
  id: string;
  title: string;
  message: string;
  teamId: string;
  channelId: string;
  priority: "low" | "medium" | "high";
  scheduleTime: Date;
  recurring?: {
    type: "daily" | "weekly" | "monthly" | "custom";
    interval: number; // for custom intervals (in milliseconds)
    endDate?: Date;
    daysOfWeek?: number[]; // 0-6, where 0 is Sunday
    dayOfMonth?: number; // 1-31 for monthly
  };
  isActive: boolean;
  createdAt: Date;
  lastSent?: Date;
  nextSend?: Date;
  metadata?: Record<string, any>;
}

export interface NotificationHistory {
  id: string;
  notificationId: string;
  sentAt: Date;
  success: boolean;
  error?: string;
  teamId: string;
  channelId: string;
  messageId?: string;
}

export class TeamsNotificationScheduler {
  private notifications: Map<string, ScheduledNotification> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private history: NotificationHistory[] = [];
  private isInitialized = false;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Initialize the scheduler and start all active notifications
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await graphService.initialize();
      this.startAllActiveNotifications();
      this.isInitialized = true;
      console.log("🚀 Teams Notification Scheduler initialized");
    } catch (error) {
      console.error(
        "Failed to initialize Teams Notification Scheduler:",
        error
      );
      throw error;
    }
  }

  /**
   * Schedule a one-time notification
   */
  async scheduleNotification(
    title: string,
    message: string,
    teamId: string,
    channelId: string,
    scheduleTime: Date,
    priority: "low" | "medium" | "high" = "medium",
    metadata?: Record<string, any>
  ): Promise<string> {
    const id = this.generateId();

    const notification: ScheduledNotification = {
      id,
      title,
      message,
      teamId,
      channelId,
      priority,
      scheduleTime,
      isActive: true,
      createdAt: new Date(),
      nextSend: scheduleTime,
      metadata,
    };

    this.notifications.set(id, notification);
    this.scheduleTimer(notification);
    this.saveToStorage();

    console.log(
      `📅 Scheduled notification "${title}" for ${scheduleTime.toISOString()}`
    );
    return id;
  }

  /**
   * Schedule a recurring notification
   */
  async scheduleRecurringNotification(
    title: string,
    message: string,
    teamId: string,
    channelId: string,
    scheduleTime: Date,
    recurring: ScheduledNotification["recurring"],
    priority: "low" | "medium" | "high" = "medium",
    metadata?: Record<string, any>
  ): Promise<string> {
    const id = this.generateId();

    const notification: ScheduledNotification = {
      id,
      title,
      message,
      teamId,
      channelId,
      priority,
      scheduleTime,
      recurring,
      isActive: true,
      createdAt: new Date(),
      nextSend: this.calculateNextSend(scheduleTime, recurring),
      metadata,
    };

    this.notifications.set(id, notification);
    this.scheduleTimer(notification);
    this.saveToStorage();

    console.log(
      `🔄 Scheduled recurring notification "${title}" - ${recurring?.type}`
    );
    return id;
  }

  /**
   * Cancel a scheduled notification
   */
  cancelNotification(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification) return false;

    // Clear the timer
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    // Mark as inactive
    notification.isActive = false;
    this.notifications.set(id, notification);
    this.saveToStorage();

    console.log(`❌ Cancelled notification "${notification.title}"`);
    return true;
  }

  /**
   * Pause a notification (can be resumed)
   */
  pauseNotification(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification) return false;

    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    notification.isActive = false;
    this.notifications.set(id, notification);
    this.saveToStorage();

    return true;
  }

  /**
   * Resume a paused notification
   */
  resumeNotification(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification) return false;

    notification.isActive = true;

    // Recalculate next send time if it's in the past
    if (notification.nextSend && notification.nextSend < new Date()) {
      if (notification.recurring) {
        notification.nextSend = this.calculateNextSend(
          new Date(),
          notification.recurring
        );
      } else {
        // For one-time notifications, don't resume if past due
        return false;
      }
    }

    this.notifications.set(id, notification);
    this.scheduleTimer(notification);
    this.saveToStorage();

    return true;
  }

  /**
   * Get all scheduled notifications
   */
  getScheduledNotifications(): ScheduledNotification[] {
    return Array.from(this.notifications.values());
  }

  /**
   * Get notification history
   */
  getNotificationHistory(limit: number = 50): NotificationHistory[] {
    return this.history
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
      .slice(0, limit);
  }

  /**
   * Send immediate notification to Teams
   */
  async sendImmediateNotification(
    title: string,
    message: string,
    teamId: string,
    channelId: string,
    priority: "low" | "medium" | "high" = "medium"
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await graphService.sendChannelMessage(
        teamId,
        channelId,
        title,
        message,
        priority
      );

      const historyEntry: NotificationHistory = {
        id: this.generateId(),
        notificationId: "immediate",
        sentAt: new Date(),
        success: true,
        teamId,
        channelId,
        messageId: response.id,
      };

      this.history.push(historyEntry);
      this.saveToStorage();

      console.log(`✅ Immediate notification sent: "${title}"`);
      return { success: true, messageId: response.id };
    } catch (error) {
      const historyEntry: NotificationHistory = {
        id: this.generateId(),
        notificationId: "immediate",
        sentAt: new Date(),
        success: false,
        teamId,
        channelId,
        error: (error as Error).message,
      };

      this.history.push(historyEntry);
      this.saveToStorage();

      console.error(
        `❌ Failed to send immediate notification: "${title}"`,
        error
      );
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Private method to schedule a timer for a notification
   */
  private scheduleTimer(notification: ScheduledNotification): void {
    if (!notification.isActive || !notification.nextSend) return;

    const now = new Date();
    const delay = notification.nextSend.getTime() - now.getTime();

    if (delay <= 0) {
      // Send immediately if past due
      this.sendNotification(notification);
      return;
    }

    const timer = setTimeout(() => {
      this.sendNotification(notification);
    }, delay);

    this.timers.set(notification.id, timer);
    console.log(
      `⏰ Timer set for "${notification.title}" in ${Math.round(
        delay / 1000
      )} seconds`
    );
  }

  /**
   * Send a scheduled notification
   */
  private async sendNotification(
    notification: ScheduledNotification
  ): Promise<void> {
    try {
      const response = await graphService.sendChannelMessage(
        notification.teamId,
        notification.channelId,
        notification.title,
        notification.message,
        notification.priority
      );

      // Record successful send
      const historyEntry: NotificationHistory = {
        id: this.generateId(),
        notificationId: notification.id,
        sentAt: new Date(),
        success: true,
        teamId: notification.teamId,
        channelId: notification.channelId,
        messageId: response.id,
      };

      this.history.push(historyEntry);
      notification.lastSent = new Date();

      // Handle recurring notifications
      if (notification.recurring) {
        notification.nextSend = this.calculateNextSend(
          new Date(),
          notification.recurring
        );

        // Check if we should continue (end date)
        if (
          notification.recurring.endDate &&
          notification.nextSend > notification.recurring.endDate
        ) {
          notification.isActive = false;
          console.log(
            `🔄 Recurring notification "${notification.title}" has reached end date`
          );
        } else {
          this.scheduleTimer(notification);
        }
      } else {
        // One-time notification completed
        notification.isActive = false;
      }

      this.notifications.set(notification.id, notification);
      this.saveToStorage();

      console.log(`✅ Notification sent: "${notification.title}"`);
    } catch (error) {
      // Record failed send
      const historyEntry: NotificationHistory = {
        id: this.generateId(),
        notificationId: notification.id,
        sentAt: new Date(),
        success: false,
        teamId: notification.teamId,
        channelId: notification.channelId,
        error: (error as Error).message,
      };

      this.history.push(historyEntry);
      this.saveToStorage();

      console.error(
        `❌ Failed to send notification: "${notification.title}"`,
        error
      );

      // For recurring notifications, try again at next interval
      if (notification.recurring) {
        notification.nextSend = this.calculateNextSend(
          new Date(),
          notification.recurring
        );
        this.scheduleTimer(notification);
      }
    }
  }

  /**
   * Calculate next send time for recurring notifications
   */
  private calculateNextSend(
    fromDate: Date,
    recurring: ScheduledNotification["recurring"]
  ): Date {
    if (!recurring) return fromDate;

    const next = new Date(fromDate);

    switch (recurring.type) {
      case "daily":
        next.setDate(next.getDate() + recurring.interval);
        break;

      case "weekly":
        next.setDate(next.getDate() + 7 * recurring.interval);
        break;

      case "monthly":
        next.setMonth(next.getMonth() + recurring.interval);
        if (recurring.dayOfMonth) {
          next.setDate(recurring.dayOfMonth);
        }
        break;

      case "custom":
        next.setTime(next.getTime() + recurring.interval);
        break;
    }

    // Handle days of week for weekly recurring
    if (recurring.type === "weekly" && recurring.daysOfWeek) {
      const targetDay = recurring.daysOfWeek[0]; // Use first day for simplicity
      const currentDay = next.getDay();
      const daysToAdd = (targetDay - currentDay + 7) % 7;
      next.setDate(next.getDate() + daysToAdd);
    }

    return next;
  }

  /**
   * Start all active notifications on initialization
   */
  private startAllActiveNotifications(): void {
    for (const notification of this.notifications.values()) {
      if (notification.isActive && notification.nextSend) {
        this.scheduleTimer(notification);
      }
    }
  }

  /**
   * Save state to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === "undefined") return;

    const data = {
      notifications: Array.from(this.notifications.entries()),
      history: this.history.slice(-100), // Keep last 100 history entries
    };

    localStorage.setItem("teamsNotificationScheduler", JSON.stringify(data));
  }

  /**
   * Load state from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem("teamsNotificationScheduler");
      if (stored) {
        const data = JSON.parse(stored);

        // Restore notifications
        this.notifications = new Map(
          data.notifications.map(([id, notification]: [string, any]) => [
            id,
            {
              ...notification,
              scheduleTime: new Date(notification.scheduleTime),
              createdAt: new Date(notification.createdAt),
              lastSent: notification.lastSent
                ? new Date(notification.lastSent)
                : undefined,
              nextSend: notification.nextSend
                ? new Date(notification.nextSend)
                : undefined,
              recurring: notification.recurring
                ? {
                    ...notification.recurring,
                    endDate: notification.recurring.endDate
                      ? new Date(notification.recurring.endDate)
                      : undefined,
                  }
                : undefined,
            },
          ])
        );

        // Restore history
        this.history = data.history.map((entry: any) => ({
          ...entry,
          sentAt: new Date(entry.sentAt),
        }));
      }
    } catch (error) {
      console.error("Failed to load scheduler state from storage:", error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data (for testing/reset)
   */
  clearAllData(): void {
    // Cancel all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.notifications.clear();
    this.timers.clear();
    this.history = [];

    if (typeof window !== "undefined") {
      localStorage.removeItem("teamsNotificationScheduler");
    }

    console.log("🗑️ All notification data cleared");
  }
}

// Export singleton instance
export const teamsScheduler = new TeamsNotificationScheduler();

// Helper functions for common scheduling patterns
export const SchedulingHelpers = {
  /**
   * Schedule daily notification at specific time
   */
  async scheduleDailyAt(
    title: string,
    message: string,
    teamId: string,
    channelId: string,
    hour: number,
    minute: number = 0,
    priority: "low" | "medium" | "high" = "medium"
  ): Promise<string> {
    const now = new Date();
    const scheduleTime = new Date();
    scheduleTime.setHours(hour, minute, 0, 0);

    // If time has passed today, start tomorrow
    if (scheduleTime <= now) {
      scheduleTime.setDate(scheduleTime.getDate() + 1);
    }

    return teamsScheduler.scheduleRecurringNotification(
      title,
      message,
      teamId,
      channelId,
      scheduleTime,
      { type: "daily", interval: 1 },
      priority
    );
  },

  /**
   * Schedule weekly notification on specific day
   */
  async scheduleWeeklyOn(
    title: string,
    message: string,
    teamId: string,
    channelId: string,
    dayOfWeek: number, // 0-6, where 0 is Sunday
    hour: number,
    minute: number = 0,
    priority: "low" | "medium" | "high" = "medium"
  ): Promise<string> {
    const now = new Date();
    const scheduleTime = new Date();

    // Calculate next occurrence of the day
    const daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7;
    scheduleTime.setDate(now.getDate() + daysUntilTarget);
    scheduleTime.setHours(hour, minute, 0, 0);

    // If we're on the target day but past the time, schedule for next week
    if (daysUntilTarget === 0 && scheduleTime <= now) {
      scheduleTime.setDate(scheduleTime.getDate() + 7);
    }

    return teamsScheduler.scheduleRecurringNotification(
      title,
      message,
      teamId,
      channelId,
      scheduleTime,
      { type: "weekly", interval: 1, daysOfWeek: [dayOfWeek] },
      priority
    );
  },

  /**
   * Schedule monthly notification on specific day
   */
  async scheduleMonthlyOn(
    title: string,
    message: string,
    teamId: string,
    channelId: string,
    dayOfMonth: number, // 1-31
    hour: number,
    minute: number = 0,
    priority: "low" | "medium" | "high" = "medium"
  ): Promise<string> {
    const now = new Date();
    const scheduleTime = new Date();
    scheduleTime.setDate(dayOfMonth);
    scheduleTime.setHours(hour, minute, 0, 0);

    // If date has passed this month, schedule for next month
    if (scheduleTime <= now) {
      scheduleTime.setMonth(scheduleTime.getMonth() + 1);
    }

    return teamsScheduler.scheduleRecurringNotification(
      title,
      message,
      teamId,
      channelId,
      scheduleTime,
      { type: "monthly", interval: 1, dayOfMonth },
      priority
    );
  },
};
