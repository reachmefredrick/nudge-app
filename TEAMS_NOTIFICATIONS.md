# Teams Notifications Setup Guide

This guide explains how to set up and use the Teams notification features in the Nudge App.

## Overview

The Teams notification system allows you to:

- Send immediate notifications to Microsoft Teams channels
- Schedule one-time notifications for specific dates and times
- Set up recurring notifications (daily, weekly, monthly)
- Use predefined templates for common scenarios
- Manage all scheduled notifications from a central dashboard

## Prerequisites

Before using Teams notifications, ensure you have:

1. **Microsoft Azure App Registration** with the following permissions:

   - `ChannelMessage.Send`
   - `Team.ReadBasic.All`
   - `Channel.ReadBasic.All`
   - `User.Read`

2. **Environment Variables** configured in your `.env.local`:

   ```env
   NEXT_PUBLIC_AZURE_CLIENT_ID=your-client-id
   NEXT_PUBLIC_AZURE_TENANT_ID=your-tenant-id
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **User Authentication** - Users must sign in with their Microsoft account that has access to the target Teams.

## Features

### 1. Immediate Notifications

Send instant messages to Teams channels with custom titles, messages, and priority levels.

**API Endpoint**: `POST /api/teams-notifications`

```json
{
  "action": "send-immediate",
  "title": "Deployment Complete",
  "message": "The latest version has been deployed successfully!",
  "teamId": "team-id",
  "channelId": "channel-id",
  "priority": "high"
}
```

### 2. Scheduled Notifications

Schedule notifications for specific dates and times.

**API Endpoint**: `POST /api/teams-notifications`

```json
{
  "action": "schedule",
  "title": "Meeting Reminder",
  "message": "Sprint planning meeting in 15 minutes",
  "teamId": "team-id",
  "channelId": "channel-id",
  "scheduleTime": "2024-01-15T09:45:00.000Z",
  "priority": "medium"
}
```

### 3. Recurring Notifications

Set up recurring notifications with flexible patterns.

**API Endpoint**: `POST /api/teams-notifications`

```json
{
  "action": "schedule-recurring",
  "title": "Daily Standup Reminder",
  "message": "Time for our daily standup!",
  "teamId": "team-id",
  "channelId": "channel-id",
  "scheduleTime": "2024-01-15T09:15:00.000Z",
  "priority": "medium",
  "recurring": {
    "type": "daily",
    "interval": 1,
    "daysOfWeek": [1, 2, 3, 4, 5],
    "endDate": "2024-12-31T23:59:59.000Z"
  }
}
```

### 4. Notification Templates

Pre-defined templates for common scenarios:

- **Daily Standup Reminder**: Reminds team about daily standup meetings
- **Sprint Review**: Notifications for sprint review meetings
- **Code Review Needed**: Alerts when code reviews are pending
- **Deployment Notification**: Updates about successful deployments
- **Milestone Achieved**: Celebration messages for reaching milestones

### 5. Preset Schedules

Quick setup for common notification patterns:

- **Daily Standup**: Weekdays at 9:15 AM
- **Weekly Sprint Review**: Fridays at 2:00 PM
- **Daily Code Review**: Weekdays at 11:00 AM

## Usage Examples

### Using the UI

1. Navigate to `/teams-notifications` in the app
2. Click "New Notification" to open the creation dialog
3. Fill in the notification details:
   - Title and message
   - Select team and channel
   - Choose priority level
   - Set schedule time (optional)
   - Configure recurrence (optional)
4. Click "Send Now" or "Schedule" based on your needs

### Using the API

```javascript
// Send immediate notification
const response = await fetch("/api/teams-notifications", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "send-immediate",
    title: "Build Failed",
    message: "The main branch build has failed. Please check the logs.",
    teamId: "development-team-id",
    channelId: "alerts-channel-id",
    priority: "high",
  }),
});

const result = await response.json();
console.log(result); // { success: true, messageId: "..." }
```

### Using the Integration Service

```javascript
import { teamsIntegrationService } from "@/services/teamsIntegrationService";

// Send a template notification
const result = await teamsIntegrationService.sendTemplateNotification(
  "daily-standup",
  "team-id",
  "channel-id",
  {
    title: "Custom Standup Reminder",
    priority: "high",
  }
);

// Schedule a preset notification
const scheduled = await teamsIntegrationService.schedulePresetNotification(
  "dailyStandup",
  "team-id",
  "channel-id",
  new Date("2024-12-31") // end date
);
```

## Message Format

Teams notifications are sent as Adaptive Cards with:

- **Priority indicator**: Emoji and color coding (🟢/🟡/🔴)
- **Title**: Bold, colored based on priority
- **Message**: Main notification content
- **Metadata**: Priority level, sender, timestamp
- **Action button**: Link back to the Nudge App

## Scheduling System

The notification scheduler:

- **Persistent Storage**: Scheduled notifications survive app restarts
- **Background Processing**: Runs independently of user sessions
- **Error Handling**: Automatic retry logic for failed deliveries
- **History Tracking**: Maintains records of sent notifications
- **Cancellation**: Ability to cancel scheduled notifications

## Best Practices

1. **Permission Management**: Ensure users have appropriate Teams permissions
2. **Rate Limiting**: Avoid excessive notifications that could be considered spam
3. **Error Handling**: Always check API responses and handle failures gracefully
4. **Testing**: Use development/test channels before deploying to production
5. **Monitoring**: Track notification delivery success rates

## Troubleshooting

### Common Issues

1. **Authentication Failed**

   - Verify Azure app registration and permissions
   - Check if user is signed in with correct Microsoft account
   - Ensure user has access to target Teams

2. **Team/Channel Not Found**

   - Verify team and channel IDs are correct
   - Check if user has access to the specified team/channel
   - Use the Teams & Channels tab to browse available options

3. **Scheduling Not Working**

   - Check if schedule time is in the future
   - Verify recurring pattern configuration
   - Check server logs for background processing errors

4. **Messages Not Appearing**
   - Verify channel permissions for bot/app
   - Check if notifications are filtered in Teams
   - Ensure adaptive card format is valid

### Development Notes

For production deployment:

- Replace in-memory storage with Redis or database
- Implement proper job queue (Bull, Agenda, etc.)
- Add comprehensive logging and monitoring
- Set up proper error alerting
- Configure backup notification channels

## API Reference

### Endpoints

- `POST /api/teams-notifications` - Main notification API
- `GET /api/teams-notifications?action=list` - List scheduled notifications

### Actions

- `send-immediate` - Send notification now
- `schedule` - Schedule one-time notification
- `schedule-recurring` - Schedule recurring notification
- `cancel` - Cancel scheduled notification
- `list` - List all scheduled notifications

### Response Format

```json
{
  "success": boolean,
  "message": string,
  "notificationId": string, // for scheduled notifications
  "messageId": string,      // for immediate notifications
  "error": string           // if success is false
}
```
