// Teams Integration Service
// src/services/teamsIntegrationService.ts

import { MicrosoftGraphService } from "./microsoftGraphService";
import {
  TeamsNotificationScheduler,
  ScheduledNotification,
} from "./teamsNotificationScheduler";

interface TeamChannel {
  id: string;
  displayName: string;
  webUrl: string;
  membershipType: string;
}

interface Team {
  id: string;
  displayName: string;
  description?: string;
  channels: TeamChannel[];
}

interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  category: "reminder" | "alert" | "info" | "celebration";
  defaultPriority: "low" | "medium" | "high";
}

class TeamsIntegrationService {
  private graphService: MicrosoftGraphService;
  private scheduler: TeamsNotificationScheduler;
  private templates: NotificationTemplate[] = [
    {
      id: "daily-standup",
      name: "Daily Standup Reminder",
      title: "🏃‍♂️ Daily Standup in 15 minutes",
      message:
        "Time for our daily standup! Please join the meeting room or video call.",
      category: "reminder",
      defaultPriority: "medium",
    },
    {
      id: "sprint-review",
      name: "Sprint Review",
      title: "🚀 Sprint Review Today",
      message:
        "Today is sprint review day! Please prepare your demos and updates.",
      category: "alert",
      defaultPriority: "high",
    },
    {
      id: "code-review",
      name: "Code Review Needed",
      title: "👀 Code Review Required",
      message:
        "There are pull requests waiting for your review. Please check them when you have a moment.",
      category: "reminder",
      defaultPriority: "medium",
    },
    {
      id: "deployment",
      name: "Deployment Notification",
      title: "🚢 Deployment Complete",
      message:
        "The latest version has been successfully deployed to production. All systems are green!",
      category: "info",
      defaultPriority: "medium",
    },
    {
      id: "milestone",
      name: "Milestone Achieved",
      title: "🎉 Milestone Reached!",
      message:
        "Congratulations team! We've successfully reached our sprint milestone.",
      category: "celebration",
      defaultPriority: "high",
    },
  ];

  constructor() {
    this.graphService = new MicrosoftGraphService();
    this.scheduler = new TeamsNotificationScheduler();
  }

  /**
   * Get all teams the user has access to
   */
  async getUserTeams(): Promise<Team[]> {
    try {
      const teams = await this.graphService.getMyTeams();

      // Get channels for each team
      const teamsWithChannels = await Promise.all(
        teams.map(async (team: any) => {
          const channels = await this.getTeamChannels(team.id);
          return {
            id: team.id,
            displayName: team.displayName,
            description: team.description,
            channels,
          };
        })
      );

      return teamsWithChannels;
    } catch (error) {
      console.error("Error fetching user teams:", error);
      throw new Error("Failed to fetch teams");
    }
  }

  /**
   * Get channels for a specific team
   */
  async getTeamChannels(teamId: string): Promise<TeamChannel[]> {
    try {
      const channels = await this.graphService.getTeamChannels(teamId);
      return channels.map((channel: any) => ({
        id: channel.id,
        displayName: channel.displayName,
        webUrl: channel.webUrl,
        membershipType: channel.membershipType,
      }));
    } catch (error) {
      console.error(`Error fetching channels for team ${teamId}:`, error);
      return [];
    }
  }

  /**
   * Send an immediate notification using a template
   */
  async sendTemplateNotification(
    templateId: string,
    teamId: string,
    channelId: string,
    customizations?: {
      title?: string;
      message?: string;
      priority?: "low" | "medium" | "high";
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const template = this.templates.find((t) => t.id === templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      const notification = {
        title: customizations?.title || template.title,
        message: customizations?.message || template.message,
        priority: customizations?.priority || template.defaultPriority,
        teamId,
        channelId,
      };

      const result = await this.graphService.sendChannelMessage(
        teamId,
        channelId,
        notification.title,
        notification.message,
        notification.priority
      );

      return {
        success: true,
        messageId: result.id,
      };
    } catch (error) {
      console.error("Error sending template notification:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Schedule a recurring notification using a template
   */
  async scheduleTemplateNotification(
    templateId: string,
    teamId: string,
    channelId: string,
    schedule: {
      startTime: Date;
      recurrence: {
        type: "daily" | "weekly" | "monthly";
        interval: number;
        daysOfWeek?: number[];
        endDate?: Date;
      };
    },
    customizations?: {
      title?: string;
      message?: string;
      priority?: "low" | "medium" | "high";
    }
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const template = this.templates.find((t) => t.id === templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      const notification: Omit<
        ScheduledNotification,
        "id" | "createdAt" | "isActive"
      > = {
        title: customizations?.title || template.title,
        message: customizations?.message || template.message,
        priority: customizations?.priority || template.defaultPriority,
        teamId,
        channelId,
        scheduleTime: schedule.startTime,
        recurring: {
          type: schedule.recurrence.type,
          interval: schedule.recurrence.interval,
          daysOfWeek: schedule.recurrence.daysOfWeek,
          endDate: schedule.recurrence.endDate,
        },
      };

      const notificationId = await this.scheduler.scheduleNotification(
        notification.title,
        notification.message,
        notification.teamId,
        notification.channelId,
        notification.scheduleTime,
        notification.priority
      );

      return {
        success: true,
        notificationId,
      };
    } catch (error) {
      console.error("Error scheduling template notification:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get all available notification templates
   */
  getNotificationTemplates(): NotificationTemplate[] {
    return this.templates;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(
    category: NotificationTemplate["category"]
  ): NotificationTemplate[] {
    return this.templates.filter((template) => template.category === category);
  }

  /**
   * Create preset schedules for common scenarios
   */
  createPresetSchedules() {
    return {
      // Daily standup at 9:15 AM
      dailyStandup: {
        template: "daily-standup",
        schedule: {
          startTime: this.getNextWeekdayTime(9, 15), // 9:15 AM
          recurrence: {
            type: "daily" as const,
            interval: 1,
            daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
          },
        },
      },

      // Weekly sprint review reminder on Fridays at 2 PM
      weeklySprintReview: {
        template: "sprint-review",
        schedule: {
          startTime: this.getNextFridayTime(14, 0), // 2:00 PM Friday
          recurrence: {
            type: "weekly" as const,
            interval: 1,
            daysOfWeek: [5], // Friday
          },
        },
      },

      // Daily code review reminder at 11 AM
      dailyCodeReview: {
        template: "code-review",
        schedule: {
          startTime: this.getNextWeekdayTime(11, 0), // 11:00 AM
          recurrence: {
            type: "daily" as const,
            interval: 1,
            daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
          },
        },
      },
    };
  }

  /**
   * Schedule a preset notification
   */
  async schedulePresetNotification(
    presetName: keyof ReturnType<typeof this.createPresetSchedules>,
    teamId: string,
    channelId: string,
    endDate?: Date
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    const presets = this.createPresetSchedules();
    const preset = presets[presetName];

    if (!preset) {
      return { success: false, error: "Preset not found" };
    }

    const schedule = {
      ...preset.schedule,
      recurrence: {
        ...preset.schedule.recurrence,
        endDate,
      },
    };

    return this.scheduleTemplateNotification(
      preset.template,
      teamId,
      channelId,
      schedule
    );
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    return this.scheduler.getScheduledNotifications();
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelScheduledNotification(notificationId: string): Promise<boolean> {
    return this.scheduler.cancelNotification(notificationId);
  }

  /**
   * Create an adaptive card for Teams message
   */
  private createAdaptiveCard(notification: {
    title: string;
    message: string;
    priority: "low" | "medium" | "high";
  }) {
    const priorityColors = {
      low: "Good",
      medium: "Warning",
      high: "Attention",
    };

    const priorityEmojis = {
      low: "ℹ️",
      medium: "⚠️",
      high: "🚨",
    };

    return {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            type: "AdaptiveCard",
            version: "1.3",
            body: [
              {
                type: "Container",
                style: "emphasis",
                items: [
                  {
                    type: "TextBlock",
                    text: `${priorityEmojis[notification.priority]} ${
                      notification.title
                    }`,
                    weight: "Bolder",
                    size: "Medium",
                    color: priorityColors[notification.priority],
                  },
                ],
              },
              {
                type: "TextBlock",
                text: notification.message,
                wrap: true,
                spacing: "Medium",
              },
              {
                type: "FactSet",
                facts: [
                  {
                    title: "Priority:",
                    value: notification.priority.toUpperCase(),
                  },
                  {
                    title: "Sent by:",
                    value: "Nudge App",
                  },
                  {
                    title: "Time:",
                    value: new Date().toLocaleString(),
                  },
                ],
              },
            ],
            actions: [
              {
                type: "Action.OpenUrl",
                title: "Open Nudge App",
                url: `${
                  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
                }/dashboard`,
              },
            ],
          },
        },
      ],
    };
  }

  /**
   * Helper to get next weekday at specified time
   */
  private getNextWeekdayTime(hour: number, minute: number): Date {
    const now = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);

    // If time has passed today, move to next weekday
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    // If it's weekend, move to Monday
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Helper to get next Friday at specified time
   */
  private getNextFridayTime(hour: number, minute: number): Date {
    const now = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);

    // Calculate days until Friday
    const daysUntilFriday = (5 - next.getDay() + 7) % 7;
    if (daysUntilFriday === 0 && next <= now) {
      // If it's Friday but time has passed, move to next Friday
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + daysUntilFriday);
    }

    return next;
  }
}

export const teamsIntegrationService = new TeamsIntegrationService();
export type { Team, TeamChannel, NotificationTemplate };
