# Nudge App - Use Case Specification

## Project Overview

The Nudge App is a comprehensive reminder and notification system with Microsoft Teams integration, built using Next.js 14, TypeScript, and Material-UI. It provides automated recurring notifications with persistent configuration management.

---

## Primary Use Cases

### UC-001: User Authentication and Session Management

**Actor:** End User  
**Goal:** Secure access to the reminder system with persistent sessions  
**Preconditions:** User has valid credentials  
**Postconditions:** User is authenticated and can access all features

**Main Flow:**

1. User navigates to the application
2. System displays login interface
3. User enters credentials (email/password)
4. System validates credentials and creates session
5. User is redirected to dashboard with full access
6. Session persists across browser refreshes

**Alternative Flows:**

- A1: Invalid credentials → System displays error message
- A2: Session expires → User redirected to login with session restoration

**Technical Implementation:**

- JWT-based authentication
- Protected routes with middleware
- Session storage in localStorage
- Automatic token refresh

---

### UC-002: Microsoft Teams Integration Setup

**Actor:** End User  
**Goal:** Configure Teams integration for automated notifications  
**Preconditions:** User is authenticated and has Microsoft Teams access  
**Postconditions:** Teams settings are saved and persist across sessions

**Main Flow:**

1. User clicks "Sign in to Teams" button
2. System initiates Microsoft Graph API OAuth flow
3. User authenticates with Microsoft credentials
4. System retrieves available teams and channels
5. User selects target team and channel
6. System saves configuration to localStorage
7. Green "Settings Saved" indicator appears
8. "Automation Active" panel displays with configuration details

**Alternative Flows:**

- A1: OAuth failure → System displays error and retry option
- A2: No teams available → System shows message to contact admin
- A3: Permission denied → System explains required permissions

**Technical Implementation:**

```typescript
// Teams Context with persistent storage
const saveTeamsSelection = (team: Team, channel: Channel) => {
  const selection = {
    selectedTeam: team,
    selectedChannel: channel,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem("nudge-app-teams-selection", JSON.stringify(selection));
};
```

---

### UC-003: Create Basic Reminder

**Actor:** End User  
**Goal:** Create a one-time or recurring reminder with optional Teams notifications  
**Preconditions:** User is authenticated  
**Postconditions:** Reminder is created and scheduled for notifications

**Main Flow:**

1. User clicks "New Reminder" button
2. System opens reminder creation dialog
3. User fills in reminder details:
   - Title (required)
   - Description (required)
   - Date and time (required)
   - Priority level (Low/Medium/High)
4. User optionally enables recurring settings:
   - Recurrence type (minute/5min/daily/weekly/monthly)
   - Interval (1-n units)
5. User optionally enables Teams notifications
6. User clicks "Create" button
7. System validates input and saves reminder
8. System schedules browser and Teams notifications
9. System sends Teams self-notification about creation
10. Dialog closes and reminder appears in list

**Alternative Flows:**

- A1: Missing required fields → System highlights errors
- A2: Invalid date → System shows date validation message
- A3: Teams not configured → Teams toggle disabled with explanation

**Technical Implementation:**

```typescript
const handleSave = async () => {
  const newReminder: ReminderData = {
    id: Date.now(),
    ...formData,
    enableTeamsNotification: formData.teamsNotificationEnabled,
    createdAt: new Date(),
    active: true,
  };

  // Save to storage
  setReminders((prev) => [...prev, newReminder]);

  // Schedule notifications
  await scheduleReminderNotification(newReminder);

  // Send Teams self-notification
  if (newReminder.enableTeamsNotification) {
    await sendTeamsSelfNotification(
      "created",
      newReminder.title,
      newReminder.datetime
    );
  }
};
```

---

### UC-004: High-Frequency Recurring Reminders

**Actor:** End User  
**Goal:** Create minute-based recurring reminders for high-frequency tasks  
**Preconditions:** User is authenticated, Teams integration configured  
**Postconditions:** High-frequency notifications are active and persist across sessions

**Main Flow:**

1. User creates new reminder
2. User enables "Recurring" option
3. User selects "Minute(s)" or "Every 5 Minutes" from period dropdown
4. For "Minute(s)", user can specify interval (1-60)
5. For "Every 5 Minutes", interval is fixed at 5
6. User enables Teams notifications
7. System creates reminder with minute-based recurrence
8. System immediately starts recurring notifications
9. Notifications continue every specified interval
10. Teams messages sent to configured channel automatically

**Business Rules:**

- Minimum interval: 1 minute
- Maximum practical interval: 60 minutes for minute-based
- Fixed 5-minute option for common use case
- Notifications start immediately regardless of past due date

**Technical Implementation:**

```typescript
const intervals: { [key: string]: number } = {
  minute: 1 * 60 * 1000,
  every5minutes: 5 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

const interval = intervals[reminder.recurringType] * reminder.recurringInterval;
```

---

### UC-005: Automated Teams Notifications

**Actor:** System  
**Goal:** Send automated Teams messages based on reminder schedules  
**Preconditions:** Teams integration configured, active reminders with Teams notifications enabled  
**Postconditions:** Teams messages delivered to configured channel

**Main Flow:**

1. System timer triggers based on reminder schedule
2. System checks if reminder is active and Teams-enabled
3. System retrieves stored Teams configuration
4. System formats notification message with priority styling
5. System sends message via Microsoft Graph API
6. System logs successful delivery
7. For recurring reminders, system schedules next notification
8. System updates reminder's last-sent timestamp

**Message Format:**

```html
<div style="border-left: 4px solid {priority-color}; padding: 12px;">
  <h3>{priority-emoji} {reminder-title}</h3>
  <p>{reminder-description}</p>
  <div>Priority: {priority} | Sent by: Nudge App | Time: {timestamp}</div>
</div>
```

**Error Handling:**

- Graph API failure → Fallback to plain text message
- Channel unavailable → Log error, continue with next reminder
- Authentication expired → Attempt token refresh

---

### UC-006: Manual Notification Trigger

**Actor:** End User  
**Goal:** Manually trigger all Teams notifications for testing or immediate execution  
**Preconditions:** User is authenticated, Teams configured, active reminders exist  
**Postconditions:** All eligible notifications are triggered immediately

**Main Flow:**

1. User clicks "Start Teams Notifications" button
2. System scans all active reminders
3. System identifies reminders with Teams notifications enabled
4. System triggers each eligible reminder immediately
5. System provides detailed feedback:
   - Number of reminders found
   - Number of notifications triggered
   - Target team and channel information
6. System displays success notification with summary
7. All recurring notifications continue on their schedules

**Feedback Example:**

> "Found 3 active reminders. Started 2 Teams notifications to Development Team > General. Teams authentication or team/channel selection needed."

**Technical Implementation:**

```typescript
const handleManualTrigger = async () => {
  let triggeredCount = 0;
  let totalActiveReminders = 0;

  for (const reminder of reminders) {
    if (reminder.active) {
      totalActiveReminders++;
      if (reminder.teamsNotificationEnabled) {
        await scheduleReminderNotification(reminder);
        triggeredCount++;
      }
    }
  }

  // Provide detailed feedback
  const message = `Found ${totalActiveReminders} active reminder${
    totalActiveReminders !== 1 ? "s" : ""
  }. Started ${triggeredCount} Teams notifications.`;
  sendNotification("Teams Notifications", { body: message });
};
```

---

### UC-007: Persistent Configuration Management

**Actor:** System  
**Goal:** Maintain Teams configuration and reminder data across browser sessions  
**Preconditions:** User has configured Teams settings and created reminders  
**Postconditions:** All settings and data are restored on application restart

**Main Flow:**

1. User configures Teams integration (team/channel selection)
2. System saves configuration to localStorage
3. User creates reminders with various settings
4. System saves reminders to JSON file storage
5. User closes browser or navigates away
6. User returns to application later
7. System automatically restores Teams configuration
8. System loads all user reminders from storage
9. System restarts all active recurring notifications
10. User sees identical state as before leaving

**Storage Locations:**

- Teams configuration: `localStorage['nudge-app-teams-selection']`
- User reminders: `src/data/reminders.json`
- Authentication state: `sessionStorage` (MSAL)

**Data Persistence:**

```typescript
// Teams selection storage
const selection = {
  selectedTeam: team,
  selectedChannel: channel,
  timestamp: new Date().toISOString(),
};
localStorage.setItem("nudge-app-teams-selection", JSON.stringify(selection));

// Reminder data storage
const reminderToStore = {
  ...reminder,
  datetime: reminder.datetime.toISOString(),
  createdAt: reminder.createdAt.toISOString(),
};
userStorageService.addReminderToFile(userId, reminderToStore);
```

---

### UC-008: Self-Notification System

**Actor:** System  
**Goal:** Notify user about reminder lifecycle events via Teams  
**Preconditions:** Teams integration configured  
**Postconditions:** User receives Teams notifications about reminder operations

**Main Flow:**

1. User performs reminder operation (create/update/delete)
2. System processes the operation
3. System formats appropriate self-notification message
4. System attempts to send via Microsoft Graph API
5. On success: Teams message delivered to configured channel
6. On failure: System falls back to email or local notification
7. System provides user feedback about notification delivery

**Notification Types:**

- **Create**: "✅ Reminder Created - Your reminder 'Task Name' has been created"
- **Update**: "📝 Reminder Updated - Your reminder 'Task Name' has been updated"
- **Delete**: "🗑️ Reminder Deleted - Your reminder 'Task Name' has been deleted"

**Fallback Chain:**

1. Teams timeline activity (primary)
2. Email to user's account (secondary)
3. Local browser notification (tertiary)
4. Console logging (fallback)

---

## Technical Architecture

### Technology Stack

- **Frontend**: Next.js 14, TypeScript, Material-UI
- **Authentication**: Microsoft MSAL, JWT tokens
- **State Management**: React Context API
- **Storage**: localStorage, JSON file system
- **API Integration**: Microsoft Graph API
- **Notifications**: Browser Notification API, Teams messaging

### Key Components

1. **AuthContext**: User authentication and session management
2. **TeamsContext**: Microsoft Teams integration and configuration
3. **NotificationContext**: Notification scheduling and delivery
4. **RemindersPage**: Main UI for reminder management
5. **Storage Services**: Data persistence and retrieval

### Data Models

```typescript
interface ReminderData {
  id: number;
  title: string;
  description: string;
  datetime: Date;
  priority: "low" | "medium" | "high";
  isRecurring: boolean;
  recurringType: "minute" | "every5minutes" | "daily" | "weekly" | "monthly";
  recurringInterval: number;
  teamsNotificationEnabled: boolean;
  active: boolean;
  createdAt: Date;
}

interface TeamsSelection {
  selectedTeam: Team;
  selectedChannel: Channel;
  timestamp: string;
}
```

---

## User Interface Specifications

### Dashboard Layout

- **Header**: App title, user info, Teams status indicator
- **Action Bar**: New reminder button, manual trigger button, Teams test button
- **Status Panel**: Teams configuration display, automation status
- **Reminder Grid**: Card-based layout showing all reminders
- **Dialog Forms**: Modal forms for creating/editing reminders

### Visual Indicators

- 🟢 **Green Chip**: "Settings Saved" when Teams configured
- 🔵 **Blue Panel**: "Automation Active" showing current configuration
- 🔴 **Red Button**: Disabled state when Teams not configured
- ⚡ **Icons**: Priority levels, recurring indicators, Teams status

### Responsive Design

- Mobile-first approach
- Grid layout adapts to screen size
- Touch-friendly controls
- Accessible keyboard navigation

---

## Error Handling and Edge Cases

### Network Failures

- Graceful degradation when Teams API unavailable
- Retry mechanisms for failed notifications
- Offline capability for basic reminder management

### Data Corruption

- Validation of stored data on load
- Fallback to default settings on corruption
- Data migration for version updates

### Permission Issues

- Clear messaging for insufficient Teams permissions
- Guidance for administrators on required scopes
- Alternative notification methods when Teams unavailable

### Performance Considerations

- Efficient timer management for multiple recurring reminders
- Batch processing for multiple notifications
- Memory cleanup for cancelled reminders

---

## Success Criteria

### Functional Requirements ✅

- [x] User can create and manage reminders
- [x] Teams integration works with persistent configuration
- [x] High-frequency (minute-based) recurring notifications
- [x] Automatic notification scheduling and delivery
- [x] Manual trigger functionality with detailed feedback
- [x] Self-notifications for reminder lifecycle events
- [x] Data persistence across browser sessions

### Non-Functional Requirements ✅

- [x] Responsive UI suitable for desktop and mobile
- [x] Secure authentication with Microsoft identity
- [x] Reliable notification delivery with fallback mechanisms
- [x] Performance optimized for multiple concurrent reminders
- [x] Intuitive user experience with clear visual feedback
- [x] Comprehensive error handling and recovery

### Business Value ✅

- [x] Automated workflow reminders increase productivity
- [x] Teams integration centralizes notifications in existing workflow
- [x] Persistent configuration reduces setup friction
- [x] High-frequency options support intensive task management
- [x] Self-notification system provides operation transparency
- [x] Cross-session persistence ensures continuity

---

## Future Enhancements

### Phase 2 Features

- [ ] Team collaboration (shared reminders)
- [ ] Advanced scheduling (business hours, holidays)
- [ ] Integration with other Microsoft 365 services
- [ ] Mobile app development
- [ ] Analytics and reporting dashboard
- [ ] Reminder templates and presets

### Scalability Improvements

- [ ] Database backend for large-scale deployment
- [ ] Multi-tenant architecture
- [ ] Real-time synchronization across devices
- [ ] Advanced permission management
- [ ] API endpoints for third-party integrations

---

_This use case specification documents the complete functionality of the Nudge App as implemented in commit `9aaefe8`. All features described have been developed, tested, and are ready for production deployment._
