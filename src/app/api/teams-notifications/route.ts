// API Route for Teams Notifications
// /app/api/teams-notifications/route.ts

import { NextRequest, NextResponse } from "next/server";

// In a production environment, you'd use a proper job queue like Bull, Agenda, or cloud functions
// This is a simplified implementation for demonstration

interface ScheduledNotificationRequest {
  title: string;
  message: string;
  teamId: string;
  channelId: string;
  scheduleTime: string; // ISO string
  priority?: "low" | "medium" | "high";
  recurring?: {
    type: "daily" | "weekly" | "monthly" | "custom";
    interval: number;
    endDate?: string;
    daysOfWeek?: number[];
    dayOfMonth?: number;
  };
}

interface ImmediateNotificationRequest {
  title: string;
  message: string;
  teamId: string;
  channelId: string;
  priority?: "low" | "medium" | "high";
}

// Simple in-memory store for demo (use Redis/database in production)
const scheduledNotifications = new Map<string, any>();
const notificationTimers = new Map<string, NodeJS.Timeout>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "schedule":
        return handleScheduleNotification(body);

      case "schedule-recurring":
        return handleScheduleRecurringNotification(body);

      case "send-immediate":
        return handleSendImmediateNotification(body);

      case "cancel":
        return handleCancelNotification(body);

      case "list":
        return handleListNotifications();

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Teams notification API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleScheduleNotification(
  body: ScheduledNotificationRequest & { action: string }
) {
  const {
    title,
    message,
    teamId,
    channelId,
    scheduleTime,
    priority = "medium",
  } = body;

  if (!title || !message || !teamId || !channelId || !scheduleTime) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const id = generateId();
  const scheduleDate = new Date(scheduleTime);
  const now = new Date();

  if (scheduleDate <= now) {
    return NextResponse.json(
      { error: "Schedule time must be in the future" },
      { status: 400 }
    );
  }

  const notification = {
    id,
    title,
    message,
    teamId,
    channelId,
    priority,
    scheduleTime: scheduleDate,
    createdAt: now,
    isActive: true,
  };

  scheduledNotifications.set(id, notification);

  // Schedule the notification
  const delay = scheduleDate.getTime() - now.getTime();
  const timer = setTimeout(async () => {
    await sendTeamsNotification(notification);
    scheduledNotifications.delete(id);
    notificationTimers.delete(id);
  }, delay);

  notificationTimers.set(id, timer);

  return NextResponse.json({
    success: true,
    notificationId: id,
    message: `Notification scheduled for ${scheduleDate.toISOString()}`,
  });
}

async function handleScheduleRecurringNotification(
  body: ScheduledNotificationRequest & { action: string }
) {
  const {
    title,
    message,
    teamId,
    channelId,
    scheduleTime,
    recurring,
    priority = "medium",
  } = body;

  if (
    !title ||
    !message ||
    !teamId ||
    !channelId ||
    !scheduleTime ||
    !recurring
  ) {
    return NextResponse.json(
      { error: "Missing required fields for recurring notification" },
      { status: 400 }
    );
  }

  const id = generateId();
  const scheduleDate = new Date(scheduleTime);

  const notification = {
    id,
    title,
    message,
    teamId,
    channelId,
    priority,
    scheduleTime: scheduleDate,
    recurring,
    createdAt: new Date(),
    isActive: true,
    nextSend: scheduleDate,
  };

  scheduledNotifications.set(id, notification);
  scheduleRecurringNotification(notification);

  return NextResponse.json({
    success: true,
    notificationId: id,
    message: `Recurring notification scheduled (${recurring.type})`,
  });
}

async function handleSendImmediateNotification(
  body: ImmediateNotificationRequest & { action: string }
) {
  const { title, message, teamId, channelId, priority = "medium" } = body;

  if (!title || !message || !teamId || !channelId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const result = await sendTeamsNotification({
      title,
      message,
      teamId,
      channelId,
      priority,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: "Notification sent successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to send notification",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

async function handleCancelNotification(body: {
  action: string;
  notificationId: string;
}) {
  const { notificationId } = body;

  if (!notificationId) {
    return NextResponse.json(
      { error: "Missing notification ID" },
      { status: 400 }
    );
  }

  const timer = notificationTimers.get(notificationId);
  if (timer) {
    clearTimeout(timer);
    notificationTimers.delete(notificationId);
  }

  const notification = scheduledNotifications.get(notificationId);
  if (notification) {
    notification.isActive = false;
    scheduledNotifications.set(notificationId, notification);
  }

  return NextResponse.json({
    success: true,
    message: "Notification cancelled",
  });
}

async function handleListNotifications() {
  const notifications = Array.from(scheduledNotifications.values());

  return NextResponse.json({
    success: true,
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      teamId: n.teamId,
      channelId: n.channelId,
      scheduleTime: n.scheduleTime,
      recurring: n.recurring,
      isActive: n.isActive,
      createdAt: n.createdAt,
      nextSend: n.nextSend,
    })),
  });
}

function scheduleRecurringNotification(notification: any) {
  const sendNotification = async () => {
    try {
      await sendTeamsNotification(notification);

      // Calculate next send time
      const nextSend = calculateNextSend(new Date(), notification.recurring);
      notification.nextSend = nextSend;

      // Check if we should continue
      if (
        notification.recurring.endDate &&
        nextSend > new Date(notification.recurring.endDate)
      ) {
        notification.isActive = false;
        scheduledNotifications.set(notification.id, notification);
        return;
      }

      // Schedule next occurrence
      const delay = nextSend.getTime() - new Date().getTime();
      if (delay > 0) {
        const timer = setTimeout(sendNotification, delay);
        notificationTimers.set(notification.id, timer);
      }

      scheduledNotifications.set(notification.id, notification);
    } catch (error) {
      console.error("Failed to send recurring notification:", error);
      // Retry logic could be added here
    }
  };

  const now = new Date();
  const delay = notification.nextSend.getTime() - now.getTime();

  if (delay <= 0) {
    sendNotification();
  } else {
    const timer = setTimeout(sendNotification, delay);
    notificationTimers.set(notification.id, timer);
  }
}

function calculateNextSend(fromDate: Date, recurring: any): Date {
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

  return next;
}

async function sendTeamsNotification(
  notification: any
): Promise<{ messageId?: string }> {
  // In a real implementation, you would use Microsoft Graph API here
  // For demo purposes, we'll simulate the API call

  console.log(
    `📤 Sending Teams notification: "${notification.title}" to ${notification.teamId}/${notification.channelId}`
  );

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simulate successful response
  const messageId = `msg_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  // Create adaptive card payload (this would be sent to Graph API)
  const adaptiveCard = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          type: "AdaptiveCard",
          version: "1.2",
          body: [
            {
              type: "Container",
              style: "emphasis",
              items: [
                {
                  type: "TextBlock",
                  text: `🔔 ${notification.title}`,
                  weight: "Bolder",
                  size: "Medium",
                  color: "Accent",
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
                  value: notification.priority?.toUpperCase() || "MEDIUM",
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
              }/reminders`,
            },
          ],
        },
      },
    ],
  };

  // In production, make actual Graph API call:
  /*
  const response = await fetch(`https://graph.microsoft.com/v1.0/teams/${notification.teamId}/channels/${notification.channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(adaptiveCard)
  });
  */

  console.log(
    `✅ Teams notification sent successfully (simulated): ${messageId}`
  );
  return { messageId };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// GET endpoint for retrieving notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "list") {
      return handleListNotifications();
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Teams notification GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
