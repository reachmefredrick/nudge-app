"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

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
      // Simulate Teams webhook integration
      const teamsData = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        themeColor: "0076D7",
        summary: "Nudge App Alert",
        sections: [
          {
            activityTitle: "Nudge App Alert",
            activitySubtitle: new Date().toLocaleString(),
            text: message,
            facts: [
              {
                name: "Sent by:",
                value: "Nudge App",
              },
            ],
          },
        ],
      };

      try {
        // In a real app, you would send this to your Teams webhook URL
        console.log("Teams alert would be sent:", teamsData);

        // Also send local notification
        sendNotification("Teams Alert Sent", {
          body: `Alert sent to ${teamMembers.length} team members: ${message}`,
        });

        return { success: true, message: "Teams alert sent successfully" };
      } catch (error) {
        console.error("Failed to send Teams alert:", error);
        return { success: false, error: (error as Error).message };
      }
    },
    [sendNotification]
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
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
