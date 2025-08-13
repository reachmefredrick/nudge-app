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
  scheduleTeamsRecurringNotification: (
    title: string,
    description: string,
    interval: number,
    priority?: "low" | "medium" | "high"
  ) => { success: boolean; intervalId: NodeJS.Timeout | null };
  testTeamsConnection: () => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  rescheduleAllReminders: (reminders: any[]) => Promise<{
    success: boolean;
    scheduled: number;
    errors: string[];
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
          teamsContext.signIn();
          // return {
          //   success: false,
          //   error: "Not signed in to Microsoft Teams. Please sign in first.",
          // };
        } else {
          console.log("Teams is authenticated");
        }
        console.log("Selected Channel:", teamsContext.selectedChannel);
        console.log("teams", teamsContext.teams, teamsContext.teams[0]);
        teamsContext.selectTeam(teamsContext.teams[0]);
        const channel = {
          id: "19%3Ab27f80d3cadb424ebc1b825758389d95%40thread.tacv2/The%20Vibe%20Scriptors%20-%20reminders",
          displayName: "The Vibe Scriptors",
          description: "",
          membershipType: "Private",
        };
        teamsContext.selectChannel(channel);

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
        const actionEmojis = {
          created: "✅",
          updated: "📝",
          deleted: "🗑️",
        };

        const actionVerbs = {
          created: "created",
          updated: "updated",
          deleted: "deleted",
        };

        const actionEmoji = actionEmojis[action];
        const actionVerb = actionVerbs[action];

        // Send local notification first
        sendNotification(`Reminder ${actionVerb}`, {
          body: `Your reminder "${reminderTitle}" has been ${actionVerb}.`,
          icon: "/favicon.ico",
        });

        // If Teams is configured, also send to Teams channel
        if (
          teamsContext.isAuthenticated &&
          teamsContext.selectedTeam &&
          teamsContext.selectedChannel
        ) {
          const title = `${actionEmoji} Reminder ${
            actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1)
          }`;
          const description = reminderDateTime
            ? `Your reminder "${reminderTitle}" has been ${actionVerb} and is scheduled for ${reminderDateTime.toLocaleString()}.`
            : `Your reminder "${reminderTitle}" has been ${actionVerb}.`;

          const result = await teamsContext.sendMessage(
            title,
            description,
            priority
          );

          if (result.success) {
            return {
              success: true,
              message: `Teams notification sent for ${actionVerb} reminder to ${teamsContext.selectedTeam.displayName}/${teamsContext.selectedChannel.displayName}.`,
            };
          } else {
            return {
              success: true, // Still success because local notification worked
              message: `Local notification sent for ${actionVerb} reminder. Teams notification failed: ${result.error}`,
            };
          }
        } else {
          return {
            success: true,
            message: `Local notification sent for ${actionVerb} reminder.`,
          };
        }
      } catch (error) {
        console.error("Failed to send notification:", error);
        return {
          success: false,
          error: (error as Error).message,
        };
      }
    },
    [teamsContext, sendNotification]
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

  const scheduleTeamsRecurringNotification = useCallback(
    (
      title: string,
      description: string,
      interval: number,
      priority: "low" | "medium" | "high" = "medium"
    ): { success: boolean; intervalId: NodeJS.Timeout | null } => {
      try {
        const scheduleNext = async () => {
          try {
            console.log(`🔔 Sending Teams recurring notification: ${title}`);

            // Use the Teams context to send to the selected channel
            if (
              teamsContext.isAuthenticated &&
              teamsContext.selectedTeam &&
              teamsContext.selectedChannel
            ) {
              const result = await teamsContext.sendMessage(
                title,
                description,
                priority
              );

              if (result.success) {
                console.log(`✅ Teams recurring notification sent: ${title}`);
              } else {
                console.error(
                  `❌ Teams recurring notification failed: ${result.error}`
                );
              }
            } else {
              console.warn(
                `⚠️ Teams not configured, skipping notification: ${title}`
              );
            }
          } catch (error) {
            console.error(
              "Failed to send Teams recurring notification:",
              error
            );
          }
        };

        // Start the first notification immediately
        scheduleNext();

        // Schedule recurring notifications
        const intervalId = setInterval(scheduleNext, interval);

        console.log(
          `Scheduled Teams recurring notification for "${title}" every ${interval}ms`
        );

        return { success: true, intervalId };
      } catch (error) {
        console.error(
          "Failed to schedule Teams recurring notification:",
          error
        );
        return { success: false, intervalId: null };
      }
    },
    [teamsContext]
  );

  const rescheduleAllReminders = useCallback(
    async (
      reminders: any[]
    ): Promise<{
      success: boolean;
      scheduled: number;
      errors: string[];
    }> => {
      console.log("🔄 Re-scheduling all reminders...", reminders.length);

      const errors: string[] = [];
      let scheduled = 0;

      for (const reminder of reminders) {
        if (!reminder.active) {
          console.log(`⏸️ Skipping inactive reminder: ${reminder.title}`);
          continue;
        }

        try {
          console.log(`📅 Re-scheduling: ${reminder.title}`);

          const reminderTime = new Date(reminder.datetime);
          const now = new Date();
          const delay = reminderTime.getTime() - now.getTime();

          // For recurring reminders, start immediately
          if (reminder.isRecurring) {
            const interval = reminder.recurringInterval || 86400000; // Default to daily

            console.log(
              `🔁 Starting recurring reminder: ${reminder.title} (interval: ${interval}ms)`
            );

            // Start browser notifications
            scheduleRecurringNotification(
              reminder.title,
              {
                body: reminder.description,
                icon: "/favicon.ico",
                tag: `reminder-${reminder.id}`,
              },
              interval
            );

            // Start Teams notifications if enabled
            if (
              reminder.enableTeamsNotification ||
              reminder.teamsNotificationEnabled
            ) {
              console.log(
                `📱 Scheduling Teams recurring notification: ${reminder.title}`
              );
              const result = scheduleTeamsRecurringNotification(
                reminder.title,
                reminder.description,
                interval,
                reminder.priority as "low" | "medium" | "high"
              );

              if (result.success) {
                console.log(
                  `✅ Teams recurring notification scheduled: ${reminder.title}`
                );
              } else {
                console.warn(
                  `⚠️ Teams recurring notification failed: ${reminder.title}`
                );
                errors.push(`Teams scheduling failed for ${reminder.title}`);
              }
            }

            scheduled++;
          }
          // For one-time reminders, only schedule if time hasn't passed
          else if (delay > 0) {
            console.log(
              `⏰ Scheduling one-time reminder: ${reminder.title} (in ${delay}ms)`
            );

            scheduleNotification(
              reminder.title,
              {
                body: reminder.description,
                icon: "/favicon.ico",
                tag: `reminder-${reminder.id}`,
              },
              delay
            );

            // Schedule Teams notification if enabled
            if (
              reminder.enableTeamsNotification ||
              reminder.teamsNotificationEnabled
            ) {
              try {
                const result = await scheduleTeamsReminderNotification(
                  reminder.title,
                  reminder.description,
                  reminderTime,
                  reminder.priority as "low" | "medium" | "high"
                );

                if (result.success) {
                  console.log(
                    `✅ Teams notification scheduled: ${reminder.title}`
                  );
                } else {
                  console.warn(
                    `⚠️ Teams notification failed: ${reminder.title}`
                  );
                  errors.push(
                    `Teams scheduling failed for ${reminder.title}: ${result.error}`
                  );
                }
              } catch (error) {
                console.error(
                  `❌ Error scheduling Teams notification for ${reminder.title}:`,
                  error
                );
                errors.push(
                  `Teams error for ${reminder.title}: ${
                    (error as Error).message
                  }`
                );
              }
            }

            scheduled++;
          } else {
            console.log(`⏭️ Skipping past reminder: ${reminder.title}`);
          }
        } catch (error) {
          console.error(`❌ Failed to schedule ${reminder.title}:`, error);
          errors.push(
            `Failed to schedule ${reminder.title}: ${(error as Error).message}`
          );
        }
      }

      const success = errors.length === 0;
      console.log(
        `🎯 Re-scheduling complete: ${scheduled} scheduled, ${errors.length} errors`
      );

      // Send summary notification
      sendNotification("Reminders Re-scheduled", {
        body: `Successfully scheduled ${scheduled} reminders${
          errors.length > 0 ? ` with ${errors.length} errors` : ""
        }`,
        icon: "/favicon.ico",
      });

      return { success, scheduled, errors };
    },
    [
      scheduleNotification,
      scheduleRecurringNotification,
      scheduleTeamsReminderNotification,
      scheduleTeamsRecurringNotification,
      sendNotification,
    ]
  );

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
    scheduleTeamsRecurringNotification,
    testTeamsConnection,
    rescheduleAllReminders,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
