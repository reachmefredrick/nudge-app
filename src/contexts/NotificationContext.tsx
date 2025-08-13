"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useTeams } from "./TeamsContext";

interface NotificationData {
  id: number;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  permission: NotificationPermission;
  notifications: NotificationData[];
  requestPermission: () => Promise<NotificationPermission>;
  sendNotification: (
    title: string,
    options?: NotificationOptions
  ) => Notification | null;
  scheduleNotification: (
    title: string,
    options: NotificationOptions,
    delay: number
  ) => void;
  scheduleRecurringNotification: (
    title: string,
    options: NotificationOptions,
    interval: number
  ) => void;
  markAsRead: (notificationId: number) => void;
  clearNotifications: () => void;
  sendTeamsAlert: (
    message: string,
    teamMembers?: string[]
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  scheduleTeamsReminderNotification: (
    title: string,
    description: string,
    dueDate: Date,
    priority?: "low" | "medium" | "high"
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  sendTeamsSelfNotification: (
    action: "created" | "updated" | "deleted",
    reminderTitle: string,
    reminderDateTime?: Date,
    priority?: "low" | "medium" | "high"
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  testTeamsConnection: () => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  // Get Teams context for Graph API integration
  const teamsContext = useTeams();

  React.useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission =
    useCallback(async (): Promise<NotificationPermission> => {
      if (typeof window !== "undefined" && "Notification" in window) {
        const result = await Notification.requestPermission();
        setPermission(result);
        return result;
      }
      return "denied";
    }, []);

  const sendNotification = useCallback(
    (title: string, options: NotificationOptions = {}): Notification | null => {
      if (permission === "granted" && typeof window !== "undefined") {
        const notification = new Notification(title, {
          icon: "/logo192.png",
          badge: "/logo192.png",
          ...options,
        });

        // Store notification in state
        const notificationData: NotificationData = {
          id: Date.now(),
          title,
          body: options.body || "",
          timestamp: new Date(),
          read: false,
        };

        setNotifications((prev) => [notificationData, ...prev]);

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        return notification;
      }
      return null;
    },
    [permission]
  );

  const scheduleNotification = useCallback(
    (title: string, options: NotificationOptions, delay: number) => {
      setTimeout(() => {
        sendNotification(title, options);
      }, delay);
    },
    [sendNotification]
  );

  const scheduleRecurringNotification = useCallback(
    (title: string, options: NotificationOptions, interval: number) => {
      const scheduleNext = () => {
        sendNotification(title, options);
        setTimeout(scheduleNext, interval);
      };

      // Start the first notification after the interval
      setTimeout(scheduleNext, interval);
    },
    [sendNotification]
  );

  const markAsRead = useCallback((notificationId: number) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const sendTeamsAlert = useCallback(
    async (message: string, teamMembers: string[] = []) => {
      try {
        if (!teamsContext.isAuthenticated) {
          return {
            success: false,
            error: "Not signed in to Microsoft Teams. Please sign in first.",
          };
        }

        if (!teamsContext.selectedTeam || !teamsContext.selectedChannel) {
          return {
            success: false,
            error:
              "No team or channel selected. Please select a team and channel first.",
          };
        }

        const result = await teamsContext.sendMessage(
          "Nudge App Alert",
          message,
          "medium"
        );

        if (result.success) {
          // Also send local notification
          sendNotification("Teams Alert Sent", {
            body: `Alert sent to ${teamsContext.selectedTeam.displayName} > ${teamsContext.selectedChannel.displayName}: ${message}`,
          });

          return {
            success: true,
            message: "Teams alert sent successfully via Graph API",
          };
        } else {
          return {
            success: false,
            error: result.error || "Failed to send Teams alert",
          };
        }
      } catch (error) {
        console.error("Failed to send Teams alert:", error);
        return { success: false, error: (error as Error).message };
      }
    },
    [teamsContext, sendNotification]
  );

  const scheduleTeamsReminderNotification = useCallback(
    async (
      title: string,
      description: string,
      dueDate: Date,
      priority: "low" | "medium" | "high" = "medium"
    ) => {
      try {
        if (!teamsContext.isAuthenticated) {
          return {
            success: false,
            error: "Not signed in to Microsoft Teams. Please sign in first.",
          };
        }

        if (!teamsContext.selectedTeam || !teamsContext.selectedChannel) {
          return {
            success: false,
            error:
              "No team or channel selected. Please select a team and channel first.",
          };
        }

        const now = new Date();
        const timeUntilDue = dueDate.getTime() - now.getTime();

        // Don't schedule if the due date is in the past
        if (timeUntilDue <= 0) {
          return {
            success: false,
            error: "Cannot schedule notification for past due date",
          };
        }

        try {
          // Schedule the Teams notification using Graph API
          setTimeout(async () => {
            try {
              const result = await teamsContext.sendMessage(
                `Reminder Due: ${title}`,
                `${description}\n\n📅 Due: ${dueDate.toLocaleString()}\n⏰ Priority: ${priority.toUpperCase()}`,
                priority
              );

              if (result.success) {
                console.log(`Teams reminder notification sent for: ${title}`);
              } else {
                console.error(
                  "Failed to send scheduled Teams notification:",
                  result.error
                );
              }
            } catch (error) {
              console.error(
                "Failed to send scheduled Teams notification:",
                error
              );
            }
          }, timeUntilDue);

          // Also schedule browser notification
          scheduleNotification(
            `Reminder Due: ${title}`,
            { body: description },
            timeUntilDue
          );

          const minutesUntilDue = Math.round(timeUntilDue / (1000 * 60));
          return {
            success: true,
            message: `Teams reminder scheduled for ${minutesUntilDue} minutes from now via Graph API`,
          };
        } catch (error) {
          console.error("Failed to schedule Teams reminder:", error);
          return { success: false, error: (error as Error).message };
        }
      } catch (error) {
        console.error("Teams reminder scheduling error:", error);
        return { success: false, error: (error as Error).message };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teamsContext, scheduleNotification]
  );

  const sendTeamsSelfNotification = useCallback(
    async (
      action: "created" | "updated" | "deleted",
      reminderTitle: string,
      reminderDateTime?: Date,
      priority: "low" | "medium" | "high" = "medium"
    ): Promise<{ success: boolean; message?: string; error?: string }> => {
      try {
        // Import teamsIntegrationService dynamically to avoid circular dependency
        const { teamsIntegrationService } = await import(
          "../services/teamsIntegrationService"
        );

        const result =
          await teamsIntegrationService.sendReminderSelfNotification(
            action,
            reminderTitle,
            reminderDateTime,
            priority
          );

        if (result.success !== false) {
          const actionVerb = {
            created: "created",
            updated: "updated",
            deleted: "deleted",
          }[action];

          // Also show a local notification
          sendNotification(`Reminder ${actionVerb}`, {
            body: `Teams notification sent: Your reminder "${reminderTitle}" has been ${actionVerb}.`,
            icon: "/favicon.ico",
          });

          return {
            success: true,
            message: `Self-notification sent for ${actionVerb} reminder.`,
          };
        } else {
          return {
            success: false,
            error: result.error || `Failed to send ${action} self-notification`,
          };
        }
      } catch (error) {
        console.error("Failed to send Teams self-notification:", error);
        return {
          success: false,
          error: (error as Error).message,
        };
      }
    },
    [sendNotification]
  );

  const testTeamsConnection = useCallback(async () => {
    try {
      if (!teamsContext.isAuthenticated) {
        return {
          success: false,
          error:
            "Not signed in to Microsoft Teams. Please sign in first to test the connection.",
        };
      }

      // Test the Graph API connection
      const result = await teamsContext.testConnection();

      if (result.success) {
        // Send a test message if team/channel selected
        if (teamsContext.selectedTeam && teamsContext.selectedChannel) {
          const messageResult = await teamsContext.sendMessage(
            "Connection Test",
            "🧪 This is a test message from your Nudge App. If you can see this, your Microsoft Graph API integration is working correctly!",
            "low"
          );

          if (messageResult.success) {
            sendNotification("Teams Connection Test", {
              body: `Test message sent successfully to ${teamsContext.selectedTeam.displayName} > ${teamsContext.selectedChannel.displayName}`,
            });
            return {
              success: true,
              message: "Teams Graph API connection test successful!",
            };
          } else {
            return {
              success: false,
              error: messageResult.error || "Failed to send test message",
            };
          }
        } else {
          sendNotification("Teams Connection Test", {
            body: "Graph API connection successful! Please select a team and channel to send test messages.",
          });
          return {
            success: true,
            message:
              "Graph API connection successful! Select a team and channel to send messages.",
          };
        }
      } else {
        return {
          success: false,
          error: result.error || "Graph API connection failed",
        };
      }
    } catch (error) {
      console.error("Teams connection test failed:", error);
      return { success: false, error: (error as Error).message };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamsContext, sendNotification]);

  const value: NotificationContextType = {
    permission,
    notifications,
    requestPermission,
    sendNotification,
    scheduleNotification,
    scheduleRecurringNotification,
    markAsRead,
    clearNotifications,
    sendTeamsAlert,
    scheduleTeamsReminderNotification,
    sendTeamsSelfNotification,
    testTeamsConnection,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
