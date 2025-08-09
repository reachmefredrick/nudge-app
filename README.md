# 🔔 Nudge App - Smart Reminder & Teams Notification System

A modern, enterprise-grade reminder management application built with Next.js, TypeScript, and Material-UI, featuring dual storage architecture and comprehensive Microsoft Teams integration.

## ✨ Key Features

### 🔄 **Dual Storage Architecture**

- **localStorage**: Fast, immediate data access for real-time operations
- **JSON Files**: Persistent file storage in `src/data/` directory
- **Automatic Sync**: All operations update both storage systems simultaneously
- **RESTful API**: Seamless file system operations via `/api/file-storage`

### 📱 **Core Reminder System**

- Smart reminder creation with intuitive date/time picker
- User authentication and secure session management
- Priority-based organization (Low, Medium, High)
- Recurring patterns (Daily, Weekly, Monthly)
- Real-time browser notifications
- Export/import capabilities

### 🚀 **Advanced Microsoft Teams Integration**

- **Immediate Notifications**: Send instant messages to any Teams channel
- **Scheduled Delivery**: Date/time specific notifications with background processing
- **Recurring Patterns**: Flexible daily, weekly, monthly scheduling
- **Smart Templates**: Pre-built scenarios for common workflows
- **Management Dashboard**: Centralized control with real-time status tracking
- **Rich Messaging**: Adaptive Cards with priority indicators and branding
- **Background Scheduler**: Persistent notification processing with automatic retry

### 🛡️ **Enterprise Quality**

- 100% TypeScript compliance with strict type safety
- Comprehensive error handling and logging
- ESLint and Prettier configuration
- Production-ready build system with optimizations

## 🎯 Use Cases & Applications

**Personal Productivity**

- Daily routines, medication reminders, fitness schedules
- Meeting alerts, deadline tracking, follow-up reminders
- Study schedules, course deadlines, skill practice

**Team Collaboration**

- Automated standup and meeting reminders
- Project milestone alerts and deadline notifications
- Code review and deployment notifications
- Sprint planning and retrospective alerts

**Enterprise Applications**

- Healthcare: Patient care coordination and staff scheduling
- Education: Assignment deadlines and administrative tasks
- Financial: Compliance deadlines and regulatory requirements
- Operations: Maintenance schedules and safety checks

> 📋 **[Detailed Use Cases & User Stories →](USE_CASES.md)**

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Modern browser with notification support
- Azure AD App Registration (for Teams features)

### Installation & Development

```bash
# Clone the repository
git clone <repository-url>
cd nudge-app

# Install dependencies
npm install

# Configure environment (see Teams Integration section)
cp .env.example .env.local

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Available Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint checking
npm run type-check   # TypeScript validation
```

## 🔐 Microsoft Teams Integration

### Notification Templates

Pre-built templates for common scenarios:

- 🏃‍♂️ **Daily Standup**: Weekdays at 9:15 AM
- 🚀 **Sprint Review**: Friday afternoons
- 👀 **Code Review**: Daily at 11:00 AM
- 🚢 **Deployment**: Instant success/failure alerts
- 🎉 **Milestones**: Achievement announcements

### Azure AD Setup

1. **Create App Registration** in Azure Portal
2. **Configure API Permissions**:
   - `User.Read` (Delegated)
   - `Team.ReadBasic.All` (Delegated)
   - `Channel.ReadBasic.All` (Delegated)
   - `ChannelMessage.Send` (Delegated)
3. **Set Redirect URI** to your domain
4. **Note Client ID and Tenant ID**

### Environment Configuration

```env
# .env.local
NEXT_PUBLIC_AZURE_CLIENT_ID=your-azure-app-client-id
NEXT_PUBLIC_AZURE_TENANT_ID=your-tenant-id
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Usage

**Via UI (Recommended)**

1. Navigate to `/teams-notifications`
2. Click "New Notification"
3. Configure message and scheduling
4. Send immediately or schedule

**Via API**

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

> 📋 **[Complete Teams Setup Guide →](TEAMS_NOTIFICATIONS.md)**

## 📂 Project Architecture

### Directory Structure

```
nudge-app/
├── README.md                        # Project documentation
├── TEAMS_NOTIFICATIONS.md           # Teams integration guide
├── USE_CASES.md                     # Detailed use cases
├── USE_CASE_EXAMPLES.md             # Example scenarios
├── CLEANUP_SUMMARY.md               # Development cleanup log
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── next.config.js                   # Next.js configuration
├── .eslintrc.json                   # ESLint rules
└── src/
    ├── middleware.ts                # Next.js middleware
    ├── app/                         # Next.js App Router
    │   ├── layout.tsx               # Root layout
    │   ├── page.tsx                 # Home page
    │   ├── api/                     # API endpoints
    │   │   ├── file-storage/        # File system operations
    │   │   │   └── route.ts
    │   │   └── teams-notifications/ # Teams notification API
    │   │       └── route.ts
    │   ├── dashboard/               # Analytics dashboard
    │   │   └── page.tsx
    │   ├── login/                   # Authentication pages
    │   │   └── page.tsx
    │   ├── register/
    │   │   └── page.tsx
    │   ├── reminders/               # Reminder management
    │   │   └── page.tsx
    │   ├── settings/                # User settings
    │   │   └── page.tsx
    │   ├── teams/                   # Basic Teams integration
    │   │   └── page.tsx
    │   └── teams-notifications/     # Advanced Teams management
    │       └── page.tsx
    ├── components/                  # React components
    │   ├── ProfileManagement.tsx    # User profile management
    │   ├── ProtectedLayout.tsx      # Navigation layout with auth
    │   └── TeamsNotificationManager.tsx # Teams notification UI
    ├── contexts/                    # React Context providers
    │   ├── AuthContext.tsx          # Authentication state
    │   ├── NotificationContext.tsx  # Notification system
    │   └── TeamsContext.tsx         # Teams integration state
    ├── services/                    # Business logic services
    │   ├── fileStorageService.ts    # File operations
    │   ├── hybridFileStorageService.ts # Dual storage orchestration
    │   ├── microsoftGraphService.ts # Teams API integration
    │   ├── teamsIntegrationService.ts # High-level Teams operations
    │   ├── teamsNotificationScheduler.ts # Advanced scheduling engine
    │   ├── userService.ts           # User management
    │   └── userStorageService.ts    # User data persistence
    ├── types/                       # TypeScript definitions
    │   └── shared.ts                # Centralized type definitions
    └── data/                        # JSON file storage
        ├── users.json               # User data persistence
        └── reminders.json           # Reminder data persistence
```

### Technical Architecture

**Dual Storage System**

1. **localStorage**: Immediate operations and cache
2. **JSON Files**: Persistent storage via API
3. **Synchronization**: Real-time sync between systems
4. **RESTful API**: `/api/file-storage` endpoints

**Authentication Flow**

- Secure local user registration/login
- Session management with localStorage
- Microsoft Teams OAuth via MSAL
- Protected route guards

**Teams Integration**

- **Scheduler Service**: Background processing with persistence
- **Integration Service**: High-level notification operations
- **Graph Service**: Direct Microsoft Graph API communication
- **Template System**: Pre-built notification scenarios

## 📈 System Status & Features

### ✅ Core Features (Production Ready)

**Authentication & User Management**

- ✅ User registration and secure login system
- ✅ Session management with localStorage
- ✅ Protected routes with authentication guards

**Reminder System**

- ✅ Dual storage system (localStorage + JSON files)
- ✅ CRUD operations with recurring patterns
- ✅ Priority-based organization and filtering
- ✅ Real-time browser notifications

**Microsoft Teams Integration**

- ✅ Immediate message sending with priority levels
- ✅ Scheduled notifications with date/time picker
- ✅ Recurring patterns (daily, weekly, monthly)
- ✅ Notification templates and preset scenarios
- ✅ Background scheduling processor with persistence
- ✅ Management dashboard with real-time status
- ✅ Rich Adaptive Card formatting

**Technical Quality**

- ✅ 100% TypeScript type coverage
- ✅ ESLint compliance with comprehensive error handling
- ✅ Production-ready build system with optimizations
- ✅ Responsive Material-UI design
- ✅ RESTful API endpoints with proper validation

### 🚧 Future Enhancements

**Platform Integration**

- [ ] Real-time device synchronization
- [ ] Calendar integration (Google/Outlook)
- [ ] Mobile Progressive Web App
- [ ] Webhook integrations for third-party services

**Analytics & Intelligence**

- [ ] Advanced reporting dashboards
- [ ] Teams notification analytics and insights
- [ ] AI-powered notification optimization
- [ ] Custom notification templates editor

**Enterprise Features**

- [ ] Enhanced security with data encryption
- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Multi-tenant architecture
- [ ] Advanced user permissions and roles

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** - Excellent React framework
- **Material-UI** - Comprehensive component library
- **Microsoft Graph API** - Teams integration capabilities
- **TypeScript** - Type safety and developer experience

---

**Status**: ✅ Production Ready with Advanced Teams Integration  
**Last Updated**: August 10, 2025  
**Version**: 1.1.0

_Enterprise-grade reminder and notification system with comprehensive Microsoft Teams scheduling capabilities_
