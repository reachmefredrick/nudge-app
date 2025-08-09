"use client";

import React, { useState, useEffect } from "react";
import {
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Chip,
} from "@mui/material";
import {
  Schedule,
  Notifications,
  Group,
  NotificationImportant,
  CheckCircle,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import { userStorageService } from "@/services/userStorageService";
import ProtectedLayout from "@/components/ProtectedLayout";

interface Reminder {
  id: number;
  title: string;
  time: string;
  type: string;
  priority: string;
}

interface Stats {
  totalReminders: number;
  activeReminders: number;
  completedToday: number;
  teamAlerts: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { notifications, sendNotification } = useNotification();
  const [stats, setStats] = useState<Stats>({
    totalReminders: 0,
    activeReminders: 0,
    completedToday: 0,
    teamAlerts: 0,
  });

  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    // Load user-specific reminders and calculate stats
    if (user) {
      const reminders = userStorageService.getUserReminders(user.id);

      if (reminders.length > 0) {
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );

        // Calculate stats
        const totalReminders = reminders.length;
        const activeReminders = reminders.filter(
          (r: any) => r.active !== false
        ).length;
        const completedToday = reminders.filter((r: any) => {
          const reminderDate = new Date(r.datetime);
          return (
            reminderDate >= today &&
            reminderDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
          );
        }).length;
        const teamAlerts = reminders.filter(
          (r: any) => r.enableTeamsNotification || r.teamsNotificationEnabled
        ).length;

        setStats({
          totalReminders,
          activeReminders,
          completedToday,
          teamAlerts,
        });

        // Set upcoming reminders (next 5 active reminders)
        const upcoming = reminders
          .filter((r: any) => r.active !== false && new Date(r.datetime) > now)
          .sort(
            (a: any, b: any) =>
              new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
          )
          .slice(0, 5)
          .map((r: any, index: number) => ({
            id: r.id || index,
            title: r.title,
            time: new Date(r.datetime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            type: r.isRecurring ? "recurring" : "reminder",
            priority: r.priority || "medium",
          }));

        setUpcomingReminders(upcoming);
      } else {
        // Reset stats if no reminders
        setStats({
          totalReminders: 0,
          activeReminders: 0,
          completedToday: 0,
          teamAlerts: 0,
        });
        setUpcomingReminders([]);
      }
    }
  }, [user]);

  useEffect(() => {
    // Send a welcome notification when dashboard loads
    if (user) {
      const timer = setTimeout(() => {
        sendNotification(`Welcome back, ${user.name}!`, {
          body: "Your personalized reminder system is ready to help you stay organized.",
          icon: "/logo192.png",
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [sendNotification, user]);

  const testNotification = () => {
    sendNotification("Test Notification", {
      body: "This is a test notification from your dashboard!",
      icon: "/logo192.png",
    });
  };

  interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color?: string;
  }

  const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    color = "primary",
  }) => (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main` }}>{icon}</Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "error";
      case "high":
        return "warning";
      case "low":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <ProtectedLayout>
      <Box>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.name}!
        </Typography>

        <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
          Here&apos;s what&apos;s happening with your reminders and
          notifications today.
        </Typography>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Reminders"
              value={stats.totalReminders}
              icon={<Schedule />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Active Today"
              value={stats.activeReminders}
              icon={<NotificationImportant />}
              color="warning"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Completed"
              value={stats.completedToday}
              icon={<CheckCircle />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Team Alerts"
              value={stats.teamAlerts}
              icon={<Group />}
              color="info"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Upcoming Reminders */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Upcoming Reminders
              </Typography>
              <List>
                {upcomingReminders.map((reminder) => (
                  <ListItem key={reminder.id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: "primary.main" }}>
                        <Schedule />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={reminder.title}
                      secondary={reminder.time}
                    />
                    <Chip
                      label={reminder.priority}
                      color={getPriorityColor(reminder.priority) as any}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="contained"
                  startIcon={<Notifications />}
                  onClick={testNotification}
                  fullWidth
                >
                  Test Notification
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Schedule />}
                  href="/reminders"
                  fullWidth
                >
                  Create Reminder
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Group />}
                  href="/teams"
                  fullWidth
                >
                  Send Team Alert
                </Button>
              </Box>
            </Paper>

            {/* Recent Notifications */}
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Notifications
              </Typography>
              {notifications.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No notifications yet
                </Typography>
              ) : (
                <List dense>
                  {notifications.slice(0, 3).map((notification) => (
                    <ListItem key={notification.id}>
                      <ListItemText
                        primary={notification.title}
                        secondary={notification.timestamp.toLocaleTimeString()}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </ProtectedLayout>
  );
}
