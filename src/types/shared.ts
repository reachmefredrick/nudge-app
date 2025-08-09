// Shared types for the Nudge application
// Centralizes all common interfaces to prevent type mismatches

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: string;
  reminders: any[];
  settings: any;
  teamsData: any;
}

export interface UserRegistration {
  name: string;
  email: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  token: string;
}

export interface UsersJsonStructure {
  users: User[];
}

export interface RemindersJsonStructure {
  users: { [key: string]: UserRemindersData };
  meta: {
    lastUpdated: string;
    version: string;
    totalReminders: number;
  };
}

export interface UserRemindersData {
  id: number;
  name: string;
  email: string;
  reminders: ReminderData[];
  settings: any;
  teamsData: any;
  lastUpdated: string;
}

export interface ReminderData {
  id: number;
  title: string;
  description: string;
  datetime: string | Date;
  priority: string;
  active: boolean;
  createdAt: string | Date;
  isRecurring?: boolean;
  recurringType?: string;
  recurringInterval?: number;
  enableTeamsNotification?: boolean;
  teamsNotificationEnabled?: boolean;
}

export interface Settings {
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    email: boolean;
    sms: boolean;
    frequency: string;
  };
  appearance: {
    theme: string;
    language: string;
    timezone: string;
    dateFormat: string;
  };
  privacy: {
    dataSharing: boolean;
    analytics: boolean;
    marketing: boolean;
  };
}

export interface FileStatistics {
  usersFile: {
    size: number;
    users: number;
  };
  remindersFile: {
    size: number;
    totalReminders: number;
  };
  lastUpdated: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}
