"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Schedule,
  Repeat,
  NotificationImportant,
  Groups,
  BugReport,
  PlayArrow,
  Refresh,
} from "@mui/icons-material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useNotification } from "@/contexts/NotificationContext";
import { useTeams } from "@/contexts/TeamsContext";
import { useAuth } from "@/contexts/AuthContext";
import { userStorageService } from "@/services/userStorageService";
import { hybridFileStorageService } from "@/services/hybridFileStorageService";
import ProtectedLayout from "@/components/ProtectedLayout";
import type { ReminderData as SharedReminderData } from "@/types/shared";

// Local interface for component state (dates as Date objects)
interface ReminderData {
  id: number;
  title: string;
  description: string;
  datetime: Date;
  priority: string;
  isRecurring: boolean;
  recurringType: string;
  recurringInterval: number;
  active: boolean;
  createdAt: Date;
  enableTeamsNotification: boolean;
  teamsNotificationEnabled?: boolean;
}

interface StoredReminderData {
  id: number;
  title: string;
  description: string;
  datetime: string; // Date stored as string in JSON
  priority: string;
  isRecurring: boolean;
  recurringType: string;
  recurringInterval: number;
  active: boolean;
  createdAt: string; // Date stored as string in JSON
  enableTeamsNotification: boolean;
  teamsNotificationEnabled?: boolean;
}

interface FormData {
  title: string;
  description: string;
  datetime: Date;
  priority: string;
  isRecurring: boolean;
  recurringType: string;
  recurringInterval: number;
  teamsNotificationEnabled: boolean;
}

export default function RemindersPage() {
  // Only log during client-side execution
  if (typeof window !== "undefined") {
    console.log("🎯 RemindersPage component rendering...");
  }

  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [open, setOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderData | null>(
    null
  );
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    datetime: new Date(),
    priority: "medium",
    isRecurring: false,
    recurringType: "daily",
    recurringInterval: 1,
    teamsNotificationEnabled: false,
  });

  // Use ref to track if we're in initial load to prevent save loop
  const isInitialLoadRef = useRef(true);

  const {
    sendNotification,
    scheduleNotification,
    scheduleRecurringNotification,
    scheduleTeamsReminderNotification,
    scheduleTeamsRecurringNotification,
    sendTeamsSelfNotification,
    testTeamsConnection,
    rescheduleAllReminders,
    clearAllTimers,
  } = useNotification();

  const teamsContext = useTeams();
  const { user } = useAuth();

  // Only log during client-side execution
  if (typeof window !== "undefined") {
    console.log("👤 Current user in RemindersPage:", user);
  }

  useEffect(() => {
    // Skip loading during static generation or when running on server
    if (typeof window === "undefined") {
      console.log("⏭️ Skipping reminders loading during static generation");
      return;
    }

    console.log("📦 Loading reminders useEffect triggered");
    // Initialize hybrid file storage
    hybridFileStorageService.initialize();

    // Load reminders from localStorage for the current user OR use default user ID for testing
    const currentUserId = user?.id || 1; // Default to user ID 1 for testing
    console.log("🔧 Using user ID for reminders:", currentUserId);

    // Test: Try to load reminders directly from file
    console.log("🧪 Testing direct file access...");
    try {
      const directReminders =
        userStorageService.getUserReminders(currentUserId);
      console.log("📋 Direct reminders result:", directReminders);
    } catch (error) {
      console.error("❌ Error loading direct reminders:", error);
    }

    if (currentUserId) {
      // Migrate old global data if it exists
      userStorageService.migrateGlobalDataToUser(currentUserId);

      const storedReminders =
        userStorageService.getUserReminders(currentUserId);
      console.log("📦 Loaded reminders from storage:", storedReminders);

      if (storedReminders.length > 0) {
        console.log("✅ Setting reminders in state:", storedReminders.length);
        setReminders(
          storedReminders.map((r: StoredReminderData) => ({
            ...r,
            datetime: new Date(r.datetime),
            createdAt: new Date(r.createdAt),
            enableTeamsNotification:
              r.enableTeamsNotification ?? r.teamsNotificationEnabled ?? false,
          }))
        );
      } else {
        console.log("📭 No stored reminders found");
      }
    } else {
      console.log("🚫 No user ID available, clearing reminders");
      // Clear reminders if no user is logged in
      setReminders([]);
    }
  }, [user]);

  useEffect(() => {
    // Skip saving during static generation or when running on server
    if (typeof window === "undefined") {
      return;
    }

    // Skip saving during initial load to prevent loops
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    // Save reminders to localStorage for the current user
    if (user && reminders.length >= 0) {
      const remindersToStore = reminders.map((r) => ({
        ...r,
        datetime: r.datetime.toISOString(),
        createdAt: r.createdAt.toISOString(),
      }));

      userStorageService.saveUserReminders(user.id, remindersToStore);
    }
  }, [reminders, user]);

  // Clear any existing timers when component mounts to prevent duplicates
  useEffect(() => {
    // Skip during static generation or when running on server
    if (typeof window === "undefined") {
      return;
    }

    console.log("🧹 Clearing existing timers on component mount...");
    clearAllTimers();
  }, []); // Empty dependency array - only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleOpen = (reminder: ReminderData | null = null) => {
    if (reminder) {
      setEditingReminder(reminder);
      setFormData({
        title: reminder.title,
        description: reminder.description,
        datetime: reminder.datetime,
        priority: reminder.priority,
        isRecurring: reminder.isRecurring || false,
        recurringType: reminder.recurringType || "daily",
        recurringInterval: reminder.recurringInterval || 1,
        teamsNotificationEnabled: reminder.teamsNotificationEnabled || false,
      });
    } else {
      setEditingReminder(null);
      setFormData({
        title: "",
        description: "",
        datetime: new Date(),
        priority: "medium",
        isRecurring: false,
        recurringType: "daily",
        recurringInterval: 1,
        teamsNotificationEnabled: false,
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingReminder(null);
  };

  const handleSave = async () => {
    const newReminder: ReminderData = {
      id: editingReminder ? editingReminder.id : Date.now(),
      ...formData,
      enableTeamsNotification: formData.teamsNotificationEnabled,
      createdAt: editingReminder ? editingReminder.createdAt : new Date(),
      active: true,
    };

    if (editingReminder) {
      // Update existing reminder
      setReminders((prev) =>
        prev.map((r) => (r.id === editingReminder.id ? newReminder : r))
      );

      // Update in file storage
      if (user) {
        const reminderToStore = {
          ...newReminder,
          datetime: newReminder.datetime.toISOString(),
          createdAt: newReminder.createdAt.toISOString(),
        };
        userStorageService.updateReminderInFile(
          user.id,
          newReminder.id,
          reminderToStore
        );

        // Also update in hybrid file storage for actual JSON file capture
        hybridFileStorageService
          .updateReminderInFile(user.id, newReminder.id, reminderToStore)
          .catch((error) => {
            console.error("Failed to update reminder in file storage:", error);
          });
      }
    } else {
      // Add new reminder
      setReminders((prev) => [...prev, newReminder]);

      // Add to file storage
      if (user) {
        const reminderToStore = {
          ...newReminder,
          datetime: newReminder.datetime.toISOString(),
          createdAt: newReminder.createdAt.toISOString(),
        };

        userStorageService.addReminderToFile(user.id, reminderToStore);

        // Also add to hybrid file storage for actual JSON file capture
        hybridFileStorageService
          .addReminderToFile(user.id, reminderToStore)
          .catch((error) => {
            console.error("Failed to add reminder to file storage:", error);
          });
      }
    }

    // Schedule the notification
    await scheduleReminderNotification(newReminder);

    // Send Teams self-notification if enabled
    if (newReminder.enableTeamsNotification) {
      try {
        const action = editingReminder ? "updated" : "created";
        await sendTeamsSelfNotification(
          action,
          newReminder.title,
          newReminder.datetime,
          newReminder.priority as "low" | "medium" | "high"
        );
      } catch (error) {
        console.error("Failed to send Teams self-notification:", error);
        // Continue execution even if self-notification fails
      }
    }

    handleClose();
  };

  const scheduleReminderNotification = async (reminder: ReminderData) => {
    console.log(
      `🔔 scheduleReminderNotification called for: ${reminder.title}`
    );
    const now = new Date();
    const reminderTime = new Date(reminder.datetime);
    const delay = reminderTime.getTime() - now.getTime();

    console.log(
      `⏰ Reminder time: ${reminderTime.toISOString()}, Now: ${now.toISOString()}, Delay: ${delay}ms`
    );

    // For recurring reminders, start immediately regardless of past datetime
    if (reminder.isRecurring) {
      console.log(`🔄 Processing recurring reminder: ${reminder.title}`);
      const intervals: { [key: string]: number } = {
        minute: 1 * 60 * 1000,
        every5minutes: 5 * 60 * 1000,
        daily: 24 * 60 * 60 * 1000,
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000,
      };

      const interval =
        intervals[reminder.recurringType] * reminder.recurringInterval;

      console.log(
        `⚡ Calculated interval: ${interval}ms for type: ${reminder.recurringType}`
      );

      // Start browser notifications immediately for recurring reminders
      scheduleRecurringNotification(
        reminder.title,
        {
          body: reminder.description,
          icon: "/logo192.png",
          tag: `reminder-${reminder.id}`,
        },
        interval
      );

      // Schedule Teams recurring notification if enabled
      if (reminder.teamsNotificationEnabled) {
        console.log(
          `📱 Teams notifications enabled, scheduling Teams recurring notification...`
        );
        try {
          const result = scheduleTeamsRecurringNotification(
            reminder.title,
            reminder.description,
            interval,
            reminder.priority as "low" | "medium" | "high"
          );

          if (result.success) {
            console.log(
              "✅ Teams recurring notification scheduled:",
              reminder.title
            );
          } else {
            console.warn(
              "⚠️ Teams recurring notification failed for:",
              reminder.title
            );
          }
        } catch (error) {
          console.error(
            "❌ Error scheduling Teams recurring notification:",
            error
          );
        }
      } else {
        console.log(`📱 Teams notifications disabled for: ${reminder.title}`);
      }
    } else if (delay > 0) {
      console.log(
        `📅 Processing one-time reminder: ${reminder.title} (will fire in ${delay}ms)`
      );
      // For non-recurring reminders, only schedule if time hasn't passed
      scheduleNotification(
        reminder.title,
        {
          body: reminder.description,
          icon: "/logo192.png",
          tag: `reminder-${reminder.id}`,
        },
        delay
      );

      // Schedule one-time Teams notification if enabled
      if (reminder.teamsNotificationEnabled) {
        try {
          const result = await scheduleTeamsReminderNotification(
            reminder.title,
            reminder.description,
            reminderTime,
            reminder.priority as "low" | "medium" | "high"
          );

          if (result.success) {
            console.log("Teams notification scheduled:", result.message);
          } else {
            console.warn("Teams notification failed:", result.error);
          }
        } catch (error) {
          console.error("Error scheduling Teams notification:", error);
        }
      }
    } else {
      console.log(
        `⏭️ Skipping past reminder: ${reminder.title} (was ${Math.abs(
          delay
        )}ms ago)`
      );
    }
  };

  const handleDelete = async (id: number) => {
    // Find the reminder being deleted for self-notification
    const reminderToDelete = reminders.find((r) => r.id === id);

    setReminders((prev) => prev.filter((r) => r.id !== id));

    // Delete from file storage
    if (user) {
      userStorageService.deleteReminderFromFile(user.id, id);

      // Also delete from hybrid file storage for actual JSON file capture
      hybridFileStorageService
        .deleteReminderFromFile(user.id, id)
        .catch((error) => {
          console.error("Failed to delete reminder from file storage:", error);
        });
    }

    // Send Teams self-notification if the reminder had Teams notifications enabled
    if (reminderToDelete && reminderToDelete.enableTeamsNotification) {
      try {
        await sendTeamsSelfNotification(
          "deleted",
          reminderToDelete.title,
          reminderToDelete.datetime,
          reminderToDelete.priority as "low" | "medium" | "high"
        );
      } catch (error) {
        console.error("Failed to send Teams delete self-notification:", error);
        // Continue execution even if self-notification fails
      }
    }
  };

  const toggleActive = (id: number) => {
    setReminders((prev) => {
      const updatedReminders = prev.map((r) =>
        r.id === id ? { ...r, active: !r.active } : r
      );

      // Update in file storage
      if (user) {
        const updatedReminder = updatedReminders.find((r) => r.id === id);
        if (updatedReminder) {
          const reminderToStore = {
            ...updatedReminder,
            datetime: updatedReminder.datetime.toISOString(),
            createdAt: updatedReminder.createdAt.toISOString(),
          };
          userStorageService.updateReminderInFile(user.id, id, reminderToStore);
        }
      }

      return updatedReminders;
    });
  };

  const testReminder = (reminder: ReminderData) => {
    sendNotification(reminder.title, {
      body: reminder.description,
      icon: "/logo192.png",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "default";
    }
  };

  const formatRecurring = (reminder: ReminderData) => {
    if (!reminder.isRecurring) return "";

    // Handle special cases for minute-based intervals
    if (reminder.recurringType === "every5minutes") {
      return "Repeats every 5 minutes";
    }

    if (reminder.recurringType === "minute") {
      const interval =
        reminder.recurringInterval > 1 ? `${reminder.recurringInterval} ` : "";
      const type = reminder.recurringInterval > 1 ? "minutes" : "minute";
      return `Repeats ${interval}${type}`;
    }

    // Handle existing day/week/month logic
    const interval =
      reminder.recurringInterval > 1 ? `${reminder.recurringInterval} ` : "";
    const type =
      reminder.recurringInterval > 1
        ? reminder.recurringType.replace("ly", "ly every")
        : reminder.recurringType;
    return `Repeats ${interval}${type}`;
  };

  return (
    <ProtectedLayout>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 3 }}
          >
            <Typography variant="h4">Reminders</Typography>
            <Box display="flex" gap={2} alignItems="center">
              {/* Teams Status */}
              {teamsContext.isAuthenticated ? (
                <Box display="flex" alignItems="center" gap={1}>
                  <Groups color="primary" />
                  <Typography variant="body2" color="primary">
                    {teamsContext.selectedTeam?.displayName ||
                      "No team selected"}
                    {teamsContext.selectedChannel &&
                      ` > ${teamsContext.selectedChannel.displayName}`}
                  </Typography>
                  {teamsContext.selectedTeam &&
                    teamsContext.selectedChannel && (
                      <Chip
                        label="Settings Saved"
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ ml: 1, fontSize: "0.75rem" }}
                      />
                    )}
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<Groups />}
                  onClick={teamsContext.signIn}
                  disabled={teamsContext.isLoading}
                  size="small"
                >
                  Sign in to Teams
                </Button>
              )}

              <Button
                variant="outlined"
                startIcon={<BugReport />}
                onClick={async () => {
                  const result = await testTeamsConnection();
                  if (result.success) {
                    sendNotification("Teams Test", { body: result.message });
                  } else {
                    sendNotification("Teams Test Failed", {
                      body: result.error || "Failed to send test message",
                    });
                  }
                }}
                disabled={!teamsContext.isAuthenticated}
                size="small"
              >
                Test Teams
              </Button>

              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={async () => {
                  console.log("🔄 Re-scheduling all reminders...");

                  // Get all reminders from storage
                  const currentUserId = user?.id || 1;
                  const storedReminders =
                    userStorageService.getUserReminders(currentUserId);

                  if (storedReminders.length === 0) {
                    sendNotification("No Reminders", {
                      body: "No reminders found to re-schedule",
                    });
                    return;
                  }

                  console.log(
                    `📋 Found ${storedReminders.length} reminders to re-schedule`
                  );

                  try {
                    const result = await rescheduleAllReminders(
                      storedReminders
                    );

                    if (result.success) {
                      sendNotification("Re-scheduling Complete", {
                        body: `Successfully re-scheduled ${result.scheduled} reminders`,
                      });
                    } else {
                      sendNotification("Re-scheduling Completed with Errors", {
                        body: `Re-scheduled ${result.scheduled} reminders with ${result.errors.length} errors`,
                      });
                      console.warn("🚨 Re-scheduling errors:", result.errors);
                    }
                  } catch (error) {
                    console.error("❌ Failed to re-schedule reminders:", error);
                    sendNotification("Re-scheduling Failed", {
                      body: `Error: ${(error as Error).message}`,
                    });
                  }
                }}
                size="small"
              >
                Re-schedule All
              </Button>

              <Button
                variant="outlined"
                startIcon={<PlayArrow />}
                onClick={async () => {
                  console.log("🚀 Manual trigger activated!");
                  console.log("📋 Current reminders:", reminders);
                  console.log(
                    "🔐 Teams authenticated:",
                    teamsContext.isAuthenticated
                  );
                  console.log(
                    "👥 Selected team:",
                    teamsContext.selectedTeam?.displayName
                  );
                  console.log(
                    "📢 Selected channel:",
                    teamsContext.selectedChannel?.displayName
                  );

                  let triggeredCount = 0;
                  let totalActiveReminders = 0;

                  if (reminders.length === 0) {
                    console.log(
                      "⚠️ No reminders found, loading from storage..."
                    );
                    // Try to load reminders directly from file storage
                    try {
                      const storedReminders =
                        userStorageService.getUserReminders(1);
                      console.log("📦 Loaded from storage:", storedReminders);

                      if (storedReminders.length > 0) {
                        const mappedReminders = storedReminders.map(
                          (r: StoredReminderData) => ({
                            ...r,
                            datetime: new Date(r.datetime),
                            createdAt: new Date(r.createdAt),
                            enableTeamsNotification:
                              r.enableTeamsNotification ??
                              r.teamsNotificationEnabled ??
                              false,
                          })
                        );
                        setReminders(mappedReminders);

                        // Schedule notifications for the loaded reminders
                        for (const reminder of mappedReminders) {
                          if (reminder.active) {
                            totalActiveReminders++;
                            if (reminder.teamsNotificationEnabled) {
                              console.log(
                                `🔔 Manually triggering notification for: ${reminder.title}`
                              );
                              await scheduleReminderNotification(reminder);
                              triggeredCount++;
                            }
                          }
                        }
                      }
                    } catch (error) {
                      console.error("❌ Error loading reminders:", error);
                    }
                  } else {
                    // Schedule all existing reminders
                    for (const reminder of reminders) {
                      if (reminder.active) {
                        totalActiveReminders++;
                        if (reminder.teamsNotificationEnabled) {
                          console.log(
                            `🔔 Manually triggering notification for: ${reminder.title}`
                          );
                          await scheduleReminderNotification(reminder);
                          triggeredCount++;
                        }
                      }
                    }
                  }

                  // Provide detailed feedback
                  const teamsConfigured =
                    teamsContext.isAuthenticated &&
                    teamsContext.selectedTeam &&
                    teamsContext.selectedChannel;

                  let message = `Found ${totalActiveReminders} active reminder${
                    totalActiveReminders !== 1 ? "s" : ""
                  }. `;

                  if (triggeredCount > 0) {
                    message += `Started ${triggeredCount} Teams notification${
                      triggeredCount !== 1 ? "s" : ""
                    }`;
                    if (teamsConfigured) {
                      message += ` to ${
                        teamsContext.selectedTeam!.displayName
                      } ${">"} ${teamsContext.selectedChannel!.displayName}`;
                    }
                    message += ".";
                  } else if (totalActiveReminders > 0) {
                    message += "No Teams notifications enabled on reminders.";
                  } else {
                    message += "No active reminders to process.";
                  }

                  if (!teamsConfigured) {
                    message +=
                      " Teams authentication or team/channel selection needed.";
                  }

                  sendNotification("Teams Notifications", {
                    body: message,
                  });
                }}
                color="secondary"
                size="small"
                disabled={
                  !teamsContext.isAuthenticated ||
                  !teamsContext.selectedTeam ||
                  !teamsContext.selectedChannel
                }
              >
                Start Teams Notifications
              </Button>

              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpen()}
              >
                New Reminder
              </Button>
            </Box>
          </Box>

          {/* Teams Configuration Panel */}
          {teamsContext.isAuthenticated && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  <Groups sx={{ mr: 1, verticalAlign: "middle" }} />
                  Microsoft Teams Configuration
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Team</InputLabel>
                      <Select
                        value={teamsContext.selectedTeam?.id || ""}
                        onChange={(e) => {
                          const team = teamsContext.teams.find(
                            (t) => t.id === e.target.value
                          );
                          if (team) teamsContext.selectTeam(team);
                        }}
                        label="Team"
                        disabled={teamsContext.isLoading}
                      >
                        {teamsContext.teams.map((team) => (
                          <MenuItem key={team.id} value={team.id}>
                            {team.displayName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Channel</InputLabel>
                      <Select
                        value={teamsContext.selectedChannel?.id || ""}
                        onChange={(e) => {
                          const channel = teamsContext.channels.find(
                            (c) => c.id === e.target.value
                          );
                          if (channel) teamsContext.selectChannel(channel);
                        }}
                        label="Channel"
                        disabled={
                          teamsContext.isLoading || !teamsContext.selectedTeam
                        }
                      >
                        {teamsContext.isLoading && teamsContext.selectedTeam ? (
                          <MenuItem disabled>
                            <em>Loading channels...</em>
                          </MenuItem>
                        ) : teamsContext.channels.length === 0 &&
                          teamsContext.selectedTeam ? (
                          <MenuItem disabled>
                            <em>No channels available or failed to load</em>
                          </MenuItem>
                        ) : (
                          teamsContext.channels.map((channel) => (
                            <MenuItem key={channel.id} value={channel.id}>
                              {channel.displayName}
                            </MenuItem>
                          ))
                        )}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={teamsContext.refreshTeams}
                    disabled={teamsContext.isLoading}
                    size="small"
                  >
                    Refresh Teams
                  </Button>
                  {teamsContext.selectedTeam &&
                    teamsContext.channels.length === 0 && (
                      <Button
                        variant="outlined"
                        onClick={() =>
                          teamsContext.selectTeam(teamsContext.selectedTeam!)
                        }
                        disabled={teamsContext.isLoading}
                        size="small"
                        color="warning"
                      >
                        Retry Channels
                      </Button>
                    )}
                  <Button
                    variant="outlined"
                    onClick={teamsContext.signOut}
                    disabled={teamsContext.isLoading}
                    size="small"
                  >
                    Sign Out
                  </Button>
                  {teamsContext.error && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" color="error">
                        {teamsContext.error}
                      </Typography>
                      {teamsContext.error.includes("channel") && (
                        <Button
                          variant="text"
                          size="small"
                          color="error"
                          onClick={() =>
                            teamsContext.selectTeam(teamsContext.selectedTeam!)
                          }
                          disabled={teamsContext.isLoading}
                        >
                          Try Again
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Automation Status Panel */}
          {teamsContext.isAuthenticated &&
            teamsContext.selectedTeam &&
            teamsContext.selectedChannel && (
              <Card
                sx={{
                  mb: 3,
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #e3f2fd",
                }}
              >
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{ mb: 2, color: "success.main" }}
                  >
                    <Groups sx={{ mr: 1, verticalAlign: "middle" }} />
                    Automation Active
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <Typography variant="body2" color="text.secondary">
                        Teams notifications will automatically be sent to:
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: "medium", mt: 0.5 }}
                      >
                        {teamsContext.selectedTeam.displayName} {">"}{" "}
                        {teamsContext.selectedChannel.displayName}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        • Settings are saved and will persist across sessions
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • Recurring reminders with Teams notifications will
                        start automatically
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="flex-end"
                        gap={1}
                      >
                        <Chip
                          label="Ready"
                          color="success"
                          size="small"
                          sx={{ fontWeight: "medium" }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

          {reminders.length === 0 ? (
            <Card>
              <CardContent>
                <Typography variant="h6" align="center" color="textSecondary">
                  No reminders yet
                </Typography>
                <Typography
                  variant="body2"
                  align="center"
                  color="textSecondary"
                >
                  Create your first reminder to get started!
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {reminders.map((reminder) => (
                <Grid item xs={12} md={6} lg={4} key={reminder.id}>
                  <Card sx={{ opacity: reminder.active ? 1 : 0.6 }}>
                    <CardContent>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        sx={{ mb: 2 }}
                      >
                        <Typography variant="h6" component="div">
                          {reminder.title}
                        </Typography>
                        <Chip
                          label={reminder.priority}
                          color={getPriorityColor(reminder.priority) as any}
                          size="small"
                        />
                      </Box>

                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ mb: 2 }}
                      >
                        {reminder.description}
                      </Typography>

                      <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                        <Schedule sx={{ mr: 1, fontSize: 16 }} />
                        <Typography variant="body2">
                          {reminder.datetime.toLocaleString()}
                        </Typography>
                      </Box>

                      {reminder.isRecurring && (
                        <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                          <Repeat sx={{ mr: 1, fontSize: 16 }} />
                          <Typography variant="body2" color="textSecondary">
                            {formatRecurring(reminder)}
                          </Typography>
                        </Box>
                      )}

                      {reminder.teamsNotificationEnabled && (
                        <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                          <Groups
                            sx={{ mr: 1, fontSize: 16, color: "primary.main" }}
                          />
                          <Typography variant="body2" color="primary.main">
                            Teams notification enabled
                          </Typography>
                        </Box>
                      )}
                    </CardContent>

                    <CardActions>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={reminder.active}
                            onChange={() => toggleActive(reminder.id)}
                            size="small"
                          />
                        }
                        label="Active"
                      />
                      <Box sx={{ flexGrow: 1 }} />
                      <IconButton
                        size="small"
                        onClick={() => testReminder(reminder)}
                      >
                        <NotificationImportant />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpen(reminder)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(reminder.id)}
                      >
                        <Delete />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Create/Edit Dialog */}
          <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
              {editingReminder ? "Edit Reminder" : "Create New Reminder"}
            </DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                margin="normal"
                multiline
                rows={3}
              />

              <DateTimePicker
                label="Date & Time"
                value={formData.datetime}
                onChange={(newValue) =>
                  newValue &&
                  setFormData((prev) => ({ ...prev, datetime: newValue }))
                }
                slotProps={{ textField: { fullWidth: true, margin: "normal" } }}
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: e.target.value,
                    }))
                  }
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isRecurring}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isRecurring: e.target.checked,
                      }))
                    }
                  />
                }
                label="Recurring Reminder"
                sx={{ mt: 2 }}
              />

              {formData.isRecurring && (
                <Box sx={{ mt: 2 }}>
                  {formData.recurringType !== "every5minutes" && (
                    <TextField
                      label="Repeat every"
                      type="number"
                      value={formData.recurringInterval}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          recurringInterval: parseInt(e.target.value),
                        }))
                      }
                      inputProps={{ min: 1 }}
                      sx={{ mr: 2, width: 120 }}
                    />
                  )}

                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Period</InputLabel>
                    <Select
                      value={formData.recurringType}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          recurringType: e.target.value,
                          // Set interval to 1 for every5minutes since it's a fixed interval
                          recurringInterval:
                            e.target.value === "every5minutes"
                              ? 1
                              : prev.recurringInterval,
                        }))
                      }
                      label="Period"
                    >
                      <MenuItem value="minute">Minute(s)</MenuItem>
                      <MenuItem value="every5minutes">Every 5 Minutes</MenuItem>
                      <MenuItem value="daily">Day(s)</MenuItem>
                      <MenuItem value="weekly">Week(s)</MenuItem>
                      <MenuItem value="monthly">Month(s)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}

              <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid #e0e0e0" }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={
                        formData.teamsNotificationEnabled &&
                        teamsContext.isAuthenticated
                      }
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          teamsNotificationEnabled: e.target.checked,
                        }))
                      }
                      color="primary"
                      disabled={!teamsContext.isAuthenticated}
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Groups />
                      <Typography>Send to Microsoft Teams</Typography>
                    </Box>
                  }
                />
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ ml: 4, display: "block" }}
                >
                  {teamsContext.isAuthenticated ? (
                    teamsContext.selectedTeam &&
                    teamsContext.selectedChannel ? (
                      <>
                        <span>
                          Notifications will be sent to{" "}
                          {teamsContext.selectedTeam.displayName} {">"}{" "}
                          {teamsContext.selectedChannel.displayName}
                        </span>
                        <br />
                        <span
                          style={{ fontWeight: "medium", color: "#4caf50" }}
                        >
                          Settings are automatically saved for future reminders
                        </span>
                      </>
                    ) : (
                      "Please select a team and channel above to enable Teams notifications"
                    )
                  ) : (
                    "Sign in to Microsoft Teams to enable notifications"
                  )}
                </Typography>
              </Box>
            </DialogContent>

            <DialogActions>
              <Button onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSave} variant="contained">
                {editingReminder ? "Update" : "Create"}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </LocalizationProvider>
    </ProtectedLayout>
  );
}
