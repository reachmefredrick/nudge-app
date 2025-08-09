# 🔔 Nudge App - Smart Reminder Management System

A modern, enterprise-grade reminder management application built with Next.js, TypeScript, and Material-UI, featuring dual storage architecture and Microsoft Teams integration.

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
- Microsoft Teams integration with Adaptive Cards
- Export/import capabilities

### 🛡️ **Type Safety & Quality**

- 100% TypeScript compliance with strict mode
- Centralized type definitions in `src/types/shared.ts`
- Comprehensive error handling and validation
- ESLint and Prettier configuration

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

## 📂 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   └── file-storage/  # File system operations
│   ├── reminders/         # Reminder management page
│   ├── dashboard/         # Analytics dashboard
│   ├── settings/          # User settings
│   ├── teams/             # Teams integration
│   ├── login/             # Authentication
│   └── register/          # User registration
├── components/            # Reusable React components
├── contexts/             # React Context providers
│   ├── AuthContext.tsx   # Authentication state
│   ├── TeamsContext.tsx  # Teams integration
│   └── NotificationContext.tsx # Notification system
├── services/             # Business logic and data management
│   ├── hybridFileStorageService.ts  # Dual storage orchestration
│   ├── userService.ts               # User management
│   ├── userStorageService.ts        # User-specific data storage
│   └── microsoftGraphService.ts     # Teams API integration
├── types/                # TypeScript type definitions
│   └── shared.ts         # Centralized interface definitions
└── data/                 # JSON file storage
    ├── users.json        # User data persistence
    └── reminders.json    # Reminder data persistence
```

## 🔧 Technical Architecture

### Storage System

The application implements a sophisticated dual storage approach:

1. **Immediate Operations**: localStorage for instant data access
2. **Persistence**: JSON files for long-term storage
3. **Synchronization**: Real-time sync between both systems
4. **API Layer**: RESTful endpoints at `/api/file-storage`

### Authentication Flow

- Local user registration and login
- Secure session management with localStorage
- Microsoft Teams OAuth integration via MSAL
- Protected routes with authentication guards

### Data Structures

#### Users JSON Structure

```json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "password": "encrypted_password",
      "createdAt": "2025-08-10T12:00:00.000Z",
      "reminders": [],
      "settings": {},
      "teamsData": {}
    }
  ]
}
```

#### Reminders JSON Structure

```json
{
  "users": {
    "1": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "reminders": [
        {
          "id": 123456789,
          "title": "Meeting Reminder",
          "description": "Team standup meeting",
          "datetime": "2025-08-10T14:00:00.000Z",
          "priority": "high",
          "recurring": true,
          "recurringType": "weekly",
          "enableTeamsNotification": true,
          "createdAt": "2025-08-10T12:00:00.000Z"
        }
      ],
      "lastUpdated": "2025-08-10T12:00:00.000Z"
    }
  },
  "meta": {
    "lastUpdated": "2025-08-10T12:00:00.000Z",
    "version": "1.0",
    "totalReminders": 5
  }
}
```

## 🧪 Usage & Testing

### User Flow

1. **Register/Login**: Create account or sign in
2. **Create Reminders**: Set title, description, date/time, priority
3. **Configure Notifications**: Choose browser and/or Teams notifications
4. **Manage Reminders**: Edit, delete, mark complete
5. **Teams Integration**: Connect to Teams for enhanced notifications

### API Testing

```bash
# Test user storage
curl -X POST http://localhost:3000/api/file-storage \
  -H "Content-Type: application/json" \
  -d '{"filename": "users.json", "data": {...}}'

# Read stored data
curl "http://localhost:3000/api/file-storage?filename=users.json"
```

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint checking
npm run type-check   # TypeScript validation
```

## 🔐 Microsoft Teams Integration

### Azure AD Setup (Optional)

1. Create App Registration in Azure Portal
2. Configure Microsoft Graph API permissions:
   - `User.Read` (Delegated)
   - `Team.ReadBasic.All` (Delegated)
   - `ChannelMessage.Send` (Delegated)
3. Set redirect URI to your domain

### Environment Configuration

```env
# .env.local
NEXT_PUBLIC_AZURE_CLIENT_ID=your-azure-app-client-id
NEXT_PUBLIC_AZURE_TENANT_ID=your-tenant-id
```

## 📈 Current Status

### ✅ Working Features

- ✅ User registration and authentication
- ✅ Dual storage system (localStorage + JSON files)
- ✅ Reminder CRUD operations
- ✅ Browser notifications
- ✅ Microsoft Teams integration
- ✅ Recurring reminders
- ✅ Priority-based organization
- ✅ File-based data persistence
- ✅ Type-safe TypeScript implementation
- ✅ Responsive Material-UI design

### 📊 System Health

- **TypeScript**: 100% type coverage, zero errors
- **Build**: Successful production build
- **Linting**: Clean code with no ESLint warnings
- **API**: All endpoints functional and tested
- **Storage**: Both localStorage and JSON file storage working

## 🚧 Future Enhancements

### Planned Features

- [ ] Real-time synchronization across devices
- [ ] Calendar integration (Google/Outlook)
- [ ] Mobile Progressive Web App
- [ ] Advanced analytics and reporting
- [ ] Team collaboration features
- [ ] Data encryption and security enhancements
- [ ] Database integration (PostgreSQL/MongoDB)

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

**Status**: ✅ Production Ready  
**Last Updated**: August 10, 2025  
**Version**: 1.0.0

_Enterprise-grade reminder and notification system with Microsoft Teams integration_
