# Nudge App - Technical Implementation Guide

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                   │
├─────────────────────────────────────────────────────────────┤
│  UI Components (Material-UI)                               │
│  ├── RemindersPage (Main Interface)                        │
│  ├── AuthenticationForm                                    │
│  ├── TeamsConfigurationPanel                               │
│  └── NotificationManager                                   │
├─────────────────────────────────────────────────────────────┤
│  State Management (React Context)                          │
│  ├── AuthContext (User Sessions)                           │
│  ├── TeamsContext (Teams Integration)                      │
│  └── NotificationContext (Scheduling)                      │
├─────────────────────────────────────────────────────────────┤
│  Services Layer                                            │
│  ├── microsoftGraphService (Teams API)                     │
│  ├── userStorageService (Data Persistence)                 │
│  ├── teamsIntegrationService (Teams Logic)                 │
│  └── hybridFileStorageService (File Storage)               │
├─────────────────────────────────────────────────────────────┤
│  External Integrations                                     │
│  ├── Microsoft Graph API                                   │
│  ├── Microsoft Authentication Library (MSAL)               │
│  ├── Browser Notification API                              │
│  └── localStorage/sessionStorage                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Implementation Details

### 1. Authentication System

#### Microsoft MSAL Configuration

```typescript
// src/services/microsoftGraphService.ts
const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${
      process.env.NEXT_PUBLIC_AZURE_TENANT_ID || "common"
    }`,
    redirectUri: typeof window !== "undefined" ? window.location.origin : "",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

const loginRequest = {
  scopes: [
    "https://graph.microsoft.com/ChannelMessage.Send",
    "https://graph.microsoft.com/Team.ReadBasic.All",
    "https://graph.microsoft.com/Channel.ReadBasic.All",
    "https://graph.microsoft.com/User.Read",
  ],
};
```

#### AuthContext Implementation

```typescript
// src/contexts/AuthContext.tsx
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("nudge-app-user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Simulate authentication
    const userData = { id: 1, email, name: "Demo User" };
    setUser(userData);
    localStorage.setItem("nudge-app-user", JSON.stringify(userData));
    return userData;
  };
};
```

### 2. Persistent Teams Configuration

#### Teams Context with Storage

```typescript
// src/contexts/TeamsContext.tsx
const saveTeamsSelection = useCallback(
  (team: Team | null, channel: Channel | null) => {
    try {
      const selection = {
        selectedTeam: team,
        selectedChannel: channel,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(
        "nudge-app-teams-selection",
        JSON.stringify(selection)
      );
      console.log("💾 Teams selection saved:", {
        team: team?.displayName,
        channel: channel?.displayName,
      });
    } catch (error) {
      console.error("Failed to save teams selection:", error);
    }
  },
  []
);

const loadTeamsSelection = useCallback(() => {
  try {
    const stored = localStorage.getItem("nudge-app-teams-selection");
    if (stored) {
      const selection = JSON.parse(stored);
      return {
        selectedTeam: selection.selectedTeam,
        selectedChannel: selection.selectedChannel,
      };
    }
  } catch (error) {
    console.error("Failed to load teams selection:", error);
  }
  return { selectedTeam: null, selectedChannel: null };
}, []);
```

#### Auto-Restoration Logic

```typescript
const loadTeams = useCallback(async () => {
  try {
    setIsLoading(true);
    const teamsData = await graphService.getMyTeams();
    setTeams(teamsData);

    // Restore previous selection
    const storedSelection = loadTeamsSelection();
    if (storedSelection.selectedTeam && teamsData.length > 0) {
      const matchingTeam = teamsData.find(
        (t) => t.id === storedSelection.selectedTeam?.id
      );
      if (matchingTeam) {
        console.log("✅ Restoring team selection:", matchingTeam.displayName);
        setTimeout(() => selectTeam(matchingTeam), 100);
      }
    }
  } catch (error) {
    console.error("Failed to load teams:", error);
  } finally {
    setIsLoading(false);
  }
}, [loadTeamsSelection]);
```

### 3. Notification Scheduling System

#### Interval Calculation

```typescript
// src/app/reminders/page.tsx
const scheduleReminderNotification = async (reminder: ReminderData) => {
  const intervals: { [key: string]: number } = {
    minute: 1 * 60 * 1000, // 1 minute
    every5minutes: 5 * 60 * 1000, // 5 minutes
    daily: 24 * 60 * 60 * 1000, // 24 hours
    weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
    monthly: 30 * 24 * 60 * 60 * 1000, // 30 days
  };

  if (reminder.isRecurring) {
    const interval =
      intervals[reminder.recurringType] * reminder.recurringInterval;

    // Start browser notifications
    scheduleRecurringNotification(
      reminder.title,
      {
        body: reminder.description,
        icon: "/logo192.png",
        tag: `reminder-${reminder.id}`,
      },
      interval
    );

    // Start Teams notifications
    if (reminder.teamsNotificationEnabled) {
      scheduleTeamsRecurringNotification(
        reminder.title,
        reminder.description,
        interval,
        reminder.priority as "low" | "medium" | "high"
      );
    }
  }
};
```

#### Recurring Notification Implementation

```typescript
// src/contexts/NotificationContext.tsx
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
          const { teamsIntegrationService } = await import(
            "../services/teamsIntegrationService"
          );
          await teamsIntegrationService.sendReminderSelfNotification(
            "created",
            title,
            new Date(),
            priority
          );
          console.log(`Teams recurring notification sent: ${title}`);
        } catch (error) {
          console.error("Failed to send Teams recurring notification:", error);
        }
      };

      // Start immediately
      scheduleNext();

      // Schedule recurring
      const intervalId = setInterval(scheduleNext, interval);
      return { success: true, intervalId };
    } catch (error) {
      console.error("Failed to schedule Teams recurring notification:", error);
      return { success: false, intervalId: null };
    }
  },
  []
);
```

### 4. Data Persistence

#### File Storage Service

```typescript
// src/services/hybridFileStorageService.ts
class HybridFileStorageService {
  private filePath = "/src/data/reminders.json";

  async addReminderToFile(userId: number, reminder: any): Promise<void> {
    try {
      console.log("🔄 Adding reminder to file:", reminder.title);

      // Read current data
      const response = await fetch("/api/storage/read");
      const currentData = response.ok
        ? await response.json()
        : { users: {}, meta: {} };

      // Update data structure
      if (!currentData.users[userId]) {
        currentData.users[userId] = {
          id: userId,
          name: `User ${userId}`,
          email: `user${userId}@example.com`,
          reminders: [],
          settings: {},
          teamsData: {},
          lastUpdated: new Date().toISOString(),
        };
      }

      currentData.users[userId].reminders.push(reminder);
      currentData.users[userId].lastUpdated = new Date().toISOString();
      currentData.meta.lastUpdated = new Date().toISOString();

      // Write back to file
      await fetch("/api/storage/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentData),
      });

      console.log("✅ Reminder added to file successfully");
    } catch (error) {
      console.error("❌ Error adding reminder to file:", error);
    }
  }
}
```

#### User Storage Service

```typescript
// src/services/userStorageService.ts
class UserStorageService {
  saveUserReminders(userId: number, reminders: any[]): void {
    const key = `nudge-reminders-${userId}`;
    try {
      localStorage.setItem(key, JSON.stringify(reminders));
      console.log(`💾 Saved ${reminders.length} reminders for user ${userId}`);
    } catch (error) {
      console.error("Failed to save reminders to localStorage:", error);
    }
  }

  getUserReminders(userId: number): any[] {
    const key = `nudge-reminders-${userId}`;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load reminders from localStorage:", error);
      return [];
    }
  }
}
```

### 5. Microsoft Graph API Integration

#### Message Sending with Fallback

```typescript
// src/services/microsoftGraphService.ts
async sendChannelMessage(
  teamId: string,
  channelId: string,
  title: string,
  content: string,
  priority: "low" | "medium" | "high" = "medium"
): Promise<any> {
  try {
    const priorityEmojis = { low: "🟢", medium: "🟡", high: "🔴" };

    // Primary attempt: HTML message
    const simpleMessage = {
      body: {
        contentType: "html",
        content: `
          <div style="border-left: 4px solid ${priority === "high" ? "#dc3545" : priority === "medium" ? "#ffc107" : "#28a745"}; padding: 12px;">
            <h3>${priorityEmojis[priority]} ${title}</h3>
            <p>${content}</p>
            <div style="font-size: 12px;">
              <strong>Priority:</strong> ${priority.toUpperCase()} |
              <strong>Sent by:</strong> Nudge App |
              <strong>Time:</strong> ${new Date().toLocaleString()}
            </div>
          </div>
        `,
      },
    };

    const response = await this.graphClient
      .api(`/teams/${teamId}/channels/${channelId}/messages`)
      .post(simpleMessage);

    return response;
  } catch (error) {
    // Fallback: Plain text message
    try {
      const fallbackMessage = {
        body: {
          contentType: "text",
          content: `${priorityEmojis[priority]} ${title}\n\n${content}\n\nPriority: ${priority.toUpperCase()}`,
        },
      };

      return await this.graphClient
        .api(`/teams/${teamId}/channels/${channelId}/messages`)
        .post(fallbackMessage);
    } catch (fallbackError) {
      console.error("Both HTML and text fallback failed:", fallbackError);
      throw error;
    }
  }
}
```

#### Self-Notification with Multiple Fallbacks

```typescript
async sendSelfNotification(title: string, message: string, priority: "low" | "medium" | "high" = "medium"): Promise<any> {
  try {
    // Primary: Teams timeline activity
    const simpleActivity = {
      appActivityId: `nudge-reminder-${Date.now()}`,
      activitySourceHost: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      userTimezone: "UTC",
      appDisplayName: "Nudge App",
      visualElements: {
        displayText: `${priorityIcon} ${title}`,
        description: message,
      },
      historyItems: [{
        userTimezone: "UTC",
        startedDateTime: new Date().toISOString(),
        lastActiveDateTime: new Date().toISOString(),
      }],
    };

    try {
      const response = await this.graphClient.api("/me/activities").post(simpleActivity);
      return { success: true, method: "activity", response };
    } catch (activityError) {
      // Secondary: Email fallback
      try {
        const currentUser = await this.getCurrentUser();
        const emailMessage = {
          subject: `${priorityIcon} ${title} - Nudge App`,
          body: { contentType: "Text", content: message },
          toRecipients: [{ emailAddress: { address: currentUser.mail }}],
        };

        await this.graphClient.api("/me/sendMail").post({ message: emailMessage });
        return { success: true, method: "email" };
      } catch (emailError) {
        // Tertiary: Local processing
        return {
          success: true,
          method: "local",
          message: `Self-notification processed locally: ${title}`,
        };
      }
    }
  } catch (error) {
    return { success: false, method: "error", error: error.message };
  }
}
```

### 6. Auto-Scheduling Implementation

#### Application Load Scheduling

```typescript
// src/app/reminders/page.tsx
useEffect(() => {
  const scheduleAllReminders = async () => {
    console.log(`🔄 Scheduling ${reminders.length} reminders`);

    for (const reminder of reminders) {
      if (reminder.active) {
        try {
          console.log(
            `📅 Scheduling: ${reminder.title} (recurring: ${reminder.isRecurring})`
          );
          await scheduleReminderNotification(reminder);
          console.log(`✅ Successfully scheduled: ${reminder.title}`);
        } catch (error) {
          console.error(`❌ Failed to schedule ${reminder.title}:`, error);
        }
      }
    }
  };

  if (reminders.length > 0) {
    console.log("🚀 Starting reminder scheduling process...");
    scheduleAllReminders();
  }
}, [reminders.length, user]); // Trigger when reminders loaded
```

#### Manual Trigger with Feedback

```typescript
const handleManualTrigger = async () => {
  console.log("🚀 Manual trigger activated!");

  let triggeredCount = 0;
  let totalActiveReminders = 0;

  // Process existing reminders
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
      message += ` to ${teamsContext.selectedTeam!.displayName} > ${
        teamsContext.selectedChannel!.displayName
      }`;
    }
  } else if (totalActiveReminders > 0) {
    message += "No Teams notifications enabled on reminders.";
  }

  if (!teamsConfigured) {
    message += " Teams authentication or team/channel selection needed.";
  }

  sendNotification("Teams Notifications", { body: message });
};
```

---

## Key Design Patterns

### 1. Context Provider Pattern

All major functionalities are wrapped in React Context providers for state management:

- `AuthProvider` - User authentication
- `TeamsProvider` - Teams integration
- `NotificationProvider` - Notification scheduling

### 2. Service Layer Pattern

Business logic is separated into service classes:

- `MicrosoftGraphService` - Graph API interactions
- `TeamsIntegrationService` - Teams-specific logic
- `UserStorageService` - Data persistence

### 3. Fallback Chain Pattern

Multiple fallback mechanisms for reliability:

- Teams API → Email → Local notification → Console logging
- HTML message → Plain text message
- File storage → localStorage → In-memory

### 4. Observer Pattern

React hooks and useEffect for reactive updates:

- Teams configuration changes trigger UI updates
- Reminder changes trigger re-scheduling
- Authentication changes trigger context updates

---

## Performance Optimizations

### 1. Efficient Timer Management

```typescript
// Clean up timers to prevent memory leaks
useEffect(() => {
  return () => {
    // Cleanup function runs on unmount
    Object.values(activeTimers).forEach((timer) => clearInterval(timer));
  };
}, []);
```

### 2. Debounced Storage Operations

```typescript
const debouncedSave = useMemo(
  () =>
    debounce((data: any) => {
      localStorage.setItem("nudge-reminders", JSON.stringify(data));
    }, 1000),
  []
);
```

### 3. Lazy Loading

```typescript
// Dynamic imports for heavy services
const { teamsIntegrationService } = await import(
  "../services/teamsIntegrationService"
);
```

### 4. Memoized Calculations

```typescript
const sortedReminders = useMemo(() => {
  return reminders.sort(
    (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );
}, [reminders]);
```

---

## Testing Strategy

### Unit Tests

- Context providers with mock data
- Service methods with API mocking
- Utility functions with edge cases
- Component rendering with React Testing Library

### Integration Tests

- Full user flows (create → schedule → trigger)
- Teams integration with Graph API
- Storage persistence across sessions
- Error handling and recovery

### E2E Tests

- Complete user journeys
- Cross-browser compatibility
- Mobile responsiveness
- Performance under load

---

## Deployment Considerations

### Environment Variables

```env
NEXT_PUBLIC_AZURE_CLIENT_ID=your_client_id
NEXT_PUBLIC_AZURE_TENANT_ID=your_tenant_id
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Build Configuration

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "dev": "next dev",
    "lint": "next lint"
  }
}
```

### Security Headers

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
        ],
      },
    ];
  },
};
```

---

## Monitoring and Debugging

### Console Logging Strategy

```typescript
// Structured logging with emojis for visual clarity
console.log("🚀 Starting reminder scheduling process...");
console.log("✅ Successfully scheduled notification:", title);
console.log("❌ Failed to schedule notification:", error);
console.log("💾 Teams selection saved:", { team, channel });
console.log("📂 Loaded teams selection:", selection);
```

### Error Tracking

```typescript
const handleError = (error: Error, context: string) => {
  console.error(`❌ ${context}:`, error);

  // Send to monitoring service in production
  if (process.env.NODE_ENV === "production") {
    // analytics.track('error', { error: error.message, context });
  }
};
```

### Performance Monitoring

```typescript
const measurePerformance = (label: string, fn: () => Promise<any>) => {
  const start = performance.now();
  return fn().finally(() => {
    const duration = performance.now() - start;
    console.log(`⏱️ ${label} took ${duration.toFixed(2)}ms`);
  });
};
```

---

This technical implementation guide provides the complete coding foundation for the Nudge App, covering all architectural decisions, implementation patterns, and best practices used in the development process.
