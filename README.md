# Nudge App

A comprehensive React web application with Material UI that provides desktop push notifications, recurring reminders, team alerts, and user authentication.

## Features

### 🔔 Desktop Push Notifications

- Browser-based push notifications
- Customizable notification settings
- Sound and visual alerts
- Notification history and management

### ⏰ Recurring Reminders

- Create one-time or recurring reminders
- Support for daily, weekly, and monthly recurrence
- Priority levels (Low, Medium, High)
- Advanced scheduling with date/time picker
- Reminder management dashboard

### 👥 Teams & Alerts

- Create and manage teams
- Send alerts to team members
- Microsoft Teams integration support
- Priority-based alerts (Normal, High, Urgent)
- Member management

### 🔐 User Authentication

- Simple login/register system
- Session management
- Protected routes
- User profile management

### ⚙️ Settings & Configuration

- Notification preferences
- Reminder defaults
- Privacy settings
- Data management tools

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd nudge-app
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Usage

### First Time Setup

1. Register a new account or login with existing credentials
2. Allow browser notifications when prompted
3. Create your first reminder or team

### Creating Reminders

1. Navigate to the Reminders page
2. Click "New Reminder"
3. Fill in the details (title, description, date/time)
4. Set priority and recurrence if needed
5. Save the reminder

### Managing Teams

1. Go to the Teams page
2. Create a new team with members' email addresses
3. Send alerts to the entire team
4. Manage team members and settings

### Configuring Settings

1. Access Settings from the navigation
2. Configure notification preferences
3. Set default reminder settings
4. Manage privacy and data options

## Technical Stack

- **Frontend**: React 18, Material UI 5
- **Routing**: React Router DOM
- **Date Handling**: date-fns, MUI Date Pickers
- **Notifications**: Web Notifications API
- **Storage**: localStorage (can be replaced with backend)
- **Styling**: Material UI with Emotion

## Architecture

### Context Providers

- `AuthContext`: Manages user authentication state
- `NotificationContext`: Handles push notifications and alerts

### Components Structure

```
src/
├── components/
│   ├── Auth/
│   │   ├── Login.js
│   │   └── Register.js
│   ├── Dashboard/
│   │   └── Dashboard.js
│   ├── Reminders/
│   │   └── Reminders.js
│   ├── Teams/
│   │   └── Teams.js
│   ├── Settings/
│   │   └── Settings.js
│   └── Navbar.js
├── contexts/
│   ├── AuthContext.js
│   └── NotificationContext.js
├── App.js
└── index.js
```

## Browser Compatibility

- Chrome 50+
- Firefox 44+
- Safari 13+
- Edge 79+

**Note**: Push notifications require HTTPS in production environments.

## Deployment

### Build for Production

```bash
npm run build
```

The build folder will contain the optimized production files.

### Environment Variables

For production deployment, consider adding:

- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_TEAMS_WEBHOOK`: Microsoft Teams webhook URL

## Future Enhancements

- [ ] Backend API integration
- [ ] Real-time synchronization
- [ ] Mobile app companion
- [ ] Calendar integration
- [ ] Advanced analytics
- [ ] Custom notification sounds
- [ ] Slack integration
- [ ] Email notifications
- [ ] Timezone support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
