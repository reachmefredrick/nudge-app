# 🔔 Nudge App - Smart Reminder Management System

A modern, enterprise-grade reminder management application built with Next.js, TypeScript, and Material-UI, featuring dual storage architecture and advanced Microsoft Teams integration.

## ✨ Key Features

### 🔄 **Dual Storage System**

- **localStorage**: Fast, immediate data access for real-time operations
- **JSON Files**: Persistent file storage in `src/data/` directory
- **Automatic Sync**: All operations update both storage systems simultaneously
- **API Integration**: RESTful endpoints for seamless file system operations

### 📱 **Core Functionality**

- Smart reminder creation and management with date/time picker
- User authentication and registration system
- Priority-based organization (Low, Medium, High)
- Recurring reminder support (Daily, Weekly, Monthly)
- Real-time browser notifications
- Export/import capabilities

### 🚀 **Advanced Teams Integration**

- **Immediate Notifications**: Send instant messages to any Teams channel
- **Scheduled Notifications**: Date/time specific delivery with background processing
- **Recurring Patterns**: Daily, weekly, monthly with flexible scheduling
- **Notification Templates**: Pre-built scenarios for common workflows
- **Management Dashboard**: Centralized control with real-time status tracking
- **Rich Messaging**: Adaptive Cards with priority indicators and branding

### 🛡️ **Enterprise Quality**

- 100% TypeScript compliance with strict mode
- Centralized type definitions and comprehensive error handling
- ESLint and Prettier configuration
- Production-ready build system

## 🎯 **Use Cases**

### **Personal Productivity**

- Daily routines, medication reminders, fitness schedules
- Meeting alerts, deadline tracking, follow-up reminders
- Study schedules, course deadlines, skill practice

### **Team Collaboration**

- Automated standup and meeting reminders
- Project milestone alerts and deadline notifications
- Code review and deployment notifications
- Sprint planning and retrospective alerts

### **Enterprise Applications**

- Healthcare: Patient care coordination and staff scheduling
- Education: Assignment deadlines and administrative tasks
- Financial: Compliance deadlines and regulatory requirements
- Operations: Maintenance schedules and safety checks

> 📋 **[View Detailed Use Cases & User Stories →](USE_CASES.md)**

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Modern browser with notification support

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd nudge-app

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint checking
npm run type-check   # TypeScript validation
```

## 🔐 Microsoft Teams Integration

### **Notification Templates**

Pre-built templates for common scenarios:

- 🏃‍♂️ **Daily Standup Reminders**: Weekdays at 9:15 AM
- 🚀 **Sprint Review Alerts**: Friday afternoons
- 👀 **Code Review Notifications**: Daily at 11:00 AM
- 🚢 **Deployment Updates**: Instant success/failure alerts
- 🎉 **Milestone Celebrations**: Achievement announcements

### **Azure AD Setup** (Required for Teams Features)

1. Create App Registration in Azure Portal
2. Configure Microsoft Graph API permissions:
   - `User.Read` (Delegated)
   - `Team.ReadBasic.All` (Delegated)
   - `Channel.ReadBasic.All` (Delegated)
   - `ChannelMessage.Send` (Delegated)
3. Set redirect URI to your domain
4. Note the Client ID and Tenant ID for environment configuration

### **Environment Configuration**

```env
# .env.local
NEXT_PUBLIC_AZURE_CLIENT_ID=your-azure-app-client-id
NEXT_PUBLIC_AZURE_TENANT_ID=your-tenant-id
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **Usage Examples**

#### Via UI (Recommended)

1. Navigate to `/teams-notifications`
2. Click "New Notification"
3. Configure message details and scheduling
4. Send immediately or schedule for later

#### Via API

```javascript
// Send immediate notification
fetch("/api/teams-notifications", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "send-immediate",
    title: "Build Complete",
    message: "Latest deployment successful!",
    teamId: "team-id",
    channelId: "channel-id",
    priority: "high",
  }),
});

// Schedule recurring notification
fetch("/api/teams-notifications", {
  method: "POST",
  body: JSON.stringify({
    action: "schedule-recurring",
    title: "Daily Standup",
    message: "Time for standup!",
    teamId: "team-id",
    channelId: "channel-id",
    scheduleTime: "2025-08-11T09:15:00.000Z",
    recurring: {
      type: "daily",
      interval: 1,
      daysOfWeek: [1, 2, 3, 4, 5],
      endDate: "2025-12-31T23:59:59.000Z",
    },
  }),
});
```

> 📋 **[Detailed Teams Setup Guide →](TEAMS_NOTIFICATIONS.md)**

## 📂 Project Structure

```
src/
├── app/                              # Next.js App Router
│   ├── api/                         # API endpoints
│   │   ├── file-storage/            # File system operations
│   │   └── teams-notifications/     # Teams notification API
│   ├── reminders/                   # Reminder management page
│   ├── teams-notifications/         # Advanced Teams notification management
│   ├── dashboard/                   # Analytics dashboard
│   ├── settings/                    # User settings
│   ├── login/ & register/           # Authentication pages
├── components/                      # Reusable React components
│   ├── TeamsNotificationManager.tsx # Teams notification UI
│   └── ProtectedLayout.tsx          # Navigation with Teams features
├── services/                        # Business logic and data management
│   ├── teamsNotificationScheduler.ts   # Advanced Teams scheduling
│   ├── teamsIntegrationService.ts      # High-level Teams operations
│   ├── hybridFileStorageService.ts     # Dual storage orchestration
│   ├── microsoftGraphService.ts        # Teams API integration
│   └── userService.ts                  # User management
├── contexts/                        # React Context providers
│   ├── AuthContext.tsx              # Authentication state
│   ├── TeamsContext.tsx             # Teams integration
│   └── NotificationContext.tsx      # Notification system
├── types/                           # TypeScript type definitions
└── data/                            # JSON file storage
    ├── users.json                   # User data persistence
    └── reminders.json               # Reminder data persistence
```

## 🔧 Technical Architecture

### **Dual Storage System**

1. **Immediate Operations**: localStorage for instant data access
2. **Persistence**: JSON files for long-term storage
3. **Synchronization**: Real-time sync between both systems
4. **API Layer**: RESTful endpoints at `/api/file-storage`

### **Authentication Flow**

- Local user registration and login
- Secure session management with localStorage
- Microsoft Teams OAuth integration via MSAL
- Protected routes with authentication guards

### **Teams Integration Architecture**

- **Scheduler Service**: Background processing with persistent storage
- **Integration Service**: High-level API for common operations
- **Graph Service**: Direct Microsoft Graph API communication
- **Template System**: Pre-built notification scenarios

## 📈 Current Status

### ✅ **Working Features**

- ✅ User registration and authentication system
- ✅ Dual storage system (localStorage + JSON files)
- ✅ Reminder CRUD operations with recurring patterns
- ✅ Real-time browser notifications
- ✅ **Advanced Teams Notification System**
  - ✅ Immediate message sending with priority levels
  - ✅ Scheduled notifications with date/time picker
  - ✅ Recurring patterns (daily, weekly, monthly)
  - ✅ Notification templates and preset scenarios
  - ✅ Background scheduling processor with persistence
  - ✅ Management dashboard with real-time status tracking
- ✅ Rich Adaptive Card formatting for Teams messages
- ✅ Priority-based organization and filtering
- ✅ Type-safe TypeScript implementation
- ✅ Responsive Material-UI design
- ✅ Production-ready build system

### 📊 **System Health**

- **TypeScript**: 100% type coverage, zero compilation errors
- **Build**: Successful production build with optimizations
- **Code Quality**: Clean ESLint compliance with comprehensive error handling
- **API**: All endpoints functional with proper validation
- **Storage**: Dual storage system working reliably
- **Teams Integration**: Comprehensive notification system with scheduling
- **Background Processing**: Notification scheduler running smoothly

## 🚧 **Future Enhancements**

### **Planned Features**

- [ ] Real-time synchronization across devices
- [ ] Calendar integration (Google/Outlook)
- [ ] Mobile Progressive Web App
- [ ] Advanced analytics and reporting dashboards
- [ ] Teams notification analytics and insights
- [ ] Custom notification templates editor
- [ ] Webhook integrations for third-party services
- [ ] Enhanced security with data encryption
- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] AI-powered notification optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** for the excellent React framework
- **Material-UI** for the comprehensive component library
- **Microsoft Graph API** for Teams integration capabilities
- **TypeScript** for type safety and developer experience

---

**Status**: ✅ Production Ready with Advanced Teams Integration  
**Last Updated**: August 10, 2025  
**Version**: 1.1.0

_Enterprise-grade reminder and notification system with comprehensive Microsoft Teams scheduling capabilities_
