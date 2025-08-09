// Teams Notifications Page
// src/app/teams-notifications/page.tsx

"use client";

import React from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Breadcrumbs,
  Link,
  Alert,
} from "@mui/material";
import {
  Home as HomeIcon,
  Notifications as NotificationIcon,
} from "@mui/icons-material";
import TeamsNotificationManager from "@/components/TeamsNotificationManager";

const TeamsNotificationsPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
            <Link
              color="inherit"
              href="/"
              sx={{ display: "flex", alignItems: "center" }}
            >
              <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Home
            </Link>
            <Typography
              color="text.primary"
              sx={{ display: "flex", alignItems: "center" }}
            >
              <NotificationIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Teams Notifications
            </Typography>
          </Breadcrumbs>

          <Typography variant="h4" component="h1" gutterBottom>
            Microsoft Teams Notifications
          </Typography>

          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Send immediate and scheduled notifications to Microsoft Teams
            channels. Perfect for team updates, reminders, and automated
            announcements.
          </Typography>
        </Box>

        {/* Info Alert */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Getting Started:</strong> Make sure you have configured
            Microsoft Graph API authentication and have the necessary
            permissions to send messages to Teams channels.
          </Typography>
        </Alert>

        {/* Main Content */}
        <Paper elevation={2} sx={{ p: 0, overflow: "hidden" }}>
          <TeamsNotificationManager />
        </Paper>

        {/* Feature Overview */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Features
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
              gap: 2,
            }}
          >
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom color="primary">
                🚀 Instant Notifications
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Send immediate notifications to any Teams channel with custom
                messages and priority levels.
              </Typography>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom color="primary">
                📅 Scheduled Messages
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Schedule notifications for specific dates and times. Perfect for
                meeting reminders and deadlines.
              </Typography>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom color="primary">
                🔄 Recurring Notifications
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Set up daily, weekly, or monthly recurring notifications for
                regular team updates and standup reminders.
              </Typography>
            </Paper>
          </Box>
        </Box>

        {/* Usage Examples */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Common Use Cases
          </Typography>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: "grid", gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  📋 Daily Standup Reminders
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Schedule recurring daily notifications to remind team members
                  about standup meetings.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  🎯 Sprint Milestone Updates
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Send immediate notifications when sprint milestones are
                  reached or deadlines are approaching.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  🔔 System Maintenance Alerts
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Schedule notifications for planned maintenance windows and
                  system updates.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  🎉 Team Celebrations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Send immediate notifications for team achievements, work
                  anniversaries, and project completions.
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default TeamsNotificationsPage;
